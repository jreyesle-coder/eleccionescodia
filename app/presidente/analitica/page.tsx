import { redirect } from 'next/navigation'
import { getSessionConRol } from '@/lib/auth'
import DashboardPadron from '@/components/presidente/DashboardPadron'

export const metadata = { title: 'Analítica del Padrón — CODIA', robots: { index: false } }

export default async function AnaliticaPage() {
  const session = await getSessionConRol()
  if (!session || session.rol !== 'presidente') redirect('/')
  return <DashboardPadron nombreUsuario={session.nombre} rol={session.rol} />
}
