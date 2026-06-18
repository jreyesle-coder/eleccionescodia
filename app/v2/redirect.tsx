'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function V2Redirect() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/home')
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <p className="text-sm text-gray-400">Cargando…</p>
    </div>
  )
}
