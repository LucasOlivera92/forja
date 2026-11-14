import type { SupabaseClient } from "@supabase/supabase-js";
import type { DaySession, RoutineExecution, SetEntry, WorkoutExerciseLog } from "@/lib/mock/types";

/**
 * Sprint 7.2 — Adaptador tipado de `public.workout_sessions` y
 * `public.workout_executions` (ver `supabase/migrations/0006_workout_logs.sql`).
 *
 * Mismo criterio de aislamiento que `lib/cloud/nutrition.ts`: recibe un
 * `SupabaseClient` ya armado (nunca crea clientes ni lee credenciales; la
 * garantía de "nunca service_role" es de quien lo construye), valida en
 * runtime todo lo que entra o sale porque el proyecto no usa tipos de
 * Database generados, y deja la seguridad de fondo a RLS. Ninguna pantalla
 * lo usa todavía.
 */

const WORKOUT_SESSIONS_TABLE = "workout_sessions";
const WORKOUT_EXECUTIONS_TABLE = "workout_executions";

/* ------------------------------------------------------------------ */
/* Filas                                                               */
/* ------------------------------------------------------------------ */

interface CommonAuditColumns {
  id: string;
  athlete_id: string;
  created_by: string | null;
  updated_by: string | null;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface WorkoutSessionRow extends CommonAuditColumns {
  routine_id: string;
  week_id: string;
  day_id: string;
  /** `YYYY-MM-DD` del primer registro de la sesión, o `null` si todavía no tiene. */
  session_date: string | null;
  payload: DaySession;
}

export interface WorkoutExecutionRow extends CommonAuditColumns {
  routine_id: string;
  week_id: string;
  execution_id: string;
  execution_number: number;
  completed_at: string;
  payload: RoutineExecution;
}

/* ------------------------------------------------------------------ */
/* Errores de dominio                                                  */
/* ------------------------------------------------------------------ */

/** Un UPDATE optimista no afectó ninguna fila porque `version` ya no coincidía. */
export class WorkoutConflictError extends Error {
  constructor(
    public readonly rowId: string,
    public readonly expectedVersion: number
  ) {
    super(
      `Conflicto de edición: la fila ${rowId} ya no está en version ${expectedVersion}. ` +
        `Alguien más la modificó mientras tanto — hay que releerla antes de reintentar.`
    );
    this.name = "WorkoutConflictError";
  }
}

export class WorkoutPayloadValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WorkoutPayloadValidationError";
  }
}

export class WorkoutAdapterError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = "WorkoutAdapterError";
  }
}

