import { redirect } from 'next/navigation'
import { getSessionConRol } from '@/lib/auth'
import WorkspaceOperador from '@/components/operador/WorkspaceOperador'

export default async function OperadorPage() {
  const session = await getSessionConRol()

  if (!session || session.rol !== 'operador') redirect('/')

  return (
    <WorkspaceOperador
      userId={session.user.id}
      nombreOperador={session.nombre}
    />
  )
}
