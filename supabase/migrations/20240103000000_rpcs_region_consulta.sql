-- ─── listar_padron_region ────────────────────────────────────────────────────
-- Consulta el padrón de una región directamente desde miembros (tiene columna
-- region) haciendo LEFT JOIN con llamadas para obtener el último resultado.
-- Esto reemplaza la query a vista_padron_vivo que no expone la columna region.
drop function if exists public.listar_padron_region(text);
create function public.listar_padron_region(p_region text)
returns table (
  id               bigint,
  region           text,
  distrito         text,
  matricula        text,
  nombre           text,
  telefono         text,
  estado_gestion   text,
  asignado_a       text,
  ultima_llamada   timestamptz,
  ultimo_resultado text,
  ultimo_confirma  boolean,
  ultima_nota      text
)
language sql security definer stable set search_path = public as $$
  select
    m.id,
    m.region,
    m.distrito,
    m.matricula,
    m.nombre,
    m.telefono,
    m.estado_gestion,
    p.nombre          as asignado_a,
    l.fecha_hora      as ultima_llamada,
    l.resultado       as ultimo_resultado,
    l.confirma_plancha1 as ultimo_confirma,
    l.notas           as ultima_nota
  from public.miembros m
  left join public.profiles p  on p.id = m.asignado_a
  left join lateral (
    select fecha_hora, resultado, confirma_plancha1, notas
    from public.llamadas
    where miembro_id = m.id
    order by fecha_hora desc
    limit 1
  ) l on true
  where m.region = p_region
    and m.segmento_montero = false
    and public.mi_rol() in ('supervisor','gerente','presidente')
  order by m.nombre;
$$;
grant execute on function public.listar_padron_region(text) to authenticated;


-- ─── buscar_miembro_publico ───────────────────────────────────────────────────
-- Búsqueda pública por nombre en el padrón general.
-- No requiere autenticación (granted a anon).
-- Requiere mínimo 3 caracteres; devuelve hasta 50 resultados.
-- No expone teléfono por privacidad.
drop function if exists public.buscar_miembro_publico(text);
create function public.buscar_miembro_publico(p_nombre text)
returns table (
  id             bigint,
  matricula      text,
  nombre         text,
  distrito       text,
  region         text,
  vencimiento    date,
  estado_gestion text
)
language sql security definer stable set search_path = public as $$
  select id, matricula, nombre, distrito, region, vencimiento, estado_gestion
  from public.miembros
  where length(trim(p_nombre)) >= 3
    and nombre ilike '%' || trim(p_nombre) || '%'
  order by nombre
  limit 50;
$$;
grant execute on function public.buscar_miembro_publico(text) to anon, authenticated;
