-- ════════════════════════════════════════════════════════════════════════
-- RPC: set_deuda_verificate
-- Actualiza monto_deuda para un colegiado que YA marcó preferencia
-- en Verifícate (simpatiza_verificate = true).
-- Se concede a anon para que el flujo público pueda llamarla.
-- La restricción (solo colegiados con simpatiza_verificate = true)
-- limita el abuso: solo aplica a quien ya pasó por el portal.
-- ════════════════════════════════════════════════════════════════════════
drop function if exists public.set_deuda_verificate(text, int);
create or replace function public.set_deuda_verificate(
  p_codigo text,
  p_monto  int
)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_id     bigint;
  v_ant    int;
begin
  -- Solo actualiza si el colegiado ya pasó por verificate
  select id, coalesce(monto_deuda, 0)
    into v_id, v_ant
    from public.padron
   where codigo::text = p_codigo
     and simpatiza_verificate = true;

  if not found then
    -- No encontrado o no pasó por verificate: salir silenciosamente
    return;
  end if;

  -- Solo actualizar si el monto cambió
  if v_ant = p_monto then
    return;
  end if;

  update public.padron
     set monto_deuda = p_monto
   where id = v_id;

  insert into public.deuda_historial
    (codigo, monto_anterior, monto_nuevo, actualizado_por, actualizado_en)
  values
    (p_codigo::integer, v_ant, p_monto, 'verificate_auto', now());
end;
$$;

-- Conceder a anon (portal público) y authenticated
grant execute on function public.set_deuda_verificate(text, int) to anon, authenticated;
