-- ════════════════════════════════════════════════════════════════════════
-- Consulta para Excel:
--   (1) Deuda del listado de los dirigentes Juan Santos y Marcy Germán
--   (2) Pensionados votantes de los núcleos Electromecánicos y Químicos
-- Correr en el SQL Editor de Supabase (service_role). Exportar cada
-- resultado como CSV, o pegar el resultado para armar el .xlsx.
-- ════════════════════════════════════════════════════════════════════════

-- ── (1) DEUDA DEL LISTADO DE DIRIGENTES ─────────────────────────────────────
-- Listado = padron.confirmado_por coincide con el nombre del dirigente.
select
  p.confirmado_por                         as dirigente,
  p.codigo,
  p.nombre_completo,
  p.cedula,
  p.nucleo,
  p.regional,
  p.centro_votacion,
  coalesce(p.telefono, p.celular)          as contacto,
  coalesce(p.monto_deuda, 0)               as monto_deuda,
  ( coalesce(p.monto_deuda, 0) > 0
    or exists (select 1 from public.deudas_votantes d where d.codigo = p.codigo)
  )                                        as tiene_deuda,
  p.confirmacion_intencion,
  p.votante_habilitado
from public.padron p
where lower(p.confirmado_por) ilike '%juan%santos%'
   or lower(p.confirmado_por) ilike '%marcy%german%'
   or lower(p.confirmado_por) ilike '%marcy%germán%'
order by p.confirmado_por, coalesce(p.monto_deuda,0) desc, p.nombre_completo;


-- ── (2) PENSIONADOS VOTANTES: ELECTROMECÁNICOS Y QUÍMICOS ────────────────────
select
  p.nucleo,
  p.codigo,
  p.nombre_completo,
  p.cedula,
  p.regional,
  p.provincia,
  p.centro_votacion,
  coalesce(p.telefono, p.celular)          as contacto,
  coalesce(p.monto_deuda, 0)               as monto_deuda,
  p.confirmado_por,
  p.confirmacion_intencion
from public.padron p
where p.pensionado = true
  and p.votante_habilitado = true
  and ( p.nucleo ilike '%electromecanic%'
     or p.nucleo ilike '%electromecánic%'
     or p.nucleo ilike '%quimic%'
     or p.nucleo ilike '%químic%' )
order by p.nucleo, p.nombre_completo;
