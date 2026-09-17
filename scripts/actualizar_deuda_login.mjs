#!/usr/bin/env node
// ════════════════════════════════════════════════════════════════════════
// Actualización MASIVA de deuda desde el portal codiaenlinea.com (CON LOGIN).
//
// El portal público sin login (verificate.codiaenlinea.com) fue dado de baja.
// La única fuente en línea es el portal de socios, que exige iniciar sesión
// con Cedula + Colegiatura de cada colegiado. Este script, para cada uno:
//   1) POST /Home/Login  (Codigo=colegiatura, Cedula=cedula)  → cookie sesión
//   2) GET  /Home/IndexUser  con la cookie                     → HTML con Balance
//   3) Parsea el Balance CON SIGNO (negativo = saldo a favor)
//   4) Guarda en la base con el RPC set_datos_codia (monto_deuda con signo)
//
// La lista de colegiados (codigo + cedula) se lee del propio padrón usando la
// SERVICE_ROLE key de .env.local. Reanudable: guarda progreso en un CSV y al
// re-ejecutar salta los códigos ya consultados.
//
// USO (desde la carpeta del proyecto, con Node 20+):
//   node scripts/actualizar_deuda_login.mjs                 # padrón completo
//   node scripts/actualizar_deuda_login.mjs --limit 20      # prueba: 20 colegiados
//   node scripts/actualizar_deuda_login.mjs --solo 34129    # solo un código
//   node scripts/actualizar_deuda_login.mjs --no-guardar    # no escribe en la base
//   node scripts/actualizar_deuda_login.mjs --dump 34129    # vuelca el HTML de IndexUser
//   node scripts/actualizar_deuda_login.mjs --salida mi.csv # otro archivo de progreso
//
// REQUISITO: correr antes la migración supabase/migrations/20260825000000_
// deuda_saldo_a_favor.sql (permite guardar saldo a favor / negativos).
// ════════════════════════════════════════════════════════════════════════
import fs from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const BASE          = 'https://codiaenlinea.com'
const TIMEOUT_MS    = 15000
const CONCURRENCIA  = 4         // colegiados en paralelo (amable con el portal)
const PAUSA_MS      = 250       // respiro entre tandas
const UA            = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
const LOGIN_OK      = 'Logging Sucessfully'   // string exacto que devuelve el portal

// ── Argumentos ──────────────────────────────────────────────────────────────
const args     = process.argv.slice(2)
const getArg    = n => { const i = args.indexOf(n); return i !== -1 ? args[i + 1] : null }
const limite    = getArg('--limit')  ? parseInt(getArg('--limit'), 10) : null
const soloCod   = getArg('--solo')   ? getArg('--solo').split(',').map(s => s.replace(/\D/g, '')).filter(Boolean) : null
const dumpCod   = getArg('--dump')   ? getArg('--dump').replace(/\D/g, '') : null
const guardar   = !args.includes('--no-guardar')
const conDeuda  = args.includes('--con-deuda')   // solo los que hoy tienen monto_deuda > 0
const salida    = getArg('--salida') || 'deuda_actualizada.csv'

// ── .env.local ──────────────────────────────────────────────────────────────
function cargarEnv() {
  try {
    for (const l of fs.readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split(/\r?\n/)) {
      const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
    }
  } catch { /* usa el entorno si no hay .env.local */ }
}
cargarEnv()
const SB_URL     = process.env.NEXT_PUBLIC_SUPABASE_URL
const SB_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SB_URL || !SB_SERVICE) {
  console.error('✖ Faltan NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY en .env.local')
  process.exit(1)
}
const sb = createClient(SB_URL, SB_SERVICE, { auth: { persistSession: false } })

// ── Utilidades HTTP ─────────────────────────────────────────────────────────
function conTimeout(promiseFactory) {
  const ctrl  = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  return promiseFactory(ctrl.signal).finally(() => clearTimeout(timer))
}

// Toma las cookies de una respuesta (Node 20+: getSetCookie) y arma el header Cookie.
function cookiesDe(res) {
  const raw = typeof res.headers.getSetCookie === 'function'
    ? res.headers.getSetCookie()
    : (res.headers.get('set-cookie') ? [res.headers.get('set-cookie')] : [])
  return raw.map(c => c.split(';')[0]).filter(Boolean).join('; ')
}

