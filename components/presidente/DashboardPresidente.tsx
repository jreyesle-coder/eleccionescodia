'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  ResponsiveContainer,
  PieChart, Pie, Cell, Tooltip, Legend,
} from 'recharts'
import AppHeader from '@/components/app-header'
import type {
  MetricaDistrito,
  PadronVivoRow,
  LlamadaPresidente,
  EstadoGestion,
} from '@/lib/types/database'

// ─── Constantes ───────────────────────────────────────────────────────────────

const ZONA = 'America/Santo_Domingo'


const ETIQUETA_ESTADO: Record<EstadoGestion, string> = {
  pendiente:       'Pendiente',
  en_proceso:      'En proceso',
  contactado:      'Contactado',
  no_comunicacion: 'Sin comunicación',
  cerrado:         'Cerrado',
}

const COLOR_ESTADO: Record<EstadoGestion, string> = {
  pendiente:       'bg-gray-100 text-gray-600',
  en_proceso:      'bg-blue-100 text-blue-800',
  contactado:      'bg-green-100 text-green-800',
  no_comunicacion: 'bg-red-100 text-red-700',
  cerrado:         'bg-slate-200 text-slate-700',
}

const COLOR_RESULTADO: Record<string, string> = {
  efectiva_confirma:    'text-green-700',
  efectiva_no_confirma: 'text-orange-600',
  no_contesta:          'text-red-600',
  numero_equivocado:    'text-gray-500',
  volver_a_llamar:      'text-blue-600',
  rechaza:              'text-red-800',
}

const ETIQUETA_RESULTADO: Record<string, string> = {
  efectiva_confirma:    'Confirma ✔',
  efectiva_no_confirma: 'No confirma',
  no_contesta:          'No contesta',
  numero_equivocado:    'Nº equivocado',
  volver_a_llamar:      'Volver a llamar',
  rechaza:              'Rechaza',
}

type Tab = 'resumen' | 'padron' | 'nucleos' | 'regularizar' | 'confirmados' | 'dia_eleccion'


