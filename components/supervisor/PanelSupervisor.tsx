'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import AppHeader from '@/components/app-header'
import WorkspaceBase from '@/components/workspace/WorkspaceBase'
import type { PanelOperadorRow, RecuperacionRow, DeudasVotante } from '@/lib/types/database'

const ZONA = 'America/Santo_Domingo'

function formatHoraRel(iso: string | null): string {
  if (!iso) return '—'
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (diff < 1) return 'ahora mismo'
  if (diff < 60) return `hace ${diff} min`
  return new Date(iso).toLocaleTimeString('es-DO', { timeZone: ZONA, hour: '2-digit', minute: '2-digit' })
}

// ─── Pestaña Monitoreo ────────────────────────────────────────────────────────

function TabMonitoreo({ onRefresh }: { onRefresh: number }) {
  const supabase = createClient()
  const [filas, setFilas] = useState<PanelOperadorRow[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    setCargando(true)
    setError(null)
    try {
      const { data, error } = await supabase.rpc('panel_operadores')
      if (error) {
        console.error('[TabMonitoreo] RPC error:', error)
        if (error.message?.includes('no autorizado')) setError('Sin permiso para ver el panel.')
        else setError(`Error al cargar panel: ${error.message}`)
        return
      }
      setFilas((data as unknown as PanelOperadorRow[]) ?? [])
    } finally {
      setCargando(false)
    }
  }, [supabase])

  useEffect(() => { cargar() }, [cargar, onRefresh])

  // Suscripción realtime a llamadas
  useEffect(() => {
    const canal = supabase
      .channel('monitoreo-supervisor')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'llamadas' }, () => { cargar() })
      .subscribe()
    return () => { supabase.removeChannel(canal) }
  }, [supabase, cargar])

  if (cargando) return <p className="text-gray-500 text-sm py-8 text-center">Cargando panel…</p>
  if (error) return (
    <div className="py-6 text-center space-y-3">
      <p className="text-red-600 text-sm">{error}</p>
      <button onClick={cargar} className="text-sm px-4 py-1.5 rounded-lg border border-red-300 text-red-600 hover:bg-red-50">
        Reintentar
      </button>
    </div>
  )

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr
            className="text-xs uppercase tracking-wide border-b-2"
            style={{ borderBottomColor: 'var(--color-marino)', color: 'var(--color-marino)' }}
          >
            <th className="text-left py-3 px-2 font-semibold">Operador</th>
            <th className="text-left py-3 px-2 font-semibold">Rol</th>
            <th className="text-center py-3 px-2 font-semibold">Activo</th>
            <th className="text-right py-3 px-2 font-semibold">Llamadas</th>
            <th className="text-right py-3 px-2 font-semibold">Efectivas</th>
            <th className="text-right py-3 px-2 font-semibold">Conf. P1</th>
            <th className="text-right py-3 px-2 font-semibold">No contesta</th>
            <th className="text-left py-3 px-2 font-semibold">Última act.</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {filas.filter(op => op.rol === 'operador').map(op => {
            const sinActividad = !op.ultima_actividad ||
              (Date.now() - new Date(op.ultima_actividad).getTime()) > 30 * 60 * 1000
            return (
              <tr
                key={op.operador_id}
                className={cn('hover:bg-gray-50 transition-colors', sinActividad && 'bg-orange-50/40')}
              >
                <td className="py-3 px-2 font-medium text-gray-900">{op.nombre}</td>
                <td className="py-3 px-2 text-gray-500 capitalize">{op.rol}</td>
                <td className="py-3 px-2 text-center">
                  {(op.colegiado_activo ?? op.miembro_activo)
                    ? <span className="inline-block w-2.5 h-2.5 rounded-full bg-green-500" title="Con colegiado activo" />
                    : <span className="inline-block w-2.5 h-2.5 rounded-full bg-gray-300" title="Sin colegiado activo" />}
                </td>
                <td className="py-3 px-2 text-right font-semibold tabular-nums">{op.llamadas_hoy}</td>
                <td className="py-3 px-2 text-right tabular-nums text-green-700">{op.efectivas_hoy}</td>
                <td className="py-3 px-2 text-right tabular-nums font-bold" style={{ color: 'var(--color-dorado)' }}>
                  {op.confirmados_p1_hoy}
                </td>
                <td className="py-3 px-2 text-right tabular-nums text-red-600">{op.no_contesta_hoy}</td>
                <td className={cn('py-3 px-2 text-xs', sinActividad ? 'text-orange-600 font-semibold' : 'text-gray-400')}>
                  {sinActividad && op.ultima_actividad ? '⚠ ' : ''}{formatHoraRel(op.ultima_actividad)}
                </td>
              </tr>
            )
          })}
          {filas.filter(op => op.rol === 'operador').length === 0 && (
            <tr><td colSpan={8} className="py-8 text-center text-gray-400">Sin operadores activos</td></tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

// ─── Pestaña Recuperación ─────────────────────────────────────────────────────

function TabRecuperacion({ userId }: { userId: string }) {
  const supabase = createClient()
  const [lista, setLista] = useState<RecuperacionRow[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    setCargando(true)
    setError(null)
    try {
      const { data, error } = await supabase.rpc('listar_recuperacion_codia')
      if (error) {
        console.error('[TabRecuperacion] RPC error:', error)
        setError(`Error al cargar recuperación: ${error.message}`)
        return
      }
      setLista((data as unknown as RecuperacionRow[]) ?? [])
    } finally {
      setCargando(false)
    }
  }, [supabase])

  useEffect(() => { cargar() }, [cargar])

  if (cargando) return <p className="text-gray-500 text-sm py-8 text-center">Cargando…</p>
  if (error) return (
    <div className="py-6 text-center space-y-3">
      <p className="text-red-600 text-sm">{error}</p>
      <button onClick={cargar} className="text-sm px-4 py-1.5 rounded-lg border border-red-300 text-red-600 hover:bg-red-50">
        Reintentar
      </button>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <p className="text-sm text-gray-600">
          <span className="font-bold text-gray-900">{lista.length}</span> miembros en no comunicación
        </p>
        <span className="text-xs text-gray-400">(agotaron 3 intentos)</span>
      </div>

      {/* Lista de recuperación */}
      {lista.length === 0 ? (
        <p className="text-center text-gray-400 text-sm py-4">No hay miembros en recuperación</p>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-50 overflow-hidden">
          {lista.slice(0, 20).map(m => (
            <div key={m.id} className="px-4 py-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate text-sm">{m.nombre_completo}</p>
                <p className="text-xs text-gray-400">#{m.codigo}</p>
                <p className="text-sm text-gray-500">{m.telefono ?? m.celular ?? 'Sin teléfono'}</p>
                {(m.regional || m.nucleo) && (
                  <p className="text-xs text-gray-400">
                    {[m.regional, m.nucleo].filter(Boolean).join(' · ')}
                  </p>
                )}
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <span className="text-xs text-gray-400">{m.intentos} intentos</span>
              </div>
            </div>
          ))}
          {lista.length > 20 && (
            <div className="px-4 py-2 text-center text-xs text-gray-400">
              +{lista.length - 20} más en la lista
            </div>
          )}
        </div>
      )}

      {/* Workspace para recuperación */}
      <div className="border-t border-gray-200 pt-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">
          Workspace · Recuperación
        </p>
        <p className="text-sm text-gray-500 mb-3">
          Pulsa &ldquo;Tomar siguiente&rdquo; para cargar un miembro de no comunicación y registrar una nueva llamada.
        </p>
        <WorkspaceBase
          userId={userId}
          modo="recuperacion"
        />
      </div>
    </div>
  )
}

// ─── Pestaña Deudas ───────────────────────────────────────────────────────────

function TabDeudas() {
  const supabase = createClient()
  const [lista, setLista] = useState<DeudasVotante[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filtroRegional, setFiltroRegional] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [nucleosAbiertos, setNucleosAbiertos] = useState<Set<string>>(new Set())

  const cargar = useCallback(async () => {
    setCargando(true)
    setError(null)
    try {
      const { data, error } = await supabase
        .from('deudas_votantes')
        .select('*')
        .order('regional', { ascending: true })
        .order('nucleo', { ascending: true })
        .order('nombre', { ascending: true })
        .limit(2000)
      if (error) { setError(`Error al cargar deudas: ${error.message}`); return }
      setLista((data as DeudasVotante[]) ?? [])
    } finally {
      setCargando(false)
    }
  }, [supabase])

  useEffect(() => { cargar() }, [cargar])

  const regionales = Array.from(new Set(lista.map(d => d.regional).filter(Boolean))).sort() as string[]

  const filtrado = lista.filter(d => {
    if (filtroRegional && d.regional !== filtroRegional) return false
    if (busqueda) {
      const q = busqueda.toLowerCase()
      return (d.nombre?.toLowerCase().includes(q) || d.codigo?.toLowerCase().includes(q) || d.profesion?.toLowerCase().includes(q))
    }
    return true
  })

  // Agrupar por núcleo
  const porNucleo = filtrado.reduce<Record<string, DeudasVotante[]>>((acc, d) => {
    const clave = d.nucleo ?? 'Sin núcleo'
    if (!acc[clave]) acc[clave] = []
    acc[clave].push(d)
    return acc
  }, {})
  const nucleosOrdenados = Object.keys(porNucleo).sort()

  const totalMonto = filtrado.reduce((sum, d) => sum + (d.monto ?? 0), 0)

  function toggleNucleo(nucleo: string) {
    setNucleosAbiertos(prev => {
      const next = new Set(prev)
      if (next.has(nucleo)) next.delete(nucleo)
      else next.add(nucleo)
      return next
    })
  }

  function expandirTodos() { setNucleosAbiertos(new Set(nucleosOrdenados)) }
  function colapsarTodos() { setNucleosAbiertos(new Set()) }

  if (cargando) return <p className="text-gray-500 text-sm py-8 text-center">Cargando deudas…</p>
  if (error) return <p className="text-red-600 text-sm py-6 text-center">{error}</p>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-sm font-semibold text-gray-700">
          Pensionados / Votantes — {filtrado.length.toLocaleString()} registros · {nucleosOrdenados.length} núcleos
          {totalMonto > 0 && <span className="ml-2 text-red-600">Total: RD$ {totalMonto.toLocaleString()}</span>}
        </h2>
        <div className="flex gap-2">
          <button onClick={expandirTodos} className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">
            Expandir todo
          </button>
          <button onClick={colapsarTodos} className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">
            Colapsar todo
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Buscar nombre, código, profesión…"
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm flex-1 min-w-48 focus:outline-none focus:ring-2 focus:ring-blue-300"
        />
        <select
          value={filtroRegional}
          onChange={e => setFiltroRegional(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
        >
          <option value="">Todas las regionales</option>
          {regionales.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>

      {/* Núcleos acordeón */}
      {nucleosOrdenados.length === 0 ? (
        <p className="text-center text-gray-400 text-sm py-6">Sin resultados</p>
      ) : (
        <div className="space-y-2">
          {nucleosOrdenados.map(nucleo => {
            const miembros = porNucleo[nucleo]
            const abierto = nucleosAbiertos.has(nucleo)
            const montoNucleo = miembros.reduce((s, d) => s + (d.monto ?? 0), 0)
            return (
              <div key={nucleo} className="rounded-xl border border-gray-100 overflow-hidden">
                <button
                  onClick={() => toggleNucleo(nucleo)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-gray-400 text-sm shrink-0">{abierto ? '▼' : '▶'}</span>
                    <span className="font-semibold text-gray-800 text-sm truncate">{nucleo}</span>
                    <span className="text-xs text-gray-500 shrink-0">{miembros.length} votante{miembros.length !== 1 ? 's' : ''}</span>
                  </div>
                  {montoNucleo > 0 && (
                    <span className="text-xs font-bold text-red-600 shrink-0 ml-2">
                      RD$ {montoNucleo.toLocaleString()}
                    </span>
                  )}
                </button>
                {abierto && (
                  <div className="divide-y divide-gray-50 bg-white">
                    {miembros.map((d, i) => (
                      <div key={i} className="px-4 py-3 flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-gray-900 text-sm truncate">{d.nombre}</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            #{d.codigo}
                            {d.profesion && <> · {d.profesion}</>}
                            {d.regional && <> · {d.regional}</>}
                          </p>
                          {d.telefono && (
                            <p className="text-xs text-gray-600 mt-0.5">{d.telefono}</p>
                          )}
                          {d.contacto && (
                            <p className="text-xs text-gray-400 mt-0.5">Contacto: {d.contacto}</p>
                          )}
                        </div>
                        {d.monto != null && d.monto > 0 && (
                          <span className="text-sm font-bold text-red-600 tabular-nums shrink-0">
                            RD$ {d.monto.toLocaleString()}
                          </span>
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

// ─── Componente principal PanelSupervisor ─────────────────────────────────────

const TABS = ['Monitoreo', 'Pool general', 'Recuperación', 'Deudas'] as const
type Tab = typeof TABS[number]

interface Props {
  userId: string
  nombreSupervisor: string
}

export default function PanelSupervisor({ userId, nombreSupervisor }: Props) {
  const [tabActivo, setTabActivo] = useState<Tab>('Monitoreo')
  const [refreshMonitoreo, setRefreshMonitoreo] = useState(0)

  // Polling manual de respaldo cada 15s en monitoreo
  useEffect(() => {
    if (tabActivo !== 'Monitoreo') return
    const timer = setInterval(() => setRefreshMonitoreo(n => n + 1), 15000)
    return () => clearInterval(timer)
  }, [tabActivo])

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-fondo)' }}>
      <AppHeader nombreUsuario={nombreSupervisor} rol="Supervisor" />

      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Barra de tabs — estilo subrayado */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6 overflow-x-auto">
          <div className="flex">
            {TABS.map(tab => {
              const activo = tabActivo === tab
              const accentColor = 'var(--color-marino)'
              return (
                <button
                  key={tab}
                  onClick={() => setTabActivo(tab)}
                  className={cn(
                    'flex-1 min-w-max px-5 py-3.5 text-sm font-semibold transition-colors whitespace-nowrap relative border-b-2',
                    activo ? '' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  )}
                  style={activo
                    ? { color: accentColor, borderBottomColor: accentColor }
                    : undefined}
                >
                  {tab === 'Monitoreo'    && '📊 '}
                  {tab === 'Pool general' && '📞 '}
                  {tab === 'Recuperación' && '🔄 '}
                  {tab === 'Deudas'       && '💳 '}
                  {tab}
                </button>
              )
            })}
          </div>
        </div>

        {/* Contenido de la pestaña */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          {tabActivo === 'Monitoreo'    && <TabMonitoreo onRefresh={refreshMonitoreo} />}
          {tabActivo === 'Pool general' && <WorkspaceBase userId={userId} modo="pool" />}
          {tabActivo === 'Recuperación' && <TabRecuperacion userId={userId} />}
          {tabActivo === 'Deudas'       && <TabDeudas />}
        </div>
      </div>
    </div>
  )
}
