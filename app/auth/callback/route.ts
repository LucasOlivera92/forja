import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Callback de confirmación de Supabase Auth (registro y recuperación de
 * contraseña usan el mismo mecanismo). El link que Supabase manda por
 * email redirige acá con `?code=...` (flujo PKCE, el que usa
 * `createBrowserClient`/`createServerClient` de `@supabase/ssr` por
 * default). Este route handler canjea ese código por una sesión real y la
 * deja guardada en cookies — recién ahí `proxy.ts` puede ver al usuario
 * autenticado y crear su fila en `profiles` como ya hace hoy con el login
 * normal.
 *
 * Sprint 6.3 — recuperación de contraseña: en teoría, el endpoint de
 * verificación de Supabase (`/auth/v1/verify`) debería reenviar, junto con
 * `code`, el parámetro `type` con el que se generó el link (`recovery`,
 * `signup`, etc.). En la práctica, un test real end-to-end mostró que en
 * este proyecto ese `type` NO llega como se esperaba: el `exchange` tiene
 * éxito, pero la condición `type === "recovery"` nunca se cumple y el
 * usuario termina en /hoy como si fuera un login normal.
 *
 * Sprint 6.3 (fix) — en vez de depender de que Supabase inyecte `type`
 * por su cuenta, `/recuperar-password` ahora manda su propio marcador en
 * `redirectTo` (`?next=recovery`), que es parte de la URL que la propia
 * app controla de punta a punta: Supabase la toma como base para el
 * redirect final y solo le agrega `code=...`, sin tocar los query params
 * que ya traía. `next` tiene prioridad conceptual por ser el dato que
 * controlamos nosotros; `type` se sigue leyendo y participa de la
 * condición como respaldo, por si en algún entorno sí llega a estar
 * presente — nunca se descarta.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next");
  const type = searchParams.get("type");
  const isRecovery = next === "recovery" || type === "recovery";

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=falta_codigo_confirmacion`);
  }

  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.redirect(`${origin}/login?error=supabase_no_configurado`);
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    if (process.env.NODE_ENV !== "production") {
      console.log("[FORJA][auth/callback] exchangeCodeForSession ->", { hasError: true, next, type, isRecovery });
    }
    // Si el link era de recuperación y el código ya no sirve (expirado o
    // reusado), no tiene sentido mandar a /login: el usuario no tiene
    // contraseña nueva todavía. /nueva-password ya sabe mostrar el mensaje
    // de "sesión vencida, pedí la recuperación de nuevo" cuando no
    // encuentra sesión.
    if (isRecovery) {
      return NextResponse.redirect(`${origin}/nueva-password?error=codigo_invalido`);
    }
    return NextResponse.redirect(`${origin}/login?error=confirmacion_invalida`);
  }

  if (process.env.NODE_ENV !== "production") {
    console.log("[FORJA][auth/callback] exchangeCodeForSession ->", { hasError: false, next, type, isRecovery });
  }

  if (isRecovery) {
    return NextResponse.redirect(`${origin}/nueva-password`);
  }

  return NextResponse.redirect(`${origin}/hoy`);
}
