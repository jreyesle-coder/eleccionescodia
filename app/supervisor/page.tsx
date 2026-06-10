import { redirect } from 'next/navigation'
import { getSessionConRol } from '@/lib/auth'
import PanelSupervisor from '@/components/supervisor/PanelSupervisor'

export default async function SupervisorPage() {
  const session = await getSessionConRol()

  if (!session || session.rol !== 'supervisor') redirect('/')

  return (
    <PanelSupervisor
      userId={session.user.id}
      nombreSupervisor={session.nombre}
    />
  )
}
