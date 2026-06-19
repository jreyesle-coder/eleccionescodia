-- ═══════════════════════════════════════════════════════════════════════════
-- Resultados Día de Elección — A Favor / No A Favor
-- Agrega es_simpatizante a votos_dia y actualiza los RPCs de conteo.
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Nueva columna en votos_dia
alter table public.votos_dia
  add column if not exists es_simpatizante boolean not null default false;

-- 2. Actualizar registrar_voto_dia para capturar simpatizante por cualquier vía
drop function if exists public.registrar_voto_dia(text);
create or replace function public.registrar_voto_dia(p_codigo text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_mesa           text;
  v_habilitado     boolean;
  v_simpatizante   boolean;
  v_rol            text;
begin
  -- Verificar rol
  select rol, mesa into v_rol, v_mesa
    from public.profiles
   where id = auth.uid();

  if v_rol not in ('delegado','suplente','supervisor','gerente','presidente') then
    return jsonb_build_object('ok', false, 'error', 'Sin permisos para registrar votos');
  end if;

  if v_mesa is null and v_rol in ('delegado','suplente') then
    return jsonb_build_object('ok', false, 'error', 'No tienes mesa asignada');
  end if;

  -- Obtener estado del colegiado (habilitado y simpatizante por cualquier vía)
  select
    votante_habilitado,
    (simpatiza_verificate = true or confirmacion_intencion = 'favorable')
  into v_habilitado, v_simpatizante
    from public.padron
   where codigo = p_codigo::integer;

  if not found then
    -- Intentar con cédula
    select
      votante_habilitado,
      (simpatiza_verificate = true or confirmacion_intencion = 'favorable')
    into v_habilitado, v_simpatizante
      from public.padron
     where cedula = p_codigo;
  end if;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Colegiado no encontrado');
  end if;

  -- Insertar voto
  insert into public.votos_dia (codigo, mesa, registrado_por, estaba_habilitado, es_simpatizante)
  values (
    p_codigo,
    v_mesa,
    auth.uid(),
    coalesce(v_habilitado, false),
    coalesce(v_simpatizante, false)
  );

  return jsonb_build_object(
    'ok',            true,
    'habilitado',    coalesce(v_habilitado, false),
    'simpatizante',  coalesce(v_simpatizante, false),
    'mesa',          v_mesa
  );
end;
$$;
grant execute on function public.registrar_voto_dia(text) to authenticated;

-- 3. Actualizar conteo_votos_dia para incluir desglose A Favor / No A Favor
drop function if exists public.conteo_votos_dia();
create or replace function public.conteo_votos_dia()
returns table (
  total_votos          bigint,
  a_favor              bigint,
  no_a_favor           bigint,
  por_regional         jsonb,
  alertas_doble        bigint,
  alertas_nohabilitado bigint
)
language sql security definer stable set search_path = public as $$
  select
    (select count(*) from public.votos_dia) as total_votos,

    (select count(*) from public.votos_dia where es_simpatizante = true)  as a_favor,
    (select count(*) from public.votos_dia where es_simpatizante = false) as no_a_favor,

    -- por_regional: { "Norte": { "a_favor": N, "no_a_favor": N, "total": N }, ... }
    (
      select jsonb_object_agg(regional, datos)
        from (
          select
            coalesce(p.regional, 'Sin regional') as regional,
            jsonb_build_object(
              'a_favor',   count(*) filter (where v.es_simpatizante = true),
              'no_a_favor', count(*) filter (where v.es_simpatizante = false),
              'total',     count(*)
            ) as datos
          from public.votos_dia v
          join public.padron p on p.codigo::text = v.codigo
         group by p.regional
        ) x
    ) as por_regional,

    (select count(*) from public.v_alerta_doble_voto)    as alertas_doble,
    (select count(*) from public.v_alerta_no_habilitado) as alertas_nohabilitado;
$$;
grant execute on function public.conteo_votos_dia() to authenticated;
