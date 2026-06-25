-- ════════════════════════════════════════════════════════════════════════
-- Fix: quitar ::text del join deudas_votantes en ambas funciones de padrón.
-- La migración anterior cambió d.codigo = p.codigo por d.codigo = p.codigo::text
-- lo cual falla con "operator does not exist: integer = text".
-- Restauramos d.codigo = p.codigo (sin cast) igual que los originales.
-- ════════════════════════════════════════════════════════════════════════

-- ── 1. buscar_padron_presidente ───────────────────────────────────────────────
drop function if exists public.buscar_padron_presidente(text, text, text, integer, integer);
create or replace function public.buscar_padron_presidente(
  p_regional text    default null,
  p_nucleo   text    default null,
  p_q        text    default null,
  p_limit    integer default null,
  p_offset   integer default 0
)
returns table (
  id                     bigint,
  codigo                 text,
  nombre_completo        text,
  cedula                 text,
  telefono               text,
  celular                text,
  regional               text,
  provincia              text,
  nucleo                 text,
  carrera                text,
  pensionado             boolean,
  nuevo_integrante       boolean,
  tiene_deuda            boolean,
  monto_deuda            int,
  centro_votacion        text,
  confirmado_por         text,
  confirmacion_intencion text,
  confirmacion_at        timestamptz
)
language plpgsql security definer stable set search_path = public as $$
declare
  q        text  := trim(coalesce(p_q, ''));
  q_digits text  := regexp_replace(q, '[^0-9]', '', 'g');
  tokens   text[];
  token    text;
  sql_str  text;
begin
  if public.mi_rol() not in ('presidente','supervisor','gerente','dirigente','colaborador') then
    return;
  end if;

  -- ── Búsqueda por cédula ───────────────────────────────────────────────────
  if q ~ '^[\d\-]+$' and length(q_digits) >= 9 then
    return query
      select
        p.id, p.codigo::text, p.nombre_completo, p.cedula,
        p.telefono, p.celular, p.regional, p.provincia, p.nucleo, p.carrera,
        p.pensionado, p.nuevo_integrante,
        coalesce(p.monto_deuda, 0) > 0
          or exists (select 1 from public.deudas_votantes d where d.codigo = p.codigo) as tiene_deuda,
        coalesce(p.monto_deuda, 0) as monto_deuda,
        p.centro_votacion, p.confirmado_por, p.confirmacion_intencion, p.confirmacion_at
      from public.padron p
      where regexp_replace(coalesce(p.cedula,''), '[^0-9]', '', 'g') = q_digits
        and (p_regional is null or p.regional = p_regional)
        and (p_nucleo   is null or p.nucleo   = p_nucleo)
      order by p.nombre_completo
      limit 50;
    return;
  end if;

  -- ── Búsqueda por código exacto ────────────────────────────────────────────
  if q ~ '^\d+$' and length(q) <= 6 then
    return query
      select
        p.id, p.codigo::text, p.nombre_completo, p.cedula,
        p.telefono, p.celular, p.regional, p.provincia, p.nucleo, p.carrera,
        p.pensionado, p.nuevo_integrante,
        coalesce(p.monto_deuda, 0) > 0
          or exists (select 1 from public.deudas_votantes d where d.codigo = p.codigo) as tiene_deuda,
        coalesce(p.monto_deuda, 0) as monto_deuda,
        p.centro_votacion, p.confirmado_por, p.confirmacion_intencion, p.confirmacion_at
      from public.padron p
      where p.codigo = q::integer
        and (p_regional is null or p.regional = p_regional)
        and (p_nucleo   is null or p.nucleo   = p_nucleo)
      limit 10;
    return;
  end if;

  -- ── Sin texto: padrón paginado ────────────────────────────────────────────
  if length(q) = 0 then
    return query
      select
        p.id, p.codigo::text, p.nombre_completo, p.cedula,
        p.telefono, p.celular, p.regional, p.provincia, p.nucleo, p.carrera,
        p.pensionado, p.nuevo_integrante,
        coalesce(p.monto_deuda, 0) > 0
          or exists (select 1 from public.deudas_votantes d where d.codigo = p.codigo) as tiene_deuda,
        coalesce(p.monto_deuda, 0) as monto_deuda,
        p.centro_votacion, p.confirmado_por, p.confirmacion_intencion, p.confirmacion_at
      from public.padron p
      where (p_regional is null or p.regional = p_regional)
        and (p_nucleo   is null or p.nucleo   = p_nucleo)
      order by p.nombre_completo
      limit  p_limit
      offset p_offset;
    return;
  end if;

  -- ── Búsqueda por nombre (tokens) ──────────────────────────────────────────
  if length(q) < 3 then return; end if;

  tokens := array(
    select t from unnest(string_to_array(q, ' ')) t
    where length(trim(t)) >= 2
  );
  if array_length(tokens, 1) is null then return; end if;

  sql_str := $s$
    select
      p.id, p.codigo::text, p.nombre_completo, p.cedula,
      p.telefono, p.celular, p.regional, p.provincia, p.nucleo, p.carrera,
      p.pensionado, p.nuevo_integrante,
      coalesce(p.monto_deuda, 0) > 0
        or exists (select 1 from public.deudas_votantes d where d.codigo = p.codigo) as tiene_deuda,
      coalesce(p.monto_deuda, 0) as monto_deuda,
      p.centro_votacion, p.confirmado_por, p.confirmacion_intencion, p.confirmacion_at
    from public.padron p
    where true
  $s$;

  if p_regional is not null then
    sql_str := sql_str || format(' and p.regional = %L', p_regional);
  end if;
  if p_nucleo is not null then
    sql_str := sql_str || format(' and p.nucleo = %L', p_nucleo);
  end if;

  foreach token in array tokens loop
    sql_str := sql_str || format(' and p.nombre_completo ilike %L', '%' || trim(token) || '%');
  end loop;

  sql_str := sql_str || ' order by p.nombre_completo limit 500';

  return query execute sql_str;
