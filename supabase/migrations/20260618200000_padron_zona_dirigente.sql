-- ════════════════════════════════════════════════════════════════════════
-- Padrón completo de la zona para dirigentes/colaboradores
-- ════════════════════════════════════════════════════════════════════════

drop function if exists public.padron_zona_dirigente();
create or replace function public.padron_zona_dirigente()
returns table (
  id                     bigint,
  codigo                 text,
  nombre_completo        text,
  nucleo                 text,
  carrera                text,
  cedula                 text,
  telefono               text,
  celular                text,
  pensionado             boolean,
  tiene_deuda            boolean,
  confirmado_por         text,
  confirmacion_intencion text
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

  if v_rol not in ('dirigente','colaborador','supervisor','gerente','presidente') then
    raise exception 'Sin permisos';
  end if;

  return query
    select
      p.id,
      p.codigo::text,
      p.nombre_completo,
      p.nucleo,
      p.carrera,
      p.cedula,
      p.telefono,
      p.celular,
      p.pensionado,
      ( coalesce(p.monto_deuda, 0) > 0
        or exists (select 1 from public.deudas_votantes d where d.codigo = p.codigo)
      ) as tiene_deuda,
      p.confirmado_por,
      p.confirmacion_intencion
    from public.padron p
    where (
      v_rol not in ('dirigente','colaborador')
      or v_regional_asignada is null
      or p.regional = v_regional_asignada
    )
    order by p.nucleo nulls last, p.nombre_completo;
end;
$$;
grant execute on function public.padron_zona_dirigente() to authenticated;
