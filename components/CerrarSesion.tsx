'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function CerrarSesion() {
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <button
      onClick={handleSignOut}
      className="text-sm font-semibold px-4 py-2 rounded-lg border-2 transition-colors hover:bg-blue-50"
      style={{
        color: 'var(--color-marino)',
        borderColor: 'var(--color-marino)',
      }}
    >
      Cerrar sesión
    </button>
  )
}
