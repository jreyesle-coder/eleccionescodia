import type { Metadata } from 'next'
import ConsultaDeuda from '@/components/consulta/ConsultaDeuda'

export const metadata: Metadata = {
  title: 'Consulta de Estado — CODIA 2026',
  description: 'Consulta tu estado de deuda y tu centro de votación con tu número de colegiado o cédula.',
  robots: { index: false, follow: false },
}

export default function DeudaPage() {
  return <ConsultaDeuda />
}
