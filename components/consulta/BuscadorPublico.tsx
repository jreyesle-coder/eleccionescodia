'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface ResultadoBusqueda {
  id: number
  codigo: string
  nombre_completo: string
  cedula: string | null
  telefono: string | null
  celular: string | null
  regional: string | null
  provincia: string | null
  nucleo: string | null
  carrera: string | null
  pensionado: boolean
  nuevo_integrante: boolean
  tiene_deuda: boolean
}

export default function BuscadorPublico() {
  const supabase = createClient()
  const [busqueda, setBusqueda]     = useState('')
  const [resultados, setResultados] = useState<ResultadoBusqueda[]>([])
  const [buscando, setBuscando]     = useState(false)
  const [buscado, setBuscado]       = useState(false)
  const [error, setError]           = useState<string | null>(null)

  // ── Estado para modal de preferencia ──
  const [modalColegiado, setModalColegiado]   = useState<ResultadoBusqueda | null>(null)
  const [cedulaConfirm, setCedulaConfirm]     = useState('')
  const [preferencia, setPreferencia]         = useState<boolean | null>(null)
  const [guardandoVoto, setGuardandoVoto]     = useState(false)
  const [votoGuardado, setVotoGuardado]       = useState<string | null>(null)
  const [errorVoto, setErrorVoto]             = useState<string | null>(null)

  const buscar = useCallback(async (texto: string) => {
    const q = texto.trim()
    if (q.length < 3) return
    setBuscando(true)
    setError(null)
    setBuscado(false)

    const { data, error: err } = await supabase
      .rpc('buscar_colegiado', { p_q: q })

    setBuscando(false)
    setBuscado(true)
    if (err) {
      console.error('SUPABASE ERROR:', err)
      setError('No se pudo realizar la búsqueda. Intenta de nuevo.')
      setResultados([])
      return
    }
    setResultados((data as ResultadoBusqueda[]) ?? [])
  }, [supabase])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    buscar(busqueda)
  }

  function abrirModal(r: ResultadoBusqueda) {
    setModalColegiado(r)
    setCedulaConfirm('')
    setPreferencia(null)
    setVotoGuardado(null)
    setErrorVoto(null)
  }

  async function guardarPreferencia() {
    if (!modalColegiado || preferencia === null || !cedulaConfirm.trim()) return
    setGuardandoVoto(true)
    setErrorVoto(null)
    const { data, error: err } = await supabase.rpc('marcar_preferencia_verificate', {
      p_codigo:     String(modalColegiado.codigo),
      p_cedula:     cedulaConfirm.trim(),
      p_simpatiza:  preferencia,
    })
    setGuardandoVoto(false)
    if (err || !data?.ok) {
      setErrorVoto(data?.error ?? 'La cédula no coincide con el registro. Verifica e intenta de nuevo.')
      return
    }
    setVotoGuardado(data.nombre)
    // Actualizar lista local para que no aparezca "marca tu preferencia" de nuevo
    setResultados(prev => prev.map(r =>
      r.id === modalColegiado.id ? { ...r } : r
    ))
  }

  function habilitadoParaVotar(r: ResultadoBusqueda) {
    return !r.pensionado && !r.tiene_deuda
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-fondo)' }}>
      {/* Encabezado */}
      <div style={{ backgroundColor: 'var(--color-marino)' }} className="px-4 py-5">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/Logo 4.jpg" alt="Verificate" className="h-16 w-auto object-contain" />
          </div>
          <Link href="/login"
            className="text-xs text-blue-200 hover:text-white border border-blue-400 rounded-lg px-3 py-1.5 transition-colors">
            ← Acceso operadores
          </Link>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Búsqueda */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <div>
            <h1 className="text-base font-bold" style={{ color: 'var(--color-marino)' }}>
              Consulta tu habilitación para votar
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">
              Escribe tu nombre, número de colegiatura o cédula
            </p>
          </div>
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              placeholder="Nombre, colegiatura o cédula…"
              minLength={3}
              className="flex-1 text-sm px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:border-transparent"
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
          {busqueda.trim().length > 0 && busqueda.trim().length < 3 && (
            <p className="text-xs text-gray-400">Escribe al menos 3 caracteres</p>
          )}
        </div>

        {error && (
          <p className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</p>
        )}

        {/* Resultados */}
        {buscado && !buscando && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100">
              <p className="text-sm font-semibold text-gray-700">
                {resultados.length === 0 ? 'Sin resultados' : `${resultados.length} resultado${resultados.length !== 1 ? 's' : ''}`}
              </p>
            </div>

            {resultados.length === 0 ? (
              <div className="px-5 py-10 text-center space-y-3">
                <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-3">
                  <p className="text-sm font-medium">No apareces en el padrón habilitado</p>
                </div>
                <p className="text-gray-500 text-sm">
                  Pasa por las <span className="font-semibold">oficinas del CODIA</span> para verificar tu membresía.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {resultados.map(r => {
                  const habil = habilitadoParaVotar(r)
                  return (
                    <div key={r.id} className="px-5 py-4 space-y-3">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div>
                          <p className="font-semibold text-gray-900 text-sm">{r.nombre_completo}</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            Colegiatura {r.codigo}{r.cedula && <> · CI: {r.cedula}</>}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          {habil ? (
                            <span className="inline-flex items-center gap-1.5 bg-green-100 text-green-800 text-xs font-semibold px-3 py-1 rounded-full">
                              ✓ Hábil para votar
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 bg-red-100 text-red-700 text-xs font-semibold px-3 py-1 rounded-full">
                              ✗ No hábil para votar
                            </span>
                          )}
                          {r.pensionado && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">Pensionado</span>
                          )}
                          {r.tiene_deuda && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">Tiene deuda pendiente</span>
                          )}
                          {r.nuevo_integrante && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">Pendiente de certificado</span>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-gray-500">
                        {r.carrera && <span>Profesión: <span className="font-medium text-gray-700">{r.carrera}</span></span>}
                        {r.regional && <span>Regional: <span className="font-medium text-gray-700">{r.regional}</span></span>}
                        {r.provincia && <span>Provincia: <span className="font-medium text-gray-700">{r.provincia}</span></span>}
                        {r.nucleo && <span>Núcleo: <span className="font-medium text-gray-700">{r.nucleo}</span></span>}
                      </div>

                      {/* Botón marcar preferencia */}
                      {!habil && (
                        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-800">
                          <p className="font-semibold">Debes regularizar tu situación para poder votar.</p>
                          <p>Pasa por las oficinas del CODIA.</p>
                        </div>
                      )}
                      <button
                        onClick={() => abrirModal(r)}
                        className="w-full py-2.5 rounded-xl text-sm font-semibold border-2 transition-all hover:opacity-90"
                        style={{
                          borderColor: 'var(--color-marino)',
                          color: 'var(--color-marino)',
                          backgroundColor: 'transparent',
                        }}
                      >
                        Marcar mi preferencia de voto
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        <p className="text-center text-xs text-gray-400 pb-4">Sistema CODIA · Elecciones 2026</p>
      </div>

      {/* ── Modal preferencia de voto ── */}
      {modalColegiado && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(14,28,66,0.6)' }}
          onClick={() => setModalColegiado(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-6 py-4" style={{ backgroundColor: 'var(--color-marino)' }}>
              <p className="text-white font-bold text-base">{modalColegiado.nombre_completo}</p>
              <p className="text-blue-200 text-sm">Colegiatura {modalColegiado.codigo}</p>
            </div>

            <div className="px-6 py-5 space-y-5">
              {votoGuardado ? (
                <div className="text-center space-y-3 py-4">
                  <div className="text-5xl">🎉</div>
                  <p className="font-bold text-green-700 text-lg">¡Preferencia registrada!</p>
                  <p className="text-gray-500 text-sm">Gracias, {votoGuardado}. Tu preferencia ha sido guardada.</p>
                  <button
                    onClick={() => setModalColegiado(null)}
                    className="mt-2 px-6 py-2.5 rounded-xl text-white font-semibold text-sm"
                    style={{ backgroundColor: 'var(--color-marino)' }}
                  >
                    Cerrar
                  </button>
                </div>
              ) : (
                <>
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-1">¿Cuál es tu preferencia de voto?</p>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => setPreferencia(true)}
                        className={`py-4 rounded-xl font-bold text-sm border-2 transition-all ${
                          preferencia === true ? 'bg-green-600 text-white border-green-600' : 'border-green-400 text-green-700 hover:bg-green-50'
                        }`}
                      >
                        ✓ George Richardson
                      </button>
                      <button
                        onClick={() => setPreferencia(false)}
                        className={`py-4 rounded-xl font-bold text-sm border-2 transition-all ${
                          preferencia === false ? 'bg-red-500 text-white border-red-500' : 'border-red-300 text-red-600 hover:bg-red-50'
                        }`}
                      >
                        ✗ Otra preferencia
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide block mb-1.5">
                      Confirma tu número de cédula *
                    </label>
                    <input
                      type="text"
                      value={cedulaConfirm}
                      onChange={e => setCedulaConfirm(e.target.value)}
                      placeholder="Ej: 001-0000000-0"
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                    />
                    <p className="text-xs text-gray-400 mt-1">Solo tú conoces tu cédula — así verificamos tu identidad.</p>
                  </div>

                  {errorVoto && (
                    <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-xl px-3 py-2">{errorVoto}</p>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setModalColegiado(null)}
                      className="py-3 rounded-xl text-sm font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={guardarPreferencia}
                      disabled={guardandoVoto || preferencia === null || !cedulaConfirm.trim()}
                      className="py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
                      style={{ backgroundColor: 'var(--color-marino)' }}
                    >
                      {guardandoVoto ? 'Guardando…' : 'Confirmar'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
