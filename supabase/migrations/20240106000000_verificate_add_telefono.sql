-- Agrega telefono al retorno de buscar_miembro_publico

drop function if exists public.buscar_miembro_publico(text);
create or replace function public.buscar_miembro_publico(p_nombre text)
returns table (
  id             bigint,
  matricula      text,
  nombre         text,
  telefono       text,
  distrito       text,
  region         text,
  vencimiento    date,
  estado_gestion text
)
language plpgsql security definer stable set search_path = public as $$
declare
  tokens text[];
  token  text;
  query  text := 'select id, matricula, nombre, telefono, distrito, region, vencimiento, estado_gestion from public.miembros where true';
begin
  if length(trim(p_nombre)) < 3 then
    return;
  end if;

  tokens := array(
    select t from unnest(string_to_array(trim(p_nombre), ' ')) t
    where length(trim(t)) >= 2
  );

  if array_length(tokens, 1) is null then
    return;
  end if;

  foreach token in array tokens loop
    query := query || format(' and nombre ilike %L', '%' || trim(token) || '%');
  end loop;

  query := query || ' order by nombre limit 50';

  return query execute query;
end;
$$;

grant execute on function public.buscar_miembro_publico(text) to anon, authenticated;
