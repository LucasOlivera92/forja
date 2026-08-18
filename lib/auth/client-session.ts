"use client";

import { createClient } from "@/lib/supabase/client";

/**
 * Sprint 6.1 — aislamiento de datos por usuario.
 *
 * `lib/mock/repository.ts` tiene ~30 funciones síncronas (Entreno y
 * Nutrición) que hoy leen/escriben `localStorage` directamente. Para
 * namespacear esas claves por usuario SIN convertir todas esas funciones
 * en async (eso sí sería un cambio grande de la lógica existente, que el
 * sprint pide evitar), se cachea el `user.id` en un módulo en memoria acá.
 *
 * `UserSessionGate` (lib/auth/components/) es el único que llama a
 * `resolveUserSession()`, y lo hace ANTES de montar cualquier pantalla —
 * así `repository.ts` nunca lee la cache vacía por una carrera de timing.
 */

let cachedUserId: string | null = null;
let resolved = false;

/** Síncrono, para que `lib/mock/repository.ts` lo pueda llamar desde cualquier función existente sin volverse async. */
export function getCachedUserId(): string | null {
  return resolved ? cachedUserId : null;
}

export function setCachedUserId(userId: string | null): void {
  cachedUserId = userId;
  resolved = true;
}

/** Resuelve el usuario autenticado una vez (vía el cliente de navegador ya existente) y cachea el resultado. */
export async function resolveUserSession(): Promise<string | null> {
  const supabase = createClient();
  if (!supabase) {
    setCachedUserId(null);
    return null;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  setCachedUserId(user?.id ?? null);
  return cachedUserId;
}
