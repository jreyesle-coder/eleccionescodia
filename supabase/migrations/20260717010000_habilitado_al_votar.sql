-- ════════════════════════════════════════════════════════════════════════════
-- "Habilitado" al votar
-- Regla de negocio (CODIA): estar habilitado = estar al día (sin deuda). Pero si
-- el colegiado YA votó, es porque saldó su deuda en la mesa → debe entrar como
-- voto válido y NO figurar como "no habilitado". padron.votante_habilitado es una
-- foto previa al pago, por eso 253/258 votos salían marcados no habilitados.
--
-- Este parche:
--   1. Corrige los votos ya registrados → estaba_habilitado = true.
--   2. Refleja en el padrón que quien votó quedó al día.
--   3. registrar_voto_dia marca el voto como habilitado y actualiza el padrón.
-- ════════════════════════════════════════════════════════════════════════════

-- 1. Backfill: todo voto ya registrado se considera habilitado (votar ⇒ al día)
update public.votos_dia
   set estaba_habilitado = true
 where estaba_habilitado = false;

-- 2. Reflejar en el padrón que los que votaron saldaron su deuda
update public.padron p
   set votante_habilitado = true
  from public.votos_dia v
 where v.codigo = p.codigo
   and coalesce(p.votante_habilitado, false) = false;

-- 3. Redefinir registrar_voto_dia: votar implica habilitado
drop function if exists public.registrar_voto_dia(text);
create or replace function public.registrar_voto_dia(p_codigo text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_mesa         text;
  v_simpatizante boolean;
  v_rol          text;
  v_codigo_int   integer;
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

  -- Buscar por código numérico o cédula
  select
    codigo,
    (coalesce(simpatiza_verificate, false) or confirmacion_intencion = 'favorable')
  into v_codigo_int, v_simpatizante
    from public.padron
   where codigo::text = p_codigo
      or cedula = p_codigo
   limit 1;

  if v_codigo_int is null then
    return jsonb_build_object('ok', false, 'error', 'Colegiado no encontrado');
  end if;

  -- Votar implica estar al día: registrar el voto como habilitado
  insert into public.votos_dia (codigo, mesa, registrado_por, estaba_habilitado, es_simpatizante)
  values (
    v_codigo_int,
    v_mesa,
    auth.uid(),
    true,
    coalesce(v_simpatizante, false)
  );

  -- Reflejar en el padrón que saldó su deuda al votar
  update public.padron
     set votante_habilitado = true
   where codigo = v_codigo_int
     and coalesce(votante_habilitado, false) = false;

  return jsonb_build_object(
    'ok',           true,
    'habilitado',   true,
    'simpatizante', coalesce(v_simpatizante, false),
    'mesa',         v_mesa
  );
end;
$$;
grant execute on function public.registrar_voto_dia(text) to authenticated;
