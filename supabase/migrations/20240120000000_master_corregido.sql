-- ════════════════════════════════════════════════════════════════════════════
-- MASTER MIGRATION — CODIA Elecciones 2026
-- Ejecutar UNA SOLA VEZ en Supabase SQL Editor.
-- Cubre Fases 0-4 completas (call center, verificate, dirigente, día de
-- elección, deuda editable).
--
-- TIPOS CONFIRMADOS EN LA BD:
--   padron.id               BIGINT
--   padron.codigo           INTEGER   ← cast ::integer cuando llega como text
--   padron.asignado_a       UUID      ← comparación directa con auth.uid()
--   llamadas.colegiado_id   BIGINT
--   llamadas.operador_id    UUID
--   votos_dia.codigo        INTEGER
--   votos_dia.registrado_por TEXT     ← auth.uid()::text al insertar
--   profiles.id             UUID
-- ════════════════════════════════════════════════════════════════════════════

-- ══════════════════════════════════════════════════════════════════════════════
-- 1. ESTRUCTURA (columnas y tablas que pueden faltar)
-- ══════════════════════════════════════════════════════════════════════════════

-- Columna mesa para delegados/suplentes (no existe todavía en profiles)
alter table public.profiles
  add column if not exists mesa text;

-- Ampliar el check de roles para incluir los nuevos perfiles
alter table public.profiles
  drop constraint if exists profiles_rol_check;
alter table public.profiles
  add constraint profiles_rol_check
  check (rol in (
    'operador','supervisor','gerente','presidente',
    'dirigente','colaborador','delegado','suplente'
  ));

-- Tabla de historial de cambios de deuda
create table if not exists public.deuda_historial (
  id              bigserial primary key,
  codigo          integer,         -- INTEGER confirmado en BD
  monto_anterior  integer,
  monto_nuevo     integer,
  actualizado_por text,
  actualizado_en  timestamptz not null default now()
);

-- Tabla de deudas de votantes importadas
create table if not exists public.deudas_votantes (
  nombre    text,
  codigo    integer,               -- INTEGER confirmado en BD
  telefono  text,
  profesion text,
  monto     integer,
  contacto  text,
  nucleo    text,
  regional  text
);

-- ══════════════════════════════════════════════════════════════════════════════
-- 2. RLS (Row Level Security)
-- ══════════════════════════════════════════════════════════════════════════════

-- ── padron ────────────────────────────────────────────────────────────────────
alter table public.padron enable row level security;

drop policy if exists "padron_select_auth"      on public.padron;
drop policy if exists "padron_update_auth"      on public.padron;
drop policy if exists "padron_update_dirigente" on public.padron;
drop policy if exists "padron_select_anon"      on public.padron;

-- Cualquier usuario autenticado puede leer (call center, dirigente, consultas)
create policy "padron_select_auth" on public.padron
  for select to authenticated using (true);

-- Update: quien tiene el registro asignado, o roles con acceso amplio
-- padron.asignado_a es UUID y auth.uid() es UUID → sin cast
create policy "padron_update_auth" on public.padron
  for update to authenticated
  using (
    asignado_a = auth.uid()
    or public.mi_rol() in (
      'supervisor','gerente','presidente','dirigente','colaborador'
    )
  );

-- ── llamadas ──────────────────────────────────────────────────────────────────
alter table public.llamadas enable row level security;

drop policy if exists "llamadas_select_auth" on public.llamadas;
drop policy if exists "llamadas_insert_auth" on public.llamadas;

-- operador_id es UUID y auth.uid() es UUID → sin cast
create policy "llamadas_select_auth" on public.llamadas
  for select to authenticated
  using (
    operador_id = auth.uid()
    or public.mi_rol() in ('supervisor','gerente','presidente')
  );

create policy "llamadas_insert_auth" on public.llamadas
  for insert to authenticated
  with check (operador_id = auth.uid());

-- ── deudas_votantes ───────────────────────────────────────────────────────────
alter table public.deudas_votantes enable row level security;
drop policy if exists "deudas_select_auth" on public.deudas_votantes;
create policy "deudas_select_auth" on public.deudas_votantes
  for select to authenticated using (true);

