-- ════════════════════════════════════════════════════════════════════════
-- RPCs de dashboard reescritos para tabla padron (reemplaza versiones
-- que usaban la tabla miembros del fork ICPARD).
-- ════════════════════════════════════════════════════════════════════════

-- ── kpis_generales ────────────────────────────────────────────────────────────
drop function if exists public.kpis_generales();
create or replace function public.kpis_generales()
returns table (
  total_colegiados    bigint,
  total_miembros      bigint,   -- alias de compatibilidad
  pendientes          bigint,
  en_proceso          bigint,
  contactados         bigint,
  no_comunicacion     bigint,
  cerrados            bigint,
  confirmados_p1      bigint,
  tasa_confirmacion   numeric,
  nuevos_integrantes  bigint,
  pensionados         bigint
)
language sql security definer stable set search_path = public as $$
  select
    count(*)                                                        as total_colegiados,
    count(*)                                                        as total_miembros,
    count(*) filter (where estado_gestion = 'pendiente')            as pendientes,
    count(*) filter (where estado_gestion = 'en_proceso')           as en_proceso,
    count(*) filter (where estado_gestion = 'contactado')           as contactados,
    count(*) filter (where estado_gestion = 'no_comunicacion')      as no_comunicacion,
    count(*) filter (where estado_gestion = 'cerrado')              as cerrados,
    (select count(*) from public.llamadas where resultado = 'efectiva_confirma')
                                                                    as confirmados_p1,
    case
      when count(*) filter (where estado_gestion in ('contactado','cerrado')) > 0
        then round(
          (select count(*)::numeric from public.llamadas where resultado = 'efectiva_confirma')
          / count(*) filter (where estado_gestion in ('contactado','cerrado'))
          * 100, 1
        )
      else 0
    end                                                             as tasa_confirmacion,
    count(*) filter (where nuevo_integrante = true)                 as nuevos_integrantes,
    count(*) filter (where pensionado = true)                       as pensionados
  from public.padron
  where public.mi_rol() in ('supervisor','gerente','presidente','dirigente','colaborador');
$$;
grant execute on function public.kpis_generales() to authenticated;

