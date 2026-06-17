import { redirect } from 'next/navigation'
import { getSessionConRol } from '@/lib/auth'
import PanelDirigente from '@/components/dirigente/PanelDirigente'

export default async function DirigentePage() {
  const session = await getSessionConRol()

  if (!session || !['dirigente', 'colaborador'].includes(session.rol)) redirect('/')

  return (
    <PanelDirigente
      userId={session.user.id}
      nombre={session.nombre}
      rol={session.rol}
    />
  )
}
