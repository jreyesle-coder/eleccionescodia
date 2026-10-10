import type { Metadata } from 'next'
import ConsultaInscripcion from '@/components/curso/ConsultaInscripcion'

export const metadata: Metadata = {
  title: 'Consulta de selección — Cursos CODIA',
  description: 'Verifica el estado de tu inscripción a los cursos del CODIA.',
  robots: { index: false },
}

export default function ConsultaPage() {
  return <ConsultaInscripcion />
}
