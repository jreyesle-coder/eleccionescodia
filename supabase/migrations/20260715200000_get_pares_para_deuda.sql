-- ════════════════════════════════════════════════════════════════════════
-- RPC: get_pares_para_deuda
-- Dada una lista de códigos, devuelve (codigo, cedula) desde el padrón para
-- que el script de consulta de deuda pueda loguearse en codiaenlinea.com.
-- Usada por scripts/*.mjs (consultar_deuda_lista_presidente, actualizar_deuda_reporte).
-- ════════════════════════════════════════════════════════════════════════

drop function if exists public.get_pares_para_deuda(int[]);
create or replace function public.get_pares_para_deuda(p_codigos int[])
returns table (codigo int, cedula text)
language sql security definer set search_path = public as $$
  select p.codigo, p.cedula
    from public.padron p
   where p.codigo = any(p_codigos)
     and coalesce(p.cedula, '') <> '';
$$;

grant execute on function public.get_pares_para_deuda(int[]) to anon, authenticated;
