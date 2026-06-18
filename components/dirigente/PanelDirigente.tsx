'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import AppHeader from '@/components/app-header'
import { cn } from '@/lib/utils'

// ── Tipos ────────────────────────────────────────────────────────────────────

interface Colegiado {
  id: number
  codigo: string
  nombre_completo: string
  cedula: string | null
  telefono: string | null
  celular: string | null
  regional: string | null
  nucleo: string | null
  carrera: string | null
  pensionado: boolean
  nuevo_integrante: boolean
  tiene_deuda: boolean
  confirmado_por: string | null
}

interface MiembroPadron {
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

interface Confirmado {
  codigo: string
  nombre_completo: string
  regional: string | null
  nucleo: string | null
  confirmacion_intencion: string | null
  confirmacion_at: string | null
}

interface DeudaAPI {
  encontrado: boolean
  monto: number
}

// ── Constantes ───────────────────────────────────────────────────────────────

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

const ZONA = 'America/Santo_Domingo'

function fmtFecha(iso: string) {
  return new Date(iso).toLocaleString('es-DO', {
    timeZone: ZONA, day: '2-digit', month: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

// ── Componente ───────────────────────────────────────────────────────────────

interface Props {
  userId: string
  nombre: string
  rol: string
}

export default function PanelDirigente({ nombre, rol }: Props) {
  const supabase = createClient()

  // Pestañas
  const [pestañaActiva, setPestañaActiva] = useState<'buscar' | 'padron' | 'mis_confirmados'>('buscar')

  // ── Pestaña Buscar ────────────────────────────────────────────────────
  const [busqueda, setBusqueda]     = useState('')
  const [resultados, setResultados] = useState<Colegiado[]>([])
  const [buscando, setBuscando]     = useState(false)
  const [buscado, setBuscado]       = useState(false)

  // ── Modal confirmación (compartido entre Buscar y Padrón) ─────────────
  const [modalColegiado, setModalColegiado]   = useState<Colegiado | null>(null)
  const [modalIntencion, setModalIntencion]   = useState<string | null>(null)
  const [modalGuardando, setModalGuardando]   = useState(false)
  const [modalError, setModalError]           = useState<string | null>(null)

  // Toast post-confirmación
  const [toastNombre, setToastNombre]         = useState<string | null>(null)
  const [toastDeuda, setToastDeuda]           = useState<DeudaAPI | null>(null)
  const [consultandoDeuda, setConsultandoDeuda] = useState(false)

  // ── Mis confirmados ───────────────────────────────────────────────────
  const [misConfirmados, setMisConfirmados] = useState<Confirmado[]>([])
  const [cargandoMios, setCargandoMios]     = useState(false)

  // ── Padrón zona ───────────────────────────────────────────────────────
  const [padronZona, setPadronZona]         = useState<MiembroPadron[]>([])
  const [cargandoPadron, setCargandoPadron] = useState(false)
  const [padronCargado, setPadronCargado]   = useState(false)
  const [filtroNucleo, setFiltroNucleo]     = useState('')
  const [busquedaPadron, setBusquedaPadron] = useState('')

  // Tarjeta de detalle del padrón
  const [detalle, setDetalle]                   = useState<MiembroPadron | null>(null)
  const [detalleDeuda, setDetalleDeuda]         = useState<DeudaAPI | null>(null)
  const [cargandoDetalleDeuda, setCargandoDetalleDeuda] = useState(false)
  const [detalleIntencion, setDetalleIntencion] = useState<string | null>(null)
  const [detalleGuardando, setDetalleGuardando] = useState(false)
  const [detalleError, setDetalleError]         = useState<string | null>(null)

  // ── Acciones: Buscar ──────────────────────────────────────────────────

  const buscar = useCallback(async (q: string) => {
    if (q.trim().length < 3) return
    setBuscando(true); setBuscado(false)
    const { data } = await supabase.rpc('buscar_colegiado', { p_q: q.trim() })
    setBuscando(false); setBuscado(true)
    setResultados((data as Colegiado[]) ?? [])
  }, [supabase])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    buscar(busqueda)
  }

  // ── Acciones: Modal confirmación (desde Buscar) ───────────────────────

  function abrirModal(c: Colegiado) {
    setModalColegiado(c)
    setModalIntencion(null)
    setModalError(null)
    setToastNombre(null)
    setToastDeuda(null)
  }

  async function guardarModal() {
    if (!modalColegiado || !modalIntencion || modalGuardando) return
    setModalGuardando(true); setModalError(null)

    const { error } = await supabase.rpc('confirmar_colegiado', {
      p_codigo: modalColegiado.codigo, p_intencion: modalIntencion,
    })
    setModalGuardando(false)

    if (error) {
      const msg = error.message ?? ''
      setModalError(
        msg.startsWith('Ya confirmado por') ? msg + '. No puedes re-confirmar.'
        : msg.includes('pertenece a otra regional') ? 'Este colegiado no pertenece a tu regional.'
        : 'No se pudo guardar. Intenta de nuevo.'
      )
      return
    }

    setToastNombre(modalColegiado.nombre_completo)
    setModalColegiado(null)
    setModalIntencion(null)

    if (modalColegiado.cedula) {
      setConsultandoDeuda(true)
      try {
        const res = await fetch('/api/consulta-deuda', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cedula: modalColegiado.cedula, codigo: modalColegiado.codigo }),
        })
        const data = await res.json() as DeudaAPI
        setToastDeuda(data)
        if (data.encontrado && data.monto > 0) {
          await supabase.rpc('actualizar_deuda', { p_codigo: modalColegiado.codigo, p_monto_nuevo: data.monto })
        }
      } catch { /* no interrumpir */ } finally { setConsultandoDeuda(false) }
    }
  }

