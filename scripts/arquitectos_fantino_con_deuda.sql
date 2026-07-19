-- ════════════════════════════════════════════════════════════════════════
-- Arquitectos que VOTAN en Fantino (Cotuí) + deuda vigente
-- Correr en el SQL Editor de Supabase (service_role).
-- Contexto: el acta 0063 (Fantino) tuvo 12 votos fraccionados (Calderón 12,
-- García 12; Richardson 0 y 0 en contra). El Presidente quiere confirmar
-- cuántos arquitectos están asignados a votar ahí y su deuda.
-- ════════════════════════════════════════════════════════════════════════

-- ── (0) DIAGNÓSTICO: cómo está guardado el centro de Fantino en el padrón ────
-- Corre esto primero para confirmar el valor exacto de centro_votacion.
select
  p.centro_votacion,
  p.regional,
  p.provincia,
  count(*) as arquitectos
from public.padron p
where p.nucleo = 'ARQUITECTOS'
  and ( p.centro_votacion ilike '%fantino%'
     or p.regional        ilike '%fantino%'
     or p.provincia        ilike '%sanchez ramirez%'
     or p.provincia        ilike '%sánchez ramírez%' )
group by 1, 2, 3
order by arquitectos desc;


-- ── (1) LISTA DE ARQUITECTOS DE FANTINO CON DEUDA VIGENTE ────────────────────
-- Si el diagnóstico muestra otro texto (p. ej. "NÚCLEO DE TRABAJO FANTINO"),
-- el ilike '%fantino%' igual lo captura. Ajustar si hiciera falta.
select
  p.codigo,
  p.nombre_completo,
  p.cedula,
  p.centro_votacion,
  p.regional,
  coalesce(p.telefono, p.celular)                       as contacto,
  -- deuda vigente: monto_deuda del padrón (consultado en línea, se preserva)
  -- o el monto de deudas_votantes si existiera.
  greatest(coalesce(p.monto_deuda, 0), coalesce(dv.monto, 0)) as deuda_vigente,
  ( coalesce(p.monto_deuda, 0) > 0 or dv.codigo is not null ) as tiene_deuda,
  p.pensionado,
  p.votante_habilitado,
  p.confirmado_por,
  p.confirmacion_intencion
from public.padron p
left join lateral (
  select d.codigo, max(d.monto) as monto
  from public.deudas_votantes d
  where d.codigo = p.codigo
  group by d.codigo
) dv on true
where p.nucleo = 'ARQUITECTOS'
  and p.centro_votacion ilike '%fantino%'
order by deuda_vigente desc, p.nombre_completo;


-- ── (2) RESUMEN: total de arquitectos en Fantino y cuántos con deuda ─────────
select
  count(*)                                                   as total_arquitectos,
  count(*) filter (where coalesce(p.monto_deuda,0) > 0
                      or exists (select 1 from public.deudas_votantes d
                                 where d.codigo = p.codigo))  as con_deuda,
  sum(coalesce(p.monto_deuda, 0))                            as suma_deuda_padron
from public.padron p
where p.nucleo = 'ARQUITECTOS'
  and p.centro_votacion ilike '%fantino%';
