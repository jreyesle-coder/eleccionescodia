-- Agregar campo para carrera libre cuando q1_area = 'Otra'
alter table encuesta_respuestas
  add column if not exists q1_area_otra text;
