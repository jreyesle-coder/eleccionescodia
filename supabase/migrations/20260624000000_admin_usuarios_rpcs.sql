-- ════════════════════════════════════════════════════════════════════════
-- Módulo Admin Usuarios — solo accesible para rol 'presidente'
-- 1. admin_listar_usuarios()  — lista todos los usuarios con su perfil
-- 2. admin_actualizar_perfil() — actualiza rol, nucleo, regional, activo
-- ════════════════════════════════════════════════════════════════════════

-- ── 1. admin_listar_usuarios ─────────────────────────────────────────────────
drop function if exists public.admin_listar_usuarios();
create or replace function public.admin_listar_usuarios()
returns table (
  user_id          uuid,
  email            text,
  nombre           text,
  rol              text,
  nucleo_asignado  text,
  regional_asignada text,
  activo           boolean,
  created_at       timestamptz,
  last_sign_in_at  timestamptz
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
      coalesce(p.activo, false) as activo,
      u.created_at,
      u.last_sign_in_at
    from auth.users u
    left join public.profiles p on p.id = u.id
    order by coalesce(p.rol, 'zzz'), u.email;
end;
$$;
grant execute on function public.admin_listar_usuarios() to authenticated;


-- ── 2. admin_actualizar_perfil ───────────────────────────────────────────────
drop function if exists public.admin_actualizar_perfil(uuid, text, text, text, boolean);
create or replace function public.admin_actualizar_perfil(
  p_user_id          uuid,
  p_rol              text,
  p_nucleo_asignado  text,
  p_regional_asignada text,
  p_activo           boolean
)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if public.mi_rol() <> 'presidente' then
    raise exception 'Sin permisos';
  end if;

  -- Insertar perfil si no existe (usuario invitado que aún no hizo login)
  insert into public.profiles (id, nombre, rol, activo, nucleo_asignado, regional_asignada)
  select
    p_user_id,
    split_part(u.email, '@', 1),
    p_rol,
    p_activo,
    p_nucleo_asignado,
    p_regional_asignada
  from auth.users u where u.id = p_user_id
  on conflict (id) do update
    set rol               = excluded.rol,
        nucleo_asignado   = p_nucleo_asignado,
        regional_asignada = p_regional_asignada,
        activo            = p_activo;
end;
$$;
grant execute on function public.admin_actualizar_perfil(uuid, text, text, text, boolean) to authenticated;
