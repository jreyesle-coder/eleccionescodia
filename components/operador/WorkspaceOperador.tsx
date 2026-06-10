'use client'

import AppHeader from '@/components/app-header'
import WorkspaceBase from '@/components/workspace/WorkspaceBase'

interface Props {
  userId: string
  nombreOperador: string
}

export default function WorkspaceOperador({ userId, nombreOperador }: Props) {
  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-fondo)' }}>
      <AppHeader nombreUsuario={nombreOperador} rol="Operador" />
      <WorkspaceBase userId={userId} modo="pool" />
    </div>
  )
}
