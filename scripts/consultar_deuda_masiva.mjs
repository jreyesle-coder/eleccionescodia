/**
 * Consulta la deuda de los 149 colegiados del listado confirmados_para_cargar.csv
 * en codiaenlinea.com y actualiza monto_deuda en Supabase vía set_deuda_lookup.
 *
 * Uso:
 *   node scripts/consultar_deuda_masiva.mjs
 *
 * Requiere Node >= 18 (fetch nativo). Lee credenciales de .env.local.
 */

import { readFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'

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

// ── Listado (codigo → cedula) ─────────────────────────────────────────────────

const LISTADO = [
  { codigo: '2870',  cedula: '000-0241022-1' },
  { codigo: '5602',  cedula: '001-0359636-7' },
  { codigo: '7700',  cedula: '001-0155765-0' },
  { codigo: '7744',  cedula: '001-0495220-5' },
  { codigo: '7838',  cedula: '001-0147235-5' },
  { codigo: '7875',  cedula: '056-0015303-4' },
  { codigo: '8057',  cedula: '001-0623930-4' },
  { codigo: '8316',  cedula: '001-0790503-6' },
  { codigo: '8756',  cedula: '001-0262505-0' },
  { codigo: '8814',  cedula: '001-0501825-3' },
  { codigo: '9277',  cedula: '001-0190471-2' },
  { codigo: '9365',  cedula: '001-0112101-0' },
  { codigo: '9568',  cedula: '012-0004124-0' },
  { codigo: '10279', cedula: '001-0159036-2' },
  { codigo: '10311', cedula: '031-0081023-7' },
  { codigo: '10447', cedula: '001-0517390-0' },
  { codigo: '10717', cedula: '001-0571380-4' },
  { codigo: '10732', cedula: '001-0051907-3' },
  { codigo: '10855', cedula: '023-0004402-7' },
  { codigo: '11199', cedula: '001-0125767-3' },
  { codigo: '11429', cedula: '001-0119842-2' },
  { codigo: '12394', cedula: '001-1072571-0' },
  { codigo: '12612', cedula: '001-0213408-7' },
  { codigo: '12887', cedula: '001-0689530-3' },
  { codigo: '12915', cedula: '001-1303960-6' },
  { codigo: '13319', cedula: '001-0750331-0' },
  { codigo: '13446', cedula: '001-0280300-4' },
  { codigo: '13547', cedula: '001-0971587-0' },
  { codigo: '13583', cedula: '072-0002703-0' },
  { codigo: '13887', cedula: '001-0078397-6' },
  { codigo: '13933', cedula: '037-0020169-6' },
  { codigo: '14011', cedula: '001-0380055-3' },
  { codigo: '14171', cedula: '001-0650030-9' },
  { codigo: '14192', cedula: '001-0893128-8' },
  { codigo: '14523', cedula: '001-0536874-0' },
  { codigo: '14767', cedula: '001-0190877-0' },
  { codigo: '14809', cedula: '001-0679585-9' },
  { codigo: '14840', cedula: '001-0828921-6' },
  { codigo: '15014', cedula: '054-0001647-2' },
  { codigo: '15211', cedula: '071-0027573-9' },
  { codigo: '15232', cedula: '001-0509709-1' },
  { codigo: '15486', cedula: '001-0472263-2' },
  { codigo: '15920', cedula: '047-0000059-1' },
  { codigo: '16814', cedula: '001-1031531-4' },
  { codigo: '17136', cedula: '001-0757326-3' },
  { codigo: '17258', cedula: '012-0048096-8' },
  { codigo: '17803', cedula: '001-0152657-2' },
  { codigo: '18134', cedula: '001-0684336-0' },
  { codigo: '19049', cedula: '001-1373757-1' },
  { codigo: '19992', cedula: '001-0448588-3' },
  { codigo: '20019', cedula: '013-0003370-9' },
  { codigo: '20127', cedula: '001-0754045-2' },
  { codigo: '20133', cedula: '055-0019516-8' },
  { codigo: '20175', cedula: '001-0925701-4' },
  { codigo: '20293', cedula: '001-1344577-9' },
  { codigo: '20963', cedula: '073-0013839-8' },
  { codigo: '21133', cedula: '001-0982771-7' },
  { codigo: '21678', cedula: '001-1194196-9' },
  { codigo: '21726', cedula: '001-1213952-2' },
  { codigo: '23106', cedula: '001-1615698-5' },
  { codigo: '23143', cedula: '001-0487229-6' },
  { codigo: '23736', cedula: '001-1627956-3' },
  { codigo: '23763', cedula: '002-0065436-6' },
  { codigo: '24414', cedula: '001-1318835-3' },
  { codigo: '24679', cedula: '001-1662229-1' },
  { codigo: '24975', cedula: '001-1099347-4' },
  { codigo: '25185', cedula: '001-1530846-2' },
  { codigo: '25423', cedula: '003-0079183-7' },
  { codigo: '25673', cedula: '010-0067060-2' },
  { codigo: '26046', cedula: '001-0886068-5' },
  { codigo: '26847', cedula: '027-0000784-8' },
  { codigo: '27298', cedula: '001-0037308-3' },
  { codigo: '27518', cedula: '001-1574517-6' },
  { codigo: '27903', cedula: '223-0041641-3' },
  { codigo: '28532', cedula: '001-1414783-8' },
  { codigo: '29022', cedula: '001-1852851-2' },
  { codigo: '29919', cedula: '001-1341670-5' },
  { codigo: '30244', cedula: '093-0056970-5' },
  { codigo: '30298', cedula: '085-0010593-0' },
  { codigo: '30362', cedula: '001-1197014-1' },
  { codigo: '30469', cedula: '068-0044350-6' },
  { codigo: '30691', cedula: '055-0027092-0' },
  { codigo: '31055', cedula: '001-1475507-7' },
  { codigo: '31234', cedula: '001-1579097-4' },
  { codigo: '32255', cedula: '001-1827368-9' },
  { codigo: '32469', cedula: '225-0035437-2' },
  { codigo: '32606', cedula: '223-0074534-0' },
  { codigo: '33446', cedula: '001-0395317-0' },
  { codigo: '33582', cedula: '001-1494301-2' },
  { codigo: '33902', cedula: '402-2039833-9' },
  { codigo: '34003', cedula: '087-0014813-6' },
  { codigo: '34103', cedula: '001-1760263-1' },
  { codigo: '34115', cedula: '001-1786356-3' },
  { codigo: '34604', cedula: '225-0025052-1' },
  { codigo: '34800', cedula: '037-0104328-7' },
  { codigo: '34805', cedula: '225-0018501-6' },
  { codigo: '35021', cedula: '001-0065777-4' },
  { codigo: '35398', cedula: '001-1614641-6' },
  { codigo: '35554', cedula: '001-0045986-6' },
  { codigo: '35939', cedula: '068-0052314-1' },
  { codigo: '36134', cedula: '001-1815267-7' },
  { codigo: '36520', cedula: '001-1562533-7' },
  { codigo: '36581', cedula: '001-1783509-0' },
  { codigo: '36695', cedula: '048-0108979-0' },
  { codigo: '37422', cedula: '001-1481859-4' },
  { codigo: '38079', cedula: '001-1589553-4' },
  { codigo: '38081', cedula: '011-0039876-5' },
  { codigo: '38196', cedula: '223-0093945-5' },
  { codigo: '38599', cedula: '001-1885526-1' },
  { codigo: '38690', cedula: '402-2168463-8' },
  { codigo: '38760', cedula: '225-0020937-8' },
  { codigo: '39109', cedula: '001-1869780-4' },
  { codigo: '39261', cedula: '402-2074383-1' },
  { codigo: '39380', cedula: '402-2105141-6' },
  { codigo: '40017', cedula: '001-1472767-0' },
  { codigo: '40040', cedula: '001-1878628-4' },
  { codigo: '40422', cedula: '097-0002501-9' },
  { codigo: '40550', cedula: '402-2009286-6' },
  { codigo: '41325', cedula: '001-1721092-2' },
  { codigo: '41392', cedula: '001-1279559-6' },
  { codigo: '41802', cedula: '012-0110367-6' },
  { codigo: '42149', cedula: '056-0169400-2' },
  { codigo: '42538', cedula: '106-0007343-0' },
  { codigo: '42878', cedula: '402-0062814-3' },
  { codigo: '43316', cedula: '402-2317483-6' },
  { codigo: '43605', cedula: '010-0080660-2' },
  { codigo: '44214', cedula: '402-2254271-0' },
  { codigo: '44287', cedula: '402-2015709-9' },
  { codigo: '44969', cedula: '001-0421228-7' },
  { codigo: '45202', cedula: '402-2112349-6' },
  { codigo: '45227', cedula: '402-2432026-3' },
  { codigo: '45512', cedula: '008-0027964-8' },
  { codigo: '45579', cedula: '223-0103752-3' },
  { codigo: '45716', cedula: '402-0037079-5' },
  { codigo: '47132', cedula: '001-1759131-3' },
  { codigo: '47212', cedula: '093-0070760-2' },
  { codigo: '47312', cedula: '402-2334168-2' },
  { codigo: '47358', cedula: '225-0019148-5' },
  { codigo: '47862', cedula: '001-1906616-5' },
  { codigo: '47902', cedula: '223-0095696-2' },
  { codigo: '47998', cedula: '402-2180497-0' },
  { codigo: '48398', cedula: '223-0010173-4' },
  { codigo: '48637', cedula: '402-3646922-3' },
  { codigo: '48676', cedula: '402-2110651-7' },
  { codigo: '48745', cedula: '223-0057319-7' },
  { codigo: '48925', cedula: '016-0016160-6' },
  { codigo: '50058', cedula: '402-1316806-1' },
  { codigo: '50526', cedula: '001-1899707-1' },
  { codigo: '51162', cedula: '001-0435053-3' },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

function parsearBalance(html) {
  const balance = html.match(/Balance\s*:?[^$]{0,200}\$\s*([\d,\.]+)/i)
  if (balance) return parseMonto(balance[1])
  const subTotal = html.match(/Sub\s*Total\s*:\s*\$\s*([\d,\.]+)/i)
  if (subTotal) return parseMonto(subTotal[1])
  return 0
}

function parseMonto(raw) {
  const n = parseFloat(raw.replace(/,/g, ''))
  return isNaN(n) ? 0 : Math.round(n)
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
  const monto = parsearBalance(html)
  return { encontrado: true, monto }
}

// ── Main ──────────────────────────────────────────────────────────────────────

const resultados = { sinDeuda: 0, conDeuda: 0, noEncontrado: 0, error: 0 }
const conDeuda = []

console.log(`\nConsultando deuda para ${LISTADO.length} colegiados en CODIA en línea...\n`)

for (let i = 0; i < LISTADO.length; i++) {
  const { codigo, cedula } = LISTADO[i]
  process.stdout.write(`[${String(i + 1).padStart(3)}/${LISTADO.length}] #${codigo} ${cedula} → `)

  try {
    const { encontrado, monto } = await consultarDeuda(codigo, cedula)

    if (!encontrado) {
      console.log('no encontrado')
      resultados.noEncontrado++
    } else if (monto > 0) {
      console.log(`DEUDA: RD$ ${monto.toLocaleString()}`)
      resultados.conDeuda++
      conDeuda.push({ codigo, cedula, monto })
      // Actualizar en BD
      const { error } = await supabase.rpc('set_deuda_lookup', {
        p_codigo: codigo,
        p_monto: monto,
      })
      if (error) console.error(`  ⚠ Error al guardar en BD: ${error.message}`)
    } else {
      console.log('sin deuda')
      resultados.sinDeuda++
      // Actualizar BD a 0 (limpia deudas anteriores si las hubiera)
      await supabase.rpc('set_deuda_lookup', { p_codigo: codigo, p_monto: 0 })
    }
  } catch (err) {
    console.log(`ERROR: ${err.message}`)
    resultados.error++
  }

  // Pausa breve para no saturar el servidor
  await sleep(800)
}

// ── Resumen ───────────────────────────────────────────────────────────────────

console.log('\n═══════════════════════════════════════')
console.log('RESUMEN FINAL')
console.log('═══════════════════════════════════════')
console.log(`Total procesados : ${LISTADO.length}`)
console.log(`Sin deuda        : ${resultados.sinDeuda}`)
console.log(`Con deuda        : ${resultados.conDeuda}`)
console.log(`No encontrado    : ${resultados.noEncontrado}`)
console.log(`Errores          : ${resultados.error}`)

if (conDeuda.length > 0) {
  console.log('\nColegiados con deuda (pasarán a "Por regularizar"):')
  for (const { codigo, cedula, monto } of conDeuda) {
    console.log(`  #${codigo} ${cedula} → RD$ ${monto.toLocaleString()}`)
  }
}

console.log('\nListo. Los colegiados con deuda ya aparecen en la pestaña "Por regularizar".')
