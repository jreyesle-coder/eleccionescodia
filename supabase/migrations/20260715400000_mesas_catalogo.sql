-- ════════════════════════════════════════════════════════════════════════
-- Catálogo de mesas de votación CODIA — 38 lugares / 42 mesas
-- Cada delegado/suplente se asigna a una mesa (profiles.mesa = numero::text).
-- votos_dia.mesa hereda ese valor vía registrar_voto_dia.
-- ════════════════════════════════════════════════════════════════════════

-- ── 0. Asegurar columna mesa en profiles ─────────────────────────────────────
alter table public.profiles
  add column if not exists mesa text;

-- ── 1. Catálogo de mesas ──────────────────────────────────────────────────────
create table if not exists public.mesas (
  numero         integer primary key,   -- 1..42, identifica la mesa físicamente
  lugar          text not null,         -- centro de votación
  mesa_en_lugar  integer not null default 1,  -- # de mesa dentro del lugar
  etiqueta       text not null          -- texto amigable para UI
);

alter table public.mesas enable row level security;
drop policy if exists "mesas_select_auth" on public.mesas;
create policy "mesas_select_auth" on public.mesas
  for select to authenticated using (true);

-- ── 2. Seed (idempotente) ─────────────────────────────────────────────────────
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

-- ── 3. admin_listar_usuarios: incluir mesa ────────────────────────────────────
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

-- ── 4. admin_actualizar_perfil: aceptar mesa ──────────────────────────────────
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

  -- La mesa solo aplica a delegado/suplente; en otros roles se limpia.
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
