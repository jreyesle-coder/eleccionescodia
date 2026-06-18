import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Encuesta de Diagnóstico CODIA 2026',
  description: 'Vota por el Arq. Richardson en estas próximas elecciones.',
  openGraph: {
    title: 'Encuesta de Diagnóstico CODIA 2026',
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
    title: 'Encuesta de Diagnóstico CODIA 2026',
    description: 'Vota por el Arq. Richardson en estas próximas elecciones.',
    images: ['https://eleccionescodia.rogapps.com/presidente.jpg'],
  },
}

export default function EncuestaLayout({ children }: { children: React.ReactNode }) {
  return children
}
