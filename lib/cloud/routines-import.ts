import type { SupabaseClient } from "@supabase/supabase-js";
import { getCachedUserId } from "@/lib/auth/client-session";
import {
  createRoutineRow,
  getRoutineByLocalId,
  isRoutinePayload,
  RoutineAdapterError,
  type RoutineRow,
} from "@/lib/cloud/routines";
import { getCustomRoutinesSnapshot } from "@/lib/mock/repository";
import type { Routine } from "@/lib/mock/types";

/**
 * Sprint 6.7 — Importador deliberadamente manual y seguro.
 *
 * Este módulo no se ejecuta al importarse, no toca localStorage y no está
 * conectado a ninguna pantalla todavía. Solo crea filas que no existen en
 * Supabase; nunca sobrescribe conflictos, restaura archivadas ni borra datos.
 */

export type RoutineImportStatus =
  | "missing"
  | "identical"
  | "conflict"
  | "archived"
  | "invalid";

export interface RoutineImportPlanItem {
  index: number;
  localId: string | null;
  status: RoutineImportStatus;
  routine?: Routine;
  cloudRow?: RoutineRow;
  message?: string;
}

export interface RoutineImportPlan {
  userId: string;
  total: number;
  counts: Record<RoutineImportStatus, number>;
  items: RoutineImportPlanItem[];
}

export type RoutineImportResultStatus =
  | "created"
  | "identical"
  | "conflict"
  | "archived"
  | "invalid"
  | "failed";

export interface RoutineImportResultItem {
  index: number;
  localId: string | null;
  status: RoutineImportResultStatus;
  row?: RoutineRow;
  message?: string;
}

export interface RoutineImportReport {
  userId: string;
  total: number;
  created: number;
  identical: number;
  conflicts: number;
  archived: number;
  invalid: number;
  failed: number;
  items: RoutineImportResultItem[];
}

type ValidatedLocalRoutine =
  | { index: number; routine: Routine }
  | {
      index: number;
      localId: string | null;
      status: "invalid";
      message: string;
    };

export class RoutineImportSessionError extends RoutineAdapterError {
  constructor(message: string, cause?: unknown) {
    super(message, cause);
    this.name = "RoutineImportSessionError";
  }
}

export class RoutineLocalDataError extends RoutineAdapterError {
  constructor(message: string, cause?: unknown) {
    super(message, cause);
    this.name = "RoutineLocalDataError";
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Igualdad semántica JSON: ignora el orden de las claves de objetos y
 * conserva el orden de arrays. Las propiedades undefined se tratan como
 * ausentes, igual que al serializar JSON.
 */
function jsonValuesEqual(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true;

  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) {
      return false;
    }
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
    return leftKeys.every(
      (key, index) =>
        key === rightKeys[index] && jsonValuesEqual(left[key], right[key])
    );
  }

  return false;
}

async function requireVerifiedCurrentUserId(
  supabase: SupabaseClient
): Promise<string> {
  const cachedUserId = getCachedUserId();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    throw new RoutineImportSessionError(
      "No se pudo verificar la sesión antes de importar rutinas.",
      error
    );
  }

  if (!user) {
    throw new RoutineImportSessionError(
      "No hay una sesión autenticada para importar rutinas."
    );
  }

  if (!cachedUserId) {
    throw new RoutineImportSessionError(
      "La sesión local todavía no está lista. Volvé a intentar desde una pantalla autenticada."
    );
  }

  if (cachedUserId !== user.id) {
    throw new RoutineImportSessionError(
      "La sesión local no coincide con la sesión de Supabase. Cerrá sesión y volvé a entrar antes de importar."
    );
  }

  return user.id;
}

function classifyRoutine(
  index: number,
  routine: Routine,
  cloudRow: RoutineRow | null
): RoutineImportPlanItem {
  if (!cloudRow) {
    return { index, localId: routine.id, status: "missing", routine };
  }

  if (cloudRow.archived_at !== null) {
    return {
      index,
      localId: routine.id,
      status: "archived",
      routine,
      cloudRow,
      message: "Ya existe archivada en Supabase; no se restaura automáticamente.",
    };
  }

  if (jsonValuesEqual(routine, cloudRow.payload)) {
    return {
      index,
      localId: routine.id,
      status: "identical",
      routine,
      cloudRow,
    };
  }

  return {
    index,
    localId: routine.id,
    status: "conflict",
    routine,
    cloudRow,
    message: "Existe en Supabase con un contenido diferente; no se sobrescribe.",
  };
}

