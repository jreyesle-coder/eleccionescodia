'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import AppHeader from '@/components/app-header'
import { cn } from '@/lib/utils'

interface Colegiado {
  id: number
  codigo: string
  nombre_completo: string
  cedula: string | null
  telefono: string | null
  celular: string | null
  regional: string | null
  nucleo: string | null
  carrera: string | null
  pensionado: boolean
  nuevo_integrante: boolean
  tiene_deuda: boolean
}

interface Confirmado {
  codigo: string
  nombre_completo: string
  regional: string | null
  nucleo: string | null
  confirmacion_intencion: string | null
  confirmacion_at: string | null
}

const INTENCION_LABEL: Record<string, string> = {
  favorable: '✓ Favorable',
  indeciso:  '~ Indeciso',
  en_contra: '✗ En contra',
}

const INTENCION_COLOR: Record<string, string> = {
  favorable: 'bg-green-100 text-green-800',
  indeciso:  'bg-yellow-100 text-yellow-800',
  en_contra: 'bg-red-100 text-red-700',
}

const ZONA = 'America/Santo_Domingo'

function formatFechaCorta(iso: string) {
  return new Date(iso).toLocaleString('es-DO', {
    timeZone: ZONA, day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  })
}

interface Props {
  userId: string
  nombre: string
  rol: string
}

