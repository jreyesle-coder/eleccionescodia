'use client'

import { useState, useEffect, useCallback } from 'react'
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

function TabDiaEleccion() {
  const supabase = createClient()
  const [totalVotos, setTotalVotos]     = useState(0)
  const [aFavor, setAFavor]             = useState(0)
  const [noAFavor, setNoAFavor]         = useState(0)
  const [porRegional, setPorRegional]   = useState<Record<string, RegionalResultado>>({})
  const [alertasDoble, setAlertasDoble] = useState<AlertaDoble[]>([])
  const [alertasNoHab, setAlertasNoHab] = useState<AlertaNoHab[]>([])
  const [cargando, setCargando]         = useState(true)

  const cargar = useCallback(async () => {
    const [resConteo, resDoble, resNoHab] = await Promise.all([
      supabase.rpc('conteo_votos_dia'),
      supabase.from('v_alerta_doble_voto').select('*'),
      supabase.from('v_alerta_no_habilitado').select('*').order('created_at', { ascending: false }),
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
    setCargando(false)
  }, [supabase])

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

  return (
    <div className="space-y-5">

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
