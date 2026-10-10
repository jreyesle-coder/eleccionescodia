'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const MARINO = '#1F3864'
const DORADO = '#C9A227'

interface Fila { slug: string; titulo: string; estado: string; created_at: string }

const soloDigitos = (s: string) => s.replace(/\D/g, '')

const INFO: Record<string, { txt: string; sub: string; bg: string; fg: string }> = {
  aprobada:  { txt: '¡Seleccionado!', sub: 'Tu solicitud fue aprobada. El CODIA te contactará con los próximos pasos.', bg: '#dcfce7', fg: '#15803d' },
  pendiente: { txt: 'En evaluación',  sub: 'Tu solicitud fue recibida y está siendo evaluada. Vuelve a consultar más adelante.', bg: '#fef9c3', fg: '#b45309' },
  rechazada: { txt: 'No seleccionado', sub: 'En esta ocasión tu solicitud no fue seleccionada. Gracias por tu interés.', bg: '#fee2e2', fg: '#b91c1c' },
}

export default function ConsultaInscripcion() {
  const supabase = createClient()
  const [cedula, setCedula] = useState('')
  const [buscando, setBuscando] = useState(false)
  const [filas, setFilas] = useState<Fila[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function consultar(e: React.FormEvent) {
    e.preventDefault()
    const ced = soloDigitos(cedula)
    if (ced.length !== 11) { setError('Ingresa una cédula válida de 11 dígitos.'); return }
    setBuscando(true); setError(null); setFilas(null)
    const { data, error: err } = await supabase.rpc('consultar_inscripciones', { p_cedula: ced })
    setBuscando(false)
    if (err) { setError('No se pudo consultar en este momento. Intenta de nuevo.'); return }
    setFilas((data as Fila[]) ?? [])
  }

  const inputCls = 'w-full text-sm px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:border-transparent'
  const ring = { ['--tw-ring-color' as string]: MARINO } as React.CSSProperties

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f4f6fb' }}>
      <div className="max-w-md mx-auto px-4 py-10">
        <div className="text-center space-y-1 mb-6">
          <div className="flex justify-center mb-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-codia.png" alt="CODIA" className="h-14 w-auto" />
          </div>
          <h1 className="text-xl font-extrabold tracking-tight" style={{ color: MARINO }}>CONSULTA DE SELECCIÓN</h1>
          <p className="text-sm text-gray-500">Verifica el estado de tu inscripción a los cursos del CODIA.</p>
          <div className="pt-1"><div className="h-0.5 w-full rounded-full" style={{ backgroundColor: DORADO }} /></div>
        </div>

        <form onSubmit={consultar} className="bg-white rounded-2xl border border-gray-100 shadow-md p-5 space-y-3">
          <label className="text-xs font-semibold text-gray-600 block">Cédula</label>
          <input value={cedula} onChange={e => setCedula(e.target.value)} placeholder="001-0000000-0" inputMode="numeric" className={inputCls} style={ring} />
          <button type="submit" disabled={buscando} className="w-full py-3 rounded-xl text-white text-sm font-bold disabled:opacity-50" style={{ backgroundColor: MARINO }}>
            {buscando ? 'Consultando…' : 'Consultar'}
          </button>
          {error && <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">{error}</p>}
        </form>

        {filas !== null && (
          <div className="mt-4 space-y-3">
            {filas.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-6 text-center text-sm text-gray-500">
                No encontramos inscripciones a cursos con esa cédula.
              </div>
            ) : filas.map((f, i) => {
              const info = INFO[f.estado] ?? INFO.pendiente
              return (
                <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                  <p className="text-sm font-bold" style={{ color: MARINO }}>{f.titulo}</p>
                  <div className="mt-2 rounded-lg px-3 py-2" style={{ backgroundColor: info.bg }}>
                    <p className="text-sm font-extrabold" style={{ color: info.fg }}>{info.txt}</p>
                    <p className="text-xs mt-0.5" style={{ color: info.fg }}>{info.sub}</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <p className="text-center text-xs text-gray-400 pt-6">CODIA · Plan de Capacitación y Actualización Profesional</p>
      </div>
    </div>
  )
}