export default function PanelDirigente({ nombre, rol }: Props) {
  const supabase = createClient()

  // Búsqueda
  const [busqueda, setBusqueda]       = useState('')
  const [resultados, setResultados]   = useState<Colegiado[]>([])
  const [buscando, setBuscando]       = useState(false)
  const [buscado, setBuscado]         = useState(false)

  // Confirmación
  const [colegiadoActivo, setColegiadoActivo] = useState<Colegiado | null>(null)
  const [intencion, setIntencion]             = useState<string | null>(null)
  const [guardando, setGuardando]             = useState(false)
  const [confirmadoNombre, setConfirmadoNombre] = useState<string | null>(null)
  const [errorConfirm, setErrorConfirm]       = useState<string | null>(null)

  // Lista mis confirmaciones
  const [misConfirmados, setMisConfirmados] = useState<Confirmado[]>([])
  const [cargandoMios, setCargandoMios]     = useState(false)
  const [pestañaActiva, setPestañaActiva]   = useState<'buscar' | 'mis_confirmados'>('buscar')

  const buscar = useCallback(async (q: string) => {
    if (q.trim().length < 3) return
    setBuscando(true)
    setBuscado(false)
    const { data } = await supabase.rpc('buscar_colegiado', { p_q: q.trim() })
    setBuscando(false)
    setBuscado(true)
    setResultados((data as Colegiado[]) ?? [])
  }, [supabase])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    buscar(busqueda)
  }

  async function cargarMisConfirmados() {
    setCargandoMios(true)
    const { data } = await supabase.rpc('listar_confirmados_dirigente', { p_dirigente: nombre })
    setCargandoMios(false)
    setMisConfirmados((data as Confirmado[]) ?? [])
  }

  function abrirConfirmacion(c: Colegiado) {
    setColegiadoActivo(c)
    setIntencion(null)
    setErrorConfirm(null)
    setConfirmadoNombre(null)
  }

  async function guardarConfirmacion() {
    if (!colegiadoActivo || !intencion || guardando) return
    setGuardando(true)
    setErrorConfirm(null)
    const { error } = await supabase.rpc('confirmar_colegiado', {
      p_codigo:    colegiadoActivo.codigo,
      p_intencion: intencion,
    })
    setGuardando(false)
    if (error) {
      setErrorConfirm('No se pudo guardar. Intenta de nuevo.')
      return
    }
    setConfirmadoNombre(colegiadoActivo.nombre_completo)
    setColegiadoActivo(null)
    setIntencion(null)
  }

  function cambiarPestaña(p: 'buscar' | 'mis_confirmados') {
    setPestañaActiva(p)
    if (p === 'mis_confirmados') cargarMisConfirmados()
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-fondo)' }}>
      <AppHeader nombreUsuario={nombre} rol={rol === 'colaborador' ? 'Colaborador' : 'Dirigente'} />

      <div className="max-w-xl mx-auto px-4 py-6 space-y-5">

        {/* Pestañas */}
        <div className="flex border-b border-gray-200">
          {([
            { key: 'buscar',          label: 'Confirmar colegiado' },
            { key: 'mis_confirmados', label: 'Mis confirmados' },
          ] as { key: 'buscar' | 'mis_confirmados'; label: string }[]).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => cambiarPestaña(key)}
              className={cn(
                'px-5 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors',
                pestañaActiva === key
                  ? 'border-blue-600 text-blue-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              )}
            >{label}</button>
          ))}
        </div>

        {/* ── TAB: BUSCAR ── */}
        {pestañaActiva === 'buscar' && (
          <>
            {confirmadoNombre && (
              <div className="bg-green-50 border border-green-200 text-green-800 rounded-2xl px-5 py-4 text-sm font-medium">
                ✓ Confirmado: <strong>{confirmadoNombre}</strong>
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex gap-2">
              <input
                type="text"
                value={busqueda}
                onChange={e => { setBusqueda(e.target.value); setBuscado(false); setResultados([]) }}
                placeholder="Nombre, colegiatura o cédula…"
                className="flex-1 text-sm px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2"
                style={{ '--tw-ring-color': 'var(--color-marino)' } as React.CSSProperties}
              />
              <button
                type="submit"
                disabled={buscando || busqueda.trim().length < 3}
                className="px-5 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-50"
                style={{ backgroundColor: 'var(--color-marino)' }}
              >
                {buscando ? 'Buscando…' : 'Buscar'}
              </button>
            </form>

            {buscado && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100">
                  <p className="text-sm font-semibold text-gray-700">
                    {resultados.length === 0 ? 'Sin resultados' : `${resultados.length} resultado${resultados.length !== 1 ? 's' : ''}`}
                  </p>
                </div>
                <div className="divide-y divide-gray-50">
                  {resultados.map(r => (
                    <div key={r.id} className="px-5 py-4 space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-gray-900 text-sm">{r.nombre_completo}</p>
                          <p className="text-xs text-gray-400">
                            Colegiatura {r.codigo}{r.cedula && <> · CI: {r.cedula}</>}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          {r.pensionado && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">Pensionado</span>
                          )}
                          {r.tiene_deuda && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">Con deuda</span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-gray-500">
                        {r.carrera  && <span>Profesión: <span className="font-medium text-gray-700">{r.carrera}</span></span>}
                        {r.regional && <span>Regional: <span className="font-medium text-gray-700">{r.regional}</span></span>}
                        {r.nucleo   && <span>Núcleo: <span className="font-medium text-gray-700">{r.nucleo}</span></span>}
                      </div>
                      <button
                        onClick={() => abrirConfirmacion(r)}
                        className="w-full py-2.5 rounded-xl text-sm font-semibold border-2 transition-all hover:opacity-90"
                        style={{ borderColor: 'var(--color-marino)', color: 'var(--color-marino)' }}
                      >
                        Marcar intención →
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* ── TAB: MIS CONFIRMADOS ── */}
        {pestañaActiva === 'mis_confirmados' && (
          cargandoMios ? (
            <p className="text-center text-gray-400 py-10">Cargando…</p>
          ) : misConfirmados.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-12 text-center">
              <p className="text-gray-400 text-sm">Aún no has confirmado colegiados.</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100">
                <p className="text-sm font-semibold text-gray-700">{misConfirmados.length} confirmados</p>
              </div>
              <div className="divide-y divide-gray-50">
                {misConfirmados.map(c => (
                  <div key={c.codigo} className="px-5 py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{c.nombre_completo}</p>
                      <p className="text-xs text-gray-400">
                        #{c.codigo}{c.regional && ` · ${c.regional}`}
                        {c.confirmacion_at && ` · ${formatFechaCorta(c.confirmacion_at)}`}
                      </p>
                    </div>
                    {c.confirmacion_intencion && (
                      <span className={cn(
                        'text-xs font-semibold px-2.5 py-1 rounded-full shrink-0',
                        INTENCION_COLOR[c.confirmacion_intencion] ?? 'bg-gray-100 text-gray-600'
                      )}>
                        {INTENCION_LABEL[c.confirmacion_intencion] ?? c.confirmacion_intencion}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )
        )}
      </div>

      {/* Modal de confirmación */}
      {colegiadoActivo && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(14,28,66,0.6)' }}
          onClick={() => setColegiadoActivo(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-6 py-4" style={{ backgroundColor: 'var(--color-marino)' }}>
              <p className="text-white font-bold text-base">{colegiadoActivo.nombre_completo}</p>
              <p className="text-blue-200 text-sm">Colegiatura {colegiadoActivo.codigo}</p>
            </div>

            <div className="px-6 py-5 space-y-5">
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-3">¿Cuál es la intención de este colegiado?</p>
                <div className="space-y-2">
                  {[
                    { val: 'favorable', label: '✓ Favorable a George Richardson', color: 'border-green-400 text-green-800', activeColor: 'bg-green-600 text-white border-green-600' },
                    { val: 'indeciso',  label: '~ Indeciso / Por decidir',         color: 'border-yellow-400 text-yellow-800', activeColor: 'bg-yellow-500 text-white border-yellow-500' },
                    { val: 'en_contra', label: '✗ En contra / Otra preferencia',   color: 'border-red-300 text-red-700', activeColor: 'bg-red-500 text-white border-red-500' },
                  ].map(({ val, label, color, activeColor }) => (
                    <button
                      key={val}
                      onClick={() => setIntencion(val)}
                      className={cn(
                        'w-full py-3 rounded-xl font-semibold text-sm border-2 transition-all',
                        intencion === val ? activeColor : `${color} hover:opacity-80`
                      )}
                    >{label}</button>
                  ))}
                </div>
              </div>

              {errorConfirm && (
                <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-xl px-3 py-2">{errorConfirm}</p>
              )}

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setColegiadoActivo(null)}
                  className="py-3 rounded-xl text-sm font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={guardarConfirmacion}
                  disabled={guardando || !intencion}
                  className="py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
                  style={{ backgroundColor: 'var(--color-marino)' }}
                >
                  {guardando ? 'Guardando…' : 'Confirmar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
