'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

const MARINO = '#1F3864'
const DORADO = '#C9A227'
const DOCS_BUCKET = 'cursos-docs'
const MAX_MB = 5
const ACEPTA = 'image/jpeg,image/png,image/webp,application/pdf'

interface Curso {
  id: string; slug: string; titulo: string; descripcion: string | null; banner_url: string | null
  requisitos: string[]; documentos: { key: string; label: string }[]
  limite: number; max_registros: number
  requiere_aprobacion: boolean; solo_colegiados: boolean; bloquear_con_deuda: boolean
}
interface Colegiado {
  codigo: number; nombre_completo: string; nucleo: string | null
  inhabilitado?: boolean; monto_deuda?: number; ya_inscrito?: boolean
}
interface Estado { total: number; aprobadas: number; max_registros: number; limite: number; abierto: boolean }

const soloDigitos = (s: string) => s.replace(/\D/g, '')
const emailOk = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)

export default function FormCurso({ slug }: { slug: string }) {
  const supabase = createClient()

  const [curso, setCurso] = useState<Curso | null>(null)
  const [estado, setEstado] = useState<Estado | null>(null)
  const [cargandoCurso, setCargandoCurso] = useState(true)

  const [cedula, setCedula] = useState('')
  const [verificando, setVerificando] = useState(false)
  const [colegiado, setColegiado] = useState<Colegiado | null>(null)
  const [nombreManual, setNombreManual] = useState('')
  const [errorVerif, setErrorVerif] = useState<string | null>(null)

  const [telefono, setTelefono] = useState('')
  const [email, setEmail] = useState('')
  const [docs, setDocs] = useState<Record<string, File | null>>({})

  const [enviando, setEnviando] = useState(false)
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null)
  const [listo, setListo] = useState(false)

  useEffect(() => {
    Promise.all([
      supabase.rpc('get_curso', { p_slug: slug }),
      supabase.rpc('estado_curso', { p_slug: slug }),
    ]).then(([c, e]) => {
      setCargandoCurso(false)
      if (c.data) setCurso(c.data as Curso)
      if (e.data) setEstado(e.data as Estado)
    })
  }, [supabase, slug])

  async function verificar() {
    if (!curso) return
    const ced = soloDigitos(cedula)
    if (ced.length !== 11) { setErrorVerif('Ingresa una cédula válida de 11 dígitos.'); return }
    setVerificando(true); setErrorVerif(null); setColegiado(null)
    const { data, error } = await supabase.rpc('validar_cedula_curso', { p_cedula: ced, p_slug: slug })
    setVerificando(false)
    if (error) { setErrorVerif('No se pudo validar en este momento. Intenta de nuevo.'); return }
    const match = ((data as Colegiado[]) ?? [])[0]
    if (!match) {
      if (curso.solo_colegiados) {
        setErrorVerif('Esta cédula no figura como colegiado del CODIA. Este curso es solo para colegiados.')
        return
      }
      setColegiado({ codigo: 0, nombre_completo: '', nucleo: null })  // permitido sin colegiatura
      return
    }
    if (match.ya_inscrito) { setErrorVerif('Esta cédula ya está registrada en este curso.'); return }
    if (match.inhabilitado) { setErrorVerif('Esta colegiatura figura como inhabilitada. Comunícate con el CODIA.'); return }
    if (curso.bloquear_con_deuda && (match.monto_deuda ?? 0) > 0) {
      setErrorVerif(`Tienes una deuda pendiente con el CODIA de RD$ ${(match.monto_deuda ?? 0).toLocaleString('es-DO')}. Debes estar al día para inscribirte.`)
      return
    }
    setColegiado(match)
  }

  async function subir(file: File, key: string): Promise<string> {
    const ext = (file.name.split('.').pop() || 'dat').toLowerCase()
    const path = `${slug}/${soloDigitos(cedula)}/${key}_${Date.now()}.${ext}`
    const { error } = await supabase.storage.from(DOCS_BUCKET).upload(path, file, { upsert: false })
    if (error) throw new Error(`Error subiendo ${key}: ${error.message}`)
    return path
  }

  async function inscribir(e: React.FormEvent) {
    e.preventDefault()
    if (!curso || !colegiado) return
    setErrorEnvio(null)
    const nombre = colegiado.codigo ? colegiado.nombre_completo : nombreManual.trim()
    if (!nombre) { setErrorEnvio('Ingresa el nombre completo.'); return }
    if (!telefono.trim()) { setErrorEnvio('Ingresa tu teléfono.'); return }
    if (!emailOk(email)) { setErrorEnvio('Ingresa un correo electrónico válido.'); return }
    for (const d of curso.documentos) {
      const f = docs[d.key]
      if (f && f.size > MAX_MB * 1024 * 1024) { setErrorEnvio(`La "${d.label}" supera ${MAX_MB} MB.`); return }
      if (f && !ACEPTA.split(',').includes(f.type)) { setErrorEnvio(`La "${d.label}" debe ser imagen (JPG/PNG) o PDF.`); return }
    }
    setEnviando(true)
    try {
      const docsPaths: Record<string, string> = {}
      for (const d of curso.documentos) {
        const f = docs[d.key]
        if (f) docsPaths[d.key] = await subir(f, d.key)
      }
      const { error } = await supabase.from('inscripciones_curso').insert({
        curso_id: curso.id, slug: curso.slug, nombre, cedula: soloDigitos(cedula),
        telefono: telefono.trim(), email: email.trim().toLowerCase(),
        colegiatura: colegiado.codigo || null, nucleo: colegiado.nucleo,
        docs: docsPaths, estado: curso.requiere_aprobacion ? 'pendiente' : 'aprobada',
      })
      if (error) {
        if ((error as { code?: string }).code === '23505') throw new Error('Esta cédula ya está registrada en este curso.')
        if ((error.message || '').includes('CUPO_LLENO')) { setEstado(s => s ? { ...s, abierto: false } : s); throw new Error('Los cupos se agotaron. Registro cerrado.') }
        throw new Error(error.message)
      }
      setListo(true)
    } catch (err) {
      setErrorEnvio(err instanceof Error ? err.message : 'No se pudo completar el registro.')
    } finally { setEnviando(false) }
  }

  const inputCls = 'w-full text-sm px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:border-transparent'
  const ring = { ['--tw-ring-color' as string]: MARINO } as React.CSSProperties

  if (cargandoCurso) return <div className="min-h-screen flex items-center justify-center text-gray-500 text-sm">Cargando…</div>
  if (!curso) return <div className="min-h-screen flex items-center justify-center text-gray-500 text-sm px-6 text-center">Este curso no está disponible.</div>

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f4f6fb' }}>
      <div className="max-w-md mx-auto px-4 py-10">
        <div className="mb-6">
          {curso.banner_url && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={curso.banner_url} alt={curso.titulo} className="w-full rounded-2xl shadow-md" />
          )}
          <div className="mt-3 h-0.5 w-full rounded-full" style={{ backgroundColor: DORADO }} />
        </div>

        {listo ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-md p-6 text-center space-y-2">
            <div className="mx-auto w-14 h-14 rounded-full flex items-center justify-center" style={{ backgroundColor: '#dcfce7' }}>
              <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="#15803d" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
            </div>
            <h2 className="text-lg font-extrabold text-green-700">¡Solicitud enviada!</h2>
            <p className="text-sm text-gray-600">
              {curso.requiere_aprobacion
                ? 'Tu solicitud ha sido enviada y estará siendo evaluada por el CODIA. Podrás verificar si fuiste seleccionado en el módulo de consulta.'
                : 'Tu inscripción fue registrada. El CODIA se comunicará contigo con los próximos pasos.'}
            </p>
            {curso.requiere_aprobacion && (
              <a href="/cursos/consulta" className="inline-block text-sm font-semibold underline" style={{ color: MARINO }}>
                Consultar mi estado →
              </a>
            )}
          </div>
        ) : estado && !estado.abierto ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-md p-6 text-center space-y-2">
            <div className="mx-auto w-14 h-14 rounded-full flex items-center justify-center" style={{ backgroundColor: '#fee2e2' }}>
              <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="#b91c1c" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
            </div>
            <h2 className="text-lg font-extrabold text-red-700">Registro cerrado</h2>
            <p className="text-sm text-gray-600">Se alcanzó el número máximo de registros para este curso. Gracias por tu interés.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-md p-5 space-y-4">
            {curso.requisitos.length > 0 && (
              <div className="rounded-xl bg-blue-50 border border-blue-100 px-4 py-3">
                <p className="text-xs font-bold mb-1" style={{ color: MARINO }}>Requisitos</p>
                <ul className="text-xs text-gray-600 list-disc pl-4 space-y-0.5">
                  {curso.requisitos.map((r, i) => <li key={i}>{r}</li>)}
                </ul>
              </div>
            )}

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
                  {colegiado.codigo ? (
                    <>
                      <p className="text-sm font-bold text-green-800">✓ Colegiado verificado</p>
                      <p className="text-sm text-gray-700 mt-0.5">{colegiado.nombre_completo}</p>
                      <p className="text-xs text-gray-500">Colegiatura {colegiado.codigo}{colegiado.nucleo ? ` · ${colegiado.nucleo}` : ''}</p>
                    </>
                  ) : <p className="text-sm font-bold text-green-800">✓ Cédula válida</p>}
                </div>

                <form onSubmit={inscribir} className="space-y-4">
                  {!colegiado.codigo && (
                    <div>
                      <label className="text-xs font-semibold text-gray-600 block mb-1">Nombre y apellido completo</label>
                      <input value={nombreManual} onChange={e => setNombreManual(e.target.value)} className={inputCls} style={ring} required />
                    </div>
                  )}
                  <div>
                    <label className="text-xs font-semibold text-gray-600 block mb-1">Teléfono</label>
                    <input value={telefono} onChange={e => setTelefono(e.target.value)} placeholder="809-000-0000" inputMode="tel" className={inputCls} style={ring} required />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 block mb-1">Correo electrónico</label>
                    <input value={email} onChange={e => setEmail(e.target.value)} placeholder="tucorreo@ejemplo.com" type="email" className={inputCls} style={ring} required />
                  </div>

                  {curso.documentos.map(d => (
                    <div key={d.key}>
                      <label className="text-xs font-semibold text-gray-600 block mb-1">{d.label} <span className="text-gray-400">(opcional · JPG/PNG/PDF, máx {MAX_MB}MB)</span></label>
                      <input type="file" accept={ACEPTA} onChange={e => setDocs(s => ({ ...s, [d.key]: e.target.files?.[0] ?? null }))} className="w-full text-sm" />
                    </div>
                  ))}

                  {curso.documentos.some(d => !docs[d.key]) && (
                    <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                      Puedes registrarte sin adjuntar todos los documentos; los que falten quedarán pendientes de entrega.
                    </p>
                  )}
                  {errorEnvio && <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{errorEnvio}</p>}

                  <button type="submit" disabled={enviando}
                    className="w-full py-3 rounded-xl text-white text-sm font-bold disabled:opacity-50" style={{ backgroundColor: DORADO }}>
                    {enviando ? 'Enviando…' : 'Completar registro'}
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
