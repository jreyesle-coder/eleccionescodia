import { redirect } from 'next/navigation'
import { getSessionConRol } from '@/lib/auth'
import DashboardGerente from '@/components/gerente/DashboardGerente'

export default async function GerentePage() {
  const session = await getSessionConRol()

  // El presidente tiene su propio portal en /presidente
  if (!session || session.rol !== 'gerente') redirect('/')

  return (
    <DashboardGerente
      nombreGerente={session.nombre}
      rol={session.rol}
    />
  )
}