function fmt(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleString('es-DO', { timeZone: ZONA, day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
}

// ─── Badge estado ─────────────────────────────────────────────────────────────

function EstadoBadge({ estado }: { estado: EstadoGestion }) {
  return (
    <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${COLOR_ESTADO[estado]}`}>
      {ETIQUETA_ESTADO[estado]}
    </span>
  )
}

// ─── Modal detalle de miembro ─────────────────────────────────────────────────

function ModalDetalle({
  miembro,
  onCerrar,
}: {
  miembro: PadronVivoRow
  onCerrar: () => void
}) {
  const supabase = createClient()
  const [llamadas, setLlamadas] = useState<LlamadaPresidente[]>([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    let activo = true
    supabase
      .from('llamadas')
      .select('*, operador:profiles(nombre)')
      .eq('miembro_id', miembro.id)
      .order('fecha_hora', { ascending: false })
      .then(({ data }) => {
        if (activo) {
          setLlamadas((data as LlamadaPresidente[]) ?? [])
          setCargando(false)
        }
      })
    return () => { activo = false }
  }, [miembro.id]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(14,28,66,0.45)' }}
      onClick={onCerrar}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Cabecera */}
        <div
          className="px-6 py-4 flex items-start justify-between"
          style={{ backgroundColor: 'var(--color-marino)', color: 'white' }}
        >
          <div>
            <p className="font-bold text-lg leading-tight">{miembro.nombre_completo}</p>
            <p className="text-blue-200 text-sm">Colegiatura {miembro.codigo} · {miembro.regional}{miembro.nucleo ? ` · ${miembro.nucleo}` : ''}</p>
          </div>
          <button
            onClick={onCerrar}
            className="text-blue-200 hover:text-white text-xl font-bold leading-none ml-4 mt-0.5"
          >
            ✕
          </button>
        </div>

        {/* Info básica */}
        <div className="px-6 py-4 border-b border-gray-100 grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
          <div>
            <p className="text-xs text-gray-400 uppercase font-semibold">Teléfono</p>
            <p className="font-medium text-gray-800">{miembro.telefono ?? miembro.celular ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase font-semibold">Profesión</p>
            <p className="font-medium text-gray-800 text-xs">{miembro.carrera ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase font-semibold">Estado</p>
            <EstadoBadge estado={miembro.estado_gestion} />
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase font-semibold">Colaboradora</p>
            <p className="font-medium text-gray-800">{miembro.asignado_a ?? '—'}</p>
          </div>
          {miembro.ultima_nota && (
            <div className="col-span-2 sm:col-span-3">
              <p className="text-xs text-gray-400 uppercase font-semibold">Última nota</p>
              <p className="text-gray-700 italic">&ldquo;{miembro.ultima_nota}&rdquo;</p>
            </div>
          )}
        </div>

        {/* Historial de llamadas */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
            Historial de llamadas ({llamadas.length})
          </p>
          {cargando && <p className="text-sm text-gray-400">Cargando…</p>}
          {!cargando && llamadas.length === 0 && (
            <p className="text-sm text-gray-400">Sin llamadas registradas.</p>
          )}
          <div className="space-y-3">
            {llamadas.map(ll => (
              <div
                key={ll.id}
                className="rounded-xl border border-gray-100 p-4 text-sm space-y-1.5"
              >
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className={`font-semibold ${COLOR_RESULTADO[ll.resultado] ?? 'text-gray-700'}`}>
                    {ETIQUETA_RESULTADO[ll.resultado] ?? ll.resultado}
                  </span>
                  <span className="text-xs text-gray-400">{fmt(ll.fecha_hora)}</span>
                </div>
                {ll.confirma_plancha1 && (
                  <span
                    className="inline-block text-xs font-bold px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: 'var(--color-dorado)', color: '#0F1B33' }}
                  >
                    ★ Confirma Plancha 1
                  </span>
                )}
                {ll.motivo && (
                  <p className="text-gray-500">
                    <span className="font-medium">Motivo:</span> {ll.motivo}
                  </p>
                )}
                {ll.notas && (
                  <p className="text-gray-600 italic">&ldquo;{ll.notas}&rdquo;</p>
                )}
                {ll.operador && (
                  <p className="text-xs text-gray-400">
                    Por: {(ll.operador as { nombre: string }).nombre}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Tab: Resumen por distrito ────────────────────────────────────────────────

function TabResumen({ metricas, padron, simpatizantesVerificate }: { metricas: MetricaDistrito[]; padron: PadronVivoRow[]; simpatizantesVerificate: number }) {
  const [desglose, setDesglose] = useState<{ distrito: string; estado: EstadoGestion; label: string } | null>(null)
  const visibles = metricas

  const total: MetricaDistrito = visibles.reduce(
    (acc, m) => ({
      distrito: 'Total',
      total:                 acc.total                 + m.total,
      pendientes:            acc.pendientes            + m.pendientes,
      en_proceso:            acc.en_proceso            + m.en_proceso,
      contactados:           acc.contactados           + m.contactados,
      sin_comunicacion:      acc.sin_comunicacion      + m.sin_comunicacion,
      cerrados:              acc.cerrados              + m.cerrados,
      confirmados_plancha1:  acc.confirmados_plancha1  + m.confirmados_plancha1,
    }),
    { distrito: 'Total', total: 0, pendientes: 0, en_proceso: 0, contactados: 0, sin_comunicacion: 0, cerrados: 0, confirmados_plancha1: 0 }
  )

  const ORDEN = ['santo domingo', 'santiago']
  const visiblesOrdenados = [...visibles].sort((a, b) => {
    const ia = ORDEN.indexOf(a.distrito.toLowerCase())
    const ib = ORDEN.indexOf(b.distrito.toLowerCase())
    if (ia !== -1 && ib !== -1) return ia - ib   // ambos en la lista → orden definido
    if (ia !== -1) return -1                       // solo a está → a primero
    if (ib !== -1) return 1                        // solo b está → b primero
    return a.distrito.localeCompare(b.distrito)    // resto: alfabético
  })
  const columnas = [...visiblesOrdenados, total]

  const dataDona = [
    { name: 'Pendientes',       value: total.pendientes,       fill: '#94a3b8' },
    { name: 'En proceso',       value: total.en_proceso,       fill: '#2A407A' },
    { name: 'Contactados',      value: total.contactados,      fill: '#1F9D55' },
    { name: 'Sin comunicación', value: total.sin_comunicacion, fill: '#B61F2E' },
    { name: 'Cerrados',         value: total.cerrados,         fill: '#16285A' },
  ].filter(d => d.value > 0)

  return (
    <div className="space-y-6">
      {/* Diagrama circular distribución general */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">
          Distribución general por estado
          <span className="ml-2 text-xs font-normal text-gray-400">
            — {total.total.toLocaleString()} colegiados en total
          </span>
        </h2>
        {dataDona.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={dataDona}
                cx="50%"
                cy="50%"
                innerRadius={75}
                outerRadius={120}
                paddingAngle={2}
                dataKey="value"
                label={({ percent }) =>
                  percent != null && percent > 0.01
                    ? `${(percent * 100).toFixed(0)}%`
                    : ''
                }
                labelLine={false}
              >
                {dataDona.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip
                formatter={(val) => [typeof val === 'number' ? val.toLocaleString() : val, '']}
              />
              <Legend iconType="circle" iconSize={9} />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-gray-400 text-sm text-center py-16">Sin datos disponibles</p>
        )}
      </div>

      {/* Tarjeta destacada global Plancha 1 */}
      <div
        className="rounded-2xl p-6 text-white flex flex-col sm:flex-row items-start sm:items-center gap-4"
        style={{ background: 'linear-gradient(135deg, var(--color-marino), var(--color-real))' }}
      >
        <div className="flex-1 space-y-1">
          <p className="text-blue-200 text-sm font-semibold uppercase tracking-wide">
            Total confirmados — Plancha #1
          </p>
          <p className="text-5xl font-bold tabular-nums" style={{ color: 'var(--color-dorado)' }}>
            {total.confirmados_plancha1.toLocaleString()}
          </p>
          <p className="text-blue-200 text-sm">votos confirmados en todos los distritos</p>
        </div>
        <div
          className="text-center rounded-xl px-6 py-4"
          style={{ backgroundColor: 'rgba(231,178,40,0.2)', border: '2px solid var(--color-dorado)' }}
        >
          <p className="font-bold text-2xl tabular-nums" style={{ color: 'var(--color-dorado)' }}>
            {total.total > 0 ? Math.round((total.confirmados_plancha1 / total.total) * 100) : 0}%
          </p>
          <p className="text-blue-200 text-xs mt-1">del padrón confirmado</p>
        </div>
      </div>

      {/* ── Gráfico de aceptación ── */}
      {(() => {
        // confirmados_plancha1 = colegiados con al menos una llamada resultado 'efectiva_confirma'
        // simpatizantesVerificate = colegiados con simpatiza_verificate = true
        // Usamos el mayor de los dos para no duplicar si coinciden
        const simpatiza = Math.max(total.confirmados_plancha1, simpatizantesVerificate)
        const noSimpatiza = padron.filter(f => f.ultimo_resultado === 'efectiva_no_confirma' || f.ultimo_resultado === 'rechaza').length
        const noContactados = total.total - simpatiza - noSimpatiza
        const dataAcept = [
          { name: 'Simpatiza',       value: simpatiza,     fill: '#16a34a' },
          { name: 'No simpatiza',    value: noSimpatiza,   fill: '#dc2626' },
          { name: 'Sin gestionar',   value: noContactados, fill: '#cbd5e1' },
        ].filter(d => d.value > 0)
        return (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-1">
              Aceptación de la candidatura
            </h2>
            <p className="text-xs text-gray-400 mb-4">
              {simpatiza.toLocaleString()} simpatizantes confirmados de {total.total.toLocaleString()} colegiados
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <ResponsiveContainer width={200} height={200}>
                <PieChart>
                  <Pie data={dataAcept} cx="50%" cy="50%" innerRadius={55} outerRadius={90}
                    paddingAngle={2} dataKey="value" labelLine={false}
                    label={({ percent }) => percent != null && percent > 0.03 ? `${(percent*100).toFixed(0)}%` : ''}>
                    {dataAcept.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Pie>
                  <Tooltip formatter={(val) => [typeof val === 'number' ? val.toLocaleString() : val, '']} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-3 flex-1">
                {dataAcept.map(d => (
                  <div key={d.name} className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: d.fill }} />
                    <div className="flex-1">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium text-gray-700">{d.name}</span>
                        <span className="font-bold tabular-nums">{d.value.toLocaleString()}</span>
                      </div>
                      <div className="bg-gray-100 rounded-full h-1.5 mt-1">
                        <div className="h-full rounded-full" style={{
                          width: `${total.total > 0 ? (d.value / total.total * 100) : 0}%`,
                          backgroundColor: d.fill,
                        }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )
      })()}

      {/* Columnas por distrito */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {columnas.map(m => (
          <div
            key={m.distrito}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
          >
            <div
              className="px-5 py-3 flex items-center justify-between"
              style={{
                backgroundColor: m.distrito === 'Total' ? 'var(--color-marino)' : 'var(--color-real)',
                color: 'white',
              }}
            >
              <p className="font-bold text-base">{m.distrito}</p>
              <p className="font-semibold tabular-nums">{m.total.toLocaleString()} colegiados</p>
            </div>

            {/* Confirmados Plancha 1 destacado */}
            <div
              className="px-5 py-4 flex items-center justify-between border-b border-gray-100"
              style={{ backgroundColor: 'rgba(231,178,40,0.07)' }}
            >
              <p className="text-sm font-semibold text-gray-700">★ Confirmados Plancha 1</p>
              <div className="text-right">
                <p className="text-2xl font-bold tabular-nums" style={{ color: 'var(--color-dorado)' }}>
                  {m.confirmados_plancha1.toLocaleString()}
                </p>
                <p className="text-xs text-gray-400">
                  {m.total > 0 ? Math.round((m.confirmados_plancha1 / m.total) * 100) : 0}%
                </p>
              </div>
            </div>

            {/* Resto de estados — clickables para ver desglose */}
            <div className="px-5 py-4 space-y-1">
              {([
                { label: 'Pendientes',       val: m.pendientes,       color: '#94a3b8', estado: 'pendiente'       as EstadoGestion },
                { label: 'En proceso',       val: m.en_proceso,       color: '#2A407A', estado: 'en_proceso'      as EstadoGestion },
                { label: 'Contactados',      val: m.contactados,      color: '#1F9D55', estado: 'contactado'      as EstadoGestion },
                { label: 'Sin comunicación', val: m.sin_comunicacion, color: '#B61F2E', estado: 'no_comunicacion' as EstadoGestion },
                { label: 'Cerrados',         val: m.cerrados,         color: '#16285A', estado: 'cerrado'         as EstadoGestion },
              ]).map(({ label, val, color, estado: e }) => {
                const esTotal = m.distrito === 'Total'
                const activo = !esTotal && desglose?.distrito === m.distrito && desglose?.estado === e
                return (
                  <button
                    key={label}
                    disabled={esTotal}
                    onClick={() => !esTotal && setDesglose(activo ? null : { distrito: m.distrito, estado: e, label })}
                    className={`w-full flex items-center justify-between text-sm rounded-lg px-1.5 py-1 -mx-1.5 transition-colors ${!esTotal ? 'hover:bg-blue-50 cursor-pointer' : ''} ${activo ? 'bg-blue-50 ring-1 ring-blue-200' : ''}`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                      <span className="text-gray-600">{label}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold tabular-nums text-gray-800">{val.toLocaleString()}</span>
                      {!esTotal && <span className="text-gray-300 text-xs">›</span>}
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Barra de progreso contactados */}
            {m.total > 0 && (
              <div className="px-5 pb-4">
                <div className="bg-gray-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.round(((m.contactados + m.cerrados) / m.total) * 100)}%`,
                      backgroundColor: 'var(--color-exito)',
                    }}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  {Math.round(((m.contactados + m.cerrados) / m.total) * 100)}% contactados / cerrados
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Panel de desglose por estado */}
      {desglose && (() => {
        const filtradas = padron.filter(
          f => f.regional === desglose.distrito && f.estado_gestion === desglose.estado
        )
        return (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-2">
              <div>
                <p className="font-semibold text-gray-900">
                  {desglose.label} · {desglose.distrito}
                </p>
                <p className="text-xs text-gray-400">{filtradas.length.toLocaleString()} personas</p>
              </div>
              <button
                onClick={() => setDesglose(null)}
                className="text-gray-400 hover:text-gray-700 text-lg leading-none font-bold"
              >
                ✕
              </button>
            </div>
            <div className="overflow-x-auto max-h-96 overflow-y-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr
                    className="text-xs uppercase tracking-wide border-b sticky top-0 bg-white"
                    style={{ color: 'var(--color-marino)' }}
                  >
                    <th className="text-left px-5 py-2 font-semibold">Nombre</th>
                    <th className="text-left px-5 py-2 font-semibold hidden sm:table-cell">Teléfono</th>
                    <th className="text-left px-5 py-2 font-semibold hidden md:table-cell">Colaboradora</th>
                    <th className="text-left px-5 py-2 font-semibold hidden lg:table-cell">Última nota</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtradas.map(f => (
                    <tr key={f.id} className="hover:bg-blue-50/30 transition-colors">
                      <td className="px-5 py-2.5 font-medium text-gray-900">{f.nombre_completo}</td>
                      <td className="px-5 py-2.5 text-gray-500 hidden sm:table-cell">{f.telefono ?? f.celular ?? '—'}</td>
                      <td className="px-5 py-2.5 text-gray-500 hidden md:table-cell">{f.asignado_a ?? '—'}</td>
                      <td className="px-5 py-2.5 text-gray-400 text-xs max-w-[220px] truncate hidden lg:table-cell">{f.ultima_nota ?? '—'}</td>
                    </tr>
                  ))}
                  {filtradas.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-5 py-8 text-center text-gray-400">
                        Sin registros para este estado y distrito
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )
      })()}
    </div>
  )
}

