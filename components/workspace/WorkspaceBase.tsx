'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Miembro, ResultadoLlamada } from '@/lib/types/database'

// ─── Tipos locales ────────────────────────────────────────────────────────────

type CallbackItem = {
  llamadaId: number
  miembro: Miembro
  callbackAt: string
}

type LlamadaResumen = {
  id: number
  resultado: ResultadoLlamada
  fecha_hora: string
  confirma_plancha1: boolean
  miembro_nombre: string
}

type ContadoresHoy = Record<ResultadoLlamada, number>

type FormResultado = 'efectiva' | 'no_contesta' | 'numero_equivocado' | 'volver_a_llamar' | 'rechaza'

type MiembroRPC = {
  id: number
  matricula: string
  nombre: string
  vencimiento: string | null
  telefono: string | null
  segmento_montero: boolean
  telefono_revisar: boolean
  estado_gestion: string
  asignado_a: string | null
  bloqueado_hasta: string | null
  intentos_no_contesta: number
  lote_manual: boolean
  orden_manual: number | null
  created_at: string
}

type ContactadoItem = {
  id: number
  matricula: string
  nombre: string
  telefono: string | null
  orden_manual: number | null
}

type LlamadaCallbackRow = {
  id: number
  callback_at: string | null
  miembro_id: number
  miembros: MiembroRPC[] | MiembroRPC | null
}

type LlamadaDiaRow = {
  id: number
  resultado: string
  fecha_hora: string
  confirma_plancha1: boolean
  miembros: { nombre: string }[] | { nombre: string } | null
}

// ─── Constantes ───────────────────────────────────────────────────────────────

export type ModoWorkspace = 'pool' | 'recuperacion' | 'montero'

