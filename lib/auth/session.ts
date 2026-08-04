import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "./types";

/**
 * Helpers de sesión para Server Components, Route Handlers y Server
 * Actions (usan el cliente de `lib/supabase/server`, que lee cookies de
 * `next/headers`). Para Client Components, usar `lib/supabase/client`
 * directamente — estas funciones no sirven ahí.
 */

/** El usuario de Supabase Auth autenticado en este request, o `null`. */
export async function getCurrentUser(): Promise<User | null> {
  const supabase = await createClient();
  if (!supabase) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}

/**
 * El perfil (`public.profiles`) del usuario autenticado, o `null` si no
 * hay sesión o si todavía no tiene fila en `profiles` (p. ej. la migración
 * 0002 no se aplicó todavía, o el proxy no llegó a auto-crearla).
 */
export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  if (!supabase) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  return (profile as Profile | null) ?? null;
}
