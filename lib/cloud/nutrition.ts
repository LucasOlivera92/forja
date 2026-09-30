import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ActivityLevel,
  MealCompletionLog,
  MealSlot,
  NutritionGoal,
  NutritionProfile,
  Weekday,
  WeeklyMealPlan,
} from "@/lib/mock/types";

/**
 * Sprint 7.0 — Adaptador tipado de las 3 tablas de Nutrición en Supabase
 * (`public.nutrition_profiles`, `public.nutrition_weekly_plans`,
 * `public.nutrition_daily_logs` — ver `supabase/migrations/0005_nutrition.sql`).
 *
 * Mismo criterio de aislamiento que `lib/cloud/routines.ts`: no importa
 * nada de `lib/mock/repository.ts` (que sigue siendo, sin cambios, la
 * única fuente de datos real de Nutrición vía localStorage) y ninguna
 * pantalla lo usa todavía — Sprint 7.0 es solo la base cloud segura.
 *
 * No crea su propio cliente de Supabase: cada función recibe un
 * `SupabaseClient` ya armado (browser o server) como parámetro, y este
 * archivo no lee ninguna credencial. La garantía de "nunca `service_role`"
 * es responsabilidad de quien construye el cliente y lo pasa acá, igual
 * que en `lib/cloud/routines.ts`.
 *
 * El proyecto no tiene tipos de Database generados para supabase-js, así
 * que `.select()`/`.insert()`/`.update()` devuelven datos sin tipar —
 * todo lo que entra o sale de Supabase pasa por guards de runtime antes
 * de tratarse como `NutritionProfile`/`WeeklyMealPlan`/`MealCompletionLog[]`
 * o como una fila de alguna de las 3 tablas.
 *
 * La seguridad de fondo (quién puede leer/crear/editar qué fila) la
 * deciden por completo las policies RLS de 0005 — este adaptador no
 * duplica esa lógica de autorización en TypeScript.
 */

const NUTRITION_PROFILES_TABLE = "nutrition_profiles";
const NUTRITION_WEEKLY_PLANS_TABLE = "nutrition_weekly_plans";
const NUTRITION_DAILY_LOGS_TABLE = "nutrition_daily_logs";

/* ------------------------------------------------------------------ */
/* Filas — espejo 1:1 de cada tabla (snake_case)                       */
/* ------------------------------------------------------------------ */

export interface NutritionProfileRow {
  id: string;
  athlete_id: string;
  /** `NutritionProfile` completo — ver lib/mock/types.ts. Validado en runtime, nunca asumido. */
  payload: NutritionProfile;
  created_by: string | null;
  updated_by: string | null;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface WeeklyMealPlanRow {
  id: string;
  athlete_id: string;
  /** `WeeklyMealPlan` completo — ver lib/mock/types.ts. Validado en runtime, nunca asumido. */
  payload: WeeklyMealPlan;
  created_by: string | null;
  updated_by: string | null;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface NutritionDailyLogRow {
  id: string;
  athlete_id: string;
  /** `YYYY-MM-DD` — mismo formato que usa lib/mock/repository.ts para la key de localStorage de ese día. Inmutable tras crear la fila (ver trigger en 0005). */
  log_date: string;
  /** `MealCompletionLog[]` completo de ese día — ver lib/mock/types.ts. Validado en runtime, nunca asumido. */
  payload: MealCompletionLog[];
  created_by: string | null;
  updated_by: string | null;
  version: number;
  created_at: string;
  updated_at: string;
}

/* ------------------------------------------------------------------ */
/* Errores de dominio                                                  */
/* ------------------------------------------------------------------ */

/**
 * Se lanza cuando un UPDATE optimista no afectó ninguna fila porque
 * `version` ya no coincidía con lo esperado — mismo significado que
 * `RoutineConflictError` en `lib/cloud/routines.ts`: no es una falla, es
 * un conflicto esperable que quien llama debe resolver (releer la fila y
 * decidir cómo seguir).
 */
export class NutritionConflictError extends Error {
  constructor(
    public readonly rowId: string,
    public readonly expectedVersion: number
  ) {
    super(
      `Conflicto de edición: la fila ${rowId} ya no está en version ${expectedVersion}. ` +
        `Alguien más la modificó mientras tanto — hay que releerla antes de reintentar.`
    );
    this.name = "NutritionConflictError";
  }
}

/** Se lanza cuando un `payload` (para escribir, o el que devolvió Supabase) no tiene la forma esperada. */
export class NutritionPayloadValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NutritionPayloadValidationError";
  }
}

