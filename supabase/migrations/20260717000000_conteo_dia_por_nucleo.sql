-- ════════════════════════════════════════════════════════════════════════════
-- Día de elección por NÚCLEO
-- El presidente vota hoy la elección de los núcleos y solo le interesan los
-- resultados de un núcleo a la vez (p. ej. ARQUITECTOS). Se agrega el parámetro
-- opcional p_nucleo a los conteos y una RPC para poblar el selector.
--   p_nucleo IS NULL  → todos los núcleos (comportamiento anterior)
--   p_nucleo = 'X'    → solo votos cuyo colegiado tiene padron.nucleo = 'X'
-- ════════════════════════════════════════════════════════════════════════════

-- 1. Lista de núcleos para el dropdown (todos los del padrón, no solo los que
--    ya tienen votos, para poder pre-seleccionar antes de que empiecen a entrar).
drop function if exists public.nucleos_disponibles();
create or replace function public.nucleos_disponibles()
returns table (nucleo text)
language sql security definer stable set search_path = public as $$
  select p.nucleo
  from public.padron p
  where p.nucleo is not null and p.nucleo <> ''
  group by p.nucleo
  order by p.nucleo;
$$;
grant execute on function public.nucleos_disponibles() to authenticated;

-- 2. conteo_votos_dia con filtro opcional por núcleo
drop function if exists public.conteo_votos_dia();
drop function if exists public.conteo_votos_dia(text);
create or replace function public.conteo_votos_dia(p_nucleo text default null)
returns table (
  total_votos          bigint,
  a_favor              bigint,
  no_a_favor           bigint,
  por_regional         jsonb,
  alertas_doble        bigint,
  alertas_nohabilitado bigint
)
language sql security definer stable set search_path = public as $$
  with vv as (
    select v.es_simpatizante,
           coalesce(p.regional, 'Sin regional') as regional
      from public.votos_dia v
      join public.padron p on p.codigo = v.codigo
     where p_nucleo is null or p.nucleo = p_nucleo
  )
  select
    (select count(*) from vv)                                as total_votos,
    (select count(*) from vv where es_simpatizante)          as a_favor,
    (select count(*) from vv where not es_simpatizante)      as no_a_favor,
    (
      select jsonb_object_agg(regional, datos)
        from (
          select regional,
                 jsonb_build_object(
                   'a_favor',    count(*) filter (where es_simpatizante),
                   'no_a_favor', count(*) filter (where not es_simpatizante),
                   'total',      count(*)
                 ) as datos
            from vv
           group by regional
        ) x
    )                                                        as por_regional,
    (select count(*) from public.v_alerta_doble_voto)        as alertas_doble,
    (select count(*) from public.v_alerta_no_habilitado)     as alertas_nohabilitado;
$$;
grant execute on function public.conteo_votos_dia(text) to authenticated;

-- 3. conteo_por_mesa con filtro opcional por núcleo
drop function if exists public.conteo_por_mesa();
drop function if exists public.conteo_por_mesa(text);
create or replace function public.conteo_por_mesa(p_nucleo text default null)
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
    count(v.id) filter (where v.es_simpatizante)     as a_favor,
    count(v.id) filter (where not v.es_simpatizante) as no_a_favor,
    count(v.id)                                       as total
  from public.mesas m
  left join public.votos_dia v
    on v.mesa = m.numero::text
   and (
     p_nucleo is null
     or exists (
       select 1 from public.padron p
        where p.codigo = v.codigo and p.nucleo = p_nucleo
     )
   )
  group by m.numero, m.etiqueta, m.lugar
  order by m.numero;
$$;
grant execute on function public.conteo_por_mesa(text) to authenticated;
