-- ═══════════════════════════════════════════════════════════════════════════
-- OPCIÓN C: Limpiar deuda estática — fuente única = consulta en línea
-- 1. Vaciar tabla deudas_votantes
-- 2. Resetear monto_deuda en padron (se re-consulta en línea al abrir perfil)
-- 3. Reescribir todos los RPCs que referenciaban deudas_votantes
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Vaciar la tabla de deudas estáticas
truncate table public.deudas_votantes;

-- 2. Resetear monto_deuda a NULL en toda la tabla padron
--    (la consulta en línea los irá poblando conforme se abran perfiles)
update public.padron set monto_deuda = null;

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. Reescribir RPCs — quitar todas las referencias a deudas_votantes
-- ═══════════════════════════════════════════════════════════════════════════

-- ── buscar_colegiado (usado por dirigente y delegado para buscar en padrón) ──
drop function if exists public.buscar_colegiado(text);
create or replace function public.buscar_colegiado(p_q text)
returns table (
  id               bigint,
  codigo           text,
  nombre_completo  text,
  cedula           text,
  telefono         text,
  celular          text,
  regional         text,
  provincia        text,
  nucleo           text,
  carrera          text,
  pensionado       boolean,
  nuevo_integrante boolean,
  tiene_deuda      boolean,
  confirmado_por   text
)
language plpgsql security definer stable set search_path = public as $$
declare
  q                   text := trim(p_q);
  tokens              text[];
  token               text;
  sql                 text;
  v_rol               text;
  v_regional_asignada text;
begin
  if length(q) < 3 then return; end if;

  select pr.rol, pr.regional_asignada
    into v_rol, v_regional_asignada
    from public.profiles pr
   where pr.id = auth.uid();

  -- Búsqueda por código exacto
  if q ~ '^\d+$' then
    return query
      select
        p.id, p.codigo::text,
        p.nombre_completo, p.cedula, p.telefono, p.celular,
        p.regional, p.provincia, p.nucleo, p.carrera,
        p.pensionado, p.nuevo_integrante,
        coalesce(p.monto_deuda, 0) > 0 as tiene_deuda,
        p.confirmado_por
      from public.padron p
      where p.codigo = q::integer
        and (
          v_rol not in ('dirigente','colaborador')
          or v_regional_asignada is null
          or p.regional = v_regional_asignada
        )
      limit 10;
    return;
  end if;

  -- Búsqueda por cédula
  if q ~ '^[\d\-]+$' then
    return query
      select
        p.id, p.codigo::text,
        p.nombre_completo, p.cedula, p.telefono, p.celular,
        p.regional, p.provincia, p.nucleo, p.carrera,
        p.pensionado, p.nuevo_integrante,
        coalesce(p.monto_deuda, 0) > 0 as tiene_deuda,
        p.confirmado_por
      from public.padron p
      where p.cedula ilike '%' || q || '%'
        and (
          v_rol not in ('dirigente','colaborador')
          or v_regional_asignada is null
          or p.regional = v_regional_asignada
        )
      order by p.nombre_completo
      limit 50;
    return;
  end if;

  -- Búsqueda por nombre (tokens)
  tokens := array(
    select t from unnest(string_to_array(q, ' ')) t
    where length(trim(t)) >= 2
  );
  if array_length(tokens, 1) is null then return; end if;

  sql := $sql$
    select
      p.id, p.codigo::text,
      p.nombre_completo, p.cedula, p.telefono, p.celular,
      p.regional, p.provincia, p.nucleo, p.carrera,
      p.pensionado, p.nuevo_integrante,
      coalesce(p.monto_deuda, 0) > 0 as tiene_deuda,
      p.confirmado_por
    from public.padron p
    where true
  $sql$;

  foreach token in array tokens loop
    sql := sql || format(' and p.nombre_completo ilike %L', '%' || trim(token) || '%');
  end loop;

  if v_rol in ('dirigente','colaborador') and v_regional_asignada is not null then
    sql := sql || format(' and p.regional = %L', v_regional_asignada);
  end if;

  sql := sql || ' order by p.nombre_completo limit 50';
  return query execute sql;
end;
$$;
grant execute on function public.buscar_colegiado(text) to authenticated, anon;


-- ── padron_zona_dirigente (padrón completo para dirigentes) ──────────────────
drop function if exists public.padron_zona_dirigente();
create or replace function public.padron_zona_dirigente()
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
      coalesce(p.monto_deuda, 0) > 0 as tiene_deuda,
      coalesce(p.monto_deuda, 0)     as monto_deuda,
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
    order by p.nucleo nulls last, p.nombre_completo;
end;
$$;
grant execute on function public.padron_zona_dirigente() to authenticated;


-- ── simpatizantes_por_regularizar (tab "Por regularizar" del presidente) ─────
drop function if exists public.simpatizantes_por_regularizar();
create or replace function public.simpatizantes_por_regularizar()
returns table (
  id                 bigint,
  codigo             text,
  nombre_completo    text,
  cedula             text,
  telefono           text,
  celular            text,
  regional           text,
  provincia          text,
  nucleo             text,
  carrera            text,
  pensionado         boolean,
  tiene_deuda        boolean,
  monto_deuda        int,
  voto_verificate_at timestamptz
)
language sql security definer stable set search_path = public as $$
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
    coalesce(p.monto_deuda, 0) > 0  as tiene_deuda,
    coalesce(p.monto_deuda, 0)      as monto_deuda,
    p.voto_verificate_at
  from public.padron p
  where p.simpatiza_verificate = true
    and (
      p.pensionado = true
      or coalesce(p.monto_deuda, 0) > 0
    )
    and public.mi_rol() in (
      'supervisor','gerente','presidente','dirigente','colaborador'
    )
  order by p.monto_deuda asc nulls last, p.pensionado asc, p.nombre_completo asc;
$$;
grant execute on function public.simpatizantes_por_regularizar() to authenticated;
