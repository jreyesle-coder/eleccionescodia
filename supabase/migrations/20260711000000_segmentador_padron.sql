-- ─────────────────────────────────────────────────────────────────────────────
-- MVP Segmentador del Padrón (portal presidente)
-- Permite combinar filtros (demarcación de origen por prefijo de cédula, profesión,
-- regional donde vota, provincia, "vota fuera de su demarcación") y exportar a Excel.
--
-- Piezas:
--   1. Tabla oficialias(prefijo -> demarcacion) derivada del propio padrón.
--   2. RPC segmentar_padron(...) con los filtros combinables.
--   3. RPC segmentador_opciones() para poblar los selectores de la UI.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Tabla de oficialías (mapa prefijo cédula -> demarcación de origen) ─────
create table if not exists public.oficialias (
  prefijo     text primary key,
  demarcacion text not null,      -- provincia dominante entre los residentes con ese prefijo
  colegiados  integer not null default 0,
  rastreable  boolean not null default true  -- false = cédula formato nuevo (402, etc.), el prefijo NO indica origen
);

-- Poblar/refrescar desde el padrón: por cada prefijo, la provincia dominante.
-- Se ejecuta idempotente (trunca y recalcula).
truncate table public.oficialias;

insert into public.oficialias (prefijo, demarcacion, colegiados)
select prefijo, provincia_dom, total
from (
  select
    left(cedula, 3) as prefijo,
    provincia       as provincia_dom,
    count(*)        as total,
    row_number() over (partition by left(cedula, 3) order by count(*) desc) as rn
  from public.padron
  where cedula is not null and provincia is not null
  group by left(cedula, 3), provincia
) t
where rn = 1;

-- Marcar como NO rastreables los prefijos de formato nuevo (sin código municipal).
-- 402 es el caso confirmado; se puede extender a mano si aparecen otros.
update public.oficialias set rastreable = false where prefijo in ('402');

-- RLS: solo roles de gestión leen la tabla (reutiliza mi_rol()).
alter table public.oficialias enable row level security;
drop policy if exists "oficialias_select" on public.oficialias;
create policy "oficialias_select" on public.oficialias
  for select to authenticated
  using (public.mi_rol() in ('supervisor','gerente','presidente'));

-- ── 2. RPC: segmentar_padron ─────────────────────────────────────────────────
-- Todos los parámetros son opcionales (null = sin filtrar por ese campo).
-- p_vota_fuera = true  -> solo los que votan fuera de su demarcación de origen
--                false -> solo los que votan en su demarcación
--                null  -> sin filtrar
drop function if exists public.segmentar_padron(text, text, text, text, boolean);
create or replace function public.segmentar_padron(
  p_prefijo    text    default null,
  p_nucleo     text    default null,
  p_regional   text    default null,
  p_provincia  text    default null,
  p_vota_fuera boolean default null
)
returns table (
  codigo             text,
  cedula             text,
  nombre_completo    text,
  provincia          text,
  regional           text,
  nucleo             text,
  centro_votacion    text,
  prefijo            text,
  demarcacion_origen text,
  vota_fuera         boolean
)
language sql security definer stable set search_path = public as $$
  select
    p.codigo::text,
    p.cedula,
    p.nombre_completo,
    p.provincia,
    p.regional,
    p.nucleo,
    p.centro_votacion,
    left(p.cedula, 3)  as prefijo,
    o.demarcacion      as demarcacion_origen,
    case
      when o.demarcacion is null then null
      else (coalesce(p.provincia,'') || ' ' || coalesce(p.regional,'')) not ilike '%' || o.demarcacion || '%'
    end as vota_fuera
  from public.padron p
  left join public.oficialias o on o.prefijo = left(p.cedula, 3)
  where public.mi_rol() in ('supervisor','gerente','presidente')
    and (p_prefijo   is null or left(p.cedula, 3) = p_prefijo)
    and (p_nucleo    is null or p.nucleo    = p_nucleo)
    and (p_regional  is null or p.regional  = p_regional)
    and (p_provincia is null or p.provincia = p_provincia)
    and (
      p_vota_fuera is null
      or (
        o.demarcacion is not null
        and ((coalesce(p.provincia,'') || ' ' || coalesce(p.regional,'')) not ilike '%' || o.demarcacion || '%') = p_vota_fuera
      )
    )
  order by p.nombre_completo;
$$;

grant execute on function public.segmentar_padron(text, text, text, text, boolean) to authenticated;

-- ── 3. RPC: segmentador_opciones (pobla los selectores de la UI) ─────────────
drop function if exists public.segmentador_opciones();
create or replace function public.segmentador_opciones()
returns json
language sql security definer stable set search_path = public as $$
  select json_build_object(
    'nucleos',    (select coalesce(json_agg(x order by x), '[]'::json)
                     from (select distinct nucleo   as x from public.padron where nucleo   is not null) a),
    'regionales', (select coalesce(json_agg(x order by x), '[]'::json)
                     from (select distinct regional as x from public.padron where regional is not null) b),
    'provincias', (select coalesce(json_agg(x order by x), '[]'::json)
                     from (select distinct provincia as x from public.padron where provincia is not null) c),
    'oficialias', (select coalesce(json_agg(json_build_object(
                       'prefijo', prefijo, 'demarcacion', demarcacion,
                       'colegiados', colegiados, 'rastreable', rastreable
                     ) order by colegiados desc), '[]'::json)
                     from public.oficialias)
  )
  where public.mi_rol() in ('supervisor','gerente','presidente');
$$;

grant execute on function public.segmentador_opciones() to authenticated;
