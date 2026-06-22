'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import AppHeader from '@/components/app-header'

const ZONA = 'America/Santo_Domingo'

function fmt(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleString('es-DO', {
    timeZone: ZONA, day: '2-digit', month: '2-digit',
    year: '2-digit', hour: '2-digit', minute: '2-digit',
  })
}

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface NucleoCarreraRow {
  nucleo: string
  carrera_nombre: string
  total: number
  confirmados: number
  confirmados_callcenter: number
  confirmados_verificate: number
  confirmados_dirigente: number
}

interface NucleoAgrupado {
  nucleo: string
  totalNucleo: number
  totalConfirmados: number
  profesiones: {
    nombre: string
    total: number
    confirmados: number
    confirmados_callcenter: number
    confirmados_verificate: number
    confirmados_dirigente: number
  }[]
}

interface ConfirmadoNucleoRow {
  codigo: string
  nombre_completo: string
  nucleo: string | null
  carrera: string | null
  via_callcenter: boolean
  via_verificate: boolean
  via_dirigente: boolean
  confirmado_por: string | null
  confirmacion_intencion: string | null
}

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
  confirmado_por: string | null
  confirmacion_intencion: string | null
  confirmacion_at: string | null
}

// ─── Helpers UI ───────────────────────────────────────────────────────────────

