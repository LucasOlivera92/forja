import type { SupabaseClient } from "@supabase/supabase-js";
import { getCachedUserId } from "@/lib/auth/client-session";
import { createClient } from "@/lib/supabase/client";
import {
  createSleepLogRow,
  getSleepLogRow,
  isSleepLogPayload,
  SleepAdapterError,
  SleepPayloadValidationError,
  updateSleepLogPayload,
} from "@/lib/cloud/sleep";
import { getAllSleepLogs } from "@/lib/mock/repository";
import type { SleepLog } from "@/lib/mock/types";

/**
 * Sprint 8.0 — Importador manual y seguro de Descanso (mismo criterio que
 * `nutrition-import.ts`/`workout-import.ts`): solo LEE localStorage, no se
 * ejecuta al importarse, nunca sobrescribe ni borra, reintentable sin
 * duplicar (unique(athlete_id, log_date); ante una carrera relee y
 * reclasifica). Más `uploadSleepLogBestEffort`, la subida automática de la
 * noche que se acaba de guardar.
 */

export type SleepImportItemStatus = "created" | "identical" | "conflict" | "invalid" | "failed";

export interface SleepImportResultItem {
  logDate: string;
  status: SleepImportItemStatus;
  message?: string;
}

export interface SleepImportReport {
  userId: string;
  total: number;
  created: number;
  identical: number;
  conflicts: number;
  invalid: number;
  failed: number;
  items: SleepImportResultItem[];
}

export class SleepImportSessionError extends SleepAdapterError {
  constructor(message: string, cause?: unknown) {
    super(message, cause);
    this.name = "SleepImportSessionError";
  }
}

function messageFromUnknown(error: unknown): string {
  return error instanceof Error ? error.message : "Error desconocido.";
}

/** Usuario autenticado verificado contra el cacheado; revienta con un error de sesión si no coinciden. */
async function requireVerifiedCurrentUserId(supabase: SupabaseClient): Promise<string> {
  const cachedUserId = getCachedUserId();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) throw new SleepImportSessionError("No se pudo verificar la sesión antes de importar el descanso.", error);
  if (!user) throw new SleepImportSessionError("No hay una sesión autenticada para importar el descanso.");
  if (!cachedUserId) {
    throw new SleepImportSessionError("La sesión local todavía no está lista. Volvé a intentar desde una pantalla autenticada.");
  }
  if (cachedUserId !== user.id) {
    throw new SleepImportSessionError(
      "La sesión local no coincide con la sesión de Supabase. Cerrá sesión y volvé a entrar antes de importar."
    );
  }
  return user.id;
}

/** Igualdad entre dos `SleepLog`: `loggedAt` no cuenta (es un sello de cuándo se tipeó, no el dato). */
function sameSleepData(a: SleepLog, b: SleepLog): boolean {
  return a.date === b.date && a.hours === b.hours && a.quality === b.quality;
}

async function importOne(supabase: SupabaseClient, userId: string, local: SleepLog): Promise<SleepImportResultItem> {
  const logDate = local.date;
  if (!isSleepLogPayload(local)) {
    return { logDate, status: "invalid", message: "El registro local no respeta la forma esperada; no se importó." };
  }

  const classify = (cloud: SleepLog): SleepImportResultItem =>
    sameSleepData(local, cloud)
      ? { logDate, status: "identical" }
      : { logDate, status: "conflict", message: "Ya existe un registro distinto en la nube para esa noche; no se sobrescribió." };

  try {
    const existing = await getSleepLogRow(supabase, userId, logDate);
    if (!existing) {
      await createSleepLogRow(supabase, userId, local);
      return { logDate, status: "created" };
    }
    return classify(existing.payload);
  } catch (error) {
    if (error instanceof SleepPayloadValidationError) {
      return { logDate, status: "invalid", message: messageFromUnknown(error) };
    }
    try {
      const raced = await getSleepLogRow(supabase, userId, logDate);
      if (raced) return classify(raced.payload);
    } catch {
      // Se conserva el error original.
    }
    return { logDate, status: "failed", message: messageFromUnknown(error) };
  }
}

/** Importa a Supabase las noches locales que falten. Nunca acepta un userId desde afuera; un error puntual no aborta el resto. */
export async function importLocalSleepData(supabase: SupabaseClient): Promise<SleepImportReport> {
  const userId = await requireVerifiedCurrentUserId(supabase);
  const items: SleepImportResultItem[] = [];
  for (const local of getAllSleepLogs()) {
    items.push(await importOne(supabase, userId, local));
  }
  return {
    userId,
    total: items.length,
    created: items.filter((i) => i.status === "created").length,
    identical: items.filter((i) => i.status === "identical").length,
    conflicts: items.filter((i) => i.status === "conflict").length,
    invalid: items.filter((i) => i.status === "invalid").length,
    failed: items.filter((i) => i.status === "failed").length,
    items,
  };
}

/**
 * Subida automática de la noche que se ACABA de guardar localmente
 * (corregir la propia noche del día es una edición del usuario, por eso acá
 * sí se actualiza si ya existía, con control optimista de `version`). Nunca
 * lanza: si falla, el dato ya está a salvo en el dispositivo y se sube con
 * "Sincronizar descanso" o al volver a guardar. Devuelve `true` si quedó en la nube.
 */
export async function uploadSleepLogBestEffort(log: SleepLog): Promise<boolean> {
  try {
    const supabase = createClient();
    if (!supabase) return false;
    const userId = await requireVerifiedCurrentUserId(supabase);

    const existing = await getSleepLogRow(supabase, userId, log.date);
    if (!existing) {
      await createSleepLogRow(supabase, userId, log);
      return true;
    }
    await updateSleepLogPayload(supabase, existing, log);
    return true;
  } catch {
    return false;
  }
}