end;
$$;
grant execute on function public.buscar_padron_presidente(text, text, text, integer, integer) to authenticated;

-- ── 2. padron_zona_dirigente ──────────────────────────────────────────────────
drop function if exists public.padron_zona_dirigente(integer, integer);
create or replace function public.padron_zona_dirigente(
  p_limit  integer default null,
  p_offset integer default 0
)
returns table (
  id                     bigint,
  codigo                 text,
  nombre_completo        text,
  cedula                 text,
  telefono               text,
  celular                text,
  regional               text,
  provincia              text,
  nucleo                 text,
  carrera                text,
  pensionado             boolean,
  nuevo_integrante       boolean,
  tiene_deuda            boolean,
  monto_deuda            integer,
  centro_votacion        text,
  confirmado_por         text,
  confirmacion_intencion text,
  confirmacion_at        timestamptz
)
language plpgsql security definer stable set search_path = public as $$
declare
  v_rol               text;
  v_regional_asignada text;
begin
  select pr.rol, pr.regional_asignada
    into v_rol, v_regional_asignada
    from public.profiles pr
   where pr.id = auth.uid();

  if v_rol not in ('dirigente','colaborador','supervisor','gerente','presidente') then
    raise exception 'Sin permisos';
  end if;

  return query
    select
      p.id,
      p.codigo::text,
      p.nombre_completo,
      p.cedula,
      p.telefono,
      p.celular,
      p.regional,
      p.provincia,
      p.nucleo,
      p.carrera,
      p.pensionado,
      p.nuevo_integrante,
      ( coalesce(p.monto_deuda, 0) > 0
        or exists (select 1 from public.deudas_votantes d where d.codigo = p.codigo)
      ) as tiene_deuda,
      coalesce(p.monto_deuda, 0) as monto_deuda,
      p.centro_votacion,
      p.confirmado_por,
      p.confirmacion_intencion,
      p.confirmacion_at
    from public.padron p
    where (
      v_rol not in ('dirigente','colaborador')
      or v_regional_asignada is null
      or p.regional = v_regional_asignada
    )
    order by p.nucleo nulls last, p.nombre_completo
    limit  p_limit
    offset p_offset;
end;
$$;
grant execute on function public.padron_zona_dirigente(integer, integer) to authenticated;
