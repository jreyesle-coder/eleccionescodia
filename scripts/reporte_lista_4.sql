-- ════════════════════════════════════════════════════════════════════════
-- PASO 3 — Reporte final de la lista 4, ya con monto_deuda actualizado
-- por scripts/consultar_deuda_lista_4.mjs.
-- Correr en el SQL Editor de Supabase y usar "Download CSV".
--
-- IMPORTANTE: la lista de códigos debe ser la misma final del PASO 2
-- (los 14 originales + los resueltos por nombre en el PASO 1).
-- ════════════════════════════════════════════════════════════════════════

with lista as (
  select unnest(array[
    31055, 33446, 21678, 14840, 36520, 23143, 15486, 10717,
    34103, 14523, 45579, 44287, 30362, 47902
    -- , <agregar aquí los códigos resueltos por nombre>
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
