-- ════════════════════════════════════════════════════════════════════════════
-- CODIA · SCRIPT CONSOLIDADO — DÍA DE ELECCIÓN + CATÁLOGO DE MESAS
-- ════════════════════════════════════════════════════════════════════════════
-- Seguro de correr en la base EN VIVO: todo es idempotente
-- (add column if not exists / create or replace / drop if exists / create table
--  if not exists). NO borra datos, NO hace truncate. Re-ejecutable sin daño.
--
-- Cómo usar: Supabase Dashboard → SQL Editor → pegar todo → Run.
-- Al final: Dashboard → Database → Replication → habilitar Realtime en votos_dia.
-- ════════════════════════════════════════════════════════════════════════════

begin;

-- ══════════════════════════════════════════════════════════════════════════════
-- 1. COLUMNAS BASE
-- ══════════════════════════════════════════════════════════════════════════════

-- Mesa asignada al delegado/suplente (guarda el numero de mesa, 1..42, como texto)
alter table public.profiles
  add column if not exists mesa text;

-- Marca si el votante registrado es simpatizante nuestro (cruce con confirmados)
alter table public.votos_dia
  add column if not exists es_simpatizante boolean not null default false;

-- ══════════════════════════════════════════════════════════════════════════════
-- 2. RLS DE votos_dia
-- ══════════════════════════════════════════════════════════════════════════════
alter table public.votos_dia enable row level security;
drop policy if exists "votos_dia_select_auth" on public.votos_dia;
drop policy if exists "votos_dia_insert_auth" on public.votos_dia;

create policy "votos_dia_select_auth" on public.votos_dia
  for select to authenticated using (true);

-- registrado_por es TEXT; auth.uid() es UUID → cast ::text
create policy "votos_dia_insert_auth" on public.votos_dia
  for insert to authenticated
  with check (registrado_por = auth.uid()::text);

-- ══════════════════════════════════════════════════════════════════════════════
-- 3. VISTAS DE ALERTA (doble voto / no habilitado)
-- ══════════════════════════════════════════════════════════════════════════════
drop view if exists public.v_alerta_doble_voto cascade;
create view public.v_alerta_doble_voto as
  select
    v.codigo,
    ( select nombre_completo from public.padron p2
        where p2.codigo = v.codigo limit 1 ) as nombre_completo,
    count(*)                                         as mesas,
    string_agg(v.mesa, ', ' order by v.created_at)  as lista_mesas
  from public.votos_dia v
  group by v.codigo
  having count(*) > 1;

drop view if exists public.v_alerta_no_habilitado cascade;
create view public.v_alerta_no_habilitado as
  select
    v.codigo,
    ( select nombre_completo from public.padron p2
        where p2.codigo = v.codigo limit 1 ) as nombre_completo,
    v.mesa,
    v.registrado_por,
    v.created_at
  from public.votos_dia v
  where v.estaba_habilitado = false;

