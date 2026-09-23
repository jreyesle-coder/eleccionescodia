'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const MARINO = '#1F3864'
const DORADO = '#C9A227'
const BUCKET = 'curso-ingles'
const MAX_MB = 5
const ACEPTA = 'image/jpeg,image/png,image/webp,application/pdf'

interface Colegiado { codigo: number; nombre_completo: string; nucleo: string | null; inhabilitado?: boolean }

const soloDigitos = (s: string) => s.replace(/\D/g, '')
const emailOk = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)

export default function FormInscripcionIngles() {
  const supabase = createClient()

  const [cedula, setCedula] = useState('')
  const [verificando, setVerificando] = useState(false)
  const [colegiado, setColegiado] = useState<Colegiado | null>(null)
  const [errorVerif, setErrorVerif] = useState<string | null>(null)

  const [telefono, setTelefono] = useState('')
  const [email, setEmail] = useState('')
  const [docCedula, setDocCedula] = useState<File | null>(null)
  const [docTitulo, setDocTitulo] = useState<File | null>(null)

  const [enviando, setEnviando] = useState(false)
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null)
  const [listo, setListo] = useState(false)

  async function verificar() {
    const ced = soloDigitos(cedula)
    if (ced.length !== 11) { setErrorVerif('Ingresa una cédula válida de 11 dígitos.'); return }
    setVerificando(true); setErrorVerif(null); setColegiado(null)
    const { data, error } = await supabase.rpc('validar_cedula_colegiado', { p_cedula: ced })
    setVerificando(false)
    if (error) { setErrorVerif('No se pudo validar en este momento. Intenta de nuevo.'); return }
    const match = ((data as Colegiado[]) ?? [])[0]
    if (!match) {
      setErrorVerif('Esta cédula no figura como colegiado del CODIA. El curso está disponible solo para colegiados.')
      return
    }
    if (match.inhabilitado) {
      setErrorVerif('Esta colegiatura figura como inhabilitada. Comunícate con las oficinas del CODIA.')
      return
    }
    setColegiado(match)
  }

  function validarArchivo(f: File | null, campo: string): string | null {
    if (!f) return `Adjunta la ${campo}.`
    if (f.size > MAX_MB * 1024 * 1024) return `La ${campo} supera ${MAX_MB} MB.`
    if (!ACEPTA.split(',').includes(f.type)) return `La ${campo} debe ser imagen (JPG/PNG) o PDF.`
    return null
  }

  async function subir(file: File, sufijo: string): Promise<string> {
    const ext = (file.name.split('.').pop() || 'dat').toLowerCase()
    const path = `${soloDigitos(cedula)}/${Date.now()}_${sufijo}.${ext}`
    const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: false })
    if (error) throw new Error(`Error subiendo ${sufijo}: ${error.message}`)
    return path
  }

  async function inscribir(e: React.FormEvent) {
    e.preventDefault()
    setErrorEnvio(null)
    if (!colegiado) return
    if (!telefono.trim()) { setErrorEnvio('Ingresa tu teléfono.'); return }
    if (!emailOk(email)) { setErrorEnvio('Ingresa un correo electrónico válido.'); return }
    const e1 = validarArchivo(docCedula, 'copia de cédula'); if (e1) { setErrorEnvio(e1); return }
    const e2 = validarArchivo(docTitulo, 'copia de título'); if (e2) { setErrorEnvio(e2); return }

    setEnviando(true)
    try {
      const cedulaPath = await subir(docCedula!, 'cedula')
      const tituloPath = await subir(docTitulo!, 'titulo')
      const { error } = await supabase.from('inscripciones_ingles').insert({
        nombre: colegiado.nombre_completo,
        cedula: soloDigitos(cedula),
        telefono: telefono.trim(),
        email: email.trim().toLowerCase(),
        colegiatura: colegiado.codigo,
        nucleo: colegiado.nucleo,
        cedula_doc: cedulaPath,
        titulo_doc: tituloPath,
      })
      if (error) throw new Error(error.message)
      setListo(true)
    } catch (err) {
      setErrorEnvio(err instanceof Error ? err.message : 'No se pudo completar la inscripción.')
    } finally {
      setEnviando(false)
    }
  }

  const inputCls = 'w-full text-sm px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:border-transparent'
  const ring = { ['--tw-ring-color' as string]: MARINO } as React.CSSProperties

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f4f6fb' }}>
      <div className="max-w-md mx-auto px-4 py-10">
        <div className="text-center space-y-1 mb-6">
          <div className="flex justify-center mb-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-codia.png" alt="CODIA" className="h-14 w-auto" />
          </div>
          <h1 className="text-xl font-extrabold tracking-tight" style={{ color: MARINO }}>CURSO DE INGLÉS</h1>
          <p className="text-sm text-gray-500">Inscripción para colegiados del CODIA · con INFOTEP / CIFAL.</p>
          <div className="pt-1"><div className="h-0.5 w-full rounded-full" style={{ backgroundColor: DORADO }} /></div>
        </div>

        {listo ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-md p-6 text-center space-y-2">
            <div className="mx-auto w-14 h-14 rounded-full flex items-center justify-center" style={{ backgroundColor: '#dcfce7' }}>
              <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="#15803d" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
            </div>
            <h2 className="text-lg font-extrabold text-green-700">¡Inscripción recibida!</h2>
            <p className="text-sm text-gray-600">Gracias, <b>{colegiado?.nombre_completo}</b>. Tu inscripción al Curso de Inglés fue registrada. El CODIA se comunicará contigo con los próximos pasos.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-md p-5 space-y-4">
            {/* Paso 1: cédula */}
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Cédula</label>
              <div className="flex gap-2">
                <input value={cedula} onChange={e => { setCedula(e.target.value); setColegiado(null); setErrorVerif(null) }}
                  placeholder="001-0000000-0" inputMode="numeric" className={inputCls} style={ring} disabled={!!colegiado} />
                {!colegiado && (
                  <button type="button" onClick={verificar} disabled={verificando}
                    className="px-4 rounded-xl text-white text-sm font-semibold disabled:opacity-50 shrink-0" style={{ backgroundColor: MARINO }}>
                    {verificando ? '...' : 'Verificar'}
                  </button>
                )}
              </div>
              {errorVerif && <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-2">{errorVerif}</p>}
            </div>

            {colegiado && (
              <>
                <div className="rounded-xl px-4 py-3 bg-green-50 border border-green-200">
                  <p className="text-sm font-bold text-green-800">✓ Colegiado verificado</p>
                  <p className="text-sm text-gray-700 mt-0.5">{colegiado.nombre_completo}</p>
                  <p className="text-xs text-gray-500">Colegiatura {colegiado.codigo}{colegiado.nucleo ? ` · ${colegiado.nucleo}` : ''}</p>
                </div>

                <form onSubmit={inscribir} className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-600 block mb-1">Teléfono</label>
                    <input value={telefono} onChange={e => setTelefono(e.target.value)} placeholder="809-000-0000" inputMode="tel" className={inputCls} style={ring} required />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 block mb-1">Correo electrónico</label>
                    <input value={email} onChange={e => setEmail(e.target.value)} placeholder="tucorreo@ejemplo.com" type="email" className={inputCls} style={ring} required />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 block mb-1">Copia de cédula <span className="text-gray-400">(JPG/PNG/PDF, máx {MAX_MB}MB)</span></label>
                    <input type="file" accept={ACEPTA} onChange={e => setDocCedula(e.target.files?.[0] ?? null)} className="w-full text-sm" required />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 block mb-1">Copia de título <span className="text-gray-400">(JPG/PNG/PDF, máx {MAX_MB}MB)</span></label>
                    <input type="file" accept={ACEPTA} onChange={e => setDocTitulo(e.target.files?.[0] ?? null)} className="w-full text-sm" required />
                  </div>

                  {errorEnvio && <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{errorEnvio}</p>}

                  <button type="submit" disabled={enviando}
                    className="w-full py-3 rounded-xl text-white text-sm font-bold disabled:opacity-50" style={{ backgroundColor: DORADO }}>
                    {enviando ? 'Enviando…' : 'Completar inscripción'}
                  </button>
                </form>
              </>
            )}
          </div>
        )}

        <p className="text-center text-xs text-gray-400 pt-6">CODIA · Plan de Capacitación y Actualización Profesional</p>
      </div>
    </div>
  )
}