// ── Parseo de IndexUser ─────────────────────────────────────────────────────
// Los datos vienen en el atributo value de <input id="...">:
//   txtColegiatura, txtNOMBRE, txtAPELLIDO, txtCARRERA, txtBalance ($-500.00)
// Balance: $-500.00 = saldo a favor · $0.00 = al día · $1,200.00 = deuda
function inputVal(html, id) {
  const m = html.match(new RegExp(`id="${id}"[^>]*value="([^"]*)"`, 'i'))
  return m ? m[1].replace(/&nbsp;/gi, ' ').replace(/\s+/g, ' ').trim() : ''
}
function parsearBalance(html) {
  const raw = inputVal(html, 'txtBalance')          // ej. "$-500.00"
  if (!raw) return null
  const limpio = raw.replace(/[$\s,]/g, '')          // "-500.00"
  const n = parseFloat(limpio)
  return isNaN(n) ? null : Math.round(n)
}

// ── Consulta de UN colegiado ────────────────────────────────────────────────
async function consultar(codigo, cedula) {
  // 1) Login  (el portal exige la cédula SIN guiones — 11 dígitos pelados)
  const cedulaLogin = String(cedula).replace(/\D/g, '')
  const body = new URLSearchParams({ Codigo: String(codigo), Cedula: cedulaLogin })
  let cookie = ''
  try {
    const login = await conTimeout(signal => fetch(`${BASE}/Home/Login`, {
      method: 'POST', signal,
      headers: {
        'User-Agent': UA,
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'X-Requested-With': 'XMLHttpRequest',
        'Accept': 'application/json, text/javascript, */*; q=0.01',
        'Referer': `${BASE}/`,
      },
      body,
    }))
    const txt = await login.text()
    cookie = cookiesDe(login)
    if (!/Logging\s+Sucessfully/i.test(txt) || !cookie) {
      const motivo = txt.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80) || `HTTP ${login.status}`
      return { codigo, encontrado: false, monto: null, nombre: '', carrera: '', _err: `login: ${motivo}` }
    }
  } catch (e) {
    return { codigo, encontrado: false, monto: null, nombre: '', carrera: '', _err: `login: ${e.name === 'AbortError' ? 'timeout' : e.message}` }
  }

  // 2) IndexUser
  try {
    const res = await conTimeout(signal => fetch(`${BASE}/Home/IndexUser`, {
      signal,
      headers: { 'User-Agent': UA, 'Cookie': cookie, 'Referer': `${BASE}/`, 'Accept': 'text/html,*/*' },
    }))
    const html = await res.text()

    if (dumpCod && String(codigo) === dumpCod) {
      const f = `indexuser_${codigo}.html`
      fs.writeFileSync(f, html)
      console.error(`  ↳ HTML volcado en ${f} (${html.length} bytes)`)
    }

    const monto   = parsearBalance(html)
    const nombre  = [inputVal(html, 'txtNOMBRE'), inputVal(html, 'txtAPELLIDO')].filter(Boolean).join(' ')
    const carrera = inputVal(html, 'txtCARRERA')

    if (monto === null) {
      return { codigo, encontrado: false, monto: null, nombre, carrera, _err: 'sin balance en IndexUser' }
    }
    return { codigo, encontrado: true, monto, nombre, carrera, _err: '' }
  } catch (e) {
    return { codigo, encontrado: false, monto: null, nombre: '', carrera: '', _err: `index: ${e.name === 'AbortError' ? 'timeout' : e.message}` }
  }
}

// ── Guardar en la base ──────────────────────────────────────────────────────
async function guardarEnBase(f) {
  if (!guardar || !f.encontrado) return
  const { error } = await sb.rpc('set_datos_codia', {
    p_codigo: String(f.codigo),
    p_regional: null, p_centro_votacion: null, p_nucleo: null, p_posicion: null,
    p_monto: f.monto,
  })
  if (error) f._err = (f._err ? f._err + '; ' : '') + 'guardar: ' + error.message
}

// ── Lista de colegiados desde el padrón ─────────────────────────────────────
async function leerPadron() {
  if (soloCod) {
    // Trae solo los códigos pedidos (con su cédula)
    const { data, error } = await sb.from('padron')
      .select('codigo,cedula,nombre_completo').in('codigo', soloCod.map(Number))
    if (error) throw new Error('leer padrón: ' + error.message)
    return data
  }
  // Padrón completo (o solo con deuda), paginado (PostgREST limita a 1000)
  const todos = []
  const PAG = 1000
  for (let desde = 0; ; desde += PAG) {
    let q = sb.from('padron')
      .select('codigo,cedula,nombre_completo')
      .not('codigo', 'is', null)
    if (conDeuda) q = q.gt('monto_deuda', 0)   // --con-deuda: solo monto_deuda > 0
    const { data, error } = await q
      .order('codigo', { ascending: true })
      .range(desde, desde + PAG - 1)
    if (error) throw new Error('leer padrón: ' + error.message)
    todos.push(...data)
    if (data.length < PAG) break
  }
  return todos
}

