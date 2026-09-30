import type { SupabaseClient } from "@supabase/supabase-js";
import { getCachedUserId } from "@/lib/auth/client-session";
import {
  createNutritionDailyLogRow,
  createNutritionProfileRow,
  createWeeklyMealPlanRow,
  getNutritionDailyLogRow,
  getNutritionProfileRow,
  getWeeklyMealPlanRow,
  isMealCompletionLogArray,
  isNutritionProfilePayload,
  isWeeklyMealPlanPayload,
  NutritionAdapterError,
} from "@/lib/cloud/nutrition";
import { getAllNutritionLogDates, getMealCompletionLog, getNutritionProfile, getWeeklyMealPlan } from "@/lib/mock/repository";
import type { MealSlot, Weekday } from "@/lib/mock/types";

/**
 * Sprint 7.0 — Importador deliberadamente manual y seguro de Nutrición,
 * mismo criterio que `lib/cloud/routines-import.ts`: este módulo no se
 * ejecuta al importarse, no toca localStorage (solo LEE, vía las
 * funciones ya existentes de `lib/mock/repository.ts`) y no está
 * conectado a ninguna pantalla/hook/login todavía. Solo crea filas que no
 * existen en Supabase; nunca sobrescribe un perfil/planificación/registro
 * diferente que ya esté en la nube.
 *
 * Tres dominios con cardinalidad distinta, importados por separado:
 * - Perfil nutricional: a lo sumo 1 por atleta (o ninguno).
 * - Planificación semanal: a lo sumo 1 por atleta (o ninguna — o "vacía",
 *   ver `isWeeklyMealPlanEmpty` más abajo).
 * - Registros diarios: 0..N por atleta, uno por fecha con datos locales.
 *
 * Reintentable sin duplicar: cada creación se protege con la restricción
 * `unique` de la tabla correspondiente (`athlete_id` para perfil/plan,
 * `(athlete_id, log_date)` para registros diarios, ver
 * `supabase/migrations/0005_nutrition.sql`) — si dos corridas se
 * superponen, la segunda inserción falla por la unicidad y este módulo
 * vuelve a leer y reclasifica en vez de reintentar a ciegas, exactamente
 * igual que el manejo de carreras de `importMissingCurrentUserRoutines`.
 */

export type NutritionImportItemStatus = "created" | "identical" | "conflict" | "invalid" | "failed";

export interface NutritionProfileImportResult {
  /** `"skipped"` = no hay perfil nutricional en este dispositivo, no hay nada que importar. */
  status: NutritionImportItemStatus | "skipped";
  message?: string;
}

export interface WeeklyMealPlanImportResult {
  /** `"skipped"` = la planificación local está completamente vacía (28 slots en `null`) — no se sube una planificación vacía a la nube. */
  status: NutritionImportItemStatus | "skipped";
  message?: string;
}

export interface NutritionDailyLogImportResultItem {
  logDate: string;
  status: NutritionImportItemStatus;
  message?: string;
}

export interface NutritionDailyLogsImportReport {
  total: number;
  created: number;
  identical: number;
  conflicts: number;
  invalid: number;
  failed: number;
  items: NutritionDailyLogImportResultItem[];
}

export interface NutritionImportReport {
  userId: string;
  profile: NutritionProfileImportResult;
  weeklyPlan: WeeklyMealPlanImportResult;
  dailyLogs: NutritionDailyLogsImportReport;
}

export class NutritionImportSessionError extends NutritionAdapterError {
  constructor(message: string, cause?: unknown) {
    super(message, cause);
    this.name = "NutritionImportSessionError";
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Igualdad semántica JSON: ignora el orden de las claves de objetos y
 * conserva el orden de arrays. Las propiedades `undefined` se tratan como
 * ausentes, igual que al serializar JSON. Copia deliberada de la misma
 * función en `lib/cloud/routines-import.ts` — cada importador es un
 * archivo aislado, sin dependencias cruzadas entre dominios.
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
    return leftKeys.every((key, index) => key === rightKeys[index] && jsonValuesEqual(left[key], right[key]));
  }

