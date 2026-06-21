-- ════════════════════════════════════════════════════════════════════════
-- saldar_deuda_colegiado: marca deuda como saldada y habilita al colegiado
-- Lo saca del tab "Por regularizar" al pasar estado_gestion a 'contactado'.
-- ════════════════════════════════════════════════════════════════════════

drop function if exists public.saldar_deuda_colegiado(text);
create or replace function public.saldar_deuda_colegiado(p_codigo text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if public.mi_rol() not in ('presidente','supervisor','gerente') then
    raise exception 'Sin permiso';
  end if;

  update public.padron
     set monto_deuda    = 0,
         estado_gestion = 'contactado'
   where codigo = p_codigo::integer;

  -- Registrar en historial
  insert into public.deuda_historial (codigo, monto_anterior, monto_nuevo, actualizado_por)
  select
    p_codigo,
    coalesce(monto_deuda, 0),
    0,
    (select nombre from public.profiles where id = auth.uid())
  from public.padron
  where codigo = p_codigo::integer;
end;
$$;

grant execute on function public.saldar_deuda_colegiado(text) to authenticated;
