'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Colegiado, ResultadoLlamada } from '@/lib/types/database'

// ─── Tipos locales ────────────────────────────────────────────────────────────

type CallbackItem = {
  llamadaId: number
  colegiado: Colegiado
  callbackAt: string
}

type LlamadaResumen = {
  id: number
  resultado: ResultadoLlamada
  fecha_hora: string
  confirma_plancha1: boolean
  colegiado_nombre: string
}

type ContadoresHoy = Record<ResultadoLlamada, number>

type FormResultado = 'efectiva' | 'no_contesta' | 'numero_equivocado' | 'volver_a_llamar' | 'rechaza'

type ColegiadoRPC = {
  id: number
  codigo: string
  nombre_completo: string
  telefono: string | null
  celular: string | null
  regional: string | null
  provincia: string | null
  nucleo: string | null
  carrera: string | null
  pensionado: boolean
  nuevo_integrante: boolean
  estado_gestion: string
  asignado_a: string | null
  bloqueado_hasta: string | null
  intentos_no_contesta: number
  created_at: string
}

type LlamadaHistorialRow = {
  id: number
  resultado: string
  fecha_hora: string
  confirma_plancha1: boolean
  notas: string | null
  padron: { nombre_completo: string; codigo: string; telefono: string | null }[] | { nombre_completo: string; codigo: string; telefono: string | null } | null
}

