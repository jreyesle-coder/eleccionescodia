/**
 * Consulta la deuda de los 211 colegiados confirmados por el dirigente Juan Santos
 * en codiaenlinea.com y guarda el resultado en scripts/deuda_juansantos.csv.
 *
 * Uso:
 *   node scripts/consultar_deuda_juansantos.mjs           # solo consulta -> CSV
 *   node scripts/consultar_deuda_juansantos.mjs --guardar # además actualiza monto_deuda en Supabase
 *
 * Requiere Node >= 18. Lista de códigos+cédulas en scripts/juansantos_pairs.json.
 */

import { readFileSync, writeFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'

const GUARDAR = process.argv.includes('--guardar')
const BASE = 'https://www.codiaenlinea.com'

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
const supabase = GUARDAR
  ? createClient(env['NEXT_PUBLIC_SUPABASE_URL'], env['NEXT_PUBLIC_SUPABASE_ANON_KEY'])
  : null

const LISTADO = JSON.parse(readFileSync(new URL('./juansantos_pairs.json', import.meta.url), 'utf8'))

const sleep = ms => new Promise(r => setTimeout(r, ms))

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
  const cookieHeader = setCookie.split(',').map(c => c.split(';')[0].trim()).filter(Boolean).join('; ')
  if (!cookieHeader) return { encontrado: false, monto: 0 }
  const ct = loginRes.headers.get('content-type') ?? ''
  if (ct.includes('application/json')) {
    const json = await loginRes.json().catch(() => null)
    if (json && json.success === false) return { encontrado: false, monto: 0 }
  }
  const profileRes = await fetch(`${BASE}/Home/IndexUser`, {
    headers: { 'Cookie': cookieHeader, 'User-Agent': 'Mozilla/5.0', 'Referer': `${BASE}/` },
  })
  if (!profileRes.ok) return { encontrado: false, monto: 0 }
  return { encontrado: true, monto: parsearBalance(await profileRes.text()) }
}

const filas = []
const res = { sinDeuda: 0, conDeuda: 0, noEncontrado: 0, error: 0 }
console.log(`\nConsultando ${LISTADO.length} colegiados de Juan Santos${GUARDAR ? ' (con guardado en BD)' : ' (solo lectura)'}...\n`)

for (let i = 0; i < LISTADO.length; i++) {
  const { codigo, cedula } = LISTADO[i]
  process.stdout.write(`[${String(i + 1).padStart(3)}/${LISTADO.length}] #${codigo} ${cedula} -> `)
  let monto = 0, estado = 'no encontrado'
  try {
    const r = await consultarDeuda(codigo, cedula)
    if (!r.encontrado) { res.noEncontrado++; estado = 'no encontrado' }
    else if (r.monto > 0) { res.conDeuda++; monto = r.monto; estado = `DEUDA ${monto}` }
    else { res.sinDeuda++; estado = 'sin deuda' }
    console.log(estado)
    if (GUARDAR && r.encontrado) {
      const { error } = await supabase.rpc('set_deuda_lookup', { p_codigo: codigo, p_monto: monto })
      if (error) console.error(`   ! error BD: ${error.message}`)
    }
  } catch (e) { res.error++; estado = `ERROR ${e.message}`; console.log(estado) }
  filas.push({ codigo, cedula, monto, estado })
  await sleep(700)
}

const csv = 'codigo,cedula,monto,estado\n' +
  filas.map(f => `${f.codigo},${f.cedula},${f.monto},"${f.estado}"`).join('\n')
writeFileSync(new URL('./deuda_juansantos.csv', import.meta.url), csv, 'utf8')

console.log('\n=========== RESUMEN ===========')
console.log(`Total       : ${LISTADO.length}`)
console.log(`Con deuda   : ${res.conDeuda}`)
console.log(`Sin deuda   : ${res.sinDeuda}`)
console.log(`No encontrado: ${res.noEncontrado}`)
console.log(`Errores     : ${res.error}`)
console.log(`Total deuda : RD$ ${filas.reduce((a, f) => a + f.monto, 0).toLocaleString()}`)
console.log(`\nCSV: scripts/deuda_juansantos.csv`)
if (!GUARDAR) console.log('(No se tocó la base. Corre con --guardar para actualizar la app.)')
