import type { Metadata } from 'next'
import FormInscripcionIngles from '@/components/curso/FormInscripcionIngles'

const DESC = 'Disponible para los colegiados del CODIA, con INFOTEP y CIFAL. Regístrate aquí.'

export const metadata: Metadata = {
  metadataBase: new URL('https://curso.rogapps.com'),
  title: 'Curso de Inglés — CODIA',
  description: DESC,
  openGraph: {
    title: 'Curso de Inglés — CODIA',
    description: DESC,
    url: 'https://curso.rogapps.com',
    siteName: 'CODIA',
    type: 'website',
    locale: 'es_DO',
    images: [{
      url: 'https://curso.rogapps.com/curso-ingles-banner.jpg',
      width: 1254,
      height: 1254,
      alt: 'Curso de Inglés para colegiados del CODIA',
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Curso de Inglés — CODIA',
    description: DESC,
    images: ['https://curso.rogapps.com/curso-ingles-banner.jpg'],
  },
}

export default function CursoInglesPage() {
  return <FormInscripcionIngles />
}
