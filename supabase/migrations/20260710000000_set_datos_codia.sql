-- ════════════════════════════════════════════════════════════════════════
-- RPC: set_datos_codia
-- Reemplaza a set_deuda_lookup como sink de la consulta al portal del CODIA.
-- Ahora la fuente (verificate.codiaenlinea.com) devuelve en un solo GET:
-- regional, centro de votación, núcleo, posición y balance.
--
-- Actualiza esos 5 campos en el padrón. Los campos de texto/posición se
-- escriben con COALESCE: si vienen NULL (scrape parcial) NO se sobrescribe
-- el dato existente. El monto sí se escribe siempre (0 = sin deuda) y se
-- registra en deuda_historial cuando cambia, igual que antes.
--
-- Accesible a anon porque el valor proviene del servidor (API route) que
-- consultó la fuente oficial. Valida rango de monto para limitar abuso.
-- ════════════════════════════════════════════════════════════════════════

-- Columna nueva (las demás ya existen en padron)
alter table public.padron
  add column if not exists posicion int;

drop function if exists public.set_datos_codia(text, text, text, text, int, int);
create or replace function public.set_datos_codia(
  p_codigo          text,
  p_regional        text,
  p_centro_votacion text,
  p_nucleo          text,
  p_posicion        int,
  p_monto           int
)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_id  bigint;
  v_ant int;
begin
  -- Validar rango razonable del monto
  if p_monto < 0 or p_monto > 1000000 then
    return;
  end if;

  select id, coalesce(monto_deuda, 0)
    into v_id, v_ant
    from public.padron
   where codigo::text = p_codigo;

  if not found then return; end if;

  -- Actualizar datos de votación (sin borrar lo existente si llega NULL)
  -- y el monto (que siempre se escribe).
  update public.padron
     set regional        = coalesce(nullif(p_regional, ''), regional),
         centro_votacion = coalesce(nullif(p_centro_votacion, ''), centro_votacion),
         nucleo          = coalesce(nullif(p_nucleo, ''), nucleo),
         posicion        = coalesce(p_posicion, posicion),
         monto_deuda     = p_monto
   where id = v_id;

  -- Historial solo cuando el monto cambia
  if v_ant <> p_monto then
    insert into public.deuda_historial
      (codigo, monto_anterior, monto_nuevo, actualizado_por, actualizado_en)
    values
      (p_codigo::integer, v_ant, p_monto, 'lookup_auto', now());
  end if;
end;
$$;

grant execute on function public.set_datos_codia(text, text, text, text, int, int) to anon, authenticated;
