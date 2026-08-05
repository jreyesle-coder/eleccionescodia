'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  ResponsiveContainer,
  PieChart, Pie, Cell, Tooltip,
} from 'recharts'
import AppHeader from '@/components/app-header'
import TabEncuesta from '@/components/presidente/TabEncuesta'
import TabAdminUsuarios from '@/components/presidente/TabAdminUsuarios'
import TabSegmentador from '@/components/presidente/TabSegmentador'
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

type Tab = 'resumen' | 'padron' | 'nucleos' | 'regularizar' | 'confirmados' | 'dia_eleccion' | 'encuesta' | 'pensionados' | 'segmentador' | 'usuarios'


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
                    ★ Confirma George Richardson
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

  return (
    <div className="space-y-6">
      {/* Tarjeta destacada global George Richardson */}
      <div
        className="rounded-2xl p-6 text-white flex flex-col sm:flex-row items-start sm:items-center gap-4"
        style={{ background: 'linear-gradient(135deg, var(--color-marino), var(--color-real))' }}
      >
        <div className="flex-1 space-y-1">
          <p className="text-blue-200 text-sm font-semibold uppercase tracking-wide">
            Total confirmados — George Richardson
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
        // confirmados_plancha1 = confirmados por cualquier vía (verificate, dirigente, callcenter)
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
              <p className="text-sm font-semibold text-gray-700">★ Confirmados George Richardson</p>
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

// TabPadron conservado por referencia pero no usado en el render
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const PAGE_PADRON = 100

// eslint-disable-next-line @typescript-eslint/no-unused-vars
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

// ─── Exportación a Excel (CSV con BOM UTF-8, abre directo en Excel) ───────────

const INTENCION_TEXTO: Record<string, string> = {
  favorable: 'Favorable',
  indeciso:  'Indeciso',
  en_contra: 'En contra',
}

function escaparCSV(valor: string | number | null | undefined): string {
  const s = valor == null ? '' : String(valor)
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

function viaTexto(d: ConfirmadoNucleoRow): string {
  const vias: string[] = []
  if (d.via_callcenter) vias.push('Call center')
  if (d.via_verificate) vias.push('Verifícate')
  if (d.via_dirigente)  vias.push('Dirigente')
  return vias.join(' / ')
}

function exportarConfirmadosCSV(filas: ConfirmadoNucleoRow[], nombreArchivo: string) {
  const encabezados = ['Nombre', 'Colegiatura', 'Regional', 'Núcleo', 'Carrera', 'Vía', 'Confirmado por', 'Intención']
  const lineas = [encabezados.join(',')]
  for (const d of filas) {
    lineas.push([
      escaparCSV(d.nombre_completo),
      escaparCSV(d.codigo),
      escaparCSV(d.regional),
      escaparCSV(d.nucleo),
      escaparCSV(d.carrera),
      escaparCSV(viaTexto(d)),
      escaparCSV(d.via_dirigente ? (d.confirmado_por ?? 'Dirigente') : ''),
      escaparCSV(d.confirmacion_intencion ? (INTENCION_TEXTO[d.confirmacion_intencion] ?? d.confirmacion_intencion) : ''),
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

function TabNucleos() {
  const supabase = createClient()
  const [datos, setDatos]                     = useState<NucleoAgrupado[]>([])
  const [totalGlobalReal, setTotalGlobalReal] = useState<number | null>(null)
  const [cargando, setCargando]               = useState(true)
  const [error, setError]                     = useState<string | null>(null)
  const [abiertos, setAbiertos]               = useState<Set<string>>(new Set())
  const [drilldown, setDrilldown]             = useState<{ nucleo: string; carrera: string | null } | null>(null)
  const [detalle, setDetalle]                 = useState<ConfirmadoNucleoRow[]>([])
  const [cargandoDrill, setCargandoDrill]     = useState(false)
  const [exportando, setExportando]           = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      supabase.rpc('stats_nucleos'),
      supabase.rpc('confirmados_total_global'),
    ]).then(([{ data, error: err }, { data: totalData }]) => {
      setTotalGlobalReal(Number(totalData ?? 0))
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

  async function exportarNucleo(nucleo: string) {
    setExportando(nucleo)
    const { data } = await supabase.rpc('listar_confirmados_nucleo', {
      p_nucleo: nucleo,
      p_carrera: null,
    })
    const filas = (data as ConfirmadoNucleoRow[]) ?? []
    if (filas.length > 0) {
      const fecha = new Date().toISOString().slice(0, 10)
      const slug = nucleo.replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '_')
      exportarConfirmadosCSV(filas, `confirmados_${slug}_${fecha}.csv`)
    }
    setExportando(null)
  }

  const totalGlobal     = datos.reduce((s, n) => s + n.totalNucleo, 0)
  // totalGlobalReal viene de la BD deduplicado; la suma por núcleos puede contar
  // una persona varias veces si tiene carreras en núcleos distintos.
  const totalConfGlobal = totalGlobalReal ?? datos.reduce((s, n) => s + n.totalConfirmados, 0)

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
                  {/* Fila "Ver todos confirmados del núcleo" + Exportar */}
                  {totalConfirmados > 0 && (
                    <div className="px-8 py-2 bg-green-50/50 flex items-center justify-between gap-3 flex-wrap">
                      <button
                        onClick={() => abrirDrilldown(nucleo, null)}
                        className="text-xs font-semibold text-green-700 hover:underline"
                      >
                        ★ Ver los {totalConfirmados} confirmados de {nucleo} →
                      </button>
                      <button
                        onClick={() => exportarNucleo(nucleo)}
                        disabled={exportando === nucleo}
                        className="text-xs font-semibold px-3 py-1.5 rounded-lg text-white shadow-sm hover:opacity-90 active:scale-95 transition-all disabled:opacity-60 shrink-0"
                        style={{ backgroundColor: '#16a34a' }}
                      >
                        {exportando === nucleo ? 'Generando…' : '⬇ Exportar a Excel'}
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

// ─── Tab: Padrón Activo (misma experiencia que dirigente, padrón general) ────

interface MiembroPadronActivo {
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
  nuevo_integrante: boolean
  tiene_deuda: boolean
  monto_deuda: number
  centro_votacion: string | null
  posicion: number | null
  confirmado_por: string | null
  confirmacion_intencion: string | null
  confirmacion_at: string | null
}

interface DeudaAPI {
  encontrado: boolean
  monto: number
  regional?: string | null
  centro_votacion?: string | null
  nucleo?: string | null
  posicion?: number | null
}

const INTENCION_LABEL_P: Record<string, string> = {
  favorable: '✓ Favorable',
  indeciso:  '~ Indeciso',
  en_contra: '✗ En contra',
}
const INTENCION_COLOR_P: Record<string, string> = {
  favorable: 'bg-green-100 text-green-800',
  indeciso:  'bg-yellow-100 text-yellow-800',
  en_contra: 'bg-red-100 text-red-700',
}
const INTENCION_ACTIVE_P: Record<string, string> = {
  favorable: 'bg-green-600 text-white border-green-600',
  indeciso:  'bg-yellow-500 text-white border-yellow-500',
  en_contra: 'bg-red-500 text-white border-red-500',
}
const INTENCION_BORDER_P: Record<string, string> = {
  favorable: 'border-green-400 text-green-800',
  indeciso:  'border-yellow-400 text-yellow-800',
  en_contra: 'border-red-300 text-red-700',
}

function FilaDato({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-xs text-gray-400 shrink-0">{label}</span>
      <span className="text-sm font-medium text-gray-800 text-right">{valor}</span>
    </div>
  )
}

const PAGE_PADRON_ACTIVO = 100

function TabPadronActivo({ nombreUsuario }: { nombreUsuario: string }) {
  const supabase = createClient()

  const [padron, setPadron]             = useState<MiembroPadronActivo[]>([])
  const [cargando, setCargando]         = useState(false)
  const [busqueda, setBusqueda]         = useState('')
  const [busquedaDebounced, setBusquedaDebounced] = useState('')
  const [filtroRegional, setFiltroRegional] = useState('')
  const [filtroNucleo, setFiltroNucleo] = useState('')
  const [pagina, setPagina]             = useState(0)
  const [total, setTotal]               = useState<number | null>(null)

  const [todasRegionales, setTodasRegionales] = useState<string[]>([])
  const [todosNucleos, setTodosNucleos]       = useState<string[]>([])
  const [nucleosPorRegional, setNucleosPorRegional] = useState<string[]>([])

  const [detalle, setDetalle]                       = useState<MiembroPadronActivo | null>(null)
  const [detalleDeuda, setDetalleDeuda]             = useState<DeudaAPI | null>(null)
  const [cargandoDeuda, setCargandoDeuda]           = useState(false)
  const [detalleIntencion, setDetalleIntencion]     = useState<string | null>(null)
  const [detalleGuardando, setDetalleGuardando]     = useState(false)
  const [detalleError, setDetalleError]             = useState<string | null>(null)

  // Debounce: espera 400ms después del último keystroke para disparar la búsqueda
  useEffect(() => {
    const t = setTimeout(() => setBusquedaDebounced(busqueda), 400)
    return () => clearTimeout(t)
  }, [busqueda])

  // Resetear página cuando cambian los filtros
  useEffect(() => { setPagina(0) }, [busquedaDebounced, filtroRegional, filtroNucleo])

  // Carga opciones de filtro (liviano, sin límite de 1000 filas)
  useEffect(() => {
    supabase.rpc('opciones_padron').then(({ data }) => {
      const rows = (data as { tipo: string; valor: string }[]) ?? []
      setTodasRegionales(rows.filter(r => r.tipo === 'regional').map(r => r.valor).sort())
      setTodosNucleos(rows.filter(r => r.tipo === 'nucleo').map(r => r.valor).sort())
    })
  }, [supabase])

  // Cuando cambia la regional, actualiza los núcleos disponibles
  useEffect(() => {
    if (!filtroRegional) {
      setNucleosPorRegional([])
      return
    }
    supabase.rpc('opciones_padron').then(() => {
      setNucleosPorRegional([])
    })
  }, [filtroRegional, supabase])

  // Carga una página a la vez — sin loop masivo
  useEffect(() => {
    const q = busquedaDebounced.trim()
    const params = {
      p_regional: filtroRegional || null,
      p_nucleo:   filtroNucleo   || null,
      p_q:        q.length >= 3 ? q : null,
      p_limit:    PAGE_PADRON_ACTIVO,
      p_offset:   pagina * PAGE_PADRON_ACTIVO,
    }
    setCargando(true)
    supabase.rpc('buscar_padron_presidente', params).then(({ data, error }) => {
      if (error) { console.error('buscar_padron_presidente error:', error); setCargando(false); return }
      const filas = (data as MiembroPadronActivo[]) ?? []
      setPadron(filas)
      // Si devuelve menos de PAGE, sabemos cuántos hay en total en esta página
      if (filas.length < PAGE_PADRON_ACTIVO) {
        setTotal(pagina * PAGE_PADRON_ACTIVO + filas.length)
      } else {
        setTotal(null) // hay más páginas, total desconocido
      }
      setCargando(false)
    })
  }, [supabase, filtroRegional, filtroNucleo, busquedaDebounced, pagina])

  const nucleos = filtroRegional ? nucleosPorRegional.length > 0 ? nucleosPorRegional : todosNucleos : todosNucleos
  const filtrado = padron
  const hayMas = total === null

  async function abrirDetalle(m: MiembroPadronActivo) {
    setDetalle(m)
    setDetalleDeuda(null)
    setDetalleIntencion(null)
    setDetalleError(null)
    setCargandoDeuda(true)
    try {
      const res  = await fetch('/api/consulta-deuda', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codigo: m.codigo }),
      })
      const data = await res.json() as DeudaAPI
      setDetalleDeuda(data)
      if (data.encontrado) {
        // El servidor ya persistió vía set_datos_codia; refrescamos el estado local.
        const frescos = {
          regional:        data.regional ?? m.regional,
          centro_votacion: data.centro_votacion ?? m.centro_votacion,
          nucleo:          data.nucleo ?? m.nucleo,
          posicion:        data.posicion ?? m.posicion,
          monto_deuda:     data.monto,
          tiene_deuda:     data.monto > 0,
        }
        setDetalle(prev => prev && prev.codigo === m.codigo ? { ...prev, ...frescos } : prev)
        setPadron(prev => prev.map(x => x.codigo === m.codigo ? { ...x, ...frescos } : x))
      }
    } catch { /* no interrumpir */ } finally { setCargandoDeuda(false) }
  }

  async function guardarDetalle() {
    if (!detalle || !detalleIntencion || detalleGuardando) return
    setDetalleGuardando(true); setDetalleError(null)
    const { error } = await supabase.rpc('confirmar_colegiado', {
      p_codigo: detalle.codigo, p_intencion: detalleIntencion,
    })
    setDetalleGuardando(false)
    if (error) {
      const msg = error.message ?? ''
      setDetalleError(
        msg.startsWith('Ya confirmado por') ? msg + '. No se puede re-confirmar.'
        : 'No se pudo guardar. Intenta de nuevo.'
      )
      return
    }
    const codigo = detalle.codigo
    const intencion = detalleIntencion
    setPadron(prev => prev.map(x =>
      x.codigo === codigo ? { ...x, confirmado_por: nombreUsuario, confirmacion_intencion: intencion } : x
    ))
    setDetalle(prev => prev ? { ...prev, confirmado_por: nombreUsuario, confirmacion_intencion: intencion } : prev)
    setDetalleIntencion(null)
  }

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4 flex flex-wrap gap-3">
        <input
          type="text" value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre, colegiatura o cédula…"
          className="flex-1 min-w-[200px] text-sm px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-200"
        />
        <select value={filtroRegional}
          onChange={e => { setFiltroRegional(e.target.value); setFiltroNucleo('') }}
          className="text-sm px-4 py-2.5 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-200"
        >
          <option value="">Todas las regionales</option>
          {todasRegionales.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <select value={filtroNucleo} onChange={e => setFiltroNucleo(e.target.value)}
          className="text-sm px-4 py-2.5 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-200"
        >
          <option value="">Todos los núcleos</option>
          {nucleos.map(n => <option key={n} value={n}>{n}</option>)}
        </select>
        {(busqueda || filtroRegional || filtroNucleo) && (
          <button onClick={() => { setBusqueda(''); setFiltroRegional(''); setFiltroNucleo(''); setPagina(0) }}
            className="text-sm text-blue-600 hover:underline px-2">Limpiar</button>
        )}
        <p className="w-full text-xs text-gray-400">
          {cargando ? 'Buscando…' : total !== null
            ? `${total.toLocaleString()} colegiados`
            : `Mostrando ${pagina * PAGE_PADRON_ACTIVO + 1}–${pagina * PAGE_PADRON_ACTIVO + filtrado.length}`}
        </p>
      </div>

      {/* Lista */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="divide-y divide-gray-50">
          {cargando ? (
            <p className="text-center text-gray-400 text-sm py-12">Cargando…</p>
          ) : filtrado.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-12">Sin resultados.</p>
          ) : filtrado.map(m => (
            <button key={m.id} onClick={() => abrirDetalle(m)}
              className="w-full text-left px-5 py-3.5 flex items-center justify-between gap-3 hover:bg-gray-50 active:bg-gray-100 transition-colors"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-900 truncate">{m.nombre_completo}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  #{m.codigo}
                  {m.regional && <> · <span className="text-gray-500">{m.regional}</span></>}
                  {m.nucleo   && <> · {m.nucleo}</>}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                {m.confirmacion_intencion ? (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${INTENCION_COLOR_P[m.confirmacion_intencion]}`}>
                    {INTENCION_LABEL_P[m.confirmacion_intencion]}
                  </span>
                ) : (
                  <span className="text-[10px] text-gray-300">Pendiente</span>
                )}
                {m.tiene_deuda && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">Deuda</span>}
                {m.pensionado  && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">Pensionado</span>}
              </div>
              <span className="text-gray-300 text-lg shrink-0">›</span>
            </button>
          ))}
        </div>
      </div>

      {/* Paginación */}
      {!cargando && (pagina > 0 || hayMas) && (
        <div className="flex items-center justify-between gap-3 bg-white rounded-xl border border-gray-100 px-4 py-3">
          <button
            disabled={pagina === 0}
            onClick={() => setPagina(p => p - 1)}
            className="text-sm px-4 py-2 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 font-medium"
          >
            ← Anterior
          </button>
          <span className="text-xs text-gray-500">Página {pagina + 1}</span>
          <button
            disabled={!hayMas}
            onClick={() => setPagina(p => p + 1)}
            className="text-sm px-4 py-2 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 font-medium"
          >
            Siguiente →
          </button>
        </div>
      )}

      {/* Panel de detalle — pantalla completa */}
      {detalle && (
        <div className="fixed inset-0 z-50 flex flex-col" style={{ backgroundColor: 'var(--color-fondo)' }}>
          <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 bg-white shrink-0">
            <button onClick={() => setDetalle(null)}
              className="flex items-center gap-1 text-sm font-semibold text-blue-600 hover:text-blue-800">
              ‹ Volver al padrón
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="max-w-xl mx-auto px-4 py-6 space-y-5">

              {/* Cabecera */}
              <div className="rounded-2xl overflow-hidden shadow-sm">
                <div className="px-6 py-5" style={{ backgroundColor: 'var(--color-marino)' }}>
                  <p className="text-white font-bold text-lg leading-tight">{detalle.nombre_completo}</p>
                  <p className="text-blue-200 text-sm mt-1">Colegiatura #{detalle.codigo}</p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {detalle.pensionado       && <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-purple-400 text-white">Pensionado</span>}
                    {detalle.nuevo_integrante && <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-blue-400 text-white">Nuevo integrante</span>}
                  </div>
                </div>

                {/* Datos personales */}
                <div className="bg-white px-6 py-4 space-y-3">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Datos personales</p>
                  <div className="space-y-2">
                    {detalle.cedula   && <FilaDato label="Cédula"    valor={detalle.cedula} />}
                    {detalle.celular  && <FilaDato label="Celular"   valor={detalle.celular} />}
                    {detalle.telefono && <FilaDato label="Teléfono"  valor={detalle.telefono} />}
                  </div>
                </div>

                {/* Datos CODIA */}
                <div className="bg-gray-50 px-6 py-4 space-y-3 border-t border-gray-100">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Datos CODIA</p>
                  <div className="space-y-2">
                    {detalle.carrera   && <FilaDato label="Profesión" valor={detalle.carrera} />}
                    {detalle.nucleo          && <FilaDato label="Núcleo"            valor={detalle.nucleo} />}
                    {detalle.regional        && <FilaDato label="Regional"          valor={detalle.regional} />}
                    {detalle.provincia       && <FilaDato label="Provincia"         valor={detalle.provincia} />}
                    {detalle.centro_votacion && <FilaDato label="Centro de votación" valor={detalle.centro_votacion} />}
                    {detalle.posicion != null && <FilaDato label="Posición"           valor={String(detalle.posicion)} />}
                  </div>
                </div>

                {/* Deuda */}
                <div className="bg-white px-6 py-4 border-t border-gray-100 space-y-2">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Estado de deuda</p>
                  {cargandoDeuda ? (
                    <p className="text-sm text-gray-400 animate-pulse">Consultando CODIA en línea…</p>
                  ) : detalleDeuda ? (
                    detalleDeuda.monto > 0 ? (
                      <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3">
                        <p className="text-orange-800 font-bold text-sm">⚠ Deuda activa</p>
                        <p className="text-orange-900 font-black text-2xl mt-0.5">RD$ {detalleDeuda.monto.toLocaleString()}</p>
                      </div>
                    ) : detalleDeuda.encontrado ? (
                      <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                        <p className="text-green-800 font-semibold text-sm">✅ Sin deuda en CODIA en línea</p>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400">No encontrado en el sistema de deuda.</p>
                    )
                  ) : detalle.monto_deuda > 0 ? (
                    <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3">
                      <p className="text-orange-800 font-bold text-sm">⚠ Deuda registrada</p>
                      <p className="text-orange-900 font-black text-2xl mt-0.5">RD$ {detalle.monto_deuda.toLocaleString()}</p>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400">Sin información de deuda.</p>
                  )}
                </div>
              </div>

              {/* Intención de voto */}
              {detalle.confirmado_por ? (
                <div className={`rounded-2xl px-6 py-5 text-center space-y-1 ${detalle.confirmacion_intencion ? INTENCION_COLOR_P[detalle.confirmacion_intencion] : 'bg-gray-100 text-gray-600'}`}>
                  <p className="font-bold text-base">
                    {detalle.confirmacion_intencion ? INTENCION_LABEL_P[detalle.confirmacion_intencion] : '✓ Confirmado'}
                  </p>
                  <p className="text-sm opacity-80">Por: {detalle.confirmado_por}</p>
                  {detalle.confirmacion_at && (
                    <p className="text-xs opacity-60">{fmt(detalle.confirmacion_at)}</p>
                  )}
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-5 space-y-4">
                  <p className="text-sm font-bold text-gray-700">¿Cuál es la intención de este colegiado?</p>
                  <div className="space-y-2">
                    {(['favorable', 'indeciso', 'en_contra'] as const).map(val => (
                      <button key={val} onClick={() => setDetalleIntencion(val)}
                        className={`w-full py-3.5 rounded-xl font-semibold text-sm border-2 transition-all ${detalleIntencion === val ? INTENCION_ACTIVE_P[val] : INTENCION_BORDER_P[val] + ' hover:opacity-80'}`}
                      >
                        {val === 'favorable' ? '✓ Favorable a George Richardson'
                         : val === 'indeciso' ? '~ Indeciso / Por decidir'
                         : '✗ En contra / Otra preferencia'}
                      </button>
                    ))}
                  </div>
                  {detalleError && (
                    <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-xl px-3 py-2">{detalleError}</p>
                  )}
                  <button onClick={guardarDetalle} disabled={detalleGuardando || !detalleIntencion}
                    className="w-full py-3.5 rounded-xl text-white font-bold text-sm disabled:opacity-40 transition-opacity"
                    style={{ backgroundColor: 'var(--color-marino)' }}
                  >
                    {detalleGuardando ? 'Guardando…' : 'Confirmar intención'}
                  </button>
                </div>
              )}
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
  const [lista, setLista]         = useState<SimpatizanteRow[]>([])
  const [cargando, setCargando]   = useState(true)
  const [filtro, setFiltro]       = useState('')
  const [confirmando, setConfirmando] = useState<string | null>(null)
  const [guardando, setGuardando]     = useState<string | null>(null)

  useEffect(() => {
    supabase.rpc('simpatizantes_por_regularizar').then(({ data }) => {
      const rows = (data as SimpatizanteRow[]) ?? []
      setLista(rows)
      setCargando(false)
      for (const r of rows) {
        if (r.monto_deuda > 0) continue
        fetch('/api/consulta-deuda', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ codigo: r.codigo }),
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
  }, [supabase]) // eslint-disable-line react-hooks/exhaustive-deps

  async function saldarDeuda(codigo: string) {
    setGuardando(codigo)
    const { error } = await supabase.rpc('saldar_deuda_colegiado', { p_codigo: codigo })
    setGuardando(null)
    setConfirmando(null)
    if (!error) {
      setLista(prev => prev.filter(r => r.codigo !== codigo))
    }
  }

  const [nucleosAbiertos, setNucleosAbiertos] = useState<Set<string>>(new Set())

  function toggleNucleo(n: string) {
    setNucleosAbiertos(prev => {
      const next = new Set(prev)
      if (next.has(n)) { next.delete(n) } else { next.add(n) }
      return next
    })
  }

  const filtrados = lista.filter(r => {
    const q = filtro.toLowerCase()
    return !q || r.nombre_completo.toLowerCase().includes(q)
      || String(r.codigo).includes(q)
      || (r.cedula ?? '').toLowerCase().includes(q)
  })

  const nucleosOrden = Array.from(
    filtrados.reduce((m, r) => {
      const n = r.nucleo ?? 'Sin núcleo'
      if (!m.has(n)) m.set(n, [])
      m.get(n)!.push(r)
      return m
    }, new Map<string, SimpatizanteRow[]>())
  ).sort(([a], [b]) => a.localeCompare(b))

  return (
    <div className="space-y-4">
      <div className="bg-green-50 border border-green-200 rounded-2xl px-5 py-4">
        <p className="text-sm font-bold text-green-800">⭐ Simpatizantes que necesitan regularizarse</p>
        <p className="text-xs text-green-700 mt-0.5">
          Estos colegiados marcaron preferencia por George Richardson en el portal de Verifícate,
          pero tienen deuda o son pensionados. Contáctalos para regularizar su situación antes del día de elección.
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
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <p className="text-sm font-semibold text-gray-700">{filtrados.length} colegiado{filtrados.length !== 1 ? 's' : ''}</p>
            <p className="text-xs text-gray-400">Ordenados por menor deuda primero</p>
          </div>
          {nucleosOrden.map(([nucleo, filas]) => {
            const abierto = nucleosAbiertos.has(nucleo)
            return (
            <div key={nucleo} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <button
                onClick={() => toggleNucleo(nucleo)}
                className="w-full px-5 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
                style={{ backgroundColor: abierto ? 'var(--color-fondo)' : undefined }}
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold uppercase tracking-wide" style={{ color: 'var(--color-marino)' }}>{nucleo}</span>
                  <span className="text-xs text-gray-400 font-normal">{filas.length} colegiado{filas.length !== 1 ? 's' : ''}</span>
                </div>
                <span className="text-gray-400 text-sm transition-transform" style={{ display: 'inline-block', transform: abierto ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
              </button>
              {abierto && (
              <div className="divide-y divide-gray-50 border-t border-gray-100">
            {filas.map(r => (
              <div key={r.id} className="px-5 py-4 space-y-2">
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

                {/* Botón / confirmación inline */}
                {confirmando === r.codigo ? (
                  <div className="flex items-center gap-2 pt-1">
                    <p className="text-xs text-gray-600 flex-1">¿Confirmas que la deuda fue saldada y habilitar este colegiado para votar?</p>
                    <button
                      onClick={() => saldarDeuda(r.codigo)}
                      disabled={guardando === r.codigo}
                      className="text-xs font-bold px-3 py-1.5 rounded-lg text-white transition-opacity disabled:opacity-50"
                      style={{ backgroundColor: '#16a34a' }}
                    >
                      {guardando === r.codigo ? 'Guardando…' : 'Sí, habilitar'}
                    </button>
                    <button
                      onClick={() => setConfirmando(null)}
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200"
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmando(r.codigo)}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors hover:bg-green-50"
                    style={{ borderColor: '#16a34a', color: '#16a34a' }}
                  >
                    ✓ Deuda saldada — Habilitar para votar
                  </button>
                )}
              </div>
            ))}
              </div>
              )}
            </div>
            )
          })}
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

interface ConfirmadoDetalleRow {
  codigo: string
  nombre_completo: string
  regional: string | null
  nucleo: string | null
  carrera: string | null
  via_verificate: boolean
  via_callcenter: boolean
  via_dirigente: boolean
  confirmado_por: string | null
}

type ModalVia = 'verificate' | 'callcenter' | 'dirigente' | 'todos'

function ModalConfirmados({
  titulo,
  via,
  onCerrar,
}: {
  titulo: string
  via: ModalVia
  onCerrar: () => void
}) {
  const supabase = createClient()
  const [lista, setLista]       = useState<ConfirmadoDetalleRow[]>([])
  const [cargando, setCargando] = useState(true)
  const [buscar, setBuscar]     = useState('')

  useEffect(() => {
    let activo = true
    supabase.rpc('listar_confirmados_detalle', { p_via: via }).then(({ data }) => {
      if (activo) {
        setLista((data as ConfirmadoDetalleRow[]) ?? [])
        setCargando(false)
      }
    })
    return () => { activo = false }
  }, [via]) // eslint-disable-line react-hooks/exhaustive-deps

  const filtrada = lista.filter(r => {
    const q = buscar.toLowerCase()
    return !q || r.nombre_completo.toLowerCase().includes(q) || r.codigo.includes(q)
  })

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(14,28,66,0.5)' }}
      onClick={onCerrar}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Cabecera */}
        <div className="px-6 py-4 flex items-start justify-between" style={{ backgroundColor: 'var(--color-marino)', color: 'white' }}>
          <div>
            <p className="font-bold text-base">{titulo}</p>
            {!cargando && <p className="text-blue-200 text-sm">{lista.length} persona{lista.length !== 1 ? 's' : ''}</p>}
          </div>
          <button onClick={onCerrar} className="text-blue-200 hover:text-white text-xl font-bold ml-4">✕</button>
        </div>

        {/* Buscador */}
        <div className="px-4 py-3 border-b border-gray-100">
          <input
            type="text"
            placeholder="Buscar por nombre o colegiatura…"
            value={buscar}
            onChange={e => setBuscar(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto">
          {cargando ? (
            <p className="text-center text-gray-400 py-10">Cargando…</p>
          ) : filtrada.length === 0 ? (
            <p className="text-center text-gray-400 py-10">{buscar ? 'Sin resultados.' : 'Sin registros.'}</p>
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
                {filtrada.map(r => (
                  <tr key={r.codigo} className="hover:bg-blue-50/20">
                    <td className="px-5 py-2.5">
                      <p className="font-medium text-gray-900">{r.nombre_completo}</p>
                      {(r.regional || r.nucleo) && (
                        <p className="text-xs text-gray-400">{[r.regional, r.nucleo].filter(Boolean).join(' · ')}</p>
                      )}
                    </td>
                    <td className="px-5 py-2.5 text-gray-500 hidden sm:table-cell">{r.codigo}</td>
                    <td className="px-5 py-2.5">
                      <div className="flex flex-wrap gap-1">
                        {r.via_verificate && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-green-100 text-green-700">🌐 Verifícate</span>
                        )}
                        {r.via_callcenter && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700">📞 Call center</span>
                        )}
                        {r.via_dirigente && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700">
                            👤 {r.confirmado_por ?? 'Dirigente'}
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
          {!cargando && `${filtrada.length} de ${lista.length} confirmados`}
        </div>
      </div>
    </div>
  )
}

function TabConfirmadosPresidente({ onVerPensionados }: { onVerPensionados: () => void }) {
  const supabase = createClient()
  const [resumen, setResumen]                       = useState<ConfirmadoResumen[]>([])
  const [totalVerif, setTotalVerif]                 = useState(0)
  const [totalCallCenter, setTotalCallCenter]       = useState(0)
  const [totalFavorables, setTotalFavorables]       = useState(0)
  const [pensionadosTotal, setPensionadosTotal]     = useState(0)
  const [pensionadosConfirm, setPensionadosConfirm] = useState(0)
  const [cargando, setCargando]                     = useState(true)
  const [modalVia, setModalVia]                     = useState<ModalVia | null>(null)
  const [modalTitulo, setModalTitulo]               = useState('')
  const [vista, setVista]                           = useState<'general' | 'nucleos'>('general')

  useEffect(() => {
    Promise.all([
      supabase.from('v_confirmados_por_dirigente').select('*'),
      supabase.rpc('confirmados_verificate_count'),
      supabase.rpc('confirmados_callcenter_count'),
      supabase.rpc('confirmados_total_global'),
      supabase.from('padron').select('codigo', { count: 'exact', head: true }).eq('pensionado_votante', true),
      supabase.from('padron').select('codigo', { count: 'exact', head: true }).eq('pensionado_votante', true).eq('confirmacion_intencion', 'favorable'),
    ]).then(([{ data }, { data: verifData }, { data: ccData }, { data: totalData }, resTotal, resConfirm]) => {
      setResumen((data as ConfirmadoResumen[]) ?? [])
      setTotalVerif(Number(verifData ?? 0))
      setTotalCallCenter(Number(ccData ?? 0))
      setTotalFavorables(Number(totalData ?? 0))
      setPensionadosTotal(resTotal.count ?? 0)
      setPensionadosConfirm(resConfirm.count ?? 0)
      setCargando(false)
    })
  }, [supabase]) // eslint-disable-line react-hooks/exhaustive-deps

  const totalConfirmados  = resumen.reduce((s, r) => s + r.total, 0)
  const totalFavorDirigente = resumen.reduce((s, r) => s + r.favorables, 0)

  function abrirModal(via: ModalVia, titulo: string) {
    setModalVia(via)
    setModalTitulo(titulo)
  }

  const tarjetas: { titulo: string; valor: number; color: string; via: ModalVia; subtitulo?: string }[] = [
    { titulo: 'Favorables (dirigentes)', valor: totalFavorDirigente, color: 'var(--color-marino)', via: 'dirigente', subtitulo: `${totalConfirmados} gestionados total` },
    { titulo: 'Via Verifícate (simpatizantes)', valor: totalVerif,       color: '#16a34a',            via: 'verificate' },
    { titulo: 'Via Call Center',                valor: totalCallCenter,  color: '#2563eb',            via: 'callcenter' },
    { titulo: 'Favorables totales',             valor: totalFavorables,  color: '#ca8a04',            via: 'todos' },
  ]

  const pctPensionados = pensionadosTotal > 0 ? Math.round(pensionadosConfirm / pensionadosTotal * 100) : 0

  return (
    <div className="space-y-5">
      {/* Sub-vistas: General / Por núcleos */}
      <div className="inline-flex rounded-xl bg-gray-100 p-1">
        {([['general', 'General'], ['nucleos', 'Por núcleos']] as const).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setVista(id)}
            className="px-4 py-1.5 text-sm font-semibold rounded-lg transition-all"
            style={
              vista === id
                ? { backgroundColor: 'var(--color-marino)', color: 'white' }
                : { color: '#6b7280' }
            }
          >
            {label}
          </button>
        ))}
      </div>

      {vista === 'nucleos' ? (
        <TabNucleos />
      ) : cargando ? (
        <p className="text-center text-gray-400 py-10">Cargando…</p>
      ) : (
        <div className="space-y-5">
      {/* KPIs — clickables */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {tarjetas.map(({ titulo, valor, color, via, subtitulo }) => (
          <button
            key={titulo}
            onClick={() => abrirModal(via, titulo)}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 border-t-4 text-left hover:shadow-md active:scale-95 transition-all"
            style={{ borderTopColor: color }}
          >
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{titulo}</p>
            <p className="text-3xl font-black mt-1 tabular-nums" style={{ color }}>{valor.toLocaleString()}</p>
            <p className="text-[10px] text-gray-300 mt-1">{subtitulo ?? 'Toca para ver lista →'}</p>
          </button>
        ))}
      </div>

      {/* Tarjeta Pensionados Votantes */}
      <button
        onClick={onVerPensionados}
        className="w-full rounded-2xl border-t-4 shadow-sm p-4 text-left hover:shadow-md active:scale-[0.99] transition-all flex items-center justify-between gap-4"
        style={{ borderTopColor: '#7c3aed', background: 'linear-gradient(135deg, #f5f3ff, #ede9fe)' }}
      >
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#6d28d9' }}>
            🟣 Pensionados Votantes ISES-CODIA
          </p>
          <p className="text-3xl font-black mt-1 tabular-nums" style={{ color: '#4c1d95' }}>
            {pensionadosConfirm.toLocaleString()}
            <span className="text-base font-semibold text-purple-400 ml-2">
              de {pensionadosTotal.toLocaleString()}
            </span>
          </p>
          <p className="text-xs mt-1" style={{ color: '#7c3aed' }}>
            {pctPensionados}% confirmados · Toca para gestionar →
          </p>
        </div>
        <div
          className="rounded-xl px-4 py-3 text-center shrink-0"
          style={{ backgroundColor: '#7c3aed', color: 'white' }}
        >
          <p className="text-2xl font-black tabular-nums">{pctPensionados}%</p>
          <p className="text-[10px] opacity-80 mt-0.5">confirmado</p>
        </div>
      </button>

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
      )}

      {/* Modal drilldown */}
      {modalVia && (
        <ModalConfirmados
          titulo={modalTitulo}
          via={modalVia}
          onCerrar={() => setModalVia(null)}
        />
      )}
    </div>
  )
}

// ─── Tab: Día de Elección (resultados A Favor / No A Favor) ──────────────────

interface RegionalResultado {
  a_favor:    number
  no_a_favor: number
  total:      number
}

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

interface MesaResultado {
  numero: number
  etiqueta: string
  lugar: string
  a_favor: number
  no_a_favor: number
  total: number
}

// ─── Resultado en Actas (conteo oficial) ─────────────────────────────────────
// George Richardson es el candidato #1 (renglón 1) de la PLANCHA 2, y solo
// compite en el núcleo ARQUITECTURA. Por el voto fraccionado, cada uno de los
// 5 candidatos de una plancha recibe votos por separado: que la Plancha 2 gane
// NO significa que Richardson ganó. Por eso contamos SOLO su línea (Plancha 2,
// renglón 1) contra el candidato rival del mismo puesto (Plancha 1 y 3, renglón 1),
// y SOLO en actas del núcleo Arquitectura.
interface ActaArq {
  folio:         string             // número de acta (esquina rojo)
  ubicacion:     string             // lugar de votación (ej. 'Fantino', 'EGEHID')
  p2:            [number, number, number, number, number] // Plancha 2 · posiciones 1-5 (pos 1 = Richardson)
  rivalP1:       number             // Plancha 1, renglón 1 (rival de Richardson)
  rivalP3:       number             // Plancha 3, renglón 1
  nulos?:        number
  porConfirmar?: boolean            // lectura tentativa, pendiente de verificar
}

// Nombres de las 5 posiciones de la Plancha 2 (editar cuando se tengan).
const POSICIONES_P2 = ['George Richardson', 'Dominic Abud', 'Surelis Calderón', 'Anthonely García', 'Yahaira Mejía']

// ⬇️ CARGAR ACTAS DE ARQUITECTURA AQUÍ. p2 = las 5 líneas del renglón
// "Suma Votos Plancha más Fraccionados No.2". pos 1 = Richardson.
const ACTAS_ARQ: ActaArq[] = [
  // Fantino 0063: 12 votos fraccionados, todos en Plancha 2 renglones 3 y 4 (Calderón y García).
  // Richardson (renglón 1) = 0 y rivales (P1·1, P3·1) = 0. Confirmado con acta física y boletín.
  { folio: '0063', ubicacion: 'Fantino',                            p2: [0,0,12,12,0],      rivalP1: 0,  rivalP3: 0, nulos: 0 },
  { folio: '0463', ubicacion: 'EGEHID',                             p2: [6,5,3,2,4],        rivalP1: 2,  rivalP3: 0, nulos: 0 },
  { folio: '0019', ubicacion: 'Montecristi',                        p2: [7,7,1,2,7],        rivalP1: 0,  rivalP3: 0, nulos: 0, porConfirmar: true },
  { folio: '0088', ubicacion: 'María Trinidad Sánchez',             p2: [18,16,18,16,13],   rivalP1: 0,  rivalP3: 0, nulos: 0 },
  { folio: '0478', ubicacion: 'Boca Chica',                         p2: [18,14,9,9,14],     rivalP1: 0,  rivalP3: 0, nulos: 0, porConfirmar: true },
  { folio: '0054', ubicacion: 'Villa la Mata (Cotuí)',              p2: [3,4,6,5,3],        rivalP1: 0,  rivalP3: 0, nulos: 0 },
  { folio: '0489', ubicacion: 'Delegación Prov. Sto. Dgo.',         p2: [46,38,53,38,34],   rivalP1: 27, rivalP3: 0, nulos: 0 },
  { folio: '0470', ubicacion: 'Santo Domingo Oeste',               p2: [13,9,7,4,11],      rivalP1: 0,  rivalP3: 0, nulos: 0 },
  { folio: '0200', ubicacion: 'Santo Domingo Norte',               p2: [25,17,14,8,18],    rivalP1: 0,  rivalP3: 0, nulos: 0 },
  { folio: '0074', ubicacion: 'Samaná',                             p2: [18,14,22,21,7],    rivalP1: 0,  rivalP3: 0, nulos: 0 },
  { folio: '0156', ubicacion: 'Hato Mayor del Rey',                 p2: [13,4,12,6,6],      rivalP1: 0,  rivalP3: 0, nulos: 0 },
  { folio: '0120', ubicacion: 'San Cristóbal (Reg. Sur Central)',   p2: [22,22,19,14,16],   rivalP1: 3,  rivalP3: 0, nulos: 0 },
  { folio: '0082', ubicacion: 'San Francisco de Macorís (Nordeste)', p2: [10,9,42,42,4],    rivalP1: 0,  rivalP3: 0, nulos: 0 },
  { folio: '0254', ubicacion: 'DIE',                                p2: [9,8,10,6,9],       rivalP1: 7,  rivalP3: 0, nulos: 2 },
  { folio: '0150', ubicacion: 'Barahona',                           p2: [21,12,9,9,7],      rivalP1: 2,  rivalP3: 0, nulos: 0 },
  { folio: '0217', ubicacion: 'La Vega (Reg. Norcentral)',          p2: [39,35,40,26,41],   rivalP1: 3,  rivalP3: 0, nulos: 0 },
  { folio: '0407', ubicacion: 'MOPC',                               p2: [134,120,108,88,105], rivalP1: 20, rivalP3: 0, nulos: 0 },
  { folio: '0112', ubicacion: 'Regional Suroeste (San Juan)',       p2: [11,6,18,16,0],     rivalP1: 1,  rivalP3: 0, nulos: 0 },
  { folio: '0181', ubicacion: 'La Altagracia',                      p2: [76,13,19,4,13],    rivalP1: 0,  rivalP3: 0, nulos: 0 },
  { folio: '0195', ubicacion: 'INDRHI',                             p2: [79,62,40,32,46],   rivalP1: 7,  rivalP3: 0, nulos: 0 },
  { folio: '0175', ubicacion: 'Regional Este / La Romana',          p2: [46,37,76,59,34],   rivalP1: 2,  rivalP3: 0, nulos: 1 },
  { folio: '0036', ubicacion: 'Santiago',                           p2: [84,86,29,26,85],   rivalP1: 9,  rivalP3: 0, nulos: 4 },
  { folio: '0047', ubicacion: 'Regional Sureste',                   p2: [10,7,28,25,7],     rivalP1: 2,  rivalP3: 0, nulos: 0, porConfirmar: true },
  { folio: '0140', ubicacion: 'Monte Plata',                        p2: [15,1,9,7,9],       rivalP1: 0,  rivalP3: 0, nulos: 0 },
  { folio: '0210', ubicacion: 'Monseñor Nouel (Bonao)',             p2: [4,1,11,0,0],       rivalP1: 0,  rivalP3: 0, nulos: 0, porConfirmar: true },
  { folio: '0038', ubicacion: 'Jarabacoa',                          p2: [5,5,6,4,5],        rivalP1: 0,  rivalP3: 0, nulos: 0 },
  { folio: '0025', ubicacion: 'Nor-Atlántica (Puerto Plata)',        p2: [37,26,41,26,25],   rivalP1: 7,  rivalP3: 0, nulos: 4 },
  { folio: '0169', ubicacion: 'El Seibo',                            p2: [14,5,1,1,12],      rivalP1: 0,  rivalP3: 0, nulos: 0 },
  { folio: '0003', ubicacion: 'Valverde (Mao)',                     p2: [4,2,4,2,2],        rivalP1: 1,  rivalP3: 0, nulos: 0 },
  { folio: '0239', ubicacion: 'Santiago Rodríguez',                 p2: [7,1,1,1,0],        rivalP1: 0,  rivalP3: 0, nulos: 0 },
  { folio: '0225', ubicacion: 'Hermanas Mirabal (Salcedo)',         p2: [1,0,9,9,0],        rivalP1: 3,  rivalP3: 0, nulos: 0, porConfirmar: true },
  { folio: '0105', ubicacion: 'Azua',                               p2: [12,9,10,10,9],     rivalP1: 0,  rivalP3: 0, nulos: 0 },
  { folio: '0204', ubicacion: 'Elías Piña',                         p2: [0,0,1,0,4],        rivalP1: 0,  rivalP3: 0, nulos: 0 },
  { folio: '0129', ubicacion: 'Peravia (Baní)',                     p2: [11,10,10,9,10],    rivalP1: 1,  rivalP3: 0, nulos: 1, porConfirmar: true },
  { folio: '0453', ubicacion: 'Ministerio de Agricultura',          p2: [3,3,3,3,3],        rivalP1: 0,  rivalP3: 0, nulos: 0 },
  { folio: '0236', ubicacion: 'Espaillat (Moca)',                   p2: [5,5,5,3,5],        rivalP1: 5,  rivalP3: 0, nulos: 0 },
  { folio: '0006', ubicacion: 'Dajabón',                            p2: [2,0,1,1,0],        rivalP1: 0,  rivalP3: 0, nulos: 0 },
  { folio: '0100', ubicacion: 'Sánchez Ramírez (Cotuí)',           p2: [41,41,63,63,41],   rivalP1: 0,  rivalP3: 0, nulos: 0, porConfirmar: true },
]

// ── Comparación con los boletines oficiales de la CNE (línea de George Richardson,
//    Plancha 2 · renglón 1, núcleo Arquitectura) ────────────────────────────────
// Datos transcritos directamente de los boletines escaneados.
// b1/b2/b3 = valor impreso en cada boletín preliminar (null = la demarcación aún NO aparecía en ese boletín).
// bf    = RELACIÓN GENERAL DEFINITIVA DEL CÓMPUTO ELECTORAL (21/07/2026) — el resultado firme.
// nos   = nuestro conteo de actas (null = acta que todavía no hemos cargado).
// Totales oficiales impresos: Boletín 1 = 639 · Boletín 2 = 778 · Boletín 3 = 790 · Definitivo = 790 · Nosotros = 869.
// El cómputo definitivo (CDN Arquitectura) da: Richardson 790, Abud 600, Calderón 717, García 556, Mejía 558;
// emitidos 1294, nulos 33, observados 0, válidos 1261. Único cambio frente al B03: Boca Chica renglones 3, 4 y 5.
// Aritmética verificada: las 10 filas de candidatos suman su total impreso y emitidos = válidos + nulos + observados
// en las 38 demarcaciones y en el total.
type CmpBoletin = { dem: string; b1: number | null; b2: number | null; b3: number | null; bf: number | null; nos: number | null; nota?: string; verificado?: boolean }
const BOLETIN_CMP: CmpBoletin[] = [
  // Coinciden en los tres conteos
  { dem: 'MOPC (DN)',                  b1: 134, b2: 134, b3: 134, bf: 134, nos: 134 },
  { dem: 'EGEHID',                     b1: 6,   b2: 6,   b3: 6,   bf: 6,   nos: 6   },
  { dem: 'Agricultura',                b1: 3,   b2: 3,   b3: 3,   bf: 3,   nos: 3   },
  { dem: 'INDRHI',                     b1: 79,  b2: 79,  b3: 79,  bf: 79,  nos: 79  },
  { dem: 'DIE',                        b1: 9,   b2: 9,   b3: 9,   bf: 9,   nos: 9   },
  { dem: 'Del. Prov. Sto. Dgo.',       b1: 46,  b2: 46,  b3: 46,  bf: 46,  nos: 46  },
  { dem: 'Sto. Dgo. Norte',            b1: 25,  b2: 25,  b3: 25,  bf: 25,  nos: 25  },
  { dem: 'Sto. Dgo. Oeste',            b1: 13,  b2: 13,  b3: 13,  bf: 13,  nos: 13  },
  { dem: 'Boca Chica',                 b1: 9,   b2: 9,   b3: 9,   bf: 9,   nos: 18, nota: 'Acta 0478: "Votos Plancha No.2 = 9" (voto de plancha completa que suma a los 5 renglones) + fila Suma renglón 1 = 9 → 18. El acta está internamente descuadrada (total 9 votos vs fila Suma que suma 19); se aplica el criterio de sumar los votos de plancha. El cómputo definitivo corrigió los renglones 3, 4 y 5 de esta mesa (Calderón 0→3, García 0→5, Mejía 5→4) pero dejó a Richardson en 9.' },
  { dem: 'Montecristi',                b1: 7,   b2: 7,   b3: 7,   bf: 7,   nos: 7   },
  { dem: 'Dajabón',                    b1: 2,   b2: 2,   b3: 2,   bf: 2,   nos: 2   },
  { dem: 'La Vega',                    b1: 39,  b2: 39,  b3: 39,  bf: 39,  nos: 39  },
  { dem: 'Monseñor Nouel (Bonao)',     b1: 4,   b2: 4,   b3: 4,   bf: 4,   nos: 4   },
  { dem: 'Salcedo (Hnas. Mirabal)',    b1: 1,   b2: 1,   b3: 1,   bf: 1,   nos: 1   },
  { dem: 'Santiago',                   b1: 84,  b2: 84,  b3: 84,  bf: 84,  nos: 84  },
  { dem: 'Valverde (Mao)',             b1: 4,   b2: 4,   b3: 4,   bf: 4,   nos: 4   },
  { dem: 'San Francisco de Macorís',   b1: 10,  b2: 10,  b3: 10,  bf: 10,  nos: 10  },
  { dem: 'Fantino',                    b1: 0,   b2: 0,   b3: 0,   bf: 0,   nos: 0   },
  { dem: 'Villa la Mata',              b1: 3,   b2: 3,   b3: 3,   bf: 3,   nos: 3   },
  { dem: 'San Cristóbal',              b1: 22,  b2: 22,  b3: 22,  bf: 22,  nos: 22  },
  { dem: 'Baní (Peravia)',             b1: 11,  b2: 11,  b3: 11,  bf: 11,  nos: 11  },
  { dem: 'Barahona',                   b1: 21,  b2: 21,  b3: 21,  bf: 21,  nos: 21  },
  { dem: 'Elías Piña',                 b1: 0,   b2: 0,   b3: 0,   bf: 0,   nos: 0   },
  { dem: 'El Seibo',                   b1: 14,  b2: 14,  b3: 14,  bf: 14,  nos: 14  },
  { dem: 'La Romana',                  b1: 46,  b2: 46,  b3: 46,  bf: 46,  nos: 46  },
  // Incorporadas por la CNE en el Boletín 2 (no estaban en el Boletín 1) — coinciden con nosotros
  { dem: 'Jarabacoa',                  b1: null, b2: 5,  b3: 5,   bf: 5,   nos: 5   },
  { dem: 'Espaillat (Moca)',           b1: null, b2: 5,  b3: 5,   bf: 5,   nos: 5   },
  { dem: 'Azua',                       b1: null, b2: 12, b3: 12,  bf: 12,  nos: 12  },
  { dem: 'San Juan de la Maguana',     b1: null, b2: 11, b3: 11,  bf: 11,  nos: 11  },
  { dem: 'Monte Plata',                b1: null, b2: 15, b3: 15,  bf: 15,  nos: 15  },
  // Corregidas por la CNE en el Boletín 3 — ya coinciden con nuestro conteo
  { dem: 'Samaná',                     b1: null, b2: 0,  b3: 18,  bf: 18,  nos: 18, nota: 'El Boletín 03 corrigió Samaná de 0 a 18 y el cómputo definitivo lo mantuvo → coincide con nuestro conteo (acta 0074).' },
  { dem: 'Reg. Sureste (S.P.M.)',      b1: 4,   b2: 4,   b3: 10,  bf: 10,  nos: 10, nota: 'El Boletín 03 subió de 4 a 10 y el cómputo definitivo lo mantuvo → coincide con nuestro conteo (acta 0047).' },
  { dem: 'Santiago Rodríguez',         b1: null, b2: 18, b3: 7,   bf: 7,   nos: 7,  nota: 'El Boletín 03 corrigió de 18 a 7 y el cómputo definitivo lo mantuvo → coincide con nuestro conteo (acta 0239). Se resolvió el cruce de etiqueta con Samaná.' },
  { dem: 'María Trinidad Sánchez',     b1: null, b2: null, b3: 18,  bf: 18,  nos: 18, nota: 'El Boletín 03 la incorporó con 18 y el cómputo definitivo lo mantuvo → coincide con nuestro conteo.' },
  // Diferencias que persisten en el Boletín 3
  { dem: 'Puerto Plata',               b1: 25,  b2: 25,  b3: 27,  bf: 27,  nos: 37, verificado: true, nota: 'Acta 0025 validada (37). El Boletín 03 subió de 25 a 27 y el cómputo definitivo cerró ahí: el acta objetada nunca se corrigió del todo.' },
  { dem: 'La Altagracia (Higüey)',     b1: null, b2: 73, b3: 52,  bf: 52,  nos: 76, verificado: true, nota: 'Acta 0181 verificada (76). ATENCIÓN: el Boletín 03 BAJÓ Higüey de 73 a 52 y el cómputo definitivo mantuvo 52; un cómputo posterior no debería reducir votos. Además Higüey cerró con 21 nulos de 76 emitidos (27.6%), contra 2.6% nacional: la tasa más alta del país.' },
  { dem: 'Hato Mayor',                 b1: 11,  b2: 11,  b3: 11,  bf: 11,  nos: 13, verificado: true, nota: 'Acta 0156 verificada (13): Votos Plancha No.2 = 2 + fraccionado renglón 1 = 11 → 13. El cómputo definitivo cerró en 11; omite los 2 votos por plancha.' },
  { dem: 'Sánchez Ramírez (Cotuí)',    b1: 7,   b2: 7,   b3: 7,   bf: 7,   nos: 41, nota: 'Acta 0100: "Votos Plancha No.2 = 34" (voto de plancha completa que suma a los 5 renglones) + fraccionado renglón 1 = 7 → 41. El delegado no cargó los 34 en la fila "Suma"; el cómputo definitivo cerró en 7. Es la mayor diferencia sin resolver.' },
]

// ── Votos por demarcación: los 5 candidatos de Plancha 2 en cada boletín ─────
// b3 = Boletín Preliminar 03 (CDN Arquitectura), fila por fila verificada contra el total impreso.
// `folio` enlaza con ACTAS_ARQ para tomar nuestro conteo (p2) sin duplicar datos.
// Orden de los 5 valores = POSICIONES_P2 (Richardson, Abud, Calderón, García, Mejía).
// b1/b2 = Boletines Preliminares 01 y 02 (CDN de Arquitectura), transcritos de los PDF
// escaneados. `null` = la demarcación aún NO aparecía en ese boletín.
// bf = RELACIÓN GENERAL DEFINITIVA DEL CÓMPUTO ELECTORAL (21/07/2026).
// Totales de control por boletín (fila de cada candidato):
//   B01 → 639 / 521 / 599 / 459 / 485   ·   B02 → 778 / 571 / 685 / 521 / 534
//   B03 → 790 / 600 / 714 / 551 / 559   ·   DEF → 790 / 600 / 717 / 556 / 558
type P2 = [number, number, number, number, number]
type DemBoletin = { dem: string; folio: string; b1: P2 | null; b2: P2 | null; b3: P2; bf: P2 }
const POR_DEMARCACION: DemBoletin[] = [
  { dem: 'MOPC (DN)',                folio: '0407', b1: [134,120,108,88,105], b2: [134,120,108,88,105], b3: [134,120,108,88,105],  bf: [134,120,108,88,105] },
  { dem: 'EGEHID',                   folio: '0463', b1: [6,5,3,2,4],      b2: [6,5,3,2,4],      b3: [6,5,3,2,4],  bf: [6,5,3,2,4] },
  { dem: 'Agricultura',              folio: '0453', b1: [3,3,3,3,3],      b2: [3,3,3,3,3],      b3: [3,3,3,3,3],  bf: [3,3,3,3,3] },
  { dem: 'INDRHI',                   folio: '0195', b1: [79,62,40,32,46], b2: [79,62,40,32,46], b3: [79,62,40,32,46],  bf: [79,62,40,32,46] },
  { dem: 'DIE',                      folio: '0254', b1: [9,8,10,6,9],     b2: [9,8,10,6,9],     b3: [9,8,10,6,9],  bf: [9,8,10,6,9] },
  { dem: 'Del. Prov. Sto. Dgo.',     folio: '0489', b1: [46,38,53,38,34], b2: [46,38,53,38,34], b3: [46,38,53,38,34],  bf: [46,38,53,38,34] },
  { dem: 'Sto. Dgo. Norte',          folio: '0200', b1: [25,17,14,8,18],  b2: [25,17,14,8,18],  b3: [25,17,14,8,18],  bf: [25,17,14,8,18] },
  { dem: 'Sto. Dgo. Oeste',          folio: '0470', b1: [13,9,7,4,11],    b2: [13,9,7,4,11],    b3: [13,9,7,4,11],  bf: [13,9,7,4,11] },
  { dem: 'Boca Chica',               folio: '0478', b1: [9,5,0,0,5],      b2: [9,5,0,0,5],      b3: [9,5,0,0,5],  bf: [9,5,3,5,4] },
  { dem: 'Puerto Plata',             folio: '0025', b1: [25,14,29,14,13], b2: [25,14,29,14,13], b3: [27,15,31,14,14],  bf: [27,15,31,14,14] },
  { dem: 'Dajabón',                  folio: '0006', b1: [2,0,1,1,0],      b2: [2,0,1,1,0],      b3: [2,0,1,1,0],  bf: [2,0,1,1,0] },
  { dem: 'Montecristi',              folio: '0019', b1: [7,7,1,2,7],      b2: [7,7,1,2,7],      b3: [7,7,1,2,7],  bf: [7,7,1,2,7] },
  { dem: 'La Vega',                  folio: '0217', b1: [39,35,40,26,41], b2: [39,35,40,26,41], b3: [39,35,40,26,41],  bf: [39,35,40,26,41] },
  { dem: 'Monseñor Nouel (Bonao)',   folio: '0210', b1: [4,1,11,0,0],     b2: [4,1,11,0,0],     b3: [4,1,11,0,0],  bf: [4,1,11,0,0] },
  { dem: 'Salcedo (Hnas. Mirabal)',  folio: '0225', b1: [1,0,9,9,0],      b2: [1,0,9,9,0],      b3: [1,0,9,9,0],  bf: [1,0,9,9,0] },
  { dem: 'Jarabacoa',                folio: '0038', b1: null,             b2: [5,5,6,4,5],      b3: [5,5,6,4,5],  bf: [5,5,6,4,5] },
  { dem: 'Santiago',                 folio: '0036', b1: [84,86,29,26,85], b2: [84,86,29,26,85], b3: [84,86,29,26,85],  bf: [84,86,29,26,85] },
  { dem: 'Espaillat (Moca)',         folio: '0236', b1: null,             b2: [5,5,5,3,5],      b3: [5,5,5,3,5],  bf: [5,5,5,3,5] },
  { dem: 'Valverde (Mao)',           folio: '0003', b1: [4,2,4,2,2],      b2: [4,2,4,2,2],      b3: [4,2,4,2,2],  bf: [4,2,4,2,2] },
  { dem: 'Santiago Rodríguez',       folio: '0239', b1: null,             b2: [18,14,22,21,7],  b3: [7,6,6,6,6],  bf: [7,6,6,6,6] },
  { dem: 'San Francisco de Macorís', folio: '0082', b1: [10,9,42,42,4],   b2: [10,9,42,42,4],   b3: [10,9,42,42,4],  bf: [10,9,42,42,4] },
  { dem: 'Samaná',                   folio: '0074', b1: null,             b2: [0,0,0,0,0],      b3: [18,14,21,20,6],  bf: [18,14,21,20,6] },
  { dem: 'María Trinidad Sánchez',   folio: '0088', b1: null,             b2: null,             b3: [18,16,18,16,13],  bf: [18,16,18,16,13] },
  { dem: 'Sánchez Ramírez (Cotuí)',  folio: '0100', b1: [7,7,29,29,7],    b2: [7,7,29,29,7],    b3: [7,7,29,29,7],  bf: [7,7,29,29,7] },
  { dem: 'Fantino',                  folio: '0063', b1: [0,0,12,12,0],    b2: [0,0,12,12,0],    b3: [0,0,12,12,0],  bf: [0,0,12,12,0] },
  { dem: 'Villa la Mata',            folio: '0054', b1: [3,4,6,5,3],      b2: [3,4,6,5,3],      b3: [3,4,6,5,3],  bf: [3,4,6,5,3] },
  { dem: 'San Cristóbal',            folio: '0120', b1: [22,22,19,14,16], b2: [22,22,19,14,16], b3: [22,22,19,14,16],  bf: [22,22,19,14,16] },
  { dem: 'Azua',                     folio: '0105', b1: null,             b2: [12,9,10,10,9],   b3: [12,9,10,10,9],  bf: [12,9,10,10,9] },
  { dem: 'Baní (Peravia)',           folio: '0129', b1: [11,10,10,0,10],  b2: [11,10,10,0,10],  b3: [11,10,10,0,10],  bf: [11,10,10,0,10] },
  { dem: 'Barahona',                 folio: '0150', b1: [21,12,9,9,7],    b2: [21,12,9,9,7],    b3: [21,12,9,9,7],  bf: [21,12,9,9,7] },
  { dem: 'San Juan de la Maguana',   folio: '0112', b1: null,             b2: [11,6,18,16,4],   b3: [11,6,18,16,4],  bf: [11,6,18,16,4] },
  { dem: 'Elías Piña',               folio: '0204', b1: [0,0,1,4,4],      b2: [0,0,1,4,4],      b3: [0,0,1,4,4],  bf: [0,0,1,4,4] },
  { dem: 'La Romana',                folio: '0175', b1: [46,37,76,59,34], b2: [46,37,76,59,34], b3: [46,37,76,59,34],  bf: [46,37,76,59,34] },
  { dem: 'La Altagracia (Higüey)',   folio: '0181', b1: null,             b2: [73,10,16,1,10],  b3: [52,10,14,4,10],  bf: [52,10,14,4,10] },
  { dem: 'El Seibo',                 folio: '0169', b1: [14,5,1,1,12],    b2: [14,5,1,1,12],    b3: [14,5,1,1,12],  bf: [14,5,1,1,12] },
  { dem: 'Reg. Sureste (S.P.M.)',    folio: '0047', b1: [4,1,22,19,1],    b2: [4,1,22,19,1],    b3: [10,7,28,25,7],  bf: [10,7,28,25,7] },
  { dem: 'Monte Plata',              folio: '0140', b1: null,             b2: [15,1,9,7,9],     b3: [15,1,9,7,9],  bf: [15,1,9,7,9] },
  { dem: 'Hato Mayor',               folio: '0156', b1: [11,2,10,4,4],    b2: [11,2,10,4,4],    b3: [11,2,10,4,4],  bf: [11,2,10,4,4] },
]

// ── Detección de novedades por demarcación ───────────────────────────────────
// Una demarcación tiene "novedad" si: (a) el cómputo definitivo no cuadra con nuestro
// conteo de actas, (b) un cómputo posterior redujo votos de algún candidato (anomalía
// grave), o (c) cambió entre boletines (incorporación o corrección de la CNE).
type Novedad = { d: DemBoletin; tipo: 'descuadre' | 'bajada' | 'cambio'; detalle: string }
function novedadesDemarcacion(): Novedad[] {
  const out: Novedad[] = []
  for (const d of POR_DEMARCACION) {
    const nos = ACTAS_ARQ.find(a => a.folio === d.folio)?.p2 ?? null
    const bajo = (prev: P2 | null, cur: P2 | null) =>
      prev != null && cur != null && cur.some((v, i) => v < prev[i])
    const cambio = (prev: P2 | null, cur: P2 | null) =>
      (prev == null) !== (cur == null) || (prev != null && cur != null && cur.some((v, i) => v !== prev[i]))

    if (bajo(d.b1, d.b2) || bajo(d.b2, d.b3) || bajo(d.b3, d.bf)) {
      out.push({ d, tipo: 'bajada', detalle: 'Un cómputo posterior REDUJO votos de algún candidato' })
    } else if (nos && d.bf.some((v, i) => v !== nos[i])) {
      const dif = nos.reduce((s, v, i) => s + (v - d.bf[i]), 0)
      out.push({ d, tipo: 'descuadre', detalle: `Nuestro conteo no cuadra con el cómputo definitivo (${dif > 0 ? '+' : ''}${dif} en total de plancha)` })
    } else if (cambio(d.b1, d.b2) || cambio(d.b2, d.b3) || cambio(d.b3, d.bf)) {
      out.push({ d, tipo: 'cambio', detalle: 'La CNE la incorporó o corrigió entre boletines' })
    }
  }
  // Orden de prioridad: bajadas primero, luego descuadres, luego cambios.
  const rank = { bajada: 0, descuadre: 1, cambio: 2 } as const
  return out.sort((a, b) => rank[a.tipo] - rank[b.tipo] || a.d.dem.localeCompare(b.d.dem))
}

function TabPorDemarcacion() {
  const novedades = useMemo(() => novedadesDemarcacion(), [])
  // Por defecto se abre en la primera demarcación con novedad (la de mayor prioridad).
  const [folio, setFolio] = useState<string>(novedades[0]?.d.folio ?? POR_DEMARCACION[0].folio)
  const sel  = POR_DEMARCACION.find(d => d.folio === folio) ?? POR_DEMARCACION[0]
  const acta = ACTAS_ARQ.find(a => a.folio === sel.folio)
  const nos  = acta?.p2 ?? null

  const estiloNov = {
    bajada:    { bg: '#fef2f2', border: '#fecaca', color: '#b91c1c', icon: '⚠', txt: 'Un cómputo redujo votos' },
    descuadre: { bg: '#fffbeb', border: '#fde68a', color: '#b45309', icon: '≠', txt: 'No cuadra con nuestro conteo' },
    cambio:    { bg: '#eff6ff', border: '#bfdbfe', color: '#1d4ed8', icon: '↻', txt: 'Corregida/incorporada por la CNE' },
  } as const

  return (
    <div className="space-y-5">
      <div className="rounded-xl px-4 py-3 text-xs" style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', color: '#1e3a8a' }}>
        Votos de los <b>5 candidatos de la Plancha 2</b> en la demarcación elegida a lo largo de los
        <b> Boletines Preliminares 01, 02 y 03</b> y del <b>cómputo definitivo</b> de la CNE, frente a
        <b> nuestro conteo de actas</b>. Un “—” significa que esa demarcación aún no aparecía en ese boletín.
      </div>

      {/* Novedades detectadas — se muestran de entrada, sin tener que buscarlas */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-baseline gap-2 flex-wrap">
          <p className="text-sm font-bold" style={{ color: 'var(--color-marino)' }}>🔎 Demarcaciones con novedad</p>
          <p className="text-xs text-gray-400">
            {novedades.length} de {POR_DEMARCACION.length} · haz clic en una para verla en detalle
          </p>
        </div>
        {novedades.length === 0 ? (
          <p className="px-5 py-4 text-sm text-gray-500">Sin novedades: todas las demarcaciones cuadran con el cómputo definitivo.</p>
        ) : (
          <div className="p-3 flex flex-wrap gap-2">
            {novedades.map(n => {
              const st = estiloNov[n.tipo]
              const activa = n.d.folio === folio
              return (
                <button
                  key={n.d.folio}
                  onClick={() => setFolio(n.d.folio)}
                  title={n.detalle}
                  className="text-left rounded-xl px-3 py-2 text-xs transition"
                  style={{
                    backgroundColor: st.bg,
                    border: `1px solid ${activa ? st.color : st.border}`,
                    boxShadow: activa ? `0 0 0 2px ${st.border}` : undefined,
                    color: st.color,
                  }}
                >
                  <span className="font-bold">{st.icon} {n.d.dem}</span>
                  <span className="block text-[11px] opacity-80">{st.txt}</span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Selector de demarcación */}
      <div className="flex items-center gap-3 flex-wrap">
        <label className="text-sm font-semibold text-gray-600">Demarcación:</label>
        <select
          value={folio}
          onChange={e => setFolio(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm font-medium bg-white min-w-[16rem]"
        >
          {[...POR_DEMARCACION].sort((a, b) => a.dem.localeCompare(b.dem)).map(d => (
            <option key={d.folio} value={d.folio}>
              {novedades.find(n => n.d.folio === d.folio) ? `${estiloNov[novedades.find(n => n.d.folio === d.folio)!.tipo].icon} ` : ''}{d.dem}
            </option>
          ))}
        </select>
        <span className="text-xs text-gray-400">Acta {sel.folio}</span>
      </div>

      {/* Tabla de candidatos */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100" style={{ backgroundColor: 'var(--color-marino)' }}>
          <p className="text-sm font-bold text-white">{sel.dem} — Plancha 2</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wide border-b" style={{ color: 'var(--color-marino)' }}>
                <th className="text-left px-5 py-2 font-semibold">Pos.</th>
                <th className="text-left px-5 py-2 font-semibold">Candidato</th>
                <th className="text-right px-4 py-2 font-semibold">Boletín 01</th>
                <th className="text-right px-4 py-2 font-semibold">Boletín 02</th>
                <th className="text-right px-4 py-2 font-semibold">Boletín 03</th>
                <th className="text-right px-4 py-2 font-semibold">Definitivo</th>
                <th className="text-right px-4 py-2 font-semibold">Δ 01→def.</th>
                <th className="text-right px-4 py-2 font-semibold">Nuestro conteo</th>
                <th className="text-right px-4 py-2 font-semibold">Diferencia</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {POSICIONES_P2.map((cand, i) => {
                const esGeorge = i === 0
                const vb1 = sel.b1 ? sel.b1[i] : null
                const vb2 = sel.b2 ? sel.b2[i] : null
                const vb3 = sel.b3[i]
                const vbf = sel.bf[i]
                const vno = nos ? nos[i] : null
                const dif = vno != null ? vno - vbf : null
                // Evolución entre cómputos: rojo si alguno bajó respecto al anterior.
                const bajo = (vb2 != null && vb1 != null && vb2 < vb1) || (vb2 != null && vb3 < vb2) || vbf < vb3
                const evol = vb1 != null ? vbf - vb1 : vb2 != null ? vbf - vb2 : null
                const celda = (v: number | null, prev: number | null) => (
                  <td className="px-4 py-2.5 text-right tabular-nums"
                    style={{ color: v == null ? '#d1d5db' : prev != null && v < prev ? '#b91c1c' : prev != null && v > prev ? '#1d4ed8' : '#6b7280',
                             fontWeight: prev != null && v != null && v !== prev ? 700 : 400 }}>
                    {v ?? '—'}
                  </td>
                )
                return (
                  <tr key={i} style={esGeorge ? { backgroundColor: 'rgba(22,163,74,0.06)' } : undefined}>
                    <td className="px-5 py-2.5 font-bold tabular-nums" style={{ color: esGeorge ? '#16a34a' : 'var(--color-marino)' }}>{i + 1}</td>
                    <td className="px-5 py-2.5 font-medium" style={{ color: esGeorge ? '#16a34a' : '#374151' }}>{cand}{esGeorge ? ' ★' : ''}</td>
                    {celda(vb1, null)}
                    {celda(vb2, vb1)}
                    {celda(vb3, vb2)}
                    {celda(vbf, vb3)}
                    <td className="px-4 py-2.5 text-right tabular-nums font-semibold"
                      style={{ color: evol == null ? '#9ca3af' : bajo ? '#b91c1c' : evol > 0 ? '#1d4ed8' : '#6b7280' }}>
                      {evol == null ? '—' : evol === 0 ? '=' : `${evol > 0 ? '+' : ''}${evol}`}
                      {bajo ? ' ⚠' : ''}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums font-black text-gray-800">{vno ?? '—'}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums font-semibold"
                      style={{ color: dif == null ? '#9ca3af' : dif === 0 ? '#15803d' : dif > 0 ? '#b45309' : '#b91c1c' }}>
                      {dif == null ? '—' : dif === 0 ? '✓ igual' : `${dif > 0 ? '+' : ''}${dif}`}
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 font-black" style={{ borderColor: 'var(--color-marino)' }}>
                <td className="px-5 py-3 text-gray-700" colSpan={2}>TOTAL Plancha 2</td>
                <td className="px-4 py-3 text-right tabular-nums text-gray-600">{sel.b1 ? sel.b1.reduce((a, b) => a + b, 0) : '—'}</td>
                <td className="px-4 py-3 text-right tabular-nums text-gray-600">{sel.b2 ? sel.b2.reduce((a, b) => a + b, 0) : '—'}</td>
                <td className="px-4 py-3 text-right tabular-nums text-gray-600">{sel.b3.reduce((a, b) => a + b, 0)}</td>
                <td className="px-4 py-3 text-right tabular-nums text-gray-700">{sel.bf.reduce((a, b) => a + b, 0)}</td>
                <td className="px-4 py-3" />
                <td className="px-4 py-3 text-right tabular-nums text-gray-800">{nos ? nos.reduce((a, b) => a + b, 0) : '—'}</td>
                <td className="px-4 py-3" />
              </tr>
            </tfoot>
          </table>
        </div>
        <p className="px-5 py-2 text-[11px] text-gray-400">
          “Δ 01→def.” = cuánto movió la CNE ese candidato entre el primer boletín y el cómputo definitivo
          (⚠ = en algún momento le <b>bajó</b> votos).
          “Diferencia” = nuestro conteo − cómputo definitivo. Verde = coincide · ámbar = tenemos más · rojo = el cómputo tiene más.
        </p>
      </div>
    </div>
  )
}

function TabResultadoActas() {
  const rich    = ACTAS_ARQ.reduce((s, a) => s + a.p2[0], 0)
  const rivales = ACTAS_ARQ.reduce((s, a) => s + a.rivalP1 + a.rivalP3, 0)
  // Totales por posición de la Plancha 2 (los 5 candidatos arquitectos)
  const totPos  = [0,1,2,3,4].map(i => ACTAS_ARQ.reduce((s, a) => s + a.p2[i], 0))
  const totP2   = totPos.reduce((s, v) => s + v, 0)
  const rP1     = ACTAS_ARQ.reduce((s, a) => s + a.rivalP1, 0)
  const rP3     = ACTAS_ARQ.reduce((s, a) => s + a.rivalP3, 0)
  const nulos   = ACTAS_ARQ.reduce((s, a) => s + (a.nulos ?? 0), 0)
  const validos = rich + rivales
  const pctRich = validos > 0 ? (rich / validos * 100) : 0
  const dif     = rich - rivales
  const gana    = dif >= 0
  const hayTentativas = ACTAS_ARQ.some(a => a.porConfirmar)

  if (ACTAS_ARQ.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center space-y-2">
        <p className="text-4xl">🗒️</p>
        <p className="text-gray-700 font-semibold">Aún no hay actas de Arquitectura cargadas</p>
        <p className="text-xs text-gray-400 max-w-md mx-auto">
          Solo cuentan las actas del núcleo Arquitectura, donde compite George Richardson
          (Plancha 2, renglón 1). Envíamelas y las voy cargando.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Aclaración del método */}
      <div className="rounded-xl px-4 py-3 text-xs" style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', color: '#1e3a8a' }}>
        Se cuenta <b>solo la línea de George Richardson</b> (Plancha 2 · renglón 1) en las actas del
        núcleo <b>Arquitectura</b>, contra el candidato rival del mismo puesto. El voto por plancha completa
        no aplica: cada candidato recibe votos por separado.
      </div>

      {/* Banner */}
      <div
        className="rounded-2xl p-6 text-white flex items-center justify-between gap-4 flex-wrap"
        style={{ background: gana
          ? 'linear-gradient(135deg, #0F1B33, #1F3A6B)'
          : 'linear-gradient(135deg, #7f1d1d, #991b1b)'
        }}
      >
        <div>
          <p className="text-xs font-bold uppercase tracking-widest opacity-70 mb-1">
            George Richardson · {gana ? 'VA GANANDO' : 'VA PERDIENDO'}
          </p>
          <p className="text-3xl font-black">{rich.toLocaleString()} votos</p>
          <p className="text-blue-200 text-sm mt-1">
            {dif >= 0 ? '+' : ''}{dif.toLocaleString()} vs. rivales · {ACTAS_ARQ.length} acta{ACTAS_ARQ.length !== 1 ? 's' : ''} de Arquitectura
          </p>
        </div>
        <div
          className="text-center rounded-xl px-6 py-4 shrink-0"
          style={{ backgroundColor: 'rgba(255,255,255,0.15)', border: '2px solid rgba(255,255,255,0.3)' }}
        >
          <p className="font-black text-3xl tabular-nums">{pctRich.toFixed(1)}%</p>
          <p className="text-xs opacity-70 mt-1">de votos válidos</p>
        </div>
      </div>

      {/* Tarjetas Richardson / Rivales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border-2 shadow-sm p-5 space-y-3" style={{ borderColor: '#16a34a' }}>
          <p className="text-xs font-bold uppercase tracking-wide text-green-700">★ George Richardson (P2·1)</p>
          <p className="text-5xl font-black tabular-nums text-green-700">{rich.toLocaleString()}</p>
          <p className="text-sm text-gray-400">{pctRich.toFixed(1)}% de votos válidos</p>
          <div className="bg-gray-100 rounded-full h-2">
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pctRich}%`, backgroundColor: '#16a34a' }} />
          </div>
        </div>
        <div className="bg-white rounded-2xl border-2 shadow-sm p-5 space-y-3" style={{ borderColor: '#dc2626' }}>
          <p className="text-xs font-bold uppercase tracking-wide text-red-600">Rivales (P1·1 + P3·1)</p>
          <p className="text-5xl font-black tabular-nums text-red-600">{rivales.toLocaleString()}</p>
          <p className="text-sm text-gray-400">{(100 - pctRich).toFixed(1)}% de votos válidos</p>
          <div className="bg-gray-100 rounded-full h-2">
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${100 - pctRich}%`, backgroundColor: '#dc2626' }} />
          </div>
        </div>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Diferencia', val: `${dif >= 0 ? '+' : ''}${dif.toLocaleString()}`, color: dif >= 0 ? '#16a34a' : '#dc2626' },
          { label: 'Rival P1',   val: rP1.toLocaleString(),   color: 'var(--color-marino)' },
          { label: 'Rival P3',   val: rP3.toLocaleString(),   color: 'var(--color-marino)' },
          { label: 'Nulos',      val: nulos.toLocaleString(), color: '#6b7280' },
        ].map(m => (
          <div key={m.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-center">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{m.label}</p>
            <p className="text-2xl font-black tabular-nums mt-1" style={{ color: m.color }}>{m.val}</p>
          </div>
        ))}
      </div>

      {/* Votos por posición — Plancha 2 (los 5 candidatos arquitectos) */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between flex-wrap gap-2">
          <p className="text-sm font-semibold text-gray-700">Votos por posición — Plancha 2</p>
          <p className="text-xs text-gray-400">Total plancha: {totP2.toLocaleString()} votos-candidato</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wide border-b" style={{ color: 'var(--color-marino)' }}>
                <th className="text-left px-5 py-2 font-semibold">Pos.</th>
                <th className="text-left px-5 py-2 font-semibold">Candidato</th>
                <th className="text-right px-5 py-2 font-semibold">Votos</th>
                <th className="text-left px-5 py-2 font-semibold w-1/3">Peso relativo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {totPos.map((v, i) => {
                const esGeorge = i === 0
                const pct = totP2 > 0 ? (v / totPos[0] * 100) : 0  // relativo al líder (pos 1)
                return (
                  <tr key={i} style={esGeorge ? { backgroundColor: 'rgba(22,163,74,0.06)' } : undefined}>
                    <td className="px-5 py-2.5 font-bold tabular-nums" style={{ color: esGeorge ? '#16a34a' : 'var(--color-marino)' }}>{i + 1}</td>
                    <td className="px-5 py-2.5 font-medium" style={{ color: esGeorge ? '#16a34a' : '#374151' }}>
                      {POSICIONES_P2[i]}{esGeorge ? ' ★' : ''}
                    </td>
                    <td className="px-5 py-2.5 text-right font-black tabular-nums" style={{ color: esGeorge ? '#16a34a' : '#374151' }}>{v.toLocaleString()}</td>
                    <td className="px-5 py-2.5">
                      <div className="bg-gray-100 rounded-full h-2">
                        <div className="h-full rounded-full" style={{ width: `${Math.min(100, pct)}%`, backgroundColor: esGeorge ? '#16a34a' : 'var(--color-real)' }} />
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className="px-5 py-2 text-[11px] text-gray-400">
          Cada posición es un candidato distinto de la Plancha 2. Richardson (pos. 1) va de referencia; las demás son sus compañeros de plancha.
        </p>
      </div>

      {/* Detalle por acta */}
      <div className="space-y-3">
        <p className="text-sm font-semibold text-gray-700">Actas de Arquitectura</p>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[...ACTAS_ARQ].sort((a, b) => a.folio.localeCompare(b.folio)).map(a => {
            const otras = a.rivalP1 + a.rivalP3
            const t = a.p2[0] + otras
            const sinVotos = t === 0
            const p = t > 0 ? (a.p2[0] / t * 100) : 0
            const lidera = a.p2[0] >= otras
            return (
              <div key={a.folio} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-3 flex items-center justify-between" style={{ backgroundColor: 'var(--color-marino)', color: 'white' }}>
                  <div>
                    <p className="font-bold text-sm leading-tight">
                      {a.ubicacion} · Arquitectura
                      {a.porConfirmar && <span className="ml-2 text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--color-dorado)', color: '#0F1B33' }}>por confirmar</span>}
                    </p>
                    <p className="text-[11px] text-blue-200">
                      Acta {a.folio} · {sinVotos ? 'sin votos en posición 1' : `${t.toLocaleString()} votos válidos`}
                    </p>
                  </div>
                  <p className="text-xl font-black tabular-nums shrink-0" style={{ color: sinVotos ? '#94a3b8' : (lidera ? '#4ade80' : '#fca5a5') }}>
                    {sinVotos ? '—' : `${p.toFixed(0)}%`}
                  </p>
                </div>
                <div className="px-5 py-3 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 bg-gray-100 rounded-full h-2.5 overflow-hidden flex">
                      {!sinVotos && <>
                        <div className="h-full" style={{ width: `${p}%`, backgroundColor: '#16a34a' }} />
                        <div className="h-full" style={{ width: `${100 - p}%`, backgroundColor: '#dc2626' }} />
                      </>}
                    </div>
                  </div>
                </div>
                {/* Las 5 posiciones de la Plancha 2 en esta acta */}
                <div className="px-5 pt-3 grid grid-cols-5 gap-1 text-center">
                  {a.p2.map((v, i) => {
                    const esGeorge = i === 0
                    return (
                      <div key={i} className="rounded-lg py-1" style={esGeorge ? { backgroundColor: 'rgba(22,163,74,0.08)' } : undefined}>
                        <p className="text-[9px] uppercase tracking-wide" style={{ color: esGeorge ? '#16a34a' : '#9ca3af' }}>P{i + 1}{esGeorge ? '★' : ''}</p>
                        <p className="text-base font-bold tabular-nums" style={{ color: esGeorge ? '#16a34a' : '#374151' }}>{v}</p>
                      </div>
                    )
                  })}
                </div>
                <div className="px-5 py-2 grid grid-cols-3 gap-2 text-center text-xs">
                  <div><span className="text-gray-400">Rival P1: </span><span className="font-semibold tabular-nums">{a.rivalP1}</span></div>
                  <div><span className="text-gray-400">Rival P3: </span><span className="font-semibold tabular-nums">{a.rivalP3}</span></div>
                  <div><span className="text-gray-400">Nulos: </span><span className="font-semibold tabular-nums">{a.nulos ?? 0}</span></div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {hayTentativas && (
        <p className="text-xs text-gray-400 text-center">
          Las actas marcadas <b>“por confirmar”</b> tienen lectura tentativa del renglón 1; se ajustan al verificar.
        </p>
      )}
    </div>
  )
}

// ─── Sub-tab: Boletines (comparación con los boletines oficiales de la CNE) ────
function TabBoletines() {
  const sum = (k: 'b1' | 'b2' | 'b3' | 'bf' | 'nos') => BOLETIN_CMP.reduce((s, r) => s + (r[k] ?? 0), 0)
  const t1 = sum('b1'), t2 = sum('b2'), t3 = sum('b3'), tf = sum('bf'), tn = sum('nos')

  // Detección automática de anomalías: un boletín posterior NO debería reducir votos.
  // Solo se marca si además la baja deja la cifra POR DEBAJO de nuestro conteo (la queja real);
  // una baja que corrige hacia nuestro número (o lo iguala/supera) no se alerta. Se recalcula
  // automáticamente al cargar cualquier boletín nuevo.
  const anomalias = BOLETIN_CMP.flatMap(r => {
    const out: { dem: string; de: string; a: string; v1: number; v2: number }[] = []
    const bajoDeNos = (v: number) => r.nos == null || v < r.nos
    if (r.b1 != null && r.b2 != null && r.b2 < r.b1 && bajoDeNos(r.b2)) out.push({ dem: r.dem, de: 'Boletín 01', a: 'Boletín 02', v1: r.b1, v2: r.b2 })
    if (r.b2 != null && r.b3 != null && r.b3 < r.b2 && bajoDeNos(r.b3)) out.push({ dem: r.dem, de: 'Boletín 02', a: 'Boletín 03', v1: r.b2, v2: r.b3 })
    if (r.b3 != null && r.bf != null && r.bf < r.b3 && bajoDeNos(r.bf)) out.push({ dem: r.dem, de: 'Boletín 03', a: 'Cómputo definitivo', v1: r.b3, v2: r.bf })
    return out
  })

  // Métricas de conciliación (contra el cómputo definitivo)
  const enComun    = BOLETIN_CMP.filter(r => r.bf != null && r.nos != null)
  const coinciden  = enComun.filter(r => r.bf === r.nos).length

  const estado = (r: CmpBoletin) => {
    if (r.nos == null && r.bf != null) return { txt: 'Nos falta', color: '#b45309', bg: '#fffbeb', icon: '➕' }
    if (r.bf == null && r.nos != null) return { txt: 'Fuera del cómputo', color: '#6b7280', bg: '#f9fafb', icon: '•' }
    if (r.bf === r.nos)                return { txt: 'Coincide', color: '#15803d', bg: '#f0fdf4', icon: '✓' }
    if (r.verificado) {
      const dir = (r.nos ?? 0) > (r.bf ?? 0) ? 'cómputo subcuenta' : 'cómputo sobrecuenta'
      return { txt: `Verificado · ${dir}`, color: '#15803d', bg: '#f0fdf4', icon: '✓' }
    }
    return { txt: 'A verificar', color: '#b45309', bg: '#fffbeb', icon: '⚠' }
  }
  const cell = (v: number | null) =>
    v == null ? <span className="text-gray-300">—</span> : <span className="tabular-nums">{v}</span>

  return (
    <div className="space-y-5">
      {/* Alerta automática de anomalías: boletín que redujo votos */}
      {anomalias.length > 0 && (
        <div className="rounded-xl px-4 py-3" style={{ backgroundColor: '#fef2f2', border: '2px solid #fca5a5' }}>
          <p className="text-sm font-bold text-red-800">⚠ Anomalía detectada: un boletín redujo votos</p>
          <p className="text-xs text-red-700 mt-0.5">
            Un boletín posterior no debería tener menos votos que uno anterior. Casos a reclamar a la CNE:
          </p>
          <ul className="mt-2 space-y-1">
            {anomalias.map((a, i) => (
              <li key={i} className="text-[13px] text-red-800">
                <b>{a.dem}</b>: bajó de <b className="tabular-nums">{a.v1}</b> ({a.de}) a
                <b className="tabular-nums"> {a.v2}</b> ({a.a}) — <span className="tabular-nums">−{a.v1 - a.v2}</span> votos.
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Nota de método */}
      <div className="rounded-xl px-4 py-3 text-xs" style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', color: '#1e3a8a' }}>
        Comparación de la línea de <b>George Richardson</b> (Plancha 2 · renglón 1, núcleo Arquitectura)
        entre los <b>Boletines Preliminares 01, 02 y 03</b>, la <b>Relación General Definitiva del Cómputo
        Electoral</b> de la CNE y <b>nuestro conteo de actas</b>. El estado compara contra el
        <b> cómputo definitivo</b>. Un “—” significa que esa demarcación aún no aparecía en ese boletín.
      </div>

      {/* Totales por conteo */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        {[
          { label: 'Boletín 01', val: t1, sub: 'oficial CNE', color: 'var(--color-marino)' },
          { label: 'Boletín 02', val: t2, sub: 'oficial CNE', color: 'var(--color-marino)' },
          { label: 'Boletín 03', val: t3, sub: 'oficial CNE', color: 'var(--color-marino)' },
          { label: 'Definitivo', val: tf, sub: 'oficial CNE · firme', color: 'var(--color-marino)' },
          { label: 'Nuestro conteo', val: tn, sub: `${ACTAS_ARQ.length} actas · el más completo`, color: '#16a34a' },
        ].map(c => (
          <div key={c.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-center">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{c.label}</p>
            <p className="text-4xl font-black tabular-nums mt-1" style={{ color: c.color }}>{c.val.toLocaleString()}</p>
            <p className="text-[11px] text-gray-400 mt-1">{c.sub}</p>
          </div>
        ))}
      </div>

      {/* Marcador de avance B2 → B3 */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-2">
        <p className="text-sm font-semibold text-gray-700">📈 Qué cambió del Boletín 03 al cómputo definitivo</p>
        <p className="text-xs text-gray-500">
          Richardson quedó en <b className="tabular-nums">{tf}</b> votos
          (<span className="font-semibold tabular-nums">{tf - t3 >= 0 ? '+' : ''}{tf - t3}</span> respecto al Boletín 03).
          En la línea de Richardson la CNE <b>no movió ninguna demarcación</b>; el único ajuste del cómputo
          definitivo fue en <b>Boca Chica</b>, en los renglones 3, 4 y 5 de la Plancha 2
          (Calderón 0→3, García 0→5, Mejía 5→4).
        </p>
        <div className="flex flex-wrap gap-1.5 pt-1">
          {BOLETIN_CMP.filter(r => (r.b3 ?? -1) !== (r.bf ?? -1)).map(r => {
            const sube = (r.bf ?? 0) >= (r.b3 ?? 0)
            return (
              <span key={r.dem} className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                style={{ backgroundColor: sube ? 'rgba(22,163,74,0.10)' : 'rgba(220,38,38,0.10)', color: sube ? '#15803d' : '#b91c1c' }}>
                {r.dem}: {r.b3 ?? '—'} → {r.bf ?? '—'}
              </span>
            )
          })}
        </div>
      </div>

      {/* Tabla comparativa */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between flex-wrap gap-2">
          <p className="text-sm font-semibold text-gray-700">Richardson — Boletines 01/02/03 vs Definitivo vs Nosotros</p>
          <p className="text-xs text-gray-400">{coinciden} de {enComun.length} demarcaciones coinciden con el cómputo definitivo</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wide border-b" style={{ color: 'var(--color-marino)' }}>
                <th className="text-left px-5 py-2 font-semibold">Demarcación</th>
                <th className="text-right px-3 py-2 font-semibold">Bol. 01</th>
                <th className="text-right px-3 py-2 font-semibold">Bol. 02</th>
                <th className="text-right px-3 py-2 font-semibold">Bol. 03</th>
                <th className="text-right px-3 py-2 font-semibold">Definitivo</th>
                <th className="text-right px-3 py-2 font-semibold">Nosotros</th>
                <th className="text-left px-4 py-2 font-semibold">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {BOLETIN_CMP.map(r => {
                const e = estado(r)
                const nuevo = r.b2 == null && r.bf != null
                return (
                  <tr key={r.dem} style={{ backgroundColor: e.txt === 'Coincide' ? undefined : e.bg }}>
                    <td className="px-5 py-2.5 font-medium text-gray-700">
                      {r.dem}
                      {nuevo && <span className="ml-2 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide"
                        style={{ backgroundColor: 'rgba(31,58,107,0.1)', color: 'var(--color-marino)' }}>nuevo en B03</span>}
                      {r.nota && <span className="block text-[11px] text-gray-400 mt-0.5 font-normal">{r.nota}</span>}
                    </td>
                    <td className="px-3 py-2.5 text-right text-gray-500">{cell(r.b1)}</td>
                    <td className="px-3 py-2.5 text-right text-gray-500">{cell(r.b2)}</td>
                    <td className="px-3 py-2.5 text-right text-gray-500">{cell(r.b3)}</td>
                    <td className="px-3 py-2.5 text-right font-semibold text-gray-700">{cell(r.bf)}</td>
                    <td className="px-3 py-2.5 text-right font-black text-gray-800">{cell(r.nos)}</td>
                    <td className="px-4 py-2.5">
                      <span className="inline-flex items-center gap-1 text-xs font-semibold" style={{ color: e.color }}>
                        <span>{e.icon}</span>{e.txt}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 font-black" style={{ borderColor: 'var(--color-marino)' }}>
                <td className="px-5 py-3 text-gray-700">TOTAL Richardson</td>
                <td className="px-3 py-3 text-right tabular-nums text-gray-600">{t1}</td>
                <td className="px-3 py-3 text-right tabular-nums text-gray-600">{t2}</td>
                <td className="px-3 py-3 text-right tabular-nums text-gray-600">{t3}</td>
                <td className="px-3 py-3 text-right tabular-nums text-gray-700">{tf}</td>
                <td className="px-3 py-3 text-right tabular-nums text-green-700">{tn}</td>
                <td className="px-4 py-3" />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Resumen de hallazgos — para lectura del Presidente */}
      <div className="bg-white rounded-2xl border-2 shadow-sm overflow-hidden" style={{ borderColor: 'var(--color-marino)' }}>
        <div className="px-5 py-3" style={{ backgroundColor: 'var(--color-marino)', color: 'white' }}>
          <p className="text-sm font-bold">🔎 Resumen de hallazgos</p>
        </div>
        <div className="p-5 space-y-3 text-sm text-gray-700">
          <p>
            <b>1. Resultado firme: gana la Plancha 2 en los cinco renglones.</b> En el cómputo definitivo
            Richardson obtiene <b className="tabular-nums">{tf}</b> votos contra <b>100</b> de la Plancha 1
            en el renglón 1 — una diferencia de <b className="tabular-nums">690</b> votos (88.8% de los
            válidos emitidos a ese renglón). Los cinco: Richardson 790, Abud 600, Calderón 717,
            García 556, Mejía 558.
          </p>
          <p>
            <b>2. El cómputo definitivo cambió muy poco frente al Boletín 03.</b> La línea de Richardson
            quedó idéntica ({t3} → {tf}); el único ajuste fue <b>Boca Chica</b> en los renglones 3, 4 y 5
            (Calderón +3, García +5, Mejía −1). Totales generales sin cambio: 1,294 emitidos · 33 nulos ·
            1,261 válidos.
          </p>
          <p>
            <b>3. Nuestro conteo sigue por encima ({tn} vs {tf}).</b> La diferencia de
            <span className="tabular-nums"> +{tn - tf}</span> son actas que la CNE nunca incorporó.
            <b> {coinciden} de {enComun.length}</b> demarcaciones coinciden con el cómputo definitivo.
            Diferencias que quedaron sin resolver:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-[13px] text-gray-600">
            <li><b>Sánchez Ramírez</b> (41 vs 7): acta 0100 trae 34 votos de plancha completa + 7 fraccionados; el cómputo definitivo se quedó en 7.</li>
            <li><b>La Altagracia / Higüey</b> (76 vs 52): el B03 BAJÓ de 73 a 52 y el definitivo mantuvo 52. Además, Higüey cerró con <b>21 nulos de 76 emitidos (27.6%)</b> contra 2.6% nacional — la tasa más alta del país, en la misma demarcación de la baja.</li>
            <li><b>Boca Chica</b> (18 vs 9): acta 0478 descuadrada; el definitivo corrigió los renglones 3, 4 y 5, pero dejó a Richardson en 9.</li>
            <li><b>Puerto Plata</b> (37 vs 27): el acta objetada nunca se corrigió del todo.</li>
            <li><b>Hato Mayor</b> (13 vs 11): siguen omitidos los 2 votos por plancha del acta 0156.</li>
          </ul>
          <p>
            <b>4. Tres celdas del cómputo definitivo no cuadran</b> (más votos en un renglón que boletas
            válidas en esa demarcación): <b>EGEHID</b> renglón 1 (8 &gt; 7), <b>Barahona</b> renglón 1
            (23 &gt; 21) y <b>La Romana</b> renglón 3 (80 &gt; 78). Nuestras actas coinciden con el cómputo
            en las tres, así que el descuadre viene del acta de mesa, no de la transcripción de la CNE.
          </p>
          <p>
            Ninguna de estas observaciones cambia el resultado: <b>ni sumando todo lo reclamado ni
            quitándolo</b> se altera quién ganó.
          </p>
          <p className="text-[12px] text-gray-400 pt-1 border-t border-gray-100">
            Cifras transcritas de los documentos oficiales escaneados de la CNE (Boletines Preliminares 01,
            02 y 03, y la Relación General Definitiva del Cómputo Electoral del 21/07/2026). Los totales
            oficiales impresos coinciden con la suma de esta tabla (639 · 778 · 790 · 790) y la aritmética
            del cómputo definitivo fue verificada fila por fila. Documento de trabajo interno.
          </p>
        </div>
      </div>
    </div>
  )
}

// ─── Actas Nacionales (conteo oficial de todas las elecciones) ────────────────
// A diferencia de las actas de Arquitectura (donde solo importa la línea de
// Richardson), aquí seguimos el resultado COMPLETO de las elecciones nacionales.
// Cada acta trae 3 planchas (I, II, III) con 7 renglones (una posición/escaño
// c/u). El valor de cada renglón = fila "Suma Votos Plancha más Fraccionados"
// = votos de plancha completa (suman a los 7 renglones) + fraccionado del renglón.
// Como cada renglón es una posición distinta, se comparan las planchas renglón
// por renglón: para cada posición, la plancha con más votos gana ese escaño.
interface ActaNacional {
  folio:         string
  eleccion:      string               // 'Presidencia CODIA' | 'Junta Directiva' | 'Nacionales' ...
  lugar:         string
  fecha:         string
  total:         number               // Cantidad total de votos
  nulos:         number
  validos:       number
  p1:            number[]             // Plancha I  · renglones 1-7 (Suma más fraccionados)
  p2:            number[]             // Plancha II · renglones 1-7
  p3:            number[]             // Plancha III· renglones 1-7
  porConfirmar?: boolean
}

// Nombres de las 3 planchas nacionales (editar cuando se confirmen).
const PLANCHAS_NAC = ['Plancha I', 'Plancha II', 'Plancha III']
// Nombres de los 7 renglones/posiciones (editar cuando se confirmen).
const POSICIONES_NAC = ['Renglón 1', 'Renglón 2', 'Renglón 3', 'Renglón 4', 'Renglón 5', 'Renglón 6', 'Renglón 7']
const Z7 = [0, 0, 0, 0, 0, 0, 0]

// ⬇️ CARGAR ACTAS NACIONALES AQUÍ. Cada pX = fila "Suma Votos Plancha más
// Fraccionados No.X" (7 renglones). Usar Z7 (siete ceros) si la plancha no tiene votos.
const ACTAS_NAC: ActaNacional[] = [
  { folio: '0447', eleccion: 'Presidencia CODIA', lugar: 'Club MOPC',    fecha: '05/08/2026', total: 22, nulos: 3, validos: 19, p1: [18, 15, 14, 14, 14, 14, 14], p2: Z7, p3: Z7 },
  { folio: '0433', eleccion: 'Junta Directiva',   lugar: 'MOPC',         fecha: '05/08/2026', total: 66, nulos: 0, validos: 66, p1: [60, 44, 38, 38, 37, 39, 38], p2: Z7, p3: Z7 },
  { folio: '0432', eleccion: 'Junta Directiva',   lugar: 'MOPC (mesa)',  fecha: '05/08/2026', total: 99, nulos: 0, validos: 99, p1: [76, 88, 67, 65, 64, 65, 66], p2: Z7, p3: Z7 },
  { folio: '0081', eleccion: 'Nacionales',        lugar: 'Barahona',     fecha: '05/08/2026', total: 81, nulos: 0, validos: 81, p1: [81, 77, 76, 76, 77, 76, 76], p2: Z7, p3: Z7 },
]

function TabActasNacionales() {
  // Agrupar por tipo de elección (cada tipo es una boleta distinta; no se suman entre sí).
  const grupos = ACTAS_NAC.reduce<Record<string, ActaNacional[]>>((acc, a) => {
    (acc[a.eleccion] ??= []).push(a)
    return acc
  }, {})
  const nombresGrupos = Object.keys(grupos)

  const totGeneral   = ACTAS_NAC.reduce((s, a) => s + a.total, 0)
  const nulosGeneral = ACTAS_NAC.reduce((s, a) => s + a.nulos, 0)

  if (ACTAS_NAC.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center space-y-2">
        <p className="text-4xl">🗳️</p>
        <p className="text-gray-700 font-semibold">Aún no hay actas nacionales cargadas</p>
        <p className="text-xs text-gray-400 max-w-md mx-auto">
          Envíame las fotos de las actas y las voy tabulando aquí, agrupadas por tipo de elección.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Aclaración del método */}
      <div className="rounded-xl px-4 py-3 text-xs" style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', color: '#1e3a8a' }}>
        Conteo oficial de las actas de escrutinio. Cada renglón es una posición distinta; las planchas
        se comparan <b>renglón por renglón</b> (la plancha con más votos en ese renglón gana esa posición).
        Se usa la fila <b>“Suma Votos Plancha más Fraccionados”</b>.
      </div>

      {/* Resumen general */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Actas cargadas',  val: ACTAS_NAC.length.toLocaleString() },
          { label: 'Tipos de boleta', val: nombresGrupos.length.toLocaleString() },
          { label: 'Total votos',     val: totGeneral.toLocaleString() },
          { label: 'Nulos',           val: nulosGeneral.toLocaleString() },
        ].map(m => (
          <div key={m.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-center">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{m.label}</p>
            <p className="text-2xl font-black tabular-nums mt-1" style={{ color: 'var(--color-marino)' }}>{m.val}</p>
          </div>
        ))}
      </div>

      {/* Un bloque por tipo de elección */}
      {nombresGrupos.map(nombre => {
        const actas   = grupos[nombre]
        const total   = actas.reduce((s, a) => s + a.total, 0)
        const nulos   = actas.reduce((s, a) => s + a.nulos, 0)
        const validos = actas.reduce((s, a) => s + a.validos, 0)
        // Totales por plancha y renglón (7 renglones × 3 planchas)
        const totP = [
          [0,1,2,3,4,5,6].map(i => actas.reduce((s, a) => s + (a.p1[i] ?? 0), 0)),
          [0,1,2,3,4,5,6].map(i => actas.reduce((s, a) => s + (a.p2[i] ?? 0), 0)),
          [0,1,2,3,4,5,6].map(i => actas.reduce((s, a) => s + (a.p3[i] ?? 0), 0)),
        ]
        const totalPlancha = totP.map(rs => rs.reduce((s, v) => s + v, 0))
        const r1 = totP.map(rs => rs[0])                       // Renglón 1 por plancha (encabeza la plancha)
        const maxR1 = Math.max(...r1)
        const planchasConVotos = [0, 1, 2].filter(p => totalPlancha[p] > 0)
        const hayTentativas = actas.some(a => a.porConfirmar)

        return (
          <div key={nombre} className="space-y-4">
            {/* Encabezado del grupo */}
            <div className="rounded-2xl p-5 text-white flex items-center justify-between gap-4 flex-wrap"
                 style={{ background: 'linear-gradient(135deg, #0F1B33, #1F3A6B)' }}>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest opacity-70 mb-1">Elección</p>
                <p className="text-2xl font-black">{nombre}</p>
              </div>
              <div className="flex gap-6 text-center">
                <div><p className="text-2xl font-black tabular-nums">{actas.length}</p><p className="text-[11px] text-blue-200">actas</p></div>
                <div><p className="text-2xl font-black tabular-nums">{total.toLocaleString()}</p><p className="text-[11px] text-blue-200">votos</p></div>
                <div><p className="text-2xl font-black tabular-nums">{validos.toLocaleString()}</p><p className="text-[11px] text-blue-200">válidos</p></div>
                <div><p className="text-2xl font-black tabular-nums">{nulos.toLocaleString()}</p><p className="text-[11px] text-blue-200">nulos</p></div>
              </div>
            </div>

            {/* Totales por plancha */}
            <div className={`grid gap-4 ${planchasConVotos.length >= 3 ? 'sm:grid-cols-3' : planchasConVotos.length === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-1'}`}>
              {planchasConVotos.map(p => {
                const lider = r1[p] === maxR1 && r1[p] > 0
                const pct = validos > 0 ? (r1[p] / validos * 100) : 0
                return (
                  <div key={p} className="bg-white rounded-2xl border-2 shadow-sm p-5 space-y-1"
                       style={{ borderColor: lider ? '#16a34a' : '#e5e7eb' }}>
                    <p className="text-xs font-bold uppercase tracking-wide" style={{ color: lider ? '#16a34a' : 'var(--color-marino)' }}>
                      {PLANCHAS_NAC[p]}{lider ? ' · ★ va al frente' : ''}
                    </p>
                    <p className="text-4xl font-black tabular-nums" style={{ color: lider ? '#16a34a' : '#374151' }}>{r1[p].toLocaleString()}</p>
                    <p className="text-xs text-gray-400">votos en el <b>Renglón 1</b> · {pct.toFixed(1)}% de válidos</p>
                  </div>
                )
              })}
            </div>

            {/* Tabla renglón × plancha */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100">
                <p className="text-sm font-semibold text-gray-700">Votos por renglón (posición) — comparativa de planchas</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs uppercase tracking-wide border-b" style={{ color: 'var(--color-marino)' }}>
                      <th className="text-left px-5 py-2 font-semibold">Renglón</th>
                      {planchasConVotos.map(p => (
                        <th key={p} className="text-right px-5 py-2 font-semibold">{PLANCHAS_NAC[p]}</th>
                      ))}
                      <th className="text-left px-5 py-2 font-semibold">Lidera</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {[0,1,2,3,4,5,6].map(i => {
                      const vals = planchasConVotos.map(p => totP[p][i])
                      const maxV = Math.max(...vals)
                      const idxLider = maxV > 0 ? planchasConVotos[vals.indexOf(maxV)] : -1
                      return (
                        <tr key={i}>
                          <td className="px-5 py-2.5 font-medium text-gray-700">{POSICIONES_NAC[i]}</td>
                          {planchasConVotos.map(p => (
                            <td key={p} className="px-5 py-2.5 text-right font-bold tabular-nums"
                                style={{ color: p === idxLider ? '#16a34a' : '#374151' }}>
                              {totP[p][i].toLocaleString()}
                            </td>
                          ))}
                          <td className="px-5 py-2.5 text-xs font-semibold" style={{ color: idxLider >= 0 ? '#16a34a' : '#9ca3af' }}>
                            {idxLider >= 0 ? PLANCHAS_NAC[idxLider] : '—'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Detalle por acta */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {[...actas].sort((a, b) => a.folio.localeCompare(b.folio)).map(a => (
                <div key={a.folio} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="px-5 py-3 flex items-center justify-between" style={{ backgroundColor: 'var(--color-marino)', color: 'white' }}>
                    <div>
                      <p className="font-bold text-sm leading-tight">
                        {a.lugar}
                        {a.porConfirmar && <span className="ml-2 text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--color-dorado)', color: '#0F1B33' }}>por confirmar</span>}
                      </p>
                      <p className="text-[11px] text-blue-200">Acta {a.folio} · {a.fecha} · {a.validos.toLocaleString()} válidos</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xl font-black tabular-nums">{a.total.toLocaleString()}</p>
                      <p className="text-[10px] text-blue-200">votos</p>
                    </div>
                  </div>
                  {[0,1,2].filter(p => (p === 0 ? a.p1 : p === 1 ? a.p2 : a.p3).some(v => v > 0)).map(p => {
                    const rs = p === 0 ? a.p1 : p === 1 ? a.p2 : a.p3
                    return (
                      <div key={p} className="px-5 pt-3">
                        <p className="text-[10px] uppercase tracking-wide text-gray-400 mb-1">{PLANCHAS_NAC[p]}</p>
                        <div className="grid grid-cols-7 gap-1 text-center">
                          {rs.map((v, i) => (
                            <div key={i} className="rounded-lg py-1 bg-gray-50">
                              <p className="text-[9px] text-gray-400">{i + 1}</p>
                              <p className="text-sm font-bold tabular-nums text-gray-700">{v}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                  <div className="px-5 py-3 mt-2 grid grid-cols-3 gap-2 text-center text-xs border-t border-gray-100">
                    <div><span className="text-gray-400">Total: </span><span className="font-semibold tabular-nums">{a.total}</span></div>
                    <div><span className="text-gray-400">Válidos: </span><span className="font-semibold tabular-nums">{a.validos}</span></div>
                    <div><span className="text-gray-400">Nulos: </span><span className="font-semibold tabular-nums">{a.nulos}</span></div>
                  </div>
                </div>
              ))}
            </div>

            {hayTentativas && (
              <p className="text-xs text-gray-400 text-center">
                Las actas marcadas <b>“por confirmar”</b> tienen lectura tentativa; se ajustan al verificar.
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Tab: Día de Elección (con sub-tabs) ──────────────────────────────────────
function TabDiaEleccion() {
  const [subTab, setSubTab] = useState<'vivo' | 'actas' | 'nacionales' | 'boletines' | 'demarcacion'>('vivo')
  return (
    <div className="space-y-5">
      <div className="flex gap-2 border-b border-gray-200 flex-wrap">
        {([
          { id: 'vivo'        as const, label: '📡 Tendencia en vivo' },
          { id: 'actas'       as const, label: '🗒️ Resultado en actas' },
          { id: 'nacionales'  as const, label: '🗳️ Actas nacionales' },
          { id: 'boletines'   as const, label: '📋 Boletines' },
          { id: 'demarcacion' as const, label: '📍 Por demarcación' },
        ]).map(s => (
          <button
            key={s.id}
            onClick={() => setSubTab(s.id)}
            className="px-4 py-2 text-sm font-semibold -mb-px border-b-2 transition-colors"
            style={subTab === s.id
              ? { borderBottomColor: 'var(--color-marino)', color: 'var(--color-marino)' }
              : { borderBottomColor: 'transparent', color: '#9ca3af' }}
          >
            {s.label}
          </button>
        ))}
      </div>
      {subTab === 'vivo'        && <TabDiaEleccionVivo />}
      {subTab === 'actas'       && <TabResultadoActas />}
      {subTab === 'nacionales'  && <TabActasNacionales />}
      {subTab === 'boletines'   && <TabBoletines />}
      {subTab === 'demarcacion' && <TabPorDemarcacion />}
    </div>
  )
}

function TabDiaEleccionVivo() {
  const supabase = createClient()
  const [totalVotos, setTotalVotos]     = useState(0)
  const [aFavor, setAFavor]             = useState(0)
  const [noAFavor, setNoAFavor]         = useState(0)
  const [porRegional, setPorRegional]   = useState<Record<string, RegionalResultado>>({})
  const [alertasDoble, setAlertasDoble] = useState<AlertaDoble[]>([])
  const [alertasNoHab, setAlertasNoHab] = useState<AlertaNoHab[]>([])
  const [porMesa, setPorMesa]           = useState<MesaResultado[]>([])
  const [filtroMesa, setFiltroMesa]     = useState('')
  const [cargando, setCargando]         = useState(true)
  const [nucleos, setNucleos]           = useState<string[]>([])
  const [nucleoSel, setNucleoSel]       = useState<string>('ARQUITECTOS')

  // Poblar el selector de núcleos una sola vez
  useEffect(() => {
    supabase.rpc('nucleos_disponibles').then(({ data }) => {
      setNucleos(((data as { nucleo: string }[]) ?? []).map(r => r.nucleo))
    })
  }, [supabase])

  const cargar = useCallback(async () => {
    const arg = { p_nucleo: nucleoSel || null }
    const [resConteo, resDoble, resNoHab, resMesa] = await Promise.all([
      supabase.rpc('conteo_votos_dia', arg),
      supabase.from('v_alerta_doble_voto').select('*'),
      supabase.from('v_alerta_no_habilitado').select('*').order('created_at', { ascending: false }),
      supabase.rpc('conteo_por_mesa', arg),
    ])
    const c = Array.isArray(resConteo.data) ? resConteo.data[0] : resConteo.data
    if (c) {
      setTotalVotos(Number(c.total_votos ?? 0))
      setAFavor(Number(c.a_favor ?? 0))
      setNoAFavor(Number(c.no_a_favor ?? 0))
      setPorRegional((c.por_regional as Record<string, RegionalResultado>) ?? {})
    }
    setAlertasDoble((resDoble.data as AlertaDoble[]) ?? [])
    setAlertasNoHab((resNoHab.data as AlertaNoHab[]) ?? [])
    setPorMesa(((resMesa.data as MesaResultado[]) ?? []).map(m => ({
      ...m,
      a_favor:    Number(m.a_favor),
      no_a_favor: Number(m.no_a_favor),
      total:      Number(m.total),
    })))
    setCargando(false)
  }, [supabase, nucleoSel])

  useEffect(() => {
    cargar()
    const canal = supabase
      .channel('dia-eleccion-live')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'votos_dia' }, () => cargar())
      .subscribe()
    return () => { supabase.removeChannel(canal) }
  }, [supabase, cargar])

  if (cargando) return <p className="text-center text-gray-400 py-10">Cargando…</p>

  const totalValidos = aFavor + noAFavor
  const pctFavor     = totalValidos > 0 ? (aFavor   / totalValidos * 100) : 0
  const pctNoFavor   = totalValidos > 0 ? (noAFavor / totalValidos * 100) : 0
  const diferencia   = aFavor - noAFavor
  const vamosGanando = diferencia >= 0

  const regionalesOrdenadas = Object.entries(porRegional).sort(([a], [b]) => a.localeCompare(b))
  const mesasConVotos = porMesa.filter(m => m.total > 0)
  const qMesa = filtroMesa.trim().toLowerCase()
  const mesasFiltradas = qMesa
    ? porMesa.filter(m => m.etiqueta.toLowerCase().includes(qMesa) || m.lugar.toLowerCase().includes(qMesa))
    : porMesa
  const gruposMesa = Array.from(
    mesasFiltradas.reduce((map, m) => {
      const arr = map.get(m.lugar) ?? []
      arr.push(m)
      map.set(m.lugar, arr)
      return map
    }, new Map<string, MesaResultado[]>())
  )
    .map(([lugar, mesas]) => {
      const ordenadas = [...mesas].sort((a, b) => a.numero - b.numero)
      return {
        lugar,
        mesas: ordenadas,
        a_favor:    ordenadas.reduce((s, m) => s + m.a_favor, 0),
        no_a_favor: ordenadas.reduce((s, m) => s + m.no_a_favor, 0),
        total:      ordenadas.reduce((s, m) => s + m.total, 0),
        minNumero:  ordenadas[0].numero,
      }
    })
    .sort((a, b) => a.minNumero - b.minNumero)

  return (
    <div className="space-y-5">

      {/* ── Selector de núcleo ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3 flex-wrap">
        <label className="text-sm font-semibold text-gray-700 shrink-0">Núcleo:</label>
        <select
          value={nucleoSel}
          onChange={e => setNucleoSel(e.target.value)}
          className="border border-gray-200 rounded-xl px-4 py-2 text-sm font-medium focus:outline-none focus:ring-2"
          style={{ '--tw-ring-color': 'var(--color-marino)' } as React.CSSProperties}
        >
          <option value="">Todos los núcleos</option>
          {nucleos.map(n => <option key={n} value={n}>{n}</option>)}
        </select>
        <span className="text-xs text-gray-400">
          {nucleoSel ? `Mostrando solo ${nucleoSel}` : 'Mostrando el total combinado de todos los núcleos'}
        </span>
      </div>

      {/* ── Banner ganador ─────────────────────────────────────────────────── */}
      {totalVotos > 0 && (
        <div
          className="rounded-2xl p-6 text-white flex items-center justify-between gap-4 flex-wrap"
          style={{ background: vamosGanando
            ? 'linear-gradient(135deg, #0F1B33, #1F3A6B)'
            : 'linear-gradient(135deg, #7f1d1d, #991b1b)'
          }}
        >
          <div>
            <p className="text-xs font-bold uppercase tracking-widest opacity-70 mb-1">
              {vamosGanando ? 'VA GANANDO' : 'VA PERDIENDO'}
            </p>
            <p className="text-3xl font-black">
              {vamosGanando ? '✓ A Favor' : '✗ No A Favor'}
            </p>
            <p className="text-blue-200 text-sm mt-1">
              {(vamosGanando ? aFavor : noAFavor).toLocaleString()} votos
            </p>
          </div>
          <div
            className="text-center rounded-xl px-6 py-4 shrink-0"
            style={{ backgroundColor: 'rgba(255,255,255,0.15)', border: '2px solid rgba(255,255,255,0.3)' }}
          >
            <p className="font-black text-3xl tabular-nums">
              {(vamosGanando ? pctFavor : pctNoFavor).toFixed(1)}%
            </p>
            <p className="text-xs opacity-70 mt-1">de votos válidos</p>
          </div>
        </div>
      )}

      {/* ── Tarjetas A Favor / No A Favor ─────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border-2 shadow-sm p-5 space-y-3" style={{ borderColor: '#16a34a' }}>
          <p className="text-xs font-bold uppercase tracking-wide text-green-700">✓ A Favor</p>
          <p className="text-5xl font-black tabular-nums text-green-700">{aFavor.toLocaleString()}</p>
          <p className="text-sm text-gray-400">{pctFavor.toFixed(1)}% de votos válidos</p>
          <div className="bg-gray-100 rounded-full h-2">
            <div className="h-full rounded-full transition-all duration-500"
              style={{ width: `${pctFavor}%`, backgroundColor: '#16a34a' }} />
          </div>
        </div>

        <div className="bg-white rounded-2xl border-2 shadow-sm p-5 space-y-3" style={{ borderColor: '#dc2626' }}>
          <p className="text-xs font-bold uppercase tracking-wide text-red-600">✗ No A Favor</p>
          <p className="text-5xl font-black tabular-nums text-red-600">{noAFavor.toLocaleString()}</p>
          <p className="text-sm text-gray-400">{pctNoFavor.toFixed(1)}% de votos válidos</p>
          <div className="bg-gray-100 rounded-full h-2">
            <div className="h-full rounded-full transition-all duration-500"
              style={{ width: `${pctNoFavor}%`, backgroundColor: '#dc2626' }} />
          </div>
        </div>
      </div>

      {/* ── Métricas clave ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-center">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Diferencia</p>
          <p className="text-3xl font-black tabular-nums mt-1"
            style={{ color: diferencia >= 0 ? '#16a34a' : '#dc2626' }}>
            {diferencia >= 0 ? '+' : ''}{diferencia.toLocaleString()}
          </p>
          <p className="text-xs text-gray-400 mt-1">votos</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-center">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Total emitidos</p>
          <p className="text-3xl font-black tabular-nums mt-1" style={{ color: 'var(--color-marino)' }}>
            {totalVotos.toLocaleString()}
          </p>
          <p className="text-xs text-gray-400 mt-1">votos registrados</p>
        </div>
      </div>

      {totalVotos === 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
          <p className="text-gray-300 text-lg font-bold">0</p>
          <p className="text-xs text-gray-400 mt-1">Votos registrados</p>
          <p className="text-xs text-gray-300 mt-3">Esperando primeros votos del día de elección…</p>
        </div>
      )}

      {/* ── Resultados por regional ───────────────────────────────────────── */}
      {regionalesOrdenadas.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-gray-700">Resultados por regional</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {regionalesOrdenadas.map(([regional, datos]) => {
              const totalReg = datos.total
              const pctF = totalReg > 0 ? (datos.a_favor    / totalReg * 100) : 0
              const pctN = totalReg > 0 ? (datos.no_a_favor / totalReg * 100) : 0
              const lideraFavor = datos.a_favor >= datos.no_a_favor
              return (
                <div key={regional} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="px-5 py-3 flex items-center justify-between"
                    style={{ backgroundColor: 'var(--color-marino)', color: 'white' }}>
                    <p className="font-bold text-base">{regional}</p>
                    <p className="text-blue-200 text-sm">{totalReg.toLocaleString()} votos</p>
                  </div>
                  <div className="px-5 py-2 text-xs font-bold border-b border-gray-100"
                    style={{ color: lideraFavor ? '#16a34a' : '#dc2626' }}>
                    Lidera: {lideraFavor ? '✓ A Favor' : '✗ No A Favor'} · {(lideraFavor ? pctF : pctN).toFixed(1)}%
                  </div>
                  <div className="px-5 py-4 space-y-3">
                    {[
                      { label: '✓ A Favor',    val: datos.a_favor,    pct: pctF, color: '#16a34a' },
                      { label: '✗ No A Favor', val: datos.no_a_favor, pct: pctN, color: '#dc2626' },
                    ].map(({ label, val, pct, color }) => (
                      <div key={label}>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="font-medium" style={{ color }}>{label}</span>
                          <span className="font-bold tabular-nums text-gray-800">
                            {val.toLocaleString()} <span className="text-xs text-gray-400">({pct.toFixed(1)}%)</span>
                          </span>
                        </div>
                        <div className="bg-gray-100 rounded-full h-1.5">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Resultados por mesa (agrupado por centro) ─────────────────────── */}
      {porMesa.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-sm font-semibold text-gray-700">Resultados por mesa</p>
            <p className="text-xs text-gray-400">{mesasConVotos.length} de {porMesa.length} mesas con votos</p>
          </div>

          <input
            type="text"
            value={filtroMesa}
            onChange={e => setFiltroMesa(e.target.value)}
            placeholder="Buscar centro o mesa… (ej. Santiago, MOPC)"
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2"
            style={{ '--tw-ring-color': 'var(--color-marino)' } as React.CSSProperties}
          />

          {gruposMesa.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-6">Ninguna mesa coincide con “{filtroMesa}”.</p>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {gruposMesa.map(g => {
                const pctF = g.total > 0 ? (g.a_favor / g.total * 100) : 0
                const lidera = g.a_favor >= g.no_a_favor
                const multi = g.mesas.length > 1
                const sinReportar = g.total === 0
                return (
                  <div key={g.lugar} className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${sinReportar ? 'border-gray-100 opacity-70' : 'border-gray-100'}`}>
                    {/* Encabezado del centro */}
                    <div className="px-5 py-3" style={{ backgroundColor: sinReportar ? '#94a3b8' : 'var(--color-marino)', color: 'white' }}>
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-bold text-sm leading-tight">{g.lugar}</p>
                        <p className="text-xs shrink-0 opacity-90">
                          {sinReportar ? 'Sin reportar' : `${g.total.toLocaleString()} votos${multi ? ` · ${g.mesas.length} mesas` : ''}`}
                        </p>
                      </div>
                    </div>

                    {/* Barra + tendencia del centro */}
                    <div className="px-5 py-3 border-b border-gray-100">
                      {sinReportar ? (
                        <div className="flex items-center gap-3">
                          <div className="flex-1 bg-gray-100 rounded-full h-2.5" />
                          <span className="text-xs font-semibold text-gray-400 shrink-0">— %</span>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-3">
                            <div className="flex-1 bg-gray-100 rounded-full h-2.5 overflow-hidden flex">
                              <div className="h-full" style={{ width: `${pctF}%`, backgroundColor: '#16a34a' }} />
                              <div className="h-full" style={{ width: `${100 - pctF}%`, backgroundColor: '#dc2626' }} />
                            </div>
                            <span className="text-xs font-bold tabular-nums shrink-0" style={{ color: lidera ? '#16a34a' : '#dc2626' }}>
                              {lidera ? '✓' : '✗'} {pctF.toFixed(0)}%
                            </span>
                          </div>
                          <div className="flex justify-between mt-2 text-xs">
                            <span className="font-semibold text-green-700 tabular-nums">A Favor: {g.a_favor}</span>
                            <span className="font-semibold text-red-600 tabular-nums">No A Favor: {g.no_a_favor}</span>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Desglose por mesa (solo si el centro tiene varias) */}
                    {multi && (
                      <div className="divide-y divide-gray-50">
                        {g.mesas.map((m, i) => {
                          const p = m.total > 0 ? (m.a_favor / m.total * 100) : 0
                          return (
                            <div key={m.numero} className="px-5 py-2 flex items-center gap-3">
                              <span className="text-xs font-semibold text-gray-500 w-14 shrink-0">Mesa {i + 1}</span>
                              {m.total === 0 ? (
                                <>
                                  <div className="flex-1 bg-gray-100 rounded-full h-1.5" />
                                  <span className="text-xs text-gray-300 shrink-0 w-24 text-right">sin reportar</span>
                                </>
                              ) : (
                                <>
                                  <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden flex">
                                    <div className="h-full" style={{ width: `${p}%`, backgroundColor: '#16a34a' }} />
                                    <div className="h-full" style={{ width: `${100 - p}%`, backgroundColor: '#dc2626' }} />
                                  </div>
                                  <span className="text-xs tabular-nums text-gray-500 shrink-0 w-24 text-right">
                                    <span className="text-green-700 font-semibold">{m.a_favor}</span>
                                    {' / '}
                                    <span className="text-red-600 font-semibold">{m.no_a_favor}</span>
                                  </span>
                                </>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Alertas ───────────────────────────────────────────────────────── */}
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

// ─── Tab: Pensionados Votantes ────────────────────────────────────────────────

function TabPensionadosVotantes({ nombreUsuario }: { nombreUsuario: string }) {
  const supabase = createClient()

  const [padron, setPadron]             = useState<MiembroPadronActivo[]>([])
  const [cargando, setCargando]         = useState(false)
  const [busqueda, setBusqueda]         = useState('')
  const [filtroRegional, setFiltroRegional] = useState('')

  const [todasRegionales, setTodasRegionales] = useState<string[]>([])
  const [totalCount, setTotalCount]           = useState(0)
  const [confirmadosCount, setConfirmadosCount] = useState(0)

  const [nucleosAbiertos, setNucleosAbiertos] = useState<Set<string>>(new Set())

  const [detalle, setDetalle]                       = useState<MiembroPadronActivo | null>(null)
  const [detalleDeuda, setDetalleDeuda]             = useState<DeudaAPI | null>(null)
  const [cargandoDeuda, setCargandoDeuda]           = useState(false)
  const [detalleIntencion, setDetalleIntencion]     = useState<string | null>(null)
  const [detalleGuardando, setDetalleGuardando]     = useState(false)
  const [detalleError, setDetalleError]             = useState<string | null>(null)

  useEffect(() => {
    supabase.rpc('opciones_padron').then(({ data }) => {
      const rows = (data as { tipo: string; valor: string }[]) ?? []
      setTodasRegionales(rows.filter(r => r.tipo === 'regional').map(r => r.valor).sort())
    })
    Promise.all([
      supabase.from('padron').select('codigo', { count: 'exact', head: true }).eq('pensionado_votante', true),
      supabase.from('padron').select('codigo', { count: 'exact', head: true }).eq('pensionado_votante', true).eq('confirmacion_intencion', 'favorable'),
    ]).then(([resTotal, resConfirm]) => {
      setTotalCount(resTotal.count ?? 0)
      setConfirmadosCount(resConfirm.count ?? 0)
    })
  }, [supabase]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const q = busqueda.trim()
    setCargando(true)
    supabase.rpc('buscar_pensionados_votantes', {
      p_regional: filtroRegional || null,
      p_nucleo:   null,
      p_q:        q.length >= 3 ? q : null,
    }).then(({ data }) => {
      setPadron((data as MiembroPadronActivo[]) ?? [])
      setCargando(false)
    })
  }, [supabase, filtroRegional, busqueda])

  function toggleNucleoP(nucleo: string) {
    setNucleosAbiertos(prev => {
      const next = new Set(prev)
      if (next.has(nucleo)) next.delete(nucleo)
      else next.add(nucleo)
      return next
    })
  }

  async function abrirDetalle(m: MiembroPadronActivo) {
    setDetalle(m)
    setDetalleDeuda(null)
    setDetalleIntencion(null)
    setDetalleError(null)
    setCargandoDeuda(true)
    try {
      const res  = await fetch('/api/consulta-deuda', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codigo: m.codigo }),
      })
      const data = await res.json() as DeudaAPI
      setDetalleDeuda(data)
      if (data.encontrado) {
        // El servidor ya persistió vía set_datos_codia; refrescamos el estado local.
        const frescos = {
          regional:        data.regional ?? m.regional,
          centro_votacion: data.centro_votacion ?? m.centro_votacion,
          nucleo:          data.nucleo ?? m.nucleo,
          posicion:        data.posicion ?? m.posicion,
          monto_deuda:     data.monto,
          tiene_deuda:     data.monto > 0,
        }
        setDetalle(prev => prev && prev.codigo === m.codigo ? { ...prev, ...frescos } : prev)
        setPadron(prev => prev.map(x => x.codigo === m.codigo ? { ...x, ...frescos } : x))
      }
    } catch { /* no interrumpir */ } finally { setCargandoDeuda(false) }
  }

  async function guardarDetalle() {
    if (!detalle || !detalleIntencion || detalleGuardando) return
    setDetalleGuardando(true); setDetalleError(null)
    const { error } = await supabase.rpc('confirmar_colegiado', {
      p_codigo: detalle.codigo, p_intencion: detalleIntencion,
    })
    setDetalleGuardando(false)
    if (error) {
      const msg = error.message ?? ''
      setDetalleError(
        msg.startsWith('Ya confirmado por') ? msg + '. No se puede re-confirmar.'
        : 'No se pudo guardar. Intenta de nuevo.'
      )
      return
    }
    const codigo = detalle.codigo
    const intencion = detalleIntencion
    setPadron(prev => prev.map(x =>
      x.codigo === codigo ? { ...x, confirmado_por: nombreUsuario, confirmacion_intencion: intencion } : x
    ))
    setDetalle(prev => prev ? { ...prev, confirmado_por: nombreUsuario, confirmacion_intencion: intencion } : prev)
    setDetalleIntencion(null)
  }

  const pctConfirmado = totalCount > 0 ? Math.round(confirmadosCount / totalCount * 100) : 0

  return (
    <div className="space-y-4">
      {/* Banner informativo */}
      <div
        className="rounded-2xl px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
        style={{ background: 'linear-gradient(135deg, #4c1d95, #6d28d9)' }}
      >
        <div>
          <p className="text-white font-bold text-base">Pensionados Votantes — ISES-CODIA</p>
          <p className="text-purple-200 text-xs mt-0.5">
            {totalCount.toLocaleString()} pensionados habilitados · {confirmadosCount} confirmados · {totalCount - confirmadosCount} pendientes
          </p>
        </div>
        <div className="flex gap-3 shrink-0">
          <div className="text-center bg-white/10 rounded-xl px-4 py-2">
            <p className="text-purple-200 text-[10px] uppercase font-bold">Confirmados</p>
            <p className="text-white font-black text-xl tabular-nums">{confirmadosCount}</p>
          </div>
          <div className="text-center bg-white/10 rounded-xl px-4 py-2">
            <p className="text-purple-200 text-[10px] uppercase font-bold">% confirmado</p>
            <p className="text-white font-black text-xl tabular-nums">
              {pctConfirmado}%
            </p>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4 flex flex-wrap gap-3">
        <input
          type="text" value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre, colegiatura o cédula…"
          className="flex-1 min-w-[200px] text-sm px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2"
          style={{ '--tw-ring-color': '#7c3aed' } as React.CSSProperties}
        />
        <select value={filtroRegional}
          onChange={e => setFiltroRegional(e.target.value)}
          className="text-sm px-4 py-2.5 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2"
          style={{ '--tw-ring-color': '#7c3aed' } as React.CSSProperties}
        >
          <option value="">Todas las regionales</option>
          {todasRegionales.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        {(busqueda || filtroRegional) && (
          <button onClick={() => { setBusqueda(''); setFiltroRegional('') }}
            className="text-sm text-purple-600 hover:underline px-2">Limpiar</button>
        )}
        <p className="w-full text-xs text-gray-400">
          {padron.length.toLocaleString()} pensionados
          {!filtroRegional && !busqueda.trim() ? ' (total habilitados)' : ''}
        </p>
      </div>

      {/* Acordeón por núcleo */}
      {(() => {
        const porNucleo = padron.reduce<Record<string, MiembroPadronActivo[]>>((acc, m) => {
          const clave = m.nucleo ?? 'Sin núcleo'
          if (!acc[clave]) acc[clave] = []
          acc[clave].push(m)
          return acc
        }, {})
        const nucleosOrdenados = Object.keys(porNucleo).sort()
        return cargando ? (
          <p className="text-center text-gray-400 text-sm py-12">Cargando…</p>
        ) : padron.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-12">Sin resultados.</p>
        ) : (
          <div className="space-y-2">
            {/* Controles expandir/colapsar */}
            <div className="flex items-center justify-between px-1">
              <p className="text-xs text-gray-500">{nucleosOrdenados.length} núcleos</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setNucleosAbiertos(new Set(nucleosOrdenados))}
                  className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
                >Expandir todo</button>
                <button
                  onClick={() => setNucleosAbiertos(new Set())}
                  className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
                >Colapsar todo</button>
              </div>
            </div>
            {nucleosOrdenados.map(nucleo => {
              const miembros = porNucleo[nucleo]
              const abierto  = nucleosAbiertos.has(nucleo)
              const confirmadosNucleo = miembros.filter(m => m.confirmacion_intencion === 'favorable').length
              return (
                <div key={nucleo} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <button
                    onClick={() => toggleNucleoP(nucleo)}
                    className="w-full flex items-center justify-between px-5 py-4 hover:bg-purple-50/30 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span
                        className="text-sm font-bold shrink-0 transition-transform"
                        style={{ color: '#7c3aed', display: 'inline-block', transform: abierto ? 'rotate(90deg)' : 'none' }}
                      >›</span>
                      <span className="font-semibold text-gray-900 truncate">{nucleo}</span>
                      <span className="text-xs text-gray-400 shrink-0">{miembros.length} pensionado{miembros.length !== 1 ? 's' : ''}</span>
                    </div>
                    {confirmadosNucleo > 0 && (
                      <span className="text-xs font-bold text-green-700 shrink-0 ml-2 bg-green-50 px-2 py-1 rounded-lg">
                        ✓ {confirmadosNucleo} confirmado{confirmadosNucleo !== 1 ? 's' : ''}
                      </span>
                    )}
                  </button>
                  {abierto && (
                    <div className="border-t border-gray-100 divide-y divide-gray-50">
                      {miembros.map(m => (
                        <button key={m.id} onClick={() => abrirDetalle(m)}
                          className="w-full text-left px-5 py-3.5 flex items-center justify-between gap-3 hover:bg-purple-50/40 active:bg-purple-50 transition-colors"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-gray-900 truncate">{m.nombre_completo}</p>
                            <p className="text-xs text-gray-400 mt-0.5">
                              #{m.codigo}
                              {m.regional && <> · <span className="text-gray-500">{m.regional}</span></>}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            {m.confirmacion_intencion ? (
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${INTENCION_COLOR_P[m.confirmacion_intencion]}`}>
                                {INTENCION_LABEL_P[m.confirmacion_intencion]}
                              </span>
                            ) : (
                              <span className="text-[10px] text-gray-300">Pendiente</span>
                            )}
                            {m.tiene_deuda && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">Deuda</span>}
                          </div>
                          <span className="text-gray-300 text-lg shrink-0">›</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )
      })()}

      {/* Panel de detalle */}
      {detalle && (
        <div className="fixed inset-0 z-50 flex flex-col" style={{ backgroundColor: 'var(--color-fondo)' }}>
          <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 bg-white shrink-0">
            <button onClick={() => setDetalle(null)}
              className="flex items-center gap-1 text-sm font-semibold text-purple-600 hover:text-purple-800">
              ‹ Volver a pensionados
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="max-w-xl mx-auto px-4 py-6 space-y-5">

              {/* Cabecera */}
              <div className="rounded-2xl overflow-hidden shadow-sm">
                <div className="px-6 py-5" style={{ background: 'linear-gradient(135deg, #4c1d95, #6d28d9)' }}>
                  <p className="text-white font-bold text-lg leading-tight">{detalle.nombre_completo}</p>
                  <p className="text-purple-200 text-sm mt-1">Colegiatura #{detalle.codigo}</p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-purple-400 text-white">Pensionado votante</span>
                    {detalle.nuevo_integrante && <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-blue-400 text-white">Nuevo integrante</span>}
                  </div>
                </div>

                {/* Datos personales */}
                <div className="bg-white px-6 py-4 space-y-3">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Datos personales</p>
                  <div className="space-y-2">
                    {detalle.cedula   && <FilaDato label="Cédula"    valor={detalle.cedula} />}
                    {detalle.celular  && <FilaDato label="Celular"   valor={detalle.celular} />}
                    {detalle.telefono && <FilaDato label="Teléfono"  valor={detalle.telefono} />}
                  </div>
                </div>

                {/* Datos CODIA */}
                <div className="bg-gray-50 px-6 py-4 space-y-3 border-t border-gray-100">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Datos CODIA</p>
                  <div className="space-y-2">
                    {detalle.carrera          && <FilaDato label="Profesión"          valor={detalle.carrera} />}
                    {detalle.nucleo           && <FilaDato label="Núcleo"             valor={detalle.nucleo} />}
                    {detalle.regional         && <FilaDato label="Regional"           valor={detalle.regional} />}
                    {detalle.provincia        && <FilaDato label="Provincia"          valor={detalle.provincia} />}
                    {detalle.centro_votacion  && <FilaDato label="Centro de votación" valor={detalle.centro_votacion} />}
                    {detalle.posicion != null && <FilaDato label="Posición"           valor={String(detalle.posicion)} />}
                  </div>
                </div>

                {/* Deuda */}
                <div className="bg-white px-6 py-4 border-t border-gray-100 space-y-2">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Estado de deuda</p>
                  {cargandoDeuda ? (
                    <p className="text-sm text-gray-400 animate-pulse">Consultando CODIA en línea…</p>
                  ) : detalleDeuda ? (
                    detalleDeuda.monto > 0 ? (
                      <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3">
                        <p className="text-orange-800 font-bold text-sm">⚠ Deuda activa</p>
                        <p className="text-orange-900 font-black text-2xl mt-0.5">RD$ {detalleDeuda.monto.toLocaleString()}</p>
                      </div>
                    ) : detalleDeuda.encontrado ? (
                      <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                        <p className="text-green-800 font-semibold text-sm">✅ Sin deuda en CODIA en línea</p>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400">No encontrado en el sistema de deuda.</p>
                    )
                  ) : detalle.monto_deuda > 0 ? (
                    <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3">
                      <p className="text-orange-800 font-bold text-sm">⚠ Deuda registrada</p>
                      <p className="text-orange-900 font-black text-2xl mt-0.5">RD$ {detalle.monto_deuda.toLocaleString()}</p>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400">Sin información de deuda.</p>
                  )}
                </div>
              </div>

              {/* Intención de voto */}
              {detalle.confirmado_por ? (
                <div className={`rounded-2xl px-6 py-5 text-center space-y-1 ${detalle.confirmacion_intencion ? INTENCION_COLOR_P[detalle.confirmacion_intencion] : 'bg-gray-100 text-gray-600'}`}>
                  <p className="font-bold text-base">
                    {detalle.confirmacion_intencion ? INTENCION_LABEL_P[detalle.confirmacion_intencion] : '✓ Confirmado'}
                  </p>
                  <p className="text-sm opacity-80">Por: {detalle.confirmado_por}</p>
                  {detalle.confirmacion_at && (
                    <p className="text-xs opacity-60">{fmt(detalle.confirmacion_at)}</p>
                  )}
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-5 space-y-4">
                  <p className="text-sm font-bold text-gray-700">¿Cuál es la intención de este pensionado?</p>
                  <div className="space-y-2">
                    {(['favorable', 'indeciso', 'en_contra'] as const).map(val => (
                      <button key={val} onClick={() => setDetalleIntencion(val)}
                        className={`w-full py-3.5 rounded-xl font-semibold text-sm border-2 transition-all ${detalleIntencion === val ? INTENCION_ACTIVE_P[val] : INTENCION_BORDER_P[val] + ' hover:opacity-80'}`}
                      >
                        {val === 'favorable' ? '✓ Favorable a George Richardson'
                         : val === 'indeciso' ? '~ Indeciso / Por decidir'
                         : '✗ En contra / Otra preferencia'}
                      </button>
                    ))}
                  </div>
                  {detalleError && (
                    <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-xl px-3 py-2">{detalleError}</p>
                  )}
                  <button onClick={guardarDetalle} disabled={detalleGuardando || !detalleIntencion}
                    className="w-full py-3.5 rounded-xl text-white font-bold text-sm disabled:opacity-40 transition-opacity"
                    style={{ background: 'linear-gradient(135deg, #4c1d95, #6d28d9)' }}
                  >
                    {detalleGuardando ? 'Guardando…' : 'Confirmar intención'}
                  </button>
                </div>
              )}
            </div>
          </div>
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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const colaboradoras = Array.from(
    new Set(padron.filter(f => f.asignado_a).map(f => f.asignado_a as string))
  ).sort()

  const TABS: { id: Tab; label: string }[] = [
    { id: 'resumen',      label: 'Resumen por distrito' },
    { id: 'padron',       label: 'Padrón en vivo' },
    { id: 'nucleos',      label: 'Vista por Núcleos' },
    { id: 'regularizar',  label: '⭐ Por regularizar' },
    { id: 'confirmados',  label: '✓ Confirmados' },
    { id: 'pensionados',  label: '🟣 Pensionados Votantes' },
    { id: 'dia_eleccion', label: '🗳 Día de Elección' },
    { id: 'encuesta',     label: '📋 Encuesta' },
    { id: 'segmentador',  label: '🧩 Segmentador' },
    { id: 'usuarios',     label: '👥 Usuarios' },
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
        {tab === 'padron'       && <TabPadronActivo nombreUsuario={nombreUsuario} />}
        {tab === 'nucleos'      && <TabNucleos />}
        {tab === 'regularizar'  && <TabRegularizar />}
        {tab === 'confirmados'  && <TabConfirmadosPresidente onVerPensionados={() => setTab('pensionados')} />}
        {tab === 'pensionados'  && <TabPensionadosVotantes nombreUsuario={nombreUsuario} />}
        {tab === 'dia_eleccion' && <TabDiaEleccion />}
        {tab === 'encuesta'     && <TabEncuesta />}
        {tab === 'segmentador'  && <TabSegmentador />}
        {tab === 'usuarios'     && <TabAdminUsuarios />}
      </div>
    </div>
  )
}