type LlamadaCallbackRow = {
  id: number
  callback_at: string | null
  colegiado_id: number
  padron: ColegiadoRPC[] | ColegiadoRPC | null
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

const ETIQUETAS: Record<ResultadoLlamada, string> = {
  efectiva_confirma:    'Efectiva – Plancha 1 ✓',
  efectiva_no_confirma: 'Efectiva – No confirma',
  no_contesta:          'No contesta',
  numero_equivocado:    'Número equivocado',
  volver_a_llamar:      'Volver a llamar',
  rechaza:              'Rechaza',
}

const CONTADORES_VACIOS: ContadoresHoy = {
  efectiva_confirma: 0,
  efectiva_no_confirma: 0,
  no_contesta: 0,
  numero_equivocado: 0,
  volver_a_llamar: 0,
  rechaza: 0,
}

const BOTONES_RESULTADO: { valor: FormResultado; label: string }[] = [
  { valor: 'efectiva',         label: '✓ Efectiva' },
  { valor: 'no_contesta',      label: '📵 No contesta' },
  { valor: 'numero_equivocado',label: '❌ Núm. equivocado' },
  { valor: 'volver_a_llamar',  label: '🔁 Volver a llamar' },
  { valor: 'rechaza',          label: '🚫 Rechaza' },
]

// ─── Utilidades de fecha ──────────────────────────────────────────────────────

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

  // ── Estado vista principal ──
  const [colegiadoActivo, setColegiadoActivo] = useState<Colegiado | null>(null)
  const [sinColegiados, setSinColegiados] = useState(false)
  const [callbacks, setCallbacks] = useState<CallbackItem[]>([])
  const [llamadasHoy, setLlamadasHoy] = useState<LlamadaResumen[]>([])
  const [contadoresHoy, setContadoresHoy] = useState<ContadoresHoy>({ ...CONTADORES_VACIOS })
  const [cargandoInicial, setCargandoInicial] = useState(true)

  // ── Formulario llamada nueva ──
  const [formResultado, setFormResultado] = useState<FormResultado | null>(null)
  const [confirmaPlanchaEfectiva, setConfirmaPlanchaEfectiva] = useState<boolean | null>(null)
  const [callbackAt, setCallbackAt] = useState('')
  const [notas, setNotas] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [liberando, setLiberando] = useState(false)
  const [cargandoSiguiente, setCargandoSiguiente] = useState(false)
  const [errorAccion, setErrorAccion] = useState<string | null>(null)

  // ── Pestaña ──
  const [pestañaActiva, setPestañaActiva] = useState<'nuevas' | 'historial'>('nuevas')

  // ── Historial ──
  type LlamadaHistorial = {
    id: number
    resultado: ResultadoLlamada
    fecha_hora: string
    confirma_plancha1: boolean
    notas: string | null
    colegiado_nombre: string
    codigo: string
    telefono: string | null
  }
  const [historial, setHistorial] = useState<LlamadaHistorial[]>([])
  const [paginaHistorial, setPaginaHistorial] = useState(0)
  const [totalHistorial, setTotalHistorial] = useState(0)
  const [cargandoHistorial, setCargandoHistorial] = useState(false)
  const PAGE_SIZE = 50

  // ─── Reset helpers ────────────────────────────────────────────────────────

  function resetForm() {
    setFormResultado(null)
    setConfirmaPlanchaEfectiva(null)
    setCallbackAt('')
    setNotas('')
    setErrorAccion(null)
    setSinColegiados(false)
  }

  // ─── Carga de datos ───────────────────────────────────────────────────────

  const cargarCallbacks = useCallback(async () => {
    const { data, error } = await supabase
      .from('llamadas')
      .select(`
        id, callback_at, colegiado_id,
        padron (
          id, codigo, nombre_completo, telefono, celular,
          regional, provincia, nucleo, carrera,
          pensionado, nuevo_integrante,
          estado_gestion, asignado_a, bloqueado_hasta, intentos_no_contesta, created_at
        )
      `)
      .eq('operador_id', userId)
      .eq('resultado', 'volver_a_llamar')
      .not('callback_at', 'is', null)
      .order('callback_at', { ascending: true })
      .limit(1000)

    if (error || !data) return

    const visto = new Set<number>()
    const items: CallbackItem[] = []
    for (const row of (data as unknown) as LlamadaCallbackRow[]) {
      const rawM = row.padron
      const m: ColegiadoRPC | null = Array.isArray(rawM) ? (rawM[0] ?? null) : rawM
      if (!m || visto.has(row.colegiado_id) || m.asignado_a !== userId) continue
      visto.add(row.colegiado_id)
      items.push({ llamadaId: row.id, colegiado: m as unknown as Colegiado, callbackAt: row.callback_at! })
    }
    setCallbacks(items)
  }, [supabase, userId])

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
      contadores[resultado] = (contadores[resultado] ?? 0) + 1
      const rawM = row.padron
      const nombreM = rawM
        ? Array.isArray(rawM) ? (rawM[0]?.nombre_completo ?? '—') : rawM.nombre_completo
        : '—'
      lista.push({ id: row.id, resultado, fecha_hora: row.fecha_hora, confirma_plancha1: row.confirma_plancha1, colegiado_nombre: nombreM })
    }
    setContadoresHoy(contadores)
    setLlamadasHoy(lista.slice(0, 10))
  }, [supabase, userId])

  const cargarHistorial = useCallback(async (pagina: number) => {
    setCargandoHistorial(true)
    const from = pagina * 50
    const to = from + 49
    const { data, error, count } = await supabase
      .from('llamadas')
      .select('id, resultado, fecha_hora, confirma_plancha1, notas, padron(nombre_completo, codigo, telefono)', { count: 'exact' })
      .eq('operador_id', userId)
      .order('fecha_hora', { ascending: false })
      .range(from, to)

    setCargandoHistorial(false)
    if (error || !data) return
    if (count !== null) setTotalHistorial(count)

    const lista = (data as unknown as LlamadaHistorialRow[]).map(row => {
      const rawM = row.padron
      const m = rawM ? (Array.isArray(rawM) ? rawM[0] : rawM) : null
      return {
        id: row.id,
        resultado: row.resultado as ResultadoLlamada,
        fecha_hora: row.fecha_hora,
        confirma_plancha1: row.confirma_plancha1,
        notas: row.notas,
        colegiado_nombre: m?.nombre_completo ?? '—',
        codigo: m?.codigo ?? '—',
        telefono: m?.telefono ?? null,
      }
    })
    setHistorial(lista)
  }, [supabase, userId])

  const recargarTodo = useCallback(async () => {
    await Promise.all([cargarCallbacks(), cargarGestionesHoy()])
  }, [cargarCallbacks, cargarGestionesHoy])

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
        .order('bloqueado_hasta', { ascending: false })
        .limit(1)

      if (data && data.length > 0) setColegiadoActivo(data[0] as Colegiado)
      await recargarTodo()
      setCargandoInicial(false)
    }
    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ─── Acciones llamadas nuevas ─────────────────────────────────────────────

  async function jalarSiguiente() {
    setCargandoSiguiente(true)
    setSinColegiados(false)
    setErrorAccion(null)
    try {
      const { data, error } = await supabase.rpc('jalar_siguiente_colegiado', {
        p_estado: cfg.estado,
      })
      if (error) {
        if (error.message?.includes('no autorizado')) {
          setErrorAccion('No tienes permiso para realizar esta acción.')
          return
        }
        throw error
      }
      const resultado = Array.isArray(data) ? data[0] : data
      if (!resultado) { setSinColegiados(true); return }
      setColegiadoActivo(resultado as Colegiado)
      resetForm()
    } catch {
      setErrorAccion('No se pudo obtener el siguiente colegiado. Intenta de nuevo.')
    } finally {
      setCargandoSiguiente(false)
    }
  }

  async function guardarLlamada() {
    if (!colegiadoActivo || !formResultado) return
    if (formResultado === 'efectiva' && confirmaPlanchaEfectiva === null) {
      setErrorAccion('Indica si el colegiado confirmó apoyo a la Plancha 1.')
      return
    }
    if (formResultado === 'volver_a_llamar' && !callbackAt) {
      setErrorAccion('Selecciona la fecha y hora para volver a llamar.')
      return
    }

    const pResultado: ResultadoLlamada =
      formResultado === 'efectiva'
        ? confirmaPlanchaEfectiva ? 'efectiva_confirma' : 'efectiva_no_confirma'
        : (formResultado as ResultadoLlamada)

    const pConfirma = formResultado === 'efectiva' ? (confirmaPlanchaEfectiva ?? false) : false
    const pCallbackAt = formResultado === 'volver_a_llamar' ? new Date(callbackAt).toISOString() : null

    setGuardando(true)
    setErrorAccion(null)
    try {
      const { error } = await supabase.rpc('registrar_llamada', {
        p_colegiado_id: colegiadoActivo.id,
        p_resultado: pResultado,
        p_confirma: pConfirma,
        p_notas: notas.trim() || null,
        p_callback_at: pCallbackAt,
      })
      if (error) throw error
      setColegiadoActivo(null)
      resetForm()
      await recargarTodo()
    } catch {
      setErrorAccion('No se pudo guardar la llamada. Intenta de nuevo.')
    } finally {
      setGuardando(false)
    }
  }

  async function liberarColegiado() {
    if (!colegiadoActivo) return
    const ok = window.confirm(
      `¿Liberar a ${colegiadoActivo.nombre_completo} al pool? Quedará disponible para otros operadores.`
    )
    if (!ok) return
    setLiberando(true)
    setErrorAccion(null)
    try {
      const { error } = await supabase.rpc('liberar_colegiado', { p_colegiado_id: colegiadoActivo.id })
      if (error) throw error
      setColegiadoActivo(null)
      resetForm()
    } catch {
      setErrorAccion('No se pudo liberar el colegiado. Intenta de nuevo.')
    } finally {
      setLiberando(false)
    }
  }

  function cargarDesdeCallback(item: CallbackItem) {
    if (colegiadoActivo) return
    setColegiadoActivo(item.colegiado)
    resetForm()
    setCallbacks(prev => prev.filter(c => c.colegiado.id !== item.colegiado.id))
  }

  useEffect(() => {
    if (pestañaActiva === 'historial') {
      cargarHistorial(paginaHistorial)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pestañaActiva, paginaHistorial])

  // ─── Render ───────────────────────────────────────────────────────────────

  if (cargandoInicial) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <p className="text-gray-500 text-sm">Cargando workspace…</p>
      </div>
    )
  }

  const ahora = new Date()
  const totalHoy = Object.values(contadoresHoy).reduce((a, b) => a + b, 0)
  const puedeGuardar =
    !!formResultado &&
    (formResultado !== 'efectiva' || confirmaPlanchaEfectiva !== null) &&
    (formResultado !== 'volver_a_llamar' || !!callbackAt)
  const totalPaginas = Math.ceil(totalHistorial / PAGE_SIZE)

  return (
    <div className="max-w-xl mx-auto px-4 py-6 space-y-6">

      {/* ── Selector de vista ── */}
      <div className="flex border-b border-gray-200">
        {(
          [
            { key: 'nuevas',    label: 'Llamadas nuevas' },
            { key: 'historial', label: `Historial${totalHistorial > 0 ? ` (${totalHistorial})` : ''}` },
          ] as { key: 'nuevas' | 'historial'; label: string }[]
        ).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setPestañaActiva(key)}
            className={cn(
              'px-5 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors',
              pestañaActiva === key
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ════════════════════════════════════════
          VISTA: Llamadas nuevas
      ════════════════════════════════════════ */}
      {pestañaActiva === 'nuevas' && (
        <>
          {errorAccion && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
              {errorAccion}
            </div>
          )}

          {/* ── ZONA A: Colegiado actual ── */}
          <section aria-label="Colegiado actual">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
              Colegiado actual
            </h2>

            {!colegiadoActivo ? (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center space-y-4">
                {sinColegiados && (
                  <p className="text-gray-500 text-sm">No hay más colegiados en este bucket por ahora.</p>
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
                        <span
                          className="text-xs font-bold px-2.5 py-1 rounded-full text-white"
                          style={{ backgroundColor: 'var(--color-dorado)' }}
                        >
                          ★ Nuevo
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Teléfono principal y celular */}
                  <div className="space-y-1">
                    {colegiadoActivo.telefono ? (
                      <div className="flex items-center gap-2">
                        <a
                          href={`tel:${colegiadoActivo.telefono}`}
                          className="font-bold text-2xl hover:underline"
                          style={{ color: 'var(--color-real)' }}
                        >
                          {colegiadoActivo.telefono}
                        </a>
                        <button
                          onClick={() => navigator.clipboard.writeText(colegiadoActivo.telefono!)}
                          className="text-xs text-gray-400 hover:text-gray-700 border border-gray-200 rounded-md px-2 py-1 transition-colors"
                        >
                          Copiar
                        </button>
                      </div>
                    ) : (
                      <p className="text-gray-400 text-sm italic">Sin teléfono fijo</p>
                    )}
                    {colegiadoActivo.celular && colegiadoActivo.celular !== colegiadoActivo.telefono && (
                      <div className="flex items-center gap-2">
                        <a
                          href={`tel:${colegiadoActivo.celular}`}
                          className="font-medium text-lg hover:underline"
                          style={{ color: 'var(--color-real)' }}
                        >
                          {colegiadoActivo.celular}
                        </a>
                        <span className="text-xs text-gray-400 border border-gray-200 rounded px-1.5 py-0.5">Cel</span>
                      </div>
                    )}
                  </div>

                  {/* Datos de perfil */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                    {colegiadoActivo.carrera && (
                      <span className="text-gray-600">
                        <span className="text-gray-400">Profesión:</span>{' '}
                        <strong>{colegiadoActivo.carrera}</strong>
                      </span>
                    )}
                    {colegiadoActivo.regional && (
                      <span className="text-gray-600">
                        <span className="text-gray-400">Regional:</span>{' '}
                        <strong>{colegiadoActivo.regional}</strong>
                      </span>
                    )}
                    {colegiadoActivo.nucleo && (
                      <span className="text-gray-600">
                        <span className="text-gray-400">Núcleo:</span>{' '}
                        <strong>{colegiadoActivo.nucleo}</strong>
                      </span>
                    )}
                    {colegiadoActivo.intentos_no_contesta > 0 && (
                      <span className="text-orange-600 font-semibold">
                        Intento {colegiadoActivo.intentos_no_contesta} de 3
                      </span>
                    )}
                  </div>
                </div>

                {/* Formulario de resultado */}
                <div className="border-t border-gray-100 pt-5 space-y-4">
                  <p className="text-sm font-semibold text-gray-700">Resultado de la llamada</p>

                  <div className="grid grid-cols-2 gap-2">
                    {BOTONES_RESULTADO.map(({ valor, label }) => (
                      <button
                        key={valor}
                        onClick={() => { setFormResultado(valor); setConfirmaPlanchaEfectiva(null); setErrorAccion(null) }}
                        className={cn(
                          'rounded-xl border-2 py-3.5 px-3 text-sm font-medium transition-colors text-left leading-tight',
                          formResultado === valor
                            ? 'border-blue-500 bg-blue-50 text-blue-800'
                            : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  {formResultado === 'efectiva' && (
                    <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-3">
                      <p className="text-sm font-semibold text-green-800">¿Confirmó apoyo a Plancha 1?</p>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          onClick={() => setConfirmaPlanchaEfectiva(true)}
                          className={cn(
                            'rounded-xl border-2 py-3.5 font-semibold text-sm transition-colors',
                            confirmaPlanchaEfectiva === true
                              ? 'border-green-600 bg-green-600 text-white'
                              : 'border-green-400 text-green-700 hover:bg-green-100'
                          )}
                        >
                          ✓ Sí, confirma
                        </button>
                        <button
                          onClick={() => setConfirmaPlanchaEfectiva(false)}
                          className={cn(
                            'rounded-xl border-2 py-3.5 font-semibold text-sm transition-colors',
                            confirmaPlanchaEfectiva === false
                              ? 'border-red-500 bg-red-500 text-white'
                              : 'border-red-300 text-red-600 hover:bg-red-50'
                          )}
                        >
                          ✗ No confirma
                        </button>
                      </div>
                    </div>
                  )}

                  {formResultado === 'volver_a_llamar' && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        Fecha y hora para volver a llamar *
                      </label>
                      <input
                        type="datetime-local"
                        value={callbackAt}
                        onChange={e => setCallbackAt(e.target.value)}
                        className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                      />
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                      Notas (opcional)
                    </label>
                    <textarea
                      value={notas}
                      onChange={e => setNotas(e.target.value)}
                      rows={2}
                      placeholder="Observaciones sobre la llamada…"
                      className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      onClick={guardarLlamada}
                      disabled={guardando || !puedeGuardar}
                      className="h-12 text-sm font-semibold"
                      style={puedeGuardar ? { backgroundColor: 'var(--color-exito)' } : undefined}
                    >
                      {guardando ? 'Guardando…' : 'Guardar llamada'}
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={liberarColegiado}
                      disabled={liberando}
                      className="h-12 text-sm font-semibold"
                    >
                      {liberando ? '…' : 'Liberar al pool'}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* ── ZONA B: Callbacks ── */}
          {callbacks.length > 0 && (
            <section aria-label="Callbacks pendientes">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                Para volver a llamar ({callbacks.length})
              </h2>
              <div className="space-y-2">
                {callbacks.map(item => {
                  const vencio = new Date(item.callbackAt) <= ahora
                  return (
                    <div
                      key={item.llamadaId}
                      className={cn(
                        'bg-white rounded-xl border px-4 py-3 flex items-center gap-3',
                        vencio ? 'border-orange-300 bg-orange-50' : 'border-gray-100'
                      )}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 truncate text-sm">{item.colegiado.nombre_completo}</p>
                        <p className="text-sm text-gray-600">{item.colegiado.telefono ?? item.colegiado.celular ?? '—'}</p>
                        <p className={cn('text-xs mt-0.5', vencio ? 'text-orange-600 font-semibold' : 'text-gray-400')}>
                          {vencio ? '⏰ ' : ''}{formatFechaHora(item.callbackAt)}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant={colegiadoActivo ? 'secondary' : 'default'}
                        onClick={() => cargarDesdeCallback(item)}
                        disabled={!!colegiadoActivo}
                        className="shrink-0"
                      >
                        Llamar ahora
                      </Button>
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          {/* ── ZONA C: Gestiones hoy ── */}
          <section aria-label="Gestiones del día">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
              Mis gestiones hoy{totalHoy > 0 ? ` · ${totalHoy} llamadas` : ''}
            </h2>
            <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-3">
              {totalHoy === 0 ? (
                <p className="text-gray-400 text-sm text-center py-2">Sin gestiones registradas hoy.</p>
              ) : (
                <dl className="grid grid-cols-1 divide-y divide-gray-50">
                  {(Object.entries(contadoresHoy) as [ResultadoLlamada, number][])
                    .filter(([, n]) => n > 0)
                    .map(([resultado, n]) => (
                      <div key={resultado} className="flex items-center justify-between py-2 first:pt-0 last:pb-0">
                        <dt className="text-sm text-gray-600">{ETIQUETAS[resultado]}</dt>
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
                    <span className="text-xs text-gray-500 shrink-0 text-right">{ETIQUETAS[l.resultado]}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {/* ════════════════════════════════════════
          VISTA: Historial
      ════════════════════════════════════════ */}
      {pestañaActiva === 'historial' && (
        <section aria-label="Historial de llamadas">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
              Mi historial · {totalHistorial} llamadas
            </h2>
            {totalPaginas > 1 && (
              <span className="text-xs text-gray-400">
                Página {paginaHistorial + 1} de {totalPaginas}
              </span>
            )}
          </div>

          {cargandoHistorial ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
              <p className="text-gray-400 text-sm">Cargando historial…</p>
            </div>
          ) : historial.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
              <p className="text-gray-400 text-sm">Todavía no has registrado ninguna llamada.</p>
            </div>
          ) : (
            <>
              <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50 overflow-hidden mb-4">
                {historial.map(l => (
                  <div key={l.id} className="px-4 py-3 space-y-0.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{l.colegiado_nombre}</p>
                        <p className="text-xs text-gray-400">
                          #{l.codigo}
                          {l.telefono ? ` · ${l.telefono}` : ''}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <span className={cn(
                          'text-xs font-semibold px-2 py-0.5 rounded-full',
                          l.resultado === 'efectiva_confirma'    ? 'bg-green-100 text-green-700' :
                          l.resultado === 'efectiva_no_confirma' ? 'bg-blue-100 text-blue-700' :
                          l.resultado === 'rechaza'              ? 'bg-red-100 text-red-700' :
                          l.resultado === 'numero_equivocado'    ? 'bg-orange-100 text-orange-700' :
                          'bg-gray-100 text-gray-600'
                        )}>
                          {ETIQUETAS[l.resultado]}
                        </span>
                        <p className="text-xs text-gray-400 mt-1">{formatFechaHora(l.fecha_hora)}</p>
                      </div>
                    </div>
                    {l.notas && (
                      <p className="text-xs text-gray-500 italic pt-1">{l.notas}</p>
                    )}
                  </div>
                ))}
              </div>

              {totalPaginas > 1 && (
                <div className="flex items-center justify-between gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={paginaHistorial === 0}
                    onClick={() => setPaginaHistorial(p => p - 1)}
                    className="text-xs"
                  >
                    ← Anterior
                  </Button>
                  <span className="text-xs text-gray-500">
                    {paginaHistorial * PAGE_SIZE + 1}–{Math.min((paginaHistorial + 1) * PAGE_SIZE, totalHistorial)} de {totalHistorial}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={paginaHistorial >= totalPaginas - 1}
                    onClick={() => setPaginaHistorial(p => p + 1)}
                    className="text-xs"
                  >
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