-- ══════════════════════════════════════════════════════════════════════════════
-- 4. RPC registrar_voto_dia — el delegado registra quién entró a votar
--    Cruza con padron: es_simpatizante = confirmacion_intencion='favorable'
--    o simpatiza_verificate. Acepta código de colegiatura o cédula.
-- ══════════════════════════════════════════════════════════════════════════════
drop function if exists public.registrar_voto_dia(text);
create or replace function public.registrar_voto_dia(p_codigo text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_mesa           text;
  v_habilitado     boolean;
  v_simpatizante   boolean;
  v_rol            text;
  v_codigo_int     integer;
begin
  select rol, mesa into v_rol, v_mesa
    from public.profiles
   where id = auth.uid();

  if v_rol not in ('delegado','suplente','supervisor','gerente','presidente') then
    return jsonb_build_object('ok', false, 'error', 'Sin permisos para registrar votos');
  end if;

  if v_mesa is null and v_rol in ('delegado','suplente') then
    return jsonb_build_object('ok', false, 'error', 'No tienes mesa asignada');
  end if;

  select
    codigo,
    votante_habilitado,
    (coalesce(simpatiza_verificate, false) or confirmacion_intencion = 'favorable')
  into v_codigo_int, v_habilitado, v_simpatizante
    from public.padron
   where codigo::text = p_codigo
      or cedula = p_codigo
   limit 1;

  if v_codigo_int is null then
    return jsonb_build_object('ok', false, 'error', 'Colegiado no encontrado');
  end if;

  insert into public.votos_dia (codigo, mesa, registrado_por, estaba_habilitado, es_simpatizante)
  values (
    v_codigo_int,
    v_mesa,
    auth.uid()::text,
    coalesce(v_habilitado, false),
    coalesce(v_simpatizante, false)
  );

  return jsonb_build_object(
    'ok',           true,
    'habilitado',   coalesce(v_habilitado, false),
    'simpatizante', coalesce(v_simpatizante, false),
    'mesa',         v_mesa
  );
end;
$$;
grant execute on function public.registrar_voto_dia(text) to authenticated;

-- ══════════════════════════════════════════════════════════════════════════════
-- 5. RPC conteo_votos_dia — tendencia en tiempo real (presidente)
-- ══════════════════════════════════════════════════════════════════════════════
drop function if exists public.conteo_votos_dia();
create or replace function public.conteo_votos_dia()
returns table (
  total_votos          bigint,
  a_favor              bigint,
  no_a_favor           bigint,
  por_regional         jsonb,
  alertas_doble        bigint,
  alertas_nohabilitado bigint
)
language sql security definer stable set search_path = public as $$
  select
    (select count(*) from public.votos_dia) as total_votos,
    (select count(*) from public.votos_dia where es_simpatizante = true)  as a_favor,
    (select count(*) from public.votos_dia where es_simpatizante = false) as no_a_favor,
    (
      select jsonb_object_agg(regional, datos)
        from (
          select
            coalesce(p.regional, 'Sin regional') as regional,
            jsonb_build_object(
              'a_favor',    count(*) filter (where v.es_simpatizante = true),
              'no_a_favor', count(*) filter (where v.es_simpatizante = false),
              'total',      count(*)
            ) as datos
          from public.votos_dia v
          join public.padron p on p.codigo = v.codigo
         group by p.regional
        ) x
    ) as por_regional,
    (select count(*) from public.v_alerta_doble_voto)    as alertas_doble,
    (select count(*) from public.v_alerta_no_habilitado) as alertas_nohabilitado;
$$;
grant execute on function public.conteo_votos_dia() to authenticated;

-- ══════════════════════════════════════════════════════════════════════════════
-- 6. CATÁLOGO DE MESAS — 38 lugares / 42 mesas
-- ══════════════════════════════════════════════════════════════════════════════
create table if not exists public.mesas (
  numero         integer primary key,
  lugar          text not null,
  mesa_en_lugar  integer not null default 1,
  etiqueta       text not null
);

alter table public.mesas enable row level security;
drop policy if exists "mesas_select_auth" on public.mesas;
create policy "mesas_select_auth" on public.mesas
  for select to authenticated using (true);

insert into public.mesas (numero, lugar, mesa_en_lugar, etiqueta) values
  ( 1, 'MOPC - SEDE CENTRAL',                             1, 'MOPC - Sede Central · Mesa 1'),
  ( 2, 'MOPC - SEDE CENTRAL',                             2, 'MOPC - Sede Central · Mesa 2'),
  ( 3, 'MOPC - SEDE CENTRAL',                             3, 'MOPC - Sede Central · Mesa 3'),
  ( 4, 'EGEHID',                                          1, 'EGEHID'),
  ( 5, 'MINISTERIO DE AGRICULTURA',                       1, 'Ministerio de Agricultura'),
  ( 6, 'INDRHI',                                          1, 'INDRHI'),
  ( 7, 'DIRECCIÓN DE INFRAESTRUCTURA ESCOLAR',            1, 'Dirección de Infraestructura Escolar'),
  ( 8, 'DELEGACIÓN PROVINCIA SANTO DOMINGO',              1, 'Delegación Provincia Santo Domingo · Mesa 1'),
  ( 9, 'DELEGACIÓN PROVINCIA SANTO DOMINGO',              2, 'Delegación Provincia Santo Domingo · Mesa 2'),
  (10, 'DELEGACIÓN PROVINCIA SANTO DOMINGO',              3, 'Delegación Provincia Santo Domingo · Mesa 3'),
  (11, 'NÚCLEO DE TRABAJO SANTO DOMINGO NORTE',           1, 'Núcleo Santo Domingo Norte'),
  (12, 'NÚCLEO DE TRABAJO SANTO DOMINGO OESTE',           1, 'Núcleo Santo Domingo Oeste'),
  (13, 'NÚCLEO DE TRABAJO BOCA CHICA',                    1, 'Núcleo Boca Chica'),
  (14, 'REGIONAL NOR-ATLÁNTICA PUERTO PLATA',             1, 'Regional Nor-Atlántica (Puerto Plata)'),
  (15, 'DELEGACIÓN DAJABÓN',                              1, 'Delegación Dajabón'),
  (16, 'DELEGACIÓN MONTECRISTI',                          1, 'Delegación Montecristi'),
  (17, 'REGIONAL NOR-CENTRAL LA VEGA',                    1, 'Regional Nor-Central (La Vega)'),
  (18, 'DELEGACIÓN MONSEÑOR NOUEL (BONAO)',               1, 'Delegación Monseñor Nouel (Bonao)'),
  (19, 'DELEGACIÓN HERMANAS MIRABAL (SALCEDO)',           1, 'Delegación Hermanas Mirabal (Salcedo)'),
  (20, 'NÚCLEO DE TRABAJO JARABACOA',                     1, 'Núcleo Jarabacoa'),
  (21, 'REGIONAL NORTE SANTIAGO',                         1, 'Regional Norte (Santiago)'),
  (22, 'DELEGACIÓN ESPAILLAT (MOCA)',                     1, 'Delegación Espaillat (Moca)'),
  (23, 'DELEGACIÓN VALVERDE MAO',                         1, 'Delegación Valverde (Mao)'),
  (24, 'DELEGACIÓN SANTIAGO RODRÍGUEZ',                   1, 'Delegación Santiago Rodríguez'),
  (25, 'REGIONAL NORDESTE SAN FRANCISCO DE MACORÍS',      1, 'Regional Nordeste (San Francisco de Macorís)'),
  (26, 'DELEGACIÓN SAMANÁ (LAS TERRENAS)',                1, 'Delegación Samaná (Las Terrenas)'),
  (27, 'DELEGACIÓN MARÍA TRINIDAD SÁNCHEZ (NAGUA)',       1, 'Delegación María Trinidad Sánchez (Nagua)'),
  (28, 'DELEGACIÓN SÁNCHEZ RAMÍREZ (COTUÍ)',              1, 'Delegación Sánchez Ramírez (Cotuí)'),
  (29, 'NÚCLEO DE TRABAJO FANTINO (COTUÍ)',               1, 'Núcleo Fantino (Cotuí)'),
  (30, 'NÚCLEO DE TRABAJO VILLA LA MATA (COTUÍ)',         1, 'Núcleo Villa La Mata (Cotuí)'),
  (31, 'REGIONAL SUR-CENTRAL SAN CRISTÓBAL',              1, 'Regional Sur-Central (San Cristóbal)'),
  (32, 'DELEGACIÓN AZUA',                                 1, 'Delegación Azua'),
  (33, 'DELEGACIÓN PERAVIA (BANÍ)',                       1, 'Delegación Peravia (Baní)'),
  (34, 'REGIONAL SUROESTE BARAHONA',                      1, 'Regional Suroeste (Barahona)'),
  (35, 'REGIONAL SUR DEL VALLE (SAN JUAN DE LA MAGUANA)', 1, 'Regional Sur del Valle (San Juan de la Maguana)'),
  (36, 'DELEGACIÓN ELÍAS PIÑA',                           1, 'Delegación Elías Piña'),
  (37, 'REGIONAL ESTE LA ROMANA',                         1, 'Regional Este (La Romana)'),
  (38, 'DELEGACIÓN HIGÜEY',                               1, 'Delegación Higüey'),
  (39, 'DELEGACIÓN EL SEIBO',                             1, 'Delegación El Seibo'),
  (40, 'REGIONAL SURESTE SAN PEDRO DE MACORÍS',           1, 'Regional Sureste (San Pedro de Macorís)'),
  (41, 'DELEGACIÓN HATO MAYOR',                           1, 'Delegación Hato Mayor'),
  (42, 'DELEGACIÓN MONTE PLATA',                          1, 'Delegación Monte Plata')
on conflict (numero) do update
  set lugar         = excluded.lugar,
      mesa_en_lugar = excluded.mesa_en_lugar,
      etiqueta      = excluded.etiqueta;

-- ══════════════════════════════════════════════════════════════════════════════
-- 7. ADMIN USUARIOS — asignar mesa a delegado/suplente
-- ══════════════════════════════════════════════════════════════════════════════
drop function if exists public.admin_listar_usuarios();
create or replace function public.admin_listar_usuarios()
returns table (
  user_id           uuid,
  email             text,
  nombre            text,
  rol               text,
  nucleo_asignado   text,
  regional_asignada text,
  mesa              text,
  activo            boolean,
  created_at        timestamptz,
  last_sign_in_at   timestamptz
)
language plpgsql security definer stable set search_path = public as $$
begin
  if public.mi_rol() <> 'presidente' then
    raise exception 'Sin permisos';
  end if;

  return query
    select
      u.id                as user_id,
      u.email,
      coalesce(p.nombre, split_part(u.email, '@', 1)) as nombre,
      coalesce(p.rol, '—')      as rol,
      p.nucleo_asignado,
      p.regional_asignada,
      p.mesa,
      coalesce(p.activo, false) as activo,
      u.created_at,
      u.last_sign_in_at
    from auth.users u
    left join public.profiles p on p.id = u.id
    order by coalesce(p.rol, 'zzz'), u.email;
end;
$$;
grant execute on function public.admin_listar_usuarios() to authenticated;

drop function if exists public.admin_actualizar_perfil(uuid, text, text, text, boolean);
drop function if exists public.admin_actualizar_perfil(uuid, text, text, text, text, boolean);
create or replace function public.admin_actualizar_perfil(
  p_user_id           uuid,
  p_rol               text,
  p_nucleo_asignado   text,
  p_regional_asignada text,
  p_mesa              text,
  p_activo            boolean
)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if public.mi_rol() <> 'presidente' then
    raise exception 'Sin permisos';
  end if;

  if p_rol not in ('delegado','suplente') then
    p_mesa := null;
  end if;

  insert into public.profiles (id, nombre, rol, activo, nucleo_asignado, regional_asignada, mesa)
  select
    p_user_id,
    split_part(u.email, '@', 1),
    p_rol,
    p_activo,
    p_nucleo_asignado,
    p_regional_asignada,
    p_mesa
  from auth.users u where u.id = p_user_id
  on conflict (id) do update
    set rol               = excluded.rol,
        nucleo_asignado   = p_nucleo_asignado,
        regional_asignada = p_regional_asignada,
        mesa              = p_mesa,
        activo            = p_activo;
end;
$$;
grant execute on function public.admin_actualizar_perfil(uuid, text, text, text, text, boolean) to authenticated;

commit;

-- ════════════════════════════════════════════════════════════════════════════
-- DESPUÉS DE CORRER ESTE SCRIPT:
--   1. Dashboard → Database → Replication → habilitar Realtime en `votos_dia`
--      (necesario para que la tendencia del presidente se actualice sola).
--   2. En la app: Presidente → Admin Usuarios → asignar su MESA a cada
--      delegado/suplente (sin mesa no pueden registrar votos).
-- ════════════════════════════════════════════════════════════════════════════
