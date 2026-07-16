/**
 * Actualiza monto_deuda en Supabase directo para el listado de códigos de Consulta 2.
 *
 * Flujo (un solo comando, sin CSV):
 *   1) Llama RPC get_pares_para_deuda(codigos) → obtiene codigo,cedula de esos colegiados.
 *   2) Para cada uno consulta la deuda en codiaenlinea.com (login codigo+cedula).
 *   3) Actualiza monto_deuda en Supabase vía RPC set_deuda_lookup.
 *
 * Uso:
 *   node scripts/actualizar_deuda_reporte.mjs
 *
 * Requiere Node >= 18 (fetch nativo). Lee credenciales de .env.local.
 * Requiere haber creado la función get_pares_para_deuda en Supabase.
 */

import { readFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'

// ── Lista de códigos de Consulta 2 (sin duplicados) ───────────────────────────

const CODIGOS = [
  12575, 8137, 16198, 3731, 15668, 4157, 3795, 11877, 12807, 14783, 6663, 5801,
  5132, 2661, 5945, 17633, 16234, 7820, 8428, 2701, 3593, 5601, 14468, 6684,
  8099, 4883, 2633, 13992, 13991, 6578, 6101, 12936, 2150, 13720, 2655, 1437,
  2187, 3876, 2210, 3498, 15752, 1833, 5802, 9971, 4985, 6611, 5721, 3717, 3170,
  5047, 19598, 12687, 4819, 8795, 26756, 8335, 17905, 10131, 5778, 4556, 6370,
  11932, 15954, 15033, 20624, 24419, 11362, 15653, 12986, 12779, 8707, 12039,
  6128, 86413, 4045, 5979, 4309, 12985, 6607, 9662, 7093, 8007, 2151, 10960,
  8448, 7783, 11454, 15097, 5196, 3904, 70169, 14579, 6680, 7469, 7157, 20214,
  16109, 3988, 1631, 3045, 4748, 18046, 6331, 4208, 17053, 9365, 4293, 8174,
  9843, 6029, 14164, 6324, 5265, 14069, 5095, 19511, 2197, 5376, 8789, 5711,
  9171, 4318, 6685, 4824, 11630, 9931, 9088, 5549, 4794, 5010, 20694, 2786, 4142,
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

// ── Helpers de consulta (mismo método probado que consultar_deuda_masiva.mjs) ──

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
  console.error('¿Creaste la función en el SQL Editor? (ver Paso 1)')
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
