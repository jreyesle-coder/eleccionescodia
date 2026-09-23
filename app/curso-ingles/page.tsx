import type { Metadata } from 'next'
import FormInscripcionIngles from '@/components/curso/FormInscripcionIngles'

export const metadata: Metadata = {
  title: 'Curso de Inglés — CODIA',
  description: 'Inscripción al Curso de Inglés para colegiados del CODIA, con INFOTEP y CIFAL República Dominicana.',
}

export default function CursoInglesPage() {
  return <FormInscripcionIngles />
}
