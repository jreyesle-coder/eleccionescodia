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
}

interface DeudaInfo {
  encontrado: boolean
  habilitado: boolean
  monto: number
}

interface Props {
  /** true = sin page chrome (header, banner, footer); se embebe en otra página */
  inline?: boolean
}

export default function BuscadorPublico({ inline = false }: Props) {
  const supabase = createClient()

  // ── Campos de búsqueda ──
  const [codigo, setCodigo]     = useState('')
  const [cedula, setCedula]     = useState('')

  // ── Estado de búsqueda ──
  const [colegiado, setColegiado]   = useState<ResultadoBusqueda | null>(null)
  const [buscando, setBuscando]     = useState(false)
  const [buscado, setBuscado]       = useState(false)
  const [error, setError]           = useState<string | null>(null)

  // ── Estado de deuda ──
  const [deudaInfo, setDeudaInfo]   = useState<DeudaInfo | null>(null)
  const [cargandoDeuda, setCargandoDeuda] = useState(false)

  // ── Estado para modal de preferencia ──
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
    if (!almacenada) return true // sin cédula en BD → no podemos validar, aceptamos
    const limpiar = (s: string) => s.replace(/[\s-]/g, '').toLowerCase()
    return limpiar(almacenada) === limpiar(ingresada)
  }

  const consultarDeuda = useCallback(async (r: ResultadoBusqueda, cedulaIngresada: string) => {
    const cedulaParaConsulta = r.cedula ?? cedulaIngresada
    if (!cedulaParaConsulta) return
    setCargandoDeuda(true)
    try {
      const res = await fetch('/api/consulta-deuda', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cedula: cedulaParaConsulta, codigo: String(r.codigo) }),
      })
      const d: DeudaInfo = await res.json()
      setDeudaInfo(d)
    } catch {
      // silencioso — no bloqueamos el flujo si falla la consulta de deuda
    } finally {
      setCargandoDeuda(false)
    }
  }, [])

  const buscar = useCallback(async () => {
    const codigoQ = codigo.trim()
    const cedulaQ = normalizarCedula(cedula)

    if (!codigoQ || !cedulaQ) return

    setBuscando(true)
    setError(null)
    setBuscado(false)
    setColegiado(null)
    setDeudaInfo(null)
    setVotoGuardado(null)
    setPreferencia(null)

    const { data, error: err } = await supabase.rpc('buscar_colegiado', { p_q: codigoQ })

    setBuscando(false)
    setBuscado(true)

    if (err) {
      setError('No se pudo realizar la búsqueda. Intenta de nuevo.')
      return
    }

    const lista = (data as ResultadoBusqueda[]) ?? []

    if (lista.length === 0) {
      setColegiado(null)
      return
    }

    const encontrado = lista[0]

    // Validar que la cédula ingresada coincide con la almacenada
    if (!cedulasCoinciden(encontrado.cedula, cedulaQ)) {
      setError('Los datos ingresados no coinciden. Verifica tu número de colegiado y cédula.')
      return
    }

    setColegiado(encontrado)
    consultarDeuda(encontrado, cedulaQ)
  }, [codigo, cedula, supabase, consultarDeuda])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    buscar()
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

  // ── Formulario de dos campos ──
  const formulario = (
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
  )

  // ── Bloque de deuda ──
  const bloqueDeuda = colegiado && (
    <div className="mt-3">
      {cargandoDeuda ? (
        <div className="rounded-xl px-4 py-3 bg-gray-50 border border-gray-100 text-xs text-gray-400 flex items-center gap-2">
          <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          Consultando estado de membresía…
        </div>
      ) : deudaInfo?.encontrado ? (
        deudaInfo.monto === 0 ? (
          <div className="rounded-xl px-4 py-3 bg-green-50 border border-green-200 text-sm text-green-700 font-semibold">
            ✓ Estás al día con el CODIA. No tienes deuda pendiente.
          </div>
        ) : (
          <div className="rounded-xl px-4 py-3 bg-amber-50 border border-amber-200 space-y-1">
            <p className="text-sm font-bold text-amber-800">
              Deuda pendiente: <span className="font-extrabold">${deudaInfo.monto.toLocaleString('es-DO')}</span>
            </p>
            <p className="text-xs text-amber-700">
              Para regularizar tu situación, pasa por las oficinas del CODIA más cercana.
            </p>
          </div>
        )
      ) : null}
    </div>
  )

  // ── Tarjeta del colegiado ──
  const tarjeta = buscado && !buscando && (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {!colegiado ? (
        <div className="px-5 py-10 text-center space-y-3">
          <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-3">
            <p className="text-sm font-medium">No encontramos tu registro en el padrón</p>
          </div>
          <p className="text-gray-500 text-sm">
            Pasa por las <span className="font-semibold">oficinas del CODIA</span> para verificar tu membresía.
          </p>
        </div>
      ) : (
        <div className="px-5 py-4 space-y-3">
          {/* Datos del colegiado */}
          <div>
            <p className="font-bold text-gray-900 text-base">{colegiado.nombre_completo}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              Colegiatura {colegiado.codigo}
              {colegiado.cedula && <> · CI: {colegiado.cedula}</>}
            </p>
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-gray-500">
            {colegiado.carrera  && <span>Profesión: <span className="font-medium text-gray-700">{colegiado.carrera}</span></span>}
            {colegiado.regional && <span>Regional: <span className="font-medium text-gray-700">{colegiado.regional}</span></span>}
            {colegiado.nucleo   && <span>Núcleo: <span className="font-medium text-gray-700">{colegiado.nucleo}</span></span>}
          </div>

          {colegiado.nuevo_integrante && (
            <div className="rounded-xl px-4 py-3 bg-amber-50 border border-amber-200 text-xs text-amber-800">
              Tu certificado de membresía está pendiente de procesamiento. Pasa por las oficinas del CODIA.
            </div>
          )}

          {/* Estado de deuda */}
          {bloqueDeuda}

          {/* Botón preferencia */}
          {!votoGuardado && (
            <button
              onClick={abrirModal}
              className="w-full py-2.5 rounded-xl text-sm font-semibold border-2 transition-all hover:opacity-90 mt-1"
              style={{ borderColor: 'var(--color-marino)', color: 'var(--color-marino)', backgroundColor: 'transparent' }}
            >
              Marcar mi preferencia de voto
            </button>
          )}

          {votoGuardado && (
            <div className="rounded-xl px-4 py-3 bg-green-50 border border-green-200 text-sm text-green-700 text-center font-semibold">
              ✓ Preferencia registrada. ¡Gracias, {votoGuardado}!
            </div>
          )}
        </div>
      )}
    </div>
  )

  // ── Modal preferencia de voto ──
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
                      preferencia === true ? 'bg-green-600 text-white border-green-600' : 'border-green-400 text-green-700 hover:bg-green-50'
                    }`}
                  >
                    ✓ George Richardson
                  </button>
                  <button
                    onClick={() => setPreferencia(false)}
                    className={`py-4 rounded-xl font-bold text-sm border-2 transition-all ${
                      preferencia === false ? 'bg-red-500 text-white border-red-500' : 'border-red-300 text-red-600 hover:bg-red-50'
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

  // ── Modo inline ──
  if (inline) {
    return (
      <>
        <div className="space-y-3">
          {formulario}
          {error && (
            <p className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</p>
          )}
          {tarjeta}
        </div>
        {modal}
      </>
    )
  }

  // ── Modo página completa ──
  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-fondo)' }}>
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <div>
            <h1 className="text-base font-bold" style={{ color: 'var(--color-marino)' }}>
              Consulta tu habilitación para votar
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">
              Ingresa tu número de colegiado y tu cédula
            </p>
          </div>
          {formulario}
          {error && (
            <p className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</p>
          )}
        </div>

        {tarjeta}

        <p className="text-center text-xs text-gray-400 pb-4">Sistema CODIA · Elecciones 2026</p>
      </div>

      {modal}
    </div>
  )
}
