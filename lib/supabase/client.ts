import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_URL, SUPABASE_ANON_KEY, isSupabaseConfigured } from "./env";

/**
 * Cliente de Supabase para usar dentro de Client Components.
 * En modo demo (sin credenciales) devuelve null — cada hook de features/
 * que lo consuma debe manejar ese caso mostrando datos de ejemplo o vacíos,
 * nunca romper la pantalla.
 */
export function createClient() {
  if (!isSupabaseConfigured) return null;
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}
