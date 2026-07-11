'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

// ─── Tipos ───────────────────────────────────────────────────────────────────
interface Oficialia {
  prefijo: string
  demarcacion: string
  colegiados: number
  rastreable: boolean
}

interface Opciones {
  nucleos: string[]
  regionales: string[]
  provincias: string[]
  oficialias: Oficialia[]
}

interface FilaSegmento {
  codigo: string
  cedula: string | null
  nombre_completo: string | null
  provincia: string | null
  regional: string | null
  nucleo: string | null
  centro_votacion: string | null
  prefijo: string | null
  demarcacion_origen: string | null
  vota_fuera: boolean | null
}

// ─── Exportación a Excel (CSV con BOM UTF-8, abre directo en Excel) ───────────
function escaparCSV(valor: string | number | boolean | null | undefined): string {
  const s = valor == null ? '' : String(valor)
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

function exportarCSV(filas: FilaSegmento[], nombreArchivo: string) {
  const encabezados = [
    'Codigo', 'Cedula', 'Nombre', 'Provincia', 'Regional (vota)',
    'Nucleo (profesion)', 'Centro de votacion', 'Prefijo', 'Demarcacion origen', 'Vota fuera',
  ]
  const lineas = [encabezados.join(',')]
  for (const f of filas) {
    lineas.push([
      escaparCSV(f.codigo),
      escaparCSV(f.cedula),
      escaparCSV(f.nombre_completo),
      escaparCSV(f.provincia),
      escaparCSV(f.regional),
      escaparCSV(f.nucleo),
      escaparCSV(f.centro_votacion),
      escaparCSV(f.prefijo),
      escaparCSV(f.demarcacion_origen),
      escaparCSV(f.vota_fuera == null ? '' : f.vota_fuera ? 'SI' : 'NO'),
    ].join(','))
  }
  const contenido = '﻿' + lineas.join('\r\n')
  const blob = new Blob([contenido], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nombreArchivo
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ─── Componente ──────────────────────────────────────────────────────────────
export default function TabSegmentador() {
  const supabase = createClient()

  const [opciones, setOpciones]   = useState<Opciones | null>(null)
  const [filas, setFilas]         = useState<FilaSegmento[]>([])
  const [cargandoOpc, setCargOpc] = useState(true)
  const [consultando, setConsult] = useState(false)
  const [yaConsulto, setYaConsulto] = useState(false)
  const [error, setError]         = useState<string | null>(null)

  // Filtros
  const [prefijo, setPrefijo]     = useState('')
  const [nucleo, setNucleo]       = useState('')
  const [regional, setRegional]   = useState('')
  const [provincia, setProvincia] = useState('')
  const [votaFuera, setVotaFuera] = useState<'' | 'si' | 'no'>('')

  useEffect(() => {
    supabase.rpc('segmentador_opciones').then(({ data, error: err }) => {
      if (err) { setError('No se pudieron cargar las opciones de filtro.'); setCargOpc(false); return }
      setOpciones(data as Opciones)
      setCargOpc(false)
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function consultar() {
    setConsult(true); setError(null)
    const { data, error: err } = await supabase.rpc('segmentar_padron', {
      p_prefijo:    prefijo   || null,
      p_nucleo:     nucleo    || null,
      p_regional:   regional  || null,
      p_provincia:  provincia || null,
      p_vota_fuera: votaFuera === '' ? null : votaFuera === 'si',
    })
    if (err) { setError('Error al consultar: ' + err.message); setConsult(false); return }
    setFilas((data as FilaSegmento[]) ?? [])
    setYaConsulto(true)
    setConsult(false)
  }

  function limpiar() {
    setPrefijo(''); setNucleo(''); setRegional(''); setProvincia(''); setVotaFuera('')
    setFilas([]); setYaConsulto(false)
  }

  const demarcacionSel = useMemo(
    () => opciones?.oficialias.find(o => o.prefijo === prefijo),
    [opciones, prefijo]
  )

  const nombreArchivo = useMemo(() => {
    const partes = ['padron']
    if (demarcacionSel) partes.push(demarcacionSel.demarcacion.replace(/\s+/g, '_'))
    if (nucleo) partes.push(nucleo.replace(/\s+/g, '_'))
    if (votaFuera === 'si') partes.push('vota_fuera')
    return partes.join('-').toLowerCase() + '.csv'
  }, [demarcacionSel, nucleo, votaFuera])

  const selectClass = 'text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white w-full'
  const labelClass  = 'text-xs font-medium text-gray-500 mb-1 block'

  if (cargandoOpc) {
    return <p className="text-gray-400 py-8 text-center">Cargando opciones…</p>
  }

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
        <div>
          <h2 className="text-lg font-bold" style={{ color: 'var(--color-marino)' }}>
            Segmentador del Padrón
          </h2>
          <p className="text-sm text-gray-400">
            Combina filtros y exporta el resultado a Excel. Deja un filtro en blanco para no aplicarlo.
          </p>
        </div>

        {/* Filtros */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div>
            <label className={labelClass}>Demarcación de origen (prefijo cédula)</label>
            <select className={selectClass} value={prefijo} onChange={e => setPrefijo(e.target.value)}>
              <option value="">Todas</option>
              {opciones?.oficialias.map(o => (
                <option key={o.prefijo} value={o.prefijo}>
                  {o.prefijo} — {o.demarcacion} ({o.colegiados}){o.rastreable ? '' : ' ⚠ no rastreable'}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>Profesión (núcleo)</label>
            <select className={selectClass} value={nucleo} onChange={e => setNucleo(e.target.value)}>
              <option value="">Todas</option>
              {opciones?.nucleos.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>

          <div>
            <label className={labelClass}>Dónde vota (regional)</label>
            <select className={selectClass} value={regional} onChange={e => setRegional(e.target.value)}>
              <option value="">Todas</option>
              {opciones?.regionales.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          <div>
            <label className={labelClass}>Provincia</label>
            <select className={selectClass} value={provincia} onChange={e => setProvincia(e.target.value)}>
              <option value="">Todas</option>
              {opciones?.provincias.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          <div>
            <label className={labelClass}>Vota fuera de su demarcación</label>
            <select className={selectClass} value={votaFuera} onChange={e => setVotaFuera(e.target.value as '' | 'si' | 'no')}>
              <option value="">Indiferente</option>
              <option value="si">Sí (vota fuera)</option>
              <option value="no">No (vota en su zona)</option>
            </select>
          </div>
        </div>

        {votaFuera !== '' && !prefijo && (
          <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            El filtro "vota fuera" usa la demarcación por prefijo de cédula. Las cédulas de formato nuevo (prefijo 402)
            no son rastreables y se excluyen de ese cálculo.
          </p>
        )}

        <div className="flex items-center gap-2">
          <button
            onClick={consultar}
            disabled={consultando}
            className="text-sm px-4 py-2 rounded-lg font-medium text-white disabled:opacity-50"
            style={{ backgroundColor: 'var(--color-marino)' }}
          >
            {consultando ? 'Consultando…' : 'Consultar'}
          </button>
          <button
            onClick={limpiar}
            className="text-sm px-4 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 font-medium"
          >
            Limpiar
          </button>
          {yaConsulto && filas.length > 0 && (
            <button
              onClick={() => exportarCSV(filas, nombreArchivo)}
              className="text-sm px-4 py-2 rounded-lg font-medium text-white ml-auto"
              style={{ backgroundColor: 'var(--color-verde, #128a3f)' }}
            >
              ⬇ Exportar a Excel ({filas.length})
            </button>
          )}
        </div>
      </div>

      {error && (
        <p className="text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm">{error}</p>
      )}

      {/* Resultados */}
      {yaConsulto && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <p className="text-sm font-semibold mb-3" style={{ color: 'var(--color-marino)' }}>
            {filas.length.toLocaleString()} colegiados
          </p>
          {filas.length === 0 ? (
            <p className="text-gray-400 text-sm">No hay resultados para esos filtros.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b border-gray-100">
                    <th className="py-2 pr-3 font-medium">Código</th>
                    <th className="py-2 pr-3 font-medium">Cédula</th>
                    <th className="py-2 pr-3 font-medium">Nombre</th>
                    <th className="py-2 pr-3 font-medium">Provincia</th>
                    <th className="py-2 pr-3 font-medium">Regional (vota)</th>
                    <th className="py-2 pr-3 font-medium">Núcleo</th>
                    <th className="py-2 pr-3 font-medium">Origen</th>
                    <th className="py-2 pr-3 font-medium">Fuera</th>
                  </tr>
                </thead>
                <tbody>
                  {filas.slice(0, 500).map(f => (
                    <tr key={f.codigo} className="border-b border-gray-50">
                      <td className="py-1.5 pr-3 tabular-nums">{f.codigo}</td>
                      <td className="py-1.5 pr-3 tabular-nums">{f.cedula}</td>
                      <td className="py-1.5 pr-3">{f.nombre_completo}</td>
                      <td className="py-1.5 pr-3">{f.provincia}</td>
                      <td className="py-1.5 pr-3">{f.regional}</td>
                      <td className="py-1.5 pr-3">{f.nucleo}</td>
                      <td className="py-1.5 pr-3">{f.demarcacion_origen ?? '—'}</td>
                      <td className="py-1.5 pr-3">
                        {f.vota_fuera == null ? '—' : f.vota_fuera
                          ? <span className="text-amber-600 font-medium">Sí</span>
                          : <span className="text-gray-400">No</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filas.length > 500 && (
                <p className="text-xs text-gray-400 mt-3">
                  Mostrando las primeras 500 filas. El botón "Exportar a Excel" descarga las {filas.length.toLocaleString()} completas.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
