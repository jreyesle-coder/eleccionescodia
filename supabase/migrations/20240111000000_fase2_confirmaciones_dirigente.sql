-- ════════════════════════════════════════════════════════════════════════
-- FASE 2: Confirmaciones por dirigente/colaborador + vistas presidente/gerente
-- ════════════════════════════════════════════════════════════════════════

-- ── RPC: confirmar_colegiado ──────────────────────────────────────────────────
-- El dirigente busca un colegiado y lo marca como confirmado en su círculo.
-- Requiere rol dirigente o colaborador.
drop function if exists public.confirmar_colegiado(text, text);
create or replace function public.confirmar_colegiado(
  p_codigo         text,
  p_intencion      text    -- 'favorable' | 'indeciso' | 'en_contra'
)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if public.mi_rol() not in ('dirigente','colaborador','gerente','presidente','supervisor') then
    raise exception 'Sin permisos para confirmar colegiados';
  end if;

  if p_intencion not in ('favorable','indeciso','en_contra') then
    raise exception 'Intención inválida: use favorable, indeciso o en_contra';
  end if;

  update public.padron
     set confirmado_por         = (select nombre from public.profiles where id = auth.uid()),
         confirmacion_intencion = p_intencion,
         confirmacion_at        = now()
   where codigo = p_codigo;

  if not found then
    raise exception 'Colegiado no encontrado: %', p_codigo;
  end if;
end;
$$;
grant execute on function public.confirmar_colegiado(text, text) to authenticated;

-- ── Vista: confirmados por dirigente ─────────────────────────────────────────
-- Agrupa por confirmado_por para la vista presidente/gerente.
create or replace view public.v_confirmados_por_dirigente as
  select
    confirmado_por                                     as dirigente,
    count(*)                                           as total,
    count(*) filter (where confirmacion_intencion = 'favorable')  as favorables,
    count(*) filter (where confirmacion_intencion = 'indeciso')   as indecisos,
    count(*) filter (where confirmacion_intencion = 'en_contra')  as en_contra,
    max(confirmacion_at)                               as ultima_confirmacion
  from public.padron
  where confirmado_por is not null
  group by confirmado_por
  order by total desc;

-- ── RPC: listar_confirmados_dirigente ─────────────────────────────────────────
-- Lista los colegiados confirmados por un dirigente específico.
drop function if exists public.listar_confirmados_dirigente(text);
create or replace function public.listar_confirmados_dirigente(
  p_dirigente text default null
)
returns table (
  codigo                text,
  nombre_completo       text,
  regional              text,
  nucleo                text,
  confirmado_por        text,
  confirmacion_intencion text,
  confirmacion_at       timestamptz,
  via_verificate        boolean
)
language sql security definer stable set search_path = public as $$
  select
    p.codigo,
    p.nombre_completo,
    p.regional,
    p.nucleo,
    p.confirmado_por,
    p.confirmacion_intencion,
    p.confirmacion_at,
    p.simpatiza_verificate as via_verificate
  from public.padron p
  where (
    p.confirmado_por is not null
    or p.simpatiza_verificate = true
  )
  and (p_dirigente is null or p.confirmado_por = p_dirigente)
  and public.mi_rol() in ('supervisor','gerente','presidente','dirigente','colaborador')
  order by p.confirmado_por nulls last, p.nombre_completo;
$$;
grant execute on function public.listar_confirmados_dirigente(text) to authenticated;

-- ── RLS: dirigente/colaborador puede ver y confirmar colegiados ───────────────
-- Ya existe policy padron_select_auth que permite leer a authenticated.
-- Aquí aseguramos que dirigente puede actualizar los campos de confirmación.
drop policy if exists "padron_update_dirigente" on public.padron;
create policy "padron_update_dirigente" on public.padron
  for update to authenticated
  using (
    asignado_a = auth.uid()
    or public.mi_rol() in ('supervisor','gerente','presidente','dirigente','colaborador')
  );
