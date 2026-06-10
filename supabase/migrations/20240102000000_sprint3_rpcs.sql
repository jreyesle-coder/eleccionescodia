-- ─── liberar_miembro ─────────────────────────────────────────────────────────
drop function if exists public.liberar_miembro(bigint);
create or replace function public.liberar_miembro(p_miembro_id bigint)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.miembros
     set estado_gestion = 'pendiente',
         asignado_a     = null,
         bloqueado_hasta = null
   where id = p_miembro_id
     and asignado_a = auth.uid();
end;
$$;
grant execute on function public.liberar_miembro(bigint) to authenticated;

-- ─── panel_operadores ─────────────────────────────────────────────────────────
drop function if exists public.panel_operadores();
create function public.panel_operadores()
returns table (
  operador_id        uuid,
  nombre             text,
  rol                text,
  miembro_activo     boolean,
  llamadas_hoy       bigint,
  efectivas_hoy      bigint,
  confirmados_p1_hoy bigint,
  no_contesta_hoy    bigint,
  ultima_actividad   timestamptz
)
language sql security definer stable set search_path = public as $$
  select
    p.id as operador_id,
    p.nombre,
    p.rol,
    exists(
      select 1 from public.miembros mx
       where mx.asignado_a = p.id
         and mx.estado_gestion = 'en_proceso'
         and mx.bloqueado_hasta > now()
    ) as miembro_activo,
    count(l.id) filter (
      where l.fecha_hora >= (current_date at time zone 'America/Santo_Domingo')
    ) as llamadas_hoy,
    count(l.id) filter (
      where l.fecha_hora >= (current_date at time zone 'America/Santo_Domingo')
        and l.resultado in ('efectiva_confirma','efectiva_no_confirma')
    ) as efectivas_hoy,
    count(l.id) filter (
      where l.fecha_hora >= (current_date at time zone 'America/Santo_Domingo')
        and l.resultado = 'efectiva_confirma'
    ) as confirmados_p1_hoy,
    count(l.id) filter (
      where l.fecha_hora >= (current_date at time zone 'America/Santo_Domingo')
        and l.resultado = 'no_contesta'
    ) as no_contesta_hoy,
    max(l.fecha_hora) as ultima_actividad
  from public.profiles p
  left join public.llamadas l on l.operador_id = p.id
  where p.activo = true
    and public.mi_rol() in ('supervisor','gerente','presidente')
  group by p.id, p.nombre, p.rol
  order by llamadas_hoy desc;
$$;
grant execute on function public.panel_operadores() to authenticated;

-- ─── kpis_generales ──────────────────────────────────────────────────────────
drop function if exists public.kpis_generales();
create function public.kpis_generales()
returns table (
  total_miembros      bigint,
  pendientes          bigint,
  en_proceso          bigint,
  contactados         bigint,
  no_comunicacion     bigint,
  cerrados            bigint,
  confirmados_p1      bigint,
  tasa_confirmacion   numeric,
  montero_total       bigint,
  montero_contactados bigint
)
language sql security definer stable set search_path = public as $$
  select
    count(*)                                                   as total_miembros,
    count(*) filter (where estado_gestion = 'pendiente')       as pendientes,
    count(*) filter (where estado_gestion = 'en_proceso')      as en_proceso,
    count(*) filter (where estado_gestion = 'contactado')      as contactados,
    count(*) filter (where estado_gestion = 'no_comunicacion') as no_comunicacion,
    count(*) filter (where estado_gestion = 'cerrado')         as cerrados,
    (select count(*) from public.llamadas where resultado = 'efectiva_confirma')
                                                               as confirmados_p1,
    case
      when count(*) filter (where estado_gestion in ('contactado','cerrado')) > 0
        then round(
          (select count(*)::numeric from public.llamadas where resultado = 'efectiva_confirma')
          / count(*) filter (where estado_gestion in ('contactado','cerrado'))
          * 100, 1
        )
      else 0
    end                                                        as tasa_confirmacion,
    count(*) filter (where segmento_montero = true)            as montero_total,
    count(*) filter (where segmento_montero = true and estado_gestion = 'contactado')
                                                               as montero_contactados
  from public.miembros
  where public.mi_rol() in ('supervisor','gerente','presidente');
$$;
grant execute on function public.kpis_generales() to authenticated;

-- ─── listar_recuperacion ─────────────────────────────────────────────────────
drop function if exists public.listar_recuperacion();
create function public.listar_recuperacion()
returns table (
  id                   bigint,
  matricula            text,
  nombre               text,
  telefono             text,
  telefono_revisar     boolean,
  intentos_no_contesta int,
  estado_gestion       text
)
language sql security definer stable set search_path = public as $$
  select id, matricula, nombre, telefono, telefono_revisar, intentos_no_contesta, estado_gestion
  from public.miembros
  where estado_gestion = 'no_comunicacion'
    and segmento_montero = false
    and public.mi_rol() in ('supervisor','gerente','presidente')
  order by intentos_no_contesta desc, id;
$$;
grant execute on function public.listar_recuperacion() to authenticated;

-- ─── listar_montero ──────────────────────────────────────────────────────────
drop function if exists public.listar_montero();
create function public.listar_montero()
returns table (
  id               bigint,
  matricula        text,
  nombre           text,
  telefono         text,
  telefono_revisar boolean,
  estado_gestion   text,
  confirmo_p1      boolean
)
language sql security definer stable set search_path = public as $$
  select
    m.id, m.matricula, m.nombre, m.telefono, m.telefono_revisar, m.estado_gestion,
    coalesce((
      select l.confirma_plancha1
      from public.llamadas l
      where l.miembro_id = m.id and l.resultado = 'efectiva_confirma'
      order by l.fecha_hora desc limit 1
    ), false) as confirmo_p1
  from public.miembros m
  where m.segmento_montero = true
    and public.mi_rol() in ('supervisor','gerente','presidente')
  order by
    case m.estado_gestion
      when 'pendiente'       then 1
      when 'en_proceso'      then 2
      when 'no_comunicacion' then 3
      when 'contactado'      then 4
      when 'cerrado'         then 5
    end,
    m.nombre;
$$;
grant execute on function public.listar_montero() to authenticated;