const INTENCION_LABEL: Record<string, string> = {
  favorable: '✓ Favorable',
  indeciso:  '~ Indeciso',
  en_contra: '✗ En contra',
}
const INTENCION_COLOR: Record<string, string> = {
  favorable: 'bg-green-100 text-green-800',
  indeciso:  'bg-yellow-100 text-yellow-800',
  en_contra: 'bg-red-100 text-red-700',
}
const INTENCION_ACTIVE: Record<string, string> = {
  favorable: 'bg-green-600 text-white border-green-600',
  indeciso:  'bg-yellow-500 text-white border-yellow-500',
  en_contra: 'bg-red-500 text-white border-red-500',
}
const INTENCION_BORDER: Record<string, string> = {
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

// ─── Tab: Vista por Núcleo ────────────────────────────────────────────────────

function TabMiNucleo() {
  const supabase = createClient()
  const [datos, setDatos]             = useState<NucleoAgrupado[]>([])
  const [totalGlobalReal, setTG]      = useState<number | null>(null)
  const [cargando, setCargando]       = useState(true)
  const [error, setError]             = useState<string | null>(null)
  const [abiertos, setAbiertos]       = useState<Set<string>>(new Set())
  const [drilldown, setDrilldown]     = useState<{ nucleo: string; carrera: string | null } | null>(null)
  const [detalle, setDetalle]         = useState<ConfirmadoNucleoRow[]>([])
  const [cargandoDrill, setCDrill]    = useState(false)

  useEffect(() => {
    Promise.all([
      supabase.rpc('stats_mi_nucleo'),
      supabase.rpc('confirmados_total_global'),
    ]).then(([{ data, error: err }, { data: totalData }]) => {
      setTG(Number(totalData ?? 0))
      if (err) { setError('No se pudo cargar la vista por núcleo.'); setCargando(false); return }
      const filas = (data as NucleoCarreraRow[]) ?? []

      const mapa = new Map<string, NucleoAgrupado>()
      for (const f of filas) {
        const n = mapa.get(f.nucleo) ?? { nucleo: f.nucleo, totalNucleo: 0, totalConfirmados: 0, profesiones: [] }
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

      setDatos(Array.from(mapa.values()).map(n => ({
        ...n, profesiones: n.profesiones.sort((a, b) => b.total - a.total),
      })))
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
    setCDrill(true)
    const { data } = await supabase.rpc('listar_confirmados_nucleo', { p_nucleo: nucleo, p_carrera: carrera })
    setDetalle((data as ConfirmadoNucleoRow[]) ?? [])
    setCDrill(false)
  }

  if (cargando) return <p className="text-center text-gray-400 py-12">Cargando núcleo…</p>
  if (error)    return <p className="text-center text-red-500 py-12">{error}</p>

  const totalGlobal    = datos.reduce((s, n) => s + n.totalNucleo, 0)
  const totalConfGlobal = totalGlobalReal ?? datos.reduce((s, n) => s + n.totalConfirmados, 0)

  return (
    <div className="space-y-4">
      {/* Resumen */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4 flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-sm font-semibold text-gray-700">Mi Núcleo</p>
          <p className="text-xs text-gray-400">{datos.length > 0 ? datos[0].nucleo : '—'} · {totalGlobal.toLocaleString()} colegiados</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-400">Total confirmados</p>
          <p className="text-lg font-bold" style={{ color: 'var(--color-dorado)' }}>
            {totalConfGlobal.toLocaleString()}
            <span className="text-xs font-normal text-gray-400 ml-1">
              ({totalGlobal > 0 ? Math.round(totalConfGlobal / totalGlobal * 100) : 0}%)
            </span>
          </p>
        </div>
      </div>

      {/* Acordeón */}
      <div className="space-y-2">
        {datos.map(({ nucleo, totalNucleo, totalConfirmados, profesiones }) => {
          const abierto = abiertos.has(nucleo)
          const pct = totalNucleo > 0 ? Math.round(totalConfirmados / totalNucleo * 100) : 0
          return (
            <div key={nucleo} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <button
                onClick={() => toggleNucleo(nucleo)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-blue-50/40 transition-colors text-left"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <span className="text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full shrink-0"
                    style={{ color: 'var(--color-marino)', transform: abierto ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}>
                    ›
                  </span>
                  <span className="font-semibold text-gray-900">{nucleo}</span>
                  <span className="text-xs text-gray-400">{profesiones.length} profesión{profesiones.length !== 1 ? 'es' : ''}</span>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  {totalConfirmados > 0 && (
                    <div className="text-right">
                      <p className="text-xs text-gray-400">Confirmados</p>
                      <p className="text-sm font-bold text-green-700">
                        {totalConfirmados.toLocaleString()}
                        <span className="text-xs font-normal text-gray-400 ml-1">({pct}%)</span>
                      </p>
                    </div>
                  )}
                  <span className="text-lg font-bold tabular-nums" style={{ color: 'var(--color-marino)' }}>
                    {totalNucleo.toLocaleString()}
                    <span className="text-xs font-normal text-gray-400 ml-1">colegiados</span>
                  </span>
                </div>
              </button>

              {abierto && (
                <div className="border-t border-gray-100 divide-y divide-gray-50">
                  {totalConfirmados > 0 && (
                    <div className="px-8 py-2 bg-green-50/50">
                      <button onClick={() => abrirDrilldown(nucleo, null)}
                        className="text-xs font-semibold text-green-700 hover:underline">
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
                            <button onClick={() => abrirDrilldown(nucleo, p.nombre)}
                              className="text-xs font-semibold text-green-700 hover:underline">
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
                          <div className="h-full rounded-full"
                            style={{ width: totalNucleo > 0 ? `${(p.total / totalNucleo) * 100}%` : '0%', backgroundColor: 'var(--color-real)' }} />
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
        {datos.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-10 text-center">
            <p className="text-gray-400 text-sm">No se encontraron datos para este núcleo.</p>
          </div>
        )}
      </div>

      {/* Modal drilldown */}
      {drilldown && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(14,28,66,0.5)' }}
          onClick={() => setDrilldown(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
            onClick={e => e.stopPropagation()}>
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
                            {d.via_callcenter && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700">📞 Call center</span>}
                            {d.via_verificate && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-green-100 text-green-700">🌐 Verifícate</span>}
                            {d.via_dirigente  && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700">👤 {d.confirmado_por ?? 'Dirigente'}</span>}
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

// ─── Tab: Padrón en vivo ──────────────────────────────────────────────────────

interface DeudaAPI { encontrado: boolean; monto: number }

function TabPadronActivo({ nombreUsuario, nucleoGerente }: { nombreUsuario: string; nucleoGerente: string | null }) {
  const supabase = createClient()

  const [padron, setPadron]                         = useState<MiembroPadronActivo[]>([])
  const [cargando, setCargando]                     = useState(false)
  const [busqueda, setBusqueda]                     = useState('')
  const [filtroRegional, setFiltroRegional]         = useState('')
  const [filtroNucleo, setFiltroNucleo]             = useState(nucleoGerente ?? '')
  const [todasRegionales, setTodasRegionales]       = useState<string[]>([])
  const [todosNucleos, setTodosNucleos]             = useState<string[]>([])

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
      setTodosNucleos(rows.filter(r => r.tipo === 'nucleo').map(r => r.valor).sort())
    })
  }, [supabase])

  useEffect(() => {
    const q = busqueda.trim()
    setCargando(true)
    supabase.rpc('buscar_padron_presidente', {
      p_regional: filtroRegional || null,
      p_nucleo:   filtroNucleo   || null,
      p_q:        q.length >= 3 ? q : null,
    }).then(({ data }) => {
      setPadron((data as MiembroPadronActivo[]) ?? [])
      setCargando(false)
    })
  }, [supabase, filtroRegional, filtroNucleo, busqueda])

  async function abrirDetalle(m: MiembroPadronActivo) {
    setDetalle(m)
    setDetalleDeuda(null)
    setDetalleIntencion(null)
    setDetalleError(null)
    if (m.cedula) {
      setCargandoDeuda(true)
      try {
        const res  = await fetch('/api/consulta-deuda', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cedula: m.cedula, codigo: m.codigo }),
        })
        const data = await res.json() as DeudaAPI
        setDetalleDeuda(data)
        if (data.encontrado && data.monto > 0) {
          await supabase.rpc('actualizar_deuda', { p_codigo: m.codigo, p_monto_nuevo: data.monto })
          setPadron(prev => prev.map(x => x.codigo === m.codigo ? { ...x, monto_deuda: data.monto, tiene_deuda: true } : x))
        }
      } catch { /* no interrumpir */ } finally { setCargandoDeuda(false) }
    }
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
    const codigo   = detalle.codigo
    const intencion = detalleIntencion
    setPadron(prev => prev.map(x =>
      x.codigo === codigo ? { ...x, confirmado_por: nombreUsuario, confirmacion_intencion: intencion } : x
    ))
    setDetalle(prev => prev ? { ...prev, confirmado_por: nombreUsuario, confirmacion_intencion: intencion } : prev)
    setDetalleIntencion(null)
  }

  const filtrado = padron

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4 flex flex-wrap gap-3">
        <input
          type="text" value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre o colegiatura…"
          className="flex-1 min-w-[200px] text-sm px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-200"
        />
        <select value={filtroRegional}
          onChange={e => { setFiltroRegional(e.target.value) }}
          className="text-sm px-4 py-2.5 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-200"
        >
          <option value="">Todas las regionales</option>
          {todasRegionales.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <select value={filtroNucleo} onChange={e => setFiltroNucleo(e.target.value)}
          className="text-sm px-4 py-2.5 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-200"
        >
          <option value="">Todos los núcleos</option>
          {todosNucleos.map(n => <option key={n} value={n}>{n}</option>)}
        </select>
        {(busqueda || filtroRegional || filtroNucleo !== (nucleoGerente ?? '')) && (
          <button onClick={() => { setBusqueda(''); setFiltroRegional(''); setFiltroNucleo(nucleoGerente ?? '') }}
            className="text-sm text-blue-600 hover:underline px-2">Limpiar</button>
        )}
        <p className="w-full text-xs text-gray-400">
          {filtrado.length.toLocaleString()} colegiados{!filtroRegional && !filtroNucleo && !busqueda.trim() ? ' (primeros 2,000 — filtra para ver más)' : ''}
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
              className="w-full text-left px-5 py-3.5 flex items-center justify-between gap-3 hover:bg-gray-50 active:bg-gray-100 transition-colors">
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
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${INTENCION_COLOR[m.confirmacion_intencion]}`}>
                    {INTENCION_LABEL[m.confirmacion_intencion]}
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

      {/* Panel de detalle */}
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

                <div className="bg-white px-6 py-4 space-y-3">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Datos personales</p>
                  <div className="space-y-2">
                    {detalle.cedula   && <FilaDato label="Cédula"   valor={detalle.cedula} />}
                    {detalle.celular  && <FilaDato label="Celular"  valor={detalle.celular} />}
                    {detalle.telefono && <FilaDato label="Teléfono" valor={detalle.telefono} />}
                  </div>
                </div>

                <div className="bg-gray-50 px-6 py-4 space-y-3 border-t border-gray-100">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Datos CODIA</p>
                  <div className="space-y-2">
                    {detalle.carrera         && <FilaDato label="Profesión"          valor={detalle.carrera} />}
                    {detalle.nucleo          && <FilaDato label="Núcleo"             valor={detalle.nucleo} />}
                    {detalle.regional        && <FilaDato label="Regional"           valor={detalle.regional} />}
                    {detalle.provincia       && <FilaDato label="Provincia"          valor={detalle.provincia} />}
                    {detalle.centro_votacion && <FilaDato label="Centro de votación" valor={detalle.centro_votacion} />}
                  </div>
                </div>

                {/* Deuda */}
                <div className="bg-white px-6 py-4 border-t border-gray-100 space-y-2">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Estado de deuda</p>
                  {!detalle.cedula ? (
                    <p className="text-sm text-gray-400">Sin cédula registrada.</p>
                  ) : cargandoDeuda ? (
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
                <div className={`rounded-2xl px-6 py-5 text-center space-y-1 ${detalle.confirmacion_intencion ? INTENCION_COLOR[detalle.confirmacion_intencion] : 'bg-gray-100 text-gray-600'}`}>
                  <p className="font-bold text-base">
                    {detalle.confirmacion_intencion ? INTENCION_LABEL[detalle.confirmacion_intencion] : '✓ Confirmado'}
                  </p>
                  <p className="text-sm opacity-80">Por: {detalle.confirmado_por}</p>
                  {detalle.confirmacion_at && <p className="text-xs opacity-60">{fmt(detalle.confirmacion_at)}</p>}
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-5 space-y-4">
                  <p className="text-sm font-bold text-gray-700">¿Cuál es la intención de este colegiado?</p>
                  <div className="space-y-2">
                    {(['favorable', 'indeciso', 'en_contra'] as const).map(val => (
                      <button key={val} onClick={() => setDetalleIntencion(val)}
                        className={`w-full py-3.5 rounded-xl font-semibold text-sm border-2 transition-all ${detalleIntencion === val ? INTENCION_ACTIVE[val] : INTENCION_BORDER[val] + ' hover:opacity-80'}`}>
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
                    style={{ backgroundColor: 'var(--color-marino)' }}>
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

// ─── Tab: Confirmados (solo mi CDN) ──────────────────────────────────────────

function ModalConfirmadosMiCDN({
  titulo,
  nucleo,
  onCerrar,
}: {
  titulo: string
  nucleo: string
  onCerrar: () => void
}) {
  const supabase = createClient()
  const [lista, setLista]       = useState<ConfirmadoNucleoRow[]>([])
  const [cargando, setCargando] = useState(true)
  const [buscar, setBuscar]     = useState('')

  useEffect(() => {
    let activo = true
    supabase.rpc('listar_confirmados_nucleo', { p_nucleo: nucleo, p_carrera: null }).then(({ data }) => {
      if (activo) { setLista((data as ConfirmadoNucleoRow[]) ?? []); setCargando(false) }
    })
    return () => { activo = false }
  }, [nucleo]) // eslint-disable-line react-hooks/exhaustive-deps

  const filtrada = lista.filter(r => {
    const q = buscar.toLowerCase()
    return !q || r.nombre_completo.toLowerCase().includes(q) || r.codigo.includes(q)
  })

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(14,28,66,0.5)' }}
      onClick={onCerrar}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 flex items-start justify-between" style={{ backgroundColor: 'var(--color-marino)', color: 'white' }}>
          <div>
            <p className="font-bold text-base">{titulo}</p>
            {!cargando && <p className="text-blue-200 text-sm">{lista.length} persona{lista.length !== 1 ? 's' : ''} · {nucleo}</p>}
          </div>
          <button onClick={onCerrar} className="text-blue-200 hover:text-white text-xl font-bold ml-4">✕</button>
        </div>
        <div className="px-4 py-3 border-b border-gray-100">
          <input type="text" placeholder="Buscar por nombre o colegiatura…" value={buscar}
            onChange={e => setBuscar(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
        </div>
        <div className="flex-1 overflow-y-auto">
          {cargando ? (
            <p className="text-center text-gray-400 py-10">Cargando…</p>
          ) : filtrada.length === 0 ? (
            <p className="text-center text-gray-400 py-10">{buscar ? 'Sin resultados.' : 'Sin confirmados en este CDN.'}</p>
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
                      {r.nucleo && <p className="text-xs text-gray-400">{r.nucleo}{r.carrera ? ` · ${r.carrera}` : ''}</p>}
                    </td>
                    <td className="px-5 py-2.5 text-gray-500 hidden sm:table-cell">{r.codigo}</td>
                    <td className="px-5 py-2.5">
                      <div className="flex flex-wrap gap-1">
                        {r.via_verificate && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-green-100 text-green-700">🌐 Verifícate</span>}
                        {r.via_callcenter && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700">📞 Call center</span>}
                        {r.via_dirigente  && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700">👤 {r.confirmado_por ?? 'Dirigente'}</span>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="px-6 py-3 border-t border-gray-100 text-xs text-gray-400">
          {!cargando && `${filtrada.length} de ${lista.length} confirmados en ${nucleo}`}
        </div>
      </div>
    </div>
  )
}

function TabConfirmados({ nucleoGerente }: { nucleoGerente: string | null }) {
  const supabase = createClient()
  const [filas, setFilas]       = useState<NucleoCarreraRow[]>([])
  const [cargando, setCargando] = useState(true)
  const [modalAbierto, setModalAbierto] = useState(false)

  useEffect(() => {
    supabase.rpc('stats_mi_nucleo').then(({ data }) => {
      setFilas((data as NucleoCarreraRow[]) ?? [])
      setCargando(false)
    })
  }, [supabase]) // eslint-disable-line react-hooks/exhaustive-deps

  const totalDirigentes = filas.reduce((s, f) => s + Number(f.confirmados_dirigente), 0)
  const totalVerif      = filas.reduce((s, f) => s + Number(f.confirmados_verificate), 0)
  const totalCC         = filas.reduce((s, f) => s + Number(f.confirmados_callcenter), 0)
  const totalFavorables = filas.reduce((s, f) => s + Number(f.confirmados), 0)

  if (cargando) return <p className="text-center text-gray-400 py-10">Cargando…</p>

  const tarjetas: { titulo: string; valor: number; color: string }[] = [
    { titulo: 'Vía dirigentes', valor: totalDirigentes, color: 'var(--color-marino)' },
    { titulo: 'Vía Verifícate', valor: totalVerif,      color: '#16a34a'             },
    { titulo: 'Vía Call Center', valor: totalCC,        color: '#2563eb'             },
    { titulo: 'Total confirmados', valor: totalFavorables, color: '#ca8a04'          },
  ]

  return (
    <div className="space-y-5">
      {nucleoGerente && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-800">
          Mostrando confirmados de tu CDN: <span className="font-bold">{nucleoGerente}</span>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {tarjetas.map(({ titulo, valor, color }) => (
          <div key={titulo}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 border-t-4"
            style={{ borderTopColor: color }}>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{titulo}</p>
            <p className="text-3xl font-black mt-1 tabular-nums" style={{ color }}>{valor.toLocaleString()}</p>
          </div>
        ))}
      </div>

      {nucleoGerente && totalFavorables > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4">
          <button
            onClick={() => setModalAbierto(true)}
            className="text-sm font-semibold text-green-700 hover:underline"
          >
            ★ Ver los {totalFavorables} confirmados de {nucleoGerente} →
          </button>
        </div>
      )}

      {modalAbierto && nucleoGerente && (
        <ModalConfirmadosMiCDN
          titulo="Confirmados de mi CDN"
          nucleo={nucleoGerente}
          onCerrar={() => setModalAbierto(false)}
        />
      )}
    </div>
  )
}

// ─── Tab: Monitoreo de Operadores (solo gerente sin núcleo asignado) ──────────

interface OperadorRow {
  operador_id: string
  nombre: string
  rol: string
  colegiado_activo: boolean
  miembro_activo: boolean
  llamadas_total: number
  efectivas_total: number
  confirmados_p1_total: number
  no_contesta_total: number
  llamadas_hoy: number
  efectivas_hoy: number
  confirmados_p1_hoy: number
  no_contesta_hoy: number
  ultima_actividad: string | null
}

function TabMonitoreoOperadores() {
  const supabase = createClient()
  const [filas, setFilas]       = useState<OperadorRow[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError]       = useState<string | null>(null)
  const [tick, setTick]         = useState(0)

  const cargar = useCallback(async () => {
    setCargando(true); setError(null)
    const { data, error } = await supabase.rpc('panel_operadores')
    if (error) { setError(`Error: ${error.message}`); setCargando(false); return }
    setFilas((data as unknown as OperadorRow[]) ?? [])
    setCargando(false)
  }, [supabase])

  useEffect(() => { cargar() }, [cargar, tick])

  useEffect(() => {
    const canal = supabase
      .channel('gerente-monitoreo')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'llamadas' }, () => cargar())
      .subscribe()
    return () => { supabase.removeChannel(canal) }
  }, [supabase, cargar])

  if (cargando) return <p className="text-gray-500 text-sm py-8 text-center">Cargando panel…</p>
  if (error) return (
    <div className="py-6 text-center space-y-3">
      <p className="text-red-600 text-sm">{error}</p>
      <button onClick={() => setTick(t => t + 1)} className="text-sm px-4 py-1.5 rounded-lg border border-red-300 text-red-600 hover:bg-red-50">Reintentar</button>
    </div>
  )

  const activos = filas.filter(op => op.colegiado_activo || op.miembro_activo).length

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          <span className="font-semibold text-gray-700">{filas.length}</span> operadores ·{' '}
          <span className="font-semibold text-green-700">{activos}</span> activos ahora
        </p>
        <button onClick={() => setTick(t => t + 1)} className="text-xs text-blue-600 hover:underline">↻ Actualizar</button>
      </div>
      <div className="overflow-x-auto bg-white rounded-2xl border border-gray-100 shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wide border-b-2" style={{ borderBottomColor: 'var(--color-marino)', color: 'var(--color-marino)' }}>
              <th className="text-left py-3 px-3 font-semibold">Operador</th>
              <th className="text-center py-3 px-3 font-semibold">Activo</th>
              <th className="text-right py-3 px-3 font-semibold">Llamadas hoy</th>
              <th className="text-right py-3 px-3 font-semibold">Efectivas</th>
              <th className="text-right py-3 px-3 font-semibold">Conf. P1</th>
              <th className="text-right py-3 px-3 font-semibold hidden sm:table-cell">Total acum.</th>
              <th className="text-left py-3 px-3 font-semibold hidden md:table-cell">Última act.</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filas.map(op => {
              const inactivo = !op.ultima_actividad || (Date.now() - new Date(op.ultima_actividad).getTime()) > 30 * 60 * 1000
              return (
                <tr key={op.operador_id} className="hover:bg-gray-50">
                  <td className="py-3 px-3">
                    <p className="font-medium text-gray-800">{op.nombre}</p>
                    <p className="text-xs text-gray-400">{op.rol}</p>
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span className={`inline-block w-2.5 h-2.5 rounded-full ${op.colegiado_activo || op.miembro_activo ? 'bg-green-500' : inactivo ? 'bg-gray-300' : 'bg-yellow-400'}`} />
                  </td>
                  <td className="py-3 px-3 text-right font-semibold tabular-nums">{op.llamadas_hoy}</td>
                  <td className="py-3 px-3 text-right tabular-nums text-green-700">{op.efectivas_hoy}</td>
                  <td className="py-3 px-3 text-right tabular-nums font-bold" style={{ color: 'var(--color-dorado)' }}>{op.confirmados_p1_hoy}</td>
                  <td className="py-3 px-3 text-right tabular-nums text-gray-500 hidden sm:table-cell">{op.llamadas_total}</td>
                  <td className="py-3 px-3 text-xs text-gray-400 hidden md:table-cell">
                    {op.ultima_actividad ? fmt(op.ultima_actividad) : '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

type Tab = 'nucleo' | 'padron' | 'confirmados' | 'monitoreo'

interface Props {
  nombreUsuario: string
  rol: string
}

export default function DashboardGerente({ nombreUsuario, rol }: Props) {
  const supabase = createClient()
  const [tab, setTab]               = useState<Tab>('nucleo')
  const [nucleoGerente, setNucleo]  = useState<string | null>(null)
  const [cargando, setCargando]     = useState(true)

  useEffect(() => {
    supabase.rpc('mi_nucleo_asignado').then(({ data }) => {
      setNucleo(data as string | null)
      setCargando(false)
    })
  }, [supabase])

  const TABS: { id: Tab; label: string }[] = [
    { id: 'nucleo',      label: '🏛 Mi Núcleo' },
    { id: 'padron',      label: '📋 Padrón en vivo' },
    { id: 'confirmados', label: '✓ Confirmados' },
    ...(nucleoGerente === null ? [{ id: 'monitoreo' as Tab, label: '📊 Operadores' }] : []),
  ]

  if (cargando) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: 'var(--color-fondo)' }}>
        <AppHeader nombreUsuario={nombreUsuario} rol={rol} />
        <div className="flex items-center justify-center py-24">
          <p className="text-gray-500">Cargando…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-fondo)' }}>
      <AppHeader nombreUsuario={nombreUsuario} rol={rol} />

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Encabezado */}
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-marino)' }}>
            Dashboard — Elecciones CODIA
          </h1>
          {nucleoGerente && (
            <p className="text-sm text-gray-400 mt-0.5">Núcleo: <span className="font-semibold text-gray-600">{nucleoGerente}</span></p>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white rounded-xl border border-gray-100 shadow-sm p-1 w-fit">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className="text-sm px-4 py-2 rounded-lg font-medium transition-colors"
              style={tab === t.id
                ? { backgroundColor: 'var(--color-marino)', color: 'white' }
                : { color: 'var(--color-real)' }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Contenido */}
        {tab === 'nucleo'      && <TabMiNucleo />}
        {tab === 'padron'      && <TabPadronActivo nombreUsuario={nombreUsuario} nucleoGerente={nucleoGerente} />}
        {tab === 'confirmados' && <TabConfirmados nucleoGerente={nucleoGerente} />}
        {tab === 'monitoreo'   && <TabMonitoreoOperadores />}
      </div>
    </div>
  )
}
