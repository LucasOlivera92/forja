/**
 * Nota: Next.js 16 renombró "middleware" a "proxy" — mismo concepto,
 * mismo lugar en el árbol de decisiones del Paso 8, nuevo nombre de archivo.
 */
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { SUPABASE_URL, SUPABASE_ANON_KEY, isSupabaseConfigured } from "@/lib/supabase/env";

/**
 * Middleware de sesión (Paso 8).
 *
 * Reglas, en este orden:
 * 1. Sin sesión + ruta protegida → redirige a /login
 * 2. Con sesión pero sin perfil completo → redirige a /onboarding
 * 3. Con sesión y perfil completo intentando entrar a /login o /onboarding → redirige a /hoy
 *
 * MODO DEMO: mientras no exista un proyecto real de Supabase (Sprint 0),
 * el middleware deja pasar todo sin proteger nada, para poder probar la
 * navegación completa en local. Apenas se completen las variables de
 * entorno, las 3 reglas se activan solas — no hay que tocar este archivo.
 */
export async function proxy(request: NextRequest) {
  if (!isSupabaseConfigured) {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isAuthRoute = pathname.startsWith("/login") || pathname.startsWith("/onboarding");

  if (!user && !isAuthRoute) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (user && isAuthRoute) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("primary_goal")
      .eq("id", user.id)
      .maybeSingle();

    const profileComplete = Boolean(profile?.primary_goal);

    if (profileComplete) {
      return NextResponse.redirect(new URL("/hoy", request.url));
    }
    if (!profileComplete && pathname.startsWith("/login")) {
      return NextResponse.redirect(new URL("/onboarding", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icons|manifest.webmanifest).*)"],
};
