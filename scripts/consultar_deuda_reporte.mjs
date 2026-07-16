/**
 * Genera un reporte masivo con deuda para el listado de códigos de Consulta 2.
 *
 * Flujo:
 *   1) Lee scripts/reporte_base.csv  (columnas: codigo,cedula,nombre_completo,regional,nucleo,telefono)
 *      exportado desde el SQL Editor de Supabase.
 *   2) Para cada colegiado consulta la deuda en codiaenlinea.com (login codigo+cedula).
 *   3) Escribe scripts/Reporte_Deuda.csv con una columna extra "deuda".
 *   4) Actualiza monto_deuda en Supabase vía RPC set_deuda_lookup.
 *
 * Uso:
 *   node scripts/consultar_deuda_reporte.mjs
 *
 * Requiere Node >= 18 (fetch nativo). Lee credenciales de .env.local.
 */

import { readFileSync, writeFileSync } from 'fs'
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

// ── Leer CSV base ─────────────────────────────────────────────────────────────

function parseCsv(texto) {
  const filas = []
  let campo = '', fila = [], enComillas = false
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i]
    if (enComillas) {
      if (c === '"' && texto[i + 1] === '"') { campo += '"'; i++ }
      else if (c === '"') enComillas = false
      else campo += c
    } else {
      if (c === '"') enComillas = true
      else if (c === ',') { fila.push(campo); campo = '' }
      else if (c === '\n') { fila.push(campo); filas.push(fila); fila = []; campo = '' }
      else if (c === '\r') { /* ignorar */ }
      else campo += c
    }
  }
  if (campo.length > 0 || fila.length > 0) { fila.push(campo); filas.push(fila) }
  return filas
}

const csvRaw = readFileSync(new URL('./reporte_base.csv', import.meta.url), 'utf8')
const filas = parseCsv(csvRaw).filter(f => f.length > 1 && f.some(v => v.trim() !== ''))
const header = filas.shift().map(h => h.trim().toLowerCase())

const idx = {
  codigo: header.indexOf('codigo'),
  cedula: header.indexOf('cedula'),
  nombre: header.indexOf('nombre_completo'),
  regional: header.indexOf('regional'),
  nucleo: header.indexOf('nucleo'),
  telefono: header.indexOf('telefono'),
}

if (idx.codigo === -1 || idx.cedula === -1) {
  console.error('El CSV debe tener al menos las columnas: codigo, cedula')
  console.error('Encabezado detectado:', header.join(', '))
  process.exit(1)
}

const LISTADO = filas.map(f => ({
  codigo: (f[idx.codigo] || '').trim(),
  cedula: (f[idx.cedula] || '').trim(),
  nombre: idx.nombre !== -1 ? (f[idx.nombre] || '').trim() : '',
  regional: idx.regional !== -1 ? (f[idx.regional] || '').trim() : '',
  nucleo: idx.nucleo !== -1 ? (f[idx.nucleo] || '').trim() : '',
  telefono: idx.telefono !== -1 ? (f[idx.telefono] || '').trim() : '',
}))

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

// ── CSV de salida ─────────────────────────────────────────────────────────────

function csvCampo(v) {
  const s = String(v ?? '')
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

// ── Main ──────────────────────────────────────────────────────────────────────

const salida = [['codigo', 'cedula', 'nombre_completo', 'regional', 'nucleo', 'telefono', 'deuda']]
const resumen = { sinDeuda: 0, conDeuda: 0, noEncontrado: 0, error: 0 }

console.log(`\nConsultando deuda para ${LISTADO.length} colegiados en CODIA en línea...\n`)

for (let i = 0; i < LISTADO.length; i++) {
  const r = LISTADO[i]
  process.stdout.write(`[${String(i + 1).padStart(3)}/${LISTADO.length}] #${r.codigo} ${r.cedula} → `)

  let deuda = ''
  try {
    if (!r.cedula) {
      console.log('sin cédula en CSV')
      resumen.noEncontrado++
    } else {
      const { encontrado, monto } = await consultarDeuda(r.codigo, r.cedula)
      if (!encontrado) {
        console.log('no encontrado')
        resumen.noEncontrado++
        deuda = ''
      } else {
        deuda = monto
        if (monto > 0) { console.log(`DEUDA: RD$ ${monto.toLocaleString()}`); resumen.conDeuda++ }
        else { console.log('sin deuda'); resumen.sinDeuda++ }
        await supabase.rpc('set_deuda_lookup', { p_codigo: r.codigo, p_monto: monto })
      }
    }
  } catch (err) {
    console.log(`ERROR: ${err.message}`)
    resumen.error++
  }

  salida.push([r.codigo, r.cedula, r.nombre, r.regional, r.nucleo, r.telefono, deuda])
  await sleep(800)
}

const rutaSalida = new URL('./Reporte_Deuda.csv', import.meta.url)
writeFileSync(rutaSalida, '﻿' + salida.map(f => f.map(csvCampo).join(',')).join('\r\n'), 'utf8')

console.log('\n═══════════════════════════════════════')
console.log('RESUMEN FINAL')
console.log('═══════════════════════════════════════')
console.log(`Total procesados : ${LISTADO.length}`)
console.log(`Con deuda        : ${resumen.conDeuda}`)
console.log(`Sin deuda        : ${resumen.sinDeuda}`)
console.log(`No encontrado    : ${resumen.noEncontrado}`)
console.log(`Errores          : ${resumen.error}`)
console.log(`\nReporte generado: scripts/Reporte_Deuda.csv`)
