import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const BASE = 'https://www.codiaenlinea.com'
const TIMEOUT_MS = 12000

const supabaseServer = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

function fetchConTimeout(url: string, opts: RequestInit): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  return fetch(url, { ...opts, signal: controller.signal }).finally(() => clearTimeout(timer))
}

export async function POST(req: NextRequest) {
  const { cedula, codigo } = await req.json().catch(() => ({})) as {
    cedula?: string
    codigo?: string
  }

  if (!cedula || !codigo) {
    return NextResponse.json({ encontrado: false, habilitado: true, monto: 0 })
  }

  const cedulaLimpia = cedula.replace(/-/g, '')

  try {
    // ── Paso 1: Login ────────────────────────────────────────────────────────
    const loginRes = await fetchConTimeout(`${BASE}/Home/Login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/javascript, */*; q=0.01',
        'X-Requested-With': 'XMLHttpRequest',
        'Referer': `${BASE}/`,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      },
      body: JSON.stringify({ Cedula: cedulaLimpia, Codigo: codigo }),
      redirect: 'manual',
    })

    // Capturar cookies de sesión
    // getSetCookie() es el método correcto en Node.js 18+ — headers.get('set-cookie')
    // devuelve null en entornos server-side porque Set-Cookie es forbidden header en Fetch spec
    const rawCookies: string[] =
      typeof (loginRes.headers as unknown as { getSetCookie?: () => string[] }).getSetCookie === 'function'
        ? (loginRes.headers as unknown as { getSetCookie: () => string[] }).getSetCookie()
        : (loginRes.headers.get('set-cookie') ?? '').split(/,(?=[^ ])/)

    const cookieHeader = rawCookies
      .map(c => c.split(';')[0].trim())
      .filter(Boolean)
      .join('; ')

    console.log(`[consulta-deuda] cookies recibidas (${rawCookies.length}): ${cookieHeader}`)

    if (!cookieHeader) {
      console.log(`[consulta-deuda] login rechazado para codigo=${codigo}`)
      return NextResponse.json({ encontrado: false, habilitado: true, monto: 0 })
    }

    // Verificar si el sistema devolvió JSON de error explícito
    const contentType = loginRes.headers.get('content-type') ?? ''
    if (contentType.includes('application/json')) {
      const loginJson = await loginRes.json().catch(() => null)
      if (loginJson && loginJson.success === false) {
        return NextResponse.json({ encontrado: false, habilitado: true, monto: 0 })
      }
    }

    // ── Paso 2: Página de balance ────────────────────────────────────────────
    const profileRes = await fetchConTimeout(`${BASE}/Home/IndexUser`, {
      headers: {
        'Cookie': cookieHeader,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Referer': `${BASE}/`,
      },
    })

    if (!profileRes.ok) {
      console.log(`[consulta-deuda] IndexUser devolvió ${profileRes.status} para codigo=${codigo}`)
      return NextResponse.json({ encontrado: false, habilitado: true, monto: 0 })
    }

    const html = await profileRes.text()

    // ── Paso 3: Parsear balance ──────────────────────────────────────────────
    const monto = parsearBalance(html)
    const habilitado = monto === 0

    // ── Paso 4: Actualizar BD ────────────────────────────────────────────────
    await supabaseServer.rpc('set_deuda_lookup', {
      p_codigo: String(codigo),
      p_monto:  monto,
    })

    console.log(`[consulta-deuda] codigo=${codigo} monto=${monto}`)
    return NextResponse.json({ encontrado: true, habilitado, monto })

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[consulta-deuda] error para codigo=${codigo}:`, msg)
    // Siempre devuelve 200 para que el cliente pueda leer el JSON
    return NextResponse.json({ encontrado: false, habilitado: true, monto: 0, _error: msg })
  }
}

function parsearBalance(html: string): number {
  const balance = html.match(/Balance\s*:?[^$]{0,200}\$\s*([\d,\.]+)/i)
  if (balance) return parseMonto(balance[1])

  const subTotal = html.match(/Sub\s*Total\s*:\s*\$\s*([\d,\.]+)/i)
  if (subTotal) return parseMonto(subTotal[1])

  return 0
}

function parseMonto(raw: string): number {
  const n = parseFloat(raw.replace(/,/g, ''))
  return isNaN(n) ? 0 : Math.round(n)
}
