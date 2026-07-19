#!/usr/bin/env node
// ════════════════════════════════════════════════════════════════════════
// Consulta de deuda por línea de comando contra el portal público de CODIA
// (verificate.codiaenlinea.com). Mismo origen y parseo que /api/consulta-deuda.
//
// Consulta la deuda Y la guarda en la base (RPC set_datos_codia, igual que el app).
//
// Uso:
//   node scripts/consulta_deuda_cmd.mjs --file codigos.txt > deuda.csv
//   node scripts/consulta_deuda_cmd.mjs 4733 5155 5777 ...     (códigos sueltos)
//   node scripts/consulta_deuda_cmd.mjs --file codigos.txt --no-guardar   (solo consultar)
//
// Salida: CSV -> codigo,encontrado,centro_votacion,posicion,balance,habilitado
// ════════════════════════════════════════════════════════════════════════
import fs from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const BASE = 'https://verificate.codiaenlinea.com'
const TIMEOUT_MS = 12000
const CONCURRENCIA = 5          // peticiones en paralelo (amable con el portal)
const PAUSA_MS = 150            // respiro entre tandas

// ── Parseo (idéntico a app/api/consulta-deuda/route.ts) ─────────────────────
function campoTabla(html, label) {
  const etiqueta = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+')
  const re = new RegExp(`<th[^>]*>\\s*${etiqueta}\\s*:?\\s*</th>\\s*<td[^>]*>([\\s\\S]*?)</td>`, 'i')
  const m = html.match(re)
  return m ? m[1] : ''
}
function parsearPosicion(html) {
  const m = html.match(/POSICION\s*:?\s*<\/b>\s*([\d,]+)/i) || html.match(/POSICION\s*:?\s*([\d,]+)/i)
  if (!m) return null
  const n = parseInt(m[1].replace(/,/g, ''), 10)
  return isNaN(n) ? null : n
}
function parsearBalance(html) {
  const b = html.match(/BALANCE\s*:?\s*<\/th>\s*<td[^>]*>\s*\$?\s*([\d,.]+)/i)
  if (b) return parseMonto(b[1])
  const g = html.match(/Balance\s*:?[^$\d]{0,40}\$?\s*([\d,.]+)/i)
  if (g) return parseMonto(g[1])
  return 0
}
function parseMonto(raw) { const n = parseFloat(raw.replace(/,/g, '')); return isNaN(n) ? 0 : Math.round(n) }
function limpiar(raw) {
  return raw.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/\s+/g, ' ').trim()
}

async function consultar(codigo) {
  const url = `${BASE}/ConsultaCodias/Details/${encodeURIComponent(codigo)}?state=submited`
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Referer': `${BASE}/ConsultaCodias/Details`,
      },
    })
    if (!res.ok) return { codigo, encontrado: false, centro_votacion: '', posicion: '', monto: 0, habilitado: true, _err: `HTTP ${res.status}` }
    const html = await res.text()
    if (/NO\s+HAY\s+COLEGIADO\s+REGISTRADO/i.test(html))
      return { codigo, encontrado: false, centro_votacion: '', posicion: '', monto: 0, habilitado: true, _err: 'no registrado' }
    const regional = limpiar(campoTabla(html, 'REGIONAL'))
    const centro   = limpiar(campoTabla(html, 'CENTRO DE VOTACION'))
    const nucleo   = limpiar(campoTabla(html, 'NUCLEO'))
    const posicion = parsearPosicion(html)
    const monto    = parsearBalance(html)
    if (!regional && !centro && !nucleo && monto === 0 && posicion === null)
      return { codigo, encontrado: false, centro_votacion: '', posicion: '', monto: 0, habilitado: true, _err: 'sin campos' }
    return { codigo, encontrado: true, regional, centro_votacion: centro, nucleo, posicion: posicion ?? '', monto, habilitado: monto === 0 }
  } catch (e) {
    return { codigo, encontrado: false, centro_votacion: '', posicion: '', monto: 0, habilitado: true, _err: e.name === 'AbortError' ? 'timeout' : String(e.message || e) }
  } finally { clearTimeout(timer) }
}

// ── Supabase (lee .env.local para guardar con set_datos_codia) ──────────────
function cargarEnv() {
  try {
    for (const linea of fs.readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split(/\r?\n/)) {
      const m = linea.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
    }
  } catch { /* si no hay .env.local, se usan las vars del entorno */ }
}
function getSupabase() {
  cargarEnv()
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) { console.error('⚠ Faltan NEXT_PUBLIC_SUPABASE_URL / ANON_KEY; no se guardará.'); return null }
  return createClient(url, key)
}

async function guardar(sb, f) {
  if (!sb || !f.encontrado) return
  const { error } = await sb.rpc('set_datos_codia', {
    p_codigo:          String(f.codigo),
    p_regional:        f.regional || null,
    p_centro_votacion: f.centro_votacion || null,
    p_nucleo:          f.nucleo || null,
    p_posicion:        f.posicion === '' ? null : f.posicion,
    p_monto:           f.monto,
  })
  if (error) { f._err = (f._err ? f._err + '; ' : '') + 'guardar: ' + error.message }
}

// ── Entrada ────────────────────────────────────────────────────────────────
function leerCodigos() {
  const args = process.argv.slice(2)
  let raw = []
  const fi = args.indexOf('--file')
  if (fi !== -1 && args[fi + 1]) {
    raw = fs.readFileSync(args[fi + 1], 'utf8').split(/[\r\n,;\s]+/)
  } else {
    raw = args
  }
  return [...new Set(raw.map(s => s.replace(/[^0-9]/g, '')).filter(Boolean))]
}

async function main() {
  const codigos = leerCodigos()
  if (codigos.length === 0) {
    console.error('Uso: node scripts/consulta_deuda_cmd.mjs <codigo...> | --file codigos.txt')
    process.exit(1)
  }
  const guardarEnBase = !process.argv.includes('--no-guardar')
  const sb = guardarEnBase ? getSupabase() : null
  console.error(`Consultando ${codigos.length} códigos${sb ? ' (se guardan en la base)' : ''}...`)
  const filas = []
  for (let i = 0; i < codigos.length; i += CONCURRENCIA) {
    const tanda = codigos.slice(i, i + CONCURRENCIA)
    const r = await Promise.all(tanda.map(consultar))
    await Promise.all(r.map(f => guardar(sb, f)))
    filas.push(...r)
    console.error(`  ${Math.min(i + CONCURRENCIA, codigos.length)}/${codigos.length}`)
    if (i + CONCURRENCIA < codigos.length) await new Promise(s => setTimeout(s, PAUSA_MS))
  }
  // CSV
  console.log('codigo,encontrado,centro_votacion,posicion,balance,habilitado,nota')
  for (const f of filas) {
    const c = v => `"${String(v ?? '').replace(/"/g, '""')}"`
    console.log([f.codigo, f.encontrado, c(f.centro_votacion), f.posicion, f.monto, f.habilitado, c(f._err || '')].join(','))
  }
  const conDeuda = filas.filter(f => f.monto > 0)
  const total = conDeuda.reduce((s, f) => s + f.monto, 0)
  console.error(`\nResumen: ${filas.length} consultados · ${conDeuda.length} con deuda · total RD$ ${total.toLocaleString('es-DO')}`)
}
main()
