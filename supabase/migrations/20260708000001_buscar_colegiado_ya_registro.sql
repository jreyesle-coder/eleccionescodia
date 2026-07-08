-- Agrega ya_registro a buscar_colegiado para que el frontend sepa
-- si el colegiado ya marcó su preferencia en Verificate.

drop function if exists public.buscar_colegiado(text);
create or replace function public.buscar_colegiado(p_q text)
returns table (
  id               bigint,
  codigo           text,
  nombre_completo  text,
  cedula           text,
  telefono         text,
  celular          text,
  regional         text,
  provincia        text,
  nucleo           text,
  carrera          text,
  pensionado       boolean,
  nuevo_integrante boolean,
  tiene_deuda      boolean,
  ya_registro      boolean
)
language plpgsql security definer stable set search_path = public as $$
declare
  q      text := trim(p_q);
  tokens text[];
  token  text;
  sql    text;
begin
  if length(q) < 3 then return; end if;

  -- Búsqueda por código exacto (solo dígitos)
  if q ~ '^\d+$' then
    return query
      select
        p.id,
        p.codigo::text,
        p.nombre_completo, p.cedula, p.telefono, p.celular,
        p.regional, p.provincia, p.nucleo, p.carrera,
        p.pensionado, p.nuevo_integrante,
        ( coalesce(p.monto_deuda, 0) > 0
          or exists (
            select 1 from public.deudas_votantes d
             where d.codigo = p.codigo
          )
        ) as tiene_deuda,
        (p.voto_verificate_at is not null) as ya_registro
      from public.padron p
      where p.codigo = q::integer
      limit 10;
    return;
  end if;

  -- Búsqueda por cédula (dígitos y guiones)
  if q ~ '^[\d\-]+$' then
    return query
      select
        p.id, p.codigo::text,
        p.nombre_completo, p.cedula, p.telefono, p.celular,
        p.regional, p.provincia, p.nucleo, p.carrera,
        p.pensionado, p.nuevo_integrante,
        ( coalesce(p.monto_deuda, 0) > 0
          or exists (select 1 from public.deudas_votantes d where d.codigo = p.codigo)
        ) as tiene_deuda,
        (p.voto_verificate_at is not null) as ya_registro
      from public.padron p
      where p.cedula ilike '%' || q || '%'
      order by p.nombre_completo
      limit 50;
    return;
  end if;

  -- Búsqueda por nombre con múltiples tokens
  tokens := array(
    select t from unnest(string_to_array(q, ' ')) t
    where length(trim(t)) >= 2
  );
  if array_length(tokens, 1) is null then return; end if;

  sql := $sql$
    select
      p.id, p.codigo::text,
      p.nombre_completo, p.cedula, p.telefono, p.celular,
      p.regional, p.provincia, p.nucleo, p.carrera,
      p.pensionado, p.nuevo_integrante,
      ( coalesce(p.monto_deuda, 0) > 0
        or exists (select 1 from public.deudas_votantes d where d.codigo = p.codigo)
      ) as tiene_deuda,
      (p.voto_verificate_at is not null) as ya_registro
    from public.padron p
    where true
  $sql$;

  foreach token in array tokens loop
    sql := sql || format(' and p.nombre_completo ilike %L', '%' || trim(token) || '%');
  end loop;

  sql := sql || ' order by p.nombre_completo limit 50';
  return query execute sql;
end;
$$;
grant execute on function public.buscar_colegiado(text) to anon, authenticated;