-- ── panel_operadores ──────────────────────────────────────────────────────────
drop function if exists public.panel_operadores();
create or replace function public.panel_operadores()
returns table (
  operador_id          uuid,
  nombre               text,
  rol                  text,
  colegiado_activo     boolean,
  miembro_activo       boolean,   -- alias de compatibilidad
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
    p.id                                                              as operador_id,
    p.nombre,
    p.rol,
    exists(
      select 1 from public.padron px
       where px.asignado_a = p.id
         and px.estado_gestion = 'en_proceso'
         and px.bloqueado_hasta > now()
    )                                                                 as colegiado_activo,
    exists(
      select 1 from public.padron px
       where px.asignado_a = p.id
         and px.estado_gestion = 'en_proceso'
         and px.bloqueado_hasta > now()
    )                                                                 as miembro_activo,
    count(l.id)                                                       as llamadas_total,
    count(l.id) filter (
      where l.resultado in ('efectiva_confirma','efectiva_no_confirma')
    )                                                                 as efectivas_total,
    count(l.id) filter (
      where l.resultado = 'efectiva_confirma'
    )                                                                 as confirmados_p1_total,
    count(l.id) filter (
      where l.resultado = 'no_contesta'
    )                                                                 as no_contesta_total,
    count(l.id) filter (
      where l.fecha_hora >= (current_date at time zone 'America/Santo_Domingo')
    )                                                                 as llamadas_hoy,
    count(l.id) filter (
      where l.fecha_hora >= (current_date at time zone 'America/Santo_Domingo')
        and l.resultado in ('efectiva_confirma','efectiva_no_confirma')
    )                                                                 as efectivas_hoy,
    count(l.id) filter (
      where l.fecha_hora >= (current_date at time zone 'America/Santo_Domingo')
        and l.resultado = 'efectiva_confirma'
    )                                                                 as confirmados_p1_hoy,
    count(l.id) filter (
      where l.fecha_hora >= (current_date at time zone 'America/Santo_Domingo')
        and l.resultado = 'no_contesta'
    )                                                                 as no_contesta_hoy,
    max(l.fecha_hora)                                                 as ultima_actividad
  from public.profiles p
  left join public.llamadas l on l.operador_id = p.id
  where p.activo = true
    and public.mi_rol() in ('supervisor','gerente','presidente')
  group by p.id, p.nombre, p.rol
  order by llamadas_hoy desc;
$$;
grant execute on function public.panel_operadores() to authenticated;

-- ── historial_operador ────────────────────────────────────────────────────────
drop function if exists public.historial_operador(uuid);
create or replace function public.historial_operador(p_operador_id uuid)
returns table (
  llamada_id       bigint,
  fecha_hora       timestamptz,
  colegiado_nombre text,
  miembro_nombre   text,   -- alias de compatibilidad
  codigo           text,
  resultado        text,
  confirma_p1      boolean,
  notas            text
)
language sql security definer stable set search_path = public as $$
  select
    l.id            as llamada_id,
    l.fecha_hora,
    p.nombre_completo as colegiado_nombre,
    p.nombre_completo as miembro_nombre,
    p.codigo,
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

-- ── listar_padron_regional ────────────────────────────────────────────────────
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
    p.id,
    p.regional,
    p.provincia,
    p.nucleo,
    p.codigo,
    p.nombre_completo,
    p.telefono,
    p.celular,
    p.carrera,
    p.pensionado,
    p.nuevo_integrante,
    p.estado_gestion,
    pr.nombre          as asignado_a,
    l.fecha_hora       as ultima_llamada,
    l.resultado        as ultimo_resultado,
    l.confirma_plancha1 as ultimo_confirma,
    l.notas            as ultima_nota
  from public.padron p
  left join public.profiles pr  on pr.id = p.asignado_a::uuid
  left join lateral (
    select fecha_hora, resultado, confirma_plancha1, notas
      from public.llamadas
     where colegiado_id = p.id
     order by fecha_hora desc
     limit 1
  ) l on true
  where p.regional = p_regional
    and public.mi_rol() in ('supervisor','gerente','presidente','dirigente','colaborador')
  order by p.nombre_completo;
$$;
grant execute on function public.listar_padron_regional(text) to authenticated;

-- ── simpatizantes_por_regularizar ─────────────────────────────────────────────
-- Colegiados que simpatizaron en verificate pero aún no tienen estado 'contactado'.
drop function if exists public.simpatizantes_por_regularizar();
create or replace function public.simpatizantes_por_regularizar()
returns table (
  id               bigint,
  codigo           text,
  nombre_completo  text,
  regional         text,
  nucleo           text,
  telefono         text,
  celular          text,
  voto_verificate_at timestamptz,
  estado_gestion   text
)
language sql security definer stable set search_path = public as $$
  select
    p.id, p.codigo, p.nombre_completo, p.regional, p.nucleo,
    p.telefono, p.celular, p.voto_verificate_at, p.estado_gestion
  from public.padron p
  where p.simpatiza_verificate = true
    and p.estado_gestion not in ('contactado','cerrado')
    and public.mi_rol() in ('supervisor','gerente','presidente','dirigente','colaborador')
  order by p.voto_verificate_at desc;
$$;
grant execute on function public.simpatizantes_por_regularizar() to authenticated;

-- ── vista_metricas_region ─────────────────────────────────────────────────────
create or replace view public.vista_metricas_region as
  select
    coalesce(p.regional, 'Sin regional') as region,
    count(*)                                                        as total,
    count(*) filter (where p.estado_gestion = 'pendiente')          as pendientes,
    count(*) filter (where p.estado_gestion = 'en_proceso')         as en_proceso,
    count(*) filter (where p.estado_gestion = 'contactado')         as contactados,
    count(*) filter (where p.estado_gestion = 'no_comunicacion')    as sin_comunicacion,
    count(*) filter (where p.estado_gestion = 'cerrado')            as cerrados,
    count(*) filter (
      where exists (
        select 1 from public.llamadas l
         where l.colegiado_id = p.id
           and l.resultado = 'efectiva_confirma'
      )
    )                                                               as confirmados_plancha1
  from public.padron p
  group by coalesce(p.regional, 'Sin regional')
  order by total desc;

-- ── vista_metricas_distrito (alias de regional para compatibilidad) ───────────
create or replace view public.vista_metricas_distrito as
  select
    coalesce(p.regional, 'Sin regional') as distrito,
    count(*)                                                        as total,
    count(*) filter (where p.estado_gestion = 'pendiente')          as pendientes,
    count(*) filter (where p.estado_gestion = 'en_proceso')         as en_proceso,
    count(*) filter (where p.estado_gestion = 'contactado')         as contactados,
    count(*) filter (where p.estado_gestion = 'no_comunicacion')    as sin_comunicacion,
    count(*) filter (where p.estado_gestion = 'cerrado')            as cerrados,
    count(*) filter (
      where exists (
        select 1 from public.llamadas l
         where l.colegiado_id = p.id
           and l.resultado = 'efectiva_confirma'
      )
    )                                                               as confirmados_plancha1
  from public.padron p
  group by coalesce(p.regional, 'Sin regional')
  order by total desc;

-- ── vista_padron_vivo ─────────────────────────────────────────────────────────
create or replace view public.vista_padron_vivo as
  select
    p.id,
    coalesce(p.regional, 'Sin regional') as regional,
    p.provincia,
    p.nucleo,
    p.codigo,
    p.nombre_completo,
    p.telefono,
    p.celular,
    p.carrera,
    p.pensionado,
    p.nuevo_integrante,
    p.estado_gestion,
    pr.nombre          as asignado_a,
    l.fecha_hora       as ultima_llamada,
    l.resultado        as ultimo_resultado,
    l.confirma_plancha1 as ultimo_confirma,
    l.notas            as ultima_nota
  from public.padron p
  left join public.profiles pr on pr.id = p.asignado_a::uuid
  left join lateral (
    select fecha_hora, resultado, confirma_plancha1, notas
      from public.llamadas
     where colegiado_id = p.id
     order by fecha_hora desc
     limit 1
  ) l on true;
