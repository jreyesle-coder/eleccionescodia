import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Cursos — CODIA', description: 'Plan de Capacitación y Actualización Profesional del CODIA.' }

interface Curso { slug: string; titulo: string; descripcion: string | null; banner_url: string | null }

async function getCursos(): Promise<Curso[]> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/cursos?select=slug,titulo,descripcion,banner_url&activo=eq.true&order=created_at.desc`, {
      headers: {
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
      },
      cache: 'no-store',
    })
    if (!res.ok) return []
    return await res.json()
  } catch { return [] }
}

export default async function CursosIndex() {
  const cursos = await getCursos()
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f4f6fb' }}>
      <div className="max-w-2xl mx-auto px-4 py-10">
        <div className="text-center mb-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-codia.png" alt="CODIA" className="h-14 w-auto mx-auto mb-3" />
          <h1 className="text-xl font-extrabold" style={{ color: '#1F3864' }}>Plan de Capacitación y Actualización Profesional</h1>
          <p className="text-sm text-gray-500">Cursos disponibles para los colegiados del CODIA.</p>
          <Link href="/cursos/consulta" className="inline-block mt-2 text-sm font-semibold underline" style={{ color: '#1F3864' }}>
            ¿Ya te inscribiste? Consulta si fuiste seleccionado →
          </Link>
        </div>
        {cursos.length === 0 ? (
          <p className="text-center text-sm text-gray-500 py-10">No hay cursos disponibles en este momento.</p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {cursos.map(c => (
              <Link key={c.slug} href={`/cursos/${c.slug}`} className="block bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                {c.banner_url && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={c.banner_url} alt={c.titulo} className="w-full aspect-square object-cover" />
                )}
                <div className="p-4">
                  <p className="font-bold text-sm" style={{ color: '#1F3864' }}>{c.titulo}</p>
                  {c.descripcion && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{c.descripcion}</p>}
                  <span className="inline-block mt-2 text-xs font-semibold px-3 py-1 rounded-full text-white" style={{ backgroundColor: '#C9A227' }}>Inscribirme →</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
