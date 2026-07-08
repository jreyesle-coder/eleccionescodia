-- Evita que un colegiado registre su preferencia más de una vez en Verificate.
-- Si voto_verificate_at ya tiene valor, la función retorna error en lugar de sobrescribir.

create or replace function public.marcar_preferencia_verificate(
  p_codigo    text,
  p_cedula    text,
  p_simpatiza boolean
)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_cedula_bd      text;
  v_nombre         text;
  v_ya_registro    boolean;
begin
  select cedula, nombre_completo,
         (voto_verificate_at is not null)
    into v_cedula_bd, v_nombre, v_ya_registro
    from public.padron
   where codigo = p_codigo::integer
   limit 1;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Colegiado no encontrado.');
  end if;

  -- Validar cédula
  if regexp_replace(v_cedula_bd, '[^0-9]', '', 'g') <>
     regexp_replace(p_cedula,    '[^0-9]', '', 'g') then
    return jsonb_build_object('ok', false, 'error',
      'La cédula no coincide con el registro.');
  end if;

  -- Bloquear registro duplicado
  if v_ya_registro then
    return jsonb_build_object('ok', false, 'error',
      'Ya registraste tu intención de voto anteriormente.');
  end if;

  update public.padron
     set simpatiza_verificate = p_simpatiza,
         voto_verificate_at   = now()
   where codigo = p_codigo::integer;

  return jsonb_build_object('ok', true, 'nombre', v_nombre);
end;
$$;
