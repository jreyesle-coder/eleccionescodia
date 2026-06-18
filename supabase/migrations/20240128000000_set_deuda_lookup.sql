-- ════════════════════════════════════════════════════════════════════════
-- RPC: set_deuda_lookup
-- Actualiza monto_deuda para cualquier colegiado tras consulta
-- en CODIA en línea. Accesible a anon porque el valor viene del
-- servidor (API route) que consultó la fuente oficial. No acepta
-- montos negativos ni mayores a 1,000,000 para limitar abuso.
-- ════════════════════════════════════════════════════════════════════════
drop function if exists public.set_deuda_lookup(text, int);
create or replace function public.set_deuda_lookup(
  p_codigo text,
  p_monto  int
)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_id  bigint;
  v_ant int;
begin
  -- Validar rango razonable
  if p_monto < 0 or p_monto > 1000000 then
    return;
  end if;

  select id, coalesce(monto_deuda, 0)
    into v_id, v_ant
    from public.padron
   where codigo::text = p_codigo;

  if not found then return; end if;

  -- Solo escribir si el monto cambió
  if v_ant = p_monto then return; end if;

  update public.padron
     set monto_deuda = p_monto
   where id = v_id;

  insert into public.deuda_historial
    (codigo, monto_anterior, monto_nuevo, actualizado_por, actualizado_en)
  values
    (p_codigo::integer, v_ant, p_monto, 'lookup_auto', now());
end;
$$;

grant execute on function public.set_deuda_lookup(text, int) to anon, authenticated;
