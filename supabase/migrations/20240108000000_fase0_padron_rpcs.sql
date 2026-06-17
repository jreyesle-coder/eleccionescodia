-- ════════════════════════════════════════════════════════════════════════
-- FASE 0: RPCs para padron (call center + verificate) + políticas RLS
-- Corrige: call center sin resultados, verificate sin guardar.
-- ════════════════════════════════════════════════════════════════════════

-- ── 1. Columnas opcionales en padron (ADD IF NOT EXISTS, nunca destruye datos) ──
alter table public.padron
  add column if not exists simpatiza_verificate  boolean      not null default false,
  add column if not exists voto_verificate_at    timestamptz,
  add column if not exists votante_habilitado    boolean      not null default false,
  add column if not exists centro_votacion       text,
  add column if not exists estado_electoral      text,
  add column if not exists monto_deuda           int,
  add column if not exists confirmado_por        text,
  add column if not exists confirmacion_intencion text,
  add column if not exists confirmacion_at       timestamptz,
  add column if not exists estado_gestion        text         not null default 'pendiente',
  add column if not exists asignado_a            uuid,
  add column if not exists bloqueado_hasta       timestamptz,
  add column if not exists intentos_no_contesta  int          not null default 0;

-- Índices útiles
create index if not exists idx_padron_estado_gestion on public.padron(estado_gestion);
create index if not exists idx_padron_asignado_a     on public.padron(asignado_a);

-- ── 2. Tabla llamadas con colegiado_id (FK a padron) ─────────────────────────
-- Si ya existe con miembro_id, el admin debe renombrar la columna manualmente.
-- Para MVP: crear tabla si no existe.
create table if not exists public.llamadas (
  id            bigserial primary key,
  colegiado_id  bigint      not null references public.padron(id),
  operador_id   uuid        not null references public.profiles(id),
  fecha_hora    timestamptz not null default now(),
  resultado     text        not null check (resultado in
    ('efectiva_confirma','efectiva_no_confirma','no_contesta',
     'numero_equivocado','volver_a_llamar','rechaza')),
  confirma_plancha1 boolean not null default false,
  notas         text,
  callback_at   timestamptz
);
create index if not exists idx_llamadas_colegiado on public.llamadas(colegiado_id);
create index if not exists idx_llamadas_operador  on public.llamadas(operador_id);

-- ── 3. Otras tablas necesarias ────────────────────────────────────────────────
create table if not exists public.deudas_votantes (
  nombre    text,
  codigo    text,
  telefono  text,
  profesion text,
  monto     int,
  contacto  text,
  nucleo    text,
  regional  text
);

create table if not exists public.votos_dia (
  id               bigserial primary key,
  codigo           text        not null,
  mesa             text,
  registrado_por   uuid        references public.profiles(id),
  estaba_habilitado boolean    not null default false,
  created_at       timestamptz not null default now()
);

create table if not exists public.deuda_historial (
  id            bigserial primary key,
  codigo        text,
  monto_anterior int,
  monto_nuevo    int,
  actualizado_por text,
  actualizado_en  timestamptz not null default now()
);

-- ── 4. RLS: policies para que operador y anon puedan acceder ──────────────────
-- padron
alter table public.padron enable row level security;

drop policy if exists "padron_select_auth"  on public.padron;
drop policy if exists "padron_update_auth"  on public.padron;
drop policy if exists "padron_select_anon"  on public.padron;

-- Cualquier usuario autenticado puede leer el padrón (necesario para buscar y para el call center)
create policy "padron_select_auth" on public.padron
  for select to authenticated using (true);

-- Solo pueden actualizar: la función security definer hace el update atómico;
-- también permitimos update directo para operadores que tienen asignado al colegiado
-- y para gerente/presidente/supervisor.
create policy "padron_update_auth" on public.padron
  for update to authenticated
  using (
    asignado_a = auth.uid()
    or public.mi_rol() in ('supervisor','gerente','presidente','dirigente','colaborador')
  );

-- llamadas
alter table public.llamadas enable row level security;

drop policy if exists "llamadas_select_auth" on public.llamadas;
drop policy if exists "llamadas_insert_auth" on public.llamadas;

create policy "llamadas_select_auth" on public.llamadas
  for select to authenticated
  using (
    operador_id = auth.uid()
    or public.mi_rol() in ('supervisor','gerente','presidente')
  );

create policy "llamadas_insert_auth" on public.llamadas
  for insert to authenticated
  with check (operador_id = auth.uid());

-- deudas_votantes: solo lectura para autenticados
alter table public.deudas_votantes enable row level security;
drop policy if exists "deudas_select_auth" on public.deudas_votantes;
create policy "deudas_select_auth" on public.deudas_votantes
  for select to authenticated using (true);

