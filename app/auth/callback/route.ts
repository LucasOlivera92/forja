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
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

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
      console.log("[FORJA][auth/callback] exchangeCodeForSession ->", { hasError: true });
    }
    return NextResponse.redirect(`${origin}/login?error=confirmacion_invalida`);
  }

  return NextResponse.redirect(`${origin}/hoy`);
}
