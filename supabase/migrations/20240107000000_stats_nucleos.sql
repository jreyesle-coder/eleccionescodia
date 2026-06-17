-- RPC: stats_nucleos
-- Retorna: por cada combinación (nucleo, carrera) el total de colegiados distintos,
-- usando colegiado_carreras + carreras (no padron.carrera).
-- La tabla carreras tiene columna nucleo; colegiado_carreras une colegiatura con carrera_id.

create or replace function public.stats_nucleos()
returns table (
  nucleo        text,
  carrera_nombre text,
  total          bigint
)
language sql security definer stable set search_path = public as $$
  select
    c.nucleo,
    c.nombre  as carrera_nombre,
    count(distinct cc.codigo) as total
  from carreras c
  left join colegiado_carreras cc on cc.carrera_id = c.id
  group by c.nucleo, c.nombre
  order by c.nucleo, c.nombre
$$;

grant execute on function public.stats_nucleos() to authenticated, anon;
