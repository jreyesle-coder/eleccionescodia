'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function AccesoPage() {
  const router = useRouter()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState<string | null>(null)
  const [loading, setLoading]   = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (authError) { setError('Credenciales incorrectas'); return }
    router.push('/')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row">

      {/* ── Columna izquierda: foto campaña ── */}
      <div className="hidden md:flex md:w-1/2 sticky top-0 h-screen items-center justify-center" style={{ backgroundColor: '#0a1832' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/Logo 4.jpg"
          alt="Arq. Richardson Presidente"
          className="w-full h-full object-contain"
        />
      </div>

      {/* ── Columna derecha ── */}
      <div className="flex-1 flex flex-col justify-center px-6 py-10 md:py-0 bg-white">
        <div className="w-full max-w-sm mx-auto space-y-6">

          {/* Botón volver */}
          <div>
            <Link
              href="/home"
              className="inline-flex items-center gap-1.5 text-xs font-semibold transition-opacity hover:opacity-70"
              style={{ color: 'var(--color-marino)' }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 5l-7 7 7 7" />
              </svg>
              Volver al inicio
            </Link>
          </div>

          {/* Icono escudo */}
          <div className="flex justify-center">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center shadow-md"
              style={{ backgroundColor: 'var(--color-marino)' }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path fillRule="evenodd" d="M12 1.5l8.485 3.182A1 1 0 0121 5.634V12c0 4.418-3.582 7.5-9 9.75C6.582 19.5 3 16.418 3 12V5.634a1 1 0 01.515-.952L12 1.5zm3.03 7.22a.75.75 0 10-1.06-1.06L10.5 12.19l-1.47-1.47a.75.75 0 00-1.06 1.06l2 2a.75.75 0 001.06 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
          </div>

          {/* Título */}
          <div className="text-center space-y-1">
            <h1 className="text-2xl font-extrabold tracking-tight" style={{ color: 'var(--color-marino)' }}>
              OPERACIÓN DE CAMPAÑA
            </h1>
            <p className="text-sm text-gray-500">
              Acceso exclusivo para el equipo de trabajo.
            </p>
            <div className="pt-1">
              <div className="h-0.5 w-full rounded-full" style={{ backgroundColor: 'var(--color-dorado)' }} />
            </div>
          </div>

          {/* Formulario de login */}
          <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
            <div className="flex h-1">
              <div className="flex-1" style={{ backgroundColor: 'var(--color-marino)' }} />
              <div className="w-12"  style={{ backgroundColor: 'var(--color-dorado)' }} />
              <div className="w-3"   style={{ backgroundColor: 'var(--color-plancha)' }} />
            </div>
            <div className="p-5 space-y-4">
              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="space-y-1">
                  <label htmlFor="email" className="text-xs font-semibold text-gray-600">Correo electrónico</label>
                  <input
                    id="email" type="email" autoComplete="email" required
                    value={email} onChange={e => setEmail(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:border-transparent"
                    style={{ '--tw-ring-color': 'var(--color-marino)' } as React.CSSProperties}
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="password" className="text-xs font-semibold text-gray-600">Contraseña</label>
                  <input
                    id="password" type="password" autoComplete="current-password" required
                    value={password} onChange={e => setPassword(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:border-transparent"
                  />
                </div>
                {error && (
                  <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
                )}
                <button type="submit" disabled={loading}
                  className="w-full py-3 rounded-lg text-white font-bold text-sm disabled:opacity-70"
                  style={{ backgroundColor: 'var(--color-marino)' }}
                >
                  {loading ? 'Ingresando…' : 'Ingresar'}
                </button>
              </form>
            </div>
          </div>

          <p className="text-center text-xs text-gray-300">CODIA · Elecciones 2026</p>
        </div>
      </div>
    </div>
  )
}
