import type { Metadata } from 'next'
import VerificaRedirect from './redirect'

export const metadata: Metadata = {
  title: 'Verifícate para Votar — CODIA 2026',
  description: 'Vota por el Arq. Richardson en estas próximas elecciones.',
  openGraph: {
    title: 'Verifícate para Votar — CODIA 2026',
    description: 'Vota por el Arq. Richardson en estas próximas elecciones.',
    images: [
      {
        url: 'https://eleccionescodia.rogapps.com/presidente.jpg',
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
    images: ['https://eleccionescodia.rogapps.com/presidente.jpg'],
  },
}

export default function VerificaPage() {
  return <VerificaRedirect />
}