// ─── Tab: Padrón en vivo ──────────────────────────────────────────────────────

const PAGE_PADRON = 100

function TabPadron({ filas, colaboradoras }: { filas: PadronVivoRow[]; colaboradoras: string[] }) {
  const [buscar, setBuscar] = useState('')
  const [filtroDistrito, setFiltroDistrito] = useState('')
  const [filtroEstado, setFiltroEstado] = useState<EstadoGestion | ''>('')
  const [filtroColab, setFiltroColab] = useState('')
  const [soloPendientes, setSoloPendientes] = useState(false)
  const [miembroSelec, setMiembroSelec] = useState<PadronVivoRow | null>(null)
  const [pagina, setPagina] = useState(0)

  const distritos = Array.from(new Set(filas.map(f => f.regional).filter(Boolean))).sort() as string[]

  const filtradas = filas.filter(f => {
    if (soloPendientes) return f.estado_gestion === 'pendiente'
    if (filtroDistrito && f.regional !== filtroDistrito) return false
    if (filtroEstado && f.estado_gestion !== filtroEstado) return false
    if (filtroColab && f.asignado_a !== filtroColab) return false
    if (buscar && !f.nombre_completo.toLowerCase().includes(buscar.toLowerCase())) return false
    return true
  })
  const totalPaginas = Math.ceil(filtradas.length / PAGE_PADRON)
  const paginadas    = filtradas.slice(pagina * PAGE_PADRON, (pagina + 1) * PAGE_PADRON)

  return (
    <div className="space-y-4">
      {/* Controles */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4">
        <div className="flex flex-wrap gap-3 items-center">
          {/* Acceso rápido pendientes */}
          <button
            onClick={() => { setSoloPendientes(v => !v); setFiltroEstado(''); setBuscar('') }}
            className="text-sm px-4 py-2 rounded-lg font-semibold transition-colors"
            style={
              soloPendientes
                ? { backgroundColor: 'var(--color-marino)', color: 'white' }
                : { backgroundColor: '#f1f5f9', color: 'var(--color-marino)' }
            }
          >
            ⏳ Pendientes ({filas.filter(f => f.estado_gestion === 'pendiente').length})
          </button>

          <input
            type="text"
            placeholder="Buscar por nombre…"
            value={buscar}
            onChange={e => { setBuscar(e.target.value); setSoloPendientes(false) }}
            className="flex-1 min-w-[180px] text-sm px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200"
          />

          <select
            value={filtroDistrito}
            onChange={e => { setFiltroDistrito(e.target.value); setSoloPendientes(false) }}
            className="text-sm px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white"
          >
            <option value="">Todas las regionales</option>
            {distritos.map(d => <option key={d} value={d}>{d}</option>)}
          </select>

          <select
            value={filtroEstado}
            onChange={e => { setFiltroEstado(e.target.value as EstadoGestion | ''); setSoloPendientes(false) }}
            className="text-sm px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white"
          >
            <option value="">Todos los estados</option>
            {(Object.entries(ETIQUETA_ESTADO) as [EstadoGestion, string][]).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>

          <select
            value={filtroColab}
            onChange={e => { setFiltroColab(e.target.value); setSoloPendientes(false) }}
            className="text-sm px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white"
          >
            <option value="">Todas las colaboradoras</option>
            {colaboradoras.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <p className="text-xs text-gray-400 mt-2">{filtradas.length.toLocaleString()} colegiados · página {pagina + 1} de {Math.max(1, totalPaginas)}</p>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr
                className="text-xs uppercase tracking-wide border-b-2"
                style={{ borderBottomColor: 'var(--color-marino)', color: 'var(--color-marino)' }}
              >
                <th className="text-left px-5 py-3 font-semibold">Nombre</th>
                <th className="text-left px-5 py-3 font-semibold hidden sm:table-cell">Teléfono</th>
                <th className="text-left px-5 py-3 font-semibold">Estado</th>
                <th className="text-left px-5 py-3 font-semibold hidden md:table-cell">Colaboradora</th>
                <th className="text-left px-5 py-3 font-semibold hidden lg:table-cell">Última nota</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paginadas.map(f => (
                <tr
                  key={f.id}
                  onClick={() => setMiembroSelec(f)}
                  className="hover:bg-blue-50/40 cursor-pointer transition-colors"
                >
                  <td className="px-5 py-3 font-medium text-gray-900">{f.nombre_completo}</td>
                  <td className="px-5 py-3 text-gray-500 hidden sm:table-cell">{f.telefono ?? f.celular ?? '—'}</td>
                  <td className="px-5 py-3"><EstadoBadge estado={f.estado_gestion} /></td>
                  <td className="px-5 py-3 text-gray-500 hidden md:table-cell">{f.asignado_a ?? '—'}</td>
                  <td className="px-5 py-3 text-gray-400 text-xs max-w-[220px] truncate hidden lg:table-cell">
                    {f.ultima_nota ?? '—'}
                  </td>
                </tr>
              ))}
              {filtradas.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-gray-400">
                    Sin resultados para los filtros aplicados
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Paginación */}
      {totalPaginas > 1 && (
        <div className="flex items-center justify-between gap-3 bg-white rounded-xl border border-gray-100 px-4 py-3">
          <button
            disabled={pagina === 0}
            onClick={() => setPagina(p => p - 1)}
            className="text-sm px-4 py-2 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 font-medium"
          >
            ← Anterior
          </button>
          <span className="text-sm text-gray-500">
            {pagina * PAGE_PADRON + 1}–{Math.min((pagina + 1) * PAGE_PADRON, filtradas.length).toLocaleString()} de {filtradas.length.toLocaleString()}
          </span>
          <button
            disabled={pagina >= totalPaginas - 1}
            onClick={() => setPagina(p => p + 1)}
            className="text-sm px-4 py-2 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 font-medium"
          >
            Siguiente →
          </button>
        </div>
      )}

      {/* Modal detalle */}
      {miembroSelec && (
        <ModalDetalle
          miembro={miembroSelec}
          onCerrar={() => setMiembroSelec(null)}
        />
      )}
    </div>
  )
}

// ─── Tab: Vista por Núcleos ───────────────────────────────────────────────────

interface NucleoCarreraRow {
  nucleo:                 string
  carrera_nombre:         string
  total:                  number
  confirmados:            number
  confirmados_callcenter: number
  confirmados_verificate: number
  confirmados_dirigente:  number
}

interface NucleoAgrupado {
  nucleo:                 string
  totalNucleo:            number
  totalConfirmados:       number
  profesiones: {
    nombre:                string
    total:                 number
    confirmados:           number
    confirmados_callcenter: number
    confirmados_verificate: number
    confirmados_dirigente:  number
  }[]
}

interface ConfirmadoNucleoRow {
  codigo:                 string
  nombre_completo:        string
  regional:               string | null
  nucleo:                 string | null
  carrera:                string | null
  via_callcenter:         boolean
  via_verificate:         boolean
  via_dirigente:          boolean
  confirmado_por:         string | null
  confirmacion_intencion: string | null
}

function TabNucleos() {
  const supabase = createClient()
  const [datos, setDatos]           = useState<NucleoAgrupado[]>([])
  const [cargando, setCargando]     = useState(true)
  const [error, setError]           = useState<string | null>(null)
  const [abiertos, setAbiertos]     = useState<Set<string>>(new Set())
  const [drilldown, setDrilldown]   = useState<{ nucleo: string; carrera: string | null } | null>(null)
  const [detalle, setDetalle]       = useState<ConfirmadoNucleoRow[]>([])
  const [cargandoDrill, setCargandoDrill] = useState(false)

  useEffect(() => {
    supabase.rpc('stats_nucleos').then(({ data, error: err }) => {
      if (err) { setError('No se pudo cargar la vista por núcleos.'); setCargando(false); return }
      const filas = (data as NucleoCarreraRow[]) ?? []

      const mapa = new Map<string, NucleoAgrupado>()
      for (const f of filas) {
        const n = mapa.get(f.nucleo) ?? {
          nucleo: f.nucleo,
          totalNucleo: 0,
          totalConfirmados: 0,
          profesiones: [],
        }
        const total = Number(f.total)
        const conf  = Number(f.confirmados)
        n.totalNucleo     += total
        n.totalConfirmados += conf
        n.profesiones.push({
          nombre: f.carrera_nombre,
          total,
          confirmados:            conf,
          confirmados_callcenter: Number(f.confirmados_callcenter),
          confirmados_verificate: Number(f.confirmados_verificate),
          confirmados_dirigente:  Number(f.confirmados_dirigente),
        })
        mapa.set(f.nucleo, n)
      }

      const agrupados = Array.from(mapa.values())
        .map(n => ({ ...n, profesiones: n.profesiones.sort((a, b) => b.total - a.total) }))
        .sort((a, b) => b.totalNucleo - a.totalNucleo)

      setDatos(agrupados)
      setCargando(false)
    })
  }, [supabase]) // eslint-disable-line react-hooks/exhaustive-deps

  function toggleNucleo(nucleo: string) {
    setAbiertos(prev => {
      const next = new Set(prev)
      if (next.has(nucleo)) { next.delete(nucleo) } else { next.add(nucleo) }
      return next
    })
  }

  async function abrirDrilldown(nucleo: string, carrera: string | null) {
    setDrilldown({ nucleo, carrera })
    setCargandoDrill(true)
    const { data } = await supabase.rpc('listar_confirmados_nucleo', {
      p_nucleo: nucleo,
      p_carrera: carrera,
    })
    setDetalle((data as ConfirmadoNucleoRow[]) ?? [])
    setCargandoDrill(false)
  }

  const totalGlobal      = datos.reduce((s, n) => s + n.totalNucleo, 0)
  const totalConfGlobal  = datos.reduce((s, n) => s + n.totalConfirmados, 0)

  if (cargando) return <p className="text-center text-gray-400 py-12">Cargando núcleos…</p>
  if (error)    return <p className="text-center text-red-500 py-12">{error}</p>

  return (
    <div className="space-y-4">
      {/* Resumen global */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4 flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-sm font-semibold text-gray-700">Vista por Núcleos</p>
          <p className="text-xs text-gray-400">{datos.length} núcleos · {totalGlobal.toLocaleString()} colegiados</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-400">Total confirmados en todos los núcleos</p>
          <p className="text-lg font-bold" style={{ color: 'var(--color-dorado)' }}>
            {totalConfGlobal.toLocaleString()}
            <span className="text-xs font-normal text-gray-400 ml-1">
              ({totalGlobal > 0 ? Math.round(totalConfGlobal / totalGlobal * 100) : 0}%)
            </span>
          </p>
        </div>
      </div>

      {/* Acordeón de núcleos */}
      <div className="space-y-2">
        {datos.map(({ nucleo, totalNucleo, totalConfirmados, profesiones }) => {
          const abierto = abiertos.has(nucleo)
          const pct = totalNucleo > 0 ? Math.round(totalConfirmados / totalNucleo * 100) : 0
          return (
            <div key={nucleo} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {/* Cabecera del núcleo */}
              <button
                onClick={() => toggleNucleo(nucleo)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-blue-50/40 transition-colors text-left"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <span
                    className="text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full transition-transform shrink-0"
                    style={{
                      color: 'var(--color-marino)',
                      transform: abierto ? 'rotate(90deg)' : 'none',
                    }}
                  >
                    ›
                  </span>
                  <span className="font-semibold text-gray-900">{nucleo}</span>
                  <span className="text-xs text-gray-400">{profesiones.length} profesión{profesiones.length !== 1 ? 'es' : ''}</span>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  {totalConfirmados > 0 && (
                    <div className="text-right">
                      <p className="text-xs text-gray-400">Confirmados</p>
                      <p className="text-sm font-bold" style={{ color: '#16a34a' }}>
                        {totalConfirmados.toLocaleString()}
                        <span className="text-xs font-normal text-gray-400 ml-1">({pct}%)</span>
                      </p>
                    </div>
                  )}
                  <span
                    className="text-lg font-bold tabular-nums"
                    style={{ color: 'var(--color-marino)' }}
                  >
                    {totalNucleo.toLocaleString()}
                    <span className="text-xs font-normal text-gray-400 ml-1">colegiados</span>
                  </span>
                </div>
              </button>

              {/* Lista de profesiones (expandible) */}
              {abierto && (
                <div className="border-t border-gray-100 divide-y divide-gray-50">
                  {/* Fila "Ver todos confirmados del núcleo" */}
                  {totalConfirmados > 0 && (
                    <div className="px-8 py-2 bg-green-50/50">
                      <button
                        onClick={() => abrirDrilldown(nucleo, null)}
                        className="text-xs font-semibold text-green-700 hover:underline"
                      >
                        ★ Ver los {totalConfirmados} confirmados de {nucleo} →
                      </button>
                    </div>
                  )}
                  {profesiones.map(p => (
                    <div key={p.nombre} className="flex items-center justify-between px-8 py-3 gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-700">{p.nombre}</p>
                        {p.confirmados > 0 && (
                          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                            <button
                              onClick={() => abrirDrilldown(nucleo, p.nombre)}
                              className="text-xs font-semibold text-green-700 hover:underline"
                            >
                              ★ {p.confirmados} confirmados →
                            </button>
                            <div className="flex items-center gap-2 text-[10px] text-gray-400">
                              {p.confirmados_callcenter > 0 && <span>📞 Call center: {p.confirmados_callcenter}</span>}
                              {p.confirmados_verificate > 0 && <span>🌐 Verifícate: {p.confirmados_verificate}</span>}
                              {p.confirmados_dirigente  > 0 && <span>👤 Dirigente: {p.confirmados_dirigente}</span>}
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="w-24 bg-gray-100 rounded-full h-1.5 hidden sm:block">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: totalNucleo > 0 ? `${(p.total / totalNucleo) * 100}%` : '0%',
                              backgroundColor: 'var(--color-real)',
                            }}
                          />
                        </div>
                        <span className="text-sm font-semibold tabular-nums text-gray-800 w-12 text-right">
                          {p.total.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Modal drilldown confirmados */}
      {drilldown && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(14,28,66,0.5)' }}
          onClick={() => setDrilldown(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-6 py-4 flex items-start justify-between" style={{ backgroundColor: 'var(--color-marino)', color: 'white' }}>
              <div>
                <p className="font-bold text-base">Confirmados — {drilldown.nucleo}</p>
                {drilldown.carrera && <p className="text-blue-200 text-sm">{drilldown.carrera}</p>}
              </div>
              <button onClick={() => setDrilldown(null)} className="text-blue-200 hover:text-white text-xl font-bold ml-4">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {cargandoDrill ? (
                <p className="text-center text-gray-400 py-10">Cargando…</p>
              ) : detalle.length === 0 ? (
                <p className="text-center text-gray-400 py-10">Sin confirmados.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs uppercase text-gray-500 bg-gray-50 border-b sticky top-0">
                      <th className="text-left px-5 py-2">Nombre</th>
                      <th className="text-left px-5 py-2 hidden sm:table-cell">Colegiatura</th>
                      <th className="text-left px-5 py-2">Vía</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {detalle.map(d => (
                      <tr key={d.codigo} className="hover:bg-blue-50/20">
                        <td className="px-5 py-2.5 font-medium text-gray-900">{d.nombre_completo}</td>
                        <td className="px-5 py-2.5 text-gray-500 hidden sm:table-cell">{d.codigo}</td>
                        <td className="px-5 py-2.5">
                          <div className="flex flex-wrap gap-1">
                            {d.via_callcenter && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700">📞 Call center</span>
                            )}
                            {d.via_verificate && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-green-100 text-green-700">🌐 Verifícate</span>
                            )}
                            {d.via_dirigente && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700">
                                👤 {d.confirmado_por ?? 'Dirigente'}
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="px-6 py-3 border-t border-gray-100 text-xs text-gray-400">
              {!cargandoDrill && `${detalle.length} confirmados`}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Tab: Simpatizantes por regularizar ──────────────────────────────────────

interface SimpatizanteRow {
  id: number
  codigo: string
  nombre_completo: string
  cedula: string | null
  telefono: string | null
  celular: string | null
  regional: string | null
  provincia: string | null
  nucleo: string | null
  carrera: string | null
  pensionado: boolean
  tiene_deuda: boolean
  monto_deuda: number
  voto_verificate_at: string | null
}

function TabRegularizar() {
  const supabase = createClient()
  const [lista, setLista] = useState<SimpatizanteRow[]>([])
  const [cargando, setCargando] = useState(true)
  const [filtro, setFiltro] = useState('')

  useEffect(() => {
    supabase.rpc('simpatizantes_por_regularizar').then(({ data }) => {
      const rows = (data as SimpatizanteRow[]) ?? []
      setLista(rows)
      setCargando(false)
      // Para cada colegiado sin monto conocido, consultar CODIA en línea en background
      for (const r of rows) {
        if (!r.cedula || r.monto_deuda > 0) continue
        fetch('/api/consulta-deuda', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cedula: r.cedula, codigo: r.codigo }),
        })
          .then(res => res.json())
          .then((d: { encontrado: boolean; monto: number }) => {
            if (!d.encontrado || d.monto === 0) return
            setLista(prev => prev.map(p =>
              p.id === r.id ? { ...p, monto_deuda: d.monto, tiene_deuda: true } : p
            ))
          })
          .catch(() => {})
      }
    })
  }, [supabase])

  const filtrados = lista.filter(r => {
    const q = filtro.toLowerCase()
    return !q || r.nombre_completo.toLowerCase().includes(q)
      || String(r.codigo).includes(q)
      || (r.cedula ?? '').toLowerCase().includes(q)
  })

  return (
    <div className="space-y-4">
      <div className="bg-green-50 border border-green-200 rounded-2xl px-5 py-4">
        <p className="text-sm font-bold text-green-800">⭐ Simpatizantes que necesitan regularizarse</p>
        <p className="text-xs text-green-700 mt-0.5">
          Estos colegiados marcaron preferencia por George Richardson en el portal de Verifícate,
          pero tienen deuda o son pensionados. Contáctalos para regularizar su situación antes del 12 de junio.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <input
          type="text"
          placeholder="Buscar por nombre, colegiatura o cédula…"
          value={filtro}
          onChange={e => setFiltro(e.target.value)}
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2"
          style={{ '--tw-ring-color': 'var(--color-marino)' } as React.CSSProperties}
        />
      </div>

      {cargando ? (
        <p className="text-center text-gray-400 py-8">Cargando…</p>
      ) : filtrados.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-12 text-center">
          <p className="text-gray-400 text-sm">{filtro ? 'Sin resultados para esa búsqueda.' : 'No hay simpatizantes pendientes de regularizar.'}</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-700">{filtrados.length} colegiado{filtrados.length !== 1 ? 's' : ''}</p>
            <p className="text-xs text-gray-400">Ordenados por menor deuda primero</p>
          </div>
          <div className="divide-y divide-gray-50">
            {filtrados.map(r => (
              <div key={r.id} className="px-5 py-4 space-y-1.5">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <p className="font-semibold text-sm text-gray-900">{r.nombre_completo}</p>
                    <p className="text-xs text-gray-400">Colegiatura {r.codigo}{r.cedula && <> · CI: {r.cedula}</>}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {r.monto_deuda > 0 && (
                      <span className="text-sm font-black tabular-nums text-orange-600">
                        RD$ {r.monto_deuda.toLocaleString()}
                      </span>
                    )}
                    {r.pensionado && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">Pensionado</span>
                    )}
                    {r.tiene_deuda && r.monto_deuda === 0 && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">Deuda pendiente</span>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-gray-500">
                  {r.carrera  && <span>Profesión: <span className="font-medium text-gray-700">{r.carrera}</span></span>}
                  {r.regional && <span>Regional: <span className="font-medium text-gray-700">{r.regional}</span></span>}
                  {r.nucleo   && <span>Núcleo: <span className="font-medium text-gray-700">{r.nucleo}</span></span>}
                  {(r.telefono || r.celular) && (
                    <span>Tel: <span className="font-medium text-gray-700">{r.celular ?? r.telefono}</span></span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Tab: Confirmados por dirigente ──────────────────────────────────────────

interface ConfirmadoResumen {
  dirigente: string
  total: number
  favorables: number
  indecisos: number
  en_contra: number
  ultima_confirmacion: string | null
}

function TabConfirmadosPresidente() {
  const supabase = createClient()
  const [resumen, setResumen]         = useState<ConfirmadoResumen[]>([])
  const [totalVerif, setTotalVerif]   = useState(0)
  const [totalCallCenter, setTotalCallCenter] = useState(0)
  const [cargando, setCargando]       = useState(true)

  useEffect(() => {
    Promise.all([
      supabase.from('v_confirmados_por_dirigente').select('*'),
      supabase.from('padron').select('codigo', { count: 'exact', head: true })
        .eq('simpatiza_verificate', true),
      supabase.rpc('confirmados_callcenter_count'),
    ]).then(([{ data }, { count }, { data: ccData }]) => {
      setResumen((data as ConfirmadoResumen[]) ?? [])
      setTotalVerif(count ?? 0)
      setTotalCallCenter(Number(ccData ?? 0))
      setCargando(false)
    })
  }, [supabase]) // eslint-disable-line react-hooks/exhaustive-deps

  const totalConfirmados = resumen.reduce((s, r) => s + r.total, 0)
  const totalFavorables  = resumen.reduce((s, r) => s + r.favorables, 0) + totalVerif + totalCallCenter

  if (cargando) return <p className="text-center text-gray-400 py-10">Cargando…</p>

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { titulo: 'Total confirmados (dirigentes)', valor: totalConfirmados, color: 'var(--color-marino)' },
          { titulo: 'Via Verifícate (simpatizantes)', valor: totalVerif, color: '#16a34a' },
          { titulo: 'Via Call Center', valor: totalCallCenter, color: '#2563eb' },
          { titulo: 'Favorables totales', valor: totalFavorables, color: '#ca8a04' },
        ].map(({ titulo, valor, color }) => (
          <div key={titulo} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 border-t-4" style={{ borderTopColor: color }}>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{titulo}</p>
            <p className="text-3xl font-black mt-1 tabular-nums" style={{ color }}>{valor.toLocaleString()}</p>
          </div>
        ))}
      </div>

      {/* Tabla por dirigente */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100">
          <p className="text-sm font-semibold text-gray-700">Por dirigente</p>
        </div>
        {resumen.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-10">Sin confirmaciones de dirigentes todavía.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-gray-500 bg-gray-50 border-b">
                  <th className="text-left px-4 py-3">Dirigente</th>
                  <th className="text-right px-4 py-3">Total</th>
                  <th className="text-right px-4 py-3 text-green-700">Favorables</th>
                  <th className="text-right px-4 py-3 text-yellow-700">Indecisos</th>
                  <th className="text-right px-4 py-3 text-red-600">En contra</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {resumen.map(r => (
                  <tr key={r.dirigente} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">{r.dirigente}</td>
                    <td className="px-4 py-3 text-right font-bold tabular-nums">{r.total}</td>
                    <td className="px-4 py-3 text-right text-green-700 font-semibold tabular-nums">{r.favorables}</td>
                    <td className="px-4 py-3 text-right text-yellow-700 tabular-nums">{r.indecisos}</td>
                    <td className="px-4 py-3 text-right text-red-600 tabular-nums">{r.en_contra}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-200 font-bold">
                  <td className="px-4 py-3 text-gray-700">Total</td>
                  <td className="px-4 py-3 text-right tabular-nums">{totalConfirmados}</td>
                  <td className="px-4 py-3 text-right text-green-700 tabular-nums">
                    {resumen.reduce((s, r) => s + r.favorables, 0)}
                  </td>
                  <td className="px-4 py-3 text-right text-yellow-700 tabular-nums">
                    {resumen.reduce((s, r) => s + r.indecisos, 0)}
                  </td>
                  <td className="px-4 py-3 text-right text-red-600 tabular-nums">
                    {resumen.reduce((s, r) => s + r.en_contra, 0)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Tab: Día de Elección (tiempo real) ──────────────────────────────────────

interface AlertaDoble {
  codigo: string
  nombre_completo: string
  mesas: number
  lista_mesas: string
}

interface AlertaNoHab {
  codigo: string
  nombre_completo: string
  mesa: string | null
  registrado_por: string | null
  created_at: string
}

function TabDiaEleccion() {
  const supabase = createClient()
  const [totalVotos, setTotalVotos]       = useState(0)
  const [porMesa, setPorMesa]             = useState<Record<string, number>>({})
  const [alertasDoble, setAlertasDoble]   = useState<AlertaDoble[]>([])
  const [alertasNoHab, setAlertasNoHab]   = useState<AlertaNoHab[]>([])
  const [cargando, setCargando]           = useState(true)

  const cargar = useCallback(async () => {
    const [resConteo, resDoble, resNoHab] = await Promise.all([
      supabase.rpc('conteo_votos_dia'),
      supabase.from('v_alerta_doble_voto').select('*'),
      supabase.from('v_alerta_no_habilitado').select('*').order('created_at', { ascending: false }),
    ])
    const c = Array.isArray(resConteo.data) ? resConteo.data[0] : resConteo.data
    if (c) {
      setTotalVotos(c.total_votos ?? 0)
      setPorMesa((c.por_mesa as Record<string, number>) ?? {})
    }
    setAlertasDoble((resDoble.data as AlertaDoble[]) ?? [])
    setAlertasNoHab((resNoHab.data as AlertaNoHab[]) ?? [])
    setCargando(false)
  }, [supabase])

  useEffect(() => {
    cargar()
    // Realtime en votos_dia
    const canal = supabase
      .channel('dia-eleccion-live')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'votos_dia' }, () => cargar())
      .subscribe()
    return () => { supabase.removeChannel(canal) }
  }, [supabase, cargar])

  if (cargando) return <p className="text-center text-gray-400 py-10">Cargando…</p>

  const mesasSorted = Object.entries(porMesa).sort(([a], [b]) => a.localeCompare(b))

  return (
    <div className="space-y-5">
      {/* Contador total */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center border-t-4"
        style={{ borderTopColor: 'var(--color-marino)' }}>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Votos registrados</p>
        <p className="text-7xl font-black mt-2 tabular-nums" style={{ color: 'var(--color-marino)' }}>
          {totalVotos.toLocaleString()}
        </p>
      </div>

      {/* Votos por mesa */}
      {mesasSorted.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-700">Por mesa</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-0 divide-x divide-y divide-gray-100">
            {mesasSorted.map(([mesa, cnt]) => (
              <div key={mesa} className="p-4 text-center">
                <p className="text-xs text-gray-400 font-semibold">Mesa {mesa}</p>
                <p className="text-3xl font-black tabular-nums" style={{ color: 'var(--color-marino)' }}>{cnt}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Alertas doble voto */}
      {alertasDoble.length > 0 && (
        <div className="bg-red-50 border border-red-300 rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-red-200 bg-red-100">
            <p className="text-sm font-bold text-red-800">⚠ Alerta: Doble voto ({alertasDoble.length})</p>
          </div>
          <div className="divide-y divide-red-100">
            {alertasDoble.map(a => (
              <div key={a.codigo} className="px-5 py-3">
                <p className="text-sm font-semibold text-red-900">{a.nombre_completo}</p>
                <p className="text-xs text-red-700">Colegiatura {a.codigo} · Mesas: {a.lista_mesas}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Alertas no habilitado */}
      {alertasNoHab.length > 0 && (
        <div className="bg-orange-50 border border-orange-300 rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-orange-200 bg-orange-100">
            <p className="text-sm font-bold text-orange-800">⚠ Alerta: Votantes no habilitados ({alertasNoHab.length})</p>
          </div>
          <div className="divide-y divide-orange-100">
            {alertasNoHab.map((a, i) => (
              <div key={`${a.codigo}-${i}`} className="px-5 py-3">
                <p className="text-sm font-semibold text-orange-900">{a.nombre_completo}</p>
                <p className="text-xs text-orange-700">
                  Colegiatura {a.codigo}{a.mesa && ` · Mesa ${a.mesa}`}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {alertasDoble.length === 0 && alertasNoHab.length === 0 && totalVotos > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-2xl px-5 py-4 text-center">
          <p className="text-green-800 font-semibold text-sm">Sin alertas — todo en orden</p>
        </div>
      )}
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

interface Props {
  nombreUsuario: string
  rol: string
}

export default function DashboardPresidente({ nombreUsuario, rol }: Props) {
  const supabase = createClient()
  const [tab, setTab] = useState<Tab>('resumen')
  const [metricas, setMetricas] = useState<MetricaDistrito[]>([])
  const [padron, setPadron] = useState<PadronVivoRow[]>([])
  const [simpatizantesVerificate, setSimpatizantesVerificate] = useState(0)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [ultimaActualizacion, setUltimaActualizacion] = useState<Date | null>(null)

  const cargar = useCallback(async () => {
    const [resMetricas, resPadron, resVerif] = await Promise.all([
      supabase.from('vista_metricas_distrito').select('*'),
      supabase.from('vista_padron_vivo').select('*').order('nombre_completo').limit(49200),
      supabase.from('padron').select('codigo', { count: 'exact', head: true }).eq('simpatiza_verificate', true),
    ])

    if (resMetricas.error || resPadron.error) {
      setError('Error al cargar los datos. Verifica tu conexión.')
      return
    }

    setMetricas((resMetricas.data as MetricaDistrito[]) ?? [])
    setPadron((resPadron.data as PadronVivoRow[]) ?? [])
    setSimpatizantesVerificate(resVerif.count ?? 0)
    setError(null)
    setUltimaActualizacion(new Date())
  }, [supabase])

  useEffect(() => {
    cargar().finally(() => setCargando(false))
  }, [cargar])

  // Polling cada 30 s
  useEffect(() => {
    const timer = setInterval(cargar, 30_000)
    return () => clearInterval(timer)
  }, [cargar])

  // Realtime en llamadas y miembros
  useEffect(() => {
    const canal = supabase
      .channel('presidente-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'llamadas' }, () => cargar())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'padron' }, () => cargar())
      .subscribe()
    return () => { supabase.removeChannel(canal) }
  }, [supabase, cargar])

  const colaboradoras = Array.from(
    new Set(padron.filter(f => f.asignado_a).map(f => f.asignado_a as string))
  ).sort()

  const TABS: { id: Tab; label: string }[] = [
    { id: 'resumen',      label: 'Resumen por distrito' },
    { id: 'padron',       label: 'Padrón en vivo' },
    { id: 'nucleos',      label: 'Vista por Núcleos' },
    { id: 'regularizar',  label: '⭐ Por regularizar' },
    { id: 'confirmados',  label: '✓ Confirmados' },
    { id: 'dia_eleccion', label: '🗳 Día de Elección' },
  ]

  if (cargando) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: 'var(--color-fondo)' }}>
        <AppHeader nombreUsuario={nombreUsuario} rol={rol} />
        <div className="flex items-center justify-center py-24">
          <p className="text-gray-400">Cargando datos…</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: 'var(--color-fondo)' }}>
        <AppHeader nombreUsuario={nombreUsuario} rol={rol} />
        <div className="max-w-xl mx-auto px-4 py-12">
          <p className="text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-fondo)' }}>
      <AppHeader nombreUsuario={nombreUsuario} rol={rol} />

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Encabezado */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--color-marino)' }}>
              Portal Presidencia — Elecciones CODIA
            </h1>
            <p className="text-sm text-gray-400 capitalize">
              {new Date().toLocaleDateString('es-DO', { timeZone: ZONA, weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {ultimaActualizacion && (
              <p className="text-xs text-gray-400">
                Actualizado:{' '}
                {ultimaActualizacion.toLocaleTimeString('es-DO', {
                  timeZone: ZONA,
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })}
              </p>
            )}
            <button
              onClick={cargar}
              className="text-sm px-4 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 font-medium transition-colors"
            >
              ↻ Refrescar
            </button>
          </div>
        </div>

        {/* Navegación de tabs */}
        <div className="flex gap-1 bg-white rounded-xl border border-gray-100 shadow-sm p-1 w-fit">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="text-sm px-4 py-2 rounded-lg font-medium transition-colors"
              style={
                tab === t.id
                  ? { backgroundColor: 'var(--color-marino)', color: 'white' }
                  : { color: 'var(--color-real)' }
              }
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Contenido del tab activo */}
        {tab === 'resumen'      && <TabResumen metricas={metricas} padron={padron} simpatizantesVerificate={simpatizantesVerificate} />}
        {tab === 'padron'       && <TabPadron filas={padron} colaboradoras={colaboradoras} />}
        {tab === 'nucleos'      && <TabNucleos />}
        {tab === 'regularizar'  && <TabRegularizar />}
        {tab === 'confirmados'  && <TabConfirmadosPresidente />}
        {tab === 'dia_eleccion' && <TabDiaEleccion />}
      </div>
    </div>
  )
}
