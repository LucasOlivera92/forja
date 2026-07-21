/**
 * Único punto del proyecto que decide si hay credenciales reales de Supabase
 * o si estamos en modo demo (Sprint 0, sin proyecto de Supabase creado todavía).
 *
 * Cuando crees tu proyecto en Supabase, completá estas dos variables en
 * .env.local (copiá .env.local.example) y este archivo deja de usar el modo demo
 * automáticamente — no hay que tocar ningún otro archivo del proyecto.
 */

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const isSupabaseConfigured =
  SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0;

if (!isSupabaseConfigured && typeof window !== "undefined") {
  // Solo se ve en la consola del navegador, no interrumpe nada.
  console.warn(
    "[FORJA] Modo demo: no hay credenciales de Supabase configuradas. " +
      "El middleware de sesión está desactivado hasta que completes .env.local."
  );
}
