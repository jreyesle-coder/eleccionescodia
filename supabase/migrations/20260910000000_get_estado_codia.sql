-- ════════════════════════════════════════════════════════════════════════
-- RPC: get_estado_codia
-- Devuelve el estado guardado en NUESTRA base (padron) para la consulta
-- pública /deuda. Reemplaza la dependencia del portal externo
-- verificate.codiaenlinea.com (dado de baja).
--
-- SECURITY DEFINER + grant a anon: la tabla padron tiene RLS, pero esta
-- función expone solo los campos de estado por colegiatura (no datos
-- sensibles), igual que buscar_colegiado.
-- ════════════════════════════════════════════════════════════════════════
create or replace function public.get_estado_codia(p_codigo int)
returns table(
  monto_deuda     int,
  centro_votacion text,
  nucleo          text,
  regional        text,
  posicion        int,
  inhabilitado    boolean
)
language sql security definer set search_path = public as $$
  select
    coalesce(monto_deuda, 0),
    centro_votacion,
    nucleo,
    regional,
    posicion,
    coalesce(inhabilitado, false)
  from public.padron
  where codigo = p_codigo
  limit 1;
$$;

grant execute on function public.get_estado_codia(int) to anon, authenticated;
