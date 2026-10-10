import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // El dominio curso.rogapps.com sirve SOLO el formulario del curso en su raíz.
  const host = (request.headers.get('host') || '').toLowerCase()
  if (host === 'curso.rogapps.com') {
    const p = request.nextUrl.pathname
    if (p === '/' || p === '/home') {
      const url = request.nextUrl.clone()
      url.pathname = '/cursos'
      return NextResponse.rewrite(url)
    }
    // curso.rogapps.com/<slug>  →  /cursos/<slug>
    if (!p.startsWith('/cursos')) {
      const url = request.nextUrl.clone()
      url.pathname = '/cursos' + p
      return NextResponse.rewrite(url)
    }
    return NextResponse.next({ request })
  }

  // Link viejo del curso de inglés → sistema de cursos
  if (request.nextUrl.pathname === '/curso-ingles') {
    const url = request.nextUrl.clone()
    url.pathname = '/cursos/ingles'
    return NextResponse.redirect(url)
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  const publicPaths = ['/', '/home', '/acceso', '/consulta', '/deuda', '/login', '/encuesta', '/verifica', '/v2', '/plan-accion', '/curso-ingles']
  const esPublica = publicPaths.includes(pathname) || pathname.startsWith('/cursos')
  if (!user && !esPublica) {
    const url = request.nextUrl.clone()
    url.pathname = '/home'
    return NextResponse.redirect(url)
  }

  // Redirigir usuarios autenticados fuera de las páginas públicas
  if (user && (pathname === '/home' || pathname === '/acceso' || pathname === '/login')) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
