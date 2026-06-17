-- ════════════════════════════════════════════════════════════════════════
-- FASE 3: Día de elección — registrar votos, contadores en tiempo real, alertas
-- ════════════════════════════════════════════════════════════════════════

-- ── Extender profiles para delegado/suplente con mesa asignada ───────────────
alter table public.profiles
  add column if not exists mesa text;

-- ── RLS para votos_dia ────────────────────────────────────────────────────────
-- Los delegados/suplentes solo insertan en su propia mesa (server-side via RPC).
-- El presidente ve todos los votos para el contador en tiempo real.

-- ── RPC: registrar_voto_dia ────────────────────────────────────────────────────
-- Delegado/suplente marca que un colegiado votó en su mesa.
-- Requiere que el perfil tenga mesa asignada.
drop function if exists public.registrar_voto_dia(text);
create or replace function public.registrar_voto_dia(p_codigo text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_mesa      text;
  v_habilitado boolean;
  v_rol        text;
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

  -- Obtener estado de habilitación
  select votante_habilitado into v_habilitado
    from public.padron
   where codigo = p_codigo;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Colegiado no encontrado');
  end if;

  -- Insertar voto (no validar si ya votó — se registra igual para la alerta)
  insert into public.votos_dia (codigo, mesa, registrado_por, estaba_habilitado)
  values (p_codigo, v_mesa, auth.uid(), coalesce(v_habilitado, false));

  return jsonb_build_object(
    'ok', true,
    'habilitado', coalesce(v_habilitado, false),
    'mesa', v_mesa
  );
end;
$$;
grant execute on function public.registrar_voto_dia(text) to authenticated;

-- ── RPC: conteo_votos_dia ─────────────────────────────────────────────────────
-- Para el presidente: total de votos y desglose por mesa/regional en tiempo real.
drop function if exists public.conteo_votos_dia();
create or replace function public.conteo_votos_dia()
returns table (
  total_votos      bigint,
  por_mesa         jsonb,
  por_regional     jsonb,
  alertas_doble    bigint,
  alertas_nohabilitado bigint
)
language sql security definer stable set search_path = public as $$
  select
    (select count(*) from public.votos_dia) as total_votos,
    (
      select jsonb_object_agg(mesa, cnt)
        from (
          select coalesce(mesa,'Sin mesa') as mesa, count(*) as cnt
            from public.votos_dia
           group by mesa
        ) x
    ) as por_mesa,
    (
      select jsonb_object_agg(regional, cnt)
        from (
          select coalesce(p.regional,'Sin regional') as regional, count(*) as cnt
            from public.votos_dia v
            join public.padron p on p.codigo = v.codigo
           group by p.regional
        ) x
    ) as por_regional,
    (select count(*) from public.v_alerta_doble_voto)       as alertas_doble,
    (select count(*) from public.v_alerta_no_habilitado)    as alertas_nohabilitado;
$$;
grant execute on function public.conteo_votos_dia() to authenticated;

-- ── Habilitar realtime en votos_dia ──────────────────────────────────────────
-- (Se hace desde el dashboard de Supabase en Settings → Replication)
-- Aquí solo documentamos que la tabla necesita replication habilitado.
-- TODO: en Supabase Dashboard → Database → Replication → habilitar votos_dia