-- ── votos_dia ─────────────────────────────────────────────────────────────────
alter table public.votos_dia enable row level security;
drop policy if exists "votos_dia_select_auth" on public.votos_dia;
drop policy if exists "votos_dia_insert_auth" on public.votos_dia;

create policy "votos_dia_select_auth" on public.votos_dia
  for select to authenticated using (true);

-- registrado_por es TEXT, auth.uid() es UUID → cast ::text
create policy "votos_dia_insert_auth" on public.votos_dia
  for insert to authenticated
  with check (registrado_por = auth.uid()::text);

-- ── deuda_historial ───────────────────────────────────────────────────────────
alter table public.deuda_historial enable row level security;
drop policy if exists "deuda_hist_select" on public.deuda_historial;
drop policy if exists "deuda_hist_insert" on public.deuda_historial;

create policy "deuda_hist_select" on public.deuda_historial
  for select to authenticated using (true);
create policy "deuda_hist_insert" on public.deuda_historial
  for insert to authenticated with check (true);

-- ══════════════════════════════════════════════════════════════════════════════
-- 3. VISTAS (DROP explícito antes de cada una para permitir cambio de tipos)
-- ══════════════════════════════════════════════════════════════════════════════

drop view if exists public.v_alerta_doble_voto cascade;
create view public.v_alerta_doble_voto as
  select
    v.codigo,
    ( select nombre_completo from public.padron p2
        where p2.codigo = v.codigo limit 1 ) as nombre_completo,
    count(*)                                          as mesas,
    string_agg(v.mesa, ', ' order by v.created_at)   as lista_mesas
  from public.votos_dia v
  group by v.codigo
  having count(*) > 1;

drop view if exists public.v_alerta_no_habilitado cascade;
create view public.v_alerta_no_habilitado as
  select
    v.codigo,
    ( select nombre_completo from public.padron p2
        where p2.codigo = v.codigo limit 1 ) as nombre_completo,
    v.mesa,
    v.registrado_por,
    v.created_at
  from public.votos_dia v
  where v.estaba_habilitado = false;

drop view if exists public.v_confirmados_por_dirigente cascade;
create view public.v_confirmados_por_dirigente as
  select
    confirmado_por                                                 as dirigente,
    count(*)                                                       as total,
    count(*) filter (where confirmacion_intencion = 'favorable')   as favorables,
    count(*) filter (where confirmacion_intencion = 'indeciso')    as indecisos,
    count(*) filter (where confirmacion_intencion = 'en_contra')   as en_contra,
    max(confirmacion_at)                                           as ultima_confirmacion
  from public.padron
  where confirmado_por is not null
  group by confirmado_por
  order by total desc;

drop view if exists public.vista_metricas_region cascade;
create view public.vista_metricas_region as
  select
    coalesce(p.regional, 'Sin regional')                            as region,
    count(*)                                                        as total,
    count(*) filter (where p.estado_gestion = 'pendiente')          as pendientes,
    count(*) filter (where p.estado_gestion = 'en_proceso')         as en_proceso,
    count(*) filter (where p.estado_gestion = 'contactado')         as contactados,
    count(*) filter (where p.estado_gestion = 'no_comunicacion')    as sin_comunicacion,
    count(*) filter (where p.estado_gestion = 'cerrado')            as cerrados,
    count(*) filter (where exists (
      select 1 from public.llamadas l
       where l.colegiado_id = p.id and l.resultado = 'efectiva_confirma'
    ))                                                              as confirmados_plancha1
  from public.padron p
  group by coalesce(p.regional, 'Sin regional')
  order by total desc;

drop view if exists public.vista_metricas_distrito cascade;
create view public.vista_metricas_distrito as
  select
    coalesce(p.regional, 'Sin regional')                            as distrito,
    count(*)                                                        as total,
    count(*) filter (where p.estado_gestion = 'pendiente')          as pendientes,
    count(*) filter (where p.estado_gestion = 'en_proceso')         as en_proceso,
    count(*) filter (where p.estado_gestion = 'contactado')         as contactados,
    count(*) filter (where p.estado_gestion = 'no_comunicacion')    as sin_comunicacion,
    count(*) filter (where p.estado_gestion = 'cerrado')            as cerrados,
    count(*) filter (where exists (
      select 1 from public.llamadas l
       where l.colegiado_id = p.id and l.resultado = 'efectiva_confirma'
    ))                                                              as confirmados_plancha1
  from public.padron p
  group by coalesce(p.regional, 'Sin regional')
  order by total desc;

