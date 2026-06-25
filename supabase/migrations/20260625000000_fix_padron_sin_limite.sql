-- ════════════════════════════════════════════════════════════════════════
-- FIX: padrón sin límite PostgREST
-- PostgREST limita a 1000 filas las funciones que devuelven TABLE.
-- La solución es devolver jsonb (una sola fila que contiene el array
-- completo), lo que bypasea el max-rows de PostgREST.
-- ════════════════════════════════════════════════════════════════════════

-- ── 1. padron_zona_dirigente → devuelve jsonb ────────────────────────────────
-- Padrón completo de la zona del usuario (dirigente/colaborador filtrado
-- por regional_asignada; otros roles ven todo el padrón).
drop function if exists public.padron_zona_dirigente();
create or replace function public.padron_zona_dirigente()
returns jsonb
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

  return (
    select coalesce(jsonb_agg(t order by t.nucleo nulls last, t.nombre_completo), '[]'::jsonb)
    from (
      select
        p.id,
        p.codigo::text                                                        as codigo,
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
        (
          coalesce(p.monto_deuda, 0) > 0
          or exists (select 1 from public.deudas_votantes d where d.codigo = p.codigo::text)
        )                                                                     as tiene_deuda,
        coalesce(p.monto_deuda, 0)                                            as monto_deuda,
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
    ) t
  );
end;
$$;
grant execute on function public.padron_zona_dirigente() to authenticated;

-- ── 2. buscar_padron_presidente → devuelve jsonb ─────────────────────────────
-- Búsqueda del padrón para supervisor/gerente/presidente.
-- Mantiene los LIMITs de rendimiento internos pero ya no están afectados
-- por el max-rows de PostgREST porque devuelve una sola fila jsonb.
drop function if exists public.buscar_padron_presidente(text, text, text);
create or replace function public.buscar_padron_presidente(
  p_regional text default null,
  p_nucleo   text default null,
  p_q        text default null
)
returns jsonb
language plpgsql security definer stable set search_path = public as $$
declare
  q        text  := trim(coalesce(p_q, ''));
  q_digits text  := regexp_replace(q, '[^0-9]', '', 'g');
  tokens   text[];
  token    text;
  sql_str  text;
  result   jsonb;
begin
  if public.mi_rol() not in ('presidente','supervisor','gerente','dirigente','colaborador') then
    return '[]'::jsonb;
  end if;

  -- ── Búsqueda por cédula ────────────────────────────────────────────────────
  if q ~ '^[\d\-]+$' and length(q_digits) >= 9 then
    select coalesce(jsonb_agg(t order by t.nombre_completo), '[]'::jsonb) into result
    from (
      select
        p.id, p.codigo::text as codigo, p.nombre_completo, p.cedula,
        p.telefono, p.celular, p.regional, p.provincia, p.nucleo, p.carrera,
        p.pensionado, p.nuevo_integrante,
        coalesce(p.monto_deuda, 0) > 0
          or exists (select 1 from public.deudas_votantes d where d.codigo = p.codigo::text) as tiene_deuda,
        coalesce(p.monto_deuda, 0) as monto_deuda,
        p.centro_votacion, p.confirmado_por, p.confirmacion_intencion, p.confirmacion_at
      from public.padron p
      where regexp_replace(coalesce(p.cedula,''), '[^0-9]', '', 'g') = q_digits
        and (p_regional is null or p.regional = p_regional)
        and (p_nucleo   is null or p.nucleo   = p_nucleo)
      order by p.nombre_completo
      limit 50
    ) t;
    return result;
  end if;

  -- ── Búsqueda por código exacto ─────────────────────────────────────────────
  if q ~ '^\d+$' and length(q) <= 6 then
    select coalesce(jsonb_agg(t), '[]'::jsonb) into result
    from (
      select
        p.id, p.codigo::text as codigo, p.nombre_completo, p.cedula,
        p.telefono, p.celular, p.regional, p.provincia, p.nucleo, p.carrera,
        p.pensionado, p.nuevo_integrante,
        coalesce(p.monto_deuda, 0) > 0
          or exists (select 1 from public.deudas_votantes d where d.codigo = p.codigo::text) as tiene_deuda,
        coalesce(p.monto_deuda, 0) as monto_deuda,
        p.centro_votacion, p.confirmado_por, p.confirmacion_intencion, p.confirmacion_at
      from public.padron p
      where p.codigo = q::integer
        and (p_regional is null or p.regional = p_regional)
        and (p_nucleo   is null or p.nucleo   = p_nucleo)
      limit 10
    ) t;
    return result;
  end if;

  -- ── Sin texto: devolver todo el padrón (con filtros opcionales) ────────────
  if length(q) = 0 then
    select coalesce(jsonb_agg(t order by t.nombre_completo), '[]'::jsonb) into result
    from (
      select
        p.id, p.codigo::text as codigo, p.nombre_completo, p.cedula,
        p.telefono, p.celular, p.regional, p.provincia, p.nucleo, p.carrera,
        p.pensionado, p.nuevo_integrante,
        coalesce(p.monto_deuda, 0) > 0
          or exists (select 1 from public.deudas_votantes d where d.codigo = p.codigo::text) as tiene_deuda,
        coalesce(p.monto_deuda, 0) as monto_deuda,
        p.centro_votacion, p.confirmado_por, p.confirmacion_intencion, p.confirmacion_at
      from public.padron p
      where (p_regional is null or p.regional = p_regional)
        and (p_nucleo   is null or p.nucleo   = p_nucleo)
      order by p.nombre_completo
    ) t;
    return result;
  end if;

  -- ── Búsqueda por nombre (tokens) ──────────────────────────────────────────
  if length(q) < 3 then return '[]'::jsonb; end if;

  tokens := array(
    select t from unnest(string_to_array(q, ' ')) t
    where length(trim(t)) >= 2
  );
  if array_length(tokens, 1) is null then return '[]'::jsonb; end if;

  sql_str := $s$
    select coalesce(jsonb_agg(t order by t.nombre_completo), '[]'::jsonb)
    from (
      select
        p.id, p.codigo::text as codigo, p.nombre_completo, p.cedula,
        p.telefono, p.celular, p.regional, p.provincia, p.nucleo, p.carrera,
        p.pensionado, p.nuevo_integrante,
        coalesce(p.monto_deuda, 0) > 0
          or exists (select 1 from public.deudas_votantes d where d.codigo = p.codigo::text) as tiene_deuda,
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

  sql_str := sql_str || ' order by p.nombre_completo limit 500) t';

  execute sql_str into result;
  return coalesce(result, '[]'::jsonb);
end;
$$;
grant execute on function public.buscar_padron_presidente(text, text, text) to authenticated;
