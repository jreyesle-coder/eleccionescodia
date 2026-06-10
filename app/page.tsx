import { redirect } from 'next/navigation'
import { getSessionConRol } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'

export default async function RootPage() {
  const session = await getSessionConRol()

  if (!session) {
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/login')
  }

  const { rol } = session

  if (rol === 'operador') redirect('/operador')
  if (rol === 'supervisor') redirect('/supervisor')
  if (rol === 'gerente') redirect('/gerente')
  if (rol === 'presidente') redirect('/presidente')

  // Rol desconocido — sin acceso
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
