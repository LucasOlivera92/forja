"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { getCachedUserId } from "@/lib/auth/client-session";
import { createClient } from "@/lib/supabase/client";
import {
  createWorkoutExecutionRow,
  createWorkoutSessionRow,
  getWorkoutExecutionRow,
  getWorkoutSessionRow,
  updateWorkoutSessionPayload,
  WorkoutConflictError,
} from "@/lib/cloud/workout-logs";
import type { WorkoutSessionRow } from "@/lib/cloud/workout-logs";
import { subscribeToDaySessionWrites, subscribeToRoutineExecutionWrites } from "@/lib/mock/repository";
import type { DaySession, RoutineExecution } from "@/lib/mock/types";

/**
 * Sprint 7.3 — Subida automática, best-effort, de los registros de Entreno.
 *
 * Cada vez que `lib/mock/repository.ts` guarda una sesión (cada serie
 * guardada, cada "hecha", "Finalizar", "Reiniciar semana") o archiva una
 * ejecución, avisa acá DESPUÉS de haber escrito en localStorage. Este
 * módulo jamás toca ni revierte el guardado local: si la nube falla, el
 * dato ya está a salvo en el dispositivo y se reintenta.
 *
 * - Debounce corto (~1,2 s) por sesión: varias series seguidas viajan
 *   como una sola subida con el estado más reciente (cada subida manda la
 *   sesión COMPLETA, así que la siguiente subida siempre se "autocura").
 * - Sesiones: si no existe en la nube se crea; si existe se actualiza con
 *   control optimista de `version`. Ante un conflicto de version se vuelve
 *   a leer la fila y se reintenta UNA vez; si vuelve a fallar, queda
 *   pendiente para el próximo intento. Es "último estado de trabajo gana"
 *   para la MISMA sesión en vivo: el dato recién tipeado por el usuario es
 *   el que sube (a diferencia de los botones de sincronizar, que nunca pisan).
 * - Ejecuciones archivadas: solo se crean si no existen (son inmutables);
 *   nunca se pisa una existente.
 * - Reintentos mientras la pantalla siga abierta: cada 15 s y apenas el
 *   navegador vuelve a estar online, y al ocultarse la pestaña.
 * - Nunca usa `service_role`, nunca borra, nunca acepta un userId de la UI
 *   (verifica `supabase.auth.getUser()` contra `getCachedUserId()` en cada
 *   ronda) y nunca expone errores internos.
 */

const DEBOUNCE_MS = 1200;
const RETRY_MS = 15000;

const pendingSessions = new Map<string, DaySession>();
const pendingExecutions = new Map<string, RoutineExecution>();
const sessionRowCache = new Map<string, WorkoutSessionRow>();

let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
let flushing = false;
let flushRequestedWhileRunning = false;

function sessionKey(session: DaySession): string {
  return `${session.routineId}/${session.weekId}/${session.dayId}`;
}

/** Usuario autenticado verificado contra el cacheado; `null` si no coincide o no se pudo verificar (se descarta la ronda, no se sube nada). */
async function verifiedUserId(supabase: SupabaseClient): Promise<string | null> {
  const cachedUserId = getCachedUserId();
  if (!cachedUserId) return null;
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user || user.id !== cachedUserId) return null;
  return user.id;
}

