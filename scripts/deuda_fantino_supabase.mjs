#!/usr/bin/env node
// ════════════════════════════════════════════════════════════════════════
// Arquitectos de Fantino: saca los códigos de Supabase, consulta la deuda en
// el portal verificate y la guarda de vuelta en `padron`. Todo directo a la
// base, sin archivos intermedios.
//
//   node scripts/deuda_fantino_supabase.mjs
//
// Requiere en .env.local (o en el entorno):
//   NEXT_PUBLIC_SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY   <- necesaria para leer `padron` (tiene RLS)
// ════════════════════════════════════════════════════════════════════════
import fs from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const BASE = 'https://verificate.codiaenlinea.com'
const TIMEOUT_MS = 12000
const CONCURRENCIA = 5
const PAUSA_MS = 150
const FILTRO_CENTRO = '%fantino%'   // ajusta si quieres otro centro/núcleo

// ── env ─────────────────────────────────────────────────────────────────────
function cargarEnv() {
  try {
    for (const l of fs.readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split(/\r?\n/)) {
      const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
    }
  } catch {}
}
cargarEnv()
const URL_SB = process.env.NEXT_PUBLIC_SUPABASE_URL
const KEY_SB = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!URL_SB || !KEY_SB) {
  console.error('✗ Faltan NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en .env.local')
  process.exit(1)
}
const sb = createClient(URL_SB, KEY_SB, { auth: { persistSession: false } })

// ── parseo de verificate (idéntico a /api/consulta-deuda) ───────────────────
function campoTabla(html, label) {
  const et = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+')
  const m = html.match(new RegExp(`<th[^>]*>\\s*${et}\\s*:?\\s*</th>\\s*<td[^>]*>([\\s\\S]*?)</td>`, 'i'))
  return m ? m[1] : ''
}
function parsearPosicion(html) {
  const m = html.match(/POSICION\s*:?\s*<\/b>\s*([\d,]+)/i) || html.match(/POSICION\s*:?\s*([\d,]+)/i)
  if (!m) return null
  const n = parseInt(m[1].replace(/,/g, ''), 10); return isNaN(n) ? null : n
}
function parsearBalance(html) {
  const b = html.match(/BALANCE\s*:?\s*<\/th>\s*<td[^>]*>\s*\$?\s*([\d,.]+)/i)
    || html.match(/Balance\s*:?[^$\d]{0,40}\$?\s*([\d,.]+)/i)
  if (!b) return 0
  const n = parseFloat(b[1].replace(/,/g, '')); return isNaN(n) ? 0 : Math.round(n)
}
const limpiar = r => r.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/\s+/g, ' ').trim()

async function consultar(codigo) {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(`${BASE}/ConsultaCodias/Details/${encodeURIComponent(codigo)}?state=submited`, {
      signal: ctrl.signal,
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Referer': `${BASE}/ConsultaCodias/Details`,
      },
    })
    if (!res.ok) return { codigo, encontrado: false, monto: 0, _err: `HTTP ${res.status}` }
    const html = await res.text()
    if (/NO\s+HAY\s+COLEGIADO\s+REGISTRADO/i.test(html)) return { codigo, encontrado: false, monto: 0, _err: 'no registrado' }
    const regional = limpiar(campoTabla(html, 'REGIONAL'))
    const centro   = limpiar(campoTabla(html, 'CENTRO DE VOTACION'))
    const nucleo   = limpiar(campoTabla(html, 'NUCLEO'))
    const posicion = parsearPosicion(html)
    const monto    = parsearBalance(html)
    if (!regional && !centro && !nucleo && monto === 0 && posicion === null) return { codigo, encontrado: false, monto: 0, _err: 'sin campos' }
    return { codigo, encontrado: true, regional, centro, nucleo, posicion, monto }
  } catch (e) {
    return { codigo, encontrado: false, monto: 0, _err: e.name === 'AbortError' ? 'timeout' : String(e.message || e) }
  } finally { clearTimeout(t) }
}

async function guardar(f) {
  if (!f.encontrado) return
  const { error } = await sb.rpc('set_datos_codia', {
    p_codigo:          String(f.codigo),
    p_regional:        f.regional || null,
    p_centro_votacion: f.centro || null,
    p_nucleo:          f.nucleo || null,
    p_posicion:        f.posicion,
    p_monto:           f.monto,
  })
  if (error) f._err = 'guardar: ' + error.message
}

// ── main ────────────────────────────────────────────────────────────────────
async function main() {
  const { data, error } = await sb
    .from('padron')
    .select('codigo, nombre_completo')
    .eq('nucleo', 'ARQUITECTOS')
    .ilike('centro_votacion', FILTRO_CENTRO)
    .order('codigo')
  if (error) { console.error('✗ Error leyendo padron:', error.message); process.exit(1) }

  const codigos = data.map(r => String(r.codigo))
  const nombre = Object.fromEntries(data.map(r => [String(r.codigo), r.nombre_completo]))
  console.error(`${codigos.length} arquitectos en Fantino. Consultando y guardando deuda...`)

  const filas = []
  for (let i = 0; i < codigos.length; i += CONCURRENCIA) {
    const r = await Promise.all(codigos.slice(i, i + CONCURRENCIA).map(consultar))
    await Promise.all(r.map(guardar))
    filas.push(...r)
    console.error(`  ${Math.min(i + CONCURRENCIA, codigos.length)}/${codigos.length}`)
    if (i + CONCURRENCIA < codigos.length) await new Promise(s => setTimeout(s, PAUSA_MS))
  }

  console.log('codigo,nombre,centro_votacion,posicion,balance,habilitado,nota')
  for (const f of filas) {
    const c = v => `"${String(v ?? '').replace(/"/g, '""')}"`
    console.log([f.codigo, c(nombre[f.codigo]), c(f.centro || ''), f.posicion ?? '', f.monto, f.monto === 0, c(f._err || '')].join(','))
  }
  const cd = filas.filter(f => f.monto > 0)
  console.error(`\nGuardado en padron. ${filas.length} consultados · ${cd.length} con deuda · total RD$ ${cd.reduce((s, f) => s + f.monto, 0).toLocaleString('es-DO')}`)
}
main()
