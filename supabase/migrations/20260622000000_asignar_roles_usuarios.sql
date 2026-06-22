-- ════════════════════════════════════════════════════════════════════════
-- Asignación de roles — 22 jun 2026
--
-- 1. silviogarcia@eleccionescodia.app   → gerente, nucleo ARQUITECTOS
-- 2. jaquelineabinader@eleccionescodia.app → gerente, nucleo ARQUITECTOS
-- 3. marcopena@eleccionescodia.app      → gerente, sin nucleo (call center completo)
-- 4. gregoryperez@eleccionescodia.app   → dirigente, regional SURESTE (SAN PEDRO)
--
-- NOTA: El valor de nucleo_asignado debe coincidir exactamente con padron.nucleo.
--       Verificar con: select distinct nucleo from padron where nucleo ilike '%arquit%';
-- ════════════════════════════════════════════════════════════════════════

-- ── 1 & 2. Gerentes CDN Arquitectos ─────────────────────────────────────────
update public.profiles
   set rol = 'gerente',
       nucleo_asignado = 'ARQUITECTOS'
 where id in (
   select id from auth.users
    where email in (
      'silviogarcia@eleccionescodia.app',
      'jaquelineabinader@eleccionescodia.app'
    )
 );

-- ── 3. Gerente Centro de Llamadas (padrón completo, sin filtro de núcleo) ────
update public.profiles
   set rol = 'gerente',
       nucleo_asignado = null
 where id = (
   select id from auth.users
    where email = 'marcopena@eleccionescodia.app'
 );

-- ── 4. Dirigente San Pedro de Macorís ────────────────────────────────────────
update public.profiles
   set rol = 'dirigente',
       regional_asignada = 'REGIONAL SURESTE (SAN PEDRO M.)'
 where id = (
   select id from auth.users
    where email = 'gregoryperez@eleccionescodia.app'
 );

-- ── Verificación ─────────────────────────────────────────────────────────────
select u.email, p.rol, p.nucleo_asignado, p.regional_asignada, p.activo
  from public.profiles p
  join auth.users u on u.id = p.id
 where u.email in (
   'silviogarcia@eleccionescodia.app',
   'jaquelineabinader@eleccionescodia.app',
   'marcopena@eleccionescodia.app',
   'gregoryperez@eleccionescodia.app'
 );
