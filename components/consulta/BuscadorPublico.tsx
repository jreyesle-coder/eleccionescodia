'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

interface ResultadoBusqueda {
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
  ya_registro: boolean
}

interface DeudaInfo {
  encontrado: boolean
  habilitado: boolean
  monto: number
}

interface Props {
  inline?: boolean
}

type Pantalla = 'form' | 'colegiado'

// Estado posible del bloque de deuda
type EstadoDeuda = 'cargando' | 'ok' | 'error'

export default function BuscadorPublico({ inline = false }: Props) {
  const supabase = createClient()

  const [pantalla, setPantalla] = useState<Pantalla>('form')

  const [codigo, setCodigo] = useState('')
  const [cedula, setCedula] = useState('')

  const [colegiado, setColegiado]         = useState<ResultadoBusqueda | null>(null)
  const [buscando, setBuscando]           = useState(false)
  const [errorBusqueda, setErrorBusqueda] = useState<string | null>(null)

  const [deudaInfo, setDeudaInfo]       = useState<DeudaInfo | null>(null)
  const [estadoDeuda, setEstadoDeuda]   = useState<EstadoDeuda>('cargando')

  const [modalAbierto, setModalAbierto]   = useState(false)
  const [preferencia, setPreferencia]     = useState<boolean | null>(null)
  const [guardandoVoto, setGuardandoVoto] = useState(false)
  const [votoGuardado, setVotoGuardado]   = useState<string | null>(null)
  const [errorVoto, setErrorVoto]         = useState<string | null>(null)

  function normalizarCedula(texto: string): string {
    const solo = texto.trim().replace(/[\s-]/g, '')
    if (/^\d{11}$/.test(solo)) {
      return `${solo.slice(0, 3)}-${solo.slice(3, 10)}-${solo.slice(10)}`
    }
    return texto.trim()
  }

  function cedulasCoinciden(almacenada: string | null, ingresada: string): boolean {
    if (!almacenada) return true
    const limpiar = (s: string) => s.replace(/[\s-]/g, '').toLowerCase()
    return limpiar(almacenada) === limpiar(ingresada)
  }

  // Consulta deuda — siempre setea estadoDeuda al terminar (ok o error)
  async function consultarDeuda(r: ResultadoBusqueda, cedulaIngresada: string) {
    const cedulaParaConsulta = r.cedula ?? cedulaIngresada
    try {
      const res = await fetch('/api/consulta-deuda', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cedula: cedulaParaConsulta, codigo: String(r.codigo) }),
      })
      const text = await res.text()
      let d: DeudaInfo
      try {
        d = JSON.parse(text)
      } catch {
        // Vercel devolvió HTML (timeout 504 u otro error de plataforma)
        console.error('[consulta-deuda] respuesta no-JSON:', text.slice(0, 200))
        setEstadoDeuda('error')
        return
      }
      setDeudaInfo(d)
      setEstadoDeuda('ok')
    } catch {
      setEstadoDeuda('error')
    }
  }

  const buscar = useCallback(async () => {
    const codigoQ = codigo.trim()
    const cedulaQ = normalizarCedula(cedula)
    if (!codigoQ || !cedulaQ) return

    setBuscando(true)
    setErrorBusqueda(null)
    setColegiado(null)
    setDeudaInfo(null)
    setVotoGuardado(null)
    setPreferencia(null)

    const { data, error: err } = await supabase.rpc('buscar_colegiado', { p_q: codigoQ })
    setBuscando(false)

    if (err) {
      setErrorBusqueda('No se pudo realizar la búsqueda. Intenta de nuevo.')
      return
    }

    const lista = (data as ResultadoBusqueda[]) ?? []

    if (lista.length === 0) {
      setErrorBusqueda('No encontramos tu registro en el padrón. Pasa por las oficinas del CODIA para verificar tu membresía.')
      return
    }

    const encontrado = lista[0]
    if (!cedulasCoinciden(encontrado.cedula, cedulaQ)) {
      setErrorBusqueda('Los datos ingresados no coinciden. Verifica tu número de colegiado y cédula.')
      return
    }

    // Activar spinner ANTES de cambiar pantalla para que el primer render ya lo muestre
    setEstadoDeuda('cargando')
    setColegiado(encontrado)
    setPantalla('colegiado')

    // Llamar sin await — corre en paralelo mientras el usuario ve la ficha
    consultarDeuda(encontrado, normalizarCedula(cedula))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codigo, cedula, supabase])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    buscar()
  }

  function volverAlFormulario() {
    setPantalla('form')
    setDeudaInfo(null)
    setEstadoDeuda('cargando')
    setVotoGuardado(null)
    setPreferencia(null)
    setModalAbierto(false)
    setErrorBusqueda(null)
  }

  function abrirModal() {
    setModalAbierto(true)
    setPreferencia(null)
    setVotoGuardado(null)
    setErrorVoto(null)
  }

  async function guardarPreferencia() {
    if (!colegiado || preferencia === null) return
    setGuardandoVoto(true)
    setErrorVoto(null)
    const cedulaParaRpc = colegiado.cedula ?? normalizarCedula(cedula)
    const { data, error: err } = await supabase.rpc('marcar_preferencia_verificate', {
      p_codigo:    String(colegiado.codigo),
      p_cedula:    cedulaParaRpc,
      p_simpatiza: preferencia,
    })
    setGuardandoVoto(false)
    if (err || !data?.ok) {
      setErrorVoto(data?.error ?? 'No se pudo guardar la preferencia. Intenta de nuevo.')
      return
    }
    setVotoGuardado(data.nombre)
  }

  // ═══════════════════════════════════════════════
  // BLOQUE DE DEUDA
  // ═══════════════════════════════════════════════
  function BloqueDeuda() {
    if (estadoDeuda === 'cargando') {
      return (
        <div className="rounded-xl px-4 py-3 bg-gray-50 border border-gray-100 flex items-center gap-3">
          <svg className="w-5 h-5 animate-spin shrink-0 text-gray-400" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          <p className="text-sm text-gray-500">Consultando tu estado de membresía…</p>
        </div>
      )
    }

    if (estadoDeuda === 'error') {
      return (
        <div className="rounded-xl px-4 py-3 bg-gray-50 border border-gray-100 text-sm text-gray-500">
          No se pudo consultar tu estado en este momento. Pasa por las oficinas del CODIA.
        </div>
      )
    }

    // estadoDeuda === 'ok' pero no encontrado (credenciales no reconocidas en el sistema del CODIA)
    if (!deudaInfo || !deudaInfo.encontrado) {
      return (
        <div className="rounded-xl px-4 py-3 bg-amber-50 border border-amber-200 space-y-1">
          <p className="text-sm font-bold text-amber-800">Estado pendiente de verificación</p>
          <p className="text-xs text-amber-700">No pudimos consultar tu estado en el sistema del CODIA. Pasa por las oficinas para verificar tu membresía.</p>
        </div>
      )
    }

    if (deudaInfo.monto === 0) {
      return (
        <div className="rounded-xl px-4 py-3 bg-green-50 border border-green-200">
          <p className="text-sm font-bold text-green-700">✓ Estás al día con el CODIA</p>
          <p className="text-xs text-green-600 mt-0.5">No tienes deuda pendiente.</p>
        </div>
      )
    }

    return (
      <div className="rounded-xl px-4 py-3 bg-amber-50 border border-amber-200 space-y-1">
        <p className="text-sm font-bold text-amber-800">
          Deuda pendiente: <span className="font-extrabold">${deudaInfo.monto.toLocaleString('es-DO')}</span>
        </p>
        <p className="text-xs text-amber-700">
          Para regularizar tu situación, pasa por las oficinas del CODIA más cercana.
        </p>
      </div>
    )
  }

  // ═══════════════════════════════════════════════
  // PANTALLA 1 — Formulario
  // ═══════════════════════════════════════════════
  const pantallaForm = (
    <div className="space-y-3">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="space-y-2">
          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1">
              Número de colegiado
            </label>
            <input
              type="text"
              value={codigo}
              onChange={e => setCodigo(e.target.value)}
              placeholder="Ej: 12345"
              required
              autoFocus={inline}
              className="w-full text-sm px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:border-transparent"
              style={{ '--tw-ring-color': 'var(--color-marino)' } as React.CSSProperties}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1">
              Número de cédula
            </label>
            <input
              type="text"
              value={cedula}
              onChange={e => setCedula(e.target.value)}
              placeholder="Ej: 001-0000000-0"
              required
              className="w-full text-sm px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:border-transparent"
              style={{ '--tw-ring-color': 'var(--color-marino)' } as React.CSSProperties}
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={buscando || !codigo.trim() || !cedula.trim()}
          className="w-full py-3 rounded-xl text-white text-sm font-semibold disabled:opacity-50"
          style={{ backgroundColor: 'var(--color-marino)' }}
        >
          {buscando ? 'Verificando…' : 'Verificarme'}
        </button>
      </form>

      {errorBusqueda && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-3 text-sm">
          {errorBusqueda}
        </div>
      )}
    </div>
  )

  // ═══════════════════════════════════════════════
  // PANTALLA 2 — Ficha del colegiado
  // ═══════════════════════════════════════════════
  const pantallaFicha = colegiado && (
    <div className="space-y-4">

      <button
        onClick={volverAlFormulario}
        className="inline-flex items-center gap-1.5 text-xs font-semibold transition-opacity hover:opacity-70"
        style={{ color: 'var(--color-marino)' }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5M12 5l-7 7 7 7" />
        </svg>
        Verificar otro colegiado
      </button>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-md overflow-hidden">

        <div className="px-5 py-4" style={{ backgroundColor: 'var(--color-marino)' }}>
          <p className="text-white font-extrabold text-lg leading-tight">{colegiado.nombre_completo}</p>
          <p className="text-blue-200 text-sm mt-0.5">
            Colegiatura {colegiado.codigo}
            {colegiado.cedula && <> · CI: {colegiado.cedula}</>}
          </p>
        </div>

        <div className="px-5 py-4 space-y-4">

          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
            {colegiado.carrera && (
              <div>
                <p className="text-gray-400 uppercase tracking-wide font-semibold">Profesión</p>
                <p className="font-semibold text-gray-800 mt-0.5">{colegiado.carrera}</p>
              </div>
            )}
            {colegiado.regional && (
              <div>
                <p className="text-gray-400 uppercase tracking-wide font-semibold">Regional</p>
                <p className="font-semibold text-gray-800 mt-0.5">{colegiado.regional}</p>
              </div>
            )}
            {colegiado.nucleo && (
              <div className="col-span-2">
                <p className="text-gray-400 uppercase tracking-wide font-semibold">Núcleo</p>
                <p className="font-semibold text-gray-800 mt-0.5">{colegiado.nucleo}</p>
              </div>
            )}
          </div>

          <div className="h-px bg-gray-100" />

          {/* Estado de membresía — siempre visible */}
          {colegiado.nuevo_integrante ? (
            <div className="rounded-xl px-4 py-3 bg-amber-50 border border-amber-200 text-sm text-amber-800">
              <p className="font-semibold">Certificado pendiente</p>
              <p className="text-xs mt-0.5">Tu certificado de membresía está en proceso. Pasa por las oficinas del CODIA.</p>
            </div>
          ) : (
            <BloqueDeuda />
          )}

          {(votoGuardado || colegiado.ya_registro) && (
            <div className="rounded-xl px-4 py-3 bg-green-50 border border-green-200 text-center">
              <p className="text-sm font-bold text-green-700">✓ Preferencia registrada</p>
              <p className="text-xs text-green-600 mt-0.5">
                {votoGuardado ? `Gracias, ${votoGuardado}.` : 'Ya registraste tu intención de voto anteriormente.'}
              </p>
            </div>
          )}

          {!votoGuardado && !colegiado.ya_registro && (
            <button
              onClick={abrirModal}
              className="w-full py-3 rounded-xl text-sm font-bold border-2 transition-all hover:opacity-90"
              style={{ borderColor: 'var(--color-dorado)', color: 'white', backgroundColor: 'var(--color-dorado)' }}
            >
              Marcar mi preferencia de voto
            </button>
          )}

        </div>
      </div>
    </div>
  )

  // ═══════════════════════════════════════════════
  // MODAL — Preferencia de voto
  // ═══════════════════════════════════════════════
  const modal = modalAbierto && colegiado && (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(14,28,66,0.6)' }}
      onClick={() => setModalAbierto(false)}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-6 py-4" style={{ backgroundColor: 'var(--color-marino)' }}>
          <p className="text-white font-bold text-base">{colegiado.nombre_completo}</p>
          <p className="text-blue-200 text-sm">Colegiatura {colegiado.codigo}</p>
        </div>

        <div className="px-6 py-5 space-y-5">
          {votoGuardado ? (
            <div className="text-center space-y-3 py-4">
              <div className="text-5xl">🎉</div>
              <p className="font-bold text-green-700 text-lg">¡Preferencia registrada!</p>
              <p className="text-gray-500 text-sm">Gracias, {votoGuardado}. Tu preferencia ha sido guardada.</p>
              <button
                onClick={() => setModalAbierto(false)}
                className="mt-2 px-6 py-2.5 rounded-xl text-white font-semibold text-sm"
                style={{ backgroundColor: 'var(--color-marino)' }}
              >
                Cerrar
              </button>
            </div>
          ) : (
            <>
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-3">¿Cuál es tu preferencia de voto?</p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setPreferencia(true)}
                    className={`py-4 rounded-xl font-bold text-sm border-2 transition-all ${
                      preferencia === true
                        ? 'bg-green-600 text-white border-green-600'
                        : 'border-green-400 text-green-700 hover:bg-green-50'
                    }`}
                  >
                    ✓ George Richardson
                  </button>
                  <button
                    onClick={() => setPreferencia(false)}
                    className={`py-4 rounded-xl font-bold text-sm border-2 transition-all ${
                      preferencia === false
                        ? 'bg-red-500 text-white border-red-500'
                        : 'border-red-300 text-red-600 hover:bg-red-50'
                    }`}
                  >
                    ✗ Otra preferencia
                  </button>
                </div>
              </div>

              {errorVoto && (
                <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-xl px-3 py-2">{errorVoto}</p>
              )}

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setModalAbierto(false)}
                  className="py-3 rounded-xl text-sm font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={guardarPreferencia}
                  disabled={guardandoVoto || preferencia === null}
                  className="py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
                  style={{ backgroundColor: 'var(--color-marino)' }}
                >
                  {guardandoVoto ? 'Guardando…' : 'Confirmar'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )

  // ═══════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════
  const contenido = pantalla === 'form' ? pantallaForm : pantallaFicha

  if (inline) {
    return (
      <>
        {contenido}
        {modal}
      </>
    )
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-fondo)' }}>
      <div className="max-w-2xl mx-auto px-4 py-8">
        {contenido}
        <p className="text-center text-xs text-gray-400 pb-4 mt-8">Sistema CODIA · Elecciones 2026</p>
      </div>
      {modal}
    </div>
  )
}