/* ------------------------------------------------------------------ */
/* Validación en runtime                                               */
/* ------------------------------------------------------------------ */

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isNullableFiniteNumber(value: unknown): value is number | null {
  return value === null || isFiniteNumber(value);
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function isSetEntry(value: unknown): value is SetEntry {
  if (!isPlainObject(value)) return false;
  return (
    isFiniteNumber(value.setNumber) &&
    isNullableFiniteNumber(value.reps) &&
    isNullableFiniteNumber(value.weight) &&
    typeof value.done === "boolean"
  );
}

function isWorkoutExerciseLog(value: unknown): value is WorkoutExerciseLog {
  if (!isPlainObject(value)) return false;
  return typeof value.exerciseId === "string" && Array.isArray(value.sets) && value.sets.every(isSetEntry);
}

/** Type guard público — misma forma que `DaySession` (lib/mock/types.ts). */
export function isDaySessionPayload(value: unknown): value is DaySession {
  if (!isPlainObject(value)) return false;
  return (
    typeof value.routineId === "string" &&
    typeof value.weekId === "string" &&
    typeof value.dayId === "string" &&
    isNullableString(value.date) &&
    isNullableString(value.startedAt) &&
    isNullableString(value.finishedAt) &&
    Array.isArray(value.exercises) &&
    value.exercises.every(isWorkoutExerciseLog)
  );
}

/** Type guard público — misma forma que `RoutineExecution` (lib/mock/types.ts). */
export function isRoutineExecutionPayload(value: unknown): value is RoutineExecution {
  if (!isPlainObject(value)) return false;
  return (
    typeof value.id === "string" &&
    typeof value.routineId === "string" &&
    typeof value.weekId === "string" &&
    Number.isSafeInteger(value.executionNumber) &&
    (value.executionNumber as number) >= 1 &&
    typeof value.completedAt === "string" &&
    Array.isArray(value.sessions) &&
    value.sessions.every(isDaySessionPayload)
  );
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isValidSessionDate(value: unknown): value is string | null {
  return value === null || (typeof value === "string" && DATE_PATTERN.test(value));
}

/**
 * Fecha de sesión para la columna `session_date`: `DaySession.date` si es
 * `YYYY-MM-DD`, si no `null` (nunca se manda una fecha mal formada a Postgres).
 */
function sessionDateOf(payload: DaySession): string | null {
  return payload.date !== null && DATE_PATTERN.test(payload.date) ? payload.date : null;
}

function parseCommonAuditColumns(raw: Record<string, unknown>, tableLabel: string): CommonAuditColumns {
  const { id, athlete_id, created_by, updated_by, version, created_at, updated_at } = raw;

  const valid =
    typeof id === "string" &&
    typeof athlete_id === "string" &&
    Number.isSafeInteger(version) &&
    (version as number) >= 1 &&
    typeof created_at === "string" &&
    typeof updated_at === "string" &&
    isNullableString(created_by) &&
    isNullableString(updated_by);

  if (!valid) {
    throw new WorkoutAdapterError(`Supabase devolvió una fila de ${tableLabel} con columnas de forma inesperada.`);
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

function parseWorkoutSessionRow(raw: unknown): WorkoutSessionRow {
  if (!isPlainObject(raw)) {
    throw new WorkoutAdapterError("Supabase devolvió una fila de workout_sessions con forma inesperada (no es un objeto).");
  }
  const common = parseCommonAuditColumns(raw, "workout_sessions");
  const { routine_id, week_id, day_id, session_date, payload } = raw;

  if (typeof routine_id !== "string" || typeof week_id !== "string" || typeof day_id !== "string") {
    throw new WorkoutAdapterError(`La fila de workout_sessions ${common.id} tiene identidad con forma inesperada.`);
  }
  if (!isValidSessionDate(session_date)) {
    throw new WorkoutAdapterError(`La fila de workout_sessions ${common.id} tiene session_date con forma inesperada.`);
  }
  if (!isDaySessionPayload(payload)) {
    throw new WorkoutPayloadValidationError(
      `La fila de workout_sessions ${common.id} tiene un payload que no respeta la forma de DaySession (lib/mock/types.ts).`
    );
  }
  // El payload es la fuente de verdad de "qué día es"; las columnas son su clave de unicidad.
  if (payload.routineId !== routine_id || payload.weekId !== week_id || payload.dayId !== day_id) {
    throw new WorkoutPayloadValidationError(
      `La fila de workout_sessions ${common.id} tiene identidad inconsistente entre columnas y payload.`
    );
  }
  return { ...common, routine_id, week_id, day_id, session_date, payload };
}

function parseWorkoutExecutionRow(raw: unknown): WorkoutExecutionRow {
  if (!isPlainObject(raw)) {
    throw new WorkoutAdapterError("Supabase devolvió una fila de workout_executions con forma inesperada (no es un objeto).");
  }
  const common = parseCommonAuditColumns(raw, "workout_executions");
  const { routine_id, week_id, execution_id, execution_number, completed_at, payload } = raw;

  if (
    typeof routine_id !== "string" ||
    typeof week_id !== "string" ||
    typeof execution_id !== "string" ||
    !Number.isSafeInteger(execution_number) ||
    (execution_number as number) < 1 ||
    typeof completed_at !== "string"
  ) {
    throw new WorkoutAdapterError(`La fila de workout_executions ${common.id} tiene columnas con forma inesperada.`);
  }
  if (!isRoutineExecutionPayload(payload)) {
    throw new WorkoutPayloadValidationError(
      `La fila de workout_executions ${common.id} tiene un payload que no respeta la forma de RoutineExecution (lib/mock/types.ts).`
    );
  }
  if (payload.id !== execution_id || payload.routineId !== routine_id || payload.weekId !== week_id) {
    throw new WorkoutPayloadValidationError(
      `La fila de workout_executions ${common.id} tiene identidad inconsistente entre columnas y payload.`
    );
  }
  return {
    ...common,
    routine_id,
    week_id,
    execution_id,
    execution_number: execution_number as number,
    completed_at,
    payload,
  };
}

/* ------------------------------------------------------------------ */
/* Control optimista compartido                                        */
/* ------------------------------------------------------------------ */

function assertValidExpectedVersion(expectedVersion: number): void {
  if (!Number.isSafeInteger(expectedVersion) || expectedVersion < 1) {
    throw new WorkoutPayloadValidationError(
      `expectedVersion tiene que ser un entero seguro >= 1 (recibido: ${expectedVersion}).`
    );
  }
}

/** Segunda lectura mínima (`id, version`, nunca `payload`) para distinguir conflicto de fila invisible bajo RLS, sin revelar cuál fue. */
async function diagnoseUpdateFailure(
  supabase: SupabaseClient,
  table: string,
  id: string,
  expectedVersion: number
): Promise<never> {
  const { data, error } = await supabase.from(table).select("id, version").eq("id", id).maybeSingle();

  if (error) {
    throw new WorkoutAdapterError(`No se pudo diagnosticar por qué no se actualizó la fila ${id} de ${table}.`, error);
  }
  if (!data) {
    throw new WorkoutAdapterError(`La fila ${id} de ${table} no existe o no tenés permiso para acceder a ella.`);
  }
  if (!isPlainObject(data) || typeof data.id !== "string" || !Number.isSafeInteger(data.version) || (data.version as number) < 1) {
    throw new WorkoutAdapterError(`Supabase devolvió una fila de ${table} con forma inesperada al diagnosticar ${id}.`);
  }
  throw new WorkoutConflictError(id, expectedVersion);
}

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
    throw new WorkoutAdapterError(`No se pudo actualizar la fila ${id} de ${table}.`, error);
  }
  if (!data) {
    await diagnoseUpdateFailure(supabase, table, id, expectedVersion);
    throw new WorkoutConflictError(id, expectedVersion);
  }
  return parseRow(data as unknown);
}

/* ------------------------------------------------------------------ */
/* 1. Sesiones en vivo (workout_sessions)                               */
/* ------------------------------------------------------------------ */

/** La sesión de `athleteId` para ese día de rutina, o `null` si todavía no existe en la nube. */
export async function getWorkoutSessionRow(
  supabase: SupabaseClient,
  athleteId: string,
  routineId: string,
  weekId: string,
  dayId: string
): Promise<WorkoutSessionRow | null> {
  const { data, error } = await supabase
    .from(WORKOUT_SESSIONS_TABLE)
    .select("*")
    .eq("athlete_id", athleteId)
    .eq("routine_id", routineId)
    .eq("week_id", weekId)
    .eq("day_id", dayId)
    .maybeSingle();

  if (error) {
    throw new WorkoutAdapterError(`No se pudo leer la sesión (${routineId}/${weekId}/${dayId}) de athlete_id=${athleteId}.`, error);
  }
  if (!data) return null;
  return parseWorkoutSessionRow(data as unknown);
}

/** Todas las sesiones de `athleteId`, la más reciente primero. */
export async function listWorkoutSessionRows(supabase: SupabaseClient, athleteId: string): Promise<WorkoutSessionRow[]> {
  const { data, error } = await supabase
    .from(WORKOUT_SESSIONS_TABLE)
    .select("*")
    .eq("athlete_id", athleteId)
    .order("updated_at", { ascending: false });

  if (error) {
    throw new WorkoutAdapterError(`No se pudieron listar las sesiones de athlete_id=${athleteId}.`, error);
  }
  return ((data ?? []) as unknown[]).map(parseWorkoutSessionRow);
}

/** Inserta la sesión; la identidad sale del propio payload (nunca de parámetros sueltos que puedan desalinearse). */
export async function createWorkoutSessionRow(
  supabase: SupabaseClient,
  athleteId: string,
  payload: DaySession
): Promise<WorkoutSessionRow> {
  if (!isDaySessionPayload(payload)) {
    throw new WorkoutPayloadValidationError("El payload a crear no respeta la forma de DaySession (lib/mock/types.ts).");
  }
  if ([payload.routineId, payload.weekId, payload.dayId].some((part) => part.trim().length === 0)) {
    throw new WorkoutPayloadValidationError("routineId, weekId y dayId no pueden estar vacíos.");
  }

  const { data, error } = await supabase
    .from(WORKOUT_SESSIONS_TABLE)
    .insert({
      athlete_id: athleteId,
      routine_id: payload.routineId,
      week_id: payload.weekId,
      day_id: payload.dayId,
      session_date: sessionDateOf(payload),
      payload,
    })
    .select("*")
    .single();

  if (error) {
    throw new WorkoutAdapterError(
      `No se pudo crear la sesión (${payload.routineId}/${payload.weekId}/${payload.dayId}) para athlete_id=${athleteId}.`,
      error
    );
  }
  return parseWorkoutSessionRow(data as unknown);
}

/** Actualiza el payload; la identidad (rutina/semana/día) es inmutable en el trigger, así que un payload de otro día se rechaza antes de tocar la base. */
export async function updateWorkoutSessionPayload(
  supabase: SupabaseClient,
  row: Pick<WorkoutSessionRow, "id" | "version" | "routine_id" | "week_id" | "day_id">,
  payload: DaySession
): Promise<WorkoutSessionRow> {
  if (!isDaySessionPayload(payload)) {
    throw new WorkoutPayloadValidationError("El payload a actualizar no respeta la forma de DaySession (lib/mock/types.ts).");
  }
  if (payload.routineId !== row.routine_id || payload.weekId !== row.week_id || payload.dayId !== row.day_id) {
    throw new WorkoutPayloadValidationError("El payload pertenece a otro día de rutina que la fila a actualizar.");
  }
  return applyOptimisticUpdate(
    supabase,
    WORKOUT_SESSIONS_TABLE,
    row.id,
    row.version,
    { payload, session_date: sessionDateOf(payload) },
    parseWorkoutSessionRow
  );
}

/* ------------------------------------------------------------------ */
/* 2. Ejecuciones archivadas (workout_executions)                       */
/* ------------------------------------------------------------------ */

export async function getWorkoutExecutionRow(
  supabase: SupabaseClient,
  athleteId: string,
  executionId: string
): Promise<WorkoutExecutionRow | null> {
  const { data, error } = await supabase
    .from(WORKOUT_EXECUTIONS_TABLE)
    .select("*")
    .eq("athlete_id", athleteId)
    .eq("execution_id", executionId)
    .maybeSingle();

  if (error) {
    throw new WorkoutAdapterError(`No se pudo leer la ejecución ${executionId} de athlete_id=${athleteId}.`, error);
  }
  if (!data) return null;
  return parseWorkoutExecutionRow(data as unknown);
}

/** Todas las ejecuciones de `athleteId`, la más reciente primero. */
export async function listWorkoutExecutionRows(supabase: SupabaseClient, athleteId: string): Promise<WorkoutExecutionRow[]> {
  const { data, error } = await supabase
    .from(WORKOUT_EXECUTIONS_TABLE)
    .select("*")
    .eq("athlete_id", athleteId)
    .order("completed_at", { ascending: false });

  if (error) {
    throw new WorkoutAdapterError(`No se pudieron listar las ejecuciones de athlete_id=${athleteId}.`, error);
  }
  return ((data ?? []) as unknown[]).map(parseWorkoutExecutionRow);
}

export async function createWorkoutExecutionRow(
  supabase: SupabaseClient,
  athleteId: string,
  payload: RoutineExecution
): Promise<WorkoutExecutionRow> {
  if (!isRoutineExecutionPayload(payload)) {
    throw new WorkoutPayloadValidationError("El payload a crear no respeta la forma de RoutineExecution (lib/mock/types.ts).");
  }
  if ([payload.id, payload.routineId, payload.weekId].some((part) => part.trim().length === 0)) {
    throw new WorkoutPayloadValidationError("id, routineId y weekId de la ejecución no pueden estar vacíos.");
  }
  if (Number.isNaN(Date.parse(payload.completedAt))) {
    throw new WorkoutPayloadValidationError("completedAt de la ejecución no es una fecha válida.");
  }

  const { data, error } = await supabase
    .from(WORKOUT_EXECUTIONS_TABLE)
    .insert({
      athlete_id: athleteId,
      routine_id: payload.routineId,
      week_id: payload.weekId,
      execution_id: payload.id,
      execution_number: payload.executionNumber,
      completed_at: payload.completedAt,
      payload,
    })
    .select("*")
    .single();

  if (error) {
    throw new WorkoutAdapterError(`No se pudo crear la ejecución ${payload.id} para athlete_id=${athleteId}.`, error);
  }
  return parseWorkoutExecutionRow(data as unknown);
}