/** Cualquier otro error de Supabase (red, RLS, columnas inesperadas) — envuelve el error original en `cause`. */
export class NutritionAdapterError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = "NutritionAdapterError";
  }
}

/* ------------------------------------------------------------------ */
/* Validación en runtime — nunca confiar a ciegas en lo que va y viene  */
/* ------------------------------------------------------------------ */

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** `typeof value === "number"` por sí solo acepta `NaN`/`Infinity`, que no son JSON válido — mismo criterio que `lib/cloud/routines.ts`. */
function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

const NUTRITION_GOALS: readonly NutritionGoal[] = ["Volumen", "Recomposición corporal", "Definición", "Mantenimiento"];
const ACTIVITY_LEVELS: readonly ActivityLevel[] = ["Baja", "Moderada", "Alta", "Deportista"];
const WEEKDAYS: readonly Weekday[] = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"];
const MEAL_SLOTS: readonly MealSlot[] = ["desayuno", "almuerzo", "merienda", "cena"];

/** Type guard público — misma forma que `NutritionProfile` (lib/mock/types.ts). */
export function isNutritionProfilePayload(value: unknown): value is NutritionProfile {
  if (!isPlainObject(value)) return false;
  return (
    isFiniteNumber(value.heightCm) &&
    isFiniteNumber(value.weightKg) &&
    typeof value.goal === "string" &&
    (NUTRITION_GOALS as readonly string[]).includes(value.goal) &&
    typeof value.activity === "string" &&
    (ACTIVITY_LEVELS as readonly string[]).includes(value.activity) &&
    isFiniteNumber(value.mealsPerDay) &&
    isFiniteNumber(value.targetProtein) &&
    isFiniteNumber(value.targetCarbs) &&
    isFiniteNumber(value.targetFat) &&
    isFiniteNumber(value.targetWaterLiters) &&
    isFiniteNumber(value.targetWeightKg) &&
    isFiniteNumber(value.targetCalories) &&
    isFiniteNumber(value.targetFiber) &&
    isFiniteNumber(value.targetFruitPortions) &&
    isFiniteNumber(value.targetVegetablesGrams) &&
    isStringArray(value.favoriteProteins) &&
    isStringArray(value.favoriteCarbs) &&
    isStringArray(value.favoriteFats) &&
    isStringArray(value.favoriteFruits) &&
    isStringArray(value.favoriteVegetables) &&
    typeof value.createdAt === "string" &&
    typeof value.updatedAt === "string"
  );
}

function isMealSlotMap(value: unknown): value is Record<MealSlot, string | null> {
  if (!isPlainObject(value)) return false;
  const keys = Object.keys(value);
  if (keys.length !== MEAL_SLOTS.length || !keys.every((key) => (MEAL_SLOTS as readonly string[]).includes(key))) {
    return false;
  }
  return MEAL_SLOTS.every((slot) => value[slot] === null || typeof value[slot] === "string");
}

/** Type guard público — misma forma que `WeeklyMealPlan` (lib/mock/types.ts): grilla de 7 días × 4 comidas, cada valor un id de MealTemplate o `null`. */
export function isWeeklyMealPlanPayload(value: unknown): value is WeeklyMealPlan {
  if (!isPlainObject(value)) return false;
  const keys = Object.keys(value);
  if (keys.length !== WEEKDAYS.length || !keys.every((key) => (WEEKDAYS as readonly string[]).includes(key))) {
    return false;
  }
  return WEEKDAYS.every((day) => isMealSlotMap(value[day]));
}

