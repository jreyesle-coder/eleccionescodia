'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

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
    <main
      className="min-h-screen flex flex-col md:flex-row"
      style={{ background: 'linear-gradient(160deg, #0e1c42 0%, #16285a 60%, #1a3370 100%)' }}
    >
      {/* ── Mitad izquierda: Logo 3 ── */}
      <div className="flex-1 flex items-center justify-center p-8 md:p-12">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/Logo 3.jpg"
          alt="Elecciones CODIA"
          className="w-full max-w-sm h-auto object-contain"
        />
      </div>

      {/* ── Mitad derecha: formulario ── */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 md:p-12 gap-4">
        {/* Botón verificate */}
        <Link
          href="/consulta"
          className="w-full max-w-sm text-center font-bold text-base py-4 px-6 rounded-2xl transition-all hover:scale-105"
          style={{ backgroundColor: 'var(--color-dorado)', color: '#0e1c42' }}
        >
          Verifícate para Votar
        </Link>

        {/* Tarjeta login */}
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Acento superior */}
          <div className="flex h-1">
            <div className="flex-1" style={{ backgroundColor: 'var(--color-marino)' }} />
            <div className="w-12" style={{ backgroundColor: 'var(--color-dorado)' }} />
            <div className="w-3" style={{ backgroundColor: 'var(--color-plancha)' }} />
          </div>

          <div className="p-8 space-y-6">
            <div className="text-center space-y-1">
              <h1 className="text-xl font-bold tracking-tight" style={{ color: 'var(--color-marino)' }}>
                Operación de Campaña
              </h1>
              <p className="text-sm text-gray-400">Ingresa tus credenciales para continuar</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="email" className="text-sm font-semibold" style={{ color: 'var(--color-marino)' }}>
                  Correo electrónico
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:border-transparent transition-shadow"
                  style={{ '--tw-ring-color': 'var(--color-marino)' } as React.CSSProperties}
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="password" className="text-sm font-semibold" style={{ color: 'var(--color-marino)' }}>
                  Contraseña
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:border-transparent transition-shadow"
                />
              </div>

              {error && (
                <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-lg text-white font-bold text-sm transition-opacity disabled:opacity-70"
                style={{ backgroundColor: 'var(--color-marino)' }}
              >
                {loading ? 'Ingresando…' : 'Ingresar'}
              </button>
            </form>
          </div>
        </div>

        <p className="text-xs text-blue-300 opacity-60">CODIA · Elecciones 2026</p>
      </div>
    </main>
  )
}
