-- ════════════════════════════════════════════════════════════════════════
-- FASE 4: Deuda editable con permisos + historial
-- ════════════════════════════════════════════════════════════════════════

-- ── RPC: actualizar_deuda ─────────────────────────────────────────────────────
-- Perfiles autorizados (dirigente/colaborador/gerente/presidente) pueden editar
-- el monto de deuda de un colegiado y deja registro en deuda_historial.
drop function if exists public.actualizar_deuda(text, int);
create or replace function public.actualizar_deuda(
  p_codigo      text,
  p_monto_nuevo int
)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_monto_anterior int;
  v_nombre_actualizador text;
begin
  if public.mi_rol() not in ('dirigente','colaborador','gerente','presidente','supervisor') then
    raise exception 'Sin permisos para editar deudas';
  end if;

  select monto_deuda into v_monto_anterior
    from public.padron
   where codigo = p_codigo;

  if not found then
    raise exception 'Colegiado no encontrado: %', p_codigo;
  end if;

  select nombre into v_nombre_actualizador
    from public.profiles
   where id = auth.uid();

  update public.padron
     set monto_deuda = p_monto_nuevo
   where codigo = p_codigo;

  insert into public.deuda_historial (codigo, monto_anterior, monto_nuevo, actualizado_por, actualizado_en)
  values (p_codigo, v_monto_anterior, p_monto_nuevo, v_nombre_actualizador, now());
end;
$$;
grant execute on function public.actualizar_deuda(text, int) to authenticated;

-- ── RPC: historial_deuda ──────────────────────────────────────────────────────
drop function if exists public.historial_deuda(text);
create or replace function public.historial_deuda(p_codigo text)
returns table (
  monto_anterior int,
  monto_nuevo    int,
  actualizado_por text,
  actualizado_en  timestamptz
)
language sql security definer stable set search_path = public as $$
  select monto_anterior, monto_nuevo, actualizado_por, actualizado_en
    from public.deuda_historial
   where codigo = p_codigo
   order by actualizado_en desc;
$$;
grant execute on function public.historial_deuda(text) to authenticated;