function emptyPlanCounts(): Record<RoutineImportStatus, number> {
  return {
    missing: 0,
    identical: 0,
    conflict: 0,
    archived: 0,
    invalid: 0,
  };
}

/**
 * Inspecciona rutinas locales y remotas sin escribir nada.
 */
export async function planCurrentUserRoutineImport(
  supabase: SupabaseClient
): Promise<RoutineImportPlan> {
  const userId = await requireVerifiedCurrentUserId(supabase);
  const snapshot = getCustomRoutinesSnapshot();

  if (!Array.isArray(snapshot)) {
    throw new RoutineLocalDataError(
      "Las rutinas locales tienen una forma inválida: se esperaba una lista. No se importó nada."
    );
  }

  const validated: ValidatedLocalRoutine[] = snapshot.map((value, index) => {
    if (!isRoutinePayload(value)) {
      return {
        index,
        localId:
          isPlainObject(value) && typeof value.id === "string" ? value.id : null,
        status: "invalid" as const,
        message: "La rutina local no respeta la forma válida de Routine.",
      };
    }

    if (value.id.trim().length === 0) {
      return {
        index,
        localId: value.id,
        status: "invalid" as const,
        message: "La rutina local tiene un id vacío o compuesto solo por espacios.",
      };
    }

    return { index, routine: value };
  });

  const idCounts = new Map<string, number>();
  for (const item of validated) {
    if ("routine" in item) {
      idCounts.set(item.routine.id, (idCounts.get(item.routine.id) ?? 0) + 1);
    }
  }

  const items: RoutineImportPlanItem[] = [];
  for (const item of validated) {
    if (!("routine" in item)) {
      items.push(item);
      continue;
    }

    if ((idCounts.get(item.routine.id) ?? 0) > 1) {
      items.push({
        index: item.index,
        localId: item.routine.id,
        status: "invalid",
        routine: item.routine,
        message: "Hay más de una rutina local con el mismo id; ninguna se importará.",
      });
      continue;
    }

    const cloudRow = await getRoutineByLocalId(
      supabase,
      userId,
      item.routine.id
    );
    items.push(classifyRoutine(item.index, item.routine, cloudRow));
  }

  const counts = emptyPlanCounts();
  for (const item of items) counts[item.status] += 1;

  return { userId, total: snapshot.length, counts, items };
}

function messageFromUnknown(error: unknown): string {
  return error instanceof Error ? error.message : "Error desconocido.";
}

function toSkippedResult(item: RoutineImportPlanItem): RoutineImportResultItem {
  const status =
    item.status === "missing" ? "failed" : item.status;

  return {
    index: item.index,
    localId: item.localId,
    status,
    row: item.cloudRow,
    message: item.message,
  };
}

/**
 * Crea únicamente las rutinas clasificadas como missing por el plan.
 * Ante una carrera de clave única, vuelve a leer y clasifica; jamás pisa.
 */
export async function importMissingCurrentUserRoutines(
  supabase: SupabaseClient
): Promise<RoutineImportReport> {
  const plan = await planCurrentUserRoutineImport(supabase);
  const items: RoutineImportResultItem[] = [];

  for (const item of plan.items) {
    if (item.status !== "missing" || !item.routine) {
      items.push(toSkippedResult(item));
      continue;
    }

    try {
      const row = await createRoutineRow(
        supabase,
        plan.userId,
        item.routine.id,
        item.routine
      );
      items.push({
        index: item.index,
        localId: item.routine.id,
        status: "created",
        row,
      });
    } catch (createError) {
      try {
        const racedRow = await getRoutineByLocalId(
          supabase,
          plan.userId,
          item.routine.id
        );

        if (racedRow) {
          const raced = classifyRoutine(item.index, item.routine, racedRow);
          items.push(toSkippedResult(raced));
          continue;
        }
      } catch {
        // Conservamos el error original de creación, que explica la operación fallida.
      }

      items.push({
        index: item.index,
        localId: item.routine.id,
        status: "failed",
        message: messageFromUnknown(createError),
      });
    }
  }

  return {
    userId: plan.userId,
    total: items.length,
    created: items.filter((item) => item.status === "created").length,
    identical: items.filter((item) => item.status === "identical").length,
    conflicts: items.filter((item) => item.status === "conflict").length,
    archived: items.filter((item) => item.status === "archived").length,
    invalid: items.filter((item) => item.status === "invalid").length,
    failed: items.filter((item) => item.status === "failed").length,
    items,
  };
}
