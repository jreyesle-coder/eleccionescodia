import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Plan de Acción — George Richardson | CODIA 2026',
  description: 'Conoce el Plan de Acción de George Richardson para el CODIA 2026-2027.',
}

export default function PlanAccionPage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0E1C42' }}>

      {/* Header */}
      <div className="w-full py-6 px-6 text-center">
        <h1 className="text-xl md:text-2xl font-extrabold text-white tracking-tight">
          PLAN DE ACCIÓN
        </h1>
        <p className="text-sm font-semibold mt-1" style={{ color: 'var(--color-dorado)' }}>
          George Richardson — CODIA 2026
        </p>
        <div className="mt-3 h-0.5 w-16 mx-auto rounded-full" style={{ backgroundColor: 'var(--color-dorado)' }} />
      </div>

      {/* Páginas del brochure */}
      <div className="max-w-3xl mx-auto px-2 pb-4 space-y-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/plan-accion-imgs/page_1.png"
          alt="Plan de Acción — Primeros 100 días e Indicadores de Éxito"
          className="w-full rounded-xl shadow-lg"
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/plan-accion-imgs/page_2.png"
          alt="10 Ejes Estratégicos de Transformación Institucional"
          className="w-full rounded-xl shadow-lg"
        />
      </div>

      {/* CTA sticky */}
      <div className="sticky bottom-0 w-full px-4 py-4 border-t border-white/10 shadow-lg" style={{ backgroundColor: '#0E1C42' }}>
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row gap-3">
          <Link
            href="/home"
            className="flex-1 text-center text-sm font-bold py-3 px-4 rounded-xl transition-all hover:opacity-90"
            style={{ backgroundColor: 'var(--color-dorado)', color: 'white' }}
          >
            ✓ Verifícate para Votar
          </Link>
          <Link
            href="/encuesta"
            className="flex-1 text-center text-sm font-bold py-3 px-4 rounded-xl border-2 transition-all hover:opacity-80"
            style={{ borderColor: 'var(--color-dorado)', color: 'var(--color-dorado)', backgroundColor: 'transparent' }}
          >
            Queremos Conocer Tu Opinión
          </Link>
        </div>
      </div>

    </div>
  )
}