// Cédula válida para login (descarta placeholders 000-0000000-0, vacíos, etc.)
function cedulaValida(c) {
  if (!c) return false
  const d = String(c).replace(/\D/g, '')
  return d.length === 11 && !/^0+$/.test(d)
}

// ── CSV de progreso (reanudable) ────────────────────────────────────────────
const CAB = 'codigo,encontrado,monto,estado,nombre,carrera,nota'
function estadoDeMonto(m) {
  if (m === null || m === undefined) return ''
  if (m < 0) return 'saldo_a_favor'
  if (m === 0) return 'al_dia'
  return 'con_deuda'
}
// Solo se consideran "hechos" los que tuvieron ÉXITO (encontrado=true).
// Los fallidos se reintentan en la próxima corrida.
function yaProcesados() {
  if (!fs.existsSync(salida)) return new Set()
  const set = new Set()
  const lineas = fs.readFileSync(salida, 'utf8').split(/\r?\n/).slice(1)
  for (const l of lineas) {
    const cols = l.split(',')
    const cod = cols[0]?.replace(/"/g, '').trim()
    const ok  = cols[1]?.replace(/"/g, '').trim() === 'true'
    if (cod && ok) set.add(cod)
  }
  return set
}
function csvLinea(f) {
  const q = v => `"${String(v ?? '').replace(/"/g, '""')}"`
  return [f.codigo, f.encontrado, f.monto ?? '', estadoDeMonto(f.monto), q(f.nombre), q(f.carrera), q(f._err)].join(',')
}

// ── Main ────────────────────────────────────────────────────────────────────
async function main() {
  console.error('Leyendo padrón…')
  let lista = await leerPadron()

  // Filtrar por cédula válida y aplicar --limit
  const invalidas = lista.filter(r => !cedulaValida(r.cedula)).length
  lista = lista.filter(r => cedulaValida(r.cedula))
  if (limite) lista = lista.slice(0, limite)

  // Reanudar: saltar los ya guardados en el CSV
  const hechos = yaProcesados()
  const pendientes = lista.filter(r => !hechos.has(String(r.codigo)))

  const nuevo = !fs.existsSync(salida)
  const out = fs.createWriteStream(salida, { flags: 'a' })
  if (nuevo) out.write(CAB + '\n')

  console.error(`Total: ${lista.length}  ·  sin cédula válida (omitidos): ${invalidas}  ·  ya hechos: ${hechos.size}  ·  a procesar: ${pendientes.length}`)
  console.error(guardar ? 'Se GUARDA en la base (set_datos_codia).' : 'Modo --no-guardar: solo consulta.')
  if (dumpCod) console.error(`Modo --dump: se volcará el HTML del código ${dumpCod}.`)

  let hechosN = 0, conDeuda = 0, saldoFavor = 0, alDia = 0, fallidos = 0, sumaDeuda = 0
  for (let i = 0; i < pendientes.length; i += CONCURRENCIA) {
    const tanda = pendientes.slice(i, i + CONCURRENCIA)
    const res = await Promise.all(tanda.map(r => consultar(r.codigo, r.cedula)))
    await Promise.all(res.map(guardarEnBase))
    for (const f of res) {
      out.write(csvLinea(f) + '\n')
      hechosN++
      if (!f.encontrado) fallidos++
      else if (f.monto < 0) saldoFavor++
      else if (f.monto === 0) alDia++
      else { conDeuda++; sumaDeuda += f.monto }
    }
    if ((i / CONCURRENCIA) % 25 === 0 || i + CONCURRENCIA >= pendientes.length) {
      console.error(`  ${Math.min(i + CONCURRENCIA, pendientes.length)}/${pendientes.length}  ·  deuda:${conDeuda} favor:${saldoFavor} aldia:${alDia} fallo:${fallidos}`)
    }
    if (i + CONCURRENCIA < pendientes.length) await new Promise(s => setTimeout(s, PAUSA_MS))
  }
  out.end()

  console.error('\n════════ RESUMEN ════════')
  console.error(`Procesados ahora : ${hechosN}`)
  console.error(`Con deuda        : ${conDeuda}  (total RD$ ${sumaDeuda.toLocaleString('es-DO')})`)
  console.error(`Saldo a favor    : ${saldoFavor}`)
  console.error(`Al día           : ${alDia}`)
  console.error(`Fallidos         : ${fallidos}`)
  console.error(`Progreso en      : ${salida}`)
}
main().catch(e => { console.error('✖', e.message); process.exit(1) })
