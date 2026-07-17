-- ════════════════════════════════════════════════════════════════════════
-- Carga del listado de la Dirigente Thania Rodríguez (25 colegiados)
-- Fuente: "Listado de Thania Rodriguez (CODIA 2026).pdf" — 2026-07-16
-- Usuaria: thaniarodriguez@eleccionescodia.app
--
-- REQUISITOS ANTES DE CORRER:
--   1) La usuaria debe existir en auth.users con rol 'dirigente' en profiles.
--      Verificar con scripts/ubicar_colegiados_thania.sql (bloque A).
--   2) MANUEL MENA viene sin colegiatura en el PDF → resolver su código con
--      el bloque C de ese mismo script y agregarlo abajo.
--
-- Idempotente: correrlo dos veces deja el mismo resultado.
-- ════════════════════════════════════════════════════════════════════════

do $$
declare
  v_email     constant text := 'thaniarodriguez@eleccionescodia.app';
  v_codigos   constant int[] := array[
    17878,  -- THANIA RODRIGUEZ (ella misma)
    21990,  -- ANTONIO ECHAVARRIA
     3345,  -- FRANCISCO LARA (65 años)
     8383,  -- GUILLERMO PEREZ (65 años)
     5572,  -- MILTON GARCIA (65 años)
    42432,  -- MARBER PEÑA SOTO
    12619,  -- LICELOT PEÑA SOTO
    21294,  -- WALKIDIA DE OLEO
    22763,  -- NELSY MORALES
    29156,  -- ROXANNA SANCHEZ
    16866,  -- KELLY VASQUEZ
    19319,  -- DOLORES LOCADIO
    18319,  -- JOSE MENA
    24342,  -- DIANA POLANCO
    21409,  -- ALEX SEGURA
    23657,  -- SHEILA MEDINA
    32849,  -- ESTEBANIA SALCEDO
    45244,  -- LEONOR OJEDA
    35851,  -- RAFAEL REYES
    33981,  -- JOHAN HEREDIA
    40529,  -- MIGUEL MOLINA
    31966,  -- HELDER CEBALLOS
    24555,  -- KELVIN POLANCO
    34670,  -- VICTOR DE LA CRUZ
    41394   -- LUIS ENCARNACION
    -- , ?????  -- MANUEL MENA: sin colegiatura en el PDF; resolver y agregar aquí
  ];
  v_id        uuid;
  v_nombre    text;
  v_rol       text;
  v_regional  text;
  v_actualizados int;
  v_historial    int;
begin
  -- ── 0. Resolver la dirigente por email ────────────────────────────────────
  select p.id, p.nombre, p.rol, p.regional_asignada
    into v_id, v_nombre, v_rol, v_regional
    from auth.users u
    join public.profiles p on p.id = u.id
   where lower(u.email) = v_email;

  if v_id is null then
    raise exception 'No existe un perfil para %. Crea la usuaria en Supabase (Authentication → Users) y su fila en profiles antes de correr esta migración.', v_email;
  end if;

  if v_rol is distinct from 'dirigente' then
    raise exception 'El perfil de % tiene rol "%" y debe ser "dirigente" para que vea su panel en /dirigente.', v_email, v_rol;
  end if;

  raise notice 'Dirigente: % (id %) — regional asignada: %', v_nombre, v_id, coalesce(v_regional, '(ninguna)');

  if v_regional is null then
    raise warning 'La dirigente no tiene regional_asignada. El panel /dirigente filtra por regional: sin este valor no podra buscar colegiados aunque queden cargados.';
  end if;

  -- ── 1. Avisar de los códigos que no existen en el padrón ──────────────────
  raise notice 'Codigos del listado que NO existen en padron: %',
    coalesce((
      select string_agg(c::text, ', ' order by c)
        from unnest(v_codigos) c
       where not exists (select 1 from public.padron p where p.codigo = c)
    ), '(ninguno)');

  -- ── 2. Avisar de los que ya estaban cargados bajo OTRO dirigente ──────────
  raise notice 'Ya confirmados por otra persona (seran reasignados a %): %',
    v_nombre,
    coalesce((
      select string_agg(p.codigo || ' → ' || p.confirmado_por, ', ' order by p.codigo)
        from public.padron p
       where p.codigo = any(v_codigos)
         and p.confirmado_por is not null
         and p.confirmado_por <> v_nombre
    ), '(ninguno)');

  -- ── 3. Cargar el listado bajo la dirigente ────────────────────────────────
  update public.padron p
     set confirmado_por         = v_nombre,
         confirmacion_intencion = 'favorable',
         confirmacion_at        = now()
   where p.codigo = any(v_codigos);

  get diagnostics v_actualizados = row_count;
  raise notice 'Colegiados cargados bajo %: %', v_nombre, v_actualizados;

  -- ── 4. Registrar en deuda_historial los que tienen deuda > 0 ──────────────
  -- Los hace visibles en el tab "Por regularizar" del panel.
  insert into public.deuda_historial (codigo, monto_anterior, monto_nuevo, actualizado_por)
  select p.codigo, coalesce(p.monto_deuda, 0), coalesce(p.monto_deuda, 0), v_nombre
    from public.padron p
   where p.codigo = any(v_codigos)
     and coalesce(p.monto_deuda, 0) > 0;

  get diagnostics v_historial = row_count;

  -- ── Resumen ───────────────────────────────────────────────────────────────
  raise notice '=== RESUMEN ===';
  raise notice 'Total en el listado (PDF)   : % (+ MANUEL MENA sin colegiatura)', array_length(v_codigos, 1);
  raise notice 'Encontrados y cargados      : %', v_actualizados;
  raise notice 'No encontrados en padron    : %', array_length(v_codigos, 1) - v_actualizados;
  raise notice 'Con deuda (Por regularizar) : %', v_historial;
  raise notice 'Sin deuda                   : %',
    (select count(*) from public.padron
      where codigo = any(v_codigos) and coalesce(monto_deuda, 0) = 0);
end;
$$;
