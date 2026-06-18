-- ════════════════════════════════════════════════════════════════════════
-- FIX: simpatizantes_por_regularizar
-- Solo mostrar colegiados con deuda real (monto_deuda > 0, deudas_votantes)
-- o pensionados. Se elimina la condición estado_gestion que incluía
-- erróneamente a colegiados habilitados sin deuda.
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
    ( coalesce(p.monto_deuda, 0) > 0
      or exists (
        select 1 from public.deudas_votantes dv
         where dv.codigo = p.codigo
      )
    ) as tiene_deuda,
    coalesce(
      nullif(p.monto_deuda, 0),
      (select dv.monto from public.deudas_votantes dv where dv.codigo = p.codigo limit 1),
      0
    ) as monto_deuda,
    p.voto_verificate_at
  from public.padron p
  where p.simpatiza_verificate = true
    and (
      p.pensionado = true
      or coalesce(p.monto_deuda, 0) > 0
      or exists (select 1 from public.deudas_votantes dv where dv.codigo = p.codigo)
    )
    and public.mi_rol() in (
      'supervisor','gerente','presidente','dirigente','colaborador'
    )
  order by
    coalesce(
      nullif(p.monto_deuda, 0),
      (select dv.monto from public.deudas_votantes dv where dv.codigo = p.codigo limit 1),
      0
    ) asc,
    p.pensionado asc,
    p.nombre_completo asc;
$$;
grant execute on function public.simpatizantes_por_regularizar() to authenticated;