const MODO_CONFIG: Record<ModoWorkspace, { montero: boolean; estado: string; botonLabel: string }> = {
  pool:        { montero: false, estado: 'pendiente',       botonLabel: 'Siguiente miembro →' },
  recuperacion:{ montero: false, estado: 'no_comunicacion', botonLabel: 'Tomar siguiente →' },
  montero:     { montero: true,  estado: 'pendiente',       botonLabel: 'Siguiente Montero →' },
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

function formatVencimiento(fecha: string): string {
  return new Date(`${fecha}T12:00:00Z`).toLocaleDateString('es-DO', {
    timeZone: ZONA, day: 'numeric', month: 'long', year: 'numeric',
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
  const [miembroActivo, setMiembroActivo] = useState<Miembro | null>(null)
  const [sinMiembros, setSinMiembros] = useState(false)
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
  const [pestañaActiva, setPestañaActiva] = useState<'nuevas' | 'contactados'>('nuevas')

  // ── Contactados ──
  const [contactados, setContactados] = useState<ContactadoItem[]>([])
  const [filaExpandida, setFilaExpandida] = useState<number | null>(null)
  const [formResultadoC, setFormResultadoC] = useState<FormResultado | null>(null)
  const [confirmaPlanchaC, setConfirmaPlanchaC] = useState<boolean | null>(null)
  const [callbackAtC, setCallbackAtC] = useState('')
  const [notasC, setNotasC] = useState('')
  const [guardandoC, setGuardandoC] = useState(false)
  const [errorC, setErrorC] = useState<string | null>(null)

  // ─── Reset helpers ────────────────────────────────────────────────────────

  function resetForm() {
    setFormResultado(null)
    setConfirmaPlanchaEfectiva(null)
    setCallbackAt('')
    setNotas('')
    setErrorAccion(null)
    setSinMiembros(false)
  }

  function abrirFila(id: number) {
    setFilaExpandida(id)
    setFormResultadoC(null)
    setConfirmaPlanchaC(null)
    setCallbackAtC('')
    setNotasC('')
    setErrorC(null)
  }

  function cerrarFila() {
    setFilaExpandida(null)
    setFormResultadoC(null)
    setConfirmaPlanchaC(null)
    setCallbackAtC('')
    setNotasC('')
    setErrorC(null)
  }

  // ─── Carga de datos ───────────────────────────────────────────────────────

  const cargarCallbacks = useCallback(async () => {
    const { data, error } = await supabase
      .from('llamadas')
      .select(`
        id, callback_at, miembro_id,
        miembros (
          id, matricula, nombre, vencimiento, telefono,
          segmento_montero, telefono_revisar, estado_gestion,
          asignado_a, bloqueado_hasta, intentos_no_contesta, created_at
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
      const rawM = row.miembros
      const m: MiembroRPC | null = Array.isArray(rawM) ? (rawM[0] ?? null) : rawM
      if (!m || visto.has(row.miembro_id) || m.asignado_a !== userId) continue
      visto.add(row.miembro_id)
      items.push({ llamadaId: row.id, miembro: m as unknown as Miembro, callbackAt: row.callback_at! })
    }
    setCallbacks(items)
  }, [supabase, userId])

  const cargarGestionesHoy = useCallback(async () => {
    const inicio = hoyInicioISO()
    const { data, error } = await supabase
      .from('llamadas')
      .select('id, resultado, fecha_hora, confirma_plancha1, miembros(nombre)')
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
      const rawM = row.miembros
      const nombreM = rawM
        ? Array.isArray(rawM) ? (rawM[0]?.nombre ?? '—') : rawM.nombre
        : '—'
      lista.push({ id: row.id, resultado, fecha_hora: row.fecha_hora, confirma_plancha1: row.confirma_plancha1, miembro_nombre: nombreM })
    }
    setContadoresHoy(contadores)
    setLlamadasHoy(lista.slice(0, 10))
  }, [supabase, userId])

  const cargarContactados = useCallback(async () => {
    const { data, error } = await supabase
      .from('miembros')
      .select('id, matricula, nombre, telefono, orden_manual')
      .eq('asignado_a', userId)
      .eq('lote_manual', true)
      .eq('estado_gestion', 'pendiente')
      .order('orden_manual', { ascending: true })
      .limit(2000)

    if (error || !data) return
    setContactados(data as ContactadoItem[])
  }, [supabase, userId])

  const recargarTodo = useCallback(async () => {
    await Promise.all([cargarCallbacks(), cargarGestionesHoy(), cargarContactados()])
  }, [cargarCallbacks, cargarGestionesHoy, cargarContactados])

  useEffect(() => {
    async function init() {
      setCargandoInicial(true)
      const ahora = new Date().toISOString()
      const { data } = await supabase
        .from('miembros')
        .select('*')
        .eq('asignado_a', userId)
        .eq('estado_gestion', 'en_proceso')
        .gt('bloqueado_hasta', ahora)
        .order('bloqueado_hasta', { ascending: false })
        .limit(1)

      if (data && data.length > 0) setMiembroActivo(data[0] as Miembro)
      await recargarTodo()
      setCargandoInicial(false)
    }
    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ─── Acciones llamadas nuevas ─────────────────────────────────────────────

  async function jalarSiguiente() {
    setCargandoSiguiente(true)
    setSinMiembros(false)
    setErrorAccion(null)
    try {
      const { data, error } = await supabase.rpc('jalar_siguiente_miembro', {
        p_montero: cfg.montero,
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
      if (!resultado) { setSinMiembros(true); return }
      setMiembroActivo(resultado as Miembro)
      resetForm()
    } catch {
      setErrorAccion('No se pudo obtener el siguiente miembro. Intenta de nuevo.')
    } finally {
      setCargandoSiguiente(false)
    }
  }

  async function guardarLlamada() {
    if (!miembroActivo || !formResultado) return
    if (formResultado === 'efectiva' && confirmaPlanchaEfectiva === null) {
      setErrorAccion('Indica si el miembro confirmó apoyo a la Plancha 1.')
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
        p_miembro_id: miembroActivo.id,
        p_resultado: pResultado,
        p_confirma: pConfirma,
        p_notas: notas.trim() || null,
        p_callback_at: pCallbackAt,
      })
      if (error) throw error
      setMiembroActivo(null)
      resetForm()
      await recargarTodo()
    } catch {
      setErrorAccion('No se pudo guardar la llamada. Intenta de nuevo.')
    } finally {
      setGuardando(false)
    }
  }

  async function liberarMiembro() {
    if (!miembroActivo) return
    const ok = window.confirm(
      `¿Liberar a ${miembroActivo.nombre} al pool? Quedará disponible para otros operadores.`
    )
    if (!ok) return
    setLiberando(true)
    setErrorAccion(null)
    try {
      const { error } = await supabase.rpc('liberar_miembro', { p_miembro_id: miembroActivo.id })
      if (error) throw error
      setMiembroActivo(null)
      resetForm()
    } catch {
      setErrorAccion('No se pudo liberar el miembro. Intenta de nuevo.')
    } finally {
      setLiberando(false)
    }
  }

  function cargarDesdeCallback(item: CallbackItem) {
    if (miembroActivo) return
    setMiembroActivo(item.miembro)
    resetForm()
    setCallbacks(prev => prev.filter(c => c.miembro.id !== item.miembro.id))
  }

  // ─── Acciones contactados ─────────────────────────────────────────────────

  async function guardarLlamadaContactado(miembroId: number) {
    if (!formResultadoC) return
    if (formResultadoC === 'efectiva' && confirmaPlanchaC === null) {
      setErrorC('Indica si el miembro confirmó apoyo a la Plancha 1.')
      return
    }
    if (formResultadoC === 'volver_a_llamar' && !callbackAtC) {
      setErrorC('Selecciona la fecha y hora para volver a llamar.')
      return
    }

    const pResultado: ResultadoLlamada =
      formResultadoC === 'efectiva'
        ? confirmaPlanchaC ? 'efectiva_confirma' : 'efectiva_no_confirma'
        : (formResultadoC as ResultadoLlamada)

    const pConfirma = formResultadoC === 'efectiva' ? (confirmaPlanchaC ?? false) : false
    const pCallbackAt = formResultadoC === 'volver_a_llamar' ? new Date(callbackAtC).toISOString() : null

    setGuardandoC(true)
    setErrorC(null)
    try {
      const { error } = await supabase.rpc('registrar_llamada', {
        p_miembro_id: miembroId,
        p_resultado: pResultado,
        p_confirma: pConfirma,
        p_notas: notasC.trim() || null,
        p_callback_at: pCallbackAt,
      })
      if (error) throw error
      cerrarFila()
      await Promise.all([cargarContactados(), cargarGestionesHoy()])
    } catch {
      setErrorC('No se pudo guardar. Intenta de nuevo.')
    } finally {
      setGuardandoC(false)
    }
  }

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
  const puedeGuardarC =
    !!formResultadoC &&
    (formResultadoC !== 'efectiva' || confirmaPlanchaC !== null) &&
    (formResultadoC !== 'volver_a_llamar' || !!callbackAtC)

  return (
    <div className="max-w-xl mx-auto px-4 py-6 space-y-6">

      {/* ── Selector de vista ── */}
      <div className="flex border-b border-gray-200">
        {(
          [
            { key: 'nuevas',      label: 'Llamadas nuevas' },
            { key: 'contactados', label: `Contactados${contactados.length > 0 ? ` (${contactados.length})` : ''}` },
          ] as { key: 'nuevas' | 'contactados'; label: string }[]
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

          {/* ── ZONA A: Miembro actual ── */}
          <section aria-label="Miembro actual">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
              Miembro actual
            </h2>

            {!miembroActivo ? (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center space-y-4">
                {sinMiembros && (
                  <p className="text-gray-500 text-sm">No hay más miembros en este bucket por ahora.</p>
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
                        {miembroActivo.nombre}
                      </p>
                      <p className="text-sm text-gray-400">Matrícula #{miembroActivo.matricula}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      {miembroActivo.telefono_revisar && (
                        <span className="bg-orange-100 text-orange-700 text-xs font-bold px-2.5 py-1 rounded-full border border-orange-200">
                          ⚠ Revisar teléfono
                        </span>
                      )}
                      {miembroActivo.segmento_montero && (
                        <span
                          className="text-xs font-bold px-2.5 py-1 rounded-full text-white"
                          style={{ backgroundColor: 'var(--color-dorado)' }}
                        >
                          ★ Montero
                        </span>
                      )}
                    </div>
                  </div>

                  {miembroActivo.telefono ? (
                    <div className="flex items-center gap-2">
                      <a
                        href={`tel:${miembroActivo.telefono}`}
                        className="font-bold text-2xl hover:underline"
                        style={{ color: 'var(--color-real)' }}
                      >
                        {miembroActivo.telefono}
                      </a>
                      <button
                        onClick={() => navigator.clipboard.writeText(miembroActivo.telefono!)}
                        className="text-xs text-gray-400 hover:text-gray-700 border border-gray-200 rounded-md px-2 py-1 transition-colors"
                      >
                        Copiar
                      </button>
                    </div>
                  ) : (
                    <p className="text-gray-400 text-sm italic">Sin teléfono registrado</p>
                  )}

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                    {miembroActivo.vencimiento && (
                      <span className="text-gray-600">
                        Vence: <strong>{formatVencimiento(miembroActivo.vencimiento)}</strong>
                      </span>
                    )}
                    {miembroActivo.intentos_no_contesta > 0 && (
                      <span className="text-orange-600 font-semibold">
                        Intento {miembroActivo.intentos_no_contesta} de 3
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
                      onClick={liberarMiembro}
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
                        <p className="font-semibold text-gray-900 truncate text-sm">{item.miembro.nombre}</p>
                        <p className="text-sm text-gray-600">{item.miembro.telefono ?? '—'}</p>
                        <p className={cn('text-xs mt-0.5', vencio ? 'text-orange-600 font-semibold' : 'text-gray-400')}>
                          {vencio ? '⏰ ' : ''}{formatFechaHora(item.callbackAt)}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant={miembroActivo ? 'secondary' : 'default'}
                        onClick={() => cargarDesdeCallback(item)}
                        disabled={!!miembroActivo}
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
                      <p className="text-sm font-medium text-gray-900 truncate">{l.miembro_nombre}</p>
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
          VISTA: Contactados
      ════════════════════════════════════════ */}
      {pestañaActiva === 'contactados' && (
        <section aria-label="Contactados manualmente">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
            Seguimiento contactados a mano{contactados.length > 0 ? ` · ${contactados.length} pendientes` : ''}
          </h2>

          {contactados.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
              <p className="text-gray-400 text-sm">No hay miembros pendientes en tu lista manual.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {contactados.map((item) => {
                const abierta = filaExpandida === item.id
                return (
                  <div
                    key={item.id}
                    className="bg-white rounded-xl border border-gray-100 overflow-hidden"
                  >
                    {/* Cabecera de fila */}
                    <button
                      className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-gray-50 transition-colors"
                      onClick={() => abierta ? cerrarFila() : abrirFila(item.id)}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 text-sm truncate">{item.nombre}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          #{item.matricula} · {item.telefono ?? 'Sin teléfono'}
                        </p>
                      </div>
                      <span className="text-xs text-gray-400 shrink-0">
                        {abierta ? '▲ Cerrar' : '▼ Registrar'}
                      </span>
                    </button>

                    {/* Formulario inline */}
                    {abierta && (
                      <div className="border-t border-gray-100 px-4 py-4 space-y-4 bg-gray-50">
                        {errorC && (
                          <p className="text-red-600 text-xs bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                            {errorC}
                          </p>
                        )}

                        <div className="grid grid-cols-2 gap-2">
                          {BOTONES_RESULTADO.map(({ valor, label }) => (
                            <button
                              key={valor}
                              onClick={() => { setFormResultadoC(valor); setConfirmaPlanchaC(null); setErrorC(null) }}
                              className={cn(
                                'rounded-xl border-2 py-3 px-3 text-sm font-medium transition-colors text-left leading-tight',
                                formResultadoC === valor
                                  ? 'border-blue-500 bg-blue-50 text-blue-800'
                                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                              )}
                            >
                              {label}
                            </button>
                          ))}
                        </div>

                        {formResultadoC === 'efectiva' && (
                          <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-3">
                            <p className="text-sm font-semibold text-green-800">¿Confirmó apoyo a Plancha 1?</p>
                            <div className="grid grid-cols-2 gap-3">
                              <button
                                onClick={() => setConfirmaPlanchaC(true)}
                                className={cn(
                                  'rounded-xl border-2 py-3 font-semibold text-sm transition-colors',
                                  confirmaPlanchaC === true
                                    ? 'border-green-600 bg-green-600 text-white'
                                    : 'border-green-400 text-green-700 hover:bg-green-100'
                                )}
                              >
                                ✓ Sí, confirma
                              </button>
                              <button
                                onClick={() => setConfirmaPlanchaC(false)}
                                className={cn(
                                  'rounded-xl border-2 py-3 font-semibold text-sm transition-colors',
                                  confirmaPlanchaC === false
                                    ? 'border-red-500 bg-red-500 text-white'
                                    : 'border-red-300 text-red-600 hover:bg-red-50'
                                )}
                              >
                                ✗ No confirma
                              </button>
                            </div>
                          </div>
                        )}

                        {formResultadoC === 'volver_a_llamar' && (
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                              Fecha y hora para volver a llamar *
                            </label>
                            <input
                              type="datetime-local"
                              value={callbackAtC}
                              onChange={e => setCallbackAtC(e.target.value)}
                              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                            />
                          </div>
                        )}

                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                            Notas (opcional)
                          </label>
                          <textarea
                            value={notasC}
                            onChange={e => setNotasC(e.target.value)}
                            rows={2}
                            placeholder="Observaciones…"
                            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                          />
                        </div>

                        <div className="flex gap-3">
                          <Button
                            onClick={() => guardarLlamadaContactado(item.id)}
                            disabled={guardandoC || !puedeGuardarC}
                            className="flex-1 h-11 text-sm font-semibold"
                            style={puedeGuardarC ? { backgroundColor: 'var(--color-exito)' } : undefined}
                          >
                            {guardandoC ? 'Guardando…' : 'Guardar resultado'}
                          </Button>
                          <Button
                            variant="ghost"
                            onClick={cerrarFila}
                            disabled={guardandoC}
                            className="h-11 text-sm text-gray-500"
                          >
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </section>
      )}
    </div>
  )
}
