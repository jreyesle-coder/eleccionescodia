import { NextRequest, NextResponse } from 'next/server'

const BASE = 'https://www.codiaenlinea.com'

/**
 * POST /api/consulta-deuda
 * Body: { cedula: string, codigo: string }
 * Returns: { monto: number, encontrado: boolean, error?: string }
 *
 * Consulta la deuda de un colegiado en codiaenlinea.com
 * usando sus credenciales (cedula + colegiatura) en el momento
 * en que un dirigente lo confirma — nunca en lote.
 */
export async function POST(req: NextRequest) {
  try {
    const { cedula, codigo } = await req.json() as { cedula?: string; codigo?: string }

    if (!cedula || !codigo) {
      return NextResponse.json({ encontrado: false, monto: 0, error: 'Faltan cedula o codigo' }, { status: 400 })
    }

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
      body: JSON.stringify({ Cedula: cedula, Codigo: codigo }),
      redirect: 'manual',
    })

    // Capturar cookies de sesión
    const setCookie = loginRes.headers.get('set-cookie') ?? ''
    const cookieHeader = setCookie
      .split(',')
      .map(c => c.split(';')[0].trim())
      .filter(Boolean)
      .join('; ')

    // Si el login falló (no hay cookie de sesión útil)
    if (!cookieHeader && loginRes.status >= 400) {
      return NextResponse.json({ encontrado: false, monto: 0, error: 'Credenciales no válidas en CODIA en línea' })
    }

    // Algunos sistemas responden con JSON indicando éxito/fallo
    const contentType = loginRes.headers.get('content-type') ?? ''
    if (contentType.includes('application/json')) {
      const loginJson = await loginRes.json().catch(() => null)
      if (loginJson && loginJson.success === false) {
        return NextResponse.json({ encontrado: false, monto: 0, error: 'Colegiado no encontrado en CODIA en línea' })
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
      return NextResponse.json({ encontrado: false, monto: 0, error: 'No se pudo acceder al perfil' })
    }

    const html = await profileRes.text()

    // ── Paso 3: Parsear el balance ────────────────────────────────────────────
    const monto = parsearBalance(html)

    return NextResponse.json({ encontrado: true, monto })

  } catch (err) {
    console.error('[consulta-deuda]', err)
    return NextResponse.json({ encontrado: false, monto: 0, error: 'Error interno al consultar CODIA en línea' }, { status: 500 })
  }
}

/**
 * Extrae el monto de deuda del HTML de IndexUser.
 * Busca patrones como: $ 300, $300.00, value="$300.00"
 */
function parsearBalance(html: string): number {
  // Patrón 1: Sub Total: $ XXX
  const subTotal = html.match(/Sub\s*Total\s*:\s*\$\s*([\d,\.]+)/i)
  if (subTotal) return parseMonto(subTotal[1])

  // Patrón 2: Balance</td> ... $XXX
  const balance = html.match(/[Bb]alance[^<]*<[^>]+>\s*\$?\s*([\d,\.]+)/i)
  if (balance) return parseMonto(balance[1])

  // Patrón 3: input value="$300.00" visible en la página
  const inputVal = html.match(/value=["']\$\s*([\d,\.]+)["']/i)
  if (inputVal) return parseMonto(inputVal[1])

  // Patrón 4: CUOTA $ 300
  const cuota = html.match(/CUOTA\s*\$\s*([\d,\.]+)/i)
  if (cuota) return parseMonto(cuota[1])

  return 0
}

function parseMonto(raw: string): number {
  const n = parseFloat(raw.replace(/,/g, ''))
  return isNaN(n) ? 0 : Math.round(n)
}
