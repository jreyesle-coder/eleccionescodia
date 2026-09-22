'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import AppHeader from '@/components/app-header'

const MARINO = '#1F3864'
const DORADO = '#C9A227'
const VERDE = '#15803d'
const ROJO = '#b91c1c'
const AMBAR = '#b45309'
const GEN_COLORS: Record<string, string> = { Masculino: MARINO, Femenino: '#C2185B', Indeterminado: '#9ca3af' }

interface Props { nombreUsuario: string; rol: string }

interface Dashboard {
  generado: string
  kpis: {
    total: number; reales: number; inhabilitados: number; inhabilitados_deuda: number
    con_deuda: number; deuda_total: number; al_dia: number
    saldo_favor_n: number; saldo_favor_monto: number; pensionados: number
    con_telefono: number; con_fecha: number; edad_prom: number
    may65_no_pens: number; deuda_65: number; con_deuda_65: number
  }
  por_regional: { regional: string; colegiados: number; con_deuda: number; deuda: number }[]
  por_nucleo: { nucleo: string; colegiados: number; con_deuda: number; deuda: number }[]
  por_edad: { rango: string; colegiados: number }[]
  por_genero: { genero: string; colegiados: number }[]
  opciones: { regionales: string[]; nucleos: string[] }
}

const rd = (n: number) => 'RD$ ' + Math.round(n).toLocaleString('es-DO')
const num = (n: number) => (n ?? 0).toLocaleString('es-DO')
const pct = (a: number, b: number) => (b ? ((a / b) * 100).toFixed(1) + '%' : '—')

const EDADES: Record<string, [number | null, number | null]> = {
  'Todas': [null, null], '≤29': [null, 29], '30-39': [30, 39], '40-49': [40, 49],
  '50-59': [50, 59], '60-65': [60, 65], '66+': [66, null], '65+': [65, null],
}
const SEGMENTOS: Record<string, string> = {
  vigentes: 'Vigentes (activos)', con_deuda: 'Con deuda', saldo_favor: 'Saldo a favor',
  al_dia: 'Al día', pensionados: 'Pensionados', no_pensionados: 'No pensionados',
  fallecidos: 'Fallecidos / inhabilitados', todos: 'Todos',
}

function KPI({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3">
      <p className="text-[11px] uppercase tracking-wide text-gray-400 font-semibold">{label}</p>
      <p className="text-xl font-extrabold mt-0.5" style={{ color: color || MARINO }}>{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
    </div>
  )
}
function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      <h3 className="text-sm font-bold mb-3" style={{ color: MARINO }}>{title}</h3>
      {children}
    </div>
  )
}
function Sel({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { v: string; t: string }[] }) {
  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-wide text-gray-400 font-semibold">{label}</span>
      <select value={value} onChange={e => onChange(e.target.value)}
        className="mt-1 w-full text-sm border border-gray-200 rounded-lg px-2 py-2 bg-white focus:outline-none focus:ring-2"
        style={{ ['--tw-ring-color' as string]: MARINO }}>
        {options.map(o => <option key={o.v} value={o.v}>{o.t}</option>)}
      </select>
    </label>
  )
}
const shorten = (s: string) => s.replace('REGIONAL ', '').replace('DELEGACION PROVINCIAL ', 'DEL. ').replace(/\(.*\)/, '').trim()

