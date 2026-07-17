-- ════════════════════════════════════════════════════════════════════════
-- PASO 1 — Verificación previa a la carga del listado de Thania Rodríguez
-- Fuente: "Listado de Thania Rodriguez (CODIA 2026).pdf" (26 colegiados;
--         25 con colegiatura + MANUEL MENA sin número).
-- Correr en el SQL Editor de Supabase (service_role).
--
-- Devuelve 3 bloques. Revisa los tres ANTES de correr la migración de carga.
-- ════════════════════════════════════════════════════════════════════════

-- ── (A) ¿Existe la dirigente y cómo está configurada? ───────────────────────
-- La carga se hace por profiles.nombre, así que el nombre debe existir.
-- El panel /dirigente además filtra por profiles.regional_asignada.
select
  'A. USUARIA' as bloque,
  u.email,
  p.id,
  p.nombre,
  p.rol,
  p.regional_asignada,
  p.mesa
from auth.users u
left join public.profiles p on p.id = u.id
where lower(u.email) = 'thaniarodriguez@eleccionescodia.app';


-- ── (B) Los 25 códigos del listado: ¿existen en el padrón? ──────────────────
-- Compara nombre_completo contra el nombre del PDF para detectar códigos
-- mal transcritos. Ojo con 'ya_confirmado_por': si no es null, ese colegiado
-- ya está cargado bajo otro dirigente y la carga lo reasignaría.
with listado(codigo, nombre_pdf) as (values
  (17878, 'THANIA RODRIGUEZ'),
  (21990, 'ANTONIO ECHAVARRIA'),
  ( 3345, 'FRANCISCO LARA'),
  ( 8383, 'GUILLERMO PEREZ'),
  ( 5572, 'MILTON GARCIA'),
  (42432, 'MARBER PEÑA SOTO'),
  (12619, 'LICELOT PEÑA SOTO'),
  (21294, 'WALKIDIA DE OLEO'),
  (22763, 'NELSY MORALES'),
  (29156, 'ROXANNA SANCHEZ'),
  (16866, 'KELLY VASQUEZ'),
  (19319, 'DOLORES LOCADIO'),
  (18319, 'JOSE MENA'),
  (24342, 'DIANA POLANCO'),
  (21409, 'ALEX SEGURA'),
  (23657, 'SHEILA MEDINA'),
  (32849, 'ESTEBANIA SALCEDO'),
  (45244, 'LEONOR OJEDA'),
  (35851, 'RAFAEL REYES'),
  (33981, 'JOHAN HEREDIA'),
  (40529, 'MIGUEL MOLINA'),
  (31966, 'HELDER CEBALLOS'),
  (24555, 'KELVIN POLANCO'),
  (34670, 'VICTOR DE LA CRUZ'),
  (41394, 'LUIS ENCARNACION')
)
select
  'B. LISTADO' as bloque,
  count(*) over ()                      as total_filas,
  l.codigo,
  l.nombre_pdf,
  p.nombre_completo                     as nombre_padron,
  case when p.codigo is null then 'NO EXISTE EN PADRON' else 'ok' end as estado,
  p.cedula,
  p.nucleo,
  p.regional,
  p.provincia,
  p.centro_votacion,
  coalesce(p.monto_deuda, 0)            as monto_deuda,
  p.votante_habilitado,
  p.confirmado_por                      as ya_confirmado_por,
  p.confirmacion_intencion
from listado l
left join public.padron p on p.codigo = l.codigo
order by estado desc, l.codigo;


-- ── (C) MANUEL MENA — viene sin colegiatura en el PDF ───────────────────────
-- Probablemente pariente de JOSE MENA (#18319). Identifica cuál es y agrega
-- su código a la migración de carga.
select
  'C. MANUEL MENA' as bloque,
  count(*) over () as total_filas,
  p.codigo,
  p.nombre_completo,
  p.cedula,
  p.nucleo,
  p.regional,
  p.provincia,
  coalesce(p.telefono, p.celular) as contacto,
  coalesce(p.monto_deuda, 0)      as monto_deuda,
  p.confirmado_por
from public.padron p
where lower(p.nombre_completo) ilike '%manuel%mena%'
order by p.nombre_completo;
