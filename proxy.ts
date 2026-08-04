/**
 * Nota: Next.js 16 renombró "middleware" a "proxy" — mismo concepto,
 * mismo lugar en el árbol de decisiones del Paso 8, nuevo nombre de archivo.
 */
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { SUPABASE_URL, SUPABASE_ANON_KEY, isSupabaseConfigured } from "@/lib/supabase/env";

const DEV_LOG = process.env.NODE_ENV !== "production";

/** Rutas accesibles sin sesión (Sprint 6.0: se suman /registro y /recuperar-password). */
const PUBLIC_AUTH_ROUTES = ["/login", "/registro", "/recuperar-password", "/onboarding"];

/** Rutas de "entrada" de las que un usuario YA logueado no tiene sentido que vuelva a pasar. */
const ENTRY_ROUTES = ["/login", "/registro"];

/**
 * Middleware de sesión (Paso 8, extendido en Sprint 6.0).
 *
 * Reglas, en este orden:
 * 1. Sin sesión + ruta no pública → redirige a /login
 * 2. Con sesión: si todavía no tiene fila en `profiles`, se le crea una
 *    mínima acá mismo (ver nota más abajo).
 * 3. Con sesión, en /login o /registro → redirige a /hoy (no tiene sentido
 *    volver a loguearse/registrarse ya logueado). /recuperar-password queda
 *    afuera de esta regla a propósito: un usuario logueado puede querer
 *    pedir igual un cambio de contraseña.
 *
 * MODO DEMO: mientras no exista un proyecto real de Supabase (Sprint 0),
 * el middleware deja pasar todo sin proteger nada, para poder probar la
 * navegación completa en local. Apenas se completen las variables de
 * entorno, las reglas se activan solas — no hay que tocar este archivo.
 *
 * NOTA: no existe todavía una pantalla de onboarding real ni bloqueo por
 * perfil incompleto — un perfil incompleto (o recién creado) nunca impide
 * el acceso a /hoy. Eso queda para un sprint futuro.
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
  const isPublicAuthRoute = PUBLIC_AUTH_ROUTES.some((route) => pathname.startsWith(route));

  if (DEV_LOG) {
    console.log("[FORJA][proxy]", { pathname, hasUser: Boolean(user) });
  }

  if (!user && !isPublicAuthRoute) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (user) {
    // Sprint 6.0 (fundación multiusuario): si el usuario tiene sesión pero
    // todavía no tiene fila en `profiles` (usuario creado a mano en
    // Authentication → Users, o que se registró cuando Supabase requiere
    // confirmar el email antes de dar sesión), se la creamos acá mismo.
    // Se hace con el cliente autenticado del propio usuario (nunca
    // service_role), así que respeta la policy RLS "usuarios crean su
    // propio perfil" (auth.uid() = id). Si la tabla `profiles` todavía no
    // existe en la base, el insert falla silenciosamente y el usuario
    // igual puede navegar — esto nunca debe bloquear el acceso a la app.
    //
    // Corre en cada request autenticado (no solo en /login) a propósito:
    // así no depende de en qué pathname exacto cae la primera request con
    // sesión después de un login/registro, que puede variar según cómo el
    // router de Next dispare la navegación. Con pocos usuarios el costo
    // extra de esta consulta es despreciable; si en el futuro hace falta
    // optimizarlo, se puede cachear en una cookie liviana.
    const { data: profile } = await supabase
      .from("profiles")
      .select("primary_goal")
      .eq("id", user.id)
      .maybeSingle();

    if (profile === null) {
      const metadata = user.user_metadata as { full_name?: string } | null;
      const { error: upsertError } = await supabase.from("profiles").upsert(
        { id: user.id, full_name: metadata?.full_name ?? null },
        { onConflict: "id", ignoreDuplicates: true }
      );

      if (DEV_LOG) {
        console.log("[FORJA][proxy] auto-crear perfil ->", {
          userId: user.id,
          ok: !upsertError,
        });
      }
    }

    const isEntryRoute = ENTRY_ROUTES.some((route) => pathname.startsWith(route));
    if (isEntryRoute) {
      if (DEV_LOG) {
        console.log("[FORJA][proxy] redirigiendo ->", { from: pathname, to: "/hoy" });
      }
      return NextResponse.redirect(new URL("/hoy", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icons|manifest.webmanifest).*)"],
};
