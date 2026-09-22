-- ════════════════════════════════════════════════════════════════════════
-- Dashboard del padrón (analítica para el presidente)
--   1) Columna genero (se puebla por script; el padrón no la trae)
--   2) RPC get_padron_dashboard() → jsonb con todos los agregados
--
-- Convención de "deuda vigente": monto_deuda > 0 y NO inhabilitado.
-- Edad calculada desde fecha_nacimiento a la fecha actual.
-- ════════════════════════════════════════════════════════════════════════

alter table public.padron add column if not exists genero text;

create or replace function public.get_padron_dashboard()
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
with base as (
  select
    p.*,
    (p.fecha_nacimiento is not null) as tiene_fecha,
    case when p.fecha_nacimiento is not null
         then date_part('year', age(current_date, p.fecha_nacimiento))::int end as edad,
    (coalesce(p.pensionado,false) or coalesce(p.pensionado_votante,false)) as es_pensionado,
    (coalesce(p.inhabilitado,false)) as es_inhabilitado,
    (nullif(btrim(coalesce(p.celular,'')),'') is not null
     or nullif(btrim(coalesce(p.telefono,'')),'') is not null) as tiene_tel
  from public.padron p
),
vig as ( select * from base where not es_inhabilitado )
select jsonb_build_object(
  'generado', now(),
  'kpis', (select jsonb_build_object(
     'total',            (select count(*) from base),
     'reales',           (select count(*) from vig),
     'inhabilitados',    (select count(*) from base where es_inhabilitado),
     'inhabilitados_deuda', (select coalesce(sum(monto_deuda),0) from base where es_inhabilitado and monto_deuda>0),
     'con_deuda',        (select count(*) from vig where monto_deuda>0),
     'deuda_total',      (select coalesce(sum(monto_deuda),0) from vig where monto_deuda>0),
     'al_dia',           (select count(*) from vig where monto_deuda=0),
     'saldo_favor_n',    (select count(*) from vig where monto_deuda<0),
     'saldo_favor_monto',(select coalesce(sum(monto_deuda),0) from vig where monto_deuda<0),
     'pensionados',      (select count(*) from base where es_pensionado),
     'con_telefono',     (select count(*) from base where tiene_tel),
     'con_fecha',        (select count(*) from base where tiene_fecha),
     'edad_prom',        (select round(avg(edad)::numeric,1) from vig where edad is not null),
     'may65_no_pens',    (select count(*) from vig where edad>=65 and not es_pensionado),
     'deuda_65',         (select coalesce(sum(monto_deuda),0) from vig where edad>=65 and monto_deuda>0),
     'con_deuda_65',     (select count(*) from vig where edad>=65 and monto_deuda>0)
  )),
  'por_regional', (select coalesce(jsonb_agg(x order by x->>'deuda' desc),'[]'::jsonb) from (
     select jsonb_build_object(
       'regional', coalesce(regional,'(sin regional)'),
       'colegiados', count(*),
       'con_deuda', count(*) filter (where monto_deuda>0),
       'deuda', coalesce(sum(monto_deuda) filter (where monto_deuda>0),0)
     ) x
     from vig group by coalesce(regional,'(sin regional)')
  ) t),
  'por_nucleo', (select coalesce(jsonb_agg(x order by (x->>'deuda')::numeric desc),'[]'::jsonb) from (
     select jsonb_build_object(
       'nucleo', coalesce(nucleo,'(sin nucleo)'),
       'colegiados', count(*),
       'con_deuda', count(*) filter (where monto_deuda>0),
       'deuda', coalesce(sum(monto_deuda) filter (where monto_deuda>0),0)
     ) x
     from vig group by coalesce(nucleo,'(sin nucleo)')
  ) t),
  'por_edad', (select coalesce(jsonb_agg(x order by ord),'[]'::jsonb) from (
     select
       case
         when edad is null then 's/f'
         when edad<=29 then '≤29' when edad<=39 then '30-39'
         when edad<=49 then '40-49' when edad<=59 then '50-59'
         when edad<=65 then '60-65' else '66+' end as rango,
       case
         when edad is null then 99
         when edad<=29 then 1 when edad<=39 then 2 when edad<=49 then 3
         when edad<=59 then 4 when edad<=65 then 5 else 6 end as ord,
       jsonb_build_object(
         'rango', case
           when edad is null then 's/f'
           when edad<=29 then '≤29' when edad<=39 then '30-39'
           when edad<=49 then '40-49' when edad<=59 then '50-59'
           when edad<=65 then '60-65' else '66+' end,
         'colegiados', count(*)) x
     from vig
     group by rango, ord
  ) t),
  'por_genero', (select coalesce(jsonb_agg(jsonb_build_object('genero',g,'colegiados',n)),'[]'::jsonb) from (
     select coalesce(nullif(btrim(genero),''),'Indeterminado') g, count(*) n
     from vig group by 1
  ) t)
)
$$;

grant execute on function public.get_padron_dashboard() to authenticated;
