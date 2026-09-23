import { redirect } from 'next/navigation'
import { getSessionConRol } from '@/lib/auth'
import InscripcionesCurso from '@/components/presidente/InscripcionesCurso'

export const metadata = { title: 'Inscritos Curso de Inglés — CODIA', robots: { index: false } }

export default async function InscripcionesCursoPage() {
  const session = await getSessionConRol()
  if (!session || session.rol !== 'presidente') redirect('/')
  return <InscripcionesCurso nombreUsuario={session.nombre} rol={session.rol} />
}