-- votos_dia
alter table public.votos_dia enable row level security;
drop policy if exists "votos_dia_select_auth"  on public.votos_dia;
drop policy if exists "votos_dia_insert_auth"  on public.votos_dia;
create policy "votos_dia_select_auth" on public.votos_dia
  for select to authenticated using (true);
create policy "votos_dia_insert_auth" on public.votos_dia
  for insert to authenticated with check (registrado_por = auth.uid());

-- deuda_historial
alter table public.deuda_historial enable row level security;
drop policy if exists "deuda_hist_select_auth" on public.deuda_historial;
drop policy if exists "deuda_hist_insert_auth" on public.deuda_historial;
create policy "deuda_hist_select_auth" on public.deuda_historial
  for select to authenticated using (true);
create policy "deuda_hist_insert_auth" on public.deuda_historial
  for insert to authenticated with check (true);

-- ── 5. mi_rol() — asegurar que acepta los roles nuevos ───────────────────────
-- (No cambia la función, solo actualiza el check en profiles si es necesario)
alter table public.profiles
  drop constraint if exists profiles_rol_check;
alter table public.profiles
  add constraint profiles_rol_check
  check (rol in ('operador','supervisor','gerente','presidente',
                 'dirigente','colaborador','delegado','suplente'));

-- ── 6. RPC: jalar_siguiente_colegiado ────────────────────────────────────────
-- Toma un colegiado del pool de forma atómica (FOR UPDATE SKIP LOCKED).
-- Solo trae colegiados con teléfono o celular y que no estén bloqueados.
-- (Fase 1 añadirá exclusiones por verificate y confirmación dirigente)
drop function if exists public.jalar_siguiente_colegiado(text);
create or replace function public.jalar_siguiente_colegiado(
  p_estado text default 'pendiente'
)
returns public.padron
language plpgsql security definer set search_path = public as $$
declare
  v_row public.padron;
begin
  select * into v_row
    from public.padron p
   where p.estado_gestion = p_estado
     and (p.telefono is not null or p.celular is not null)
     and (p.bloqueado_hasta is null or p.bloqueado_hasta < now())
   order by p.id
   for update skip locked
   limit 1;

  if not found then return null; end if;

  update public.padron
     set asignado_a      = auth.uid(),
         estado_gestion  = 'en_proceso',
         bloqueado_hasta = now() + interval '20 minutes'
   where id = v_row.id
   returning * into v_row;

  return v_row;
end;
$$;
grant execute on function public.jalar_siguiente_colegiado(text) to authenticated;

-- ── 7. RPC: registrar_llamada (firma con colegiado_id) ───────────────────────
-- Reemplaza la versión anterior que usaba p_miembro_id.
drop function if exists public.registrar_llamada(bigint, text, boolean, text, timestamptz);
create or replace function public.registrar_llamada(
  p_colegiado_id bigint,
  p_resultado    text,
  p_confirma     boolean       default false,
  p_notas        text          default null,
  p_callback_at  timestamptz   default null
)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_intentos int;
begin
  insert into public.llamadas(
    colegiado_id, operador_id, resultado,
    confirma_plancha1, notas, callback_at
  )
  values (
    p_colegiado_id, auth.uid(), p_resultado,
    p_confirma, p_notas, p_callback_at
  );

  if p_resultado = 'no_contesta' then
    update public.padron
       set intentos_no_contesta = intentos_no_contesta + 1
     where id = p_colegiado_id
     returning intentos_no_contesta into v_intentos;

    if v_intentos >= 3 then
      update public.padron
         set estado_gestion  = 'no_comunicacion',
             asignado_a      = null,
             bloqueado_hasta = null
       where id = p_colegiado_id;
    else
      update public.padron
         set estado_gestion  = 'en_proceso',
             bloqueado_hasta = null
       where id = p_colegiado_id;
    end if;

  elsif p_resultado = 'volver_a_llamar' then
    update public.padron
       set estado_gestion  = 'en_proceso',
           bloqueado_hasta = p_callback_at
     where id = p_colegiado_id;

  elsif p_resultado in ('efectiva_confirma','efectiva_no_confirma') then
    update public.padron
       set estado_gestion  = 'contactado',
           asignado_a      = null,
           bloqueado_hasta = null
     where id = p_colegiado_id;

  elsif p_resultado in ('numero_equivocado','rechaza') then
    update public.padron
       set estado_gestion  = 'cerrado',
           asignado_a      = null,
           bloqueado_hasta = null
     where id = p_colegiado_id;
  end if;
end;
$$;
grant execute on function public.registrar_llamada(bigint, text, boolean, text, timestamptz) to authenticated;

