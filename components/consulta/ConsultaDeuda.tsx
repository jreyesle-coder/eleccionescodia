'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

interface ResultadoBusqueda {
  id: number
  codigo: string
  nombre_completo: string
  cedula: string | null
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
  regional?: string | null
  centro_votacion?: string | null
  nucleo?: string | null
  posicion?: number | null
}

type Pantalla = 'form' | 'lista' | 'ficha'
type EstadoDeuda = 'cargando' | 'ok' | 'error'

export default function ConsultaDeuda() {
  const supabase = createClient()

  const [pantalla, setPantalla] = useState<Pantalla>('form')
  const [query, setQuery] = useState('')

  const [resultados, setResultados]       = useState<ResultadoBusqueda[]>([])
  const [colegiado, setColegiado]         = useState<ResultadoBusqueda | null>(null)
  const [buscando, setBuscando]           = useState(false)
  const [errorBusqueda, setErrorBusqueda] = useState<string | null>(null)

  const [deudaInfo, setDeudaInfo]     = useState<DeudaInfo | null>(null)
  const [estadoDeuda, setEstadoDeuda] = useState<EstadoDeuda>('cargando')

  // Consulta el estado real de deuda + centro de votación en el portal del CODIA
  async function consultarDeuda(r: ResultadoBusqueda) {
    setEstadoDeuda('cargando')
    setDeudaInfo(null)
    try {
      const res = await fetch('/api/consulta-deuda', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codigo: String(r.codigo), cedula: r.cedula ?? undefined }),
      })
      const text = await res.text()
      let d: DeudaInfo
      try {
        d = JSON.parse(text)
      } catch {
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

  function seleccionar(r: ResultadoBusqueda) {
    setColegiado(r)
    setPantalla('ficha')
    consultarDeuda(r)
  }

  const buscar = useCallback(async () => {
    const q = query.trim()
    if (q.length < 3) {
      setErrorBusqueda('Ingresa tu número de colegiado o tu cédula.')
      return
    }

    setBuscando(true)
    setErrorBusqueda(null)
    setResultados([])
    setColegiado(null)
    setDeudaInfo(null)

    const { data, error: err } = await supabase.rpc('buscar_colegiado', { p_q: q })
    setBuscando(false)

    if (err) {
      setErrorBusqueda('No se pudo realizar la consulta. Intenta de nuevo.')
      return
    }

    let lista = (data as ResultadoBusqueda[]) ?? []

    // Si la consulta es una cédula (11 dígitos), exigir coincidencia EXACTA.
    // El RPC busca por ilike '%q%'; aquí filtramos para no exponer registros de terceros.
    const soloDigitos = q.replace(/[\s-]/g, '')
    if (/^\d{11}$/.test(soloDigitos)) {
      lista = lista.filter(r => (r.cedula ?? '').replace(/[\s-]/g, '') === soloDigitos)
    }

    if (lista.length === 0) {
      setErrorBusqueda('No encontramos ese registro en el padrón. Verifica el número o pasa por las oficinas del CODIA.')
      return
    }

    if (lista.length === 1) {
      seleccionar(lista[0])
      return
    }

    // Varias coincidencias (búsqueda por cédula parcial) → mostrar lista
    setResultados(lista)
    setPantalla('lista')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, supabase])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    buscar()
  }

  function volver() {
    setPantalla('form')
    setResultados([])
    setColegiado(null)
    setDeudaInfo(null)
    setEstadoDeuda('cargando')
    setErrorBusqueda(null)
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
          No se pudo consultar tu estado en este momento. Intenta más tarde o pasa por las oficinas del CODIA.
        </div>
      )
    }

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
          <p className="text-xs text-green-600 mt-0.5">No tienes deuda pendiente. Estás habilitado para votar.</p>
        </div>
      )
    }

    return (
      <div className="rounded-xl px-4 py-3 bg-amber-50 border border-amber-200 space-y-1">
        <p className="text-sm font-bold text-amber-800">
          Deuda pendiente: <span className="font-extrabold">${deudaInfo.monto.toLocaleString('es-DO')}</span>
        </p>
        <p className="text-xs text-amber-700">
          Para regularizar tu situación y habilitar tu voto, pasa por la oficina del CODIA más cercana.
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
        <div>
          <label className="text-xs font-semibold text-gray-600 block mb-1">
            Número de colegiado o cédula
          </label>
          <input
            type="text"
            inputMode="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Ej: 12345  ·  001-0000000-0"
            required
            autoFocus
            className="w-full text-sm px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:border-transparent"
            style={{ '--tw-ring-color': 'var(--color-marino)' } as React.CSSProperties}
          />
        </div>
        <button
          type="submit"
          disabled={buscando || query.trim().length < 3}
          className="w-full py-3 rounded-xl text-white text-sm font-semibold disabled:opacity-50"
          style={{ backgroundColor: 'var(--color-marino)' }}
        >
          {buscando ? 'Consultando…' : 'Consultar'}
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
  // PANTALLA 2 — Lista de coincidencias
  // ═══════════════════════════════════════════════
  const pantallaLista = (
    <div className="space-y-3">
      <button
        onClick={volver}
        className="inline-flex items-center gap-1.5 text-xs font-semibold transition-opacity hover:opacity-70"
        style={{ color: 'var(--color-marino)' }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5M12 5l-7 7 7 7" />
        </svg>
        Nueva consulta
      </button>
      <p className="text-sm text-gray-600">Encontramos varias coincidencias. Selecciona tu registro:</p>
      <div className="space-y-2">
        {resultados.map(r => (
          <button
            key={r.id}
            onClick={() => seleccionar(r)}
            className="w-full text-left rounded-xl border border-gray-200 px-4 py-3 hover:bg-gray-50 transition-colors"
          >
            <p className="text-sm font-semibold text-gray-800">{r.nombre_completo}</p>
            <p className="text-xs text-gray-500">
              Colegiatura {r.codigo}{r.cedula && <> · CI: {r.cedula}</>}
            </p>
          </button>
        ))}
      </div>
    </div>
  )

  // ═══════════════════════════════════════════════
  // PANTALLA 3 — Ficha del colegiado
  // ═══════════════════════════════════════════════
  const pantallaFicha = colegiado && (
    <div className="space-y-4">
      <button
        onClick={volver}
        className="inline-flex items-center gap-1.5 text-xs font-semibold transition-opacity hover:opacity-70"
        style={{ color: 'var(--color-marino)' }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5M12 5l-7 7 7 7" />
        </svg>
        Nueva consulta
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
            {(deudaInfo?.regional || colegiado.regional) && (
              <div>
                <p className="text-gray-400 uppercase tracking-wide font-semibold">Regional</p>
                <p className="font-semibold text-gray-800 mt-0.5">{deudaInfo?.regional || colegiado.regional}</p>
              </div>
            )}
            {(deudaInfo?.nucleo || colegiado.nucleo) && (
              <div className="col-span-2">
                <p className="text-gray-400 uppercase tracking-wide font-semibold">Núcleo</p>
                <p className="font-semibold text-gray-800 mt-0.5">{deudaInfo?.nucleo || colegiado.nucleo}</p>
              </div>
            )}
            {deudaInfo?.centro_votacion && (
              <div className="col-span-2">
                <p className="text-gray-400 uppercase tracking-wide font-semibold">Centro de votación</p>
                <p className="font-semibold text-gray-800 mt-0.5">{deudaInfo.centro_votacion}</p>
              </div>
            )}
            {deudaInfo?.posicion != null && (
              <div>
                <p className="text-gray-400 uppercase tracking-wide font-semibold">Posición</p>
                <p className="font-semibold text-gray-800 mt-0.5">{deudaInfo.posicion}</p>
              </div>
            )}
          </div>

          <div className="h-px bg-gray-100" />

          {colegiado.nuevo_integrante ? (
            <div className="rounded-xl px-4 py-3 bg-amber-50 border border-amber-200 text-sm text-amber-800">
              <p className="font-semibold">Certificado pendiente</p>
              <p className="text-xs mt-0.5">Tu certificado de membresía está en proceso. Pasa por las oficinas del CODIA.</p>
            </div>
          ) : (
            <BloqueDeuda />
          )}
        </div>
      </div>
    </div>
  )

  // ═══════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════
  let contenido
  if (pantalla === 'form') contenido = pantallaForm
  else if (pantalla === 'lista') contenido = pantallaLista
  else contenido = pantallaFicha

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-fondo)' }}>
      <div className="max-w-md mx-auto px-4 py-10">
        <div className="text-center space-y-1 mb-6">
          <div className="flex justify-center mb-3">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center shadow-md"
              style={{ backgroundColor: 'var(--color-marino)' }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path fillRule="evenodd" d="M12 1.5l8.485 3.182A1 1 0 0121 5.634V12c0 4.418-3.582 7.5-9 9.75C6.582 19.5 3 16.418 3 12V5.634a1 1 0 01.515-.952L12 1.5zm3.03 7.22a.75.75 0 10-1.06-1.06L10.5 12.19l-1.47-1.47a.75.75 0 00-1.06 1.06l2 2a.75.75 0 001.06 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
          <h1 className="text-xl font-extrabold tracking-tight" style={{ color: 'var(--color-marino)' }}>
            CONSULTA DE ESTADO
          </h1>
          <p className="text-sm text-gray-500">
            Consulta tu estado de deuda y tu centro de votación.
          </p>
          <div className="pt-1">
            <div className="h-0.5 w-full rounded-full" style={{ backgroundColor: 'var(--color-dorado)' }} />
          </div>
        </div>

        {contenido}

        <div className="flex items-start gap-3 rounded-xl px-4 py-3 mt-6" style={{ backgroundColor: '#ffffff', border: '1px solid #eef1f6' }}>
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 mt-0.5 shrink-0 text-gray-400" viewBox="0 0 24 24" fill="currentColor">
            <path fillRule="evenodd" d="M12 1.5l8.485 3.182A1 1 0 0121 5.634V12c0 4.418-3.582 7.5-9 9.75C6.582 19.5 3 16.418 3 12V5.634a1 1 0 01.515-.952L12 1.5z" clipRule="evenodd" />
          </svg>
          <div>
            <p className="text-xs font-semibold text-gray-600">Tu información está segura y protegida.</p>
            <p className="text-xs text-gray-400">Solo se utiliza para consultar tu estado ante el CODIA.</p>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 pb-4 mt-6">CODIA · Elecciones 2026</p>
      </div>
    </div>
  )
}