function isMealCompletionLog(value: unknown): value is MealCompletionLog {
  if (!isPlainObject(value)) return false;
  return (
    typeof value.id === "string" &&
    typeof value.mealTemplateId === "string" &&
    typeof value.mealType === "string" &&
    (MEAL_SLOTS as readonly string[]).includes(value.mealType) &&
    typeof value.date === "string" &&
    typeof value.completedAt === "string" &&
    isFiniteNumber(value.protein) &&
    isFiniteNumber(value.carbs) &&
    isFiniteNumber(value.fat) &&
    isFiniteNumber(value.fiber) &&
    isFiniteNumber(value.kcal)
  );
}

/** Type guard público — misma forma que `MealCompletionLog[]` (lib/mock/types.ts): el array completo de comidas completadas de un día. */
export function isMealCompletionLogArray(value: unknown): value is MealCompletionLog[] {
  return Array.isArray(value) && value.every(isMealCompletionLog);
}

const LOG_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function assertValidLogDate(logDate: string): void {
  if (!LOG_DATE_PATTERN.test(logDate)) {
    throw new NutritionPayloadValidationError(`log_date tiene que tener el formato YYYY-MM-DD (recibido: "${logDate}").`);
  }
}

/** Columnas de auditoría/versionado compartidas por las 3 tablas — validadas una sola vez, no repetidas en cada `parse*Row`. */
interface CommonAuditColumns {
  id: string;
  athlete_id: string;
  created_by: string | null;
  updated_by: string | null;
  version: number;
  created_at: string;
  updated_at: string;
}

function parseCommonAuditColumns(raw: Record<string, unknown>, tableLabel: string): CommonAuditColumns {
  const { id, athlete_id, created_by, updated_by, version, created_at, updated_at } = raw;

  const columnsLookValid =
    typeof id === "string" &&
    typeof athlete_id === "string" &&
    Number.isSafeInteger(version) &&
    (version as number) >= 1 &&
    typeof created_at === "string" &&
    typeof updated_at === "string" &&
    (created_by === null || typeof created_by === "string") &&
    (updated_by === null || typeof updated_by === "string");

  if (!columnsLookValid) {
    throw new NutritionAdapterError(`Supabase devolvió una fila de ${tableLabel} con columnas de forma inesperada.`);
  }

  return {
    id: id as string,
    athlete_id: athlete_id as string,
    created_by: created_by as string | null,
    updated_by: updated_by as string | null,
    version: version as number,
    created_at: created_at as string,
    updated_at: updated_at as string,
  };
}

function parseNutritionProfileRow(raw: unknown): NutritionProfileRow {
  if (!isPlainObject(raw)) {
    throw new NutritionAdapterError("Supabase devolvió una fila de nutrition_profiles con forma inesperada (no es un objeto).");
  }
  const common = parseCommonAuditColumns(raw, "nutrition_profiles");
  const payload = raw.payload;
  if (!isNutritionProfilePayload(payload)) {
    throw new NutritionPayloadValidationError(
      `La fila de nutrition_profiles ${common.id} tiene un payload que no respeta la forma de NutritionProfile (lib/mock/types.ts).`
    );
  }
  return { ...common, payload };
}

function parseWeeklyMealPlanRow(raw: unknown): WeeklyMealPlanRow {
  if (!isPlainObject(raw)) {
    throw new NutritionAdapterError("Supabase devolvió una fila de nutrition_weekly_plans con forma inesperada (no es un objeto).");
  }
  const common = parseCommonAuditColumns(raw, "nutrition_weekly_plans");
  const payload = raw.payload;
  if (!isWeeklyMealPlanPayload(payload)) {
    throw new NutritionPayloadValidationError(
      `La fila de nutrition_weekly_plans ${common.id} tiene un payload que no respeta la forma de WeeklyMealPlan (lib/mock/types.ts).`
    );
  }
  return { ...common, payload };
}