  return false;
}

function messageFromUnknown(error: unknown): string {
  return error instanceof Error ? error.message : "Error desconocido.";
}

/**
 * Usuario autenticado + verificación cruzada contra `getCachedUserId()` —
 * misma función, mismo criterio y mismos mensajes que
 * `requireVerifiedCurrentUserId` en `lib/cloud/routines-import.ts`
 * (copiada, no importada: este módulo no depende de rutinas).
 */
async function requireVerifiedCurrentUserId(supabase: SupabaseClient): Promise<string> {
  const cachedUserId = getCachedUserId();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    throw new NutritionImportSessionError("No se pudo verificar la sesión antes de importar datos de nutrición.", error);
  }
  if (!user) {
    throw new NutritionImportSessionError("No hay una sesión autenticada para importar datos de nutrición.");
  }
  if (!cachedUserId) {
    throw new NutritionImportSessionError(
      "La sesión local todavía no está lista. Volvé a intentar desde una pantalla autenticada."
    );
  }
  if (cachedUserId !== user.id) {
    throw new NutritionImportSessionError(
      "La sesión local no coincide con la sesión de Supabase. Cerrá sesión y volvé a entrar antes de importar."
    );
  }

  return user.id;
}

const WEEKDAYS: readonly Weekday[] = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"];
const MEAL_SLOTS: readonly MealSlot[] = ["desayuno", "almuerzo", "merienda", "cena"];

/** `true` si los 28 slots (7 días × 4 comidas) están en `null` — una planificación que el usuario nunca tocó. */
function isWeeklyMealPlanEmpty(plan: Record<Weekday, Record<MealSlot, string | null>>): boolean {
  return WEEKDAYS.every((day) => MEAL_SLOTS.every((slot) => plan[day][slot] === null));
}

/* ------------------------------------------------------------------ */
/* 1. Perfil nutricional                                               */
/* ------------------------------------------------------------------ */

async function importNutritionProfile(supabase: SupabaseClient, userId: string): Promise<NutritionProfileImportResult> {
  const localProfile = getNutritionProfile();
  if (!localProfile) {
    return { status: "skipped", message: "No hay perfil nutricional guardado en este dispositivo." };
  }
  if (!isNutritionProfilePayload(localProfile)) {
    return { status: "invalid", message: "El perfil nutricional local no respeta la forma esperada; no se importó." };
  }

  const classify = (cloudPayload: unknown): NutritionProfileImportResult =>
    jsonValuesEqual(localProfile, cloudPayload)
      ? { status: "identical" }
      : { status: "conflict", message: "Ya existe un perfil nutricional distinto en la nube; no se sobrescribió." };

  try {
    const existing = await getNutritionProfileRow(supabase, userId);
    if (!existing) {
      await createNutritionProfileRow(supabase, userId, localProfile);
      return { status: "created" };
    }
    return classify(existing.payload);
  } catch (error) {
    // Carrera: otra sesión creó el perfil entre la lectura y el insert
    // (unique(athlete_id) lo rechaza) — se vuelve a leer y clasificar en
    // vez de reintentar a ciegas o perder el resultado.
    try {
      const raced = await getNutritionProfileRow(supabase, userId);
      if (raced) return classify(raced.payload);
    } catch {
      // Se conserva el error original de abajo — no se pudo ni diagnosticar la carrera.
    }
    return { status: "failed", message: messageFromUnknown(error) };
  }
}

/* ------------------------------------------------------------------ */
/* 2. Planificación semanal                                            */
/* ------------------------------------------------------------------ */

