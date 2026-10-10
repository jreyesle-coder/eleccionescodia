'use client'
/* eslint-disable @next/next/no-img-element */

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import AppHeader from '@/components/app-header'

const MARINO = '#1F3864'
const DORADO = '#C9A227'

interface Curso {
  id: string; slug: string; titulo: string; descripcion: string | null; banner_url: string | null
  requisitos: string[]; documentos: { key: string; label: string }[]
  limite: number; max_registros: number
  requiere_aprobacion: boolean; solo_colegiados: boolean; bloquear_con_deuda: boolean; activo: boolean
}
interface Insc {
  id: string; nombre: string; cedula: string; telefono: string | null; email: string | null
  colegiatura: number | null; nucleo: string | null; docs: Record<string, string>; estado: string; created_at: string
}
interface Props { nombreUsuario: string; rol: string }

const vacio: Partial<Curso> = {
  slug: '', titulo: '', descripcion: '', banner_url: '', requisitos: [], documentos: [],
  limite: 40, max_registros: 80, requiere_aprobacion: true, solo_colegiados: true, bloquear_con_deuda: true, activo: true,
}

export default function AdminCursos({ nombreUsuario, rol }: Props) {
  const supabase = createClient()
  const [cursos, setCursos] = useState<Curso[]>([])
  const [vista, setVista] = useState<'lista' | 'form' | 'inscritos'>('lista')
  const [sel, setSel] = useState<Curso | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  const cargarCursos = useCallback(async () => {
    const { data } = await supabase.from('cursos').select('*').order('created_at', { ascending: false })
    setCursos((data as Curso[]) ?? [])
  }, [supabase])
  useEffect(() => { cargarCursos() }, [cargarCursos])

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader nombreUsuario={nombreUsuario} rol={rol} />
      <div className="max-w-6xl mx-auto px-4 py-6">
        {msg && <div className="mb-3 text-sm rounded-lg bg-blue-50 border border-blue-200 text-blue-800 px-3 py-2">{msg}</div>}
        {vista === 'lista' && <ListaCursos cursos={cursos} onNuevo={() => { setSel(null); setVista('form') }}
          onEditar={c => { setSel(c); setVista('form') }} onInscritos={c => { setSel(c); setVista('inscritos') }} />}
        {vista === 'form' && <FormCursoAdmin inicial={sel} onVolver={() => setVista('lista')}
          onGuardado={async (t) => { setMsg(t); await cargarCursos(); setVista('lista') }} />}
        {vista === 'inscritos' && sel && <Inscritos curso={sel} onVolver={() => setVista('lista')} />}
      </div>
    </div>
  )
}

