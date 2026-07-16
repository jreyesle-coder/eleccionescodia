-- ════════════════════════════════════════════════════════════════════════
-- RPC: get_pares_por_dirigente
-- Devuelve (codigo, cedula) de todos los colegiados CONFIRMADOS favorables
-- por un dirigente dado (match por nombre parcial en confirmado_por).
-- Usada por los scripts de consulta de deuda para dirigentes ya cargados.
-- ════════════════════════════════════════════════════════════════════════

drop function if exists public.get_pares_por_dirigente(text);
create or replace function public.get_pares_por_dirigente(p_nombre text)
returns table (codigo int, cedula text)
language sql security definer set search_path = public as $$
  select p.codigo, p.cedula
    from public.padron p
   where p.confirmacion_intencion = 'favorable'
     and lower(p.confirmado_por) ilike '%' || lower(p_nombre) || '%'
     and coalesce(p.cedula, '') <> '';
$$;

grant execute on function public.get_pares_por_dirigente(text) to anon, authenticated;