async function uploadSession(supabase: SupabaseClient, userId: string, session: DaySession): Promise<void> {
  const key = sessionKey(session);

  let row: WorkoutSessionRow | null = sessionRowCache.get(key) ?? null;
  if (!row) row = await getWorkoutSessionRow(supabase, userId, session.routineId, session.weekId, session.dayId);

  if (!row) {
    try {
      sessionRowCache.set(key, await createWorkoutSessionRow(supabase, userId, session));
      return;
    } catch (createError) {
      // Carrera (otra pestaña/dispositivo la creó justo antes): releer y actualizar.
      row = await getWorkoutSessionRow(supabase, userId, session.routineId, session.weekId, session.dayId);
      if (!row) throw createError;
    }
  }

  try {
    sessionRowCache.set(key, await updateWorkoutSessionPayload(supabase, row, session));
  } catch (updateError) {
    if (!(updateError instanceof WorkoutConflictError)) {
      sessionRowCache.delete(key);
      throw updateError;
    }
    const fresh = await getWorkoutSessionRow(supabase, userId, session.routineId, session.weekId, session.dayId);
    if (!fresh) {
      sessionRowCache.delete(key);
      throw updateError;
    }
    sessionRowCache.set(key, await updateWorkoutSessionPayload(supabase, fresh, session));
  }
}

async function uploadExecution(supabase: SupabaseClient, userId: string, execution: RoutineExecution): Promise<void> {
  const existing = await getWorkoutExecutionRow(supabase, userId, execution.id);
  if (existing) return; // Inmutable: nunca se pisa.
  try {
    await createWorkoutExecutionRow(supabase, userId, execution);
  } catch (createError) {
    const raced = await getWorkoutExecutionRow(supabase, userId, execution.id);
    if (!raced) throw createError;
  }
}

function scheduleRetry(): void {
  if (retryTimer !== null) return;
  retryTimer = setTimeout(() => {
    retryTimer = null;
    void flush();
  }, RETRY_MS);
}

async function flush(): Promise<void> {
  if (flushing) {
    flushRequestedWhileRunning = true;
    return;
  }
  if (pendingSessions.size === 0 && pendingExecutions.size === 0) return;

  flushing = true;
  try {
    do {
      flushRequestedWhileRunning = false;

      const supabase = createClient();
      if (!supabase) return; // Modo demo / sin credenciales: queda solo local.

      const userId = await verifiedUserId(supabase);
      if (!userId) {
        // Sesión no verificable o distinta: no se sube nada de este dispositivo bajo otra identidad.
        pendingSessions.clear();
        pendingExecutions.clear();
        return;
      }

      // Ejecuciones primero: al archivar una semana, las sesiones se reinician enseguida.
      for (const [id, execution] of Array.from(pendingExecutions)) {
        try {
          await uploadExecution(supabase, userId, execution);
          pendingExecutions.delete(id);
        } catch {
          scheduleRetry();
        }
      }

      for (const [key, session] of Array.from(pendingSessions)) {
        try {
          await uploadSession(supabase, userId, session);
          // Solo se saca de pendientes si no llegó una versión más nueva mientras subía.
          if (pendingSessions.get(key) === session) pendingSessions.delete(key);
        } catch {
          scheduleRetry();
        }
      }
    } while (flushRequestedWhileRunning);
  } finally {
    flushing = false;
  }
}

function scheduleFlush(): void {
  if (debounceTimer !== null) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    void flush();
  }, DEBOUNCE_MS);
}

/**
 * Activa la subida automática y devuelve la función para desactivarla.
 * Idempotente por llamada (cada llamada suscribe/desuscribe sus propios
 * listeners). Pensado para montarse una sola vez, desde un componente
 * cliente del layout de la app.
 */
export function startWorkoutAutoSync(): () => void {
  const unsubscribeSessions = subscribeToDaySessionWrites((session) => {
    pendingSessions.set(sessionKey(session), session);
    scheduleFlush();
  });
  const unsubscribeExecutions = subscribeToRoutineExecutionWrites((execution) => {
    pendingExecutions.set(execution.id, execution);
    scheduleFlush();
  });

  const handleOnline = () => void flush();
  const handleVisibility = () => {
    if (document.visibilityState === "hidden") void flush();
  };
  window.addEventListener("online", handleOnline);
  document.addEventListener("visibilitychange", handleVisibility);

  return () => {
    unsubscribeSessions();
    unsubscribeExecutions();
    window.removeEventListener("online", handleOnline);
    document.removeEventListener("visibilitychange", handleVisibility);
  };
}