function ListaCursos({ cursos, onNuevo, onEditar, onInscritos }: {
  cursos: Curso[]; onNuevo: () => void; onEditar: (c: Curso) => void; onInscritos: (c: Curso) => void
}) {
  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-extrabold" style={{ color: MARINO }}>Cursos</h1>
        <button onClick={onNuevo} className="px-4 py-2 rounded-lg text-white text-sm font-semibold" style={{ backgroundColor: MARINO }}>+ Nuevo curso</button>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cursos.map(c => (
          <div key={c.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            {c.banner_url && /* eslint-disable-next-line @next/next/no-img-element */ <img src={c.banner_url} alt={c.titulo} className="w-full aspect-square object-cover" />}
            <div className="p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="font-bold text-sm" style={{ color: MARINO }}>{c.titulo}</p>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${c.activo ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-600'}`}>{c.activo ? 'Activo' : 'Inactivo'}</span>
              </div>
              <p className="text-xs text-gray-500">/{c.slug} · cupo {c.limite} · tope {c.max_registros}{c.requiere_aprobacion ? ' · con aprobación' : ''}</p>
              <div className="flex gap-2 pt-1">
                <button onClick={() => onInscritos(c)} className="flex-1 text-xs font-semibold py-1.5 rounded-lg text-white" style={{ backgroundColor: DORADO }}>Inscritos</button>
                <button onClick={() => onEditar(c)} className="flex-1 text-xs font-semibold py-1.5 rounded-lg border" style={{ borderColor: MARINO, color: MARINO }}>Editar</button>
                <a href={`https://curso.rogapps.com/${c.slug}`} target="_blank" rel="noreferrer" className="text-xs font-semibold py-1.5 px-2 rounded-lg border border-gray-200 text-gray-600">Link</a>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

function FormCursoAdmin({ inicial, onVolver, onGuardado }: {
  inicial: Curso | null; onVolver: () => void; onGuardado: (msg: string) => void
}) {
  const supabase = createClient()
  const base = inicial ?? (vacio as Curso)
  const [f, setF] = useState({
    slug: base.slug || '', titulo: base.titulo || '', descripcion: base.descripcion || '', banner_url: base.banner_url || '',
    requisitos: (base.requisitos || []).join('\n'),
    documentos: (base.documentos || []).map(d => `${d.key}|${d.label}`).join('\n'),
    limite: base.limite ?? 40, max_registros: base.max_registros ?? 80,
    requiere_aprobacion: base.requiere_aprobacion ?? true, solo_colegiados: base.solo_colegiados ?? true,
    bloquear_con_deuda: base.bloquear_con_deuda ?? true, activo: base.activo ?? true,
  })
  const [banner, setBanner] = useState<File | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function guardar(e: React.FormEvent) {
    e.preventDefault(); setErr(null)
    if (!f.titulo.trim() || !f.slug.trim()) { setErr('Título y slug son obligatorios.'); return }
    if (!/^[a-z0-9-]+$/.test(f.slug)) { setErr('El slug solo puede tener minúsculas, números y guiones (ej. facilitadores).'); return }
    setGuardando(true)
    try {
      let bannerUrl = f.banner_url
      if (banner) {
        const ext = (banner.name.split('.').pop() || 'jpg').toLowerCase()
        const path = `${f.slug}-${Date.now()}.${ext}`
        const up = await supabase.storage.from('cursos-banners').upload(path, banner, { upsert: true })
        if (up.error) throw new Error('Banner: ' + up.error.message)
        bannerUrl = supabase.storage.from('cursos-banners').getPublicUrl(path).data.publicUrl
      }
      const documentos = f.documentos.split('\n').map(l => l.trim()).filter(Boolean).map(l => {
        const [key, ...rest] = l.split('|'); return { key: key.trim(), label: (rest.join('|') || key).trim() }
      })
      const requisitos = f.requisitos.split('\n').map(l => l.trim()).filter(Boolean)
      const payload = {
        slug: f.slug.trim(), titulo: f.titulo.trim(), descripcion: f.descripcion.trim() || null, banner_url: bannerUrl || null,
        requisitos, documentos, limite: Number(f.limite), max_registros: Number(f.max_registros),
        requiere_aprobacion: f.requiere_aprobacion, solo_colegiados: f.solo_colegiados,
        bloquear_con_deuda: f.bloquear_con_deuda, activo: f.activo,
      }
      const resp = inicial
        ? await supabase.from('cursos').update(payload).eq('id', inicial.id)
        : await supabase.from('cursos').insert(payload)
      if (resp.error) {
        if ((resp.error as { code?: string }).code === '23505') throw new Error('Ya existe un curso con ese slug.')
        throw new Error(resp.error.message)
      }
      onGuardado(inicial ? 'Curso actualizado.' : 'Curso creado.')
    } catch (e2) { setErr(e2 instanceof Error ? e2.message : 'No se pudo guardar.') }
    finally { setGuardando(false) }
  }

  const inp = 'w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2'
  const ring = { ['--tw-ring-color' as string]: MARINO } as React.CSSProperties
  const lbl = 'text-xs font-semibold text-gray-600 block mb-1'

  return (
    <div className="max-w-xl">
      <button onClick={onVolver} className="text-sm font-semibold mb-3" style={{ color: MARINO }}>← Volver</button>
      <h1 className="text-xl font-extrabold mb-4" style={{ color: MARINO }}>{inicial ? 'Editar curso' : 'Nuevo curso'}</h1>
      <form onSubmit={guardar} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-3">
        <div><label className={lbl}>Título</label><input className={inp} style={ring} value={f.titulo} onChange={e => setF({ ...f, titulo: e.target.value })} /></div>
        <div><label className={lbl}>Slug (para el link: curso.rogapps.com/<b>slug</b>)</label><input className={inp} style={ring} value={f.slug} onChange={e => setF({ ...f, slug: e.target.value })} placeholder="facilitadores" disabled={!!inicial} /></div>
        <div><label className={lbl}>Descripción</label><textarea className={inp} style={ring} rows={2} value={f.descripcion} onChange={e => setF({ ...f, descripcion: e.target.value })} /></div>
        <div>
          <label className={lbl}>Banner / flyer {f.banner_url && <span className="text-gray-400">(hay uno cargado)</span>}</label>
          <input type="file" accept="image/*" onChange={e => setBanner(e.target.files?.[0] ?? null)} className="w-full text-sm" />
        </div>
        <div><label className={lbl}>Requisitos (uno por línea)</label><textarea className={inp} style={ring} rows={4} value={f.requisitos} onChange={e => setF({ ...f, requisitos: e.target.value })} placeholder={'Copia de cédula\nCopia de título'} /></div>
        <div><label className={lbl}>Documentos a subir (uno por línea, formato <code>clave|Etiqueta</code>)</label><textarea className={inp} style={ring} rows={3} value={f.documentos} onChange={e => setF({ ...f, documentos: e.target.value })} placeholder={'cedula|Copia de cédula\ntitulo|Copia de título'} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={lbl}>Cupo real (aprobados)</label><input type="number" className={inp} style={ring} value={f.limite} onChange={e => setF({ ...f, limite: Number(e.target.value) })} /></div>
          <div><label className={lbl}>Tope de registros</label><input type="number" className={inp} style={ring} value={f.max_registros} onChange={e => setF({ ...f, max_registros: Number(e.target.value) })} /></div>
        </div>
        <div className="space-y-1.5 pt-1">
          {([['requiere_aprobacion', 'Requiere aprobación del administrador'], ['solo_colegiados', 'Solo colegiados'], ['bloquear_con_deuda', 'Bloquear si tiene deuda'], ['activo', 'Curso activo (visible)']] as const).map(([k, t]) => (
            <label key={k} className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={f[k] as boolean} onChange={e => setF({ ...f, [k]: e.target.checked })} /> {t}
            </label>
          ))}
        </div>
        {err && <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{err}</p>}
        <button type="submit" disabled={guardando} className="w-full py-2.5 rounded-lg text-white text-sm font-bold disabled:opacity-50" style={{ backgroundColor: DORADO }}>
          {guardando ? 'Guardando…' : (inicial ? 'Guardar cambios' : 'Crear curso')}
        </button>
      </form>
    </div>
  )
}

function Inscritos({ curso, onVolver }: { curso: Curso; onVolver: () => void }) {
  const supabase = createClient()
  const [rows, setRows] = useState<Insc[]>([])
  const [cargando, setCargando] = useState(true)
  const [aviso, setAviso] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    setCargando(true)
    const { data } = await supabase.from('inscripciones_curso').select('*').eq('curso_id', curso.id).order('created_at', { ascending: true })
    setRows((data as Insc[]) ?? []); setCargando(false)
  }, [supabase, curso.id])
  useEffect(() => { cargar() }, [cargar])

  const aprobadas = rows.filter(r => r.estado === 'aprobada').length
  const pendientes = rows.filter(r => r.estado === 'pendiente').length

  async function aprobar(id: string) {
    const { data } = await supabase.rpc('aprobar_inscripcion', { p_id: id })
    if (data === 'LIMITE') { setAviso(`Ya alcanzaste el cupo de ${curso.limite} aprobados.`); return }
    setAviso(null); await cargar()
  }
  async function rechazar(id: string) { await supabase.rpc('rechazar_inscripcion', { p_id: id }); await cargar() }

  async function verDoc(path: string) {
    const { data } = await supabase.storage.from('cursos-docs').createSignedUrl(path, 300)
    if (data) window.open(data.signedUrl, '_blank')
  }

  function exportar() {
    const cols = ['Nombre', 'Cedula', 'Telefono', 'Correo', 'Colegiatura', 'Nucleo', 'Estado', 'Documentos', 'Fecha']
    const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`
    const docKeys = curso.documentos.map(d => d.key)
    const lineas = rows.map(r => [
      r.nombre, r.cedula, r.telefono, r.email, r.colegiatura, r.nucleo, r.estado,
      docKeys.filter(k => r.docs?.[k]).join('+') || 'ninguno', new Date(r.created_at).toLocaleString('es-DO'),
    ].map(esc).join(','))
    const csv = '﻿' + [cols.join(','), ...lineas].join('\r\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
    a.download = `inscritos_${curso.slug}_${new Date().toISOString().slice(0, 10)}.csv`; a.click()
  }

  const badge = (e: string) => e === 'aprobada'
    ? <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-800">Aprobada</span>
    : e === 'rechazada'
      ? <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-gray-200 text-gray-600">Rechazada</span>
      : <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">Pendiente</span>

  return (
    <>
      <button onClick={onVolver} className="text-sm font-semibold mb-3" style={{ color: MARINO }}>← Volver</button>
      <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
        <div>
          <h1 className="text-xl font-extrabold" style={{ color: MARINO }}>Inscritos — {curso.titulo}</h1>
          <p className="text-sm text-gray-500">{rows.length} registros · {aprobadas}/{curso.limite} aprobados · {pendientes} pendientes</p>
        </div>
        <button onClick={exportar} disabled={!rows.length} className="px-4 py-2 rounded-lg text-white text-sm font-semibold disabled:opacity-40" style={{ backgroundColor: DORADO }}>Exportar a Excel</button>
      </div>
      {aviso && <div className="mb-3 text-sm rounded-lg bg-amber-50 border border-amber-200 text-amber-800 px-3 py-2">{aviso}</div>}
      {cargando ? <p className="text-sm text-gray-500 py-10 text-center">Cargando…</p> :
        rows.length === 0 ? <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-10 text-center text-gray-500 text-sm">Aún no hay registros.</div> : (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-white" style={{ backgroundColor: MARINO }}>
                {['Nombre', 'Cédula', 'Teléfono', 'Correo', 'Coleg.', 'Estado', 'Docs', 'Acciones'].map(h => <th key={h} className="px-3 py-2 font-semibold whitespace-nowrap">{h}</th>)}
              </tr></thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.id} className={i % 2 ? 'bg-gray-50' : 'bg-white'}>
                    <td className="px-3 py-2 font-medium text-gray-800 whitespace-nowrap">{r.nombre}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{r.cedula}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{r.telefono}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{r.email}</td>
                    <td className="px-3 py-2 text-center">{r.colegiatura}</td>
                    <td className="px-3 py-2">{badge(r.estado)}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <div className="flex gap-1.5 flex-wrap">
                        {curso.documentos.map(d => r.docs?.[d.key]
                          ? <button key={d.key} onClick={() => verDoc(r.docs[d.key])} className="text-xs underline" style={{ color: MARINO }}>{d.key}</button>
                          : <span key={d.key} className="text-xs text-amber-600">{d.key}✗</span>)}
                      </div>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {r.estado !== 'aprobada' && <button onClick={() => aprobar(r.id)} className="text-xs font-semibold px-2 py-1 rounded bg-green-600 text-white mr-1">Aprobar</button>}
                      {r.estado !== 'rechazada' && <button onClick={() => rechazar(r.id)} className="text-xs font-semibold px-2 py-1 rounded bg-gray-200 text-gray-700">Rechazar</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
    </>
  )
}
