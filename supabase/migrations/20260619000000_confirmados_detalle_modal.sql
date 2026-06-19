-- ════════════════════════════════════════════════════════════════════════
-- listar_confirmados_detalle: drilldown para las tarjetas KPI del tab
-- "Confirmados" del portal del presidente.
--
-- p_via: 'verificate' | 'callcenter' | 'dirigente' | 'todos'
-- ════════════════════════════════════════════════════════════════════════

drop function if exists public.listar_confirmados_detalle(text);
create or replace function public.listar_confirmados_detalle(p_via text)
returns table (
  codigo          text,
  nombre_completo text,
  regional        text,
  nucleo          text,
  carrera         text,
  via_verificate  boolean,
  via_callcenter  boolean,
  via_dirigente   boolean,
  confirmado_por  text
)
language sql security definer stable set search_path = public as $$
  select distinct on (p.codigo)
    p.codigo::text,
    p.nombre_completo,
    p.regional,
    p.nucleo,
    p.carrera,
    coalesce(p.simpatiza_verificate, false)  as via_verificate,
    exists (
      select 1 from public.llamadas l
       where l.colegiado_id = p.id
         and l.resultado = 'efectiva_confirma'
    )                                        as via_callcenter,
    (p.confirmacion_intencion = 'favorable') as via_dirigente,
    p.confirmado_por
  from public.padron p
  where
    case p_via
      when 'verificate' then
        coalesce(p.simpatiza_verificate, false) = true
      when 'callcenter' then
        exists (
          select 1 from public.llamadas l
           where l.colegiado_id = p.id
             and l.resultado = 'efectiva_confirma'
        )
      when 'dirigente' then
        p.confirmacion_intencion = 'favorable'
      else -- 'todos'
        (
          coalesce(p.simpatiza_verificate, false) = true
          or exists (
            select 1 from public.llamadas l
             where l.colegiado_id = p.id
               and l.resultado = 'efectiva_confirma'
          )
          or p.confirmacion_intencion = 'favorable'
        )
    end
    and public.mi_rol() in (
      'supervisor','gerente','presidente','dirigente','colaborador'
    )
  order by p.codigo, p.nombre_completo;
$$;
grant execute on function public.listar_confirmados_detalle(text) to authenticated;


-- ════════════════════════════════════════════════════════════════════════
-- confirmados_total_global: cuenta deduplicada de todos los confirmados
-- (usado en Vista por Núcleos para evitar el doble conteo de quienes
-- aparecen en más de un núcleo/carrera).
-- ════════════════════════════════════════════════════════════════════════

drop function if exists public.confirmados_total_global();
create or replace function public.confirmados_total_global()
returns bigint
language sql security definer stable set search_path = public as $$
  select count(distinct p.id)
    from public.padron p
   where (
     coalesce(p.simpatiza_verificate, false) = true
     or exists (
       select 1 from public.llamadas l
        where l.colegiado_id = p.id
          and l.resultado = 'efectiva_confirma'
     )
     or p.confirmacion_intencion = 'favorable'
   )
   and public.mi_rol() in (
     'supervisor','gerente','presidente','dirigente','colaborador'
   );
$$;
grant execute on function public.confirmados_total_global() to authenticated;
