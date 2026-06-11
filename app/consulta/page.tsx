import BuscadorPublico from '@/components/consulta/BuscadorPublico'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Verifícate para Votar — CODIA 2026',
  description: 'Consulta tu habilitación para votar en las elecciones CODIA 2026. Plancha #1 · George Richardson Presidente.',
  openGraph: {
    title: 'Verifícate para Votar — CODIA 2026',
    description: '12 de junio, vota Plancha 1. Consulta si estás habilitado para votar.',
    images: [
      {
        url: '/Logo 4.jpg',
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
    description: '12 de junio, vota Plancha 1.',
    images: ['/Logo 4.jpg'],
  },
}

export default function ConsultaPage() {
  return <BuscadorPublico />
}
