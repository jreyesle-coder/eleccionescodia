-- ════════════════════════════════════════════════════════════════════════
-- PASO 1 — Ubicar la data de la lista 5 (17 códigos únicos + 2 nombres)
-- Correr en el SQL Editor de Supabase (service_role).
-- Objetivo: confirmar a quién corresponde cada entrada y sacar los códigos
-- de Acenet Rodríguez y Ramona Rodríguez para alimentar el script de deuda.
-- ════════════════════════════════════════════════════════════════════════

with buscados as (
  select unnest(array[
    32799, 32790, 32791, 29983, 27461, 39874, 26247, 31581, 22271,
    50614, 31307, 34224, 34100, 24256, 24255, 31309, 29985
  ]) as codigo
),
por_nombre as (
  select unnest(array[
    '%acenet%',            -- Acenet Rodríguez
    '%ramona%rodriguez%',  -- Ramona Rodríguez
    '%ramona%rodríguez%'
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
