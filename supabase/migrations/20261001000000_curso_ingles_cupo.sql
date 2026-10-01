-- ════════════════════════════════════════════════════════════════════════
-- Cupo del Curso de Inglés: máximo 40 inscritos.
--   · Trigger (con advisory lock) que bloquea el insert #41 — tope duro,
--     a prueba de inscripciones simultáneas.
--   · RPC público estado_curso_ingles() → {total, limite, abierto}.
-- Para cambiar el cupo, edita el número 40 en ambos lugares.
-- ════════════════════════════════════════════════════════════════════════

create or replace function public.check_cupo_ingles()
returns trigger language plpgsql as $$
begin
  -- serializa la verificación+insert para que nunca pasen de 40
  perform pg_advisory_xact_lock(hashtext('cupo_curso_ingles'));
  if (select count(*) from public.inscripciones_ingles) >= 40 then
    raise exception 'CUPO_LLENO' using errcode = 'check_violation';
  end if;
  return new;
end $$;

drop trigger if exists trg_cupo_ingles on public.inscripciones_ingles;
create trigger trg_cupo_ingles
  before insert on public.inscripciones_ingles
  for each row execute function public.check_cupo_ingles();

create or replace function public.estado_curso_ingles()
returns jsonb language sql security definer set search_path = public stable as $$
  select jsonb_build_object(
    'total',   (select count(*) from public.inscripciones_ingles),
    'limite',  40,
    'abierto', (select count(*) from public.inscripciones_ingles) < 40
  );
$$;
grant execute on function public.estado_curso_ingles() to anon, authenticated;
