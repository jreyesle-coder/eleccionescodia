-- ════════════════════════════════════════════════════════════════════════════
-- RESET PRODUCCIÓN — CODIA Elecciones 2026
-- Limpia TODOS los datos de gestión. El padrón de colegiados se conserva.
-- Los usuarios (auth.users / profiles) se conservan.
-- Ejecutar en Supabase SQL Editor.
-- ════════════════════════════════════════════════════════════════════════════

-- ── 1. Vaciar tablas de operación ────────────────────────────────────────────
truncate table public.llamadas         restart identity cascade;
truncate table public.votos_dia        restart identity cascade;
truncate table public.deudas_votantes  restart identity cascade;
truncate table public.deuda_historial  restart identity cascade;

-- ── 2. Resetear campos de gestión en el padrón ───────────────────────────────
-- Se ponen a NULL / valores iniciales todos los campos que acumula el sistema.
-- La columna monto_deuda se pone a NULL (no se conoce aún).
update public.padron set
  estado_gestion          = 'pendiente',
  asignado_a              = null,
  bloqueado_hasta         = null,
  intentos_no_contesta    = 0,
  simpatiza_verificate    = null,
  voto_verificate_at      = null,
  confirmado_por          = null,
  confirmacion_intencion  = null,
  confirmacion_at         = null,
  monto_deuda             = null;

-- ════════════════════════════════════════════════════════════════════════════
-- Verificación rápida (ejecutar después para confirmar):
--
--   select count(*) from public.llamadas;        -- debe ser 0
--   select count(*) from public.votos_dia;       -- debe ser 0
--   select count(*) from public.deudas_votantes; -- debe ser 0
--   select count(*) from public.deuda_historial; -- debe ser 0
--   select estado_gestion, count(*) from public.padron group by 1;
--   -- debe mostrar solo 'pendiente' con el total de colegiados
-- ════════════════════════════════════════════════════════════════════════════
