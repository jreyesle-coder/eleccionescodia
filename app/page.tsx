import { redirect } from 'next/navigation'
import { getSessionConRol } from '@/lib/auth'
import Link from 'next/link'
import BuscadorPublico from '@/components/consulta/BuscadorPublico'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Verifícate para Votar — CODIA 2026',
  description: 'Vota por el Arq. Richardson en estas próximas elecciones.',
  openGraph: {
    title: 'Verifícate para Votar — CODIA 2026',
    description: 'Vota por el Arq. Richardson en estas próximas elecciones.',
    images: [
      {
        url: 'https://eleccionescodia.rogapps.com/og-banner.jpg',
        width: 1200,
        height: 630,
        alt: 'Arq. Richardson Presidente — CODIA 2026',
      },
    ],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Verifícate para Votar — CODIA 2026',
    description: 'Vota por el Arq. Richardson en estas próximas elecciones.',
    images: ['https://eleccionescodia.rogapps.com/og-banner.jpg'],
  },
}

export default async function RootPage() {
  const session = await getSessionConRol()

  if (session) {
    const { rol } = session
    if (rol === 'operador')    redirect('/operador')
    if (rol === 'supervisor')  redirect('/supervisor')
    if (rol === 'gerente')     redirect('/gerente')
    if (rol === 'presidente')  redirect('/presidente')
    if (rol === 'dirigente')   redirect('/dirigente')
    if (rol === 'colaborador') redirect('/dirigente')
    if (rol === 'delegado')    redirect('/delegado')
    if (rol === 'suplente')    redirect('/delegado')
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* ── Columna izquierda: foto de campaña ── */}
      <div className="hidden md:flex md:w-1/2 sticky top-0 h-screen overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/Logo 4.jpg"
          alt="Arq. Richardson Presidente"
          className="w-full h-full object-cover object-center"
        />
      </div>

      {/* ── Columna derecha: formulario ── */}
      <div
        className="flex-1 flex flex-col justify-center px-6 py-10 md:py-0"
        style={{ backgroundColor: '#ffffff' }}
      >
        <div className="w-full max-w-sm mx-auto space-y-6">

          {/* Imagen campaña en móvil (en vez de columna izq) */}
          <div className="md:hidden rounded-2xl overflow-hidden shadow-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/Logo 4.jpg" alt="Richardson Presidente" className="w-full h-auto object-contain" />
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
              VERIFÍCATE PARA VOTAR
            </h1>
            <p className="text-sm text-gray-500">
              Asegura tu participación en las elecciones 2026 del CODIA.
            </p>
            <div className="pt-1">
              <div className="h-0.5 w-16 mx-auto rounded-full" style={{ backgroundColor: 'var(--color-dorado)' }} />
            </div>
          </div>

          {/* Instrucción */}
          <p className="text-sm font-semibold text-gray-700 text-center">
            Ingresa tu número de colegiado o cédula:
          </p>

          {/* Buscador inline */}
          <BuscadorPublico inline />

          {/* Botón Plan de Acción */}
          <Link
            href="/plan-accion"
            className="block w-full text-center text-sm font-semibold py-3 px-4 rounded-xl transition-all hover:opacity-80"
            style={{
              backgroundColor: 'var(--color-dorado)',
              color: 'white',
            }}
          >
            Plan de Acción — George Richardson
          </Link>

          {/* Botón Operación de Campaña */}
          <Link
            href="/login"
            className="block w-full text-center text-sm font-semibold py-3 px-4 rounded-xl border-2 transition-all hover:opacity-80"
            style={{
              borderColor: 'var(--color-marino)',
              color: 'white',
              backgroundColor: 'var(--color-marino)',
            }}
          >
            Operación de Campaña
          </Link>

          {/* Disclaimer de seguridad */}
          <div
            className="flex items-start gap-3 rounded-xl px-4 py-3"
            style={{ backgroundColor: '#f4f6fb' }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 mt-0.5 shrink-0 text-gray-400" viewBox="0 0 24 24" fill="currentColor">
              <path fillRule="evenodd" d="M12 1.5l8.485 3.182A1 1 0 0121 5.634V12c0 4.418-3.582 7.5-9 9.75C6.582 19.5 3 16.418 3 12V5.634a1 1 0 01.515-.952L12 1.5z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="text-xs font-semibold text-gray-600">Tu información está segura y protegida.</p>
              <p className="text-xs text-gray-400">Solo se utiliza para validar tu derecho al voto.</p>
            </div>
          </div>

          <p className="text-center text-xs text-gray-300">CODIA · Elecciones 2026</p>
        </div>
      </div>
    </div>
  )
}
