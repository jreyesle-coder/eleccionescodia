'use client'

import { useState, useEffect } from 'react'
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
const GEN_COLORS: Record<string, string> = {
  Masculino: MARINO, Femenino: '#C2185B', Indeterminado: '#9ca3af',
}

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
}

const rd = (n: number) => 'RD$ ' + Math.round(n).toLocaleString('es-DO')
const num = (n: number) => (n ?? 0).toLocaleString('es-DO')
const pct = (a: number, b: number) => (b ? ((a / b) * 100).toFixed(1) + '%' : '—')

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

const shorten = (s: string) =>
  s.replace('REGIONAL ', '').replace('DELEGACION PROVINCIAL ', 'DEL. ').replace(/\(.*\)/, '').trim()

export default function DashboardPadron({ nombreUsuario, rol }: Props) {
  const supabase = createClient()
  const [d, setD] = useState<Dashboard | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    supabase.rpc('get_padron_dashboard').then(({ data, error }) => {
      if (error) { setErr(error.message); return }
      setD(data as Dashboard)
    })
  }, [supabase])

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader nombreUsuario={nombreUsuario} rol={rol} />
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="mb-4">
          <h1 className="text-2xl font-extrabold" style={{ color: MARINO }}>Analítica del Padrón</h1>
          <p className="text-sm text-gray-500">
            Vista consolidada del padrón CODIA · deuda vigente excluye inhabilitados.
            {d && <span className="ml-1 text-gray-400">Actualizado {new Date(d.generado).toLocaleString('es-DO')}</span>}
          </p>
        </div>

        {err && <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3">Error: {err}</div>}
        {!d && !err && <div className="text-sm text-gray-500 py-10 text-center">Cargando datos del padrón…</div>}

        {d && (
          <div className="space-y-5">
            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <KPI label="Colegiados (reales)" value={num(d.kpis.reales)} sub={`${num(d.kpis.total)} totales · ${num(d.kpis.inhabilitados)} inhabilitados`} />
              <KPI label="Deuda vigente" value={rd(d.kpis.deuda_total)} sub={`${num(d.kpis.con_deuda)} con deuda`} color={AMBAR} />
              <KPI label="Al día / saldo a favor" value={`${num(d.kpis.al_dia)} / ${num(d.kpis.saldo_favor_n)}`} sub={`saldo a favor ${rd(Math.abs(d.kpis.saldo_favor_monto))}`} color={VERDE} />
              <KPI label="Edad promedio" value={`${d.kpis.edad_prom ?? '—'} años`} sub={`${pct(d.kpis.con_fecha, d.kpis.total)} con fecha`} />
              <KPI label="Deuda 65+ años" value={rd(d.kpis.deuda_65)} sub={`${pct(d.kpis.deuda_65, d.kpis.deuda_total)} del total · ${num(d.kpis.con_deuda_65)} colegiados`} color={AMBAR} />
              <KPI label="65+ NO pensionados" value={num(d.kpis.may65_no_pens)} sub={`${num(d.kpis.pensionados)} pensionados en total`} color={ROJO} />
              <KPI label="Con teléfono" value={num(d.kpis.con_telefono)} sub={pct(d.kpis.con_telefono, d.kpis.total)} />
              <KPI label="Deuda de inhabilitados" value={rd(d.kpis.inhabilitados_deuda)} sub={`${num(d.kpis.inhabilitados)} fallecidos/inhabilitados`} color={ROJO} />
            </div>

            {/* Deuda por regional */}
            <Card title="Deuda vigente por regional / demarcación">
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={d.por_regional.map(r => ({ ...r, nombre: shorten(r.regional) }))} margin={{ left: 10, right: 20, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="nombre" angle={-35} textAnchor="end" interval={0} height={70} tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={(v) => `${(v / 1e6).toFixed(0)}M`} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: any) => rd(v)} />
                  <Bar dataKey="deuda" fill={MARINO} radius={[4, 4, 0, 0]} name="Deuda" />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            <div className="grid md:grid-cols-2 gap-5">
              {/* Núcleo */}
              <Card title="Deuda por núcleo profesional (top 10)">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart layout="vertical" data={d.por_nucleo.slice(0, 10)} margin={{ left: 20, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" tickFormatter={(v) => `${(v / 1e6).toFixed(0)}M`} tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="nucleo" width={140} tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(v: any) => rd(v)} />
                    <Bar dataKey="deuda" fill={DORADO} radius={[0, 4, 4, 0]} name="Deuda" />
                  </BarChart>
                </ResponsiveContainer>
              </Card>

              {/* Edad */}
              <Card title="Distribución por edad">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={d.por_edad}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="rango" tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={(v) => num(v)} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v: any) => num(v)} />
                    <Bar dataKey="colegiados" fill={MARINO} radius={[4, 4, 0, 0]} name="Colegiados" />
                  </BarChart>
                </ResponsiveContainer>
              </Card>

              {/* Género */}
              <Card title="Género (estimado por nombre)">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={d.por_genero} dataKey="colegiados" nameKey="genero" cx="50%" cy="50%" outerRadius={100} label={(e: any) => `${e.genero}: ${num(e.colegiados)}`}>
                      {d.por_genero.map((g) => <Cell key={g.genero} fill={GEN_COLORS[g.genero] || '#9ca3af'} />)}
                    </Pie>
                    <Tooltip formatter={(v: any) => num(v)} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </Card>

              {/* Colegiados por regional */}
              <Card title="Colegiados por regional">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={d.por_regional.map(r => ({ ...r, nombre: shorten(r.regional) }))} margin={{ bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="nombre" angle={-35} textAnchor="end" interval={0} height={70} tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v: any) => num(v)} />
                    <Bar dataKey="colegiados" fill={DORADO} radius={[4, 4, 0, 0]} name="Colegiados" />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </div>

            <p className="text-xs text-gray-400 text-center pt-2">
              El género es estimado a partir del nombre. La edad usa la fecha de nacimiento cruzada con la JCE.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
