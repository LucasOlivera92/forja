import type { SupabaseClient } from "@supabase/supabase-js";
import type { SleepLog, SleepQuality } from "@/lib/mock/types";

/**
 * Sprint 8.0 — Adaptador tipado de `public.sleep_logs` (ver
 * `supabase/migrations/0007_sleep_logs.sql`). Mismo criterio que
 * `lib/cloud/nutrition.ts`: recibe un `SupabaseClient` ya armado (nunca crea
 * clientes ni lee credenciales; "nunca service_role" es responsabilidad de
 * quien lo construye), valida en runtime todo lo que entra o sale, y deja la
 * seguridad de fondo a RLS.
 */

const SLEEP_LOGS_TABLE = "sleep_logs";

export interface SleepLogRow {
  id: string;
  athlete_id: string;
  /** `YYYY-MM-DD`: el día en que la persona se despertó. */
  log_date: string;
  hours: number;
  quality: SleepQuality;
  payload: SleepLog;
  created_by: string | null;
  updated_by: string | null;
  version: number;
  created_at: string;
  updated_at: string;
}

export class SleepConflictError extends Error {
  constructor(
    public readonly rowId: string,
    public readonly expectedVersion: number
  ) {
    super(`Conflicto de edición: la fila ${rowId} ya no está en version ${expectedVersion}.`);
    this.name = "SleepConflictError";
  }
}

export class SleepPayloadValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SleepPayloadValidationError";
  }
}

export class SleepAdapterError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = "SleepAdapterError";
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const SLEEP_QUALITIES: readonly SleepQuality[] = ["mal", "regular", "bien"];
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isSleepQuality(value: unknown): value is SleepQuality {
  return typeof value === "string" && (SLEEP_QUALITIES as readonly string[]).includes(value);
}

