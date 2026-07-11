-- ─────────────────────────────────────────────────────────────────────────────
-- Cargar colegiados (ARQUITECTOS) como CONFIRMADOS por el dirigente Silvio García
-- Fuente: ARQUITECTOS (1).xlsx  ·  76 colegiados únicos (columna "Codia")
--
-- Cómo funciona la confirmación por dirigente en la app (tabla padron):
--   confirmado_por         = nombre del perfil del dirigente (texto)
--   confirmacion_intencion = 'favorable'   (esto es lo que hace via_dirigente = true)
--   confirmacion_at        = timestamp
-- padron.codigo es INTEGER, por eso la lista va sin comillas.
-- ─────────────────────────────────────────────────────────────────────────────

-- PASO 1 (VERIFICAR): confirma que exista UN solo perfil para Silvio García
-- Ejecuta esto primero y revisa el resultado antes de correr el UPDATE.
select id, nombre, rol
from public.profiles
where nombre ilike '%silvio%garc%a%';

-- PASO 2 (VERIFICAR): cuántos de los códigos existen en el padrón
select count(*) as codigos_encontrados
from public.padron
where codigo in (
  19147, 42249, 33677, 34207, 21498, 12967, 23196, 16120, 14198, 14197, 49264, 17118,
  34212, 27304, 18033, 47653, 17117, 19374, 13304, 20205, 17387, 17559, 9649, 16831,
  10012, 13662, 15917, 26056, 12809, 28167, 33535, 37348, 19356, 28670, 12806, 39186,
  37577, 32856, 44397, 39334, 42156, 39130, 15941, 14095, 39345, 39778, 38940, 11907,
  15335, 13361, 43566, 28669, 41366, 35094, 36940, 46681, 34728, 33660, 35092, 33663,
  46245, 43203, 39184, 46575, 38317, 41105, 42804, 41510, 42519, 45855, 14195, 13161,
  20755, 37003, 34662, 11069
);

-- PASO 3 (APLICAR): marca los 76 como confirmados-favorables por Silvio García.
-- El nombre se toma del propio perfil para que coincida exactamente con lo que
-- muestran los dashboards (que agrupan por confirmado_por).
update public.padron
set confirmado_por         = (
      select nombre from public.profiles
      where nombre ilike '%silvio%garc%a%'
      limit 1
    ),
    confirmacion_intencion = 'favorable',
    confirmacion_at        = now()
where codigo in (
  19147, 42249, 33677, 34207, 21498, 12967, 23196, 16120, 14198, 14197, 49264, 17118,
  34212, 27304, 18033, 47653, 17117, 19374, 13304, 20205, 17387, 17559, 9649, 16831,
  10012, 13662, 15917, 26056, 12809, 28167, 33535, 37348, 19356, 28670, 12806, 39186,
  37577, 32856, 44397, 39334, 42156, 39130, 15941, 14095, 39345, 39778, 38940, 11907,
  15335, 13361, 43566, 28669, 41366, 35094, 36940, 46681, 34728, 33660, 35092, 33663,
  46245, 43203, 39184, 46575, 38317, 41105, 42804, 41510, 42519, 45855, 14195, 13161,
  20755, 37003, 34662, 11069
);

-- PASO 4 (VERIFICAR): revisa el resultado
select confirmado_por, count(*) as confirmados
from public.padron
where confirmacion_intencion = 'favorable'
  and confirmado_por ilike '%silvio%garc%a%'
group by confirmado_por;
