-- ════════════════════════════════════════════════════════════════════════
-- Reglas de inscripción al Curso de Inglés:
--   · No permitir doble inscripción (unique por cédula + chequeo en el RPC)
--   · No permitir inscripción con deuda (monto_deuda > 0)
--   · Documentos opcionales → se marca estado 'pendiente' si faltan
-- ════════════════════════════════════════════════════════════════════════

-- Unicidad por cédula (evita doble registro a nivel base)
do $$ begin
  alter table public.inscripciones_ingles
    add constraint uq_insc_ingles_cedula unique (cedula);
exception when duplicate_table then null; when duplicate_object then null; end $$;

-- El RPC de validación ahora también informa deuda y si ya está inscrito.
drop function if exists public.validar_cedula_colegiado(text);
create or replace function public.validar_cedula_colegiado(p_cedula text)
returns table(
  codigo int, nombre_completo text, nucleo text,
  inhabilitado boolean, monto_deuda int, ya_inscrito boolean
)
language sql security definer set search_path = public stable as $$
  with c as (select regexp_replace(coalesce(p_cedula,''), '\D', '', 'g') as ced)
  select p.codigo, p.nombre_completo, p.nucleo,
         coalesce(p.inhabilitado,false),
         coalesce(p.monto_deuda,0),
         exists(select 1 from public.inscripciones_ingles i, c
                where regexp_replace(coalesce(i.cedula,''), '\D', '', 'g') = c.ced)
  from public.padron p, c
  where regexp_replace(coalesce(p.cedula,''), '\D', '', 'g') = c.ced
    and length(c.ced) = 11
  limit 1;
$$;
grant execute on function public.validar_cedula_colegiado(text) to anon, authenticated;
