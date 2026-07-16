/**
 * Consulta la deuda REAL en el portal del CODIA (verificate.codiaenlinea.com)
 * para los colegiados confirmados por el PRESIDENTE, y guarda el resultado en
 * Supabase (padron.monto_deuda, regional, centro_votacion, nucleo, posicion).
 *
 * Fuente: https://verificate.codiaenlinea.com/ConsultaCodias/Details/{codigo}
 *   → un solo GET, NO requiere login ni cédula (mismo método del API del portal).
 *
 * Entrada: el CSV descargado del SQL Editor (Confirmados Presidente.csv).
 * Salida : consola + CSV con los resultados.
 *
 * Uso:
 *   node scripts/consultar_deuda_arquitectos_presidente.mjs
 *   node scripts/consultar_deuda_arquitectos_presidente.mjs --todos
 *   node scripts/consultar_deuda_arquitectos_presidente.mjs --csv "C:\ruta\archivo.csv"
 *   node scripts/consultar_deuda_arquitectos_presidente.mjs --no-guardar
 *
 * Flags:
 *   --todos       consulta los 437 confirmados, no solo los arquitectos
 *   --csv <ruta>  CSV de entrada (default: Downloads\Confirmados Presidente.csv)
 *   --no-guardar  solo consulta y reporta; no escribe en Supabase
 *   --limite N    consulta solo los primeros N (para probar)
 *
 * Requiere Node >= 18 (fetch nativo). Lee credenciales de .env.local.
 */

import { readFileSync, writeFileSync } from 'fs'
import { homedir } from 'os'
import { join } from 'path'
import { createClient } from '@supabase/supabase-js'

// ── Args ──────────────────────────────────────────────────────────────────────
const args     = process.argv.slice(2)
const TODOS    = args.includes('--todos')
const GUARDAR  = !args.includes('--no-guardar')
const limFlag  = args.indexOf('--limite')
const LIMITE   = limFlag !== -1 && args[limFlag + 1] ? parseInt(args[limFlag + 1], 10) : null
const csvFlag  = args.indexOf('--csv')
const CSV_IN   = csvFlag !== -1 && args[csvFlag + 1]
  ? args[csvFlag + 1]
  : join(homedir(), 'Downloads', 'Confirmados Presidente.csv')

const CSV_OUT  = new URL('../deuda_arquitectos_presidente.csv', import.meta.url)

const BASE       = 'https://verificate.codiaenlinea.com'
const TIMEOUT_MS = 12000
const PAUSA_MS   = 500

// ── .env.local ────────────────────────────────────────────────────────────────
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

if (GUARDAR && (!SUPABASE_URL || !SUPABASE_ANON_KEY)) {
  console.error('Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY en .env.local')
  process.exit(1)
}

const supabase = GUARDAR ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null

// ── Leer y filtrar el CSV ─────────────────────────────────────────────────────
function leerCsv(ruta) {
  const raw = readFileSync(ruta, 'utf8').replace(/^﻿/, '')
  const lineas = raw.split(/\r?\n/).filter(l => l.trim() !== '')
  const cabecera = lineas[0].split(',').map(h => h.trim())
  const idx = name => cabecera.indexOf(name)
  const iCod = idx('codigo'), iNom = idx('nombre_completo')
  const iCed = idx('cedula'), iNuc = idx('nucleo')
  if (iCod === -1 || iNuc === -1) {
    console.error('El CSV no tiene las columnas esperadas (codigo, nucleo). Cabecera:', cabecera.join(', '))
    process.exit(1)
  }
  return lineas.slice(1).map(l => {
    const c = l.split(',')
    return {
      codigo: (c[iCod] ?? '').trim(),
      nombre: (c[iNom] ?? '').trim(),
      cedula: (c[iCed] ?? '').trim(),
      nucleo: (c[iNuc] ?? '').trim().toUpperCase(),
    }
  }).filter(r => r.codigo)
}

// ── Parseo del HTML (mismo método que app/api/consulta-deuda) ─────────────────
function limpiar(raw) {
  return raw.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/\s+/g, ' ').trim()
}

function campoTabla(html, label) {
  const etiqueta = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+')
  const re = new RegExp(`<th[^>]*>\\s*${etiqueta}\\s*:?\\s*</th>\\s*<td[^>]*>([\\s\\S]*?)</td>`, 'i')
  const m = html.match(re)
  return m ? limpiar(m[1]) : ''
}

function parseMonto(raw) {
  const n = parseFloat(String(raw).replace(/,/g, ''))
  return isNaN(n) ? 0 : Math.round(n)
}

function parsearBalance(html) {
  const balance = html.match(/BALANCE\s*:?\s*<\/th>\s*<td[^>]*>\s*\$?\s*([\d,\.]+)/i)
  if (balance) return parseMonto(balance[1])
  const generico = html.match(/Balance\s*:?[^$\d]{0,40}\$?\s*([\d,\.]+)/i)
  if (generico) return parseMonto(generico[1])
  return 0
}

