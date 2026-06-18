'use client'

import Link from 'next/link'
import BuscadorPublico from '@/components/consulta/BuscadorPublico'

export default function HomePage() {
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

          {/* Imagen campaña en móvil */}
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
              <div className="h-0.5 w-full rounded-full" style={{ backgroundColor: 'var(--color-dorado)' }} />
            </div>
          </div>

          {/* Instrucción */}
          <p className="text-sm font-semibold text-gray-700 text-center">
            Ingresa tu número de colegiado o cédula:
          </p>

          {/* Buscador inline */}
          <BuscadorPublico inline />

          {/* Botón Operación de Campaña */}
          <div className="space-y-3">
            <Link
              href="/acceso"
              className="block w-full text-center text-sm font-semibold py-3 px-4 rounded-xl border-2 transition-all hover:opacity-80"
              style={{
                borderColor: 'var(--color-marino)',
                color: 'var(--color-marino)',
                backgroundColor: 'transparent',
              }}
            >
              Operación de Campaña
            </Link>
            <div className="h-0.5 w-full rounded-full" style={{ backgroundColor: 'var(--color-dorado)' }} />
          </div>

          {/* Disclaimer de seguridad */}
          <div className="flex items-start gap-3 rounded-xl px-4 py-3" style={{ backgroundColor: '#f4f6fb' }}>
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
