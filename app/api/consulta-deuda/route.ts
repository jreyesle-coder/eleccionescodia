import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const BASE = 'https://www.codiaenlinea.com'

// Cliente Supabase server-side (anon key — llama RPCs con security definer)
const supabaseServer = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

/**
 * POST /api/consulta-deuda
 * Body: { cedula: string, codigo: string }
 * Returns: { monto: number, habilitado: boolean, encontrado: boolean, error?: string }
 *
 * Consulta la deuda real de un colegiado en codiaenlinea.com y
 * actualiza monto_deuda en la BD. Se llama en background desde:
 *   - BuscadorPublico (Verifícate): al mostrar resultados de búsqueda
 *   - PanelDirigente: al confirmar intención de un colegiado
 */
export async function POST(req: NextRequest) {
  try {
    const { cedula, codigo } = await req.json() as {
      cedula?: string
      codigo?: string
    }

    if (!cedula || !codigo) {
      return NextResponse.json({ encontrado: false, habilitado: true, monto: 0 }, { status: 400 })
    }

    // codiaenlinea.com espera la cédula sin guiones
    const cedulaLimpia = cedula.replace(/-/g, '')

    // ── Paso 1: Login en codiaenlinea.com ────────────────────────────────────
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

    // Capturar cookies de sesión
    const setCookie = loginRes.headers.get('set-cookie') ?? ''
    const cookieHeader = setCookie
      .split(',')
      .map(c => c.split(';')[0].trim())
      .filter(Boolean)
      .join('; ')

    // 302 sin cookie = login rechazado
    if (!cookieHeader) {
      return NextResponse.json({ encontrado: false, habilitado: true, monto: 0 })
    }

    // Verificar si el sistema devolvió JSON de error
    const contentType = loginRes.headers.get('content-type') ?? ''
    if (contentType.includes('application/json')) {
      const loginJson = await loginRes.json().catch(() => null)
      if (loginJson && loginJson.success === false) {
        return NextResponse.json({ encontrado: false, habilitado: true, monto: 0 })
      }
    }

    // ── Paso 2: Obtener página de balance ─────────────────────────────────────
    const profileRes = await fetch(`${BASE}/Home/IndexUser`, {
      headers: {
        'Cookie': cookieHeader,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': `${BASE}/`,
      },
    })

    if (!profileRes.ok) {
      return NextResponse.json({ encontrado: false, habilitado: true, monto: 0 })
    }

    const html = await profileRes.text()

    // ── Paso 3: Parsear el balance ────────────────────────────────────────────
    const monto = parsearBalance(html)
    const habilitado = monto === 0  // sin deuda = habilitado

    // ── Paso 4: Actualizar BD siempre (monto 0 también limpia deudas pagadas) ─
    await supabaseServer.rpc('set_deuda_lookup', {
      p_codigo: String(codigo),
      p_monto:  monto,
    })

    return NextResponse.json({ encontrado: true, habilitado, monto })

  } catch (err) {
    console.error('[consulta-deuda]', err)
    return NextResponse.json({ encontrado: false, habilitado: true, monto: 0 }, { status: 500 })
  }
}

/**
 * Extrae el monto de deuda del HTML de IndexUser.
 * Orden de prioridad: Sub Total → Balance → CUOTA
 */
function parsearBalance(html: string): number {
  const subTotal = html.match(/Sub\s*Total\s*:\s*\$\s*([\d,\.]+)/i)
  if (subTotal) return parseMonto(subTotal[1])

  const balance = html.match(/[Bb]alance[^<]{0,20}<[^>]+>\s*\$?\s*([\d,\.]+)/i)
  if (balance) return parseMonto(balance[1])

  const cuota = html.match(/CUOTA[^$]*\$\s*([\d,\.]+)/i)
  if (cuota) return parseMonto(cuota[1])

  return 0
}

function parseMonto(raw: string): number {
  const n = parseFloat(raw.replace(/,/g, ''))
  return isNaN(n) ? 0 : Math.round(n)
}
