-- ════════════════════════════════════════════════════════════════════════
-- Consulta pública del estado de inscripción a cursos (por cédula).
-- Devuelve todas las inscripciones de esa cédula con su estado.
-- ════════════════════════════════════════════════════════════════════════
create or replace function public.consultar_inscripciones(p_cedula text)
returns table(slug text, titulo text, estado text, created_at timestamptz)
language sql security definer set search_path = public stable as $$
  select i.slug, c.titulo, i.estado, i.created_at
  from public.inscripciones_curso i
  join public.cursos c on c.id = i.curso_id
  where regexp_replace(coalesce(i.cedula,''),'\D','','g') = regexp_replace(coalesce(p_cedula,''),'\D','','g')
    and length(regexp_replace(coalesce(p_cedula,''),'\D','','g')) = 11
  order by i.created_at desc;
$$;
grant execute on function public.consultar_inscripciones(text) to anon, authenticated;
