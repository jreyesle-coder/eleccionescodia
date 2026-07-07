-- ════════════════════════════════════════════════════════════════════════
-- Carga masiva: 76 colegiados Arquitectos confirmados favorables por Silvio Garcia
-- Fuente: ARQUITECTOS.xlsx (2026-07-07)
-- Gestor: silviogarcia@eleccionescodia.app
-- Excluidos: Juan Pimentel y Pablo Luciano (sin código CODIA en el listado)
-- ════════════════════════════════════════════════════════════════════════

do $$
declare
  v_nombre_dirigente text;
  v_filas_actualizadas int;
begin
  -- Obtener el nombre exacto del dirigente Silvio Garcia desde profiles
  -- (el email vive en auth.users; profiles solo tiene id, nombre, rol)
  select p.nombre into v_nombre_dirigente
    from public.profiles p
    join auth.users u on u.id = p.id
   where lower(u.email) = 'silviogarcia@eleccionescodia.app'
   limit 1;

  if v_nombre_dirigente is null then
    -- Fallback: buscar por nombre
    select nombre into v_nombre_dirigente
      from public.profiles
     where lower(nombre) ilike '%silvio%garcia%'
     limit 1;
  end if;

  if v_nombre_dirigente is null then
    raise exception 'No se encontró el usuario silviogarcia@eleccionescodia.app en profiles. Verifique que el usuario fue creado correctamente.';
  end if;

  raise notice 'Dirigente encontrado: %', v_nombre_dirigente;

  -- ── 1. Marcar los 76 colegiados como favorables bajo Silvio Garcia ───────────
  update public.padron
     set confirmado_por         = v_nombre_dirigente,
         confirmacion_intencion = 'favorable',
         confirmacion_at        = now()
   where codigo in (
     9649, 10012, 11069, 11907, 12806, 12809, 12967, 13161, 13304, 13361,
     13662, 14095, 14195, 14197, 14198, 15335, 15917, 15941, 16120, 16831,
     17117, 17118, 17387, 17559, 18033, 19147, 19356, 19374, 20205, 20755,
     21498, 23196, 26056, 27304, 28167, 28669, 28670, 32856, 33535, 33660,
     33663, 33677, 34207, 34212, 34662, 34728, 35092, 35094, 36940, 37003,
     37348, 37577, 38317, 38940, 39130, 39184, 39186, 39334, 39345, 39778,
     41105, 41366, 41510, 42156, 42249, 42519, 42804, 43203, 43566, 44397,
     45855, 46245, 46575, 46681, 47653, 49264
   );

  get diagnostics v_filas_actualizadas = row_count;
  raise notice 'Colegiados marcados como favorables: %', v_filas_actualizadas;

  -- ── 2. Registrar en deuda_historial los que tienen deuda > 0 ─────────────────
  insert into public.deuda_historial (codigo, monto_anterior, monto_nuevo, actualizado_por)
  select
    p.codigo,
    coalesce(p.monto_deuda, 0),
    coalesce(p.monto_deuda, 0),
    v_nombre_dirigente
  from public.padron p
  where p.codigo in (
     9649, 10012, 11069, 11907, 12806, 12809, 12967, 13161, 13304, 13361,
     13662, 14095, 14195, 14197, 14198, 15335, 15917, 15941, 16120, 16831,
     17117, 17118, 17387, 17559, 18033, 19147, 19356, 19374, 20205, 20755,
     21498, 23196, 26056, 27304, 28167, 28669, 28670, 32856, 33535, 33660,
     33663, 33677, 34207, 34212, 34662, 34728, 35092, 35094, 36940, 37003,
     37348, 37577, 38317, 38940, 39130, 39184, 39186, 39334, 39345, 39778,
     41105, 41366, 41510, 42156, 42249, 42519, 42804, 43203, 43566, 44397,
     45855, 46245, 46575, 46681, 47653, 49264
  )
  and coalesce(p.monto_deuda, 0) > 0;

  -- ── Resumen final ─────────────────────────────────────────────────────────────
  raise notice '=== RESUMEN ===';
  raise notice 'Total en listado (con código CODIA): 76';
  raise notice 'Excluidos sin código CODIA: 2 (Juan Pimentel, Pablo Luciano)';
  raise notice 'Encontrados en padrón y actualizados: %', v_filas_actualizadas;
  raise notice 'No encontrados en padrón (diferencia): %', (76 - v_filas_actualizadas);
  raise notice 'Con deuda (visibles en "Por regularizar"): %',
    (select count(*) from public.padron
      where confirmado_por = v_nombre_dirigente
        and confirmacion_intencion = 'favorable'
        and coalesce(monto_deuda, 0) > 0);
  raise notice 'Sin deuda: %',
    (select count(*) from public.padron
      where confirmado_por = v_nombre_dirigente
        and confirmacion_intencion = 'favorable'
        and coalesce(monto_deuda, 0) = 0);

end;
$$;
