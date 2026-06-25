-- ════════════════════════════════════════════════════════════════════════
-- Índices para mejorar performance de consultas de padrón
-- ════════════════════════════════════════════════════════════════════════

-- Necesario para índice GIN en búsquedas ILIKE por nombre
create extension if not exists pg_trgm;

-- Lookup de deuda por colegiatura (el EXISTS corre una vez por fila del padrón)
create index if not exists idx_deudas_votantes_codigo
  on public.deudas_votantes(codigo);

-- Filtros por regional y núcleo en el padrón
create index if not exists idx_padron_regional
  on public.padron(regional);

create index if not exists idx_padron_nucleo
  on public.padron(nucleo);

-- Búsqueda ILIKE por nombre (tokens)
create index if not exists idx_padron_nombre_trgm
  on public.padron using gin(nombre_completo gin_trgm_ops);
