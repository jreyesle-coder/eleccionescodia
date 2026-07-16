-- ════════════════════════════════════════════════════════════════════════
-- PASO 1 — Ubicar la data de la lista 4 (14 códigos + 9 nombres)
-- Correr en el SQL Editor de Supabase (service_role).
-- Objetivo: confirmar a quién corresponde cada entrada y sacar los códigos
-- de los que vinieron solo por nombre, para alimentar el script de deuda.
-- ════════════════════════════════════════════════════════════════════════

with buscados as (
  select unnest(array[
    31055, 33446, 21678, 14840, 36520, 23143, 15486, 10717,
    34103, 14523, 45579, 44287, 30362, 47902
  ]) as codigo
),
por_nombre as (
  select unnest(array[
    '%brito%',        -- yris Brito
    '%wendy%reyes%',
    '%glory%pacheco%',
    '%portes%',       -- Anastacia Portes
    '%valerio%',      -- Annalies Valerio
    '%ani%diaz%',
    '%madeline%',     -- Madeline Pérez
    '%ruselis%',      -- Ruselis Cabral
    '%yanelys%'       -- Yanelys Figueroa
  ]) as patron
)
select
  count(*) over ()                    as total_filas,
  case when b.codigo is not null then 'codigo' else 'nombre' end as origen,
  coalesce(n.patron, '')              as patron_buscado,
  p.codigo,
  p.nombre_completo,
  p.cedula,
  p.nucleo,
  p.regional,
  p.provincia,
  p.centro_votacion,
  coalesce(p.telefono, p.celular)     as contacto,
  coalesce(p.monto_deuda, 0)          as monto_deuda_actual,
  p.votante_habilitado,
  p.confirmado_por,
  p.confirmacion_intencion
from public.padron p
left join buscados  b on b.codigo = p.codigo
left join por_nombre n on lower(p.nombre_completo) ilike n.patron
where b.codigo is not null or n.patron is not null
order by origen, p.nombre_completo;
