-- ════════════════════════════════════════════════════════════════════════
-- SISTEMA DE CURSOS reutilizable (reemplaza el formulario único de inglés).
--   · tabla cursos (config por curso: banner, requisitos, documentos, cupos, flags)
--   · tabla inscripciones_curso (registros, con estado pendiente/aprobada/rechazada)
--   · bucket público 'cursos-banners' (flyers) + bucket privado 'cursos-docs'
--   · RPCs: get_curso, estado_curso, validar_cedula_curso, aprobar/rechazar
--   · migra las inscripciones del curso de inglés + siembra inglés y facilitadores
-- ════════════════════════════════════════════════════════════════════════

create table if not exists public.cursos (
  id                 uuid primary key default gen_random_uuid(),
  slug               text unique not null,
  titulo             text not null,
  descripcion        text,
  banner_url         text,
  requisitos         jsonb default '[]'::jsonb,   -- ["texto1","texto2",...]
  documentos         jsonb default '[]'::jsonb,   -- [{"key":"cedula","label":"Copia de cédula"}]
  limite             int  default 40,             -- cupo real (aprobados máximo)
  max_registros      int  default 80,             -- tope de registros aceptados
  requiere_aprobacion boolean default true,
  solo_colegiados    boolean default true,
  bloquear_con_deuda boolean default true,
  activo             boolean default true,
  created_at         timestamptz default now()
);

create table if not exists public.inscripciones_curso (
  id          uuid primary key default gen_random_uuid(),
  curso_id    uuid not null references public.cursos(id) on delete cascade,
  slug        text,
  nombre      text not null,
  cedula      text not null,
  telefono    text,
  email       text,
  colegiatura int,
  nucleo      text,
  docs        jsonb default '{}'::jsonb,   -- {"cedula":"path","titulo":"path"}
  estado      text default 'pendiente',    -- pendiente | aprobada | rechazada
  created_at  timestamptz default now(),
  unique (curso_id, cedula)
);
create index if not exists idx_insc_curso on public.inscripciones_curso(curso_id);

alter table public.cursos enable row level security;
alter table public.inscripciones_curso enable row level security;

-- Cursos: el público ve los activos; autenticados administran todo.
drop policy if exists cursos_anon_read on public.cursos;
create policy cursos_anon_read on public.cursos for select to anon using (activo = true);
drop policy if exists cursos_auth_all on public.cursos;
create policy cursos_auth_all on public.cursos for all to authenticated using (true) with check (true);
grant select on public.cursos to anon;
grant select, insert, update, delete on public.cursos to authenticated;

-- Inscripciones: el público inserta; autenticados leen/actualizan.
drop policy if exists insc_curso_insert on public.inscripciones_curso;
create policy insc_curso_insert on public.inscripciones_curso for insert to anon with check (true);
drop policy if exists insc_curso_auth on public.inscripciones_curso;
create policy insc_curso_auth on public.inscripciones_curso for all to authenticated using (true) with check (true);
grant insert on public.inscripciones_curso to anon;
grant select, insert, update, delete on public.inscripciones_curso to authenticated;

-- ── Storage ─────────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public) values ('cursos-banners','cursos-banners', true) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('cursos-docs','cursos-docs', false)   on conflict (id) do nothing;

drop policy if exists "banners anon read" on storage.objects;
create policy "banners anon read" on storage.objects for select to anon using (bucket_id = 'cursos-banners');
drop policy if exists "banners auth upload" on storage.objects;
create policy "banners auth upload" on storage.objects for insert to authenticated with check (bucket_id = 'cursos-banners');
drop policy if exists "docs anon upload" on storage.objects;
create policy "docs anon upload" on storage.objects for insert to anon with check (bucket_id = 'cursos-docs');
drop policy if exists "docs auth read" on storage.objects;
create policy "docs auth read" on storage.objects for select to authenticated using (bucket_id = 'cursos-docs');

-- ── Tope de registros por curso (trigger con lock) ──────────────────────────
create or replace function public.check_cupo_curso()
returns trigger language plpgsql as $$
declare v_max int;
begin
  perform pg_advisory_xact_lock(hashtext('cupo_curso_' || new.curso_id::text));
  select max_registros into v_max from public.cursos where id = new.curso_id;
  if (select count(*) from public.inscripciones_curso
        where curso_id = new.curso_id and estado <> 'rechazada') >= coalesce(v_max, 80) then
    raise exception 'CUPO_LLENO' using errcode = 'check_violation';
  end if;
  return new;
end $$;
drop trigger if exists trg_cupo_curso on public.inscripciones_curso;
create trigger trg_cupo_curso before insert on public.inscripciones_curso
  for each row execute function public.check_cupo_curso();

-- ── RPCs públicos ───────────────────────────────────────────────────────────
create or replace function public.get_curso(p_slug text)
returns jsonb language sql security definer set search_path = public stable as $$
  select to_jsonb(c) - 'created_at' from public.cursos c where c.slug = p_slug and c.activo = true;
$$;
grant execute on function public.get_curso(text) to anon, authenticated;

create or replace function public.estado_curso(p_slug text)
returns jsonb language sql security definer set search_path = public stable as $$
  select jsonb_build_object(
    'total',      coalesce((select count(*) from public.inscripciones_curso i join public.cursos c on c.id=i.curso_id where c.slug=p_slug and i.estado<>'rechazada'),0),
    'aprobadas',  coalesce((select count(*) from public.inscripciones_curso i join public.cursos c on c.id=i.curso_id where c.slug=p_slug and i.estado='aprobada'),0),
    'max_registros', (select max_registros from public.cursos where slug=p_slug),
    'limite',     (select limite from public.cursos where slug=p_slug),
    'abierto',    coalesce((select count(*) from public.inscripciones_curso i join public.cursos c on c.id=i.curso_id where c.slug=p_slug and i.estado<>'rechazada'),0)
                  < coalesce((select max_registros from public.cursos where slug=p_slug),80)
  );
