import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Fuente única: portal de verificación de núcleos del CODIA.
// Un solo GET devuelve regional, centro de votación, núcleo, posición y balance.
// No requiere login ni cédula — basta la colegiatura (código).
const BASE = 'https://verificate.codiaenlinea.com'
const TIMEOUT_MS = 8000

// Vercel Hobby/Free plan: max 10 s. Timeout interno de 8 s deja margen.
// En plan Pro se puede subir con: export const maxDuration = 60

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
  // `cedula` se acepta por retrocompatibilidad pero ya no se usa.
  const { codigo } = await req.json().catch(() => ({})) as {
    cedula?: string
    codigo?: string
  }

  if (!codigo) {
    return NextResponse.json({ encontrado: false, habilitado: true, monto: 0 })
  }

  const codigoLimpio = String(codigo).trim()

  try {
    const res = await fetchConTimeout(
      `${BASE}/ConsultaCodias/Details/${encodeURIComponent(codigoLimpio)}?state=submited`,
      {
        headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Referer': `${BASE}/ConsultaCodias/Details`,
        },
      }
    )

    if (!res.ok) {
      console.log(`[consulta-codia] HTTP ${res.status} para codigo=${codigoLimpio}`)
      return NextResponse.json({ encontrado: false, habilitado: true, monto: 0 })
    }

    const html = await res.text()

    // Colegiatura inexistente
    if (/NO\s+HAY\s+COLEGIADO\s+REGISTRADO/i.test(html)) {
      return NextResponse.json({ encontrado: false, habilitado: true, monto: 0 })
    }

    // ── Parsear campos ────────────────────────────────────────────────────────
    const regional        = limpiar(campoTabla(html, 'REGIONAL'))
    const centro_votacion = limpiar(campoTabla(html, 'CENTRO DE VOTACION'))
    const nucleo          = limpiar(campoTabla(html, 'NUCLEO'))
    const posicion        = parsearPosicion(html)
    const monto           = parsearBalance(html)
    const habilitado      = monto === 0

    // Si no reconocimos ningún campo, tratar como no encontrado (cambio de estructura)
    if (!regional && !centro_votacion && !nucleo && monto === 0 && posicion === null) {
      return NextResponse.json({ encontrado: false, habilitado: true, monto: 0 })
    }

    // ── Persistir en el padrón ────────────────────────────────────────────────
    await supabaseServer.rpc('set_datos_codia', {
      p_codigo:          codigoLimpio,
      p_regional:        regional || null,
      p_centro_votacion: centro_votacion || null,
      p_nucleo:          nucleo || null,
      p_posicion:        posicion,
      p_monto:           monto,
    })

    console.log(`[consulta-codia] codigo=${codigoLimpio} centro="${centro_votacion}" pos=${posicion} monto=${monto}`)

    return NextResponse.json({
      encontrado: true,
      habilitado,
      monto,
      regional,
      centro_votacion,
      nucleo,
      posicion,
    })

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[consulta-codia] error para codigo=${codigo}:`, msg)
    // Siempre devuelve 200 para que el cliente pueda leer el JSON
    return NextResponse.json({ encontrado: false, habilitado: true, monto: 0, _error: msg })
  }
}

// ── Helpers de parseo ─────────────────────────────────────────────────────────

// Extrae el <td> que sigue a un <th>LABEL:</th> en la tabla de resultados.
function campoTabla(html: string, label: string): string {
  const etiqueta = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+')
  const re = new RegExp(`<th[^>]*>\\s*${etiqueta}\\s*:?\\s*</th>\\s*<td[^>]*>([\\s\\S]*?)</td>`, 'i')
  const m = html.match(re)
  return m ? m[1] : ''
}

// POSICION viene como "<b>POSICION:</b>  980" dentro de un <td>.
function parsearPosicion(html: string): number | null {
  const m = html.match(/POSICION\s*:?\s*<\/b>\s*([\d,]+)/i)
    || html.match(/POSICION\s*:?\s*([\d,]+)/i)
  if (!m) return null
  const n = parseInt(m[1].replace(/,/g, ''), 10)
  return isNaN(n) ? null : n
}

function parsearBalance(html: string): number {
  const balance = html.match(/BALANCE\s*:?\s*<\/th>\s*<td[^>]*>\s*\$?\s*([\d,\.]+)/i)
  if (balance) return parseMonto(balance[1])

  const generico = html.match(/Balance\s*:?[^$\d]{0,40}\$?\s*([\d,\.]+)/i)
  if (generico) return parseMonto(generico[1])

  return 0
}

function parseMonto(raw: string): number {
  const n = parseFloat(raw.replace(/,/g, ''))
  return isNaN(n) ? 0 : Math.round(n)
}

// Normaliza texto de celdas: colapsa espacios y quita saltos de línea sobrantes.
function limpiar(raw: string): string {
  return raw
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}
