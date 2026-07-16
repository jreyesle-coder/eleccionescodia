-- ════════════════════════════════════════════════════════════════════════════
-- Conteo del día de elección desglosado por MESA (usa el catálogo public.mesas)
-- votos_dia.mesa guarda el numero (1..42) como texto → join contra mesas.numero.
-- ════════════════════════════════════════════════════════════════════════════
drop function if exists public.conteo_por_mesa();
create or replace function public.conteo_por_mesa()
returns table (
  numero      integer,
  etiqueta    text,
  lugar       text,
  a_favor     bigint,
  no_a_favor  bigint,
  total       bigint
)
language sql security definer stable set search_path = public as $$
  select
    m.numero,
    m.etiqueta,
    m.lugar,
    count(v.id) filter (where v.es_simpatizante = true)  as a_favor,
    count(v.id) filter (where v.es_simpatizante = false) as no_a_favor,
    count(v.id)                                           as total
  from public.mesas m
  left join public.votos_dia v on v.mesa = m.numero::text
  group by m.numero, m.etiqueta, m.lugar
  order by m.numero;
$$;
grant execute on function public.conteo_por_mesa() to authenticated;
