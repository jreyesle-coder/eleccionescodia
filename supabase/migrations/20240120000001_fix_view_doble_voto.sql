-- Fix: v_alerta_doble_voto existía con lista_mesas text[] (array).
-- CREATE OR REPLACE VIEW no puede cambiar tipos → hay que DROP + CREATE.

drop view if exists public.v_alerta_doble_voto;

create view public.v_alerta_doble_voto as
  select
    v.codigo,
    ( select nombre_completo from public.padron p2
        where p2.codigo = v.codigo limit 1 ) as nombre_completo,
    count(*)                                        as mesas,
    string_agg(v.mesa, ', ' order by v.created_at) as lista_mesas
  from public.votos_dia v
  group by v.codigo
  having count(*) > 1;
