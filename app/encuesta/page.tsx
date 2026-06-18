'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Marca from '@/components/marca'

// ─── helpers ──────────────────────────────────────────────────────────────────

function Radio({
  name, value, label, checked, onChange,
}: { name: string; value: string; label: string; checked: boolean; onChange: () => void }) {
  return (
    <label className="flex items-center gap-2.5 cursor-pointer group">
      <span
        className="w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors"
        style={{ borderColor: checked ? 'var(--color-marino)' : '#CBD5E1' }}
      >
        {checked && (
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--color-marino)' }} />
        )}
      </span>
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
        className="sr-only"
      />
      <span className="text-sm text-gray-700 group-hover:text-gray-900">{label}</span>
    </label>
  )
}

function Checkbox({
  value, label, checked, onChange, disabled,
}: { value: string; label: string; checked: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <label className={`flex items-center gap-2.5 cursor-pointer group ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}>
      <span
        className="w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors"
        style={{ borderColor: checked ? 'var(--color-marino)' : '#CBD5E1', backgroundColor: checked ? 'var(--color-marino)' : 'white' }}
      >
        {checked && <span className="text-white text-[10px] font-bold leading-none">✓</span>}
      </span>
      <input type="checkbox" value={value} checked={checked} onChange={onChange} disabled={disabled} className="sr-only" />
      <span className="text-sm text-gray-700 group-hover:text-gray-900">{label}</span>
    </label>
  )
}

function SeccionHeader({ num, titulo, color = 'var(--color-marino)' }: { num: number; titulo: string; color?: string }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
        style={{ backgroundColor: color }}
      >
        {num}
      </div>
      <h2 className="font-bold text-base uppercase tracking-wide" style={{ color }}>
        {titulo}
      </h2>
    </div>
  )
}

function Pregunta({ num, texto, children, dark }: { num: number; texto: string; children: React.ReactNode; dark?: boolean }) {
  return (
    <div className="space-y-3">
      <p className={`text-sm font-semibold ${dark ? 'text-white' : 'text-gray-800'}`}>
        <span style={{ color: dark ? 'var(--color-dorado)' : 'var(--color-marino)' }}>{num}.</span> {texto}
      </p>
      <div className="pl-1 space-y-2">{children}</div>
    </div>
  )
}

function Divider() {
  return <hr className="border-gray-100" />
}

// ─── Estado inicial ────────────────────────────────────────────────────────────

type Estado = {
  q1: string; q2: string; q3: string; q4: string
  q5: string; q6: string; q7: string; q8: string[]
  q9: string; q10: string; q11: string; q12: string
  q13: string; q14: string[]; q15: string; q16: string
  q17: string[]; q18: string; q19: string; q20: string[]
  q21: string; q22: string[]; q23: string
  q24: string; q25: string; q26: string; q27: string
  q28: string[]
}

const INICIAL: Estado = {
  q1: '', q2: '', q3: '', q4: '',
  q5: '', q6: '', q7: '', q8: [],
  q9: '', q10: '', q11: '', q12: '',
  q13: '', q14: [], q15: '', q16: '',
  q17: [], q18: '', q19: '', q20: [],
  q21: '', q22: [], q23: '',
  q24: '', q25: '', q26: '', q27: '',
  q28: [],
}

function toggleArr(arr: string[], val: string, max: number): string[] {
  if (arr.includes(val)) return arr.filter(v => v !== val)
  if (arr.length >= max) return arr
  return [...arr, val]
}

// ─── Componente principal ──────────────────────────────────────────────────────

export default function EncuestaPage() {
  const supabase = createClient()
  const [form, setForm] = useState<Estado>(INICIAL)
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = (key: keyof Estado, val: string) =>
    setForm(f => ({ ...f, [key]: val }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setEnviando(true)
    setError(null)
    const { error: err } = await supabase.from('encuesta_respuestas').insert({
      q1_area: form.q1 || null,
      q2_regional: form.q2 || null,
      q3_edad: form.q3 || null,
      q4_tiempo_colegiado: form.q4 || null,
      q5_situacion_laboral: form.q5 || null,
      q6_necesidad_principal: form.q6 || null,
      q7_dificultades_ejercer: form.q7 || null,
      q8_cuales_dificultades: form.q8.length ? form.q8 : null,
      q9_calificacion: form.q9 || null,
      q10_representa: form.q10 || null,
      q11_area_fortalecer: form.q11 || null,
      q12_nivel_informacion: form.q12 || null,
      q13_formacion_continua: form.q13 || null,
      q14_tipo_capacitaciones: form.q14.length ? form.q14 : null,
      q15_modalidad: form.q15 || null,
      q16_frecuencia: form.q16 || null,
      q17_beneficios: form.q17.length ? form.q17 : null,
      q18_feria_empleos: form.q18 || null,
      q19_plataforma_digital: form.q19 || null,
      q20_funciones_plataforma: form.q20.length ? form.q20 : null,
      q21_participacion: form.q21 || null,
      q22_motivacion: form.q22.length ? form.q22 : null,
      q23_limitacion: form.q23 || null,
      q24_proyecto_prioridad: form.q24 || null,
      q25_servicio_nuevo: form.q25 || null,
      q26_recomendaciones: form.q26 || null,
      q27_frase: form.q27 || null,
      q28_prioridades: form.q28.length ? form.q28 : null,
    })
    setEnviando(false)
    if (err) { setError('Ocurrió un error al enviar. Por favor intenta de nuevo.'); return }
    setEnviado(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // ─── Pantalla de éxito ────────────────────────────────────────────────────

  if (enviado) {
    return (
      <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--color-fondo)' }}>
        <header className="bg-white shadow-sm">
          <div className="px-5 py-3 flex items-center justify-between">
            <Marca />
          </div>
          <div className="flex h-[3px]">
            <div className="flex-1" style={{ backgroundColor: 'var(--color-marino)' }} />
            <div className="w-16" style={{ backgroundColor: 'var(--color-dorado)' }} />
            <div className="w-4" style={{ backgroundColor: 'var(--color-plancha)' }} />
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center px-4 py-16">
          <div className="bg-white rounded-3xl shadow-xl p-10 max-w-md w-full text-center space-y-5">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto text-3xl"
              style={{ backgroundColor: 'var(--color-marino)' }}
            >
              ✓
            </div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--color-marino)' }}>
              ¡Gracias por tu participación!
            </h1>
            <p className="text-gray-600 text-sm leading-relaxed">
              Tu opinión es fundamental para construir un CODIA más fuerte, moderno y transparente.
              Juntos construiremos un CODIA más fuerte, moderno y transparente.
            </p>
            <div
              className="rounded-2xl p-4 text-sm font-semibold"
              style={{ backgroundColor: 'rgba(200,150,30,0.1)', color: 'var(--color-dorado)' }}
            >
              ARQ. RICHARDSON PRESIDENTE — CODIA 2026-2027
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ─── Formulario ───────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-fondo)' }}>

      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="px-5 py-3 flex items-center justify-between">
          <Marca />
        </div>
        <div className="flex h-[3px]">
          <div className="flex-1" style={{ backgroundColor: 'var(--color-marino)' }} />
          <div className="w-16" style={{ backgroundColor: 'var(--color-dorado)' }} />
          <div className="w-4" style={{ backgroundColor: 'var(--color-plancha)' }} />
        </div>
      </header>

      {/* Hero */}
      <div className="text-white py-10 px-5 text-center" style={{ background: 'linear-gradient(135deg, var(--color-marino), var(--color-real))' }}>
        <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--color-dorado)' }}>
          ARQ. RICHARDSON PRESIDENTE — GESTIÓN 2026-2027
        </p>
        <h1 className="text-2xl sm:text-3xl font-black mb-3">
          Encuesta de Diagnóstico
        </h1>
        <p className="text-blue-200 text-sm max-w-lg mx-auto leading-relaxed">
          Necesidades y Prioridades de los Colegiados del CODIA.
          Tu opinión es fundamental para construir un CODIA más fuerte, moderno y transparente.
        </p>
        <p className="mt-3 text-xs font-semibold" style={{ color: 'var(--color-dorado)' }}>
          ¡Participar es construir el futuro de nuestro colegio!
        </p>
      </div>

      {/* Formulario */}
      <form onSubmit={handleSubmit} className="max-w-2xl mx-auto px-4 py-8 space-y-6">

        {/* ── Sección 1: Datos Generales ─────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
          <SeccionHeader num={1} titulo="Datos Generales" />

          <Pregunta num={1} texto="¿A qué área profesional pertenece?">
            <div className="grid grid-cols-2 gap-2">
              {['Ingeniería', 'Arquitectura', 'Agrimensura', 'Otra'].map(v => (
                <Radio key={v} name="q1" value={v} label={v} checked={form.q1 === v} onChange={() => set('q1', v)} />
              ))}
            </div>
          </Pregunta>

          <Divider />

          <Pregunta num={2} texto="¿A qué regional o delegación del CODIA pertenece?">
            <input
              type="text"
              value={form.q2}
              onChange={e => set('q2', e.target.value)}
              placeholder="Ej: Santo Domingo, Santiago, La Romana…"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2"
              style={{ '--tw-ring-color': 'var(--color-marino)' } as React.CSSProperties}
            />
          </Pregunta>

          <Divider />

          <Pregunta num={3} texto="¿Cuál es su rango de edad?">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {['20–30 años', '31–40 años', '41–50 años', '51–60 años', 'Más de 60 años'].map(v => (
                <Radio key={v} name="q3" value={v} label={v} checked={form.q3 === v} onChange={() => set('q3', v)} />
              ))}
            </div>
          </Pregunta>

          <Divider />

          <Pregunta num={4} texto="¿Cuánto tiempo tiene como colegiado del CODIA?">
            <div className="grid grid-cols-2 gap-2">
              {['Menos de 1 año', '1 a 5 años', '6 a 10 años', 'Más de 10 años'].map(v => (
                <Radio key={v} name="q4" value={v} label={v} checked={form.q4 === v} onChange={() => set('q4', v)} />
              ))}
            </div>
          </Pregunta>
        </div>

        {/* ── Sección 2: Situación Profesional ───────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
          <SeccionHeader num={2} titulo="Situación Profesional" />

          <Pregunta num={5} texto="Actualmente, su situación laboral es:">
            <div className="grid grid-cols-2 gap-2">
              {['Empleado en el sector público', 'Desempleado', 'Empleado en el sector privado', 'Emprendedor', 'Profesional independiente', 'Otro'].map(v => (
                <Radio key={v} name="q5" value={v} label={v} checked={form.q5 === v} onChange={() => set('q5', v)} />
              ))}
            </div>
          </Pregunta>

          <Divider />

          <Pregunta num={6} texto="¿Cuál considera que es su principal necesidad como colegiado?">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                'Más oportunidades de empleo', 'Convenios y descuentos',
                'Capacitaciones y diplomas', 'Mayor representación gremial',
                'Defensa del ejercicio profesional', 'Asesoría legal',
                'Mejores servicios del CODIA', 'Otro',
              ].map(v => (
                <Radio key={v} name="q6" value={v} label={v} checked={form.q6 === v} onChange={() => set('q6', v)} />
              ))}
            </div>
          </Pregunta>

          <Divider />

          <Pregunta num={7} texto="¿Ha enfrentado dificultades para ejercer su profesión?">
            <div className="flex gap-6">
              {[{ v: 'si', l: 'Sí' }, { v: 'no', l: 'No' }].map(({ v, l }) => (
                <Radio key={v} name="q7" value={v} label={l} checked={form.q7 === v} onChange={() => set('q7', v)} />
              ))}
            </div>
          </Pregunta>

          {form.q7 === 'si' && (
            <>
              <Divider />
              <Pregunta num={8} texto="Si respondió sí, ¿cuáles dificultades ha enfrentado?">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    'Baja remuneración', 'Falta de apoyo institucional',
                    'Competencia desleal', 'Trámites engorrosos',
                    'Intrusismo profesional', 'Falta de oportunidades', 'Otro',
                  ].map(v => (
                    <Checkbox
                      key={v} value={v} label={v}
                      checked={form.q8.includes(v)}
                      onChange={() => setForm(f => ({ ...f, q8: toggleArr(f.q8, v, 99) }))}
                    />
                  ))}
                </div>
              </Pregunta>
            </>
          )}
        </div>

        {/* ── Sección 3: Valoración Institucional ────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
          <SeccionHeader num={3} titulo="Valoración Institucional del CODIA" />

          <Pregunta num={9} texto="¿Cómo califica los servicios que actualmente ofrece el CODIA?">
            <div className="flex flex-wrap gap-4">
              {['Excelentes', 'Buenos', 'Regulares', 'Deficientes'].map(v => (
                <Radio key={v} name="q9" value={v} label={v} checked={form.q9 === v} onChange={() => set('q9', v)} />
              ))}
            </div>
          </Pregunta>

          <Divider />

          <Pregunta num={10} texto="¿Siente que el CODIA representa adecuadamente los intereses de los colegiados?">
            <div className="flex flex-wrap gap-4">
              {['Sí, totalmente', 'En parte', 'Muy poco', 'No'].map(v => (
                <Radio key={v} name="q10" value={v} label={v} checked={form.q10 === v} onChange={() => set('q10', v)} />
              ))}
            </div>
          </Pregunta>

          <Divider />

          <Pregunta num={11} texto="¿Qué área considera que debe fortalecerse con mayor urgencia?">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                'Defensa gremial y legal', 'Gestión de beneficios y convenios',
                'Formación académica', 'Regionales y delegaciones',
                'Bolsa de empleo', 'Modernización tecnológica',
                'Comunicación institucional', 'Otro',
              ].map(v => (
                <Radio key={v} name="q11" value={v} label={v} checked={form.q11 === v} onChange={() => set('q11', v)} />
              ))}
            </div>
          </Pregunta>

          <Divider />

          <Pregunta num={12} texto="¿Qué tan informado(a) se siente sobre las actividades y gestiones del CODIA?">
            <div className="flex flex-wrap gap-4">
              {['Muy informado(a)', 'Informado(a)', 'Poco informado(a)', 'Nada informado(a)'].map(v => (
                <Radio key={v} name="q12" value={v} label={v} checked={form.q12 === v} onChange={() => set('q12', v)} />
              ))}
            </div>
          </Pregunta>
        </div>

        {/* ── Sección 4: Capacitación ─────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
          <SeccionHeader num={4} titulo="Capacitación y Desarrollo Profesional" />

          <Pregunta num={13} texto="¿Le interesa participar en programas de formación continua?">
            <div className="flex gap-6">
              {[{ v: 'si', l: 'Sí' }, { v: 'no', l: 'No' }].map(({ v, l }) => (
                <Radio key={v} name="q13" value={v} label={l} checked={form.q13 === v} onChange={() => set('q13', v)} />
              ))}
            </div>
          </Pregunta>

          <Divider />

          <Pregunta num={14} texto="¿Qué tipo de capacitaciones le gustaría recibir? (Seleccione hasta 3)">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                'Diseño y tecnología', 'Presupuesto y cubicaciones',
                'Supervisión de obras', 'Emprendimiento profesional',
                'Planeamiento urbano', 'Licitaciones públicas',
                'Gestión de riesgos', 'Herramientas digitales',
                'Normativas y leyes del sector', 'Otro',
              ].map(v => (
                <Checkbox
                  key={v} value={v} label={v}
                  checked={form.q14.includes(v)}
                  disabled={!form.q14.includes(v) && form.q14.length >= 3}
                  onChange={() => setForm(f => ({ ...f, q14: toggleArr(f.q14, v, 3) }))}
                />
              ))}
            </div>
            <p className="text-xs text-gray-400">{form.q14.length}/3 seleccionadas</p>
          </Pregunta>

          <Divider />

          <Pregunta num={15} texto="¿Qué modalidad prefiere para las capacitaciones?">
            <div className="flex flex-wrap gap-4">
              {['Presencial', 'Virtual', 'Híbrida'].map(v => (
                <Radio key={v} name="q15" value={v} label={v} checked={form.q15 === v} onChange={() => set('q15', v)} />
              ))}
            </div>
          </Pregunta>

          <Divider />

          <Pregunta num={16} texto="¿Con qué frecuencia le gustaría que el CODIA realizara capacitaciones?">
            <div className="flex flex-wrap gap-4">
              {['Semanal', 'Quincenal', 'Mensual', 'Trimestral'].map(v => (
                <Radio key={v} name="q16" value={v} label={v} checked={form.q16 === v} onChange={() => set('q16', v)} />
              ))}
            </div>
          </Pregunta>
        </div>

        {/* ── Sección 5: Beneficios ───────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
          <SeccionHeader num={5} titulo="Beneficios y Servicios" />

          <Pregunta num={17} texto="¿Cuáles beneficios le gustaría que gestionara el CODIA? (Seleccione hasta 3)">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                'Seguro médico o planes especiales', 'Bolsa de empleo',
                'Descuentos en farmacias', 'Asesoría legal',
                'Descuentos en ferreterías', 'Financiamiento para proyectos',
                'Convenios con universidades', 'Becas nacionales e internacionales',
                'Otro',
              ].map(v => (
                <Checkbox
                  key={v} value={v} label={v}
                  checked={form.q17.includes(v)}
                  disabled={!form.q17.includes(v) && form.q17.length >= 3}
                  onChange={() => setForm(f => ({ ...f, q17: toggleArr(f.q17, v, 3) }))}
                />
              ))}
            </div>
            <p className="text-xs text-gray-400">{form.q17.length}/3 seleccionadas</p>
          </Pregunta>

          <Divider />

          <Pregunta num={18} texto="¿Considera importante que el CODIA gestione una feria de empleos?">
            <div className="flex flex-wrap gap-4">
              {['Sí', 'No', 'Tal vez'].map(v => (
                <Radio key={v} name="q18" value={v} label={v} checked={form.q18 === v} onChange={() => set('q18', v)} />
              ))}
            </div>
          </Pregunta>

          <Divider />

          <Pregunta num={19} texto="¿Le gustaría que el CODIA cuente con una plataforma digital o app para colegiados?">
            <div className="flex gap-6">
              {[{ v: 'si', l: 'Sí' }, { v: 'no', l: 'No' }].map(({ v, l }) => (
                <Radio key={v} name="q19" value={v} label={l} checked={form.q19 === v} onChange={() => set('q19', v)} />
              ))}
            </div>
          </Pregunta>

          <Divider />

          <Pregunta num={20} texto="¿Qué funciones le gustaría que tuviera esa plataforma? (Seleccione hasta 3)">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                'Pago de colegiatura', 'Bolsa de empleo',
                'Acceso a carnet digital', 'Capacitaciones virtuales',
                'Noticias y actividades', 'Directorio de colegiados',
                'Denuncias de obras ilegales', 'Otro',
              ].map(v => (
                <Checkbox
                  key={v} value={v} label={v}
                  checked={form.q20.includes(v)}
                  disabled={!form.q20.includes(v) && form.q20.length >= 3}
                  onChange={() => setForm(f => ({ ...f, q20: toggleArr(f.q20, v, 3) }))}
                />
              ))}
            </div>
            <p className="text-xs text-gray-400">{form.q20.length}/3 seleccionadas</p>
          </Pregunta>
        </div>

        {/* ── Sección 6: Participación Gremial ───────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
          <SeccionHeader num={6} titulo="Participación Gremial" />

          <Pregunta num={21} texto="¿Participa activamente en actividades del CODIA?">
            <div className="flex flex-wrap gap-4">
              {['Sí, con frecuencia', 'Algunas veces', 'Rara vez', 'Nunca'].map(v => (
                <Radio key={v} name="q21" value={v} label={v} checked={form.q21 === v} onChange={() => set('q21', v)} />
              ))}
            </div>
          </Pregunta>

          <Divider />

          <Pregunta num={22} texto="¿Qué le motiva a participar más en el CODIA? (Seleccione hasta 2)">
            <div className="grid grid-cols-2 gap-2">
              {[
                'Formación', 'Beneficios directos',
                'Networking', 'Integración social y deportiva',
                'Defensa gremial', 'Otro',
              ].map(v => (
                <Checkbox
                  key={v} value={v} label={v}
                  checked={form.q22.includes(v)}
                  disabled={!form.q22.includes(v) && form.q22.length >= 2}
                  onChange={() => setForm(f => ({ ...f, q22: toggleArr(f.q22, v, 2) }))}
                />
              ))}
            </div>
            <p className="text-xs text-gray-400">{form.q22.length}/2 seleccionadas</p>
          </Pregunta>

          <Divider />

          <Pregunta num={23} texto="¿Qué limita su participación?">
            <div className="grid grid-cols-2 gap-2">
              {[
                'Falta de tiempo', 'Distancia',
                'Falta de información', 'Falta de beneficios tangibles',
                'Poco interés en las actividades', 'Otro',
              ].map(v => (
                <Radio key={v} name="q23" value={v} label={v} checked={form.q23 === v} onChange={() => set('q23', v)} />
              ))}
            </div>
          </Pregunta>
        </div>

        {/* ── Sección 7: Propuestas ───────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
          <SeccionHeader num={7} titulo="Propuestas y Opinión Abierta" />

          <Pregunta num={24} texto="¿Qué proyecto o iniciativa considera prioritaria para mejorar el CODIA?">
            <textarea
              rows={3}
              value={form.q24}
              onChange={e => set('q24', e.target.value)}
              placeholder="Escribe tu propuesta…"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 resize-none"
              style={{ '--tw-ring-color': 'var(--color-marino)' } as React.CSSProperties}
            />
          </Pregunta>

          <Divider />

          <Pregunta num={25} texto="¿Qué servicio nuevo le gustaría que implemente el CODIA?">
            <textarea
              rows={3}
              value={form.q25}
              onChange={e => set('q25', e.target.value)}
              placeholder="Escribe tu sugerencia…"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 resize-none"
              style={{ '--tw-ring-color': 'var(--color-marino)' } as React.CSSProperties}
            />
          </Pregunta>

          <Divider />

          <Pregunta num={26} texto="¿Qué recomendaciones tiene para fortalecer el gremio y apoyar mejor a los colegiados?">
            <textarea
              rows={3}
              value={form.q26}
              onChange={e => set('q26', e.target.value)}
              placeholder="Tus recomendaciones…"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 resize-none"
              style={{ '--tw-ring-color': 'var(--color-marino)' } as React.CSSProperties}
            />
          </Pregunta>

          <Divider />

          <Pregunta num={27} texto="En una sola frase, ¿qué necesita hoy el colegiado del CODIA?">
            <input
              type="text"
              value={form.q27}
              onChange={e => set('q27', e.target.value)}
              placeholder="Una frase poderosa…"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2"
              style={{ '--tw-ring-color': 'var(--color-marino)' } as React.CSSProperties}
            />
          </Pregunta>
        </div>

        {/* ── Prioridades próxima gestión ─────────────────────────────────── */}
        <div className="rounded-2xl p-6 space-y-5" style={{ background: 'linear-gradient(135deg, var(--color-marino), var(--color-real))' }}>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-xl">⭐</span>
            <h2 className="font-bold text-base uppercase tracking-wide text-white">
              Prioridades para la Próxima Gestión del CODIA
            </h2>
          </div>

          <Pregunta dark num={28} texto="¿Cuáles considera que deben ser las tres principales prioridades de la próxima gestión nacional del CODIA? (Seleccione hasta 3)">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                'Defensa del ejercicio profesional',
                'Transparencia institucional y rendición de cuentas',
                'Fiscalización del intrusismo profesional',
                'Fortalecimiento de las regionales y delegaciones',
                'Formación continua y certificaciones',
                'Convenios y beneficios para colegiados',
                'Bolsa de empleo y oportunidades laborales',
                'Asesoría legal y técnica especializada',
                'Modernización tecnológica del CODIA',
                'Bienestar social y programas de apoyo al colegiado',
              ].map(v => {
                const checked = form.q28.includes(v)
                return (
                  <label key={v} className={`flex items-center gap-2.5 cursor-pointer ${!checked && form.q28.length >= 3 ? 'opacity-40 cursor-not-allowed' : ''}`}>
                    <span
                      className="w-4 h-4 rounded border-2 flex items-center justify-center shrink-0"
                      style={{ borderColor: checked ? 'var(--color-dorado)' : 'rgba(255,255,255,0.4)', backgroundColor: checked ? 'var(--color-dorado)' : 'transparent' }}
                    >
                      {checked && <span className="text-white text-[10px] font-bold leading-none">✓</span>}
                    </span>
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={checked}
                      disabled={!checked && form.q28.length >= 3}
                      onChange={() => setForm(f => ({ ...f, q28: toggleArr(f.q28, v, 3) }))}
                    />
                    <span className="text-sm text-blue-100">{v}</span>
                  </label>
                )
              })}
            </div>
            <p className="text-xs text-blue-300 mt-1">{form.q28.length}/3 seleccionadas</p>
          </Pregunta>
        </div>

        {/* ── Error ───────────────────────────────────────────────────────── */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* ── Botón enviar ────────────────────────────────────────────────── */}
        <button
          type="submit"
          disabled={enviando}
          className="w-full py-4 rounded-2xl font-bold text-base transition-opacity disabled:opacity-60"
          style={{ backgroundColor: 'var(--color-marino)', color: 'white' }}
        >
          {enviando ? 'Enviando…' : '¡Enviar mi respuesta!'}
        </button>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 pb-4">
          ¡Gracias por tu participación! · ARQ. RICHARDSON PRESIDENTE · CODIA 2026-2027
        </p>
      </form>
    </div>
  )
}