function parsearPosicion(html) {
  const m = html.match(/POSICION\s*:?\s*<\/b>\s*([\d,]+)/i) || html.match(/POSICION\s*:?\s*([\d,]+)/i)
  if (!m) return null
  const n = parseInt(m[1].replace(/,/g, ''), 10)
  return isNaN(n) ? null : n
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

async function consultar(codigo) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(`${BASE}/ConsultaCodias/Details/${encodeURIComponent(codigo)}?state=submited`, {
      signal: controller.signal,
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Referer': `${BASE}/ConsultaCodias/Details`,
      },
    })
    if (!res.ok) return { estado: `HTTP ${res.status}`, encontrado: false, monto: 0 }
    const html = await res.text()
    if (/NO\s+HAY\s+COLEGIADO\s+REGISTRADO/i.test(html)) {
      return { estado: 'no registrado', encontrado: false, monto: 0 }
    }
    const regional        = campoTabla(html, 'REGIONAL')
    const centro_votacion = campoTabla(html, 'CENTRO DE VOTACION')
    const nucleo          = campoTabla(html, 'NUCLEO')
    const posicion        = parsearPosicion(html)
    const monto           = parsearBalance(html)
    if (!regional && !centro_votacion && !nucleo && monto === 0 && posicion === null) {
      return { estado: 'sin datos', encontrado: false, monto: 0 }
    }
    return { estado: 'ok', encontrado: true, monto, regional, centro_votacion, nucleo, posicion }
  } finally {
    clearTimeout(timer)
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
const filas = leerCsv(CSV_IN)
let objetivo = TODOS ? filas : filas.filter(r => r.nucleo === 'ARQUITECTOS')
if (LIMITE) objetivo = objetivo.slice(0, LIMITE)

console.log('')
console.log('═══════════════════════════════════════════════════════')
console.log(' Consulta de deuda en el CODIA (verificate.codiaenlinea)')
console.log('═══════════════════════════════════════════════════════')
console.log(` CSV entrada : ${CSV_IN}`)
console.log(` Filas CSV   : ${filas.length}`)
console.log(` A consultar : ${objetivo.length} ${TODOS ? '(todos los confirmados)' : '(solo ARQUITECTOS)'}`)
console.log(` Guardar BD  : ${GUARDAR ? 'sí (set_datos_codia)' : 'NO (--no-guardar)'}`)
console.log(` Tiempo est. : ~${Math.ceil(objetivo.length * (PAUSA_MS + 700) / 60000)} min`)
console.log('')

const resumen = { conDeuda: 0, sinDeuda: 0, noEncontrado: 0, error: 0 }
const resultados = []
let totalDeuda = 0

for (let i = 0; i < objetivo.length; i++) {
  const r = objetivo[i]
  const pref = `[${String(i + 1).padStart(3)}/${objetivo.length}] #${r.codigo.padEnd(6)}`
  try {
    const res = await consultar(r.codigo)

    if (!res.encontrado) {
      console.log(`${pref} → ${res.estado}`)
      resumen.noEncontrado++
      resultados.push({ ...r, monto: '', estado: res.estado, regional: '', centro: '', posicion: '' })
    } else if (res.monto > 0) {
      console.log(`${pref} → DEUDA RD$ ${res.monto.toLocaleString()}`)
      resumen.conDeuda++
      totalDeuda += res.monto
      resultados.push({ ...r, monto: res.monto, estado: 'con deuda', regional: res.regional, centro: res.centro_votacion, posicion: res.posicion ?? '' })
    } else {
      console.log(`${pref} → sin deuda`)
      resumen.sinDeuda++
      resultados.push({ ...r, monto: 0, estado: 'sin deuda', regional: res.regional, centro: res.centro_votacion, posicion: res.posicion ?? '' })
    }

    if (GUARDAR && res.encontrado) {
      const { error } = await supabase.rpc('set_datos_codia', {
        p_codigo:          r.codigo,
        p_regional:        res.regional || null,
        p_centro_votacion: res.centro_votacion || null,
        p_nucleo:          res.nucleo || null,
        p_posicion:        res.posicion,
        p_monto:           res.monto,
      })
      if (error) console.error(`      ⚠ no se guardó en BD: ${error.message}`)
    }
  } catch (err) {
    console.log(`${pref} → ERROR: ${err.message}`)
    resumen.error++
    resultados.push({ ...r, monto: '', estado: `error: ${err.message}`, regional: '', centro: '', posicion: '' })
  }

  await sleep(PAUSA_MS)
}

// ── CSV de salida ─────────────────────────────────────────────────────────────
const esc = v => {
  const s = String(v ?? '')
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}
const cabecera = 'codigo,nombre_completo,cedula,nucleo,regional,centro_votacion,posicion,monto_deuda,estado'
const cuerpo = resultados.map(r =>
  [r.codigo, r.nombre, r.cedula, r.nucleo, r.regional, r.centro, r.posicion, r.monto, r.estado].map(esc).join(',')
).join('\n')
writeFileSync(CSV_OUT, cabecera + '\n' + cuerpo, 'utf8')

console.log('')
console.log('═══════════════════════════════════════')
console.log('RESUMEN')
console.log('═══════════════════════════════════════')
console.log(`Total consultados : ${objetivo.length}`)
console.log(`Con deuda         : ${resumen.conDeuda}`)
console.log(`Sin deuda         : ${resumen.sinDeuda}`)
console.log(`No encontrado     : ${resumen.noEncontrado}`)
console.log(`Errores           : ${resumen.error}`)
console.log(`DEUDA TOTAL       : RD$ ${totalDeuda.toLocaleString()}`)
console.log('')
console.log(`CSV generado → ${CSV_OUT.pathname.replace(/^\//, '')}`)
console.log(GUARDAR ? 'monto_deuda actualizado en Supabase.' : 'No se escribió en Supabase (--no-guardar).')
