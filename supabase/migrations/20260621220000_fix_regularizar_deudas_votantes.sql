-- ════════════════════════════════════════════════════════════════════════
-- FIX: simpatizantes_por_regularizar
-- Lógica correcta:
--   1. Solo simpatizantes de nuestra candidatura (simpatiza_verificate = true)
--   2. Que tengan deuda conocida (monto_deuda > 0 o pensionado)
--      O cuya deuda nunca se ha consultado (monto_deuda IS NULL)
--      → los NULL aparecen para que el background fetch al CODIA los evalúe
--   3. NO se usa deudas_votantes (tabla desactualizada)
-- ════════════════════════════════════════════════════════════════════════

drop function if exists public.simpatizantes_por_regularizar();
create or replace function public.simpatizantes_por_regularizar()
returns table (
  id                 bigint,
  codigo             text,
  nombre_completo    text,
  cedula             text,
  telefono           text,
  celular            text,
  regional           text,
  provincia          text,
  nucleo             text,
  carrera            text,
  pensionado         boolean,
  tiene_deuda        boolean,
  monto_deuda        int,
  voto_verificate_at timestamptz
)
language sql security definer stable set search_path = public as $$
  select
    p.id,
    p.codigo::text,
    p.nombre_completo,
    p.cedula,
    p.telefono,
    p.celular,
    p.regional,
    p.provincia,
    p.nucleo,
    p.carrera,
    p.pensionado,
    coalesce(p.monto_deuda, 0) > 0  as tiene_deuda,
    coalesce(p.monto_deuda, 0)      as monto_deuda,
    p.voto_verificate_at
  from public.padron p
  where p.simpatiza_verificate = true
    and (
      p.pensionado = true
      or coalesce(p.monto_deuda, 0) > 0
      or p.monto_deuda is null
    )
    and public.mi_rol() in (
      'supervisor','gerente','presidente','dirigente','colaborador'
    )
  order by p.monto_deuda asc nulls last, p.pensionado asc, p.nombre_completo asc;
$$;
grant execute on function public.simpatizantes_por_regularizar() to authenticated;
