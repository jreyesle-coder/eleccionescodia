-- ════════════════════════════════════════════════════════════════════════
-- Listado de PENSIONADOS VOTANTES para Excel
-- Marca oficial: padron.pensionado_votante = true (listado 2026)
-- Ordenado por núcleo. Incluye teléfono de contacto.
-- Correr en el SQL Editor de Supabase (service_role) y exportar como CSV,
-- o pegar el resultado para armar el .xlsx.
-- ════════════════════════════════════════════════════════════════════════

select
  p.nucleo,
  p.codigo,
  p.nombre_completo,
  p.cedula,
  coalesce(nullif(trim(p.telefono), ''), p.celular) as contacto,
  p.telefono,
  p.celular,
  p.regional,
  p.provincia,
  p.centro_votacion
from public.padron p
where p.pensionado_votante = true
order by p.nucleo nulls last, p.nombre_completo;

-- Verificación de total:
-- select count(*) from public.padron where pensionado_votante = true;
