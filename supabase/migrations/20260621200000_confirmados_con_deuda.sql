-- Agregar tiene_deuda y monto_deuda a listar_confirmados_dirigente
drop function if exists public.listar_confirmados_dirigente(text);
create or replace function public.listar_confirmados_dirigente(
  p_dirigente text default null
)
returns table (
  codigo                 text,
  nombre_completo        text,
  regional               text,
  nucleo                 text,
  confirmado_por         text,
  confirmacion_intencion text,
  confirmacion_at        timestamptz,
  via_verificate         boolean,
  tiene_deuda            boolean,
  monto_deuda            int
)
language plpgsql security definer stable set search_path = public as $$
declare
  v_rol               text;
  v_regional_asignada text;
begin
  select pr.rol, pr.regional_asignada
    into v_rol, v_regional_asignada
    from public.profiles pr
   where pr.id = auth.uid();

  if v_rol not in ('supervisor','gerente','presidente','dirigente','colaborador') then
    raise exception 'Sin permisos';
  end if;

  return query
    select
      p.codigo::text,
      p.nombre_completo,
      p.regional,
      p.nucleo,
      p.confirmado_por,
      p.confirmacion_intencion,
      p.confirmacion_at,
      p.simpatiza_verificate as via_verificate,
      (coalesce(p.monto_deuda, 0) > 0) as tiene_deuda,
      coalesce(p.monto_deuda, 0)       as monto_deuda
    from public.padron p
    where (p.confirmado_por is not null or p.simpatiza_verificate = true)
      and (p_dirigente is null or p.confirmado_por = p_dirigente)
      and (
        v_rol not in ('dirigente','colaborador')
        or v_regional_asignada is null
        or p.regional = v_regional_asignada
      )
    order by p.confirmado_por nulls last, p.nombre_completo;
end;
$$;
grant execute on function public.listar_confirmados_dirigente(text) to authenticated;
