-- ════════════════════════════════════════════════════════════════════════
-- PASO 4 — Reporte final del listado de Thania Rodríguez, ya cargado y con
-- monto_deuda actualizado por scripts/consultar_deuda_thania.mjs.
-- Correr en el SQL Editor de Supabase y usar "Download CSV".
--
-- Filtra por confirmado_por = el nombre de la dirigente, así que refleja
-- exactamente lo que ella ve en su panel /dirigente.
-- ════════════════════════════════════════════════════════════════════════

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
  p.pensionado,
  p.confirmado_por,
  p.confirmacion_intencion,
  p.confirmacion_at,
  sum(coalesce(p.monto_deuda, 0)) over ()           as deuda_total_listado
from public.padron p
join auth.users u on lower(u.email) = 'thaniarodriguez@eleccionescodia.app'
join public.profiles pr on pr.id = u.id
where p.confirmado_por = pr.nombre
order by coalesce(p.monto_deuda, 0) desc, p.nombre_completo;
