-- ════════════════════════════════════════════════════════════════════════
-- FASE 3: Regional asignada al dirigente + filtrado estricto por regional
-- ════════════════════════════════════════════════════════════════════════

-- 1. Agregar campo regional_asignada a profiles (si no existe)
alter table public.profiles
  add column if not exists regional_asignada text;

-- 2. buscar_colegiado: filtrar por regional_asignada cuando el caller es dirigente/colaborador
--    También retorna confirmado_por para que el frontend muestre "ya confirmado por X"
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
  q                  text := trim(p_q);
  tokens             text[];
  token              text;
  sql                text;
  v_rol              text;
  v_regional_asignada text;
begin
  if length(q) < 3 then return; end if;

  -- Obtener rol y regional asignada del caller
  select pr.rol, pr.regional_asignada
    into v_rol, v_regional_asignada
    from public.profiles pr
   where pr.id = auth.uid();

  -- Búsqueda por código exacto (solo dígitos)
  if q ~ '^\d+$' then
    return query
      select
        p.id,
        p.codigo::text,
        p.nombre_completo, p.cedula, p.telefono, p.celular,
        p.regional, p.provincia, p.nucleo, p.carrera,
        p.pensionado, p.nuevo_integrante,
        ( coalesce(p.monto_deuda, 0) > 0
          or exists (select 1 from public.deudas_votantes d where d.codigo = p.codigo)
        ) as tiene_deuda,
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

  -- Búsqueda por cédula (dígitos y guiones)
  if q ~ '^[\d\-]+$' then
    return query
      select
        p.id, p.codigo::text,
        p.nombre_completo, p.cedula, p.telefono, p.celular,
        p.regional, p.provincia, p.nucleo, p.carrera,
        p.pensionado, p.nuevo_integrante,
        ( coalesce(p.monto_deuda, 0) > 0
          or exists (select 1 from public.deudas_votantes d where d.codigo = p.codigo)
        ) as tiene_deuda,
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

  -- Búsqueda por nombre con múltiples tokens
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
      ( coalesce(p.monto_deuda, 0) > 0
        or exists (select 1 from public.deudas_votantes d where d.codigo = p.codigo)
      ) as tiene_deuda,
      p.confirmado_por
    from public.padron p
    where true
  $sql$;

  foreach token in array tokens loop
    sql := sql || format(' and p.nombre_completo ilike %L', '%' || trim(token) || '%');
  end loop;

  -- Filtro de regional para dirigentes/colaboradores
  if v_rol in ('dirigente','colaborador') and v_regional_asignada is not null then
    sql := sql || format(' and p.regional = %L', v_regional_asignada);
  end if;

  sql := sql || ' order by p.nombre_completo limit 50';
  return query execute sql;
end;
$$;
grant execute on function public.buscar_colegiado(text) to anon, authenticated;


-- 3. confirmar_colegiado: validar regional + bloquear re-confirmación por otro dirigente
drop function if exists public.confirmar_colegiado(text, text);
create or replace function public.confirmar_colegiado(
  p_codigo    text,
  p_intencion text    -- 'favorable' | 'indeciso' | 'en_contra'
)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_rol               text;
  v_regional_asignada text;
  v_nombre            text;
  v_padron_regional   text;
  v_confirmado_por    text;
begin
  if public.mi_rol() not in ('dirigente','colaborador','gerente','presidente','supervisor') then
    raise exception 'Sin permisos para confirmar colegiados';
  end if;

  if p_intencion not in ('favorable','indeciso','en_contra') then
    raise exception 'Intención inválida: use favorable, indeciso o en_contra';
  end if;

  -- Datos del caller
  select pr.rol, pr.regional_asignada, pr.nombre
    into v_rol, v_regional_asignada, v_nombre
    from public.profiles pr
   where pr.id = auth.uid();

  -- Datos del colegiado
  select p.regional, p.confirmado_por
    into v_padron_regional, v_confirmado_por
    from public.padron p
   where p.codigo = p_codigo::integer;

  if not found then
    raise exception 'Colegiado no encontrado: %', p_codigo;
  end if;

  -- Validar que el colegiado pertenece a la regional del dirigente
  if v_rol in ('dirigente','colaborador')
     and v_regional_asignada is not null
     and v_padron_regional <> v_regional_asignada
  then
    raise exception 'Este colegiado pertenece a otra regional (%).',  v_padron_regional;
  end if;

  -- Bloquear re-confirmación por otro dirigente
  if v_confirmado_por is not null and v_confirmado_por <> v_nombre then
    raise exception 'Ya confirmado por %', v_confirmado_por;
  end if;

  update public.padron
     set confirmado_por         = v_nombre,
         confirmacion_intencion = p_intencion,
         confirmacion_at        = now()
   where codigo = p_codigo::integer;
