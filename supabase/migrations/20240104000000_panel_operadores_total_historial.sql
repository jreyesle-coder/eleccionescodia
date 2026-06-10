-- ─── panel_operadores: totales acumulados (no solo hoy) ─────────────────────
drop function if exists public.panel_operadores();
create function public.panel_operadores()
returns table (
  operador_id          uuid,
  nombre               text,
  rol                  text,
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
    p.id as operador_id,
    p.nombre,
    p.rol,
    exists(
      select 1 from public.miembros mx
       where mx.asignado_a = p.id
         and mx.estado_gestion = 'en_proceso'
         and mx.bloqueado_hasta > now()
    ) as miembro_activo,
    -- Totales acumulados
    count(l.id)                                                            as llamadas_total,
    count(l.id) filter (
      where l.resultado in ('efectiva_confirma','efectiva_no_confirma')
    )                                                                      as efectivas_total,
    count(l.id) filter (
      where l.resultado = 'efectiva_confirma'
    )                                                                      as confirmados_p1_total,
    count(l.id) filter (
      where l.resultado = 'no_contesta'
    )                                                                      as no_contesta_total,
    -- Solo hoy (zona RD)
    count(l.id) filter (
      where l.fecha_hora >= (current_date at time zone 'America/Santo_Domingo')
    )                                                                      as llamadas_hoy,
    count(l.id) filter (
      where l.fecha_hora >= (current_date at time zone 'America/Santo_Domingo')
        and l.resultado in ('efectiva_confirma','efectiva_no_confirma')
    )                                                                      as efectivas_hoy,
    count(l.id) filter (
      where l.fecha_hora >= (current_date at time zone 'America/Santo_Domingo')
        and l.resultado = 'efectiva_confirma'
    )                                                                      as confirmados_p1_hoy,
    count(l.id) filter (
      where l.fecha_hora >= (current_date at time zone 'America/Santo_Domingo')
        and l.resultado = 'no_contesta'
    )                                                                      as no_contesta_hoy,
    max(l.fecha_hora)                                                      as ultima_actividad
  from public.profiles p
  left join public.llamadas l on l.operador_id = p.id
  where p.activo = true
    and public.mi_rol() in ('supervisor','gerente','presidente')
  group by p.id, p.nombre, p.rol
  order by llamadas_total desc;
$$;
grant execute on function public.panel_operadores() to authenticated;

-- ─── historial_operador: detalle de llamadas de un operador ──────────────────
drop function if exists public.historial_operador(uuid);
create function public.historial_operador(p_operador_id uuid)
returns table (
  llamada_id      bigint,
  fecha_hora      timestamptz,
  miembro_nombre  text,
  matricula       text,
  resultado       text,
  confirma_p1     boolean,
  notas           text
)
language sql security definer stable set search_path = public as $$
  select
    l.id            as llamada_id,
    l.fecha_hora,
    m.nombre        as miembro_nombre,
    m.matricula,
    l.resultado,
    l.confirma_plancha1 as confirma_p1,
    l.notas
  from public.llamadas l
  join public.miembros m on m.id = l.miembro_id
  where l.operador_id = p_operador_id
    and public.mi_rol() in ('supervisor','gerente','presidente')
  order by l.fecha_hora desc
  limit 500;
$$;
grant execute on function public.historial_operador(uuid) to authenticated;
