-- ═══════════════════════════════════════════════════════════════════════════
-- Fix: vista_metricas_distrito — confirmados_plancha1 ahora cuenta
-- confirmaciones por CUALQUIER vía: call center, dirigente o Verifícate.
-- ═══════════════════════════════════════════════════════════════════════════

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
    -- Confirmados por cualquier vía: call center + dirigente + verifícate
    count(*) filter (where
      p.simpatiza_verificate = true
      or p.confirmacion_intencion = 'favorable'
      or exists (
        select 1 from public.llamadas l
         where l.colegiado_id = p.id and l.resultado = 'efectiva_confirma'
      )
    )                                                               as confirmados_plancha1
  from public.padron p
  group by coalesce(p.regional, 'Sin regional')
  order by total desc;

-- ── Query de verificación: confirmados con deuda ──────────────────────────
-- Ejecuta esto en Supabase SQL Editor para responder la segunda pregunta:
--
-- select codigo, nombre_completo, regional, monto_deuda
--   from public.padron
--  where (
--    simpatiza_verificate = true
--    or confirmacion_intencion = 'favorable'
--    or exists (select 1 from public.llamadas l
--               where l.colegiado_id = padron.id and l.resultado = 'efectiva_confirma')
--  )
--    and tiene_deuda = true
--  order by monto_deuda desc;
