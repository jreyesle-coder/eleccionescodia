-- ════════════════════════════════════════════════════════════════════════
-- FASE 1: Exclusión del call center para verificate + confirmación dirigente
-- El call center NO debe traer a:
--   - quienes ya marcaron por verificate (voto_verificate_at IS NOT NULL)
--   - quienes ya fueron confirmados por un dirigente (confirmado_por IS NOT NULL)
-- ════════════════════════════════════════════════════════════════════════

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
     and p.voto_verificate_at is null       -- excluir ya marcados en verificate
     and p.confirmado_por is null            -- excluir ya confirmados por dirigente
   order by p.id
   for update skip locked
   limit 1;

  if not found then return null; end if;

  update public.padron
     set asignado_a      = auth.uid(),
         estado_gestion  = 'en_proceso',
         bloqueado_hasta = now() + interval '20 minutes'
   where id = v_row.id
   returning * into v_row;

  return v_row;
end;
$$;
grant execute on function public.jalar_siguiente_colegiado(text) to authenticated;
