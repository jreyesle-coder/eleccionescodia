-- ════════════════════════════════════════════════════════════════════════
-- Validar los usuarios de delegados realmente creados en el sistema contra
-- el listado "DELEGADOS  CODIA 2026.docx" / Accesos_Delegados_CODIA_2026.xlsx
-- Correr en el SQL Editor de Supabase (service_role).
--
-- El sistema es la fuente de verdad: los correos que salgan aquí son los
-- buenos. Con eso se corrigen las filas marcadas "Revisar" en el Excel.
-- ════════════════════════════════════════════════════════════════════════

-- ── (A) Todos los usuarios @delegado.app que existen hoy ────────────────────
select
  'A. EN EL SISTEMA' as bloque,
  count(*) over ()   as total_filas,
  u.email,
  p.nombre,
  p.rol,
  p.mesa,
  p.regional_asignada,
  u.created_at,
  u.last_sign_in_at,
  case when u.last_sign_in_at is null then 'NUNCA HA ENTRADO' else 'ya entro' end as estado
from auth.users u
left join public.profiles p on p.id = u.id
where lower(u.email) like '%@delegado.app'
order by u.email;


-- ── (B) Contraste contra el listado derivado del Word ───────────────────────
-- Pega aquí la columna "Usuario (correo)" del Excel si quieres el diff exacto.
-- 'FALTA CREAR' = está en el Word pero no en el sistema.
with esperados(correo, nombre_doc) as (values
  ('thaniarodriguez@delegado.app',      'Thania Rodriguez'),
  ('juanrodriguez@delegado.app',        'Juan Rodriguez'),
  ('michaelrivas@delegado.app',         'Michael Rivas'),
  ('juanmanan@delegado.app',            'Juan Mañan'),
  ('diomedescespedes@delegado.app',     'Diomedes Céspedes'),
  ('maritzaleguizamon@delegado.app',    'Maritza Leguizamon'),
  ('ivelissealmanzar@delegado.app',     'Ivelisse Almanzar'),
  ('juliobatista@delegado.app',         'Julio Batista'),
  ('irenelopez@delegado.app',           'Irene López'),
  ('claudiovaldez@delegado.app',        'Claudio Valdez'),
  ('carloshichez@delegado.app',         'Carlos Hichez'),
  ('juliocastillo@delegado.app',        'Julio Castillo'),
  ('rosamarein@delegado.app',           'Rosa Iris Marein'),
  ('rafaelcabral@delegado.app',         'Rafael Cabral'),
  ('daviddejesus@delegado.app',         'David de Jesus'),
  ('jewardduran@delegado.app',          'Jeward Duran'),
  ('arseniorodriguez@delegado.app',     'Arq. Arsenio Rodríguez'),
  ('franciscocornelio@delegado.app',    'Francisco Cornelio'),
  ('juanlancer@delegado.app',           'Juan Lancer'),
  ('graceparedes@delegado.app',         'Grace Paredes'),
  ('vicentebaez@delegado.app',          'Vicente Báez'),
  ('elsisalmonte@delegado.app',         'Elsis Almonte'),
  ('petronilamedina@delegado.app',      'Petronila medina'),
  ('ciriacamartinez@delegado.app',      'Ciriaca Martínez'),
  ('meregirdobatista@delegado.app',     'Meregirdo Batista'),
  ('mariaozuna@delegado.app',           'Maria Luisa Ozuna'),
  ('yacerboves@delegado.app',           'Yacer Boves'),
  ('vicentecastillo@delegado.app',      'Vicente Castillo'),
  ('carlenyscastro@delegado.app',       'Carlenys Castro'),
  ('marielheredia@delegado.app',        'Mariel Irkania Heredia'),
  ('angelicacoste@delegado.app',        'Angelica maria coste'),
  ('robinsonnunez@delegado.app',        'Robinson ant. nuñez'),
  ('hosmilgarcia@delegado.app',         'Hosmil García'),
  ('flemygarcia@delegado.app',          'Flemy Patricia García'),
  ('jesus@delegado.app',                'Jesús (sin apellido en el doc)'),
  ('ubardomercedes@delegado.app',       'Ubardo Mercedes'),
  ('aldrinalburquerque@delegado.app',   'Aldrin Alburquerque'),
  ('franciaramirez@delegado.app',       'Francia Ramírez'),
  ('brauliopierre@delegado.app',        'Braulio Pierre'),
  ('manuelcastillo@delegado.app',       'Manuel Alejandro Castillo'),
  ('dennysmercedes@delegado.app',       'Dennys Mercedes'),
  ('ismaelleiba@delegado.app',          'Ismael Leiba'),
  ('sixtodelossantos@delegado.app',     'Sixto de los Santos'),
  ('leoneldelacruz@delegado.app',       'Leonel C.de la Cruz'),
  ('miguelluna@delegado.app',           'Miguel Luna'),
  ('anyelodejesus@delegado.app',        'Anyelo de Jesus M'),
  ('juliopolanco@delegado.app',         'Julio Polanco'),
  ('andresvasquez@delegado.app',        'Andres vasquez'),
  ('lisbetbcruz@delegado.app',          'Lisbetb cruz'),
  ('josehenriquez@delegado.app',        'José Gregorio Henríquez'),
  ('yafreicyrodriguez@delegado.app',    'Yafreicy Rodriguez'),
  ('tomasrodriguez@delegado.app',       'Tomas Rodriguez'),
  ('dennyzabala@delegado.app',          'Denny Zabala'),
  ('leonidascastro@delegado.app',       'Leonidas Castro'),
  ('aidapantaleon@delegado.app',        'Aida Pantaleón'),
  ('juliosoli@delegado.app',            'Julio Soli'),
  ('joseramirez@delegado.app',          'José Emilio Ramírez'),
  ('gloriaramirez@delegado.app',        'Gloria Ramírez'),
  ('descartesfeliz@delegado.app',       'Descartes Batista Feliz'),
  ('samueljimenez@delegado.app',        'Samuel Antonio Jiménez Pichardo'),
  ('gregoriperez@delegado.app',         'Gregori Pérez'),
  ('angelemilio@delegado.app',          'Ángel Emilio'),
  ('justogarcia@delegado.app',          'Justo García'),
  ('silandsalazar@delegado.app',        'Siland Salazar')
)
select
  'B. DIFF' as bloque,
  count(*) over ()                as total_filas,
  coalesce(e.correo, u.email)     as correo,
  e.nombre_doc,
  p.nombre                        as nombre_en_sistema,
  p.rol,
  p.mesa,
  case
    when u.id is null then 'FALTA CREAR (esta en el Word, no en el sistema)'
    when e.correo is null then 'SOBRA / NOMBRE DISTINTO (esta en el sistema, no en el Word)'
    when p.rol is distinct from 'delegado' then 'ROL INCORRECTO: ' || coalesce(p.rol, '(sin perfil)')
    when p.mesa is null then 'SIN MESA ASIGNADA'
    else 'ok'
  end as estado
from esperados e
full outer join auth.users u on lower(u.email) = e.correo
left join public.profiles p on p.id = u.id
where e.correo is not null
   or lower(u.email) like '%@delegado.app'
order by estado, correo;