drop view if exists public.vista_padron_vivo cascade;
create view public.vista_padron_vivo as
  select
    p.id,
    coalesce(p.regional, 'Sin regional') as regional,
    p.provincia,
    p.nucleo,
    p.codigo::text          as codigo,
    p.nombre_completo,
    p.telefono,
    p.celular,
    p.carrera,
    p.pensionado,
    p.nuevo_integrante,
    p.estado_gestion,
    pr.nombre               as asignado_a,
    l.fecha_hora            as ultima_llamada,
    l.resultado             as ultimo_resultado,
    l.confirma_plancha1     as ultimo_confirma,
    l.notas                 as ultima_nota
  from public.padron p
  left join public.profiles pr on pr.id = p.asignado_a
  left join lateral (
    select fecha_hora, resultado, confirma_plancha1, notas
      from public.llamadas
     where colegiado_id = p.id
     order by fecha_hora desc
     limit 1
  ) l on true;

-- ══════════════════════════════════════════════════════════════════════════════
-- 4. FUNCIONES / RPCs
-- ══════════════════════════════════════════════════════════════════════════════

-- ─── FASE 0 + 1: Call center ─────────────────────────────────────────────────

-- Toma el siguiente colegiado del pool de forma atómica.
-- Excluye: sin teléfono, ya en bloqueo, ya marcados en verificate,
--          ya confirmados por dirigente (Fase 1).
-- padron.asignado_a UUID, auth.uid() UUID → sin cast
drop function if exists public.jalar_siguiente_colegiado(text);
create or replace function public.jalar_siguiente_colegiado(
  p_estado text default 'pendiente'
)
returns public.padron
language plpgsql security definer set search_path = public as $$
declare v_row public.padron;
begin
  select * into v_row
    from public.padron p
   where p.estado_gestion = p_estado
     and (p.telefono is not null or p.celular is not null)
     and (p.bloqueado_hasta is null or p.bloqueado_hasta < now())
     and p.voto_verificate_at is null     -- excluir verificate (Fase 1)
     and p.confirmado_por    is null      -- excluir ya confirmados (Fase 1)
   order by p.id
   for update skip locked
   limit 1;

  if not found then return null; end if;

  update public.padron
     set asignado_a      = auth.uid(),   -- UUID = UUID ✓
         estado_gestion  = 'en_proceso',
         bloqueado_hasta = now() + interval '20 minutes'
   where id = v_row.id
   returning * into v_row;

  return v_row;
end;
$$;
grant execute on function public.jalar_siguiente_colegiado(text) to authenticated;


-- Registra el resultado de una llamada y actualiza estado en padron.
drop function if exists public.registrar_llamada(bigint, text, boolean, text, timestamptz);
create or replace function public.registrar_llamada(
  p_colegiado_id bigint,
  p_resultado    text,
  p_confirma     boolean     default false,
  p_notas        text        default null,
  p_callback_at  timestamptz default null
)
returns void
language plpgsql security definer set search_path = public as $$
declare v_intentos integer;
begin
  insert into public.llamadas (
    colegiado_id, operador_id, resultado, confirma_plancha1, notas, callback_at
  ) values (
    p_colegiado_id, auth.uid(), p_resultado, p_confirma, p_notas, p_callback_at
  );

  if p_resultado = 'no_contesta' then
    update public.padron
       set intentos_no_contesta = intentos_no_contesta + 1
     where id = p_colegiado_id
     returning intentos_no_contesta into v_intentos;

    if v_intentos >= 3 then
      update public.padron
         set estado_gestion = 'no_comunicacion', asignado_a = null, bloqueado_hasta = null
       where id = p_colegiado_id;
    else
      update public.padron
         set estado_gestion = 'en_proceso', bloqueado_hasta = null
       where id = p_colegiado_id;
    end if;

  elsif p_resultado = 'volver_a_llamar' then
    update public.padron
       set estado_gestion = 'en_proceso', bloqueado_hasta = p_callback_at
     where id = p_colegiado_id;

  elsif p_resultado in ('efectiva_confirma', 'efectiva_no_confirma') then
    update public.padron
       set estado_gestion = 'contactado', asignado_a = null, bloqueado_hasta = null
     where id = p_colegiado_id;

  elsif p_resultado in ('numero_equivocado', 'rechaza') then
    update public.padron
       set estado_gestion = 'cerrado', asignado_a = null, bloqueado_hasta = null
     where id = p_colegiado_id;
  end if;
