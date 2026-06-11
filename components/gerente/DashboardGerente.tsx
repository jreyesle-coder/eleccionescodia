'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  ResponsiveContainer,
  PieChart, Pie, Cell, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts'
import AppHeader from '@/components/app-header'
import type { KpisGenerales, PanelOperadorRow, MetricaRegion, PadronVivoRow, EstadoGestion, HistorialOperadorRow, DeudasVotante } from '@/lib/types/database'

// ─── Constantes ───────────────────────────────────────────────────────────────

const ZONA = 'America/Santo_Domingo'

const COLORES_ESTADO: Record<string, string> = {
  pendiente:       '#94a3b8',
  en_proceso:      '#2A407A',
  contactado:      '#1F9D55',
  no_comunicacion: '#B61F2E',
  cerrado:         '#16285A',
}

function formatPct(n: number | null | undefined): string {
  if (n == null) return '—'
  return `${n}%`
}

function hoy(): string {
  return new Date().toLocaleDateString('es-DO', { timeZone: ZONA, weekday: 'long', day: 'numeric', month: 'long' })
}

// ─── Tarjeta KPI ─────────────────────────────────────────────────────────────

interface KpiCardProps {
  titulo: string
  valor: number | string
  subtitulo?: string
  color?: string
  grande?: boolean
}

function KpiCard({ titulo, valor, subtitulo, color, grande }: KpiCardProps) {
  return (
    <div
      className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex flex-col gap-1 border-t-4"
      style={color ? { borderTopColor: color } : { borderTopColor: 'var(--color-marino)' }}
    >
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{titulo}</p>
      <p
        className={`font-bold tabular-nums ${grande ? 'text-4xl' : 'text-3xl'}`}
        style={{ color: color ?? 'var(--color-marino)' }}
      >
        {valor}
      </p>
      {subtitulo && <p className="text-xs text-gray-400">{subtitulo}</p>}
    </div>
  )
}

// ─── Etiquetas de resultado ───────────────────────────────────────────────────

const ETIQUETA_RESULTADO: Record<string, string> = {
  efectiva_confirma:     'Confirmó Plancha #1',
  efectiva_no_confirma:  'Efectiva (no confirma)',
  no_contesta:           'No contesta',
  numero_equivocado:     'Número equivocado',
  volver_a_llamar:       'Volver a llamar',
  rechaza:               'Rechaza',
}

const COLOR_RESULTADO: Record<string, string> = {
  efectiva_confirma:     'bg-green-100 text-green-800',
  efectiva_no_confirma:  'bg-blue-100 text-blue-700',
  no_contesta:           'bg-yellow-100 text-yellow-700',
  numero_equivocado:     'bg-gray-100 text-gray-600',
  volver_a_llamar:       'bg-purple-100 text-purple-700',
  rechaza:               'bg-red-100 text-red-700',
}

// ─── Modal historial de operador ──────────────────────────────────────────────

interface ModalHistorialProps {
  operador: PanelOperadorRow
  onCerrar: () => void
}

