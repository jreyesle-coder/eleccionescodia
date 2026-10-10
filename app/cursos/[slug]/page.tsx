import type { Metadata } from 'next'
import FormCurso from '@/components/curso/FormCurso'

const BASE = 'https://curso.rogapps.com'

async function getCurso(slug: string) {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/get_curso`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
      },
      body: JSON.stringify({ p_slug: slug }),
      cache: 'no-store',
    })
    if (!res.ok) return null
    return await res.json()
  } catch { return null }
}

const absUrl = (u: string | null) => !u ? null : (u.startsWith('http') ? u : `${BASE}${u}`)

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const c = await getCurso(params.slug)
  if (!c) return { title: 'Curso — CODIA' }
  const img = absUrl(c.banner_url)
  const desc = c.descripcion || 'Inscripción abierta. Regístrate aquí.'
  return {
    title: `${c.titulo} — CODIA`,
    description: desc,
    openGraph: {
      title: `${c.titulo} — CODIA`, description: desc, url: `${BASE}/cursos/${params.slug}`,
      siteName: 'CODIA', type: 'website', locale: 'es_DO',
      images: img ? [{ url: img }] : undefined,
    },
    twitter: { card: 'summary_large_image', title: `${c.titulo} — CODIA`, description: desc, images: img ? [img] : undefined },
  }
}

export default function CursoPage({ params }: { params: { slug: string } }) {
  return <FormCurso slug={params.slug} />
}
