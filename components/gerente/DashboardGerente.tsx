'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  ResponsiveContainer,
  PieChart, Pie, Cell, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts'
import AppHeader from '@/components/app-header'
import type { KpisGenerales, PanelOperadorRow, MetricaRegion, PadronVivoRow, EstadoGestion } from '@/lib/types/database'

// ─── Constantes ───────────────────────────────────────────────────────────────

const ZONA = 'America/Santo_Domingo'

const COLORES_ESTADO: Record<string, string> = {
  pendiente:       '#94a3b8',
  en_proceso:      '#15407F',
  contactado:      '#1F9D55',
  no_comunicacion: '#C81E2C',
  cerrado:         '#0A2A5E',
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

  const progMontero = kpis.montero_total > 0
    ? Math.round((kpis.montero_contactados / kpis.montero_total) * 100)
    : 0

  return (
    <div className="space-y-8">
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <KpiCard titulo="Total miembros"   valor={kpis.total_miembros}  color="var(--color-marino)" />
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
                <Bar dataKey="Conf. P1"   fill="#E7B228"  radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-400 text-sm text-center py-16">Sin llamadas registradas hoy</p>
          )}
        </div>
      </div>

      {/* Resumen de operadores */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">Resumen de operadores</h2>
          <span className="text-xs text-gray-400">{operadores.length} operadores</span>
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
                <tr key={op.operador_id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900">{op.nombre}</td>
                  <td className="px-4 py-3 text-gray-500 capitalize">{op.rol}</td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums">{op.llamadas_hoy}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-green-700">{op.efectivas_hoy}</td>
                  <td className="px-4 py-3 text-right tabular-nums font-bold" style={{ color: 'var(--color-dorado)' }}>
                    {op.confirmados_p1_hoy}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-red-600">{op.no_contesta_hoy}</td>
                  <td className="px-4 py-3 text-xs text-gray-400">
                    {op.ultima_actividad
                      ? new Date(op.ultima_actividad).toLocaleTimeString('es-DO', {
                          timeZone: ZONA, hour: '2-digit', minute: '2-digit',
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

      {/* Segmento Montero */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-sm font-semibold text-gray-700">
            ★ Segmento Montero
            <span className="ml-2 text-xs font-normal text-gray-400">(supervisado directamente)</span>
          </h2>
          <span
            className="text-sm font-bold px-3 py-1 rounded-full"
            style={{ backgroundColor: 'var(--color-dorado)', color: '#0F1B33' }}
          >
            {kpis.montero_contactados} / {kpis.montero_total}
          </span>
        </div>
        <div className="bg-gray-100 rounded-full h-3 overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${progMontero}%`, backgroundColor: 'var(--color-dorado)' }}
          />
        </div>
        <p className="text-sm text-gray-500">
          <strong>{kpis.montero_contactados}</strong> contactados de{' '}
          <strong>{kpis.montero_total}</strong> en el padrón Montero — {progMontero}% completado
        </p>
      </div>
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
  if (region !== 'Norte') return filas
  return [...filas].sort((a, b) => {
    const aEsSantiago = a.distrito.toLowerCase().includes('santiago')
    const bEsSantiago = b.distrito.toLowerCase().includes('santiago')
    if (aEsSantiago && !bEsSantiago) return -1
    if (!aEsSantiago && bEsSantiago) return 1
    return a.distrito.localeCompare(b.distrito, 'es') || a.nombre.localeCompare(b.nombre, 'es')
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
              <th className="text-left px-4 py-3 font-semibold">Distrito</th>
              <th className="text-left px-4 py-3 font-semibold">Matrícula</th>
              <th className="text-left px-4 py-3 font-semibold">Nombre</th>
              <th className="text-left px-4 py-3 font-semibold">Teléfono</th>
              <th className="text-left px-4 py-3 font-semibold">Estado</th>
              <th className="text-left px-4 py-3 font-semibold">Asignado a</th>
              <th className="text-left px-4 py-3 font-semibold">Último resultado</th>
              <th className="text-center px-4 py-3 font-semibold">Conf. P1</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filas.map(m => (
              <tr key={m.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-4 py-2.5 text-gray-500 text-xs">{m.distrito}</td>
                <td className="px-4 py-2.5 font-mono text-xs text-gray-500">{m.matricula}</td>
                <td className="px-4 py-2.5 font-medium text-gray-900">{m.nombre}</td>
                <td className="px-4 py-2.5 text-gray-500">{m.telefono ?? '—'}</td>
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
                <td colSpan={8} className="px-4 py-8 text-center text-gray-400">Sin registros</td>
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
    const { data } = await supabase
      .from('vista_padron_vivo')
      .select('*')
      .eq('region', region)
      .order('nombre')
      .limit(5000)
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
  const cabecera = ['Operador','Rol','Miembro activo','Llamadas hoy','Efectivas hoy','Conf. P1 hoy','No contesta hoy','Última actividad']
  const filasCsv = filas.map(op => [
    op.nombre,
    op.rol,
    op.miembro_activo ? 'Sí' : 'No',
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

// ─── Tipos de tab ─────────────────────────────────────────────────────────────

type Tab = 'resumen' | 'region'

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
      </div>
    </div>
  )
}