function parseNutritionDailyLogRow(raw: unknown): NutritionDailyLogRow {
  if (!isPlainObject(raw)) {
    throw new NutritionAdapterError("Supabase devolvió una fila de nutrition_daily_logs con forma inesperada (no es un objeto).");
  }
  const common = parseCommonAuditColumns(raw, "nutrition_daily_logs");
  const logDate = raw.log_date;
  if (typeof logDate !== "string") {
    throw new NutritionAdapterError(`La fila de nutrition_daily_logs ${common.id} tiene log_date con forma inesperada.`);
  }
  const payload = raw.payload;
  if (!isMealCompletionLogArray(payload)) {
    throw new NutritionPayloadValidationError(
      `La fila de nutrition_daily_logs ${common.id} tiene un payload que no respeta la forma de MealCompletionLog[] (lib/mock/types.ts).`
    );
  }
  return { ...common, log_date: logDate, payload };
}

/* ------------------------------------------------------------------ */
/* Control optimista compartido — mismo patrón que lib/cloud/routines.ts */
/* ------------------------------------------------------------------ */

function assertValidExpectedVersion(expectedVersion: number): void {
  if (!Number.isSafeInteger(expectedVersion) || expectedVersion < 1) {
    throw new NutritionPayloadValidationError(
      `expectedVersion tiene que ser un entero seguro >= 1 (recibido: ${expectedVersion}).`
    );
  }
}

/**
 * Se llama únicamente cuando un UPDATE optimista no afectó ninguna fila.
 * Igual que `diagnoseUpdateFailure` en `lib/cloud/routines.ts`: una
 * segunda lectura mínima (`id, version`, nunca `payload`) distingue
 * conflicto de version vs. fila invisible bajo RLS, sin revelar cuál de
 * las dos fue — para no filtrar la existencia de una fila ajena.
 */
async function diagnoseUpdateFailure(
  supabase: SupabaseClient,
  table: string,
  id: string,
  expectedVersion: number
): Promise<never> {
  const { data, error } = await supabase.from(table).select("id, version").eq("id", id).maybeSingle();

  if (error) {
    throw new NutritionAdapterError(`No se pudo diagnosticar por qué no se actualizó la fila ${id} de ${table}.`, error);
  }
  if (!data) {
    throw new NutritionAdapterError(`La fila ${id} de ${table} no existe o no tenés permiso para acceder a ella.`);
  }
  if (!isPlainObject(data) || typeof data.id !== "string" || !Number.isSafeInteger(data.version) || (data.version as number) < 1) {
    throw new NutritionAdapterError(`Supabase devolvió una fila de ${table} con forma inesperada al diagnosticar ${id}.`);
  }

  // Coincida o no la version, el resultado es el mismo: un UPDATE que no
  // afectó ninguna fila nunca se confirma como aplicado — se reporta
  // siempre como conflicto (mismo criterio que routines.ts).
  throw new NutritionConflictError(id, expectedVersion);
}

/** Único punto que hace UPDATE sobre cualquiera de las 3 tablas — filtra siempre por `id` + `version = expectedVersion`. */
async function applyOptimisticUpdate<T>(
  supabase: SupabaseClient,
  table: string,
  id: string,
  expectedVersion: number,
  patch: Record<string, unknown>,
  parseRow: (raw: unknown) => T
): Promise<T> {
  assertValidExpectedVersion(expectedVersion);

  const { data, error } = await supabase
    .from(table)
    .update(patch)
    .eq("id", id)
    .eq("version", expectedVersion)
    .select("*")
    .maybeSingle();

  if (error) {
    throw new NutritionAdapterError(`No se pudo actualizar la fila ${id} de ${table}.`, error);
  }

  if (!data) {
    await diagnoseUpdateFailure(supabase, table, id, expectedVersion);
    throw new NutritionConflictError(id, expectedVersion);
  }

  return parseRow(data as unknown);
}

