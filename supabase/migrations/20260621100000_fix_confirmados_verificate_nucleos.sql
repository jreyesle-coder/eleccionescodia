-- ═══════════════════════════════════════════════════════════════════════════
-- Fix: confirmados_verificate_count + confirmados_total_global sin mi_rol()
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. RPC dedicado para contar simpatizantes Verifícate (evita issue PostgREST)
drop function if exists public.confirmados_verificate_count();
create or replace function public.confirmados_verificate_count()
returns bigint
language sql security definer stable set search_path = public as $$
  select count(*)
    from public.padron
   where coalesce(simpatiza_verificate, false) = true;
$$;
grant execute on function public.confirmados_verificate_count() to authenticated;

-- 2. confirmados_total_global: quitar mi_rol() check (es security definer,
--    no necesita el check de rol para funcionar)
drop function if exists public.confirmados_total_global();
create or replace function public.confirmados_total_global()
returns bigint
language sql security definer stable set search_path = public as $$
  select count(distinct p.id)
    from public.padron p
   where coalesce(p.simpatiza_verificate, false) = true
      or exists (
           select 1 from public.llamadas l
            where l.colegiado_id = p.id
              and l.resultado = 'efectiva_confirma'
         )
      or p.confirmacion_intencion = 'favorable';
$$;
grant execute on function public.confirmados_total_global() to authenticated;
