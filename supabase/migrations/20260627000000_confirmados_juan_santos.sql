-- ════════════════════════════════════════════════════════════════════════
-- Carga masiva: 214 colegiados confirmados favorables por el Dirigente Juan Santos
-- Fuente: Listado IEM-CODIA-2025.xlsx  (2026-06-27)
-- Gestor: usuario con rol = 'dirigente' cuyo nombre contiene 'Juan Santos'
-- ════════════════════════════════════════════════════════════════════════

do $$
declare
  v_nombre_dirigente text;
  v_filas_actualizadas int;
begin
  -- Obtener el nombre exacto del dirigente Juan Santos desde profiles
  select nombre into v_nombre_dirigente
    from public.profiles
   where rol = 'dirigente'
     and lower(nombre) ilike '%juan%santos%'
   limit 1;

  if v_nombre_dirigente is null then
    -- Fallback: buscar sin restricción de rol (por si el usuario existe con otro rol)
    select nombre into v_nombre_dirigente
      from public.profiles
     where lower(nombre) ilike '%juan%santos%'
     limit 1;
  end if;

  if v_nombre_dirigente is null then
    raise exception 'No se encontró ningún usuario "Juan Santos" en profiles. Verifique que el usuario fue creado correctamente.';
  end if;

  raise notice 'Dirigente encontrado: %', v_nombre_dirigente;

  -- ── 1. Marcar los 214 colegiados como favorables bajo Juan Santos ────────────
  update public.padron
     set confirmado_por         = v_nombre_dirigente,
         confirmacion_intencion = 'favorable',
         confirmacion_at        = now()
   where codigo in (
     42254, 37058, 41098, 26233, 26071, 45667, 32099, 45867, 7044, 22382,
     44557, 34469, 33291, 31824, 36825, 44412, 46883, 34470, 39548, 22828,
     43479, 44556, 19151, 45792, 29632, 45799, 19820, 44047, 32741, 18172,
     41101, 41877, 21061, 42765, 45795, 43194, 11002, 35589, 35591, 25096,
     42243, 35090, 46089, 43768, 46882, 46092, 39004, 28736, 25373, 34196,
     42262, 42255, 26232, 25714, 41103, 45788, 42260, 31828, 35805, 19707,
     18600, 47424, 24266, 34199, 41100, 31409, 41524, 47243, 31825, 42258,
     45793, 42259, 3708, 2541, 39547, 15804, 39009, 41523, 28161, 47423,
     19702, 45669, 13154, 19083, 8681, 24599, 44555, 22994, 45418, 47664,
     32742, 44902, 42250, 42768, 39003, 43191, 23692, 32098, 9860, 25483,
     26698, 8901, 18229, 18598, 18384, 7062, 35643, 29976, 26700, 25845,
     44906, 36352, 4978, 18383, 42257, 41579, 36824, 41102, 43484, 45670,
     10260, 43980, 24801, 20843, 43769, 20228, 8914, 15019, 45865, 42265,
     40329, 8731, 43187, 22330, 42251, 36203, 32394, 42266, 42263, 45786,
     35593, 38426, 29447, 22825, 19360, 22517, 37521, 41725, 33667, 46868,
     44413, 33290, 39005, 6521, 22841, 40127, 45870, 42267, 44554, 44558,
     17454, 42773, 36202, 36082, 42767, 45421, 32746, 19703, 41690, 31823,
     11490, 22381, 21364, 18991, 39002, 44407, 37009, 16351, 35088, 27243,
     18521, 37054, 32749, 23117, 47665, 31410, 12804, 46558, 22830, 15336,
     36350, 11238, 16577, 20909, 32743, 30613, 10851, 16880, 38330, 33289,
     18599, 45797, 15202, 44408, 31821, 35595, 24021, 25943, 26521, 3662,
     32097, 32745, 45122, 7267
   );

  get diagnostics v_filas_actualizadas = row_count;
  raise notice 'Colegiados marcados como favorables: %', v_filas_actualizadas;

  -- ── 2. Registrar en deuda_historial los que tienen deuda > 0 ─────────────────
  -- Esto los hace visibles en el tab "Por regularizar" para que el presidente
  -- o gerente pueda procesar su regularización.
  insert into public.deuda_historial (codigo, monto_anterior, monto_nuevo, actualizado_por)
  select
    p.codigo,
    coalesce(p.monto_deuda, 0),
    coalesce(p.monto_deuda, 0),   -- monto se mantiene; solo registra el evento
    v_nombre_dirigente
  from public.padron p
  where p.codigo in (
     42254, 37058, 41098, 26233, 26071, 45667, 32099, 45867, 7044, 22382,
     44557, 34469, 33291, 31824, 36825, 44412, 46883, 34470, 39548, 22828,
     43479, 44556, 19151, 45792, 29632, 45799, 19820, 44047, 32741, 18172,
     41101, 41877, 21061, 42765, 45795, 43194, 11002, 35589, 35591, 25096,
     42243, 35090, 46089, 43768, 46882, 46092, 39004, 28736, 25373, 34196,
     42262, 42255, 26232, 25714, 41103, 45788, 42260, 31828, 35805, 19707,
     18600, 47424, 24266, 34199, 41100, 31409, 41524, 47243, 31825, 42258,
     45793, 42259, 3708, 2541, 39547, 15804, 39009, 41523, 28161, 47423,
     19702, 45669, 13154, 19083, 8681, 24599, 44555, 22994, 45418, 47664,
     32742, 44902, 42250, 42768, 39003, 43191, 23692, 32098, 9860, 25483,
     26698, 8901, 18229, 18598, 18384, 7062, 35643, 29976, 26700, 25845,
     44906, 36352, 4978, 18383, 42257, 41579, 36824, 41102, 43484, 45670,
     10260, 43980, 24801, 20843, 43769, 20228, 8914, 15019, 45865, 42265,
     40329, 8731, 43187, 22330, 42251, 36203, 32394, 42266, 42263, 45786,
     35593, 38426, 29447, 22825, 19360, 22517, 37521, 41725, 33667, 46868,
     44413, 33290, 39005, 6521, 22841, 40127, 45870, 42267, 44554, 44558,
     17454, 42773, 36202, 36082, 42767, 45421, 32746, 19703, 41690, 31823,
     11490, 22381, 21364, 18991, 39002, 44407, 37009, 16351, 35088, 27243,
     18521, 37054, 32749, 23117, 47665, 31410, 12804, 46558, 22830, 15336,
     36350, 11238, 16577, 20909, 32743, 30613, 10851, 16880, 38330, 33289,
     18599, 45797, 15202, 44408, 31821, 35595, 24021, 25943, 26521, 3662,
     32097, 32745, 45122, 7267
  )
  and coalesce(p.monto_deuda, 0) > 0;

  raise notice 'Registros en deuda_historial insertados para colegiados con deuda: %',
    (select count(*) from public.deuda_historial
      where actualizado_por = v_nombre_dirigente
        and monto_nuevo > 0
        and actualizado_en >= now() - interval '5 seconds');

  -- ── Resumen final ─────────────────────────────────────────────────────────────
  raise notice '=== RESUMEN ===';
  raise notice 'Total procesados del listado: 214';
  raise notice 'Encontrados en padron y actualizados: %', v_filas_actualizadas;
  raise notice 'No encontrados (diferencia): %', (214 - v_filas_actualizadas);
  raise notice 'Con deuda (aparecen en "Por regularizar" en el panel): %',
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