export default function DashboardPadron({ nombreUsuario, rol }: Props) {
  const supabase = createClient()
  const [d, setD] = useState<Dashboard | null>(null)
  const [opciones, setOpciones] = useState<{ regionales: string[]; nucleos: string[] } | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [cargando, setCargando] = useState(false)

  // filtros
  const [regional, setRegional] = useState('')
  const [nucleo, setNucleo] = useState('')
  const [edad, setEdad] = useState('Todas')
  const [segmento, setSegmento] = useState('vigentes')

  const cargar = useCallback(async () => {
    setCargando(true); setErr(null)
    const [emin, emax] = EDADES[edad] ?? [null, null]
    const { data, error } = await supabase.rpc('get_padron_dashboard', {
      p_regional: regional || null, p_nucleo: nucleo || null,
      p_edad_min: emin, p_edad_max: emax, p_segmento: segmento,
    })
    setCargando(false)
    if (error) { setErr(error.message); return }
    const dd = data as Dashboard
    setD(dd)
    if (dd?.opciones && !opciones) setOpciones(dd.opciones)
  }, [supabase, regional, nucleo, edad, segmento, opciones])

  useEffect(() => { cargar() }, [cargar])

  const limpiar = () => { setRegional(''); setNucleo(''); setEdad('Todas'); setSegmento('vigentes') }
  const hayFiltro = regional || nucleo || edad !== 'Todas' || segmento !== 'vigentes'

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader nombreUsuario={nombreUsuario} rol={rol} />
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="mb-4">
          <h1 className="text-2xl font-extrabold" style={{ color: MARINO }}>Analítica del Padrón</h1>
          <p className="text-sm text-gray-500">
            Vista consolidada del padrón CODIA.
            {d && <span className="ml-1 text-gray-400">Actualizado {new Date(d.generado).toLocaleString('es-DO')}</span>}
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-5">
          {/* Contenido */}
          <div className="flex-1 min-w-0 space-y-5 order-2 lg:order-1">
            {err && <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3">Error: {err}</div>}
            {!d && !err && <div className="text-sm text-gray-500 py-10 text-center">Cargando datos del padrón…</div>}

            {d && (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <KPI label="Colegiados (selección)" value={num(d.kpis.total)} sub={`${num(d.kpis.reales)} activos · ${num(d.kpis.inhabilitados)} inhabilitados`} />
                  <KPI label="Deuda" value={rd(d.kpis.deuda_total)} sub={`${num(d.kpis.con_deuda)} con deuda`} color={AMBAR} />
                  <KPI label="Al día / saldo a favor" value={`${num(d.kpis.al_dia)} / ${num(d.kpis.saldo_favor_n)}`} sub={`saldo a favor ${rd(Math.abs(d.kpis.saldo_favor_monto))}`} color={VERDE} />
                  <KPI label="Edad promedio" value={`${d.kpis.edad_prom ?? '—'} años`} sub={`${pct(d.kpis.con_fecha, d.kpis.total)} con fecha`} />
                  <KPI label="Deuda 65+ años" value={rd(d.kpis.deuda_65)} sub={`${num(d.kpis.con_deuda_65)} colegiados`} color={AMBAR} />
                  <KPI label="65+ NO pensionados" value={num(d.kpis.may65_no_pens)} sub={`${num(d.kpis.pensionados)} pensionados`} color={ROJO} />
                  <KPI label="Con teléfono" value={num(d.kpis.con_telefono)} sub={pct(d.kpis.con_telefono, d.kpis.total)} />
                  <KPI label="Deuda inhabilitados" value={rd(d.kpis.inhabilitados_deuda)} sub={`${num(d.kpis.inhabilitados)} fallecidos/inhab.`} color={ROJO} />
                </div>

                <Card title="Deuda por regional / demarcación">
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={d.por_regional.map(r => ({ ...r, nombre: shorten(r.regional) }))} margin={{ left: 10, right: 20, bottom: 60 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="nombre" angle={-35} textAnchor="end" interval={0} height={70} tick={{ fontSize: 11 }} />
                      <YAxis tickFormatter={(v) => `${(v / 1e6).toFixed(0)}M`} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v: unknown) => rd(Number(v))} />
                      <Bar dataKey="deuda" fill={MARINO} radius={[4, 4, 0, 0]} name="Deuda" />
                    </BarChart>
                  </ResponsiveContainer>
                </Card>

                <div className="grid md:grid-cols-2 gap-5">
                  <Card title="Deuda por núcleo profesional (top 10)">
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart layout="vertical" data={d.por_nucleo.slice(0, 10)} margin={{ left: 20, right: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" tickFormatter={(v) => `${(v / 1e6).toFixed(0)}M`} tick={{ fontSize: 11 }} />
                        <YAxis type="category" dataKey="nucleo" width={140} tick={{ fontSize: 10 }} />
                        <Tooltip formatter={(v: unknown) => rd(Number(v))} />
                        <Bar dataKey="deuda" fill={DORADO} radius={[0, 4, 4, 0]} name="Deuda" />
                      </BarChart>
                    </ResponsiveContainer>
                  </Card>

                  <Card title="Distribución por edad">
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={d.por_edad}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="rango" tick={{ fontSize: 11 }} />
                        <YAxis tickFormatter={(v) => num(v)} tick={{ fontSize: 11 }} />
                        <Tooltip formatter={(v: unknown) => num(Number(v))} />
                        <Bar dataKey="colegiados" fill={MARINO} radius={[4, 4, 0, 0]} name="Colegiados" />
                      </BarChart>
                    </ResponsiveContainer>
                  </Card>

                  <Card title="Género (estimado por nombre)">
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie data={d.por_genero} dataKey="colegiados" nameKey="genero" cx="50%" cy="50%" outerRadius={100}
                          label={(e) => { const g = e as unknown as { genero: string; colegiados: number }; return `${g.genero}: ${num(g.colegiados)}` }}>
                          {d.por_genero.map((g) => <Cell key={g.genero} fill={GEN_COLORS[g.genero] || '#9ca3af'} />)}
                        </Pie>
                        <Tooltip formatter={(v: unknown) => num(Number(v))} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </Card>

                  <Card title="Colegiados por regional">
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={d.por_regional.map(r => ({ ...r, nombre: shorten(r.regional) }))} margin={{ bottom: 60 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="nombre" angle={-35} textAnchor="end" interval={0} height={70} tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip formatter={(v: unknown) => num(Number(v))} />
                        <Bar dataKey="colegiados" fill={DORADO} radius={[4, 4, 0, 0]} name="Colegiados" />
                      </BarChart>
                    </ResponsiveContainer>
                  </Card>
                </div>

                <p className="text-xs text-gray-400 text-center pt-2">
                  El género es estimado a partir del nombre. La edad usa la fecha de nacimiento cruzada con la JCE.
                </p>
              </>
            )}
          </div>

          {/* Panel de filtros */}
          <aside className="w-full lg:w-64 shrink-0 order-1 lg:order-2">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 lg:sticky lg:top-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold" style={{ color: MARINO }}>Filtros</h3>
                {cargando && <span className="text-[11px] text-gray-400">actualizando…</span>}
              </div>

              <Sel label="Segmento" value={segmento} onChange={setSegmento}
                options={Object.entries(SEGMENTOS).map(([v, t]) => ({ v, t }))} />
              <Sel label="Demarcación (regional)" value={regional} onChange={setRegional}
                options={[{ v: '', t: 'Todas' }, ...(opciones?.regionales ?? []).map(r => ({ v: r, t: shorten(r) }))]} />
              <Sel label="Núcleo profesional" value={nucleo} onChange={setNucleo}
                options={[{ v: '', t: 'Todos' }, ...(opciones?.nucleos ?? []).map(n => ({ v: n, t: n }))]} />
              <Sel label="Rango de edad" value={edad} onChange={setEdad}
                options={Object.keys(EDADES).map(k => ({ v: k, t: k }))} />

              <button onClick={limpiar} disabled={!hayFiltro}
                className="w-full mt-1 py-2 rounded-lg text-sm font-semibold border transition-colors disabled:opacity-40"
                style={{ borderColor: MARINO, color: MARINO }}>
                Limpiar filtros
              </button>

              {d && (
                <div className="pt-2 border-t border-gray-100 text-xs text-gray-500">
                  <p className="font-semibold text-gray-700">{num(d.kpis.total)} colegiados</p>
                  <p>en la selección actual</p>
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