function ModalHistorial({ operador, onCerrar }: ModalHistorialProps) {
  const supabase = createClient()
  const [historial, setHistorial] = useState<HistorialOperadorRow[]>([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    supabase
      .rpc('historial_operador', { p_operador_id: operador.operador_id })
      .then(({ data }) => {
        setHistorial((data as HistorialOperadorRow[]) ?? [])
        setCargando(false)
      })
  }, [supabase, operador.operador_id])

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-12 px-4 pb-4"
      style={{ backgroundColor: 'rgba(14,28,66,0.45)' }}
      onClick={onCerrar}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Cabecera */}
        <div
          className="px-6 py-4 flex items-center justify-between rounded-t-2xl"
          style={{ backgroundColor: 'var(--color-marino)', color: 'white' }}
        >
          <div>
            <p className="text-xs uppercase tracking-wide opacity-70">Historial de llamadas</p>
            <h2 className="text-lg font-bold">{operador.nombre}</h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right text-sm">
              <p><span className="opacity-70">Total:</span> <strong>{operador.llamadas_total}</strong> llamadas</p>
              <p><span className="opacity-70">Conf. P1:</span> <strong style={{ color: 'var(--color-dorado)' }}>{operador.confirmados_p1_total}</strong></p>
            </div>
            <button
              onClick={onCerrar}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 text-white font-bold transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Tabla */}
        <div className="overflow-y-auto flex-1">
          {cargando ? (
            <p className="text-center text-gray-400 py-10">Cargando historial…</p>
          ) : historial.length === 0 ? (
            <p className="text-center text-gray-400 py-10">Sin llamadas registradas</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-gray-50 border-b border-gray-200">
                <tr className="text-xs uppercase tracking-wide text-gray-500">
                  <th className="text-left px-4 py-3 font-semibold">Fecha / Hora</th>
                  <th className="text-left px-4 py-3 font-semibold">Miembro</th>
                  <th className="text-left px-4 py-3 font-semibold">Matrícula</th>
                  <th className="text-left px-4 py-3 font-semibold">Resultado</th>
                  <th className="text-center px-4 py-3 font-semibold">P1</th>
                  <th className="text-left px-4 py-3 font-semibold">Notas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {historial.map(h => (
                  <tr key={h.llamada_id} className="hover:bg-gray-50/70 transition-colors">
                    <td className="px-4 py-2.5 text-xs text-gray-500 whitespace-nowrap">
                      {new Date(h.fecha_hora).toLocaleString('es-DO', {
                        timeZone: ZONA,
                        day: '2-digit', month: '2-digit', year: '2-digit',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </td>
                    <td className="px-4 py-2.5 font-medium text-gray-900">{h.colegiado_nombre ?? h.miembro_nombre}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-gray-400">{h.codigo}</td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${COLOR_RESULTADO[h.resultado] ?? 'bg-gray-100 text-gray-600'}`}>
                        {ETIQUETA_RESULTADO[h.resultado] ?? h.resultado}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {h.confirma_p1
                        ? <span className="text-green-600 font-bold">✔</span>
                        : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-gray-400 max-w-[180px] truncate">{h.notas ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="px-6 py-3 border-t border-gray-100 text-xs text-gray-400 text-right rounded-b-2xl">
          {historial.length} registros
        </div>
      </div>
    </div>
  )
}

// ─── Tabla resumen de operadores ──────────────────────────────────────────────

type VistaConteo = 'total' | 'hoy'

interface TablaOperadoresProps {
  operadores: PanelOperadorRow[]
}

function TablaOperadores({ operadores }: TablaOperadoresProps) {
  const [vista, setVista] = useState<VistaConteo>('total')
  const [operadorSeleccionado, setOperadorSeleccionado] = useState<PanelOperadorRow | null>(null)

  const llamadas   = (op: PanelOperadorRow) => vista === 'total' ? op.llamadas_total        : op.llamadas_hoy
  const efectivas  = (op: PanelOperadorRow) => vista === 'total' ? op.efectivas_total       : op.efectivas_hoy
  const confP1     = (op: PanelOperadorRow) => vista === 'total' ? op.confirmados_p1_total  : op.confirmados_p1_hoy
  const noContesta = (op: PanelOperadorRow) => vista === 'total' ? op.no_contesta_total     : op.no_contesta_hoy

  return (
    <>
      {operadorSeleccionado && (
        <ModalHistorial operador={operadorSeleccionado} onCerrar={() => setOperadorSeleccionado(null)} />
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
          <h2 className="text-sm font-semibold text-gray-700">Resumen de operadores</h2>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400">{operadores.length} operadores · haz clic para ver historial</span>
            {/* Toggle hoy / total */}
            <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5 text-xs font-semibold">
              <button
                onClick={() => setVista('total')}
                className="px-3 py-1.5 rounded-md transition-colors"
                style={vista === 'total' ? { backgroundColor: 'var(--color-marino)', color: 'white' } : { color: 'var(--color-real)' }}
              >
                Total
              </button>
              <button
                onClick={() => setVista('hoy')}
                className="px-3 py-1.5 rounded-md transition-colors"
                style={vista === 'hoy' ? { backgroundColor: 'var(--color-marino)', color: 'white' } : { color: 'var(--color-real)' }}
              >
                Hoy
              </button>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr
                className="text-xs uppercase tracking-wide border-b-2"
                style={{ borderBottomColor: 'var(--color-marino)', color: 'var(--color-marino)' }}
              >
                <th className="text-left px-4 py-3 font-semibold">Operador</th>
                <th className="text-left px-4 py-3 font-semibold">Rol</th>
                <th className="text-right px-4 py-3 font-semibold">Llamadas</th>
                <th className="text-right px-4 py-3 font-semibold">Efectivas</th>
                <th className="text-right px-4 py-3 font-semibold">Conf. P1</th>
                <th className="text-right px-4 py-3 font-semibold">No contesta</th>
                <th className="text-left px-4 py-3 font-semibold">Últ. actividad</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {operadores.map(op => (
                <tr
                  key={op.operador_id}
                  className="hover:bg-blue-50/50 transition-colors cursor-pointer"
                  onClick={() => setOperadorSeleccionado(op)}
                >
                  <td className="px-4 py-3 font-medium" style={{ color: 'var(--color-marino)' }}>
                    <span className="underline decoration-dotted underline-offset-2">{op.nombre}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 capitalize">{op.rol}</td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums">{llamadas(op)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-green-700">{efectivas(op)}</td>
                  <td className="px-4 py-3 text-right tabular-nums font-bold" style={{ color: 'var(--color-dorado)' }}>
                    {confP1(op)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-red-600">{noContesta(op)}</td>
                  <td className="px-4 py-3 text-xs text-gray-400">
                    {op.ultima_actividad
                      ? new Date(op.ultima_actividad).toLocaleString('es-DO', {
                          timeZone: ZONA,
                          day: '2-digit', month: '2-digit',
                          hour: '2-digit', minute: '2-digit',
                        })
                      : '—'}
                  </td>
                </tr>
              ))}
              {operadores.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-gray-400">Sin operadores registrados</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}

// ─── Tab: Resumen ─────────────────────────────────────────────────────────────

interface TabResumenProps {
  kpis: KpisGenerales
  operadores: PanelOperadorRow[]
}

function TabResumen({ kpis, operadores }: TabResumenProps) {
  const dataDona = [
    { name: 'Pendientes',      value: kpis.pendientes,       fill: COLORES_ESTADO.pendiente },
    { name: 'En proceso',      value: kpis.en_proceso,       fill: COLORES_ESTADO.en_proceso },
    { name: 'Contactados',     value: kpis.contactados,      fill: COLORES_ESTADO.contactado },
    { name: 'No comunicación', value: kpis.no_comunicacion,  fill: COLORES_ESTADO.no_comunicacion },
    { name: 'Cerrados',        value: kpis.cerrados,         fill: COLORES_ESTADO.cerrado },
  ].filter(d => d.value > 0)

  const dataBarras = operadores.map(op => ({
    nombre: op.nombre.split(' ')[0],
    Efectivas: op.efectivas_hoy,
    'Conf. P1': op.confirmados_p1_hoy,
  }))

  return (
    <div className="space-y-8">
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <KpiCard titulo="Total colegiados"  valor={kpis.total_colegiados ?? kpis.total_miembros}  color="var(--color-marino)" />
        <KpiCard titulo="Pendientes"        valor={kpis.pendientes}       color={COLORES_ESTADO.pendiente} />
        <KpiCard titulo="Contactados"       valor={kpis.contactados}      color={COLORES_ESTADO.contactado} />
        <KpiCard titulo="No comunicación"   valor={kpis.no_comunicacion}  color={COLORES_ESTADO.no_comunicacion} />
        <KpiCard titulo="Cerrados"          valor={kpis.cerrados}         color={COLORES_ESTADO.cerrado} />
      </div>

      {/* Tarjeta destacada: tasa de aceptación */}
      <div
        className="rounded-2xl p-6 text-white flex flex-col sm:flex-row items-start sm:items-center gap-4"
        style={{ background: `linear-gradient(135deg, var(--color-marino), var(--color-real))` }}
      >
        <div className="flex-1 space-y-1">
          <p className="text-blue-200 text-sm font-semibold uppercase tracking-wide">
            Tasa de aceptación — Plancha #1
          </p>
          <p className="text-5xl font-bold tabular-nums" style={{ color: 'var(--color-dorado)' }}>
            {formatPct(kpis.tasa_confirmacion)}
          </p>
          <p className="text-blue-200 text-sm">
            {kpis.confirmados_p1.toLocaleString()} miembros confirmaron su apoyo
          </p>
        </div>
        <div
          className="text-center rounded-xl px-6 py-4 text-sm"
          style={{ backgroundColor: 'rgba(231,178,40,0.2)', border: '2px solid var(--color-dorado)' }}
        >
          <p className="font-bold text-3xl tabular-nums" style={{ color: 'var(--color-dorado)' }}>
            {kpis.confirmados_p1.toLocaleString()}
          </p>
          <p className="text-blue-200 text-xs mt-1">votos confirmados</p>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Distribución por estado</h2>
          {dataDona.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={dataDona}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={110}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ percent }) =>
                    percent != null ? `${(percent * 100).toFixed(0)}%` : ''
                  }
                  labelLine={false}
                >
                  {dataDona.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip formatter={(val) => typeof val === 'number' ? val.toLocaleString() : val} />
                <Legend iconType="circle" iconSize={8} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-400 text-sm text-center py-16">Sin datos disponibles</p>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Llamadas hoy por operador</h2>
          {dataBarras.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={dataBarras} margin={{ top: 4, right: 8, bottom: 4, left: -16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="nombre" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="Efectivas"  fill="#1F9D55" radius={[4,4,0,0]} />
                <Bar dataKey="Conf. P1"   fill="#C8961E"  radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-400 text-sm text-center py-16">Sin llamadas registradas hoy</p>
          )}
        </div>
      </div>

      {/* Resumen de operadores */}
      <TablaOperadores operadores={operadores} />
    </div>
  )
}

// ─── Tab: Por región ──────────────────────────────────────────────────────────

const ETIQUETA_ESTADO: Record<EstadoGestion, string> = {
  pendiente:       'Pendiente',
  en_proceso:      'En proceso',
  contactado:      'Contactado',
  no_comunicacion: 'Sin comunicación',
  cerrado:         'Cerrado',
}

const COLOR_ESTADO_BADGE: Record<EstadoGestion, string> = {
  pendiente:       'bg-gray-100 text-gray-600',
  en_proceso:      'bg-blue-100 text-blue-800',
  contactado:      'bg-green-100 text-green-800',
  no_comunicacion: 'bg-red-100 text-red-700',
  cerrado:         'bg-slate-200 text-slate-700',
}

interface TabRegionProps {
  regiones: MetricaRegion[]
}

function FilaMetrica({ label, valor, color }: { label: string; valor: number; color: string }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-xs text-gray-500">{label}</span>
      <span className="text-sm font-semibold tabular-nums" style={{ color }}>{valor.toLocaleString()}</span>
    </div>
  )
}

function TarjetaRegion({
  r,
  seleccionada,
  onToggle,
}: {
  r: MetricaRegion
  seleccionada: boolean
  onToggle: () => void
}) {
  const pct = r.total > 0 ? Math.round((r.confirmados_plancha1 / r.total) * 100) : 0
  const contactPct = r.total > 0 ? Math.round((r.contactados / r.total) * 100) : 0

  return (
    <div
      className="bg-white rounded-2xl border shadow-sm overflow-hidden cursor-pointer transition-shadow hover:shadow-md"
      style={{ borderColor: seleccionada ? 'var(--color-marino)' : '#f3f4f6' }}
      onClick={onToggle}
    >
      {/* Cabecera */}
      <div
        className="px-5 py-4 flex items-center justify-between"
        style={{ borderBottom: '4px solid var(--color-marino)' }}
      >
        <h3 className="font-bold text-base" style={{ color: 'var(--color-marino)' }}>
          {r.region}
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold tabular-nums" style={{ color: 'var(--color-marino)' }}>
            {r.total.toLocaleString()}
            <span className="text-xs font-normal text-gray-400 ml-1">miembros</span>
          </span>
          <span className="text-gray-400 text-sm">{seleccionada ? '▲' : '▼'}</span>
        </div>
      </div>

      <div className="px-5 py-4 space-y-1">
        <FilaMetrica label="Pendientes"       valor={r.pendientes}          color={COLORES_ESTADO.pendiente} />
        <FilaMetrica label="En proceso"       valor={r.en_proceso}          color={COLORES_ESTADO.en_proceso} />
        <FilaMetrica label="Contactados"      valor={r.contactados}         color={COLORES_ESTADO.contactado} />
        <FilaMetrica label="Sin comunicación" valor={r.sin_comunicacion}    color={COLORES_ESTADO.no_comunicacion} />
        <FilaMetrica label="Cerrados"         valor={r.cerrados}            color={COLORES_ESTADO.cerrado} />

        <div className="pt-3 border-t border-gray-100 space-y-2">
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gray-400">Contactados</span>
              <span className="font-semibold" style={{ color: COLORES_ESTADO.contactado }}>{contactPct}%</span>
            </div>
            <div className="bg-gray-100 rounded-full h-2 overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${contactPct}%`, backgroundColor: COLORES_ESTADO.contactado }} />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gray-400">Conf. Plancha #1</span>
              <span className="font-bold" style={{ color: 'var(--color-dorado)' }}>
                {r.confirmados_plancha1.toLocaleString()} · {pct}%
              </span>
            </div>
            <div className="bg-gray-100 rounded-full h-2 overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: 'var(--color-dorado)' }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Pone Santiago primero; el resto ordenado como viene (por nombre desde Supabase)
function ordenarPadron(filas: PadronVivoRow[], region: string): PadronVivoRow[] {
  return [...filas].sort((a, b) => {
    const aNucleo = (a.nucleo ?? '').toLowerCase()
    const bNucleo = (b.nucleo ?? '').toLowerCase()
    return aNucleo.localeCompare(bNucleo, 'es') || a.nombre_completo.localeCompare(b.nombre_completo, 'es')
  })
}

function TablaPadron({ filas, cargandoPadron }: { filas: PadronVivoRow[]; cargandoPadron: boolean }) {
  if (cargandoPadron) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
        <p className="text-gray-400 text-sm">Cargando padrón…</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr
              className="text-xs uppercase tracking-wide border-b-2"
              style={{ borderBottomColor: 'var(--color-marino)', color: 'var(--color-marino)' }}
            >
              <th className="text-left px-4 py-3 font-semibold">Regional</th>
              <th className="text-left px-4 py-3 font-semibold">Núcleo</th>
              <th className="text-left px-4 py-3 font-semibold">Colegiatura</th>
              <th className="text-left px-4 py-3 font-semibold">Nombre</th>
              <th className="text-left px-4 py-3 font-semibold">Teléfono</th>
              <th className="text-left px-4 py-3 font-semibold">Profesión</th>
              <th className="text-left px-4 py-3 font-semibold">Estado</th>
              <th className="text-left px-4 py-3 font-semibold">Asignado a</th>
              <th className="text-left px-4 py-3 font-semibold">Último resultado</th>
              <th className="text-center px-4 py-3 font-semibold">Conf. P1</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filas.map(m => (
              <tr key={m.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-4 py-2.5 text-gray-500 text-xs">{m.regional}</td>
                <td className="px-4 py-2.5 text-gray-500 text-xs">{m.nucleo ?? '—'}</td>
                <td className="px-4 py-2.5 font-mono text-xs text-gray-500">{m.codigo}</td>
                <td className="px-4 py-2.5 font-medium text-gray-900">
                  {m.nombre_completo}
                  {m.pensionado && <span className="ml-1 text-[10px] text-purple-600 font-bold">(P)</span>}
                  {m.nuevo_integrante && <span className="ml-1 text-[10px] text-yellow-600 font-bold">★</span>}
                </td>
                <td className="px-4 py-2.5 text-gray-500">{m.telefono ?? m.celular ?? '—'}</td>
                <td className="px-4 py-2.5 text-gray-500 text-xs max-w-[120px] truncate">{m.carrera ?? '—'}</td>
                <td className="px-4 py-2.5">
                  <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${COLOR_ESTADO_BADGE[m.estado_gestion]}`}>
                    {ETIQUETA_ESTADO[m.estado_gestion]}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-xs text-gray-400">{m.asignado_a ?? '—'}</td>
                <td className="px-4 py-2.5 text-xs text-gray-500">{m.ultimo_resultado ?? '—'}</td>
                <td className="px-4 py-2.5 text-center">
                  {m.ultimo_confirma === true
                    ? <span className="text-green-600 font-bold">✔</span>
                    : m.ultimo_confirma === false
                      ? <span className="text-red-500">✗</span>
                      : <span className="text-gray-300">—</span>}
                </td>
              </tr>
            ))}
            {filas.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-gray-400">Sin registros</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="px-4 py-2 border-t border-gray-50 text-xs text-gray-400 text-right">
        {filas.length.toLocaleString()} registros
      </div>
    </div>
  )
}

function TabRegion({ regiones }: TabRegionProps) {
  const supabase = createClient()
  const [regionActiva, setRegionActiva] = useState<string | null>(null)
  const [filasMostradas, setFilasMostradas] = useState<PadronVivoRow[]>([])
  const [cargandoPadron, setCargandoPadron] = useState(false)

  async function toggleRegion(region: string) {
    if (regionActiva === region) {
      setRegionActiva(null)
      setFilasMostradas([])
      return
    }
    setRegionActiva(region)
    setFilasMostradas([])
    setCargandoPadron(true)
    const { data } = await supabase.rpc('listar_padron_regional', { p_regional: region })
    const filas = ordenarPadron((data as PadronVivoRow[]) ?? [], region)
    setFilasMostradas(filas)
    setCargandoPadron(false)
  }

  if (regiones.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
        <p className="text-gray-400">Sin datos de región disponibles</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        {regiones.map(r => (
          <TarjetaRegion
            key={r.region}
            r={r}
            seleccionada={regionActiva === r.region}
            onToggle={() => toggleRegion(r.region)}
          />
        ))}
      </div>

      {regionActiva && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-700">
            Padrón — Región <span style={{ color: 'var(--color-marino)' }}>{regionActiva}</span>
            {!cargandoPadron && (
              <span className="ml-2 text-gray-400 font-normal">({filasMostradas.length.toLocaleString()} miembros)</span>
            )}
          </h2>
          <TablaPadron filas={filasMostradas} cargandoPadron={cargandoPadron} />
        </div>
      )}
    </div>
  )
}

// ─── Exportar CSV ─────────────────────────────────────────────────────────────

function exportarCSV(filas: PanelOperadorRow[]) {
  const cabecera = ['Operador','Rol','Llamadas total','Efectivas total','Conf. P1 total','No contesta total','Llamadas hoy','Efectivas hoy','Conf. P1 hoy','No contesta hoy','Última actividad']
  const filasCsv = filas.map(op => [
    op.nombre,
    op.rol,
    op.llamadas_total,
    op.efectivas_total,
    op.confirmados_p1_total,
    op.no_contesta_total,
    op.llamadas_hoy,
    op.efectivas_hoy,
    op.confirmados_p1_hoy,
    op.no_contesta_hoy,
    op.ultima_actividad
      ? new Date(op.ultima_actividad).toLocaleString('es-DO', { timeZone: ZONA })
      : '—',
  ])
  const contenido = [cabecera, ...filasCsv].map(r => r.join(',')).join('\n')
  const blob = new Blob(['﻿' + contenido], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `codia-operadores-${new Date().toISOString().slice(0,10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ─── Tab: Buscar y corregir ───────────────────────────────────────────────────

type BusquedaResultado = {
  id: number
  codigo: string
  nombre_completo: string
  telefono: string | null
  celular: string | null
  regional: string | null
  nucleo: string | null
  carrera: string | null
  pensionado: boolean
  nuevo_integrante: boolean
  estado_gestion: EstadoGestion
}

type UltimaLlamada = {
  id: number
  resultado: string
  confirma_plancha1: boolean
  fecha_hora: string
  notas: string | null
  operador_nombre: string | null
}

type FormResultadoBuscar = 'efectiva_confirma' | 'efectiva_no_confirma' | 'no_contesta' | 'numero_equivocado'

function TabBuscar() {
  const supabase = createClient()

  const [query, setQuery] = useState('')
  const [buscando, setBuscando] = useState(false)
  const [resultados, setResultados] = useState<BusquedaResultado[]>([])
  const [sinResultados, setSinResultados] = useState(false)

  const [seleccionado, setSeleccionado] = useState<BusquedaResultado | null>(null)
  const [ultimaLlamada, setUltimaLlamada] = useState<UltimaLlamada | null>(null)
  const [cargandoDetalle, setCargandoDetalle] = useState(false)

  // Formulario
  const [formResultado, setFormResultado] = useState<FormResultadoBuscar | null>(null)
  const [notas, setNotas] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [errorAccion, setErrorAccion] = useState<string | null>(null)
  const [exito, setExito] = useState(false)

  function resetForm() {
    setFormResultado(null)
    setNotas('')
    setErrorAccion(null)
    setExito(false)
  }

  async function buscar() {
    const q = query.trim()
    if (q.length < 2) return
    setBuscando(true)
    setSinResultados(false)
    setResultados([])
    setSeleccionado(null)
    resetForm()

    const { data } = await supabase.rpc('buscar_colegiado', { p_q: q })
    const filas = (data as BusquedaResultado[] | null) ?? []
    setResultados(filas)
    setSinResultados(filas.length === 0)
    setBuscando(false)
  }

  async function seleccionar(m: BusquedaResultado) {
    setSeleccionado(m)
    resetForm()
    setCargandoDetalle(true)

    const { data } = await supabase
      .from('llamadas')
      .select('id, resultado, confirma_plancha1, fecha_hora, notas, profiles!llamadas_operador_id_fkey(nombre)')
      .eq('colegiado_id', m.id)
      .order('fecha_hora', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (data) {
      const p = (Array.isArray(data.profiles) ? data.profiles[0] : data.profiles) as { nombre: string } | null
      setUltimaLlamada({
        id: data.id,
        resultado: data.resultado,
        confirma_plancha1: data.confirma_plancha1,
        fecha_hora: data.fecha_hora,
        notas: data.notas,
        operador_nombre: p?.nombre ?? null,
      })
    } else {
      setUltimaLlamada(null)
    }
    setCargandoDetalle(false)
  }

  async function guardar() {
    if (!seleccionado || !formResultado) return
    if (formResultado === 'efectiva' && confirmaP1 === null) {
      setErrorAccion('Indica si confirmó apoyo a la Plancha 1.')
      return
    }
    setGuardando(true)
    setErrorAccion(null)
    const { error } = await supabase.rpc('registrar_llamada', {
      p_colegiado_id: seleccionado.id,
      p_resultado: formResultado,
      p_confirma: formResultado === 'efectiva_confirma',
      p_notas: notas.trim() || null,
      p_callback_at: null,
    })
    setGuardando(false)

    if (error) {
      setErrorAccion('No se pudo guardar. Intenta de nuevo.')
      return
    }

    setExito(true)
    // Refrescar detalle
    const estadoNuevo: EstadoGestion =
      formResultado === 'efectiva_confirma' || formResultado === 'efectiva_no_confirma' ? 'contactado'
      : formResultado === 'numero_equivocado' ? 'cerrado'
      : seleccionado.estado_gestion
    setSeleccionado({ ...seleccionado, estado_gestion: estadoNuevo })
    await seleccionar({ ...seleccionado, estado_gestion: estadoNuevo })
    resetForm()
    setExito(true)
  }

  return (
    <div className="space-y-6">
      {/* Buscador */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700">Buscar miembro</h2>
        <div className="flex gap-3">
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && buscar()}
            placeholder="Nombre, colegiatura o cédula…"
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2"
            style={{ focusRingColor: 'var(--color-marino)' } as React.CSSProperties}
          />
          <button
            onClick={buscar}
            disabled={buscando || query.trim().length < 2}
            className="px-5 py-2 rounded-lg text-sm font-semibold text-white transition-colors disabled:opacity-50"
            style={{ backgroundColor: 'var(--color-marino)' }}
          >
            {buscando ? 'Buscando…' : 'Buscar'}
          </button>
        </div>

        {sinResultados && (
          <p className="text-sm text-gray-400">No se encontraron resultados para «{query}».</p>
        )}

        {resultados.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr
                  className="text-xs uppercase tracking-wide border-b-2"
                  style={{ borderBottomColor: 'var(--color-marino)', color: 'var(--color-marino)' }}
                >
                  <th className="text-left px-3 py-2 font-semibold">Colegiatura</th>
                  <th className="text-left px-3 py-2 font-semibold">Nombre</th>
                  <th className="text-left px-3 py-2 font-semibold">Profesión</th>
                  <th className="text-left px-3 py-2 font-semibold">Regional</th>
                  <th className="text-left px-3 py-2 font-semibold">Teléfono</th>
                  <th className="text-left px-3 py-2 font-semibold">Estado</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {resultados.map(m => (
                  <tr
                    key={m.id}
                    className="hover:bg-blue-50/50 transition-colors cursor-pointer"
                    style={seleccionado?.id === m.id ? { backgroundColor: 'rgba(21,64,127,0.07)' } : {}}
                    onClick={() => seleccionar(m)}
                  >
                    <td className="px-3 py-2 font-mono text-xs text-gray-500">{m.codigo}</td>
                    <td className="px-3 py-2 font-medium text-gray-900">
                      {m.nombre_completo}
                      {m.pensionado && <span className="ml-1 text-[10px] text-purple-600">(P)</span>}
                      {m.nuevo_integrante && <span className="ml-1 text-[10px] text-yellow-600">★</span>}
                    </td>
                    <td className="px-3 py-2 text-gray-500 text-xs">{m.carrera ?? '—'}</td>
                    <td className="px-3 py-2 text-gray-500 text-xs">{m.regional ?? '—'}</td>
                    <td className="px-3 py-2 text-gray-500">{m.telefono ?? m.celular ?? '—'}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${COLOR_ESTADO_BADGE[m.estado_gestion]}`}>
                        {ETIQUETA_ESTADO[m.estado_gestion]}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        className="text-xs font-medium underline decoration-dotted"
                        style={{ color: 'var(--color-marino)' }}
                        onClick={e => { e.stopPropagation(); seleccionar(m) }}
                      >
                        Seleccionar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Panel de corrección */}
      {seleccionado && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-5">
          {/* Cabecera miembro */}
          <div
            className="rounded-xl px-5 py-4 text-white space-y-1"
            style={{ background: 'linear-gradient(135deg, var(--color-marino), var(--color-real))' }}
          >
            <p className="text-xs uppercase tracking-wide opacity-70">Colegiado seleccionado</p>
            <p className="text-lg font-bold">{seleccionado.nombre_completo}</p>
            <div className="flex items-center gap-4 text-sm flex-wrap">
              <span className="opacity-80">Colegiatura: <strong>{seleccionado.codigo}</strong></span>
              {seleccionado.carrera && <span className="opacity-80 text-xs">{seleccionado.carrera}</span>}
              {seleccionado.regional && <span className="opacity-80 text-xs">{seleccionado.regional}</span>}
              <span
                className="inline-block text-xs font-semibold px-2 py-0.5 rounded-full"
                style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
              >
                {ETIQUETA_ESTADO[seleccionado.estado_gestion]}
              </span>
            </div>
          </div>

          {/* Última llamada */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Última llamada</p>
            {cargandoDetalle ? (
              <p className="text-sm text-gray-400">Cargando…</p>
            ) : ultimaLlamada ? (
              <div className="bg-gray-50 rounded-xl px-4 py-3 text-sm space-y-1">
                <div className="flex flex-wrap gap-4">
                  <span>
                    <span className="text-gray-400">Resultado: </span>
                    <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${COLOR_RESULTADO[ultimaLlamada.resultado] ?? 'bg-gray-100 text-gray-600'}`}>
                      {ETIQUETA_RESULTADO[ultimaLlamada.resultado] ?? ultimaLlamada.resultado}
                    </span>
                  </span>
                  <span>
                    <span className="text-gray-400">Conf. P1: </span>
                    {ultimaLlamada.confirma_plancha1
                      ? <span className="text-green-600 font-bold">✔ Sí</span>
                      : <span className="text-gray-500">No</span>}
                  </span>
                  <span className="text-gray-400 text-xs">
                    {new Date(ultimaLlamada.fecha_hora).toLocaleString('es-DO', {
                      timeZone: ZONA, day: '2-digit', month: '2-digit', year: '2-digit',
                      hour: '2-digit', minute: '2-digit',
                    })}
                    {ultimaLlamada.operador_nombre && ` · ${ultimaLlamada.operador_nombre}`}
                  </span>
                </div>
                {ultimaLlamada.notas && (
                  <p className="text-xs text-gray-500 italic">&ldquo;{ultimaLlamada.notas}&rdquo;</p>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-400">Sin llamadas previas registradas.</p>
            )}
          </div>

          {/* Éxito */}
          {exito && (
            <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700 font-medium">
              ✔ Llamada registrada correctamente. Estado actualizado.
            </div>
          )}

          {/* Formulario nuevo resultado */}
          <div className="space-y-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Registrar nuevo resultado</p>

            {/* Botones de resultado */}
            <div className="grid grid-cols-1 gap-3">
              <button
                onClick={() => { setFormResultado('efectiva_confirma'); setErrorAccion(null); setExito(false) }}
                className="w-full py-3.5 rounded-xl font-bold text-sm text-white transition-all"
                style={{ backgroundColor: formResultado === 'efectiva_confirma' ? '#15803d' : '#16a34a', opacity: formResultado && formResultado !== 'efectiva_confirma' ? 0.5 : 1 }}
              >
                ✓ Simpatiza con George Richardson
              </button>
              <button
                onClick={() => { setFormResultado('efectiva_no_confirma'); setErrorAccion(null); setExito(false) }}
                className="w-full py-3.5 rounded-xl font-bold text-sm text-white transition-all"
                style={{ backgroundColor: formResultado === 'efectiva_no_confirma' ? '#b91c1c' : '#dc2626', opacity: formResultado && formResultado !== 'efectiva_no_confirma' ? 0.5 : 1 }}
              >
                ✗ No Simpatiza con George Richardson
              </button>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => { setFormResultado('no_contesta'); setErrorAccion(null); setExito(false) }}
                  className="py-2.5 rounded-xl text-sm font-semibold border-2 transition-all"
                  style={formResultado === 'no_contesta' ? { backgroundColor: '#f1f5f9', borderColor: '#94a3b8', color: '#374151' } : { borderColor: '#e5e7eb', color: '#6b7280' }}
                >
                  📵 No contesta
                </button>
                <button
                  onClick={() => { setFormResultado('numero_equivocado'); setErrorAccion(null); setExito(false) }}
                  className="py-2.5 rounded-xl text-sm font-semibold border-2 transition-all"
                  style={formResultado === 'numero_equivocado' ? { backgroundColor: '#f1f5f9', borderColor: '#94a3b8', color: '#374151' } : { borderColor: '#e5e7eb', color: '#6b7280' }}
                >
                  ❌ Núm. equivocado
                </button>
              </div>
            </div>

            {/* Notas */}
            <textarea
              value={notas}
              onChange={e => setNotas(e.target.value)}
              placeholder="Notas (opcional)…"
              rows={2}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2"
            />

            {errorAccion && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{errorAccion}</p>
            )}

            <button
              onClick={guardar}
              disabled={!formResultado || guardando}
              className="px-6 py-2.5 rounded-lg text-sm font-bold text-white transition-colors disabled:opacity-40"
              style={{ backgroundColor: 'var(--color-marino)' }}
            >
              {guardando ? 'Guardando…' : 'Guardar resultado'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Tipos de tab ─────────────────────────────────────────────────────────────

type Tab = 'resumen' | 'region' | 'buscar' | 'deudas'

// ─── Componente principal ─────────────────────────────────────────────────────

interface Props {
  nombreGerente: string
  rol: string
}

export default function DashboardGerente({ nombreGerente, rol }: Props) {
  const supabase = createClient()
  const [tab, setTab] = useState<Tab>('resumen')
  const [kpis, setKpis] = useState<KpisGenerales | null>(null)
  const [operadores, setOperadores] = useState<PanelOperadorRow[]>([])
  const [regiones, setRegiones] = useState<MetricaRegion[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [ultimaActualizacion, setUltimaActualizacion] = useState<Date | null>(null)

  const cargar = useCallback(async () => {
    const [resKpis, resOps, resRegiones] = await Promise.all([
      supabase.rpc('kpis_generales'),
      supabase.rpc('panel_operadores'),
      supabase.from('vista_metricas_region').select('*'),
    ])

    if (resKpis.error) {
      if (resKpis.error.message?.includes('no autorizado')) setError('Sin permiso para ver el dashboard.')
      else setError('Error al cargar métricas.')
      return
    }

    const kpisData = Array.isArray(resKpis.data) ? resKpis.data[0] : resKpis.data
    setKpis(kpisData as KpisGenerales)
    setOperadores((resOps.data as unknown as PanelOperadorRow[]) ?? [])
    setRegiones((resRegiones.data as MetricaRegion[]) ?? [])
    setError(null)
    setUltimaActualizacion(new Date())
  }, [supabase])

  useEffect(() => {
    cargar().finally(() => setCargando(false))
  }, [cargar])

  // Polling cada 30s
  useEffect(() => {
    const timer = setInterval(cargar, 30000)
    return () => clearInterval(timer)
  }, [cargar])

  // Realtime
  useEffect(() => {
    const canal = supabase
      .channel('dashboard-gerente')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'llamadas' }, () => cargar())
      .subscribe()
    return () => { supabase.removeChannel(canal) }
  }, [supabase, cargar])

  const TABS: { id: Tab; label: string }[] = [
    { id: 'resumen', label: 'Resumen' },
    { id: 'region',  label: 'Por región' },
    { id: 'buscar',  label: '🔍 Buscar y corregir' },
    { id: 'deudas',  label: '💳 Deudas' },
  ]

  if (cargando) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: 'var(--color-fondo)' }}>
        <AppHeader nombreUsuario={nombreGerente} rol={rol} />
        <div className="flex items-center justify-center py-24">
          <p className="text-gray-500">Cargando dashboard…</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: 'var(--color-fondo)' }}>
        <AppHeader nombreUsuario={nombreGerente} rol={rol} />
        <div className="max-w-xl mx-auto px-4 py-12">
          <p className="text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-fondo)' }}>
      <AppHeader nombreUsuario={nombreGerente} rol={rol} />

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Encabezado */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--color-marino)' }}>
              Dashboard — Elecciones CODIA
            </h1>
            <p className="text-sm text-gray-400 capitalize">{hoy()}</p>
          </div>
          <div className="flex items-center gap-3">
            {ultimaActualizacion && (
              <p className="text-xs text-gray-400">
                Actualizado: {ultimaActualizacion.toLocaleTimeString('es-DO', { timeZone: ZONA, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </p>
            )}
            <button
              onClick={cargar}
              className="text-sm px-4 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 font-medium transition-colors"
            >
              ↻ Refrescar
            </button>
            <button
              onClick={() => exportarCSV(operadores)}
              className="text-sm px-4 py-2 rounded-lg text-white font-semibold transition-colors"
              style={{ backgroundColor: 'var(--color-exito)' }}
            >
              ↓ Exportar CSV
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
        {tab === 'resumen' && kpis && (
          <TabResumen kpis={kpis} operadores={operadores} />
        )}
        {tab === 'region' && (
          <TabRegion regiones={regiones} />
        )}
        {tab === 'buscar' && (
          <TabBuscar />
        )}
        {tab === 'deudas' && (
          <TabDeudasGerente />
        )}
      </div>
    </div>
  )
}

// ─── Tab Deudas Gerente ───────────────────────────────────────────────────────

function TabDeudasGerente() {
  const supabase = createClient()
  const [lista, setLista] = useState<DeudasVotante[]>([])
  const [cargando, setCargando] = useState(true)
  const [filtroRegional, setFiltroRegional] = useState('')
  const [busqueda, setBusqueda] = useState('')

  useEffect(() => {
    supabase
      .from('deudas_votantes')
      .select('*')
      .order('regional', { ascending: true })
      .order('nombre', { ascending: true })
      .limit(5000)
      .then(({ data }) => {
        setLista((data as DeudasVotante[]) ?? [])
        setCargando(false)
      })
  }, [supabase])

  const regionales = Array.from(new Set(lista.map(d => d.regional).filter(Boolean))).sort() as string[]

  const filtrado = lista.filter(d => {
    if (filtroRegional && d.regional !== filtroRegional) return false
    if (busqueda) {
      const q = busqueda.toLowerCase()
      return (d.nombre?.toLowerCase().includes(q) || String(d.codigo ?? '').toLowerCase().includes(q))
    }
    return true
  })

  const totalMonto = filtrado.reduce((sum, d) => sum + (d.monto ?? 0), 0)

  if (cargando) return <p className="text-gray-500 text-sm py-8 text-center">Cargando deudas…</p>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-sm font-semibold text-gray-700">Deudas / Votantes — {filtrado.length.toLocaleString()} registros</h2>
          {totalMonto > 0 && (
            <p className="text-sm text-red-600 font-bold mt-0.5">Total deuda filtrada: RD$ {totalMonto.toLocaleString()}</p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Buscar nombre o código…"
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm flex-1 min-w-48 focus:outline-none focus:ring-2"
        />
        <select
          value={filtroRegional}
          onChange={e => setFiltroRegional(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
        >
          <option value="">Todas las regionales</option>
          {regionales.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-100">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wide border-b-2 bg-gray-50" style={{ borderBottomColor: 'var(--color-marino)', color: 'var(--color-marino)' }}>
              <th className="text-left px-4 py-3 font-semibold">Nombre</th>
              <th className="text-left px-4 py-3 font-semibold">Código</th>
              <th className="text-left px-4 py-3 font-semibold">Profesión</th>
              <th className="text-left px-4 py-3 font-semibold">Regional</th>
              <th className="text-left px-4 py-3 font-semibold">Núcleo</th>
              <th className="text-left px-4 py-3 font-semibold">Teléfono</th>
              <th className="text-right px-4 py-3 font-semibold">Monto</th>
              <th className="text-left px-4 py-3 font-semibold">Contacto</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 bg-white">
            {filtrado.slice(0, 500).map((d, i) => (
              <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-4 py-2.5 font-medium text-gray-900">{d.nombre}</td>
                <td className="px-4 py-2.5 font-mono text-xs text-gray-500">{d.codigo}</td>
                <td className="px-4 py-2.5 text-gray-600 text-xs">{d.profesion ?? '—'}</td>
                <td className="px-4 py-2.5 text-gray-500 text-xs">{d.regional ?? '—'}</td>
                <td className="px-4 py-2.5 text-gray-500 text-xs">{d.nucleo ?? '—'}</td>
                <td className="px-4 py-2.5 text-gray-600">{d.telefono ?? '—'}</td>
                <td className="px-4 py-2.5 text-right font-semibold text-red-600 tabular-nums">
                  {d.monto != null ? `RD$ ${d.monto.toLocaleString()}` : '—'}
                </td>
                <td className="px-4 py-2.5 text-gray-500 text-xs">{d.contacto ?? '—'}</td>
              </tr>
            ))}
            {filtrado.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">Sin resultados</td></tr>
            )}
          </tbody>
        </table>
        {filtrado.length > 500 && (
          <div className="px-4 py-2 text-center text-xs text-gray-400 border-t">Mostrando 500 de {filtrado.length.toLocaleString()} — afina los filtros</div>
        )}
      </div>
    </div>
  )
}
