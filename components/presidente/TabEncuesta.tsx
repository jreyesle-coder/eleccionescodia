'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
// ─── tipos ────────────────────────────────────────────────────────────────────

interface Row {
  q1_area: string | null
  q2_regional: string | null
  q3_edad: string | null
  q4_tiempo_colegiado: string | null
  q5_situacion_laboral: string | null
  q6_necesidad_principal: string | null
  q7_dificultades_ejercer: string | null
  q8_cuales_dificultades: string[] | null
  q9_calificacion: string | null
  q10_representa: string | null
  q11_area_fortalecer: string | null
  q12_nivel_informacion: string | null
  q13_formacion_continua: string | null
  q14_tipo_capacitaciones: string[] | null
  q15_modalidad: string | null
  q16_frecuencia: string | null
  q17_beneficios: string[] | null
  q18_feria_empleos: string | null
  q19_plataforma_digital: string | null
  q20_funciones_plataforma: string[] | null
  q21_participacion: string | null
  q22_motivacion: string[] | null
  q23_limitacion: string | null
  q24_proyecto_prioridad: string | null
  q25_servicio_nuevo: string | null
  q26_recomendaciones: string | null
  q27_frase: string | null
  q28_prioridades: string[] | null
  created_at: string
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function tabular(datos: Row[], campo: keyof Row): { name: string; total: number }[] {
  const conteo: Record<string, number> = {}
  for (const r of datos) {
    const val = r[campo]
    if (!val) continue
    if (Array.isArray(val)) {
      for (const v of val) {
        conteo[v] = (conteo[v] ?? 0) + 1
      }
    } else {
      conteo[val as string] = (conteo[val as string] ?? 0) + 1
    }
  }
  return Object.entries(conteo)
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total)
}

const PALETTE = [
  '#16285A', '#2A407A', '#C8961E', '#1F9D55', '#B61F2E',
  '#3B82F6', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316',
]

