'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import AppHeader from '@/components/app-header'

interface Props {
  nombre: string
  rol: string
  mesa: string | null
  lugar?: string | null
}

export default function PanelDelegado({ nombre, rol, mesa, lugar }: Props) {
  const supabase = createClient()

  const [busqueda, setBusqueda]   = useState('')
  const [guardando, setGuardando] = useState(false)
  const [totalSesion, setTotalSesion] = useState(0)
  const [ultimoCodigo, setUltimoCodigo] = useState<string | null>(null)
  const [resultado, setResultado] = useState<{
    ok: boolean
    nombre?: string
    habilitado?: boolean
    error?: string
  } | null>(null)

  const buscarYVotar = useCallback(async () => {
    const q = busqueda.trim()
    if (!q || guardando) return
    setGuardando(true)
    setResultado(null)

    const { data, error } = await supabase.rpc('registrar_voto_dia', { p_codigo: q })
    setGuardando(false)
    setBusqueda('')

    if (error) {
      setResultado({ ok: false, error: 'Error al registrar. Intenta de nuevo.' })
      return
    }
    const r = data as { ok: boolean; habilitado?: boolean; error?: string; mesa?: string }
    if (!r.ok) {
      setResultado({ ok: false, error: r.error ?? 'No se pudo registrar.' })
    } else {
      setResultado({ ok: true, habilitado: r.habilitado })
      setUltimoCodigo(q)
      setTotalSesion(n => n + 1)
    }
  }, [supabase, busqueda, guardando])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    buscarYVotar()
  }

  if (!mesa) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: 'var(--color-fondo)' }}>
        <AppHeader nombreUsuario={nombre} rol={rol === 'suplente' ? 'Suplente' : 'Delegado'} />
        <div className="max-w-sm mx-auto px-4 py-16 text-center">
          <p className="text-red-600 font-semibold text-sm">No tienes mesa asignada. Contacta al supervisor.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-fondo)' }}>
      <AppHeader nombreUsuario={nombre} rol={`${rol === 'suplente' ? 'Suplente' : 'Delegado'} · Mesa ${mesa}`} />

      <div className="max-w-sm mx-auto px-4 py-8 space-y-6">

        <div className="text-center">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Tu mesa</p>
          <p className="text-5xl font-black mt-1" style={{ color: 'var(--color-marino)' }}>{mesa}</p>
          {lugar && (
            <p className="text-sm font-semibold text-gray-600 mt-1">{lugar}</p>
          )}
          <p className="text-xs text-gray-400 mt-2">
            Registrados en esta sesión: <span className="font-bold text-gray-600 tabular-nums">{totalSesion}</span>
          </p>
          {ultimoCodigo && (
            <p className="text-xs text-gray-500 mt-1">
              Último registrado: <span className="font-bold tabular-nums" style={{ color: 'var(--color-marino)' }}>{ultimoCodigo}</span>
            </p>
          )}
        </div>

        {/* Feedback del último voto */}
        {resultado && (
          resultado.ok ? (
            <div className={`rounded-2xl px-5 py-5 text-center border-2 ${
              resultado.habilitado
                ? 'bg-green-50 border-green-300'
                : 'bg-orange-50 border-orange-300'
            }`}>
              <p className={`text-2xl font-black ${resultado.habilitado ? 'text-green-700' : 'text-orange-700'}`}>
                {resultado.habilitado ? '✓ Voto registrado' : '⚠ Registrado (no habilitado)'}
              </p>
              {ultimoCodigo && (
                <p className="text-sm font-semibold text-gray-600 mt-1">
                  Colegiatura <span className="font-black tabular-nums">{ultimoCodigo}</span>
                </p>
              )}
              {!resultado.habilitado && (
                <p className="text-orange-700 text-xs mt-2 font-medium">
                  Este colegiado no estaba habilitado. Se registra y se genera alerta.
                </p>
              )}
            </div>
          ) : (
            <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-4 text-center">
              <p className="text-red-700 font-semibold text-sm">{resultado.error}</p>
            </div>
          )
        )}

        {/* Formulario */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <div>
            <p className="text-sm font-bold text-gray-700">Registrar voto</p>
            <p className="text-xs text-gray-400 mt-0.5">Escribe el número de colegiatura</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="text"
              value={busqueda}
              onChange={e => { setBusqueda(e.target.value); setResultado(null) }}
              placeholder="Número de colegiatura…"
              autoFocus
              className="w-full text-2xl font-mono text-center px-4 py-4 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500"
            />
            <button
              type="submit"
              disabled={!busqueda.trim() || guardando}
              className="w-full py-4 rounded-2xl font-bold text-base text-white disabled:opacity-50 transition-all hover:opacity-90"
              style={{ backgroundColor: 'var(--color-marino)' }}
            >
              {guardando ? 'Registrando…' : 'Registrar voto →'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400">Sistema CODIA · Día de Elección 2026</p>
      </div>
    </div>
  )
}
