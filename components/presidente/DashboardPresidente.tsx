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

type Tab = 'resumen' | 'padron' | 'asignacion'

function esMontero(s: string) {
  return s.toLowerCase().includes('montero')
}

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
      style={{ backgroundColor: 'rgba(10,42,94,0.45)' }}
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
            <p className="font-bold text-lg leading-tight">{miembro.nombre}</p>
            <p className="text-blue-200 text-sm">Matrícula {miembro.matricula} · {miembro.distrito}</p>
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
            <p className="font-medium text-gray-800">{miembro.telefono ?? '—'}</p>
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

function TabResumen({ metricas, padron }: { metricas: MetricaDistrito[]; padron: PadronVivoRow[] }) {
  const [desglose, setDesglose] = useState<{ distrito: string; estado: EstadoGestion; label: string } | null>(null)
  const visibles = metricas.filter(m => !esMontero(m.distrito))

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
    { name: 'En proceso',       value: total.en_proceso,       fill: '#15407F' },
    { name: 'Contactados',      value: total.contactados,      fill: '#1F9D55' },
    { name: 'Sin comunicación', value: total.sin_comunicacion, fill: '#C81E2C' },
    { name: 'Cerrados',         value: total.cerrados,         fill: '#0A2A5E' },
  ].filter(d => d.value > 0)

  return (
    <div className="space-y-6">
      {/* Diagrama circular distribución general */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">
          Distribución general por estado
          <span className="ml-2 text-xs font-normal text-gray-400">
            — {total.total.toLocaleString()} miembros en total
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
              <p className="font-semibold tabular-nums">{m.total.toLocaleString()} miembros</p>
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
                { label: 'En proceso',       val: m.en_proceso,       color: '#15407F', estado: 'en_proceso'      as EstadoGestion },
                { label: 'Contactados',      val: m.contactados,      color: '#1F9D55', estado: 'contactado'      as EstadoGestion },
                { label: 'Sin comunicación', val: m.sin_comunicacion, color: '#C81E2C', estado: 'no_comunicacion' as EstadoGestion },
                { label: 'Cerrados',         val: m.cerrados,         color: '#0A2A5E', estado: 'cerrado'         as EstadoGestion },
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
          f => !esMontero(f.distrito) && f.distrito === desglose.distrito && f.estado_gestion === desglose.estado
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
                      <td className="px-5 py-2.5 font-medium text-gray-900">{f.nombre}</td>
                      <td className="px-5 py-2.5 text-gray-500 hidden sm:table-cell">{f.telefono ?? '—'}</td>
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

function TabPadron({ filas, colaboradoras }: { filas: PadronVivoRow[]; colaboradoras: string[] }) {
  const [buscar, setBuscar] = useState('')
  const [filtroDistrito, setFiltroDistrito] = useState('')
  const [filtroEstado, setFiltroEstado] = useState<EstadoGestion | ''>('')
  const [filtroColab, setFiltroColab] = useState('')
  const [soloPendientes, setSoloPendientes] = useState(false)
  const [miembroSelec, setMiembroSelec] = useState<PadronVivoRow | null>(null)

  const distritos = Array.from(new Set(filas.map(f => f.distrito))).filter(d => !esMontero(d)).sort()

  const filtradas = filas.filter(f => {
    if (esMontero(f.distrito)) return false
    if (soloPendientes) return f.estado_gestion === 'pendiente'
    if (filtroDistrito && f.distrito !== filtroDistrito) return false
    if (filtroEstado && f.estado_gestion !== filtroEstado) return false
    if (filtroColab && f.asignado_a !== filtroColab) return false
    if (buscar && !f.nombre.toLowerCase().includes(buscar.toLowerCase())) return false
    return true
  })

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
            ⏳ Pendientes ({filas.filter(f => !esMontero(f.distrito) && f.estado_gestion === 'pendiente').length})
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
            <option value="">Todos los distritos</option>
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
        <p className="text-xs text-gray-400 mt-2">{filtradas.length.toLocaleString()} miembros mostrados</p>
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
              {filtradas.slice(0, 200).map(f => (
                <tr
                  key={f.id}
                  onClick={() => setMiembroSelec(f)}
                  className="hover:bg-blue-50/40 cursor-pointer transition-colors"
                >
                  <td className="px-5 py-3 font-medium text-gray-900">{f.nombre}</td>
                  <td className="px-5 py-3 text-gray-500 hidden sm:table-cell">{f.telefono ?? '—'}</td>
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
              {filtradas.length > 200 && (
                <tr>
                  <td colSpan={5} className="px-5 py-3 text-center text-xs text-gray-400">
                    Mostrando los primeros 200 de {filtradas.length.toLocaleString()} resultados. Usa los filtros para afinar.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

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

// ─── Tab: Vista de asignación ─────────────────────────────────────────────────

function TabAsignacion({ filas }: { filas: PadronVivoRow[] }) {
  const visibles = filas.filter(f => !esMontero(f.distrito))

  // Agrupar por colaboradora
  const mapa = new Map<string, PadronVivoRow[]>()
  for (const f of visibles) {
    const clave = f.asignado_a ?? '(sin asignar)'
    const grupo = mapa.get(clave) ?? []
    grupo.push(f)
    mapa.set(clave, grupo)
  }

  const grupos = Array.from(mapa.entries()).sort((a, b) => b[1].length - a[1].length)

  function contarEstado(filas: PadronVivoRow[], estado: EstadoGestion) {
    return filas.filter(f => f.estado_gestion === estado).length
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {grupos.map(([nombre, miembros]) => {
          const confirmados = miembros.filter(m => m.ultimo_confirma === true).length
          const pct = miembros.length > 0
            ? Math.round(((contarEstado(miembros, 'contactado') + contarEstado(miembros, 'cerrado')) / miembros.length) * 100)
            : 0

          return (
            <div
              key={nombre}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
            >
              <div
                className="px-5 py-3 flex items-center justify-between"
                style={{ backgroundColor: 'var(--color-real)', color: 'white' }}
              >
                <p className="font-semibold text-sm truncate max-w-[70%]">{nombre}</p>
                <p className="font-bold tabular-nums">{miembros.length}</p>
              </div>

              {/* Plancha 1 */}
              <div
                className="px-5 py-3 flex items-center justify-between border-b border-gray-100"
                style={{ backgroundColor: 'rgba(231,178,40,0.07)' }}
              >
                <p className="text-xs font-semibold text-gray-600">★ Confirman Plancha 1</p>
                <p className="font-bold tabular-nums" style={{ color: 'var(--color-dorado)' }}>
                  {confirmados}
                </p>
              </div>

              {/* Estados */}
              <div className="px-5 py-3 space-y-1.5">
                {([
                  ['pendiente',       'Pendientes'],
                  ['en_proceso',      'En proceso'],
                  ['contactado',      'Contactados'],
                  ['no_comunicacion', 'Sin comunicación'],
                  ['cerrado',         'Cerrados'],
                ] as [EstadoGestion, string][]).map(([est]) => {
                  const n = contarEstado(miembros, est)
                  if (n === 0) return null
                  return (
                    <div key={est} className="flex items-center justify-between text-sm">
                      <EstadoBadge estado={est} />
                      <span className="font-semibold tabular-nums text-gray-700">{n}</span>
                    </div>
                  )
                })}
              </div>

              {/* Progreso */}
              <div className="px-5 pb-4">
                <div className="bg-gray-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${pct}%`, backgroundColor: 'var(--color-exito)' }}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">{pct}% gestionados</p>
              </div>
            </div>
          )
        })}
      </div>
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
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [ultimaActualizacion, setUltimaActualizacion] = useState<Date | null>(null)

  const cargar = useCallback(async () => {
    const [resMetricas, resPadron] = await Promise.all([
      supabase.from('vista_metricas_distrito').select('*'),
      supabase.from('vista_padron_vivo').select('*').order('nombre').limit(5000),
    ])

    if (resMetricas.error || resPadron.error) {
      setError('Error al cargar los datos. Verifica tu conexión.')
      return
    }

    setMetricas((resMetricas.data as MetricaDistrito[]) ?? [])
    setPadron((resPadron.data as PadronVivoRow[]) ?? [])
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
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'miembros' }, () => cargar())
      .subscribe()
    return () => { supabase.removeChannel(canal) }
  }, [supabase, cargar])

  const colaboradoras = Array.from(
    new Set(padron.filter(f => f.asignado_a).map(f => f.asignado_a as string))
  ).sort()

  const TABS: { id: Tab; label: string }[] = [
    { id: 'resumen',   label: 'Resumen por distrito' },
    { id: 'padron',    label: 'Padrón en vivo' },
    { id: 'asignacion', label: 'Por colaboradora' },
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
        {tab === 'resumen'    && <TabResumen metricas={metricas} padron={padron} />}
        {tab === 'padron'     && <TabPadron filas={padron} colaboradoras={colaboradoras} />}
        {tab === 'asignacion' && <TabAsignacion filas={padron} />}
      </div>
    </div>
  )
}
