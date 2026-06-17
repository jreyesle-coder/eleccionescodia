-- ════════════════════════════════════════════════════════════════════════
-- FIX: padron.asignado_a es TEXT en la BD real, pero auth.uid() devuelve
-- UUID → castear auth.uid()::text en policies y funciones.
-- ════════════════════════════════════════════════════════════════════════

-- ── RLS policies corregidas ───────────────────────────────────────────────────
drop policy if exists "padron_select_auth"  on public.padron;
drop policy if exists "padron_update_auth"  on public.padron;
drop policy if exists "padron_update_dirigente" on public.padron;

create policy "padron_select_auth" on public.padron
  for select to authenticated using (true);

create policy "padron_update_auth" on public.padron
  for update to authenticated
  using (
    asignado_a = auth.uid()::text
    or public.mi_rol() in ('supervisor','gerente','presidente','dirigente','colaborador')
  );

-- ── jalar_siguiente_colegiado: asignado_a recibe texto ───────────────────────
drop function if exists public.jalar_siguiente_colegiado(text);
create or replace function public.jalar_siguiente_colegiado(
  p_estado text default 'pendiente'
)
returns public.padron
language plpgsql security definer set search_path = public as $$
declare
  v_row public.padron;
begin
  select * into v_row
    from public.padron p
   where p.estado_gestion = p_estado
     and (p.telefono is not null or p.celular is not null)
     and (p.bloqueado_hasta is null or p.bloqueado_hasta < now())
     and p.voto_verificate_at is null
     and p.confirmado_por is null
   order by p.id
   for update skip locked
   limit 1;

  if not found then return null; end if;

  update public.padron
     set asignado_a      = auth.uid()::text,
         estado_gestion  = 'en_proceso',
         bloqueado_hasta = now() + interval '20 minutes'
   where id = v_row.id
   returning * into v_row;

  return v_row;
end;
$$;
grant execute on function public.jalar_siguiente_colegiado(text) to authenticated;

-- ── panel_operadores: comparación asignado_a::uuid ────────────────────────────
-- (ya usa subquery; pero aseguramos el cast)
drop function if exists public.panel_operadores();
create or replace function public.panel_operadores()
returns table (
  operador_id          uuid,
  nombre               text,
  rol                  text,
  colegiado_activo     boolean,
  miembro_activo       boolean,
  llamadas_total       bigint,
  efectivas_total      bigint,
  confirmados_p1_total bigint,
  no_contesta_total    bigint,
  llamadas_hoy         bigint,
  efectivas_hoy        bigint,
  confirmados_p1_hoy   bigint,
  no_contesta_hoy      bigint,
  ultima_actividad     timestamptz
)
language sql security definer stable set search_path = public as $$
  select
    p.id                                                              as operador_id,
    p.nombre,
    p.rol,
    exists(
      select 1 from public.padron px
       where px.asignado_a = p.id::text
         and px.estado_gestion = 'en_proceso'
         and px.bloqueado_hasta > now()
    )                                                                 as colegiado_activo,
    exists(
      select 1 from public.padron px
       where px.asignado_a = p.id::text
         and px.estado_gestion = 'en_proceso'
         and px.bloqueado_hasta > now()
    )                                                                 as miembro_activo,
    count(l.id)                                                       as llamadas_total,
    count(l.id) filter (
      where l.resultado in ('efectiva_confirma','efectiva_no_confirma')
    )                                                                 as efectivas_total,
    count(l.id) filter (
      where l.resultado = 'efectiva_confirma'
    )                                                                 as confirmados_p1_total,
    count(l.id) filter (
      where l.resultado = 'no_contesta'
    )                                                                 as no_contesta_total,
    count(l.id) filter (
      where l.fecha_hora >= (current_date at time zone 'America/Santo_Domingo')
    )                                                                 as llamadas_hoy,
    count(l.id) filter (
      where l.fecha_hora >= (current_date at time zone 'America/Santo_Domingo')
        and l.resultado in ('efectiva_confirma','efectiva_no_confirma')
    )                                                                 as efectivas_hoy,
    count(l.id) filter (
      where l.fecha_hora >= (current_date at time zone 'America/Santo_Domingo')
        and l.resultado = 'efectiva_confirma'
    )                                                                 as confirmados_p1_hoy,
    count(l.id) filter (
      where l.fecha_hora >= (current_date at time zone 'America/Santo_Domingo')
        and l.resultado = 'no_contesta'
    )                                                                 as no_contesta_hoy,
    max(l.fecha_hora)                                                 as ultima_actividad
  from public.profiles p
  left join public.llamadas l on l.operador_id = p.id
  where p.activo = true
    and public.mi_rol() in ('supervisor','gerente','presidente')
  group by p.id, p.nombre, p.rol
  order by llamadas_hoy desc;
$$;
grant execute on function public.panel_operadores() to authenticated;

-- ── vista_padron_vivo: cast asignado_a ───────────────────────────────────────
create or replace view public.vista_padron_vivo as
  select
    p.id,
    coalesce(p.regional, 'Sin regional') as regional,
    p.provincia,
    p.nucleo,
    p.codigo,
    p.nombre_completo,
    p.telefono,
    p.celular,
    p.carrera,
    p.pensionado,
    p.nuevo_integrante,
    p.estado_gestion,
    pr.nombre          as asignado_a,
    l.fecha_hora       as ultima_llamada,
    l.resultado        as ultimo_resultado,
    l.confirma_plancha1 as ultimo_confirma,
    l.notas            as ultima_nota
  from public.padron p
  left join public.profiles pr on pr.id::text = p.asignado_a
  left join lateral (
    select fecha_hora, resultado, confirma_plancha1, notas
      from public.llamadas
     where colegiado_id = p.id
     order by fecha_hora desc
     limit 1
  ) l on true;

-- ── listar_padron_regional: cast asignado_a ───────────────────────────────────
drop function if exists public.listar_padron_regional(text);
create or replace function public.listar_padron_regional(p_regional text)
returns table (
  id               bigint,
  regional         text,
  provincia        text,
  nucleo           text,
  codigo           text,
  nombre_completo  text,
  telefono         text,
  celular          text,
  carrera          text,
  pensionado       boolean,
  nuevo_integrante boolean,
  estado_gestion   text,
  asignado_a       text,
  ultima_llamada   timestamptz,
  ultimo_resultado text,
  ultimo_confirma  boolean,
  ultima_nota      text
)
language sql security definer stable set search_path = public as $$
  select
    p.id, p.regional, p.provincia, p.nucleo, p.codigo,
    p.nombre_completo, p.telefono, p.celular, p.carrera,
    p.pensionado, p.nuevo_integrante, p.estado_gestion,
    pr.nombre          as asignado_a,
    l.fecha_hora       as ultima_llamada,
    l.resultado        as ultimo_resultado,
    l.confirma_plancha1 as ultimo_confirma,
    l.notas            as ultima_nota
  from public.padron p
  left join public.profiles pr  on pr.id::text = p.asignado_a
  left join lateral (
    select fecha_hora, resultado, confirma_plancha1, notas
      from public.llamadas
     where colegiado_id = p.id
     order by fecha_hora desc
     limit 1
  ) l on true
  where p.regional = p_regional
    and public.mi_rol() in ('supervisor','gerente','presidente','dirigente','colaborador')
  order by p.nombre_completo;
$$;
grant execute on function public.listar_padron_regional(text) to authenticated;
