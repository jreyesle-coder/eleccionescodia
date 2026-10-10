import { redirect } from 'next/navigation'
import { getSessionConRol } from '@/lib/auth'
import AdminCursos from '@/components/presidente/AdminCursos'

export const metadata = { title: 'Administración de Cursos — CODIA', robots: { index: false } }

export default async function AdminCursosPage() {
  const session = await getSessionConRol()
  if (!session || session.rol !== 'presidente') redirect('/')
  return <AdminCursos nombreUsuario={session.nombre} rol={session.rol} />
}
