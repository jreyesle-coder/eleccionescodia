import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// La consulta de deuda ahora se sirve desde NUESTRA propia base (padron),
// no del portal externo verificate.codiaenlinea.com (fue dado de baja).
// El monto se mantiene sincronizado con set_datos_codia / cargas masivas.
//
// Interpretación de monto_deuda:
//   < 0  → saldo a favor (habilitado)
//   = 0  → al día        (habilitado)
//   > 0  → deuda         (no habilitado)

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(req: NextRequest) {
  const { codigo } = (await req.json().catch(() => ({}))) as {
    cedula?: string
    codigo?: string
  }

  if (!codigo) {
    return NextResponse.json({ encontrado: false, habilitado: true, monto: 0 })
  }

  const codigoNum = parseInt(String(codigo).replace(/\D/g, ''), 10)
  if (!codigoNum) {
    return NextResponse.json({ encontrado: false, habilitado: true, monto: 0 })
  }

  try {
    const { data, error } = await supabase.rpc('get_estado_codia', {
      p_codigo: codigoNum,
    })

    if (error) {
      console.error('[consulta-deuda] RPC error:', error.message)
      return NextResponse.json({ encontrado: false, habilitado: true, monto: 0, _error: error.message })
    }

    const row = Array.isArray(data) ? data[0] : data
    if (!row) {
      return NextResponse.json({ encontrado: false, habilitado: true, monto: 0 })
    }

    const monto = typeof row.monto_deuda === 'number' ? row.monto_deuda : 0

    return NextResponse.json({
      encontrado: true,
      habilitado: monto <= 0,
      monto,
      regional: row.regional ?? null,
      centro_votacion: row.centro_votacion ?? null,
      nucleo: row.nucleo ?? null,
      posicion: row.posicion ?? null,
      inhabilitado: row.inhabilitado === true,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[consulta-deuda] error:', msg)
    return NextResponse.json({ encontrado: false, habilitado: true, monto: 0, _error: msg })
  }
}