  // ── Acciones: Mis confirmados ─────────────────────────────────────────

  async function cargarMisConfirmados() {
    setCargandoMios(true)
    const { data } = await supabase.rpc('listar_confirmados_dirigente', { p_dirigente: nombre })
    setCargandoMios(false)
    setMisConfirmados((data as Confirmado[]) ?? [])
  }

  // ── Acciones: Padrón zona ─────────────────────────────────────────────

  async function cargarPadronZona() {
    if (padronCargado) return
    setCargandoPadron(true)
    const { data } = await supabase.rpc('padron_zona_dirigente').limit(5000)
    setCargandoPadron(false); setPadronCargado(true)
    setPadronZona((data as MiembroPadron[]) ?? [])
  }

  async function abrirDetalle(m: MiembroPadron) {
    setDetalle(m)
    setDetalleDeuda(null)
    setDetalleIntencion(null)
    setDetalleError(null)

    // Consultar deuda real al abrir la tarjeta
    if (m.cedula) {
      setCargandoDetalleDeuda(true)
      try {
        const res = await fetch('/api/consulta-deuda', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cedula: m.cedula, codigo: m.codigo }),
        })
        const data = await res.json() as DeudaAPI
        setDetalleDeuda(data)
        if (data.encontrado && data.monto > 0) {
          await supabase.rpc('actualizar_deuda', { p_codigo: m.codigo, p_monto_nuevo: data.monto })
          setPadronZona(prev => prev.map(x => x.codigo === m.codigo ? { ...x, monto_deuda: data.monto, tiene_deuda: true } : x))
        }
      } catch { /* no interrumpir */ } finally { setCargandoDetalleDeuda(false) }
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
        msg.startsWith('Ya confirmado por') ? msg + '. No puedes re-confirmar.'
        : msg.includes('pertenece a otra regional') ? 'Este colegiado no pertenece a tu regional.'
        : 'No se pudo guardar. Intenta de nuevo.'
      )
      return
    }

    // Actualizar estado local en la lista
    const codigo = detalle.codigo
    const intencion = detalleIntencion
    setPadronZona(prev => prev.map(x =>
      x.codigo === codigo ? { ...x, confirmado_por: nombre, confirmacion_intencion: intencion } : x
    ))
    setDetalle(prev => prev ? { ...prev, confirmado_por: nombre, confirmacion_intencion: intencion } : prev)
    setDetalleIntencion(null)
  }

  // ── Navegación pestañas ───────────────────────────────────────────────

  function cambiarPestaña(p: 'buscar' | 'padron' | 'mis_confirmados') {
    setPestañaActiva(p)
    setToastNombre(null); setToastDeuda(null)
    if (p === 'mis_confirmados') cargarMisConfirmados()
    if (p === 'padron') cargarPadronZona()
  }

  // ── Filtros padrón ────────────────────────────────────────────────────

  const nucleos = Array.from(new Set(padronZona.map(m => m.nucleo ?? '').filter(Boolean))).sort()

  const padronFiltrado = padronZona.filter(m => {
    const ok1 = !filtroNucleo || m.nucleo === filtroNucleo
    const q = busquedaPadron.trim().toLowerCase()
    const ok2 = !q || m.nombre_completo.toLowerCase().includes(q) || m.codigo.includes(q)
    return ok1 && ok2
  })

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-fondo)' }}>
      <AppHeader nombreUsuario={nombre} rol={rol === 'colaborador' ? 'Colaborador' : 'Dirigente'} />

      <div className="max-w-xl mx-auto px-4 py-6 space-y-5">

        {/* Pestañas */}
        <div className="flex border-b border-gray-200 overflow-x-auto">
          {([
            { key: 'buscar',          label: 'Buscar' },
            { key: 'padron',          label: 'Padrón de mi zona' },
            { key: 'mis_confirmados', label: 'Mis confirmados' },
          ] as { key: 'buscar' | 'padron' | 'mis_confirmados'; label: string }[]).map(({ key, label }) => (
            <button key={key} onClick={() => cambiarPestaña(key)}
              className={cn(
                'px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors whitespace-nowrap',
                pestañaActiva === key ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700'
              )}
            >{label}</button>
          ))}
        </div>

        {/* Toast post-confirmación */}
        {toastNombre && (
          <div className="bg-green-50 border border-green-200 text-green-800 rounded-2xl px-5 py-4 text-sm space-y-1.5">
            <p className="font-semibold">✓ Confirmado: <strong>{toastNombre}</strong></p>
            {consultandoDeuda && <p className="text-xs text-green-600 animate-pulse">Consultando deuda en CODIA en línea…</p>}
            {!consultandoDeuda && toastDeuda && (
              toastDeuda.monto > 0
                ? <p className="text-xs font-semibold text-orange-700 bg-orange-50 border border-orange-200 rounded-lg px-3 py-1.5">
                    ⚠ Deuda: <span className="text-base font-black">RD$ {toastDeuda.monto.toLocaleString()}</span> — registrada automáticamente.
                  </p>
                : toastDeuda.encontrado
                  ? <p className="text-xs text-green-700">✅ Sin deuda en CODIA en línea.</p>
                  : null
            )}
          </div>
        )}

        {/* ══ TAB: BUSCAR ══ */}
        {pestañaActiva === 'buscar' && (
          <>
            <form onSubmit={handleSubmit} className="flex gap-2">
              <input type="text" value={busqueda}
                onChange={e => { setBusqueda(e.target.value); setBuscado(false); setResultados([]) }}
                placeholder="Nombre, colegiatura o cédula…"
                className="flex-1 text-sm px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2"
                style={{ '--tw-ring-color': 'var(--color-marino)' } as React.CSSProperties}
              />
              <button type="submit" disabled={buscando || busqueda.trim().length < 3}
                className="px-5 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-50"
                style={{ backgroundColor: 'var(--color-marino)' }}
              >{buscando ? 'Buscando…' : 'Buscar'}</button>
            </form>

            {buscado && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100">
                  <p className="text-sm font-semibold text-gray-700">
                    {resultados.length === 0 ? 'Sin resultados' : `${resultados.length} resultado${resultados.length !== 1 ? 's' : ''}`}
                  </p>
                </div>
                <div className="divide-y divide-gray-50">
                  {resultados.map(r => (
                    <div key={r.id} className="px-5 py-4 space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-gray-900 text-sm">{r.nombre_completo}</p>
                          <p className="text-xs text-gray-400">Colegiatura {r.codigo}{r.cedula && <> · CI: {r.cedula}</>}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          {r.pensionado     && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">Pensionado</span>}
                          {r.tiene_deuda    && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">Con deuda</span>}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-gray-500">
                        {r.carrera  && <span>Profesión: <span className="font-medium text-gray-700">{r.carrera}</span></span>}
                        {r.regional && <span>Regional: <span className="font-medium text-gray-700">{r.regional}</span></span>}
                        {r.nucleo   && <span>Núcleo: <span className="font-medium text-gray-700">{r.nucleo}</span></span>}
                      </div>
                      {r.confirmado_por ? (
                        <div className="w-full py-2 rounded-xl text-xs font-semibold text-center bg-gray-100 text-gray-500 border border-gray-200">
                          ✓ Ya confirmado por {r.confirmado_por}
                        </div>
                      ) : (
                        <button onClick={() => abrirModal(r)}
                          className="w-full py-2.5 rounded-xl text-sm font-semibold border-2 transition-all hover:opacity-90"
                          style={{ borderColor: 'var(--color-marino)', color: 'var(--color-marino)' }}
                        >Marcar intención →</button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* ══ TAB: PADRÓN DE MI ZONA ══ */}
        {pestañaActiva === 'padron' && (
          cargandoPadron ? (
            <p className="text-center text-gray-400 py-10">Cargando padrón…</p>
          ) : (
            <div className="space-y-3">
              {/* Filtros */}
              <div className="flex flex-col sm:flex-row gap-2">
                <input type="text" value={busquedaPadron}
                  onChange={e => setBusquedaPadron(e.target.value)}
                  placeholder="Buscar por nombre o colegiatura…"
                  className="flex-1 text-sm px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2"
                  style={{ '--tw-ring-color': 'var(--color-marino)' } as React.CSSProperties}
                />
                <select value={filtroNucleo} onChange={e => setFiltroNucleo(e.target.value)}
                  className="text-sm px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 bg-white"
                  style={{ '--tw-ring-color': 'var(--color-marino)' } as React.CSSProperties}
                >
                  <option value="">Todos los núcleos</option>
                  {nucleos.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>

              {/* Contador */}
              <div className="flex items-center justify-between px-1">
                <p className="text-xs text-gray-500">
                  {padronFiltrado.length} de {padronZona.length} colegiados
                  {filtroNucleo && <> · <span className="font-semibold text-gray-700">{filtroNucleo}</span></>}
                </p>
                {(busquedaPadron || filtroNucleo) && (
                  <button onClick={() => { setBusquedaPadron(''); setFiltroNucleo('') }}
                    className="text-xs text-blue-600 hover:underline">Limpiar filtros</button>
                )}
              </div>

              {/* Lista — cada fila es una tarjeta clickeable */}
              {padronCargado && padronFiltrado.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-10 text-center">
                  <p className="text-gray-400 text-sm">No hay resultados para estos filtros.</p>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="divide-y divide-gray-50">
                    {padronFiltrado.map(m => (
                      <button
                        key={m.id}
                        onClick={() => abrirDetalle(m)}
                        className="w-full text-left px-5 py-3.5 flex items-center justify-between gap-3 hover:bg-gray-50 active:bg-gray-100 transition-colors"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-gray-900 truncate">{m.nombre_completo}</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            #{m.codigo}
                            {m.nucleo && <> · {m.nucleo}</>}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          {m.confirmacion_intencion ? (
                            <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full', INTENCION_COLOR[m.confirmacion_intencion])}>
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
              )}
            </div>
          )
        )}

        {/* ══ TAB: MIS CONFIRMADOS ══ */}
        {pestañaActiva === 'mis_confirmados' && (
          cargandoMios ? (
            <p className="text-center text-gray-400 py-10">Cargando…</p>
          ) : misConfirmados.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-12 text-center">
              <p className="text-gray-400 text-sm">Aún no has confirmado colegiados.</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100">
                <p className="text-sm font-semibold text-gray-700">{misConfirmados.length} confirmados</p>
              </div>
              <div className="divide-y divide-gray-50">
                {misConfirmados.map(c => (
                  <div key={c.codigo} className="px-5 py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{c.nombre_completo}</p>
                      <p className="text-xs text-gray-400">
                        #{c.codigo}{c.regional && ` · ${c.regional}`}
                        {c.confirmacion_at && ` · ${fmtFecha(c.confirmacion_at)}`}
                      </p>
                    </div>
                    {c.confirmacion_intencion && (
                      <span className={cn('text-xs font-semibold px-2.5 py-1 rounded-full shrink-0', INTENCION_COLOR[c.confirmacion_intencion] ?? 'bg-gray-100 text-gray-600')}>
                        {INTENCION_LABEL[c.confirmacion_intencion] ?? c.confirmacion_intencion}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )
        )}
      </div>

      {/* ══ MODAL: confirmación desde Buscar ══ */}
      {modalColegiado && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(14,28,66,0.6)' }}
          onClick={() => setModalColegiado(null)}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 space-y-0.5" style={{ backgroundColor: 'var(--color-marino)' }}>
              <p className="text-white font-bold text-base">{modalColegiado.nombre_completo}</p>
              <p className="text-blue-200 text-sm">Colegiatura {modalColegiado.codigo}</p>
              {modalColegiado.nucleo && <p className="text-blue-200 text-xs">{modalColegiado.nucleo}</p>}
              {modalColegiado.tiene_deuda && (
                <span className="inline-block text-[11px] font-bold px-2 py-0.5 rounded-full bg-orange-400 text-white mt-1">
                  ⚠ Tiene deuda registrada
                </span>
              )}
            </div>
            <div className="px-6 py-5 space-y-4">
              <p className="text-sm font-semibold text-gray-700">¿Cuál es la intención de este colegiado?</p>
              <div className="space-y-2">
                {(['favorable', 'indeciso', 'en_contra'] as const).map(val => (
                  <button key={val} onClick={() => setModalIntencion(val)}
                    className={cn('w-full py-3 rounded-xl font-semibold text-sm border-2 transition-all',
                      modalIntencion === val ? INTENCION_ACTIVE[val] : INTENCION_BORDER[val] + ' hover:opacity-80'
                    )}
                  >
                    {val === 'favorable' ? '✓ Favorable a George Richardson'
                     : val === 'indeciso' ? '~ Indeciso / Por decidir'
                     : '✗ En contra / Otra preferencia'}
                  </button>
                ))}
              </div>
              {modalError && <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-xl px-3 py-2">{modalError}</p>}
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setModalColegiado(null)}
                  className="py-3 rounded-xl text-sm font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50">Cancelar</button>
                <button onClick={guardarModal} disabled={modalGuardando || !modalIntencion}
                  className="py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
                  style={{ backgroundColor: 'var(--color-marino)' }}
                >{modalGuardando ? 'Guardando…' : 'Confirmar'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ PANEL DE DETALLE: colegiado del padrón ══ */}
      {detalle && (
        <div className="fixed inset-0 z-50 flex flex-col" style={{ backgroundColor: 'var(--color-fondo)' }}>

          {/* Header con botón volver */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 bg-white shrink-0">
            <button onClick={() => setDetalle(null)}
              className="flex items-center gap-1 text-sm font-semibold text-blue-600 hover:text-blue-800"
            >
              ‹ Volver al padrón
            </button>
          </div>

          {/* Cuerpo scrolleable */}
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-xl mx-auto px-4 py-6 space-y-5">

              {/* Cabecera del colegiado */}
              <div className="rounded-2xl overflow-hidden shadow-sm">
                <div className="px-6 py-5" style={{ backgroundColor: 'var(--color-marino)' }}>
                  <p className="text-white font-bold text-lg leading-tight">{detalle.nombre_completo}</p>
                  <p className="text-blue-200 text-sm mt-1">Colegiatura #{detalle.codigo}</p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {detalle.pensionado      && <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-purple-400 text-white">Pensionado</span>}
                    {detalle.nuevo_integrante && <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-blue-400 text-white">Nuevo integrante</span>}
                  </div>
                </div>

                {/* Datos personales */}
                <div className="bg-white px-6 py-4 space-y-3">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Datos personales</p>
                  <div className="grid grid-cols-1 gap-2">
                    {detalle.cedula && <Fila label="Cédula" valor={detalle.cedula} />}
                    {detalle.celular   && <Fila label="Celular" valor={detalle.celular} />}
                    {detalle.telefono  && <Fila label="Teléfono" valor={detalle.telefono} />}
                  </div>
                </div>

                {/* Datos CODIA */}
                <div className="bg-gray-50 px-6 py-4 space-y-3 border-t border-gray-100">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Datos CODIA</p>
                  <div className="grid grid-cols-1 gap-2">
                    {detalle.carrera         && <Fila label="Profesión"         valor={detalle.carrera} />}
                    {detalle.nucleo          && <Fila label="Núcleo"            valor={detalle.nucleo} />}
                    {detalle.regional        && <Fila label="Regional"          valor={detalle.regional} />}
                    {detalle.provincia       && <Fila label="Provincia"         valor={detalle.provincia} />}
                    {detalle.centro_votacion && <Fila label="Centro de votación" valor={detalle.centro_votacion} />}
                  </div>
                </div>

                {/* Deuda */}
                <div className="bg-white px-6 py-4 border-t border-gray-100 space-y-2">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Estado de deuda</p>
                  {!detalle.cedula ? (
                    <p className="text-sm text-gray-400">Sin cédula registrada — no se puede consultar.</p>
                  ) : cargandoDetalleDeuda ? (
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

              {/* Estado de confirmación o botones de intención */}
              {detalle.confirmado_por ? (
                <div className={cn(
                  'rounded-2xl px-6 py-5 text-center space-y-1',
                  detalle.confirmacion_intencion
                    ? INTENCION_COLOR[detalle.confirmacion_intencion]
                    : 'bg-gray-100 text-gray-600'
                )}>
                  <p className="font-bold text-base">
                    {detalle.confirmacion_intencion ? INTENCION_LABEL[detalle.confirmacion_intencion] : '✓ Confirmado'}
                  </p>
                  <p className="text-sm opacity-80">Por: {detalle.confirmado_por}</p>
                  {detalle.confirmacion_at && (
                    <p className="text-xs opacity-60">{fmtFecha(detalle.confirmacion_at)}</p>
                  )}
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-5 space-y-4">
                  <p className="text-sm font-bold text-gray-700">¿Cuál es la intención de este colegiado?</p>
                  <div className="space-y-2">
                    {(['favorable', 'indeciso', 'en_contra'] as const).map(val => (
                      <button key={val} onClick={() => setDetalleIntencion(val)}
                        className={cn('w-full py-3.5 rounded-xl font-semibold text-sm border-2 transition-all',
                          detalleIntencion === val ? INTENCION_ACTIVE[val] : INTENCION_BORDER[val] + ' hover:opacity-80'
                        )}
                      >
                        {val === 'favorable' ? '✓ Favorable a George Richardson'
                         : val === 'indeciso' ? '~ Indeciso / Por decidir'
                         : '✗ En contra / Otra preferencia'}
                      </button>
                    ))}
                  </div>
                  {detalleError && (
                    <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-xl px-3 py-2">{detalleError}</p>
                  )}
                  <button
                    onClick={guardarDetalle}
                    disabled={detalleGuardando || !detalleIntencion}
                    className="w-full py-3.5 rounded-xl text-white font-bold text-sm disabled:opacity-40 transition-opacity"
                    style={{ backgroundColor: 'var(--color-marino)' }}
                  >
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

// Componente auxiliar para filas de datos
function Fila({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-xs text-gray-400 shrink-0">{label}</span>
      <span className="text-sm font-medium text-gray-800 text-right">{valor}</span>
    </div>
  )
}