function GraficaBarras({
  titulo, datos, total,
}: { titulo: string; datos: { name: string; total: number }[]; total: number }) {
  if (datos.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <p className="text-xs font-semibold text-gray-700 mb-3">{titulo}</p>
        <p className="text-sm text-gray-400 text-center py-6">Sin respuestas</p>
      </div>
    )
  }
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <p className="text-xs font-semibold text-gray-700 mb-4">{titulo}</p>
      <div className="space-y-2">
        {datos.map((d, i) => (
          <div key={d.name} className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: PALETTE[i % PALETTE.length] }} />
            <div className="flex-1 min-w-0">
              <div className="flex justify-between text-xs mb-0.5">
                <span className="text-gray-600 truncate pr-2">{d.name}</span>
                <span className="font-bold tabular-nums shrink-0">{d.total} <span className="text-gray-400 font-normal">({total > 0 ? Math.round(d.total / total * 100) : 0}%)</span></span>
              </div>
              <div className="bg-gray-100 rounded-full h-2">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${total > 0 ? (d.total / datos[0].total) * 100 : 0}%`,
                    backgroundColor: PALETTE[i % PALETTE.length],
                  }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function RespuestasAbiertas({
  titulo, campo, datos,
}: { titulo: string; campo: keyof Row; datos: Row[] }) {
  const respuestas = datos
    .map(r => r[campo] as string | null)
    .filter((v): v is string => !!v && v.trim().length > 0)
    .slice(0, 20)

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <p className="text-xs font-semibold text-gray-700 mb-4">{titulo} ({respuestas.length})</p>
      {respuestas.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-4">Sin respuestas</p>
      ) : (
        <ul className="space-y-2 max-h-64 overflow-y-auto">
          {respuestas.map((r, i) => (
            <li key={i} className="text-sm text-gray-700 border-l-2 pl-3 italic" style={{ borderColor: 'var(--color-dorado)' }}>
              &ldquo;{r}&rdquo;
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ─── Componente principal ──────────────────────────────────────────────────────

export default function TabEncuesta() {
  const supabase = createClient()
  const [datos, setDatos]       = useState<Row[]>([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    supabase
      .from('encuesta_respuestas')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setDatos((data as Row[]) ?? [])
        setCargando(false)
      })
  }, [supabase]) // eslint-disable-line react-hooks/exhaustive-deps

  if (cargando) return <p className="text-center text-gray-400 py-12">Cargando resultados…</p>

  const total = datos.length

  const linkEncuesta = typeof window !== 'undefined'
    ? `${window.location.origin}/encuesta`
    : '/encuesta'

  return (
    <div className="space-y-6">
      {/* KPI + enlace */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div
          className="sm:col-span-2 rounded-2xl p-6 text-white"
          style={{ background: 'linear-gradient(135deg, var(--color-marino), var(--color-real))' }}
        >
          <p className="text-blue-200 text-xs font-semibold uppercase tracking-wide">Encuesta de Diagnóstico CODIA</p>
          <p className="text-5xl font-black mt-2 tabular-nums" style={{ color: 'var(--color-dorado)' }}>
            {total.toLocaleString()}
          </p>
          <p className="text-blue-200 text-sm mt-1">respuestas recibidas</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase">Enlace de la encuesta</p>
            <p className="text-sm text-gray-700 break-all mt-1">{linkEncuesta}</p>
          </div>
          <a
            href="/encuesta"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 text-center text-sm font-semibold py-2 rounded-xl text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: 'var(--color-marino)' }}
          >
            Abrir encuesta →
          </a>
        </div>
      </div>

      {/* ── Sección 1: Datos Generales ── */}
      <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--color-marino)' }}>
        1 · Datos Generales
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <GraficaBarras titulo="P1 · Área profesional" datos={tabular(datos, 'q1_area')} total={total} />
        <GraficaBarras titulo="P3 · Rango de edad" datos={tabular(datos, 'q3_edad')} total={total} />
        <GraficaBarras titulo="P4 · Tiempo como colegiado" datos={tabular(datos, 'q4_tiempo_colegiado')} total={total} />
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs font-semibold text-gray-700 mb-3">P2 · Regionales mencionadas</p>
          {(() => {
            const reg = tabular(datos, 'q2_regional')
            return reg.length === 0
              ? <p className="text-sm text-gray-400 text-center py-4">Sin respuestas</p>
              : <ul className="space-y-1 text-sm">{reg.map(r => (
                  <li key={r.name} className="flex justify-between">
                    <span className="text-gray-600">{r.name}</span>
                    <span className="font-bold">{r.total}</span>
                  </li>
                ))}</ul>
          })()}
        </div>
      </div>

      {/* ── Sección 2: Situación Profesional ── */}
      <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--color-marino)' }}>
        2 · Situación Profesional
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <GraficaBarras titulo="P5 · Situación laboral" datos={tabular(datos, 'q5_situacion_laboral')} total={total} />
        <GraficaBarras titulo="P6 · Principal necesidad como colegiado" datos={tabular(datos, 'q6_necesidad_principal')} total={total} />
        <GraficaBarras titulo="P7 · ¿Ha enfrentado dificultades?" datos={tabular(datos, 'q7_dificultades_ejercer')} total={total} />
        <GraficaBarras titulo="P8 · Dificultades enfrentadas" datos={tabular(datos, 'q8_cuales_dificultades')} total={total} />
      </div>

      {/* ── Sección 3: Valoración ── */}
      <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--color-marino)' }}>
        3 · Valoración Institucional
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <GraficaBarras titulo="P9 · Calificación de servicios CODIA" datos={tabular(datos, 'q9_calificacion')} total={total} />
        <GraficaBarras titulo="P10 · ¿El CODIA representa bien a los colegiados?" datos={tabular(datos, 'q10_representa')} total={total} />
        <GraficaBarras titulo="P11 · Área que debe fortalecerse con urgencia" datos={tabular(datos, 'q11_area_fortalecer')} total={total} />
        <GraficaBarras titulo="P12 · Nivel de información sobre el CODIA" datos={tabular(datos, 'q12_nivel_informacion')} total={total} />
      </div>

      {/* ── Sección 4: Capacitación ── */}
      <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--color-marino)' }}>
        4 · Capacitación y Desarrollo
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <GraficaBarras titulo="P13 · Interés en formación continua" datos={tabular(datos, 'q13_formacion_continua')} total={total} />
        <GraficaBarras titulo="P14 · Tipos de capacitaciones deseadas" datos={tabular(datos, 'q14_tipo_capacitaciones')} total={total} />
        <GraficaBarras titulo="P15 · Modalidad preferida" datos={tabular(datos, 'q15_modalidad')} total={total} />
        <GraficaBarras titulo="P16 · Frecuencia de capacitaciones" datos={tabular(datos, 'q16_frecuencia')} total={total} />
      </div>

      {/* ── Sección 5: Beneficios ── */}
      <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--color-marino)' }}>
        5 · Beneficios y Servicios
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <GraficaBarras titulo="P17 · Beneficios deseados" datos={tabular(datos, 'q17_beneficios')} total={total} />
        <GraficaBarras titulo="P18 · Feria de empleos" datos={tabular(datos, 'q18_feria_empleos')} total={total} />
        <GraficaBarras titulo="P19 · Plataforma digital / app" datos={tabular(datos, 'q19_plataforma_digital')} total={total} />
        <GraficaBarras titulo="P20 · Funciones deseadas en la plataforma" datos={tabular(datos, 'q20_funciones_plataforma')} total={total} />
      </div>

      {/* ── Sección 6: Participación ── */}
      <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--color-marino)' }}>
        6 · Participación Gremial
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <GraficaBarras titulo="P21 · Participación en actividades" datos={tabular(datos, 'q21_participacion')} total={total} />
        <GraficaBarras titulo="P22 · Motivación para participar" datos={tabular(datos, 'q22_motivacion')} total={total} />
        <GraficaBarras titulo="P23 · Qué limita la participación" datos={tabular(datos, 'q23_limitacion')} total={total} />
      </div>

      {/* ── Sección Prioridades ── */}
      <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--color-marino)' }}>
        Prioridades — Próxima Gestión
      </h3>
      <GraficaBarras titulo="P28 · Prioridades de la gestión 2026-2027" datos={tabular(datos, 'q28_prioridades')} total={total} />

      {/* ── Sección 7: Opiniones abiertas ── */}
      <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--color-marino)' }}>
        7 · Propuestas y Opinión Abierta
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <RespuestasAbiertas titulo="P27 · En una frase, ¿qué necesita el colegiado?" campo="q27_frase" datos={datos} />
        <RespuestasAbiertas titulo="P24 · Proyecto prioritario para el CODIA" campo="q24_proyecto_prioridad" datos={datos} />
        <RespuestasAbiertas titulo="P25 · Servicio nuevo deseado" campo="q25_servicio_nuevo" datos={datos} />
        <RespuestasAbiertas titulo="P26 · Recomendaciones" campo="q26_recomendaciones" datos={datos} />
      </div>
    </div>
  )
}
