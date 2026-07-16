-- ════════════════════════════════════════════════════════════════════════
-- Carga: colegiados de un listado, que TENGAN deuda > 0, marcados como
-- confirmados favorables bajo el PRESIDENTE + registrados en "Por regularizar".
-- Fecha: 2026-07-15
-- Fuente: listado de 40 códigos provisto por el presidente.
-- ════════════════════════════════════════════════════════════════════════

do $$
declare
  v_nombre_presidente text;
  v_confirmados int;
  v_en_historial int;
begin
  -- Nombre del usuario con rol presidente
  select nombre into v_nombre_presidente
    from public.profiles
   where rol = 'presidente'
   order by nombre
   limit 1;

  if v_nombre_presidente is null then
    raise exception 'No se encontró ningún usuario con rol = presidente en profiles.';
  end if;

  raise notice 'Presidente encontrado: %', v_nombre_presidente;

  -- ── 1. Marcar como favorables SOLO los que existen y tienen deuda > 0 ────────
  update public.padron p
     set confirmado_por         = v_nombre_presidente,
         confirmacion_intencion = 'favorable',
         confirmacion_at        = now()
   where p.codigo in (
     135, 1416, 1489, 2051, 2730, 3234, 4000, 4001, 4771, 5013,
     5132, 5314, 6046, 7919, 9610, 10642, 11030, 17382, 18664, 19342,
     19863, 22173, 22384, 23774, 26495, 29876, 32914, 33130, 34697, 35073,
     40240, 40930, 48464, 49130, 54482, 64705, 70810, 85043, 89783, 94505
   )
   and coalesce(p.monto_deuda, 0) > 0;

  get diagnostics v_confirmados = row_count;
  raise notice 'Colegiados con deuda marcados como favorables: %', v_confirmados;

  -- ── 2. Registrar en deuda_historial (los hace visibles en "Por regularizar") ─
  insert into public.deuda_historial (codigo, monto_anterior, monto_nuevo, actualizado_por)
  select
    p.codigo,
    coalesce(p.monto_deuda, 0),
    coalesce(p.monto_deuda, 0),
    v_nombre_presidente
  from public.padron p
  where p.codigo in (
     135, 1416, 1489, 2051, 2730, 3234, 4000, 4001, 4771, 5013,
     5132, 5314, 6046, 7919, 9610, 10642, 11030, 17382, 18664, 19342,
     19863, 22173, 22384, 23774, 26495, 29876, 32914, 33130, 34697, 35073,
     40240, 40930, 48464, 49130, 54482, 64705, 70810, 85043, 89783, 94505
  )
  and coalesce(p.monto_deuda, 0) > 0;

  get diagnostics v_en_historial = row_count;

  -- ── Resumen ───────────────────────────────────────────────────────────────
  raise notice '=== RESUMEN ===';
  raise notice 'Total en listado: 40';
  raise notice 'Marcados como confirmados (con deuda > 0): %', v_confirmados;
  raise notice 'Registrados en deuda_historial: %', v_en_historial;
  raise notice 'Sin deuda o no encontrados (no tocados): %', (40 - v_confirmados);
end;
$$;
