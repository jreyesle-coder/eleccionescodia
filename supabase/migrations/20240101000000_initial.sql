-- Función auxiliar para leer el rol del usuario actual sin recursión de RLS
create or replace function public.mi_rol() returns text
language sql security definer stable set search_path = public as $$
  select rol from public.profiles where id = auth.uid()
$$;

-- PERFILES
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nombre text not null,
  rol text not null check (rol in ('operador','supervisor','gerente','presidente')),
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

-- MIEMBROS (padrón)
create table public.miembros (
  id bigserial primary key,
  matricula text unique not null,
  nombre text not null,
  vencimiento date,
  telefono text,
  segmento_montero boolean not null default false,
  telefono_revisar boolean not null default false,
  estado_gestion text not null default 'pendiente'
    check (estado_gestion in ('pendiente','en_proceso','contactado','no_comunicacion','cerrado')),
  asignado_a uuid references public.profiles(id),
  bloqueado_hasta timestamptz,
  intentos_no_contesta int not null default 0,
  created_at timestamptz not null default now()
);
create index on public.miembros (estado_gestion);
create index on public.miembros (asignado_a);
create index on public.miembros (segmento_montero);

-- LLAMADAS (bitácora)
create table public.llamadas (
  id bigserial primary key,
  miembro_id bigint not null references public.miembros(id),
  operador_id uuid not null references public.profiles(id),
  fecha_hora timestamptz not null default now(),
  resultado text not null check (resultado in
    ('efectiva_confirma','efectiva_no_confirma','no_contesta','numero_equivocado','volver_a_llamar','rechaza')),
  confirma_plancha1 boolean not null default false,
  notas text,
  callback_at timestamptz
);
create index on public.llamadas (operador_id);
create index on public.llamadas (miembro_id);

-- ENCUESTA DÍA DE ELECCIONES
create table public.encuesta_dia (
  id bigserial primary key,
  miembro_id bigint references public.miembros(id),
  voto_confirmado boolean not null default false,
  plancha_declarada text,
  encuestador_id uuid references public.profiles(id),
  fecha_hora timestamptz not null default now()
);

-- ACTIVAR RLS
alter table public.profiles enable row level security;
alter table public.miembros enable row level security;
alter table public.llamadas enable row level security;
alter table public.encuesta_dia enable row level security;

-- POLÍTICAS PROFILES
create policy "perfil_propio_select" on public.profiles for select
  using (id = auth.uid() or public.mi_rol() in ('supervisor','gerente','presidente'));
create policy "perfil_propio_update" on public.profiles for update
  using (id = auth.uid());

-- POLÍTICAS MIEMBROS
create policy "miembros_select" on public.miembros for select
  using (asignado_a = auth.uid() or public.mi_rol() in ('supervisor','gerente','presidente'));
create policy "miembros_update_supervisor" on public.miembros for update
  using (public.mi_rol() in ('supervisor'));

-- POLÍTICAS LLAMADAS
create policy "llamadas_select" on public.llamadas for select
  using (operador_id = auth.uid() or public.mi_rol() in ('supervisor','gerente','presidente'));
create policy "llamadas_insert_propia" on public.llamadas for insert
  with check (operador_id = auth.uid());

-- POLÍTICAS ENCUESTA
create policy "encuesta_select" on public.encuesta_dia for select
  using (public.mi_rol() in ('supervisor','gerente','presidente','operador'));
create policy "encuesta_insert" on public.encuesta_dia for insert
  with check (auth.uid() is not null);

-- RPC: jalar el siguiente miembro de forma atómica (sin choques entre operadores)
create or replace function public.jalar_siguiente_miembro(
  p_montero boolean default false,
  p_estado text default 'pendiente'
) returns public.miembros
language plpgsql security definer set search_path = public as $$
declare v_row public.miembros;
begin
  select * into v_row from public.miembros m
   where m.segmento_montero = p_montero
     and m.estado_gestion = p_estado
     and (m.bloqueado_hasta is null or m.bloqueado_hasta < now())
     and (m.asignado_a is null or m.estado_gestion = 'no_comunicacion')
   order by m.id
   for update skip locked
   limit 1;
  if not found then return null; end if;
  update public.miembros
     set asignado_a = auth.uid(),
         estado_gestion = 'en_proceso',
         bloqueado_hasta = now() + interval '15 minutes'
   where id = v_row.id
   returning * into v_row;
  return v_row;
end;
$$;

-- RPC: registrar el resultado de una llamada con toda la lógica de estados
create or replace function public.registrar_llamada(
  p_miembro_id bigint,
  p_resultado text,
  p_confirma boolean default false,
  p_notas text default null,
  p_callback_at timestamptz default null
) returns void
language plpgsql security definer set search_path = public as $$
declare v_intentos int;
begin
  insert into public.llamadas(miembro_id, operador_id, resultado, confirma_plancha1, notas, callback_at)
  values (p_miembro_id, auth.uid(), p_resultado, p_confirma, p_notas, p_callback_at);

  if p_resultado = 'no_contesta' then
     update public.miembros set intentos_no_contesta = intentos_no_contesta + 1
       where id = p_miembro_id returning intentos_no_contesta into v_intentos;
     if v_intentos >= 3 then
        -- 3er intento sin contestar: pasa al bucket del supervisor
        update public.miembros set estado_gestion = 'no_comunicacion',
               asignado_a = null, bloqueado_hasta = null where id = p_miembro_id;
     else
        update public.miembros set estado_gestion = 'en_proceso',
               bloqueado_hasta = null where id = p_miembro_id;
     end if;
  elsif p_resultado = 'volver_a_llamar' then
     -- callback: CONSERVA al mismo operador
     update public.miembros set estado_gestion = 'en_proceso',
            bloqueado_hasta = null where id = p_miembro_id;
  elsif p_resultado in ('efectiva_confirma','efectiva_no_confirma') then
     update public.miembros set estado_gestion = 'contactado',
            bloqueado_hasta = null where id = p_miembro_id;
  elsif p_resultado in ('numero_equivocado','rechaza') then
     update public.miembros set estado_gestion = 'cerrado',
            bloqueado_hasta = null where id = p_miembro_id;
  end if;
end;
$$;

grant execute on function public.jalar_siguiente_miembro(boolean, text) to authenticated;
grant execute on function public.registrar_llamada(bigint, text, boolean, text, timestamptz) to authenticated;
