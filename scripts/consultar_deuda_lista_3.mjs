/**
 * Consulta la deuda REAL en codiaenlinea.com para un tercer listado de códigos
 * y guarda el monto_deuda en Supabase.
 *
 * Flujo (un solo comando):
 *   1) RPC get_pares_para_deuda(codigos) → codigo,cedula desde padron.
 *   2) Para cada uno consulta la deuda en codiaenlinea.com (login codigo+cedula).
 *   3) Actualiza monto_deuda en Supabase vía RPC set_deuda_lookup.
 *
 * Uso:
 *   node scripts/consultar_deuda_lista_3.mjs
 *
 * Requiere Node >= 18 (fetch nativo). Lee credenciales de .env.local.
 */

import { readFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'

// ── Lista de códigos ──────────────────────────────────────────────────────────

const CODIGOS = [
  28086, 37493, 33470, 27569, 29024, 29662,
  33024, 33011, 35212, 34345, 40711,
]

// ── Leer .env.local ───────────────────────────────────────────────────────────

function leerEnv() {
  const raw = readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
  const env = {}
  for (const line of raw.split('\n')) {
    const m = line.match(/^([^#=]+)=(.*)$/)
    if (m) env[m[1].trim()] = m[2].trim()
  }
  return env
}

const env = leerEnv()
const SUPABASE_URL = env['NEXT_PUBLIC_SUPABASE_URL']
const SUPABASE_ANON_KEY = env['NEXT_PUBLIC_SUPABASE_ANON_KEY']
const BASE = 'https://www.codiaenlinea.com'

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY en .env.local')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// ── Helpers de consulta (mismo método probado) ────────────────────────────────

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

function parseMonto(raw) {
  const n = parseFloat(String(raw).replace(/,/g, ''))
  return isNaN(n) ? 0 : Math.round(n)
}

function parsearBalance(html) {
  const balance = html.match(/Balance\s*:?[^$]{0,200}\$\s*([\d,\.]+)/i)
  if (balance) return parseMonto(balance[1])
  const subTotal = html.match(/Sub\s*Total\s*:\s*\$\s*([\d,\.]+)/i)
  if (subTotal) return parseMonto(subTotal[1])
  return 0
}

async function consultarDeuda(codigo, cedula) {
  const cedulaLimpia = cedula.replace(/-/g, '')

  const loginRes = await fetch(`${BASE}/Home/Login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/javascript, */*; q=0.01',
      'X-Requested-With': 'XMLHttpRequest',
      'Referer': `${BASE}/`,
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    },
    body: JSON.stringify({ Cedula: cedulaLimpia, Codigo: codigo }),
    redirect: 'manual',
  })

  const setCookie = loginRes.headers.get('set-cookie') ?? ''
  const cookieHeader = setCookie
    .split(',')
    .map(c => c.split(';')[0].trim())
    .filter(Boolean)
    .join('; ')

  if (!cookieHeader) return { encontrado: false, monto: 0 }

  const contentType = loginRes.headers.get('content-type') ?? ''
  if (contentType.includes('application/json')) {
    const json = await loginRes.json().catch(() => null)
    if (json && json.success === false) return { encontrado: false, monto: 0 }
  }

  const profileRes = await fetch(`${BASE}/Home/IndexUser`, {
    headers: {
      'Cookie': cookieHeader,
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Referer': `${BASE}/`,
    },
  })

  if (!profileRes.ok) return { encontrado: false, monto: 0 }

  const html = await profileRes.text()
  return { encontrado: true, monto: parsearBalance(html) }
}

// ── Main ──────────────────────────────────────────────────────────────────────

console.log(`\nObteniendo cédulas de ${CODIGOS.length} códigos desde Supabase...`)

const { data: pares, error: errPares } = await supabase.rpc('get_pares_para_deuda', {
  p_codigos: CODIGOS,
})

if (errPares) {
  console.error('Error al llamar get_pares_para_deuda:', errPares.message)
  console.error('¿Creaste la función en el SQL Editor?')
  process.exit(1)
}

if (!pares || pares.length === 0) {
  console.error('La función no devolvió filas. Revisa que los códigos existan en padron.')
  process.exit(1)
}

const LISTADO = pares.map(p => ({ codigo: String(p.codigo), cedula: String(p.cedula || '') }))
console.log(`Encontrados en padron: ${LISTADO.length} de ${CODIGOS.length}\n`)

const resumen = { sinDeuda: 0, conDeuda: 0, noEncontrado: 0, error: 0 }
const conDeuda = []

for (let i = 0; i < LISTADO.length; i++) {
  const { codigo, cedula } = LISTADO[i]
  process.stdout.write(`[${String(i + 1).padStart(3)}/${LISTADO.length}] #${codigo} ${cedula} → `)

  try {
    if (!cedula) {
      console.log('sin cédula')
      resumen.noEncontrado++
      continue
    }
    const { encontrado, monto } = await consultarDeuda(codigo, cedula)
    if (!encontrado) {
      console.log('no encontrado')
      resumen.noEncontrado++
    } else if (monto > 0) {
      console.log(`DEUDA: RD$ ${monto.toLocaleString()}`)
      resumen.conDeuda++
      conDeuda.push({ codigo, monto })
      const { error } = await supabase.rpc('set_deuda_lookup', { p_codigo: codigo, p_monto: monto })
      if (error) console.error(`  ⚠ Error al guardar en BD: ${error.message}`)
    } else {
      console.log('sin deuda')
      resumen.sinDeuda++
      await supabase.rpc('set_deuda_lookup', { p_codigo: codigo, p_monto: 0 })
    }
  } catch (err) {
    console.log(`ERROR: ${err.message}`)
    resumen.error++
  }

  await sleep(800)
}

console.log('\n═══════════════════════════════════════')
console.log('RESUMEN FINAL (monto_deuda actualizado en Supabase)')
console.log('═══════════════════════════════════════')
console.log(`Total procesados : ${LISTADO.length}`)
console.log(`Con deuda        : ${resumen.conDeuda}`)
console.log(`Sin deuda        : ${resumen.sinDeuda}`)
console.log(`No encontrado    : ${resumen.noEncontrado}`)
console.log(`Errores          : ${resumen.error}`)

if (conDeuda.length > 0) {
  console.log('\nColegiados con deuda:')
  for (const { codigo, monto } of conDeuda) {
    console.log(`  #${codigo} → RD$ ${monto.toLocaleString()}`)
  }
}
