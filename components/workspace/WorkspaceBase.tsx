'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Colegiado, ResultadoLlamada } from '@/lib/types/database'

// ─── Tipos locales ────────────────────────────────────────────────────────────

type LlamadaResumen = {
  id: number
  resultado: ResultadoLlamada
  fecha_hora: string
  confirma_plancha1: boolean
  colegiado_nombre: string
}

type ContadoresHoy = {
  efectiva_confirma: number
  efectiva_no_confirma: number
  no_contesta: number
  numero_equivocado: number
}


type LlamadaHistorialRow = {
  id: number
  resultado: string
  fecha_hora: string
  confirma_plancha1: boolean
  notas: string | null
  padron: { nombre_completo: string; codigo: string; telefono: string | null }[] | { nombre_completo: string; codigo: string; telefono: string | null } | null
}

type LlamadaDiaRow = {
  id: number
  resultado: string
  fecha_hora: string
  confirma_plancha1: boolean
  padron: { nombre_completo: string }[] | { nombre_completo: string } | null
}

// ─── Constantes ───────────────────────────────────────────────────────────────

export type ModoWorkspace = 'pool' | 'recuperacion'

const MODO_CONFIG: Record<ModoWorkspace, { estado: string; botonLabel: string }> = {
  pool:        { estado: 'pendiente',       botonLabel: 'Siguiente colegiado →' },
  recuperacion:{ estado: 'no_comunicacion', botonLabel: 'Tomar siguiente →' },
}

const ZONA = 'America/Santo_Domingo'

const ETIQUETAS: Record<string, string> = {
  efectiva_confirma:    'Simpatiza ✓',
  efectiva_no_confirma: 'No Simpatiza',
  no_contesta:          'No contesta',
  numero_equivocado:    'Núm. equivocado',
}

const CONTADORES_VACIOS: ContadoresHoy = {
  efectiva_confirma: 0,
  efectiva_no_confirma: 0,
  no_contesta: 0,
  numero_equivocado: 0,
}

// ─── Utilidades ───────────────────────────────────────────────────────────────

function hoyInicioISO(): string {
  const sdDate = new Date().toLocaleDateString('en-CA', { timeZone: ZONA })
  return new Date(`${sdDate}T00:00:00-04:00`).toISOString()
}

function formatFechaHora(iso: string): string {
  return new Date(iso).toLocaleString('es-DO', {
    timeZone: ZONA, day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  })
}

function formatHora(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-DO', {
    timeZone: ZONA, hour: '2-digit', minute: '2-digit',
  })
}

// ─── Componente principal ─────────────────────────────────────────────────────

interface Props {
  userId: string
  modo: ModoWorkspace
}

