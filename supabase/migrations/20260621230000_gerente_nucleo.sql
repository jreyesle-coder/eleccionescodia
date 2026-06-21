-- ════════════════════════════════════════════════════════════════════════
-- Perfil de Gerente de Núcleo
-- 1. Agrega nucleo_asignado a profiles
-- 2. Helper mi_nucleo_asignado() — devuelve el núcleo del usuario actual
-- 3. stats_mi_nucleo() — stats_nucleos filtrado al núcleo del gerente
--
-- DESPUÉS DE EJECUTAR ESTA MIGRACIÓN:
--   a) Invitar al usuario desde Supabase Dashboard → Authentication → Invite user
--      Email: juanroberto@eleccionescodia.app
--   b) Una vez creado su perfil automáticamente, ejecutar:
--        update public.profiles
--           set rol = 'gerente', nucleo_asignado = 'AGRIMENSORES'
--         where id = (select id from auth.users where email = 'juanroberto@eleccionescodia.app');
-- ════════════════════════════════════════════════════════════════════════

-- ── 1. nucleo_asignado en profiles ───────────────────────────────────────────
alter table public.profiles add column if not exists nucleo_asignado text;

-- ── 2. mi_nucleo_asignado() ───────────────────────────────────────────────────
drop function if exists public.mi_nucleo_asignado();
create or replace function public.mi_nucleo_asignado()
returns text
language sql security definer stable set search_path = public as $$
  select nucleo_asignado from public.profiles where id = auth.uid()
$$;
grant execute on function public.mi_nucleo_asignado() to authenticated;

-- ── 3. stats_mi_nucleo() — igual que stats_nucleos pero solo el núcleo del gerente
drop function if exists public.stats_mi_nucleo();
create or replace function public.stats_mi_nucleo()
returns table (
  nucleo                 text,
  carrera_nombre         text,
  total                  bigint,
  confirmados            bigint,
  confirmados_callcenter bigint,
  confirmados_verificate bigint,
  confirmados_dirigente  bigint
)
language sql security definer stable set search_path = public as $$
  select * from public.stats_nucleos()
   where nucleo = public.mi_nucleo_asignado()
$$;
grant execute on function public.stats_mi_nucleo() to authenticated;
