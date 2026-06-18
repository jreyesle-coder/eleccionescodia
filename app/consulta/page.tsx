import BuscadorPublico from '@/components/consulta/BuscadorPublico'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Verifícate para Votar — CODIA 2026',
  description: 'Por un CODIA más fuerte, moderno y transparente. Arq. Richardson Presidente.',
  openGraph: {
    title: 'Verifícate para Votar — CODIA 2026',
    description: 'Por un CODIA más fuerte, moderno y transparente. Arq. Richardson Presidente.',
    images: [
      {
        url: 'https://eleccionescodia.rogapps.com/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Verifícate para Votar — CODIA 2026',
      },
    ],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Verifícate para Votar — CODIA 2026',
    description: 'Por un CODIA más fuerte, moderno y transparente. Arq. Richardson Presidente.',
    images: ['https://eleccionescodia.rogapps.com/og-image.jpg'],
  },
}

export default function ConsultaPage() {
  return <BuscadorPublico />
}
