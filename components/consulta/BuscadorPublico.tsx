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
}

export default function BuscadorPublico() {
  const supabase = createClient()
  const [busqueda, setBusqueda] = useState('')
  const [resultados, setResultados] = useState<ResultadoBusqueda[]>([])
  const [buscando, setBuscando] = useState(false)
  const [buscado, setBuscado] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const buscar = useCallback(async (texto: string) => {
    const q = texto.trim()
    if (q.length < 3) return
    setBuscando(true)
    setError(null)
    setBuscado(false)

    // Buscar por nombre_completo, codigo (colegiatura) o cedula
    const { data, error: err } = await supabase
      .from('padron')
      .select('id, codigo, nombre_completo, cedula, telefono, celular, regional, provincia, nucleo, carrera, pensionado, nuevo_integrante')
      .or(`nombre_completo.ilike.%${q}%,codigo.ilike.%${q}%,cedula.ilike.%${q}%`)
      .order('nombre_completo', { ascending: true })
      .limit(50)

    setBuscando(false)
    setBuscado(true)
    if (err) {
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

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-fondo)' }}>
      {/* Encabezado */}
      <div style={{ backgroundColor: 'var(--color-marino)' }} className="px-4 py-5">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
          <div>
            <p className="text-white font-bold text-xl leading-tight">Verificate</p>
            <p className="text-blue-200 text-xs mt-0.5">CODIA · Elecciones 2026</p>
          </div>
          <Link
            href="/login"
            className="text-xs text-blue-200 hover:text-white border border-blue-400 rounded-lg px-3 py-1.5 transition-colors"
          >
            ← Acceso operadores
          </Link>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Caja de búsqueda */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <div>
            <h1 className="text-base font-bold" style={{ color: 'var(--color-marino)' }}>
              Consulta tu habilitación para votar
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">
              Escribe tu nombre, número de colegiatura o cédula para verificar si estás en el padrón del CODIA
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
              className="px-5 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-50 transition-opacity"
              style={{ backgroundColor: 'var(--color-marino)' }}
            >
              {buscando ? 'Buscando…' : 'Buscar'}
            </button>
          </form>

          {busqueda.trim().length > 0 && busqueda.trim().length < 3 && (
            <p className="text-xs text-gray-400">Escribe al menos 3 caracteres para buscar</p>
          )}
        </div>

        {/* Error */}
        {error && (
          <p className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</p>
        )}

        {/* Resultados */}
        {buscado && !buscando && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-700">
                {resultados.length === 0
                  ? 'Sin resultados'
                  : `${resultados.length} resultado${resultados.length !== 1 ? 's' : ''}`}
              </p>
              {resultados.length === 50 && (
                <p className="text-xs text-gray-400">Mostrando los primeros 50 — afina la búsqueda</p>
              )}
            </div>

            {resultados.length === 0 ? (
              <div className="px-5 py-10 text-center space-y-3">
                <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-3">
                  <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15.75h.007v.008H12v-.008z" />
                  </svg>
                  <p className="text-sm font-medium">No apareces en el padrón habilitado</p>
                </div>
                <p className="text-gray-500 text-sm">
                  Pasa por las <span className="font-semibold">oficinas del CODIA</span> para verificar y normalizar tu membresía.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {resultados.map(r => (
                  <div key={r.id} className="px-5 py-4 space-y-2">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">{r.nombre_completo}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          Colegiatura {r.codigo}
                          {r.cedula && <> · CI: {r.cedula}</>}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="inline-flex items-center gap-1.5 bg-green-100 text-green-800 text-xs font-semibold px-3 py-1 rounded-full shrink-0">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                          Hábil para votar
                        </span>
                        {r.pensionado && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">Pensionado</span>
                        )}
                        {r.nuevo_integrante && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800">Nuevo integrante</span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-gray-500">
                      {r.carrera && (
                        <span>Profesión: <span className="font-medium text-gray-700">{r.carrera}</span></span>
                      )}
                      {r.regional && (
                        <span>Regional: <span className="font-medium text-gray-700">{r.regional}</span></span>
                      )}
                      {r.provincia && (
                        <span>Provincia: <span className="font-medium text-gray-700">{r.provincia}</span></span>
                      )}
                      {r.nucleo && (
                        <span>Núcleo: <span className="font-medium text-gray-700">{r.nucleo}</span></span>
                      )}
                      {r.telefono && (
                        <span>Tel: <span className="font-medium">{r.telefono}</span></span>
                      )}
                      {r.celular && r.celular !== r.telefono && (
                        <span>Cel: <span className="font-medium">{r.celular}</span></span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <p className="text-center text-xs text-gray-400 pb-4">
          Sistema CODIA · Elecciones 2026
        </p>
      </div>
    </div>
  )
}
