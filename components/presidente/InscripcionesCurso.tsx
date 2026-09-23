'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import AppHeader from '@/components/app-header'

const MARINO = '#1F3864'
const DORADO = '#C9A227'
const BUCKET = 'curso-ingles'

interface Inscripcion {
  id: string
  nombre: string
  cedula: string
  telefono: string | null
  email: string | null
  colegiatura: number | null
  nucleo: string | null
  cedula_doc: string | null
  titulo_doc: string | null
  estado: string | null
  created_at: string
}

interface Props { nombreUsuario: string; rol: string }

export default function InscripcionesCurso({ nombreUsuario, rol }: Props) {
  const supabase = createClient()
  const [rows, setRows] = useState<Inscripcion[]>([])
  const [q, setQ] = useState('')
  const [cargando, setCargando] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    supabase.from('inscripciones_ingles')
      .select('*').order('created_at', { ascending: false })
      .then(({ data, error }) => {
        setCargando(false)
        if (error) { setErr(error.message); return }
        setRows((data as Inscripcion[]) ?? [])
      })
  }, [supabase])

  const filtradas = useMemo(() => {
    const t = q.trim().toLowerCase()
    if (!t) return rows
    return rows.filter(r =>
      [r.nombre, r.cedula, r.telefono, r.email, String(r.colegiatura ?? ''), r.nucleo]
        .some(v => (v ?? '').toString().toLowerCase().includes(t)))
  }, [rows, q])

  const completas = rows.filter(r => r.estado === 'completa').length
  const pendientes = rows.length - completas

  async function verDoc(path: string | null) {
    if (!path) return
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 300)
    if (error || !data) { alert('No se pudo abrir el documento.'); return }
    window.open(data.signedUrl, '_blank')
  }

  function exportarCSV() {
    const cols = ['Nombre', 'Cedula', 'Telefono', 'Correo', 'Colegiatura', 'Nucleo', 'Estado', 'Cedula_doc', 'Titulo_doc', 'Fecha']
    const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`
    const lineas = filtradas.map(r => [
      r.nombre, r.cedula, r.telefono, r.email, r.colegiatura, r.nucleo,
      r.estado === 'completa' ? 'Completa' : 'Pendiente documentos',
      r.cedula_doc ? 'SI' : 'NO', r.titulo_doc ? 'SI' : 'NO',
      new Date(r.created_at).toLocaleString('es-DO'),
    ].map(esc).join(','))
    const csv = '﻿' + [cols.join(','), ...lineas].join('\r\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `inscripciones_curso_ingles_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const badge = (estado: string | null) =>
    estado === 'completa'
      ? <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-800">Completa</span>
      : <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">Pendiente docs</span>

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader nombreUsuario={nombreUsuario} rol={rol} />
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
          <div>
            <h1 className="text-2xl font-extrabold" style={{ color: MARINO }}>Inscritos — Curso de Inglés</h1>
            <p className="text-sm text-gray-500">
              {rows.length} inscritos · {completas} con documentos completos · {pendientes} pendientes de documentos
            </p>
          </div>
          <button onClick={exportarCSV} disabled={!filtradas.length}
            className="px-4 py-2 rounded-lg text-white text-sm font-semibold disabled:opacity-40 inline-flex items-center gap-2"
            style={{ backgroundColor: DORADO }}>
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" /></svg>
            Exportar a Excel
          </button>
        </div>

        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar por nombre, cédula, colegiatura, correo…"
          className="w-full md:max-w-md text-sm px-4 py-2.5 border border-gray-200 rounded-xl mb-4 focus:outline-none focus:ring-2"
          style={{ ['--tw-ring-color' as string]: MARINO } as React.CSSProperties} />

        {err && <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3">Error: {err}</div>}
        {cargando && <p className="text-sm text-gray-500 py-10 text-center">Cargando inscritos…</p>}
        {!cargando && !err && rows.length === 0 && (
          <div className="rounded-xl bg-white border border-gray-100 shadow-sm px-4 py-10 text-center text-gray-500 text-sm">
            Aún no hay inscripciones registradas.
          </div>
        )}

        {!cargando && filtradas.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-white" style={{ backgroundColor: MARINO }}>
                  {['Nombre', 'Cédula', 'Teléfono', 'Correo', 'Colegiatura', 'Núcleo', 'Estado', 'Documentos', 'Fecha'].map(h =>
                    <th key={h} className="px-3 py-2 font-semibold whitespace-nowrap">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {filtradas.map((r, i) => (
                  <tr key={r.id} className={i % 2 ? 'bg-gray-50' : 'bg-white'}>
                    <td className="px-3 py-2 font-medium text-gray-800 whitespace-nowrap">{r.nombre}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{r.cedula}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{r.telefono}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{r.email}</td>
                    <td className="px-3 py-2 text-center">{r.colegiatura}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-gray-600">{r.nucleo}</td>
                    <td className="px-3 py-2">{badge(r.estado)}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <div className="flex gap-2">
                        {r.cedula_doc
                          ? <button onClick={() => verDoc(r.cedula_doc)} className="text-xs underline" style={{ color: MARINO }}>Cédula</button>
                          : <span className="text-xs text-amber-600">Cédula ✗</span>}
                        {r.titulo_doc
                          ? <button onClick={() => verDoc(r.titulo_doc)} className="text-xs underline" style={{ color: MARINO }}>Título</button>
                          : <span className="text-xs text-amber-600">Título ✗</span>}
                      </div>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-gray-500">{new Date(r.created_at).toLocaleDateString('es-DO')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
