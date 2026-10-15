import { NextRequest, NextResponse } from 'next/server'

// ════════════════════════════════════════════════════════════════════════
// Consulta de deuda EN VIVO contra el portal de socios codiaenlinea.com.
//
// El valor guardado en la base (padron.monto_deuda) se desfasa: a muchos
// colegiados les decía "tienes deuda" cuando ya habían pagado (y al revés).
// Por eso aquí consultamos el balance real al momento, igual que el script
// scripts/actualizar_deuda_login.mjs:
//   1) POST /Home/Login  (Codigo=colegiatura, Cedula=11 dígitos) → cookie
//   2) GET  /Home/IndexUser con la cookie                        → HTML
//   3) Parsea el Balance CON SIGNO (negativo = saldo a favor)
//
// Interpretación del balance:
//   < 0  → saldo a favor (habilitado)
//   = 0  → al día        (habilitado)
//   > 0  → deuda         (NO habilitado)
//
// Si la consulta en vivo no se puede completar (portal caído, timeout, etc.)
// se devuelve habilitado:true para NO bloquear a un colegiado válido por una
// falla técnica — el mensaje de deuda solo sale cuando de verdad hay deuda.
// ════════════════════════════════════════════════════════════════════════

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const BASE = 'https://codiaenlinea.com'
const TIMEOUT_MS = 12000
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

function conTimeout<T>(factory: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  return factory(ctrl.signal).finally(() => clearTimeout(timer))
}

function cookiesDe(res: Response): string {
  const h = res.headers as Headers & { getSetCookie?: () => string[] }
  const raw = typeof h.getSetCookie === 'function'
    ? h.getSetCookie()
    : (res.headers.get('set-cookie') ? [res.headers.get('set-cookie') as string] : [])
  return raw.map(c => c.split(';')[0]).filter(Boolean).join('; ')
}

function inputVal(html: string, id: string): string {
  const m = html.match(new RegExp(`id="${id}"[^>]*value="([^"]*)"`, 'i'))
  return m ? m[1].replace(/&nbsp;/gi, ' ').replace(/\s+/g, ' ').trim() : ''
}
function parsearBalance(html: string): number | null {
  const raw = inputVal(html, 'txtBalance') // ej. "$-500.00"
  if (!raw) return null
  const n = parseFloat(raw.replace(/[$\s,]/g, ''))
  return isNaN(n) ? null : Math.round(n)
}

async function consultarVivo(codigo: string, cedula: string): Promise<number | null> {
  const cedulaLogin = String(cedula).replace(/\D/g, '')
  const body = new URLSearchParams({ Codigo: String(codigo), Cedula: cedulaLogin })

  // 1) Login
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
  const cookie = cookiesDe(login)
  if (!/Logging\s+Sucessfully/i.test(txt) || !cookie) return null

  // 2) IndexUser
  const res = await conTimeout(signal => fetch(`${BASE}/Home/IndexUser`, {
    signal,
    headers: { 'User-Agent': UA, 'Cookie': cookie, 'Referer': `${BASE}/`, 'Accept': 'text/html,*/*' },
  }))
  return parsearBalance(await res.text())
}

export async function POST(req: NextRequest) {
  const { codigo, cedula } = (await req.json().catch(() => ({}))) as { codigo?: string; cedula?: string }

  const cod = String(codigo ?? '').replace(/\D/g, '')
  const ced = String(cedula ?? '').replace(/\D/g, '')

  // Sin colegiatura no se puede consultar en vivo → dejar pasar.
  if (!cod || ced.length !== 11) {
    return NextResponse.json({ encontrado: false, habilitado: true, monto: 0, fuente: 'sin_datos' })
  }

  try {
    const monto = await consultarVivo(cod, ced)
    if (monto === null) {
      // No se pudo leer el balance → no bloquear por falla técnica.
      return NextResponse.json({ encontrado: false, habilitado: true, monto: 0, fuente: 'fallback' })
    }
    return NextResponse.json({
      encontrado: true,
      habilitado: monto <= 0,
      monto,
      fuente: 'vivo',
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[consulta-deuda] error vivo:', msg)
    return NextResponse.json({ encontrado: false, habilitado: true, monto: 0, fuente: 'fallback', _error: msg })
  }
}
