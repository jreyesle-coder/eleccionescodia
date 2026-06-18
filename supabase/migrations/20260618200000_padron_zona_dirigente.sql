-- Padrón completo de la zona para dirigentes/colaboradores
-- Incluye todos los campos disponibles para la tarjeta de detalle.

drop function if exists public.padron_zona_dirigente();
create or replace function public.padron_zona_dirigente()
returns table (
  id                     bigint,
  codigo                 text,
  nombre_completo        text,
  cedula                 text,
  telefono               text,
  celular                text,
  regional               text,
  provincia              text,
  nucleo                 text,
  carrera                text,
  pensionado             boolean,
  nuevo_integrante       boolean,
  tiene_deuda            boolean,
  monto_deuda            numeric,
  confirmado_por         text,
  confirmacion_intencion text,
  confirmacion_at        timestamptz
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
      p.cedula,
      p.telefono,
      p.celular,
      p.regional,
      p.provincia,
      p.nucleo,
      p.carrera,
      p.pensionado,
      p.nuevo_integrante,
      ( coalesce(p.monto_deuda, 0) > 0
        or exists (select 1 from public.deudas_votantes d where d.codigo = p.codigo)
      ) as tiene_deuda,
      coalesce(p.monto_deuda, 0) as monto_deuda,
      p.confirmado_por,
      p.confirmacion_intencion,
      p.confirmacion_at
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