/* ------------------------------------------------------------------ */
/* 1. Perfil nutricional (nutrition_profiles)                          */
/* ------------------------------------------------------------------ */

/** El perfil de `athleteId`, o `null` si todavía no tiene ninguno guardado en la nube. */
export async function getNutritionProfileRow(supabase: SupabaseClient, athleteId: string): Promise<NutritionProfileRow | null> {
  const { data, error } = await supabase
    .from(NUTRITION_PROFILES_TABLE)
    .select("*")
    .eq("athlete_id", athleteId)
    .maybeSingle();

  if (error) {
    throw new NutritionAdapterError(`No se pudo leer el perfil nutricional de athlete_id=${athleteId}.`, error);
  }
  if (!data) return null;
  return parseNutritionProfileRow(data as unknown);
}

/** Inserta el perfil de `athleteId`. `unique(athlete_id)` en 0005 rechaza un segundo INSERT si ya existía uno — quien llama debe usar `updateNutritionProfilePayload` en ese caso. */
export async function createNutritionProfileRow(
  supabase: SupabaseClient,
  athleteId: string,
  payload: NutritionProfile
): Promise<NutritionProfileRow> {
  if (!isNutritionProfilePayload(payload)) {
    throw new NutritionPayloadValidationError("El payload a crear no respeta la forma de NutritionProfile (lib/mock/types.ts).");
  }

  const { data, error } = await supabase
    .from(NUTRITION_PROFILES_TABLE)
    .insert({ athlete_id: athleteId, payload })
    .select("*")
    .single();

  if (error) {
    throw new NutritionAdapterError(`No se pudo crear el perfil nutricional para athlete_id=${athleteId}.`, error);
  }
  return parseNutritionProfileRow(data as unknown);
}

export async function updateNutritionProfilePayload(
  supabase: SupabaseClient,
  id: string,
  expectedVersion: number,
  payload: NutritionProfile
): Promise<NutritionProfileRow> {
  if (!isNutritionProfilePayload(payload)) {
    throw new NutritionPayloadValidationError("El payload a actualizar no respeta la forma de NutritionProfile (lib/mock/types.ts).");
  }
  return applyOptimisticUpdate(supabase, NUTRITION_PROFILES_TABLE, id, expectedVersion, { payload }, parseNutritionProfileRow);
}

/* ------------------------------------------------------------------ */
/* 2. Planificación semanal (nutrition_weekly_plans)                   */
/* ------------------------------------------------------------------ */

/** La planificación semanal de `athleteId`, o `null` si todavía no tiene ninguna guardada en la nube. */
export async function getWeeklyMealPlanRow(supabase: SupabaseClient, athleteId: string): Promise<WeeklyMealPlanRow | null> {
  const { data, error } = await supabase
    .from(NUTRITION_WEEKLY_PLANS_TABLE)
    .select("*")
    .eq("athlete_id", athleteId)
    .maybeSingle();

  if (error) {
    throw new NutritionAdapterError(`No se pudo leer la planificación semanal de athlete_id=${athleteId}.`, error);
  }
  if (!data) return null;
  return parseWeeklyMealPlanRow(data as unknown);
}

/** Inserta la planificación semanal de `athleteId`. `unique(athlete_id)` en 0005 rechaza un segundo INSERT si ya existía una. */
export async function createWeeklyMealPlanRow(
  supabase: SupabaseClient,
  athleteId: string,
  payload: WeeklyMealPlan
): Promise<WeeklyMealPlanRow> {
  if (!isWeeklyMealPlanPayload(payload)) {
    throw new NutritionPayloadValidationError("El payload a crear no respeta la forma de WeeklyMealPlan (lib/mock/types.ts).");
  }

  const { data, error } = await supabase
    .from(NUTRITION_WEEKLY_PLANS_TABLE)
    .insert({ athlete_id: athleteId, payload })
    .select("*")
    .single();

  if (error) {
    throw new NutritionAdapterError(`No se pudo crear la planificación semanal para athlete_id=${athleteId}.`, error);
  }
  return parseWeeklyMealPlanRow(data as unknown);
}