-- ── 8. RPC: buscar_colegiado (verificate + consulta pública) ─────────────────
-- Accesible por anon. Busca por nombre (tokens), codigo exacto o cédula.
-- Devuelve si tiene deuda (monto_deuda > 0 o existe en deudas_votantes).
drop function if exists public.buscar_colegiado(text);
create or replace function public.buscar_colegiado(p_q text)
returns table (
  id               bigint,
  codigo           text,
  nombre_completo  text,
  cedula           text,
  telefono         text,
  celular          text,
  regional         text,
  provincia        text,
  nucleo           text,
  carrera          text,
  pensionado       boolean,
  nuevo_integrante boolean,
  tiene_deuda      boolean
)
language plpgsql security definer stable set search_path = public as $$
declare
  q      text := trim(p_q);
  tokens text[];
  token  text;
  sql    text;
begin
  if length(q) < 3 then return; end if;

  -- búsqueda exacta por codigo o cedula
  if q ~ '^[0-9\-]+$' then
    return query
      select
        p.id, p.codigo, p.nombre_completo, p.cedula,
        p.telefono, p.celular,
        p.regional, p.provincia, p.nucleo, p.carrera,
        p.pensionado, p.nuevo_integrante,
        coalesce(p.monto_deuda, 0) > 0
          or exists (select 1 from public.deudas_votantes d where d.codigo = p.codigo) as tiene_deuda
      from public.padron p
     where p.codigo = q
        or p.cedula ilike '%' || q || '%'
     order by p.nombre_completo
     limit 50;
    return;
  end if;

  -- búsqueda por nombre con múltiples tokens
  tokens := array(
    select t from unnest(string_to_array(q, ' ')) t
    where length(trim(t)) >= 2
  );

  if array_length(tokens, 1) is null then return; end if;

  sql := $q$
    select
      p.id, p.codigo, p.nombre_completo, p.cedula,
      p.telefono, p.celular,
      p.regional, p.provincia, p.nucleo, p.carrera,
      p.pensionado, p.nuevo_integrante,
      coalesce(p.monto_deuda, 0) > 0
        or exists (select 1 from public.deudas_votantes d where d.codigo = p.codigo)
    from public.padron p
    where true
  $q$;

  foreach token in array tokens loop
    sql := sql || format(' and p.nombre_completo ilike %L', '%' || trim(token) || '%');
  end loop;

  sql := sql || ' order by p.nombre_completo limit 50';

  return query execute sql;
end;
$$;
grant execute on function public.buscar_colegiado(text) to anon, authenticated;

-- ── 9. RPC: marcar_preferencia_verificate ────────────────────────────────────
-- Valida cedula, hace UPSERT de simpatiza_verificate + voto_verificate_at.
-- Accesible por anon (la cédula actúa como pin de verificación).
-- Devuelve {ok: bool, error: text, nombre: text}.
drop function if exists public.marcar_preferencia_verificate(text, text, boolean);
create or replace function public.marcar_preferencia_verificate(
  p_codigo    text,
  p_cedula    text,
  p_simpatiza boolean
)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_cedula_bd text;
  v_nombre    text;
begin
  select cedula, nombre_completo
    into v_cedula_bd, v_nombre
    from public.padron
   where codigo = p_codigo
   limit 1;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Colegiado no encontrado.');
  end if;

  -- Comparar cédula ignorando guiones y espacios
  if regexp_replace(v_cedula_bd, '[^0-9]', '', 'g') <>
     regexp_replace(p_cedula,    '[^0-9]', '', 'g') then
    return jsonb_build_object('ok', false, 'error', 'La cédula no coincide con el registro.');
  end if;

  update public.padron
     set simpatiza_verificate = p_simpatiza,
         voto_verificate_at   = now()
   where codigo = p_codigo;

  return jsonb_build_object('ok', true, 'nombre', v_nombre);
end;
$$;
grant execute on function public.marcar_preferencia_verificate(text, text, boolean) to anon, authenticated;

-- ── 10. Vistas de alerta día de elección ─────────────────────────────────────
create or replace view public.v_alerta_doble_voto as
  select
    codigo,
    (select nombre_completo from public.padron p2 where p2.codigo = v.codigo limit 1) as nombre_completo,
    count(*)     as mesas,
    string_agg(mesa, ', ' order by created_at) as lista_mesas
  from public.votos_dia v
  group by codigo
  having count(*) > 1;

create or replace view public.v_alerta_no_habilitado as
  select
    v.codigo,
    (select nombre_completo from public.padron p2 where p2.codigo = v.codigo limit 1) as nombre_completo,
    v.mesa,
    v.registrado_por,
    v.created_at
  from public.votos_dia v
  where v.estaba_habilitado = false;