end;
$$;
grant execute on function public.confirmar_colegiado(text, text) to authenticated;


-- 4. listar_confirmados_dirigente: el propio dirigente solo ve su regional
drop function if exists public.listar_confirmados_dirigente(text);
create or replace function public.listar_confirmados_dirigente(
  p_dirigente text default null
)
returns table (
  codigo                 text,
  nombre_completo        text,
  regional               text,
  nucleo                 text,
  confirmado_por         text,
  confirmacion_intencion text,
  confirmacion_at        timestamptz,
  via_verificate         boolean
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

  if v_rol not in ('supervisor','gerente','presidente','dirigente','colaborador') then
    raise exception 'Sin permisos';
  end if;

  return query
    select
      p.codigo::text,
      p.nombre_completo,
      p.regional,
      p.nucleo,
      p.confirmado_por,
      p.confirmacion_intencion,
      p.confirmacion_at,
      p.simpatiza_verificate as via_verificate
    from public.padron p
    where (p.confirmado_por is not null or p.simpatiza_verificate = true)
      and (p_dirigente is null or p.confirmado_por = p_dirigente)
      -- dirigentes solo ven su regional
      and (
        v_rol not in ('dirigente','colaborador')
        or v_regional_asignada is null
        or p.regional = v_regional_asignada
      )
    order by p.confirmado_por nulls last, p.nombre_completo;
end;
$$;
grant execute on function public.listar_confirmados_dirigente(text) to authenticated;


-- 5. listar_padron_regional: ignorar p_regional y forzar regional_asignada para dirigentes
--    (actualmente la usa DashboardGerente; se asegura que si un dirigente la invoca
--     directamente no pueda ver otra regional)
drop function if exists public.listar_padron_regional(text);
create or replace function public.listar_padron_regional(p_regional text)
returns table (
  id               bigint,
  regional         text,
  provincia        text,
  nucleo           text,
  codigo           text,
  nombre_completo  text,
  telefono         text,
  celular          text,
  carrera          text,
  pensionado       boolean,
  nuevo_integrante boolean,
  estado_gestion   text,
  asignado_a       text,
  ultima_llamada   timestamptz,
  ultimo_resultado text,
  ultimo_confirma  boolean,
  ultima_nota      text
)
language plpgsql security definer stable set search_path = public as $$
declare
  v_rol               text;
  v_regional_asignada text;
  v_regional_efectiva text;
begin
  select pr.rol, pr.regional_asignada
    into v_rol, v_regional_asignada
    from public.profiles pr
   where pr.id = auth.uid();

  if v_rol not in ('supervisor','gerente','presidente','dirigente','colaborador') then
    raise exception 'Sin permisos';
  end if;

  -- Los dirigentes/colaboradores siempre usan su regional asignada; ignoran p_regional
  if v_rol in ('dirigente','colaborador') and v_regional_asignada is not null then
    v_regional_efectiva := v_regional_asignada;
  else
    v_regional_efectiva := p_regional;
  end if;

  return query
    select
      p.id, p.regional, p.provincia, p.nucleo,
      p.codigo::text,
      p.nombre_completo, p.telefono, p.celular, p.carrera,
      p.pensionado, p.nuevo_integrante, p.estado_gestion,
      pr2.nombre          as asignado_a,
      l.fecha_hora        as ultima_llamada,
      l.resultado         as ultimo_resultado,
      l.confirma_plancha1 as ultimo_confirma,
      l.notas             as ultima_nota
    from public.padron p
    left join public.profiles pr2 on pr2.id = p.asignado_a
    left join lateral (
      select fecha_hora, resultado, confirma_plancha1, notas
        from public.llamadas
       where colegiado_id = p.id
       order by fecha_hora desc
       limit 1
    ) l on true
    where p.regional = v_regional_efectiva
    order by p.nombre_completo;
end;
$$;
grant execute on function public.listar_padron_regional(text) to authenticated;
