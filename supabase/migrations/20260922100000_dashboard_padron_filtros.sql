-- ════════════════════════════════════════════════════════════════════════
-- get_padron_dashboard con FILTROS:
--   p_regional, p_nucleo, p_edad_min, p_edad_max, p_segmento
--   segmento: 'vigentes'(def) | 'con_deuda' | 'saldo_favor' | 'al_dia'
--             | 'pensionados' | 'no_pensionados' | 'fallecidos' | 'todos'
-- Devuelve además 'opciones' (listas de regionales y núcleos para los selects).
-- ════════════════════════════════════════════════════════════════════════
drop function if exists public.get_padron_dashboard();
drop function if exists public.get_padron_dashboard(text, text, int, int, text);

create or replace function public.get_padron_dashboard(
  p_regional text default null,
  p_nucleo   text default null,
  p_edad_min int  default null,
  p_edad_max int  default null,
  p_segmento text default null
)
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
with base as (
  select p.*,
    case when p.fecha_nacimiento is not null
         then date_part('year', age(current_date, p.fecha_nacimiento))::int end as edad,
    (coalesce(p.pensionado,false) or coalesce(p.pensionado_votante,false)) as es_pensionado,
    coalesce(p.inhabilitado,false) as es_inhabilitado,
    (nullif(btrim(coalesce(p.celular,'')),'') is not null
     or nullif(btrim(coalesce(p.telefono,'')),'') is not null) as tiene_tel
  from public.padron p
),
f as (
  select * from base
  where (p_regional is null or regional = p_regional)
    and (p_nucleo   is null or nucleo   = p_nucleo)
    and (p_edad_min is null or (edad is not null and edad >= p_edad_min))
    and (p_edad_max is null or (edad is not null and edad <= p_edad_max))
    and case coalesce(p_segmento,'vigentes')
          when 'todos'          then true
          when 'fallecidos'     then es_inhabilitado
          when 'con_deuda'      then (not es_inhabilitado and monto_deuda > 0)
          when 'saldo_favor'    then (not es_inhabilitado and monto_deuda < 0)
          when 'al_dia'         then (not es_inhabilitado and monto_deuda = 0)
          when 'pensionados'    then (not es_inhabilitado and es_pensionado)
          when 'no_pensionados' then (not es_inhabilitado and not es_pensionado)
          else (not es_inhabilitado)
        end
)
select jsonb_build_object(
  'generado', now(),
  'kpis', (select jsonb_build_object(
     'total',            (select count(*) from f),
     'reales',           (select count(*) from f where not es_inhabilitado),
     'inhabilitados',    (select count(*) from f where es_inhabilitado),
     'inhabilitados_deuda', (select coalesce(sum(monto_deuda),0) from f where es_inhabilitado and monto_deuda>0),
     'con_deuda',        (select count(*) from f where monto_deuda>0),
     'deuda_total',      (select coalesce(sum(monto_deuda),0) from f where monto_deuda>0),
     'al_dia',           (select count(*) from f where monto_deuda=0),
     'saldo_favor_n',    (select count(*) from f where monto_deuda<0),
     'saldo_favor_monto',(select coalesce(sum(monto_deuda),0) from f where monto_deuda<0),
     'pensionados',      (select count(*) from f where es_pensionado),
     'con_telefono',     (select count(*) from f where tiene_tel),
     'con_fecha',        (select count(*) from f where fecha_nacimiento is not null),
     'edad_prom',        (select round(avg(edad)::numeric,1) from f where edad is not null),
     'may65_no_pens',    (select count(*) from f where edad>=65 and not es_pensionado and not es_inhabilitado),
     'deuda_65',         (select coalesce(sum(monto_deuda),0) from f where edad>=65 and monto_deuda>0),
     'con_deuda_65',     (select count(*) from f where edad>=65 and monto_deuda>0)
  )),
  'por_regional', (select coalesce(jsonb_agg(x order by (x->>'deuda')::numeric desc),'[]'::jsonb) from (
     select jsonb_build_object('regional',coalesce(regional,'(sin regional)'),
       'colegiados',count(*),'con_deuda',count(*) filter (where monto_deuda>0),
       'deuda',coalesce(sum(monto_deuda) filter (where monto_deuda>0),0)) x
     from f group by coalesce(regional,'(sin regional)')) t),
  'por_nucleo', (select coalesce(jsonb_agg(x order by (x->>'deuda')::numeric desc),'[]'::jsonb) from (
     select jsonb_build_object('nucleo',coalesce(nucleo,'(sin nucleo)'),
       'colegiados',count(*),'con_deuda',count(*) filter (where monto_deuda>0),
       'deuda',coalesce(sum(monto_deuda) filter (where monto_deuda>0),0)) x
     from f group by coalesce(nucleo,'(sin nucleo)')) t),
  'por_edad', (select coalesce(jsonb_agg(x order by ord),'[]'::jsonb) from (
     select case when edad is null then 99 when edad<=29 then 1 when edad<=39 then 2
                 when edad<=49 then 3 when edad<=59 then 4 when edad<=65 then 5 else 6 end ord,
       jsonb_build_object('rango', case when edad is null then 's/f'
         when edad<=29 then '≤29' when edad<=39 then '30-39' when edad<=49 then '40-49'
         when edad<=59 then '50-59' when edad<=65 then '60-65' else '66+' end,
         'colegiados',count(*)) x
     from f group by ord,
       case when edad is null then 's/f' when edad<=29 then '≤29' when edad<=39 then '30-39'
            when edad<=49 then '40-49' when edad<=59 then '50-59' when edad<=65 then '60-65' else '66+' end
     ) t),
  'por_genero', (select coalesce(jsonb_agg(jsonb_build_object('genero',g,'colegiados',n)),'[]'::jsonb) from (
     select coalesce(nullif(btrim(genero),''),'Indeterminado') g, count(*) n from f group by 1) t),
  'opciones', jsonb_build_object(
     'regionales', (select coalesce(jsonb_agg(distinct regional order by regional),'[]'::jsonb) from base where regional is not null),
     'nucleos',    (select coalesce(jsonb_agg(distinct nucleo   order by nucleo),  '[]'::jsonb) from base where nucleo   is not null)
  )
)
$$;

grant execute on function public.get_padron_dashboard(text, text, int, int, text) to authenticated;
