import { redirect } from 'next/navigation'
import { getSessionConRol } from '@/lib/auth'
import PanelDelegado from '@/components/delegado/PanelDelegado'
import { createClient } from '@/lib/supabase/server'

export default async function DelegadoPage() {
  const session = await getSessionConRol()

  if (!session || !['delegado', 'suplente'].includes(session.rol)) redirect('/')

  const supabase = await createClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('mesa')
    .eq('id', session.user.id)
    .single()

  const mesa = profile?.mesa ?? null

  let lugar: string | null = null
  if (mesa) {
    const { data: mesaInfo } = await supabase
      .from('mesas')
      .select('etiqueta')
      .eq('numero', Number(mesa))
      .single()
    lugar = mesaInfo?.etiqueta ?? null
  }

  return (
    <PanelDelegado
      nombre={session.nombre}
      rol={session.rol}
      mesa={mesa}
      lugar={lugar}
    />
  )
}
