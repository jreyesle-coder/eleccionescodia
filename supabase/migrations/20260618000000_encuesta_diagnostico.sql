-- Encuesta de Diagnóstico CODIA 2026 — Necesidades y Prioridades de los Colegiados

create table if not exists encuesta_respuestas (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),

  -- Sección 1: Datos Generales
  q1_area                  text,          -- radio: Ingeniería | Arquitectura | Agrimensura | Otra
  q1_area_otra             text,          -- texto libre cuando q1_area = Otra
  q2_regional              text,          -- texto libre
  q3_edad                  text,          -- radio: 20-30 | 31-40 | 41-50 | 51-60 | Más de 60
  q4_tiempo_colegiado      text,          -- radio: Menos de 1 año | 1-5 años | 6-10 años | Más de 10 años

  -- Sección 2: Situación Profesional
  q5_situacion_laboral     text,          -- radio
  q6_necesidad_principal   text,          -- radio
  q7_dificultades_ejercer  text,          -- radio: si | no
  q8_cuales_dificultades   text[],        -- checkboxes (condicional a q7=si)

  -- Sección 3: Valoración Institucional
  q9_calificacion          text,          -- radio: Excelentes | Buenos | Regulares | Deficientes
  q10_representa           text,          -- radio
  q11_area_fortalecer      text,          -- radio
  q12_nivel_informacion    text,          -- radio

  -- Sección 4: Capacitación
  q13_formacion_continua   text,          -- radio: si | no
  q14_tipo_capacitaciones  text[],        -- checkboxes máx 3
  q15_modalidad            text,          -- radio
  q16_frecuencia           text,          -- radio

  -- Sección 5: Beneficios y Servicios
  q17_beneficios           text[],        -- checkboxes máx 3
  q18_feria_empleos        text,          -- radio: si | no | tal_vez
  q19_plataforma_digital   text,          -- radio: si | no
  q20_funciones_plataforma text[],        -- checkboxes máx 3

  -- Sección 6: Participación Gremial
  q21_participacion        text,          -- radio
  q22_motivacion           text[],        -- checkboxes máx 2
  q23_limitacion           text,          -- radio

  -- Sección 7: Propuestas y Opinión Abierta
  q24_proyecto_prioridad   text,
  q25_servicio_nuevo       text,
  q26_recomendaciones      text,
  q27_frase                text,

  -- Sección Prioridades gestión 2026-2027
  q28_prioridades          text[]         -- checkboxes máx 3
);

alter table encuesta_respuestas enable row level security;

-- Cualquier persona (sin login) puede enviar la encuesta
create policy "encuesta_insert_public"
  on encuesta_respuestas for insert
  with check (true);

-- Solo usuarios autenticados pueden leer los resultados
create policy "encuesta_select_auth"
  on encuesta_respuestas for select
  using (auth.role() = 'authenticated');
