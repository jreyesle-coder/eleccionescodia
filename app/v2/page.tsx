import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

export const metadata: Metadata = {
  title: 'Arq. Richardson Presidente – CODIA 2026',
  description: 'Verifícate para votar en las elecciones 2026 del CODIA. Consulta tu número de colegiado o cédula.',
  openGraph: {
    title: 'Arq. Richardson Presidente – CODIA 2026',
    description: 'Verifícate para votar en las elecciones 2026 del CODIA.',
    url: 'https://eleccionescodia.rogapps.com/v2',
    siteName: 'Elecciones CODIA 2026',
    images: [
      {
        url: 'https://eleccionescodia.rogapps.com/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Arq. Richardson Presidente CODIA 2026',
      },
    ],
    locale: 'es_DO',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Arq. Richardson Presidente – CODIA 2026',
    description: 'Verifícate para votar en las elecciones 2026 del CODIA.',
    images: ['https://eleccionescodia.rogapps.com/og-image.jpg'],
  },
}

export default function V2Page() {
  redirect('/home')
}