export async function updateWeeklyMealPlanPayload(
  supabase: SupabaseClient,
  id: string,
  expectedVersion: number,
  payload: WeeklyMealPlan
): Promise<WeeklyMealPlanRow> {
  if (!isWeeklyMealPlanPayload(payload)) {
    throw new NutritionPayloadValidationError("El payload a actualizar no respeta la forma de WeeklyMealPlan (lib/mock/types.ts).");
  }
  return applyOptimisticUpdate(supabase, NUTRITION_WEEKLY_PLANS_TABLE, id, expectedVersion, { payload }, parseWeeklyMealPlanRow);
}

/* ------------------------------------------------------------------ */
/* 3. Registro diario de comidas (nutrition_daily_logs)                 */
/* ------------------------------------------------------------------ */

/** El registro de `athleteId` para `logDate` (`YYYY-MM-DD`), o `null` si ese día todavía no tiene nada guardado en la nube. */
export async function getNutritionDailyLogRow(
  supabase: SupabaseClient,
  athleteId: string,
  logDate: string
): Promise<NutritionDailyLogRow | null> {
  assertValidLogDate(logDate);

  const { data, error } = await supabase
    .from(NUTRITION_DAILY_LOGS_TABLE)
    .select("*")
    .eq("athlete_id", athleteId)
    .eq("log_date", logDate)
    .maybeSingle();

  if (error) {
    throw new NutritionAdapterError(`No se pudo leer el registro diario de athlete_id=${athleteId} (${logDate}).`, error);
  }
  if (!data) return null;
  return parseNutritionDailyLogRow(data as unknown);
}

/** Todos los registros diarios de `athleteId`, más reciente primero — pensado para el futuro importador/sincronización, no para traer un solo día. */
export async function listNutritionDailyLogRows(supabase: SupabaseClient, athleteId: string): Promise<NutritionDailyLogRow[]> {
  const { data, error } = await supabase
    .from(NUTRITION_DAILY_LOGS_TABLE)
    .select("*")
    .eq("athlete_id", athleteId)
    .order("log_date", { ascending: false });

  if (error) {
    throw new NutritionAdapterError(`No se pudieron listar los registros diarios de athlete_id=${athleteId}.`, error);
  }
  return ((data ?? []) as unknown[]).map(parseNutritionDailyLogRow);
}

/** Inserta el registro de `athleteId` para `logDate`. `unique(athlete_id, log_date)` en 0005 rechaza un segundo INSERT para el mismo día. */
export async function createNutritionDailyLogRow(
  supabase: SupabaseClient,
  athleteId: string,
  logDate: string,
  payload: MealCompletionLog[]
): Promise<NutritionDailyLogRow> {
  assertValidLogDate(logDate);
  if (!isMealCompletionLogArray(payload)) {
    throw new NutritionPayloadValidationError("El payload a crear no respeta la forma de MealCompletionLog[] (lib/mock/types.ts).");
  }

  const { data, error } = await supabase
    .from(NUTRITION_DAILY_LOGS_TABLE)
    .insert({ athlete_id: athleteId, log_date: logDate, payload })
    .select("*")
    .single();

  if (error) {
    throw new NutritionAdapterError(`No se pudo crear el registro diario de athlete_id=${athleteId} (${logDate}).`, error);
  }
  return parseNutritionDailyLogRow(data as unknown);
}

export async function updateNutritionDailyLogPayload(
  supabase: SupabaseClient,
  id: string,
  expectedVersion: number,
  payload: MealCompletionLog[]
): Promise<NutritionDailyLogRow> {
  if (!isMealCompletionLogArray(payload)) {
    throw new NutritionPayloadValidationError("El payload a actualizar no respeta la forma de MealCompletionLog[] (lib/mock/types.ts).");
  }
  return applyOptimisticUpdate(supabase, NUTRITION_DAILY_LOGS_TABLE, id, expectedVersion, { payload }, parseNutritionDailyLogRow);
}
