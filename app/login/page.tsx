'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import Marca from '@/components/marca'

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
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ backgroundColor: 'var(--color-fondo)' }}
    >
      {/* ── Decoración geométrica: esquina superior izquierda ── */}
      <div className="pointer-events-none select-none absolute inset-0 overflow-hidden">
        {/* Bloque grande azul marino — esquina sup izq */}
        <div
          className="absolute -top-16 -left-16 w-72 h-72 rounded-3xl rotate-12"
          style={{ backgroundColor: 'var(--color-marino)', opacity: 0.07 }}
        />
        {/* Cuadrado mediano dorado — sup izq, desplazado */}
        <div
          className="absolute top-12 left-24 w-28 h-28 rounded-xl rotate-12"
          style={{ backgroundColor: 'var(--color-dorado)', opacity: 0.12 }}
        />
        {/* Línea delgada azul — diagonal sup */}
        <div
          className="absolute top-32 -left-8 w-64 h-1 rotate-12"
          style={{ backgroundColor: 'var(--color-marino)', opacity: 0.15 }}
        />
        {/* Bloque grande — esquina inf der */}
        <div
          className="absolute -bottom-20 -right-20 w-80 h-80 rounded-3xl -rotate-12"
          style={{ backgroundColor: 'var(--color-real)', opacity: 0.07 }}
        />
        {/* Cuadrado mediano rojo — inf der */}
        <div
          className="absolute bottom-16 right-28 w-24 h-24 rounded-xl -rotate-12"
          style={{ backgroundColor: 'var(--color-plancha)', opacity: 0.09 }}
        />
        {/* Cuadrado pequeño dorado — inf der */}
        <div
          className="absolute bottom-40 right-14 w-12 h-12 rounded-lg -rotate-6"
          style={{ backgroundColor: 'var(--color-dorado)', opacity: 0.18 }}
        />
        {/* Franja lateral izquierda — acento marino */}
        <div
          className="absolute top-0 left-0 w-1.5 h-full"
          style={{ background: `linear-gradient(to bottom, var(--color-marino), var(--color-dorado), var(--color-marino))`, opacity: 0.35 }}
        />
      </div>

      {/* ── Contenido centrado ── */}
      <div className="relative z-10 w-full max-w-sm px-4 space-y-6">
        {/* Marca sobre blanco — separada de la tarjeta */}
        <div className="flex flex-col items-center gap-3">
          <div className="bg-white rounded-2xl px-6 py-4 shadow-sm border border-gray-100 w-full flex justify-center">
            <Marca />
          </div>
          <Link
            href="/consulta"
            className="w-full text-center text-sm font-semibold px-4 py-2.5 rounded-xl border-2 bg-white hover:bg-gray-50 transition-colors"
            style={{ color: 'var(--color-marino)', borderColor: 'var(--color-marino)' }}
          >
            Verificate para Votar
          </Link>
        </div>

        {/* Tarjeta de acceso */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 space-y-6">
          {/* Acento superior */}
          <div className="flex h-1 -mx-8 -mt-8 mb-6 rounded-t-2xl overflow-hidden">
            <div className="flex-1" style={{ backgroundColor: 'var(--color-marino)' }} />
            <div className="w-12" style={{ backgroundColor: 'var(--color-dorado)' }} />
            <div className="w-3" style={{ backgroundColor: 'var(--color-plancha)' }} />
          </div>

          <div className="text-center space-y-1">
            <h1 className="text-xl font-bold tracking-tight" style={{ color: 'var(--color-marino)' }}>
              Acceso al sistema
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
              className="w-full py-3 rounded-lg text-white font-bold text-sm transition-opacity disabled:opacity-70 mt-2"
              style={{ backgroundColor: 'var(--color-marino)' }}
            >
              {loading ? 'Ingresando…' : 'Ingresar'}
            </button>
          </form>
        </div>

        <div className="flex justify-center">
          <p className="text-xs text-gray-400">Elecciones CODIA · Sistema confidencial</p>
        </div>
      </div>
    </main>
  )
}