/** Type guard público — misma forma que `SleepLog` (lib/mock/types.ts), con horas en (0, 24] y fecha `YYYY-MM-DD`. */
export function isSleepLogPayload(value: unknown): value is SleepLog {
  if (!isPlainObject(value)) return false;
  return (
    typeof value.date === "string" &&
    DATE_PATTERN.test(value.date) &&
    typeof value.hours === "number" &&
    Number.isFinite(value.hours) &&
    value.hours > 0 &&
    value.hours <= 24 &&
    isSleepQuality(value.quality) &&
    typeof value.loggedAt === "string"
  );
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function parseSleepLogRow(raw: unknown): SleepLogRow {
  if (!isPlainObject(raw)) {
    throw new SleepAdapterError("Supabase devolvió una fila de sleep_logs con forma inesperada (no es un objeto).");
  }
  const { id, athlete_id, log_date, hours, quality, payload, created_by, updated_by, version, created_at, updated_at } = raw;

  // `numeric` puede llegar como número o como string según el driver.
  const hoursNumber = typeof hours === "string" ? Number(hours) : hours;

  const valid =
    typeof id === "string" &&
    typeof athlete_id === "string" &&
    typeof log_date === "string" &&
    typeof hoursNumber === "number" &&
    Number.isFinite(hoursNumber) &&
    hoursNumber > 0 &&
    hoursNumber <= 24 &&
    isSleepQuality(quality) &&
    Number.isSafeInteger(version) &&
    (version as number) >= 1 &&
    typeof created_at === "string" &&
    typeof updated_at === "string" &&
    isNullableString(created_by) &&
    isNullableString(updated_by);

  if (!valid) {
    throw new SleepAdapterError("Supabase devolvió una fila de sleep_logs con columnas de forma inesperada.");
  }
  if (!isSleepLogPayload(payload)) {
    throw new SleepPayloadValidationError(`La fila de sleep_logs ${id} tiene un payload que no respeta la forma de SleepLog.`);
  }
  if (payload.date !== log_date || payload.hours !== hoursNumber || payload.quality !== quality) {
    throw new SleepPayloadValidationError(
      `La fila de sleep_logs ${id} tiene datos inconsistentes entre sus columnas y el payload.`
    );
  }

  return {
    id,
    athlete_id,
    log_date,
    hours: hoursNumber,
    quality,
    payload,
    created_by,
    updated_by,
    version: version as number,
    created_at,
    updated_at,
  };
}

/** El registro de `athleteId` para esa noche, o `null` si todavía no existe en la nube. */
export async function getSleepLogRow(supabase: SupabaseClient, athleteId: string, logDate: string): Promise<SleepLogRow | null> {
  if (!DATE_PATTERN.test(logDate)) {
    throw new SleepPayloadValidationError(`log_date tiene que tener el formato YYYY-MM-DD (recibido: "${logDate}").`);
  }
  const { data, error } = await supabase
    .from(SLEEP_LOGS_TABLE)
    .select("*")
    .eq("athlete_id", athleteId)
    .eq("log_date", logDate)
    .maybeSingle();

  if (error) {
    throw new SleepAdapterError(`No se pudo leer el sueño de athlete_id=${athleteId} (${logDate}).`, error);
  }
  if (!data) return null;
  return parseSleepLogRow(data as unknown);
}

/** Todos los registros de `athleteId`, el más reciente primero. */
export async function listSleepLogRows(supabase: SupabaseClient, athleteId: string): Promise<SleepLogRow[]> {
  const { data, error } = await supabase
    .from(SLEEP_LOGS_TABLE)
    .select("*")
    .eq("athlete_id", athleteId)
    .order("log_date", { ascending: false });

  if (error) {
    throw new SleepAdapterError(`No se pudieron listar los registros de sueño de athlete_id=${athleteId}.`, error);
  }
  return ((data ?? []) as unknown[]).map(parseSleepLogRow);
}

/** Inserta una noche; `log_date`, `hours` y `quality` salen del propio payload (nunca de parámetros sueltos que puedan desalinearse). */
export async function createSleepLogRow(supabase: SupabaseClient, athleteId: string, payload: SleepLog): Promise<SleepLogRow> {
  if (!isSleepLogPayload(payload)) {
    throw new SleepPayloadValidationError("El payload a crear no respeta la forma de SleepLog (lib/mock/types.ts).");
  }
  const { data, error } = await supabase
    .from(SLEEP_LOGS_TABLE)
    .insert({
      athlete_id: athleteId,
      log_date: payload.date,
      hours: payload.hours,
      quality: payload.quality,
      payload,
    })
    .select("*")
    .single();

  if (error) {
    throw new SleepAdapterError(`No se pudo crear el registro de sueño de athlete_id=${athleteId} (${payload.date}).`, error);
  }
  return parseSleepLogRow(data as unknown);
}

/** Actualiza una noche con control optimista de `version`; la fecha es inmutable (trigger), así que un payload de otra noche se rechaza antes de tocar la base. */
export async function updateSleepLogPayload(
  supabase: SupabaseClient,
  row: Pick<SleepLogRow, "id" | "version" | "log_date">,
  payload: SleepLog
): Promise<SleepLogRow> {
  if (!isSleepLogPayload(payload)) {
    throw new SleepPayloadValidationError("El payload a actualizar no respeta la forma de SleepLog (lib/mock/types.ts).");
  }
  if (payload.date !== row.log_date) {
    throw new SleepPayloadValidationError("El payload pertenece a otra noche que la fila a actualizar.");
  }
  if (!Number.isSafeInteger(row.version) || row.version < 1) {
    throw new SleepPayloadValidationError(`expectedVersion tiene que ser un entero seguro >= 1 (recibido: ${row.version}).`);
  }

  const { data, error } = await supabase
    .from(SLEEP_LOGS_TABLE)
    .update({ hours: payload.hours, quality: payload.quality, payload })
    .eq("id", row.id)
    .eq("version", row.version)
    .select("*")
    .maybeSingle();

  if (error) {
    throw new SleepAdapterError(`No se pudo actualizar el registro de sueño ${row.id}.`, error);
  }
  if (!data) {
    // 0 filas: conflicto de version o fila invisible bajo RLS — no se distingue a propósito (no filtrar existencia ajena).
    throw new SleepConflictError(row.id, row.version);
  }
  return parseSleepLogRow(data as unknown);
}
