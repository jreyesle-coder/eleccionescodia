-- ════════════════════════════════════════════════════════════════════════
-- FIX: simpatizantes_por_regularizar
-- Problema: la migración opcion_c eliminó la verificación contra la tabla
-- deudas_votantes. Colegiados con deuda importada en esa tabla pero con
-- monto_deuda = 0 en padron no aparecían en la pestaña "Por regularizar".
-- Solución: reintroducir el check de deudas_votantes Y ampliar para incluir
-- también a simpatizantes confirmados por dirigente (no solo Verifícate).
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
    (
      coalesce(p.monto_deuda, 0) > 0
      or exists (select 1 from public.deudas_votantes d where d.codigo = p.codigo)
    )                            as tiene_deuda,
    coalesce(p.monto_deuda, 0)  as monto_deuda,
    p.voto_verificate_at
  from public.padron p
  where
    -- Marcó intención en Verifícate o fue confirmado por un dirigente
    (
      p.simpatiza_verificate = true
      or p.confirmacion_intencion = 'si'
    )
    -- Tiene deuda real o es pensionado (necesita regularizarse)
    and (
      p.pensionado = true
      or coalesce(p.monto_deuda, 0) > 0
      or exists (select 1 from public.deudas_votantes d where d.codigo = p.codigo)
    )
    and public.mi_rol() in (
      'supervisor','gerente','presidente','dirigente','colaborador'
    )
  order by p.monto_deuda asc nulls last, p.pensionado asc, p.nombre_completo asc;
$$;
grant execute on function public.simpatizantes_por_regularizar() to authenticated;
