-- ════════════════════════════════════════════════════════════════════════
-- Inscripciones al Curso de Inglés (INFOTEP/CIFAL) — solo colegiados CODIA
--   · Tabla inscripciones_ingles (anon inserta; solo authenticated lee)
--   · Bucket de storage 'curso-ingles' (anon sube copia de cédula y título)
-- La validación de colegiatura se hace con el RPC existente buscar_colegiado.
-- ════════════════════════════════════════════════════════════════════════

-- RPC público: valida una cédula contra el padrón (por dígitos), devuelve
-- la colegiatura si existe. Accesible a anon para el formulario.
create or replace function public.validar_cedula_colegiado(p_cedula text)
returns table(codigo int, nombre_completo text, nucleo text, inhabilitado boolean)
language sql security definer set search_path = public stable as $$
  select codigo, nombre_completo, nucleo, coalesce(inhabilitado,false)
  from public.padron
  where regexp_replace(coalesce(cedula,''), '\D', '', 'g') = regexp_replace(coalesce(p_cedula,''), '\D', '', 'g')
    and length(regexp_replace(coalesce(p_cedula,''), '\D', '', 'g')) = 11
  limit 1;
$$;
grant execute on function public.validar_cedula_colegiado(text) to anon, authenticated;

create table if not exists public.inscripciones_ingles (
  id          uuid primary key default gen_random_uuid(),
  nombre      text not null,
  cedula      text not null,
  telefono    text,
  email       text,
  colegiatura int,
  nucleo      text,
  cedula_doc  text,   -- ruta en storage
  titulo_doc  text,   -- ruta en storage
  estado      text default 'recibida',
  created_at  timestamptz default now()
);

alter table public.inscripciones_ingles enable row level security;

-- El formulario público (anon) puede INSERTAR, no leer.
drop policy if exists insc_ingles_insert on public.inscripciones_ingles;
create policy insc_ingles_insert on public.inscripciones_ingles
  for insert to anon with check (true);

-- Lectura solo para usuarios autenticados (panel admin).
drop policy if exists insc_ingles_select on public.inscripciones_ingles;
create policy insc_ingles_select on public.inscripciones_ingles
  for select to authenticated using (true);

grant insert on public.inscripciones_ingles to anon;
grant select on public.inscripciones_ingles to authenticated;

-- ── Storage: bucket privado para los documentos ─────────────────────────────
insert into storage.buckets (id, name, public)
values ('curso-ingles', 'curso-ingles', false)
on conflict (id) do nothing;

-- anon puede subir (insert) a ese bucket; la lectura queda restringida.
drop policy if exists "curso ingles anon upload" on storage.objects;
create policy "curso ingles anon upload" on storage.objects
  for insert to anon with check (bucket_id = 'curso-ingles');

drop policy if exists "curso ingles auth read" on storage.objects;
create policy "curso ingles auth read" on storage.objects
  for select to authenticated using (bucket_id = 'curso-ingles');
