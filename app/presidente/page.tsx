import { redirect } from 'next/navigation'
import { getSessionConRol } from '@/lib/auth'
import DashboardPresidente from '@/components/presidente/DashboardPresidente'

export default async function PresidentePage() {
  const session = await getSessionConRol()

  if (!session || session.rol !== 'presidente') redirect('/')

  return (
    <DashboardPresidente
      nombreUsuario={session.nombre}
      rol={session.rol}
    />
  )
}