async function importWeeklyMealPlan(supabase: SupabaseClient, userId: string): Promise<WeeklyMealPlanImportResult> {
  const localPlan = getWeeklyMealPlan();
  if (isWeeklyMealPlanEmpty(localPlan)) {
    return { status: "skipped", message: "La planificación semanal de este dispositivo está vacía." };
  }
  if (!isWeeklyMealPlanPayload(localPlan)) {
    return { status: "invalid", message: "La planificación semanal local no respeta la forma esperada; no se importó." };
  }

  const classify = (cloudPayload: unknown): WeeklyMealPlanImportResult =>
    jsonValuesEqual(localPlan, cloudPayload)
      ? { status: "identical" }
      : { status: "conflict", message: "Ya existe una planificación semanal distinta en la nube; no se sobrescribió." };

  try {
    const existing = await getWeeklyMealPlanRow(supabase, userId);
    if (!existing) {
      await createWeeklyMealPlanRow(supabase, userId, localPlan);
      return { status: "created" };
    }
    return classify(existing.payload);
  } catch (error) {
    try {
      const raced = await getWeeklyMealPlanRow(supabase, userId);
      if (raced) return classify(raced.payload);
    } catch {
      // Se conserva el error original de abajo.
    }
    return { status: "failed", message: messageFromUnknown(error) };
  }
}

/* ------------------------------------------------------------------ */
/* 3. Registros diarios de comidas completadas                         */
/* ------------------------------------------------------------------ */

async function importNutritionDailyLog(
  supabase: SupabaseClient,
  userId: string,
  logDate: string
): Promise<NutritionDailyLogImportResultItem> {
  const localLog = getMealCompletionLog(logDate);
  if (!isMealCompletionLogArray(localLog)) {
    return { logDate, status: "invalid", message: "El registro local de ese día no respeta la forma esperada; no se importó." };
  }

  const classify = (cloudPayload: unknown): NutritionDailyLogImportResultItem =>
    jsonValuesEqual(localLog, cloudPayload)
      ? { logDate, status: "identical" }
      : { logDate, status: "conflict", message: "Ya existe un registro distinto en la nube para ese día; no se sobrescribió." };

  try {
    const existing = await getNutritionDailyLogRow(supabase, userId, logDate);
    if (!existing) {
      await createNutritionDailyLogRow(supabase, userId, logDate, localLog);
      return { logDate, status: "created" };
    }
    return classify(existing.payload);
  } catch (error) {
    try {
      const raced = await getNutritionDailyLogRow(supabase, userId, logDate);
      if (raced) return classify(raced.payload);
    } catch {
      // Se conserva el error original de abajo.
    }
    return { logDate, status: "failed", message: messageFromUnknown(error) };
  }
}

async function importAllNutritionDailyLogs(supabase: SupabaseClient, userId: string): Promise<NutritionDailyLogsImportReport> {
  const dates = getAllNutritionLogDates();
  const items: NutritionDailyLogImportResultItem[] = [];

  // Secuencial a propósito (no Promise.all): cada día se procesa de forma
  // aislada — si uno falla, el resto sigue — pero sin mandar N requests en
  // paralelo contra Supabase desde el cliente por una sola importación.
  for (const logDate of dates) {
    items.push(await importNutritionDailyLog(supabase, userId, logDate));
  }

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

/* ------------------------------------------------------------------ */
/* Entrada pública                                                     */
/* ------------------------------------------------------------------ */

/**
 * Importa a Supabase el perfil nutricional, la planificación semanal y
 * todos los registros diarios que existan en este dispositivo para el
 * usuario actualmente autenticado. Nunca acepta un `athleteId`/`userId`
 * desde quien llama: se resuelve acá adentro y se verifica contra
 * `supabase.auth.getUser()`, igual que `importMissingCurrentUserRoutines`.
 *
 * Un error puntual en un dominio o en un día no aborta el resto: cada uno
 * de los tres bloques (perfil, plan, cada registro diario) se resuelve de
 * forma independiente y el informe final siempre refleja los tres,
 * incluso si alguno terminó en `"failed"`.
 */
export async function importLocalNutritionData(supabase: SupabaseClient): Promise<NutritionImportReport> {
  const userId = await requireVerifiedCurrentUserId(supabase);

  const profile = await importNutritionProfile(supabase, userId);
  const weeklyPlan = await importWeeklyMealPlan(supabase, userId);
  const dailyLogs = await importAllNutritionDailyLogs(supabase, userId);

  return { userId, profile, weeklyPlan, dailyLogs };
}