end;
$$;
grant execute on function public.registrar_llamada(bigint, text, boolean, text, timestamptz) to authenticated;


-- ─── FASE 0: Verificate (búsqueda pública) ───────────────────────────────────

-- Búsqueda por nombre, código (integer) o cédula.
-- padron.codigo INTEGER; p_q TEXT → cast ::integer cuando sea numérico.
-- Retorna codigo::text para compatibilidad con el frontend TypeScript.
-- Accesible por anon (página pública).
drop function if exists public.buscar_colegiado(text);
create or replace function public.buscar_colegiado(p_q text)
returns table (
  id               bigint,
  codigo           text,       -- retornado como TEXT aunque internamente es INTEGER
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

  -- Búsqueda por código exacto (solo dígitos, sin guiones)
  if q ~ '^\d+$' then
    return query
      select
        p.id,
        p.codigo::text,
        p.nombre_completo, p.cedula, p.telefono, p.celular,
        p.regional, p.provincia, p.nucleo, p.carrera,
        p.pensionado, p.nuevo_integrante,
        ( coalesce(p.monto_deuda, 0) > 0
          or exists (
            select 1 from public.deudas_votantes d
             where d.codigo = p.codigo          -- ambos INTEGER ✓
          )
        ) as tiene_deuda
      from public.padron p
      where p.codigo = q::integer               -- padron.codigo es INTEGER
      limit 10;
    return;
  end if;

  -- Búsqueda por cédula (dígitos y guiones)
  if q ~ '^[\d\-]+$' then
    return query
      select
        p.id, p.codigo::text,
        p.nombre_completo, p.cedula, p.telefono, p.celular,
        p.regional, p.provincia, p.nucleo, p.carrera,
        p.pensionado, p.nuevo_integrante,
        ( coalesce(p.monto_deuda, 0) > 0
          or exists (select 1 from public.deudas_votantes d where d.codigo = p.codigo)
        ) as tiene_deuda
      from public.padron p
      where p.cedula ilike '%' || q || '%'
      order by p.nombre_completo
      limit 50;
    return;
  end if;

  -- Búsqueda por nombre con múltiples tokens
  tokens := array(
    select t from unnest(string_to_array(q, ' ')) t
    where length(trim(t)) >= 2
  );
  if array_length(tokens, 1) is null then return; end if;

  sql := $sql$
    select
      p.id, p.codigo::text,
      p.nombre_completo, p.cedula, p.telefono, p.celular,
      p.regional, p.provincia, p.nucleo, p.carrera,
      p.pensionado, p.nuevo_integrante,
      ( coalesce(p.monto_deuda, 0) > 0
        or exists (select 1 from public.deudas_votantes d where d.codigo = p.codigo)
      ) as tiene_deuda
    from public.padron p
    where true
  $sql$;

  foreach token in array tokens loop
    sql := sql || format(' and p.nombre_completo ilike %L', '%' || trim(token) || '%');
  end loop;

  sql := sql || ' order by p.nombre_completo limit 50';
  return query execute sql;
end;
$$;
grant execute on function public.buscar_colegiado(text) to anon, authenticated;


-- Registra preferencia en verificate validando la cédula como pin.
-- padron.codigo INTEGER; p_codigo llega como TEXT → cast ::integer
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
   where codigo = p_codigo::integer    -- INTEGER
   limit 1;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Colegiado no encontrado.');
  end if;

  -- Comparar cédulas ignorando guiones y espacios
  if regexp_replace(v_cedula_bd, '[^0-9]', '', 'g') <>
     regexp_replace(p_cedula,    '[^0-9]', '', 'g') then
    return jsonb_build_object('ok', false, 'error',
      'La cédula no coincide con el registro.');
  end if;

  update public.padron
     set simpatiza_verificate = p_simpatiza,
         voto_verificate_at   = now()
   where codigo = p_codigo::integer;   -- INTEGER

  return jsonb_build_object('ok', true, 'nombre', v_nombre);
end;
$$;
grant execute on function public.marcar_preferencia_verificate(text, text, boolean)
  to anon, authenticated;


-- ─── Dashboards ──────────────────────────────────────────────────────────────

drop function if exists public.kpis_generales();
create or replace function public.kpis_generales()
returns table (
  total_colegiados   bigint,
  total_miembros     bigint,
  pendientes         bigint,
  en_proceso         bigint,
  contactados        bigint,
  no_comunicacion    bigint,
  cerrados           bigint,
  confirmados_p1     bigint,
  tasa_confirmacion  numeric,
  nuevos_integrantes bigint,
  pensionados        bigint
)
language sql security definer stable set search_path = public as $$
  select
    count(*)                                                         as total_colegiados,
    count(*)                                                         as total_miembros,
    count(*) filter (where estado_gestion = 'pendiente')             as pendientes,
    count(*) filter (where estado_gestion = 'en_proceso')            as en_proceso,
    count(*) filter (where estado_gestion = 'contactado')            as contactados,
    count(*) filter (where estado_gestion = 'no_comunicacion')       as no_comunicacion,
    count(*) filter (where estado_gestion = 'cerrado')               as cerrados,
    (select count(*) from public.llamadas
      where resultado = 'efectiva_confirma')                         as confirmados_p1,
    case
      when count(*) filter (
        where estado_gestion in ('contactado','cerrado')
      ) > 0 then round(
        (select count(*)::numeric from public.llamadas
          where resultado = 'efectiva_confirma')
        / count(*) filter (where estado_gestion in ('contactado','cerrado'))
        * 100, 1
      )
      else 0
    end                                                              as tasa_confirmacion,
    count(*) filter (where nuevo_integrante = true)                  as nuevos_integrantes,
    count(*) filter (where pensionado = true)                        as pensionados
  from public.padron
  where public.mi_rol() in (
    'supervisor','gerente','presidente','dirigente','colaborador'
  );
$$;
grant execute on function public.kpis_generales() to authenticated;


-- padron.asignado_a UUID, profiles.id UUID → join directo sin cast
drop function if exists public.panel_operadores();
create or replace function public.panel_operadores()
returns table (
  operador_id          uuid,
  nombre               text,
  rol                  text,
  colegiado_activo     boolean,
  miembro_activo       boolean,
  llamadas_total       bigint,
  efectivas_total      bigint,
  confirmados_p1_total bigint,
  no_contesta_total    bigint,
  llamadas_hoy         bigint,
  efectivas_hoy        bigint,
  confirmados_p1_hoy   bigint,
  no_contesta_hoy      bigint,
  ultima_actividad     timestamptz
)
language sql security definer stable set search_path = public as $$
  select
    p.id                                            as operador_id,
    p.nombre,
    p.rol,
    exists(
      select 1 from public.padron px
       where px.asignado_a = p.id              -- UUID = UUID ✓
         and px.estado_gestion = 'en_proceso'
         and px.bloqueado_hasta > now()
    )                                               as colegiado_activo,
    exists(
      select 1 from public.padron px
       where px.asignado_a = p.id
         and px.estado_gestion = 'en_proceso'
         and px.bloqueado_hasta > now()
    )                                               as miembro_activo,
    count(l.id)                                     as llamadas_total,
    count(l.id) filter (where l.resultado in (
      'efectiva_confirma','efectiva_no_confirma'
    ))                                              as efectivas_total,
    count(l.id) filter (
      where l.resultado = 'efectiva_confirma'
    )                                               as confirmados_p1_total,
    count(l.id) filter (
      where l.resultado = 'no_contesta'
    )                                               as no_contesta_total,
    count(l.id) filter (where l.fecha_hora >=
      (current_date at time zone 'America/Santo_Domingo')
    )                                               as llamadas_hoy,
    count(l.id) filter (where l.fecha_hora >=
      (current_date at time zone 'America/Santo_Domingo')
      and l.resultado in ('efectiva_confirma','efectiva_no_confirma')
    )                                               as efectivas_hoy,
    count(l.id) filter (where l.fecha_hora >=
      (current_date at time zone 'America/Santo_Domingo')
      and l.resultado = 'efectiva_confirma'
    )                                               as confirmados_p1_hoy,
    count(l.id) filter (where l.fecha_hora >=
      (current_date at time zone 'America/Santo_Domingo')
      and l.resultado = 'no_contesta'
    )                                               as no_contesta_hoy,
    max(l.fecha_hora)                               as ultima_actividad
  from public.profiles p
  left join public.llamadas l on l.operador_id = p.id
  where p.activo = true
    and public.mi_rol() in ('supervisor','gerente','presidente')
  group by p.id, p.nombre, p.rol
  order by llamadas_hoy desc;
$$;
grant execute on function public.panel_operadores() to authenticated;


drop function if exists public.historial_operador(uuid);
create or replace function public.historial_operador(p_operador_id uuid)
returns table (
  llamada_id       bigint,
  fecha_hora       timestamptz,
  colegiado_nombre text,
  miembro_nombre   text,
  codigo           text,
  resultado        text,
  confirma_p1      boolean,
  notas            text
)
language sql security definer stable set search_path = public as $$
  select
    l.id              as llamada_id,
    l.fecha_hora,
    p.nombre_completo as colegiado_nombre,
    p.nombre_completo as miembro_nombre,
    p.codigo::text,                   -- INTEGER → TEXT
    l.resultado,
    l.confirma_plancha1 as confirma_p1,
    l.notas
  from public.llamadas l
  join public.padron p on p.id = l.colegiado_id
  where l.operador_id = p_operador_id
    and public.mi_rol() in ('supervisor','gerente','presidente')
  order by l.fecha_hora desc
  limit 500;
$$;
grant execute on function public.historial_operador(uuid) to authenticated;


-- padron.asignado_a UUID, profiles.id UUID → join directo
drop function if exists public.listar_padron_regional(text);
create or replace function public.listar_padron_regional(p_regional text)
returns table (
  id               bigint,
  regional         text,
  provincia        text,
  nucleo           text,
  codigo           text,
  nombre_completo  text,
  telefono         text,
  celular          text,
  carrera          text,
  pensionado       boolean,
  nuevo_integrante boolean,
  estado_gestion   text,
  asignado_a       text,
  ultima_llamada   timestamptz,
  ultimo_resultado text,
  ultimo_confirma  boolean,
  ultima_nota      text
)
language sql security definer stable set search_path = public as $$
  select
    p.id, p.regional, p.provincia, p.nucleo,
    p.codigo::text,                   -- INTEGER → TEXT
    p.nombre_completo, p.telefono, p.celular, p.carrera,
    p.pensionado, p.nuevo_integrante, p.estado_gestion,
    pr.nombre            as asignado_a,
    l.fecha_hora         as ultima_llamada,
    l.resultado          as ultimo_resultado,
    l.confirma_plancha1  as ultimo_confirma,
    l.notas              as ultima_nota
  from public.padron p
  left join public.profiles pr on pr.id = p.asignado_a   -- UUID = UUID ✓
  left join lateral (
    select fecha_hora, resultado, confirma_plancha1, notas
      from public.llamadas
     where colegiado_id = p.id
     order by fecha_hora desc
     limit 1
  ) l on true
  where p.regional = p_regional
    and public.mi_rol() in (
      'supervisor','gerente','presidente','dirigente','colaborador'
    )
  order by p.nombre_completo;
$$;
grant execute on function public.listar_padron_regional(text) to authenticated;


drop function if exists public.simpatizantes_por_regularizar();
create or replace function public.simpatizantes_por_regularizar()
returns table (
  id                 bigint,
  codigo             text,
  nombre_completo    text,
  regional           text,
  nucleo             text,
  telefono           text,
  celular            text,
  voto_verificate_at timestamptz,
  estado_gestion     text
)
language sql security definer stable set search_path = public as $$
  select
    p.id,
    p.codigo::text,               -- INTEGER → TEXT
    p.nombre_completo, p.regional, p.nucleo,
    p.telefono, p.celular,
    p.voto_verificate_at, p.estado_gestion
  from public.padron p
  where p.simpatiza_verificate = true
    and p.estado_gestion not in ('contactado','cerrado')
    and public.mi_rol() in (
      'supervisor','gerente','presidente','dirigente','colaborador'
    )
  order by p.voto_verificate_at desc;
$$;
grant execute on function public.simpatizantes_por_regularizar() to authenticated;


-- ─── FASE 2: Dirigente / confirmaciones ──────────────────────────────────────

-- padron.codigo INTEGER; p_codigo TEXT → cast ::integer
drop function if exists public.confirmar_colegiado(text, text);
create or replace function public.confirmar_colegiado(
  p_codigo    text,
  p_intencion text   -- 'favorable' | 'indeciso' | 'en_contra'
)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if public.mi_rol() not in (
    'dirigente','colaborador','gerente','presidente','supervisor'
  ) then
    raise exception 'Sin permisos para confirmar colegiados';
  end if;

  if p_intencion not in ('favorable','indeciso','en_contra') then
    raise exception 'Intención inválida: use favorable, indeciso o en_contra';
  end if;

  update public.padron
     set confirmado_por         = (select nombre from public.profiles
                                    where id = auth.uid()),
         confirmacion_intencion = p_intencion,
         confirmacion_at        = now()
   where codigo = p_codigo::integer;   -- INTEGER

  if not found then
    raise exception 'Colegiado no encontrado: %', p_codigo;
  end if;
end;
$$;
grant execute on function public.confirmar_colegiado(text, text) to authenticated;


drop function if exists public.listar_confirmados_dirigente(text);
create or replace function public.listar_confirmados_dirigente(
  p_dirigente text default null
)
returns table (
  codigo                 text,
  nombre_completo        text,
  regional               text,
  nucleo                 text,
  confirmado_por         text,
  confirmacion_intencion text,
  confirmacion_at        timestamptz,
  via_verificate         boolean
)
language sql security definer stable set search_path = public as $$
  select
    p.codigo::text,               -- INTEGER → TEXT
    p.nombre_completo, p.regional, p.nucleo,
    p.confirmado_por, p.confirmacion_intencion, p.confirmacion_at,
    p.simpatiza_verificate as via_verificate
  from public.padron p
  where (p.confirmado_por is not null or p.simpatiza_verificate = true)
    and (p_dirigente is null or p.confirmado_por = p_dirigente)
    and public.mi_rol() in (
      'supervisor','gerente','presidente','dirigente','colaborador'
    )
  order by p.confirmado_por nulls last, p.nombre_completo;
$$;
grant execute on function public.listar_confirmados_dirigente(text) to authenticated;


-- ─── FASE 3: Día de elección ──────────────────────────────────────────────────

-- votos_dia.codigo INTEGER; p_codigo TEXT → cast ::integer
-- votos_dia.registrado_por TEXT; auth.uid() UUID → cast ::text
drop function if exists public.registrar_voto_dia(text);
create or replace function public.registrar_voto_dia(p_codigo text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_mesa       text;
  v_habilitado boolean;
  v_rol        text;
begin
  select rol, mesa into v_rol, v_mesa
    from public.profiles
   where id = auth.uid();

  if v_rol not in ('delegado','suplente','supervisor','gerente','presidente') then
    return jsonb_build_object('ok', false, 'error', 'Sin permisos para registrar votos');
  end if;

  if v_mesa is null and v_rol in ('delegado','suplente') then
    return jsonb_build_object('ok', false, 'error', 'No tienes mesa asignada');
  end if;

  select votante_habilitado into v_habilitado
    from public.padron
   where codigo = p_codigo::integer;   -- INTEGER

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Colegiado no encontrado');
  end if;

  insert into public.votos_dia (codigo, mesa, registrado_por, estaba_habilitado)
  values (
    p_codigo::integer,              -- votos_dia.codigo INTEGER
    v_mesa,
    auth.uid()::text,               -- votos_dia.registrado_por TEXT
    coalesce(v_habilitado, false)
  );

  return jsonb_build_object(
    'ok',        true,
    'habilitado', coalesce(v_habilitado, false),
    'mesa',       v_mesa
  );
end;
$$;
grant execute on function public.registrar_voto_dia(text) to authenticated;


-- Conteo en tiempo real para el presidente.
-- Las vistas v_alerta_* están creadas arriba.
drop function if exists public.conteo_votos_dia();
create or replace function public.conteo_votos_dia()
returns table (
  total_votos          bigint,
  por_mesa             jsonb,
  por_regional         jsonb,
  alertas_doble        bigint,
  alertas_nohabilitado bigint
)
language sql security definer stable set search_path = public as $$
  select
    (select count(*) from public.votos_dia)                      as total_votos,
    (select jsonb_object_agg(mesa, cnt)
       from (select coalesce(mesa,'Sin mesa') as mesa, count(*) as cnt
               from public.votos_dia group by mesa) x)           as por_mesa,
    (select jsonb_object_agg(regional, cnt)
       from (select coalesce(p.regional,'Sin regional') as regional,
                    count(*) as cnt
               from public.votos_dia v
               join public.padron p on p.codigo = v.codigo   -- INTEGER = INTEGER ✓
              group by p.regional) x)                            as por_regional,
    (select count(*) from public.v_alerta_doble_voto)            as alertas_doble,
    (select count(*) from public.v_alerta_no_habilitado)         as alertas_nohabilitado;
$$;
grant execute on function public.conteo_votos_dia() to authenticated;


-- ─── FASE 4: Deuda editable ───────────────────────────────────────────────────

-- padron.codigo INTEGER; p_codigo TEXT → cast ::integer
-- deuda_historial.codigo TEXT (guardado como texto para legibilidad)
drop function if exists public.actualizar_deuda(text, int);
drop function if exists public.actualizar_deuda(text, integer);
create or replace function public.actualizar_deuda(
  p_codigo      text,
  p_monto_nuevo integer
)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_monto_anterior      integer;
  v_nombre_actualizador text;
begin
  if public.mi_rol() not in (
    'dirigente','colaborador','gerente','presidente','supervisor'
  ) then
    raise exception 'Sin permisos para editar deudas';
  end if;

  select monto_deuda into v_monto_anterior
    from public.padron
   where codigo = p_codigo::integer;   -- INTEGER

  if not found then
    raise exception 'Colegiado no encontrado: %', p_codigo;
  end if;

  select nombre into v_nombre_actualizador
    from public.profiles
   where id = auth.uid();

  update public.padron
     set monto_deuda = p_monto_nuevo
   where codigo = p_codigo::integer;   -- INTEGER

  insert into public.deuda_historial (
    codigo, monto_anterior, monto_nuevo, actualizado_por, actualizado_en
  ) values (
    p_codigo::integer,      -- deuda_historial.codigo es INTEGER
    v_monto_anterior, p_monto_nuevo, v_nombre_actualizador, now()
  );
end;
$$;
grant execute on function public.actualizar_deuda(text, integer) to authenticated;


drop function if exists public.historial_deuda(text);
create or replace function public.historial_deuda(p_codigo text)
returns table (
  monto_anterior  integer,
  monto_nuevo     integer,
  actualizado_por text,
  actualizado_en  timestamptz
)
language sql security definer stable set search_path = public as $$
  select monto_anterior, monto_nuevo, actualizado_por, actualizado_en
    from public.deuda_historial
   where codigo = p_codigo::integer  -- INTEGER = INTEGER ✓
   order by actualizado_en desc;
$$;
grant execute on function public.historial_deuda(text) to authenticated;


-- ─── stats_nucleos (ya existía; se incluye para asegurar versión correcta) ───

create or replace function public.stats_nucleos()
returns table (
  nucleo         text,
  carrera_nombre text,
  total          bigint
)
language sql security definer stable set search_path = public as $$
  select
    c.nucleo,
    c.nombre  as carrera_nombre,
    count(distinct cc.codigo) as total
  from carreras c
  left join colegiado_carreras cc on cc.carrera_id = c.id
  group by c.nucleo, c.nombre
  order by c.nucleo, c.nombre
$$;
grant execute on function public.stats_nucleos() to authenticated, anon;

-- ════════════════════════════════════════════════════════════════════════════
-- FIN — todas las RPCs y vistas están listas.
-- Paso manual post-ejecución:
--   En Supabase Dashboard → Database → Replication:
--   habilitar tabla votos_dia para Realtime (necesario para el contador
--   en tiempo real del Día de Elección en el portal Presidente).
-- ════════════════════════════════════════════════════════════════════════════
