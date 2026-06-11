import { redirect } from 'next/navigation'
import { getSessionConRol } from '@/lib/auth'
import Link from 'next/link'

export default async function RootPage() {
  const session = await getSessionConRol()

  if (session) {
    const { rol } = session
    if (rol === 'operador')   redirect('/operador')
    if (rol === 'supervisor') redirect('/supervisor')
    if (rol === 'gerente')    redirect('/gerente')
    if (rol === 'presidente') redirect('/presidente')
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{ background: 'linear-gradient(160deg, #0e1c42 0%, #16285a 60%, #1a3370 100%)' }}
    >
      {/* Logo */}
      <div className="mb-10 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/Logo 3.jpg"
          alt="Elecciones CODIA"
          className="mx-auto max-w-xs w-full h-auto object-contain"
          style={{ maxHeight: 260 }}
        />
      </div>

      {/* Botones */}
      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-sm">
        <Link
          href="/consulta"
          className="flex-1 text-center font-bold text-base py-4 px-6 rounded-2xl transition-all hover:scale-105"
          style={{
            backgroundColor: 'var(--color-dorado)',
            color: '#0e1c42',
          }}
        >
          Verificate para Votar
        </Link>
        <Link
          href="/login"
          className="flex-1 text-center font-bold text-base py-4 px-6 rounded-2xl border-2 transition-all hover:scale-105"
          style={{
            borderColor: 'rgba(255,255,255,0.4)',
            color: 'white',
            backgroundColor: 'rgba(255,255,255,0.08)',
          }}
        >
          Operación de Campaña
        </Link>
      </div>

      <p className="mt-10 text-blue-300 text-xs opacity-60">
        CODIA · Elecciones 2026
      </p>
    </div>
  )
}
