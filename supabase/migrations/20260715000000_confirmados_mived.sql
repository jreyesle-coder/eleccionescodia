-- ════════════════════════════════════════════════════════════════════════
-- Carga masiva: 53 colegiados confirmados favorables por el usuario MIVED
-- Gestor: mived@eleccionescodia.app
-- Fecha: 2026-07-15
-- ════════════════════════════════════════════════════════════════════════

do $$
declare
  v_nombre_dirigente text;
  v_filas_actualizadas int;
begin
  -- Obtener el nombre exacto del gestor desde profiles
  -- (el email vive en auth.users; profiles solo tiene id, nombre, rol)
  select p.nombre into v_nombre_dirigente
    from public.profiles p
    join auth.users u on u.id = p.id
   where lower(u.email) = 'mived@eleccionescodia.app'
   limit 1;

  if v_nombre_dirigente is null then
    raise exception 'No se encontró el usuario mived@eleccionescodia.app en profiles. Verifique que el usuario fue creado correctamente.';
  end if;

  raise notice 'Gestor encontrado: %', v_nombre_dirigente;

  -- ── 1. Marcar los 53 colegiados como favorables bajo MIVED ───────────────────
  update public.padron
     set confirmado_por         = v_nombre_dirigente,
         confirmacion_intencion = 'favorable',
         confirmacion_at        = now()
   where codigo in (
     33541, 38868, 5096, 44319, 47683, 40153, 45743, 39749, 35576, 41638,
     29852, 41781, 46404, 18147, 32876, 49438, 45605, 50266, 29411, 33356,
     35108, 50226, 50423, 48008, 11912, 48202, 16294, 35502, 22670, 36933,
     48687, 22745, 13672, 12788, 19474, 48984, 27224, 44150, 25455, 33802,
     46222, 35185, 31158, 48811, 21527, 42404, 26618, 11811, 27884, 19930,
     47095, 19281, 14585
   );

  get diagnostics v_filas_actualizadas = row_count;
  raise notice 'Colegiados marcados como favorables: %', v_filas_actualizadas;

  -- ── 2. Registrar en deuda_historial los que tienen deuda > 0 ─────────────────
  -- Los hace visibles en el tab "Por regularizar".
  insert into public.deuda_historial (codigo, monto_anterior, monto_nuevo, actualizado_por)
  select
    p.codigo,
    coalesce(p.monto_deuda, 0),
    coalesce(p.monto_deuda, 0),
    v_nombre_dirigente
  from public.padron p
  where p.codigo in (
     33541, 38868, 5096, 44319, 47683, 40153, 45743, 39749, 35576, 41638,
     29852, 41781, 46404, 18147, 32876, 49438, 45605, 50266, 29411, 33356,
     35108, 50226, 50423, 48008, 11912, 48202, 16294, 35502, 22670, 36933,
     48687, 22745, 13672, 12788, 19474, 48984, 27224, 44150, 25455, 33802,
     46222, 35185, 31158, 48811, 21527, 42404, 26618, 11811, 27884, 19930,
     47095, 19281, 14585
  )
  and coalesce(p.monto_deuda, 0) > 0;

  -- ── Resumen final ─────────────────────────────────────────────────────────────
  raise notice '=== RESUMEN ===';
  raise notice 'Total en listado: 53';
  raise notice 'Encontrados en padrón y actualizados: %', v_filas_actualizadas;
  raise notice 'No encontrados en padrón (diferencia): %', (53 - v_filas_actualizadas);
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