$$;
grant execute on function public.estado_curso(text) to anon, authenticated;

create or replace function public.validar_cedula_curso(p_cedula text, p_slug text)
returns table(codigo int, nombre_completo text, nucleo text, inhabilitado boolean, monto_deuda int, ya_inscrito boolean)
language sql security definer set search_path = public stable as $$
  with cc as (select regexp_replace(coalesce(p_cedula,''),'\D','','g') ced,
                     (select id from public.cursos where slug = p_slug) cid)
  select p.codigo, p.nombre_completo, p.nucleo, coalesce(p.inhabilitado,false), coalesce(p.monto_deuda,0),
         exists(select 1 from public.inscripciones_curso i, cc
                where i.curso_id = cc.cid and regexp_replace(coalesce(i.cedula,''),'\D','','g') = cc.ced and i.estado <> 'rechazada')
  from public.padron p, cc
  where regexp_replace(coalesce(p.cedula,''),'\D','','g') = cc.ced and length(cc.ced) = 11
  limit 1;
$$;
grant execute on function public.validar_cedula_curso(text, text) to anon, authenticated;

-- Aprobar (respeta el cupo 'limite') / rechazar — solo autenticados
create or replace function public.aprobar_inscripcion(p_id uuid)
returns text language plpgsql security definer set search_path = public as $$
declare v_curso uuid; v_limite int; v_aprob int;
begin
  select curso_id into v_curso from public.inscripciones_curso where id = p_id;
  if v_curso is null then return 'NO_EXISTE'; end if;
  perform pg_advisory_xact_lock(hashtext('aprob_curso_' || v_curso::text));
  select limite into v_limite from public.cursos where id = v_curso;
  select count(*) into v_aprob from public.inscripciones_curso where curso_id = v_curso and estado = 'aprobada';
  if v_aprob >= coalesce(v_limite,40) then return 'LIMITE'; end if;
  update public.inscripciones_curso set estado = 'aprobada' where id = p_id;
  return 'OK';
end $$;
grant execute on function public.aprobar_inscripcion(uuid) to authenticated;

create or replace function public.rechazar_inscripcion(p_id uuid)
returns text language sql security definer set search_path = public as $$
  update public.inscripciones_curso set estado = 'rechazada' where id = p_id;
  select 'OK';
$$;
grant execute on function public.rechazar_inscripcion(uuid) to authenticated;

-- ── Siembra de cursos ───────────────────────────────────────────────────────
insert into public.cursos (slug, titulo, descripcion, banner_url, requisitos, documentos,
  limite, max_registros, requiere_aprobacion, solo_colegiados, bloquear_con_deuda, activo)
values
('ingles', 'Curso de Inglés', 'Disponible para los colegiados del CODIA, con INFOTEP y CIFAL.',
 '/curso-ingles-banner.jpg',
 '["Copia de cédula","Copia de título"]'::jsonb,
 '[{"key":"cedula","label":"Copia de cédula"},{"key":"titulo","label":"Copia de título"}]'::jsonb,
 40, 40, false, true, true, true),
('facilitadores', 'Facilitadores del CODIA',
 'Certifícate como docente con INFOTEP. Facilitador de Procesos de Enseñanza y Aprendizaje Centrado en el Participante.',
 '/curso-facilitadores-banner.jpg',
 '["Copia del título de grado o técnico (incluye bachiller técnico)","Copia de cédula","Certificado de manejo de Office o constancia laboral que indique su uso","Constancia laboral con área de desempeño y mínimo un año de experiencia","Correo electrónico y número de teléfono"]'::jsonb,
 '[{"key":"titulo","label":"Copia de título de grado o técnico"},{"key":"cedula","label":"Copia de cédula"},{"key":"office","label":"Certificado de Office o constancia laboral"},{"key":"constancia","label":"Constancia laboral (área + 1 año experiencia)"}]'::jsonb,
 40, 80, true, true, true, true)
on conflict (slug) do nothing;

-- ── Migrar inscripciones del curso de inglés (si existen) ───────────────────
-- Se desactiva el trigger de cupo para no bloquear el histórico (inglés ya
-- tenía 41 inscritos, por encima del tope de 40).
alter table public.inscripciones_curso disable trigger trg_cupo_curso;
do $$
declare v_ing uuid;
begin
  select id into v_ing from public.cursos where slug = 'ingles';
  if v_ing is not null and to_regclass('public.inscripciones_ingles') is not null then
    insert into public.inscripciones_curso (curso_id, slug, nombre, cedula, telefono, email, colegiatura, nucleo, docs, estado, created_at)
    select v_ing, 'ingles', nombre, cedula, telefono, email, colegiatura, nucleo,
           jsonb_strip_nulls(jsonb_build_object('cedula', cedula_doc, 'titulo', titulo_doc)),
           'aprobada', created_at
    from public.inscripciones_ingles
    on conflict (curso_id, cedula) do nothing;
  end if;
end $$;
alter table public.inscripciones_curso enable trigger trg_cupo_curso;

-- Inglés ya cerrado con 41 inscritos: ajusta sus cupos para reflejar lo real.
update public.cursos set max_registros = greatest(max_registros,
  (select count(*) from public.inscripciones_curso i where i.curso_id = cursos.id)),
  limite = greatest(limite, (select count(*) from public.inscripciones_curso i where i.curso_id = cursos.id))
where slug = 'ingles';
