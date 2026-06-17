-- ════════════════════════════════════════════════════════════════════════
-- MEJORAS DASHBOARD PRESIDENTE
-- 1. simpatizantes_por_regularizar: agrega monto_deuda, pensionado, tiene_deuda
--    y ordena por monto_deuda ASC (menor deuda primero).
-- 2. stats_nucleos: agrega confirmados por nucleo/carrera.
-- 3. listar_confirmados_nucleo: drilldown de confirmados por nucleo+carrera.
-- 4. confirmados_callcenter_count: KPI de confirmados via call center.
-- ════════════════════════════════════════════════════════════════════════

-- ── 1. simpatizantes_por_regularizar con deuda ───────────────────────────────
drop function if exists public.simpatizantes_por_regularizar();
create or replace function public.simpatizantes_por_regularizar()
returns table (
  id                 bigint,
  codigo             text,
  nombre_completo    text,
  cedula             text,
  telefono           text,
  celular            text,
  regional           text,
  provincia          text,
  nucleo             text,
  carrera            text,
  pensionado         boolean,
  tiene_deuda        boolean,
  monto_deuda        int,
  voto_verificate_at timestamptz
)
language sql security definer stable set search_path = public as $$
  select
    p.id,
    p.codigo::text,
    p.nombre_completo,
    p.cedula,
    p.telefono,
    p.celular,
    p.regional,
    p.provincia,
    p.nucleo,
    p.carrera,
    p.pensionado,
    ( coalesce(p.monto_deuda, 0) > 0
      or exists (
        select 1 from public.deudas_votantes dv
         where dv.codigo = p.codigo
      )
    ) as tiene_deuda,
    coalesce(p.monto_deuda, 0) as monto_deuda,
    p.voto_verificate_at
  from public.padron p
  where p.simpatiza_verificate = true
    and (
      coalesce(p.monto_deuda, 0) > 0
      or p.pensionado = true
      or exists (
        select 1 from public.deudas_votantes dv
         where dv.codigo = p.codigo
      )
    )
    and public.mi_rol() in (
      'supervisor','gerente','presidente','dirigente','colaborador'
    )
  order by
    coalesce(p.monto_deuda, 0) asc,   -- menor deuda primero
    p.pensionado asc,                   -- pensionados al final
    p.nombre_completo asc;
$$;
grant execute on function public.simpatizantes_por_regularizar() to authenticated;


-- ── 2. stats_nucleos con confirmados ─────────────────────────────────────────
drop function if exists public.stats_nucleos();
create or replace function public.stats_nucleos()
returns table (
  nucleo              text,
  carrera_nombre      text,
  total               bigint,
  confirmados         bigint,
  confirmados_callcenter bigint,
  confirmados_verificate bigint,
  confirmados_dirigente  bigint
)
language sql security definer stable set search_path = public as $$
  select
    c.nucleo,
    c.nombre                      as carrera_nombre,
    count(distinct cc.codigo)     as total,
    -- Total confirmados (cualquier fuente, sin duplicar por persona)
    count(distinct cc.codigo) filter (
      where exists (
        select 1 from public.padron p2
         where p2.codigo::text = cc.codigo
           and (
             exists (
               select 1 from public.llamadas l
                where l.colegiado_id = p2.id
                  and l.resultado = 'efectiva_confirma'
             )
             or p2.simpatiza_verificate = true
             or p2.confirmacion_intencion = 'favorable'
           )
      )
    )                             as confirmados,
    count(distinct cc.codigo) filter (
      where exists (
        select 1 from public.padron p2
         where p2.codigo::text = cc.codigo
           and exists (
             select 1 from public.llamadas l
              where l.colegiado_id = p2.id
                and l.resultado = 'efectiva_confirma'
           )
      )
    )                             as confirmados_callcenter,
    count(distinct cc.codigo) filter (
      where exists (
        select 1 from public.padron p2
         where p2.codigo::text = cc.codigo
           and p2.simpatiza_verificate = true
      )
    )                             as confirmados_verificate,
    count(distinct cc.codigo) filter (
      where exists (
        select 1 from public.padron p2
         where p2.codigo::text = cc.codigo
           and p2.confirmacion_intencion = 'favorable'
      )
    )                             as confirmados_dirigente
  from carreras c
  left join colegiado_carreras cc on cc.carrera_id = c.id
  group by c.nucleo, c.nombre
  order by c.nucleo, c.nombre;
$$;
grant execute on function public.stats_nucleos() to authenticated, anon;


-- ── 3. listar_confirmados_nucleo — drilldown ──────────────────────────────────
drop function if exists public.listar_confirmados_nucleo(text, text);
create or replace function public.listar_confirmados_nucleo(
  p_nucleo  text,
  p_carrera text default null
)
returns table (
  codigo             text,
  nombre_completo    text,
  regional           text,
  nucleo             text,
  carrera            text,
  via_callcenter     boolean,
  via_verificate     boolean,
  via_dirigente      boolean,
  confirmado_por     text,
  confirmacion_intencion text
)
language sql security definer stable set search_path = public as $$
  select distinct on (p.codigo)
    p.codigo::text,
    p.nombre_completo,
    p.regional,
    p.nucleo,
    p.carrera,
    exists (
      select 1 from public.llamadas l
       where l.colegiado_id = p.id
         and l.resultado = 'efectiva_confirma'
    )                                 as via_callcenter,
    coalesce(p.simpatiza_verificate, false) as via_verificate,
    (p.confirmacion_intencion = 'favorable') as via_dirigente,
    p.confirmado_por,
    p.confirmacion_intencion
  from public.padron p
  where p.nucleo = p_nucleo
    and (p_carrera is null or p.carrera = p_carrera)
    and (
      exists (
        select 1 from public.llamadas l
         where l.colegiado_id = p.id
           and l.resultado = 'efectiva_confirma'
      )
      or p.simpatiza_verificate = true
      or p.confirmacion_intencion = 'favorable'
    )
    and public.mi_rol() in (
      'supervisor','gerente','presidente','dirigente','colaborador'
    )
  order by p.codigo, p.nombre_completo;
$$;
grant execute on function public.listar_confirmados_nucleo(text, text) to authenticated;


-- ── 4. confirmados_callcenter_count — KPI rápido ─────────────────────────────
drop function if exists public.confirmados_callcenter_count();
create or replace function public.confirmados_callcenter_count()
returns bigint
language sql security definer stable set search_path = public as $$
  select count(distinct colegiado_id)
    from public.llamadas
   where resultado = 'efectiva_confirma'
     and public.mi_rol() in (
       'supervisor','gerente','presidente','dirigente','colaborador'
     );
$$;
grant execute on function public.confirmados_callcenter_count() to authenticated;