export default function WorkspaceBase({ userId, modo }: Props) {
  const supabase = createClient()
  const cfg = MODO_CONFIG[modo]

  const [colegiadoActivo, setColegiadoActivo] = useState<Colegiado | null>(null)
  const [sinColegiados, setSinColegiados]       = useState(false)
  const [llamadasHoy, setLlamadasHoy]           = useState<LlamadaResumen[]>([])
  const [contadoresHoy, setContadoresHoy]       = useState<ContadoresHoy>({ ...CONTADORES_VACIOS })
  const [cargandoInicial, setCargandoInicial]   = useState(true)
  const [notas, setNotas]                       = useState('')
  const [guardando, setGuardando]               = useState(false)
  const [cargandoSiguiente, setCargandoSiguiente] = useState(false)
  const [errorAccion, setErrorAccion]           = useState<string | null>(null)
  const [pestañaActiva, setPestañaActiva]       = useState<'nuevas' | 'historial'>('nuevas')

  type LlamadaHistorial = {
    id: number; resultado: ResultadoLlamada; fecha_hora: string
    confirma_plancha1: boolean; notas: string | null
    colegiado_nombre: string; codigo: string; telefono: string | null
  }
  const [historial, setHistorial]         = useState<LlamadaHistorial[]>([])
  const [paginaHistorial, setPaginaHistorial] = useState(0)
  const [totalHistorial, setTotalHistorial]   = useState(0)
  const [cargandoHistorial, setCargandoHistorial] = useState(false)
  const PAGE_SIZE = 50

  function resetForm() {
    setNotas('')
    setErrorAccion(null)
    setSinColegiados(false)
  }

  const cargarGestionesHoy = useCallback(async () => {
    const inicio = hoyInicioISO()
    const { data, error } = await supabase
      .from('llamadas')
      .select('id, resultado, fecha_hora, confirma_plancha1, padron(nombre_completo)')
      .eq('operador_id', userId)
      .gte('fecha_hora', inicio)
      .order('fecha_hora', { ascending: false })
      .limit(1000)

    if (error || !data) return

    const contadores = { ...CONTADORES_VACIOS }
    const lista: LlamadaResumen[] = []
    for (const row of (data as unknown) as LlamadaDiaRow[]) {
      const resultado = row.resultado as ResultadoLlamada
      if (resultado in contadores) {
        (contadores as Record<string, number>)[resultado] = ((contadores as Record<string, number>)[resultado] ?? 0) + 1
      }
      const rawM = row.padron
      const nombre = rawM
        ? Array.isArray(rawM) ? (rawM[0]?.nombre_completo ?? '—') : rawM.nombre_completo
        : '—'
      lista.push({ id: row.id, resultado, fecha_hora: row.fecha_hora, confirma_plancha1: row.confirma_plancha1, colegiado_nombre: nombre })
    }
    setContadoresHoy(contadores)
    setLlamadasHoy(lista.slice(0, 10))
  }, [supabase, userId])

  const cargarHistorial = useCallback(async (pagina: number) => {
    setCargandoHistorial(true)
    const from = pagina * PAGE_SIZE
    const to   = from + PAGE_SIZE - 1
    const { data, error, count } = await supabase
      .from('llamadas')
      .select('id, resultado, fecha_hora, confirma_plancha1, notas, padron(nombre_completo, codigo, telefono)', { count: 'exact' })
      .eq('operador_id', userId)
      .order('fecha_hora', { ascending: false })
      .range(from, to)

    setCargandoHistorial(false)
    if (error || !data) return
    if (count !== null) setTotalHistorial(count)

    setHistorial((data as unknown as LlamadaHistorialRow[]).map(row => {
      const rawM = row.padron
      const m = rawM ? (Array.isArray(rawM) ? rawM[0] : rawM) : null
      return {
        id: row.id, resultado: row.resultado as ResultadoLlamada,
        fecha_hora: row.fecha_hora, confirma_plancha1: row.confirma_plancha1,
        notas: row.notas, colegiado_nombre: m?.nombre_completo ?? '—',
        codigo: m?.codigo ?? '—', telefono: m?.telefono ?? null,
      }
    }))
  }, [supabase, userId])

  useEffect(() => {
    async function init() {
      setCargandoInicial(true)
      const ahora = new Date().toISOString()
      const { data } = await supabase
        .from('padron')
        .select('*')
        .eq('asignado_a', userId)
        .eq('estado_gestion', 'en_proceso')
        .gt('bloqueado_hasta', ahora)
        .limit(1)

      if (data && data.length > 0) setColegiadoActivo(data[0] as Colegiado)
      await cargarGestionesHoy()
      setCargandoInicial(false)
    }
    init()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (pestañaActiva === 'historial') cargarHistorial(paginaHistorial)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pestañaActiva, paginaHistorial])

  // ─── Acciones ─────────────────────────────────────────────────────────────

  async function jalarSiguiente() {
    setCargandoSiguiente(true)
    setSinColegiados(false)
    setErrorAccion(null)
    try {
      const { data, error } = await supabase.rpc('jalar_siguiente_colegiado', { p_estado: cfg.estado })
      if (error) throw error
      const resultado = Array.isArray(data) ? data[0] : data
      if (!resultado) { setSinColegiados(true); return }
      setColegiadoActivo(resultado as Colegiado)
      resetForm()
    } catch {
      setErrorAccion('No se pudo obtener el siguiente colegiado.')
    } finally {
      setCargandoSiguiente(false)
    }
  }

  async function registrarYAvanzar(
    pResultado: ResultadoLlamada,
    pConfirma: boolean,
    autoAvanzar: boolean,
  ) {
    if (!colegiadoActivo || guardando) return
    setGuardando(true)
    setErrorAccion(null)
    try {
      const { error } = await supabase.rpc('registrar_llamada', {
        p_colegiado_id: colegiadoActivo.id,
        p_resultado:    pResultado,
        p_confirma:     pConfirma,
        p_notas:        notas.trim() || null,
        p_callback_at:  null,
      })
      if (error) throw error
      setColegiadoActivo(null)
      resetForm()
      await cargarGestionesHoy()
      if (autoAvanzar) await jalarSiguiente()
    } catch {
      setErrorAccion('No se pudo guardar. Intenta de nuevo.')
    } finally {
      setGuardando(false)
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  if (cargandoInicial) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <p className="text-gray-500 text-sm">Cargando…</p>
      </div>
    )
  }

  const totalHoy = Object.values(contadoresHoy).reduce((a, b) => a + b, 0)
  const totalPaginas = Math.ceil(totalHistorial / PAGE_SIZE)

  return (
    <div className="max-w-xl mx-auto px-4 py-6 space-y-6">

      {/* Pestañas */}
      <div className="flex border-b border-gray-200">
        {([
          { key: 'nuevas',    label: 'Llamadas nuevas' },
          { key: 'historial', label: `Historial${totalHistorial > 0 ? ` (${totalHistorial})` : ''}` },
        ] as { key: 'nuevas' | 'historial'; label: string }[]).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setPestañaActiva(key)}
            className={cn(
              'px-5 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors',
              pestañaActiva === key
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            )}
          >{label}</button>
        ))}
      </div>

      {/* ════ LLAMADAS NUEVAS ════ */}
      {pestañaActiva === 'nuevas' && (
        <>
          {errorAccion && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{errorAccion}</div>
          )}

          <section>
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Colegiado actual</h2>

            {!colegiadoActivo ? (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center space-y-4">
                {sinColegiados && (
                  <p className="text-gray-500 text-sm">No hay más colegiados disponibles por ahora.</p>
                )}
                <Button
                  onClick={jalarSiguiente}
                  disabled={cargandoSiguiente}
                  className="w-full h-14 text-base font-semibold"
                  style={{ backgroundColor: 'var(--color-marino)' }}
                >
                  {cargandoSiguiente ? 'Buscando…' : cfg.botonLabel}
                </Button>
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-5">
                {/* Info colegiado */}
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-bold text-gray-900 text-xl leading-tight truncate">
                        {colegiadoActivo.nombre_completo}
                      </p>
                      <p className="text-sm text-gray-400">Colegiatura #{colegiadoActivo.codigo}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      {colegiadoActivo.pensionado && (
                        <span className="bg-purple-100 text-purple-700 text-xs font-bold px-2.5 py-1 rounded-full border border-purple-200">
                          Pensionado
                        </span>
                      )}
                      {colegiadoActivo.nuevo_integrante && (
                        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                          Pendiente de certificado
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Teléfonos */}
                  <div className="space-y-1">
                    {colegiadoActivo.telefono ? (
                      <div className="flex items-center gap-2">
                        <a href={`tel:${colegiadoActivo.telefono}`}
                          className="font-bold text-2xl hover:underline"
                          style={{ color: 'var(--color-real)' }}>
                          {colegiadoActivo.telefono}
                        </a>
                        <button
                          onClick={() => navigator.clipboard.writeText(colegiadoActivo.telefono!)}
                          className="text-xs text-gray-400 hover:text-gray-700 border border-gray-200 rounded-md px-2 py-1">
                          Copiar
                        </button>
                      </div>
                    ) : (
                      <p className="text-gray-400 text-sm italic">Sin teléfono fijo</p>
                    )}
                    {colegiadoActivo.celular && colegiadoActivo.celular !== colegiadoActivo.telefono && (
                      <div className="flex items-center gap-2">
                        <a href={`tel:${colegiadoActivo.celular}`}
                          className="font-medium text-lg hover:underline"
                          style={{ color: 'var(--color-real)' }}>
                          {colegiadoActivo.celular}
                        </a>
                        <span className="text-xs text-gray-400 border border-gray-200 rounded px-1.5 py-0.5">Cel</span>
                      </div>
                    )}
                  </div>

                  {/* Datos */}
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                    {colegiadoActivo.carrera && (
                      <span className="text-gray-600"><span className="text-gray-400">Profesión:</span> <strong>{colegiadoActivo.carrera}</strong></span>
                    )}
                    {colegiadoActivo.regional && (
                      <span className="text-gray-600"><span className="text-gray-400">Regional:</span> <strong>{colegiadoActivo.regional}</strong></span>
                    )}
                    {colegiadoActivo.nucleo && (
                      <span className="text-gray-600"><span className="text-gray-400">Núcleo:</span> <strong>{colegiadoActivo.nucleo}</strong></span>
                    )}
                    {colegiadoActivo.intentos_no_contesta > 0 && (
                      <span className="text-orange-600 font-semibold">Intento {colegiadoActivo.intentos_no_contesta} de 3</span>
                    )}
                  </div>
                </div>

                {/* Notas */}
                <div className="border-t border-gray-100 pt-4">
                  <textarea
                    value={notas}
                    onChange={e => setNotas(e.target.value)}
                    rows={2}
                    placeholder="Notas opcionales…"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-300"
                  />
                </div>

                {/* Botones de resultado */}
                <div className="grid grid-cols-1 gap-3">
                  {/* Simpatiza */}
                  <button
                    onClick={() => registrarYAvanzar('efectiva_confirma', true, true)}
                    disabled={guardando}
                    className="w-full py-4 rounded-2xl font-bold text-base text-white transition-all hover:opacity-90 disabled:opacity-50"
                    style={{ backgroundColor: '#16a34a' }}
                  >
                    ✓ Simpatiza con George Richardson
                  </button>

                  {/* No Simpatiza */}
                  <button
                    onClick={() => registrarYAvanzar('efectiva_no_confirma', false, true)}
                    disabled={guardando}
                    className="w-full py-4 rounded-2xl font-bold text-base text-white transition-all hover:opacity-90 disabled:opacity-50"
                    style={{ backgroundColor: '#dc2626' }}
                  >
                    ✗ No Simpatiza con George Richardson
                  </button>

                  <div className="grid grid-cols-2 gap-3">
                    {/* No contesta */}
                    <button
                      onClick={() => registrarYAvanzar('no_contesta', false, true)}
                      disabled={guardando}
                      className="py-3 rounded-xl font-semibold text-sm bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50 transition-colors"
                    >
                      📵 No contesta
                    </button>

                    {/* Número equivocado */}
                    <button
                      onClick={() => registrarYAvanzar('numero_equivocado', false, true)}
                      disabled={guardando}
                      className="py-3 rounded-xl font-semibold text-sm bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50 transition-colors"
                    >
                      ❌ Núm. equivocado
                    </button>
                  </div>
                </div>

                {guardando && (
                  <p className="text-center text-sm text-gray-400">Guardando…</p>
                )}
              </div>
            )}
          </section>

          {/* Gestiones hoy */}
          <section>
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
              Mis gestiones hoy{totalHoy > 0 ? ` · ${totalHoy} llamadas` : ''}
            </h2>
            <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-3">
              {totalHoy === 0 ? (
                <p className="text-gray-400 text-sm text-center py-2">Sin gestiones registradas hoy.</p>
              ) : (
                <dl className="grid grid-cols-1 divide-y divide-gray-50">
                  {(Object.entries(contadoresHoy) as [string, number][])
                    .filter(([, n]) => n > 0)
                    .map(([resultado, n]) => (
                      <div key={resultado} className="flex items-center justify-between py-2 first:pt-0 last:pb-0">
                        <dt className="text-sm text-gray-600">{ETIQUETAS[resultado] ?? resultado}</dt>
                        <dd className="text-sm font-bold text-gray-900 tabular-nums">{n}</dd>
                      </div>
                    ))}
                </dl>
              )}
            </div>
            {llamadasHoy.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50 overflow-hidden">
                {llamadasHoy.map(l => (
                  <div key={l.id} className="px-4 py-2.5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{l.colegiado_nombre}</p>
                      <p className="text-xs text-gray-400">{formatHora(l.fecha_hora)}</p>
                    </div>
                    <span className={cn(
                      'text-xs font-semibold px-2 py-0.5 rounded-full shrink-0',
                      l.resultado === 'efectiva_confirma'    ? 'bg-green-100 text-green-700' :
                      l.resultado === 'efectiva_no_confirma' ? 'bg-red-100 text-red-700' :
                      'bg-gray-100 text-gray-600'
                    )}>
                      {ETIQUETAS[l.resultado] ?? l.resultado}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {/* ════ HISTORIAL ════ */}
      {pestañaActiva === 'historial' && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
              Mi historial · {totalHistorial} llamadas
            </h2>
            {totalPaginas > 1 && (
              <span className="text-xs text-gray-400">Pág. {paginaHistorial + 1} / {totalPaginas}</span>
            )}
          </div>

          {cargandoHistorial ? (
            <div className="bg-white rounded-2xl border p-8 text-center">
              <p className="text-gray-400 text-sm">Cargando historial…</p>
            </div>
          ) : historial.length === 0 ? (
            <div className="bg-white rounded-2xl border p-8 text-center">
              <p className="text-gray-400 text-sm">Sin llamadas registradas todavía.</p>
            </div>
          ) : (
            <>
              <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50 overflow-hidden mb-4">
                {historial.map(l => (
                  <div key={l.id} className="px-4 py-3 space-y-0.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{l.colegiado_nombre}</p>
                        <p className="text-xs text-gray-400">#{l.codigo}{l.telefono ? ` · ${l.telefono}` : ''}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <span className={cn(
                          'text-xs font-semibold px-2 py-0.5 rounded-full',
                          l.resultado === 'efectiva_confirma'    ? 'bg-green-100 text-green-700' :
                          l.resultado === 'efectiva_no_confirma' ? 'bg-red-100 text-red-700' :
                          'bg-gray-100 text-gray-600'
                        )}>
                          {ETIQUETAS[l.resultado] ?? l.resultado}
                        </span>
                        <p className="text-xs text-gray-400 mt-1">{formatFechaHora(l.fecha_hora)}</p>
                      </div>
                    </div>
                    {l.notas && <p className="text-xs text-gray-500 italic pt-1">{l.notas}</p>}
                  </div>
                ))}
              </div>

              {totalPaginas > 1 && (
                <div className="flex items-center justify-between gap-3">
                  <Button variant="outline" size="sm" disabled={paginaHistorial === 0}
                    onClick={() => setPaginaHistorial(p => p - 1)} className="text-xs">
                    ← Anterior
                  </Button>
                  <span className="text-xs text-gray-500">
                    {paginaHistorial * PAGE_SIZE + 1}–{Math.min((paginaHistorial + 1) * PAGE_SIZE, totalHistorial)} de {totalHistorial}
                  </span>
                  <Button variant="outline" size="sm" disabled={paginaHistorial >= totalPaginas - 1}
                    onClick={() => setPaginaHistorial(p => p + 1)} className="text-xs">
                    Siguiente →
                  </Button>
                </div>
              )}
            </>
          )}
        </section>
      )}
    </div>
  )
}
