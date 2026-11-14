import type { SupabaseClient } from "@supabase/supabase-js";
import { getCachedUserId } from "@/lib/auth/client-session";
import {
  createWorkoutExecutionRow,
  createWorkoutSessionRow,
  getWorkoutExecutionRow,
  getWorkoutSessionRow,
  isDaySessionPayload,
  isRoutineExecutionPayload,
  WorkoutAdapterError,
  WorkoutPayloadValidationError,
} from "@/lib/cloud/workout-logs";
import { getAllDaySessionsSnapshot, getAllRoutineExecutionsSnapshot } from "@/lib/mock/repository";

/**
 * Sprint 7.2 — Importador manual y seguro de los registros de Entreno
 * (sesiones en vivo + ejecuciones archivadas), mismo criterio que
 * `lib/cloud/nutrition-import.ts` y `routines-import.ts`: no se ejecuta al
 * importarse, solo LEE localStorage (vía las fotos de `repository.ts`),
 * no está conectado a ninguna pantalla, nunca sobrescribe ni borra, y es
 * reintentable sin duplicar (restricciones `unique` de 0006; ante una
 * carrera relee y reclasifica en vez de reintentar a ciegas).
 */

export type WorkoutImportItemStatus = "created" | "identical" | "conflict" | "invalid" | "failed";

export interface WorkoutImportResultItem {
  /** Identidad legible: `routineId/weekId/dayId` para sesiones, `executionId` para ejecuciones (`null` si ni siquiera se pudo leer). */
  key: string | null;
  status: WorkoutImportItemStatus;
  message?: string;
}

export interface WorkoutImportSection {
  total: number;
  created: number;
  identical: number;
  conflicts: number;
  invalid: number;
  failed: number;
  items: WorkoutImportResultItem[];
}

export interface WorkoutImportReport {
  userId: string;
  sessions: WorkoutImportSection;
  executions: WorkoutImportSection;
}

export class WorkoutImportSessionError extends WorkoutAdapterError {
  constructor(message: string, cause?: unknown) {
    super(message, cause);
    this.name = "WorkoutImportSessionError";
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Igualdad semántica JSON: ignora el orden de claves, conserva el de arrays, trata `undefined` como ausente. Copia deliberada (cada importador es un archivo aislado). */
function jsonValuesEqual(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true;

  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) return false;
    return left.every((value, index) => jsonValuesEqual(value, right[index]));
  }

  if (isPlainObject(left) || isPlainObject(right)) {
    if (!isPlainObject(left) || !isPlainObject(right)) return false;
    const leftKeys = Object.keys(left)
      .filter((key) => left[key] !== undefined)
      .sort();
    const rightKeys = Object.keys(right)
      .filter((key) => right[key] !== undefined)
      .sort();
    if (leftKeys.length !== rightKeys.length) return false;
    return leftKeys.every((key, index) => key === rightKeys[index] && jsonValuesEqual(left[key], right[key]));
  }

  return false;
}

function messageFromUnknown(error: unknown): string {
  return error instanceof Error ? error.message : "Error desconocido.";
}

async function requireVerifiedCurrentUserId(supabase: SupabaseClient): Promise<string> {
  const cachedUserId = getCachedUserId();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    throw new WorkoutImportSessionError("No se pudo verificar la sesión antes de importar registros de entreno.", error);
  }
  if (!user) {
    throw new WorkoutImportSessionError("No hay una sesión autenticada para importar registros de entreno.");
  }
  if (!cachedUserId) {
    throw new WorkoutImportSessionError(
      "La sesión local todavía no está lista. Volvé a intentar desde una pantalla autenticada."
    );
  }
  if (cachedUserId !== user.id) {
    throw new WorkoutImportSessionError(
      "La sesión local no coincide con la sesión de Supabase. Cerrá sesión y volvé a entrar antes de importar."
    );
  }
  return user.id;
}

function summarize(items: WorkoutImportResultItem[]): WorkoutImportSection {
  return {
    total: items.length,
    created: items.filter((item) => item.status === "created").length,
    identical: items.filter((item) => item.status === "identical").length,
    conflicts: items.filter((item) => item.status === "conflict").length,
    invalid: items.filter((item) => item.status === "invalid").length,
    failed: items.filter((item) => item.status === "failed").length,
    items,
  };
}

/**
 * Núcleo común: dado un valor local ya validado, decide create/identical/
 * conflict. `fetchCloudPayload` devuelve el payload existente o `null`.
 * Ante cualquier error al crear (típicamente la restricción unique por una
 * carrera) relee y reclasifica; si no hay fila, informa el error original.
 */
