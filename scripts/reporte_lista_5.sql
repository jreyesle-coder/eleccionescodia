-- ════════════════════════════════════════════════════════════════════════
-- PASO 3 — Reporte final de la lista 5, ya con monto_deuda actualizado
-- por scripts/consultar_deuda_lista_5.mjs.
-- Correr en el SQL Editor de Supabase y usar "Download CSV".
--
-- IMPORTANTE: la lista de códigos debe ser la misma final del PASO 2
-- (los 17 únicos + los resueltos por nombre en el PASO 1).
-- ════════════════════════════════════════════════════════════════════════

with lista as (
  select unnest(array[
    32799, 32790, 32791, 29983, 27461, 39874, 26247, 31581, 22271,
    50614, 31307, 34224, 34100, 24256, 24255, 31309, 29985
    -- , <agregar aquí los códigos de Acenet Rodríguez y Ramona Rodríguez>
  ]) as codigo
)
select
  count(*) over ()                                  as total_filas,
  p.codigo,
  p.nombre_completo,
  p.cedula,
  p.nucleo,
  p.regional,
  p.provincia,
  p.centro_votacion,
  coalesce(p.telefono, p.celular)                   as contacto,
  coalesce(p.monto_deuda, 0)                        as monto_deuda,
  case when coalesce(p.monto_deuda, 0) > 0
       then 'CON DEUDA' else 'AL DIA' end           as estatus_deuda,
  p.votante_habilitado,
  p.confirmado_por,
  p.confirmacion_intencion,
  sum(coalesce(p.monto_deuda, 0)) over ()           as deuda_total_lista
from lista l
join public.padron p on p.codigo = l.codigo
order by coalesce(p.monto_deuda, 0) desc, p.nombre_completo;