async function classifyAndCreate(
  key: string,
  localPayload: unknown,
  fetchCloudPayload: () => Promise<unknown | null>,
  create: () => Promise<unknown>
): Promise<WorkoutImportResultItem> {
  const classify = (cloudPayload: unknown): WorkoutImportResultItem =>
    jsonValuesEqual(localPayload, cloudPayload)
      ? { key, status: "identical" }
      : { key, status: "conflict", message: "Ya existe una versión distinta en la nube; no se sobrescribió." };

  try {
    const existing = await fetchCloudPayload();
    if (existing === null) {
      await create();
      return { key, status: "created" };
    }
    return classify(existing);
  } catch (error) {
    if (error instanceof WorkoutPayloadValidationError) {
      return { key, status: "invalid", message: messageFromUnknown(error) };
    }
    try {
      const raced = await fetchCloudPayload();
      if (raced !== null) return classify(raced);
    } catch {
      // Se conserva el error original.
    }
    return { key, status: "failed", message: messageFromUnknown(error) };
  }
}

function invalidItem(key: string | null, message: string): WorkoutImportResultItem {
  return { key, status: "invalid", message };
}

function sessionKeyOf(value: { routineId: string; weekId: string; dayId: string }): string {
  return `${value.routineId}/${value.weekId}/${value.dayId}`;
}

async function importSessions(supabase: SupabaseClient, userId: string): Promise<WorkoutImportSection> {
  const snapshot = getAllDaySessionsSnapshot();
  const items: WorkoutImportResultItem[] = [];

  const counts = new Map<string, number>();
  for (const value of snapshot) {
    if (isDaySessionPayload(value)) counts.set(sessionKeyOf(value), (counts.get(sessionKeyOf(value)) ?? 0) + 1);
  }

  for (const value of snapshot) {
    if (!isDaySessionPayload(value)) {
      items.push(invalidItem(null, "La sesión local no respeta la forma esperada; no se importó."));
      continue;
    }
    const key = sessionKeyOf(value);
    if ([value.routineId, value.weekId, value.dayId].some((part) => part.trim().length === 0)) {
      items.push(invalidItem(key, "La sesión local tiene identidad vacía; no se importó."));
      continue;
    }
    if ((counts.get(key) ?? 0) > 1) {
      items.push(invalidItem(key, "Hay más de una sesión local con la misma identidad; ninguna se importó."));
      continue;
    }

    items.push(
      await classifyAndCreate(
        key,
        value,
        async () => (await getWorkoutSessionRow(supabase, userId, value.routineId, value.weekId, value.dayId))?.payload ?? null,
        () => createWorkoutSessionRow(supabase, userId, value)
      )
    );
  }

  return summarize(items);
}

async function importExecutions(supabase: SupabaseClient, userId: string): Promise<WorkoutImportSection> {
  const snapshot = getAllRoutineExecutionsSnapshot();
  const items: WorkoutImportResultItem[] = [];

  const counts = new Map<string, number>();
  for (const value of snapshot) {
    if (isRoutineExecutionPayload(value)) counts.set(value.id, (counts.get(value.id) ?? 0) + 1);
  }

  for (const value of snapshot) {
    if (!isRoutineExecutionPayload(value)) {
      items.push(invalidItem(null, "La ejecución local no respeta la forma esperada; no se importó."));
      continue;
    }
    if (value.id.trim().length === 0) {
      items.push(invalidItem(value.id, "La ejecución local tiene un id vacío; no se importó."));
      continue;
    }
    if ((counts.get(value.id) ?? 0) > 1) {
      items.push(invalidItem(value.id, "Hay más de una ejecución local con el mismo id; ninguna se importó."));
      continue;
    }

    items.push(
      await classifyAndCreate(
        value.id,
        value,
        async () => (await getWorkoutExecutionRow(supabase, userId, value.id))?.payload ?? null,
        () => createWorkoutExecutionRow(supabase, userId, value)
      )
    );
  }

  return summarize(items);
}

/**
 * Importa a Supabase las sesiones en vivo y las ejecuciones archivadas de
 * este dispositivo para el usuario actualmente autenticado. Nunca acepta
 * un `athleteId`/`userId` desde quien llama. Un error puntual en un
 * elemento no aborta el resto.
 */
export async function importLocalWorkoutData(supabase: SupabaseClient): Promise<WorkoutImportReport> {
  const userId = await requireVerifiedCurrentUserId(supabase);
  const sessions = await importSessions(supabase, userId);
  const executions = await importExecutions(supabase, userId);
  return { userId, sessions, executions };
}
