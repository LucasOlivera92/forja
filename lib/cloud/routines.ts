import type { SupabaseClient } from "@supabase/supabase-js";
import type { ExercisePrescription, Routine, RoutineDayPlan, RoutineSplitCategory, RoutineWeek } from "@/lib/mock/types";

/**
 * Sprint 6.6 — Adaptador tipado de `public.routines` (Supabase).
 *
 * Capa AISLADA a propósito: no importa nada de `lib/mock/repository.ts`
 * (que sigue siendo, sin cambios, la única fuente de datos real de
 * Entreno/Nutrición vía localStorage) y ninguna pantalla la usa todavía.
 * Este archivo solo sabe leer/escribir filas de `public.routines` tal
 * como quedó definida en `supabase/migrations/0003_routines.sql` — nada
 * más. Conectarla a la UI (y decidir cuándo leer/escribir acá en vez de
 * localStorage) es explícitamente trabajo de un sprint futuro.
 *
 * No crea su propio cliente de Supabase: cada función recibe un
 * `SupabaseClient` ya armado (browser o server, ver `lib/supabase/`) como
 * parámetro. Este archivo en sí no crea ni importa credenciales
 * `service_role` — ninguna función de acá instancia un cliente propio ni
 * lee ninguna key. Pero como el cliente lo arma quien llama, la garantía
 * de seguridad no es del adaptador: es responsabilidad de quien lo invoque
 * (el próximo sprint que lo conecte a la UI) pasar siempre el cliente
 * normal autenticado del usuario — el mismo `createClient()` de
 * `lib/supabase/client.ts`/`server.ts`, con `SUPABASE_ANON_KEY` y la
 * sesión del usuario — y nunca un cliente armado con la `service_role`
 * key. Si alguna vez se le pasara un cliente `service_role`, RLS dejaría
 * de aplicarse y las policies de 0003 no protegerían nada — el adaptador
 * no tiene forma de detectar ni impedir eso desde acá. Es responsabilidad
 * de quien llama, además, resolver `createClient()` y chequear que no sea
 * `null` (modo demo, ver `lib/supabase/env.ts`) antes de usar cualquier
 * función de acá.
 *
 * La seguridad de fondo (quién puede leer/crear/editar qué fila) la
 * deciden por completo las 9 policies RLS de `public.routines` — este
 * adaptador no duplica esa lógica de autorización en JS/TS. Si Postgres
 * rechaza una operación (alumno intentando tocar una rutina ajena, coach
 * sin vínculo activo, etc.), el `error` de supabase-js sencillamente llega
 * envuelto en `RoutineAdapterError`.
 */

/**
 * Espejo 1:1 de una fila de `public.routines` — mismos nombres de columna
 * que la tabla real (snake_case), mismo criterio que ya usan `Profile` y
 * `CoachStudent` en `lib/auth/types.ts` para sus propias tablas.
 */
export interface RoutineRow {
  id: string;
  athlete_id: string;
  local_id: string;
  /** Estructura completa de la rutina — ver `Routine` en lib/mock/types.ts. Validada en runtime, nunca asumida. */
  payload: Routine;
  /** `null` si quien la creó/editó era una cuenta que ya se borró (`on delete set null`, ver 0003). */
  created_by: string | null;
  updated_by: string | null;
  version: number;
  created_at: string;
  updated_at: string;
  /** `null` = activa. Con fecha = archivada (borrado lógico, nunca físico). */
  archived_at: string | null;
}

const ROUTINES_TABLE = "routines";

/* ------------------------------------------------------------------ */
/* Errores de dominio                                                  */
/* ------------------------------------------------------------------ */

/**
 * Se lanza cuando un UPDATE (edición, archivar o restaurar — las tres
 * pasan por el mismo control optimista) no afectó ninguna fila porque
 * `version` ya no coincidía: otra sesión (el coach, el alumno desde otro
 * dispositivo, etc.) modificó la rutina entre que se leyó y que se quiso
 * guardar. Es un conflicto esperable, no una falla — quien llama debe
 * volver a leer la rutina (nueva `version` incluida) y decidir cómo
 * resolverlo (pedirle confirmación al usuario, reintentar, etc.).
 */
export class RoutineConflictError extends Error {
  constructor(
    public readonly routineId: string,
    public readonly expectedVersion: number
  ) {
    super(
      `Conflicto de edición: la rutina ${routineId} ya no está en version ${expectedVersion}. ` +
        `Alguien más la modificó, archivó o restauró mientras tanto — hay que releerla antes de reintentar.`
    );
    this.name = "RoutineConflictError";
  }
}

/** Se lanza cuando un `payload` (para escribir, o el que devolvió Supabase) no tiene la forma de `Routine`. */
export class RoutinePayloadValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RoutinePayloadValidationError";
  }
}

/** Cualquier otro error de Supabase (red, RLS, columnas inesperadas) — envuelve el error original en `cause`. */
export class RoutineAdapterError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = "RoutineAdapterError";
  }
}

/* ------------------------------------------------------------------ */
/* Validación en runtime — nunca confiar a ciegas en lo que va y viene  */
/* ------------------------------------------------------------------ */
// El proyecto no tiene tipos de Database generados para supabase-js (ver
// lib/supabase/client.ts / server.ts, ambos sin genérico), así que
// `.select()`/`.insert()`/`.update()` devuelven datos sin tipar. En vez de
// asumir el tipo con `as Routine`/`as any`, todo lo que entra o sale de
// Supabase pasa por estos guards antes de tratarse como `Routine` o
// `RoutineRow` — así "Validar que payload represente el tipo Routine
// existente" se cumple tanto al escribir como al leer.

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * `typeof value === "number"` por sí solo acepta `NaN` e `Infinity`, que
 * no son JSON válido (`JSON.stringify` los convierte en `null`, así que
 * un payload con alguno de estos valores se corrompería en silencio al
 * guardarse). Todo campo numérico del payload se valida con esto en vez
 * de `typeof === "number"` a secas.
 */
function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

const ROUTINE_SPLIT_CATEGORIES: readonly RoutineSplitCategory[] = [
  "Hipertrofia",
  "Fuerza",
  "Definición",
  "Running",
  "Básquet",
  "Personalizada",
];

function isExercisePrescription(value: unknown): value is ExercisePrescription {
  if (!isPlainObject(value)) return false;
  return (
    typeof value.exerciseId === "string" &&
    isFiniteNumber(value.order) &&
    isFiniteNumber(value.targetSets) &&
    typeof value.targetReps === "string" &&
    (value.restSeconds === undefined || isFiniteNumber(value.restSeconds)) &&
    (value.notes === undefined || typeof value.notes === "string")
  );
}

function isRoutineDayPlan(value: unknown): value is RoutineDayPlan {
  if (!isPlainObject(value)) return false;
  return (
    typeof value.id === "string" &&
    typeof value.weekId === "string" &&
    typeof value.routineId === "string" &&
    isFiniteNumber(value.order) &&
    typeof value.name === "string" &&
    (value.displayName === undefined || typeof value.displayName === "string") &&
    Array.isArray(value.exercises) &&
    value.exercises.every(isExercisePrescription)
  );
}

function isRoutineWeek(value: unknown): value is RoutineWeek {
  if (!isPlainObject(value)) return false;
  return (
    typeof value.id === "string" &&
    typeof value.routineId === "string" &&
    isFiniteNumber(value.number) &&
    typeof value.label === "string" &&
    (value.displayName === undefined || typeof value.displayName === "string") &&
    Array.isArray(value.days) &&
    value.days.every(isRoutineDayPlan)
  );
}

/** Type guard público — misma forma que `Routine` (lib/mock/types.ts), validada de punta a punta (semanas → días → ejercicios). */
export function isRoutinePayload(value: unknown): value is Routine {
  if (!isPlainObject(value)) return false;
  return (
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.description === "string" &&
    typeof value.sport === "string" &&
    typeof value.goal === "string" &&
    isFiniteNumber(value.weeksCount) &&
    isFiniteNumber(value.daysPerWeek) &&
    Array.isArray(value.weeks) &&
    value.weeks.every(isRoutineWeek) &&
    (value.splitCategory === undefined ||
      ROUTINE_SPLIT_CATEGORIES.includes(value.splitCategory as RoutineSplitCategory))
  );
}

/** Guard mínimo para la lectura de diagnóstico de `diagnoseUpdateFailure` (solo pide `id, local_id, version`, nunca `payload`). */
function isRoutineIdentityRow(value: unknown): value is { id: string; local_id: string; version: number } {
  if (!isPlainObject(value)) return false;
  return (
    typeof value.id === "string" &&
    typeof value.local_id === "string" &&
    Number.isSafeInteger(value.version) &&
    (value.version as number) >= 1
  );
}

/** Convierte una fila cruda (`unknown`, tal como la devuelve supabase-js sin Database tipada) en un `RoutineRow` validado, o revienta con un error de dominio claro. */
function parseRoutineRow(raw: unknown): RoutineRow {
  if (!isPlainObject(raw)) {
    throw new RoutineAdapterError("Supabase devolvió una fila de routines con forma inesperada (no es un objeto).");
  }

  const { id, athlete_id, local_id, payload, created_by, updated_by, version, created_at, updated_at, archived_at } =
    raw;

  const columnsLookValid =
    typeof id === "string" &&
    typeof athlete_id === "string" &&
    typeof local_id === "string" &&
    Number.isSafeInteger(version) &&
    (version as number) >= 1 &&
    typeof created_at === "string" &&
    typeof updated_at === "string" &&
    (created_by === null || typeof created_by === "string") &&
    (updated_by === null || typeof updated_by === "string") &&
    (archived_at === null || typeof archived_at === "string");

  if (!columnsLookValid) {
    throw new RoutineAdapterError(
      `Supabase devolvió una fila de routines (id=${String(id)}) con columnas de forma inesperada.`
    );
  }

  if (!isRoutinePayload(payload)) {
    throw new RoutinePayloadValidationError(
      `La fila de routines ${String(id)} tiene un payload que no respeta la forma de Routine (lib/mock/types.ts).`
    );
  }

  // El payload es la fuente de verdad de "qué rutina es" (`payload.id`),
  // y `local_id` es la clave que usa `routines_athlete_local_id_key` para
  // lo mismo — si Supabase alguna vez devolviera una fila donde no
  // coinciden (dato corrupto, o escrito por fuera de este adaptador sin
  // pasar por `createRoutineRow`/`updateRoutinePayload`), es una
  // inconsistencia de identidad real: no se arma un `RoutineRow` con eso,
  // se revienta explícito en vez de dejar pasar un dato ambiguo.
  if (payload.id !== (local_id as string)) {
    throw new RoutinePayloadValidationError(
      `La fila de routines ${String(id)} tiene identidad inconsistente: local_id="${local_id}" pero payload.id="${payload.id}".`
    );
  }

  return {
    id: id as string,
    athlete_id: athlete_id as string,
    local_id: local_id as string,
    payload,
    created_by: created_by as string | null,
    updated_by: updated_by as string | null,
    version: version as number,
    created_at: created_at as string,
    updated_at: updated_at as string,
    archived_at: archived_at as string | null,
  };
}

/* ------------------------------------------------------------------ */
/* 1. Listar rutinas visibles para un athlete_id                       */
/* ------------------------------------------------------------------ */

/**
 * Rutinas de `athleteId` visibles para quien hace la consulta (RLS decide
 * si eso es "las propias" -alumno-, "las de un alumno vinculado activo"
 * -coach-, o "todas" -admin-; acá no se repite esa lógica). Por defecto
 * excluye las archivadas (igual criterio que el índice parcial
 * `routines_athlete_active_idx` de la migración) — pasar
 * `includeArchived: true` para traerlas también. Orden: última
 * modificación primero.
 */
export async function listRoutinesForAthlete(
  supabase: SupabaseClient,
  athleteId: string,
  options: { includeArchived?: boolean } = {}
): Promise<RoutineRow[]> {
  let query = supabase
    .from(ROUTINES_TABLE)
    .select("*")
    .eq("athlete_id", athleteId)
    .order("updated_at", { ascending: false });

  if (!options.includeArchived) {
    query = query.is("archived_at", null);
  }

  const { data, error } = await query;

  if (error) {
    throw new RoutineAdapterError(`No se pudieron listar las rutinas de athlete_id=${athleteId}.`, error);
  }

  return ((data ?? []) as unknown[]).map(parseRoutineRow);
}

/* ------------------------------------------------------------------ */
/* 2. Obtener una rutina por local_id + athlete_id                     */
/* ------------------------------------------------------------------ */

/**
 * Busca por la misma clave que garantiza `routines_athlete_local_id_key`
 * (única en la migración) — pensada para el futuro importador
 * localStorage → Supabase, que necesita saber "¿esta rutina local ya
 * existe del otro lado?" antes de decidir INSERT o UPDATE. Devuelve la
 * fila esté o no archivada (a diferencia de `listRoutinesForAthlete`):
 * quien llama decide qué hacer si ya existe pero archivada. `null` si no
 * existe ninguna.
 */
export async function getRoutineByLocalId(
  supabase: SupabaseClient,
  athleteId: string,
  localId: string
): Promise<RoutineRow | null> {
  const { data, error } = await supabase
    .from(ROUTINES_TABLE)
    .select("*")
    .eq("athlete_id", athleteId)
    .eq("local_id", localId)
    .maybeSingle();

  if (error) {
    throw new RoutineAdapterError(
      `No se pudo leer la rutina local_id=${localId} de athlete_id=${athleteId}.`,
      error
    );
  }

  if (!data) return null;
  return parseRoutineRow(data as unknown);
}

/* ------------------------------------------------------------------ */
/* 3. Crear una rutina                                                 */
/* ------------------------------------------------------------------ */

/**
 * Inserta una rutina nueva. A propósito NO manda `created_by`,
 * `updated_by`, `version`, `created_at` ni `updated_at`: el trigger
 * `routines_set_audit_on_insert` (0003) los fuerza siempre en el
 * servidor, sin importar qué mande el cliente — mandarlos acá sería, en
 * el mejor caso, ignorado, y en el peor, una falsa sensación de control
 * sobre columnas que en realidad decide la base.
 *
 * `localId` tiene que ser exactamente `payload.id` — es la identidad
 * local inmutable de la rutina (la que usa `routines_athlete_local_id_key`
 * para idempotencia de importación). Si no coinciden, es una llamada mal
 * formada del futuro código de integración, no un dato válido a guardar.
 */
export async function createRoutineRow(
  supabase: SupabaseClient,
  athleteId: string,
  localId: string,
  payload: Routine
): Promise<RoutineRow> {
  if (localId.trim().length === 0) {
    throw new RoutinePayloadValidationError(
      "local_id no puede estar vacío ni ser solo espacios (routines_local_id_not_blank_check)."
    );
  }
  if (!isRoutinePayload(payload)) {
    throw new RoutinePayloadValidationError("El payload a crear no respeta la forma de Routine (lib/mock/types.ts).");
  }
  if (localId !== payload.id) {
    throw new RoutinePayloadValidationError(
      `local_id ("${localId}") tiene que ser exactamente igual a payload.id ("${payload.id}") — es la identidad local inmutable de la rutina.`
    );
  }

  const { data, error } = await supabase
    .from(ROUTINES_TABLE)
    .insert({ athlete_id: athleteId, local_id: localId, payload })
    .select("*")
    .single();

  if (error) {
    throw new RoutineAdapterError(
      `No se pudo crear la rutina local_id=${localId} para athlete_id=${athleteId}.`,
      error
    );
  }

  return parseRoutineRow(data as unknown);
}

/* ------------------------------------------------------------------ */
/* Control optimista compartido — usado por update/archivar/restaurar  */
/* ------------------------------------------------------------------ */

/** `expectedVersion` tiene que ser un entero seguro >= 1 — se valida ANTES de tocar Supabase, no después de un error confuso de Postgres. */
function assertValidExpectedVersion(expectedVersion: number): void {
  if (!Number.isSafeInteger(expectedVersion) || expectedVersion < 1) {
    throw new RoutinePayloadValidationError(
      `expectedVersion tiene que ser un entero seguro >= 1 (recibido: ${expectedVersion}).`
    );
  }
}

/**
 * Se llama únicamente cuando un UPDATE optimista no afectó ninguna fila.
 * `data: null` en ese UPDATE puede significar tres cosas muy distintas —
 * conflicto de version, identidad local movida, o la fila simplemente no
 * es visible bajo RLS (no existe, o existe pero es de un alumno/coach sin
 * vínculo) — y esta función es la única que las distingue, con una
 * segunda lectura mínima (`id, local_id, version`, nunca `payload`, para
 * no traer de vuelta datos que ni falta hacen para diagnosticar).
 *
 * Nunca revela CUÁL de "no existe" o "existe pero RLS la esconde" fue el
 * caso: para alguien sin permiso, ambas se ven exactamente igual (0 filas
 * en el SELECT de diagnóstico) — distinguirlas confirmaría la existencia
 * de una rutina ajena, que es exactamente lo que RLS está diseñado para
 * no filtrar.
 */
async function diagnoseUpdateFailure(
  supabase: SupabaseClient,
  id: string,
  expectedVersion: number,
  expectedLocalId?: string
): Promise<never> {
  const { data, error } = await supabase
    .from(ROUTINES_TABLE)
    .select("id, local_id, version")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new RoutineAdapterError(`No se pudo diagnosticar por qué no se actualizó la rutina ${id}.`, error);
  }

  if (!data) {
    throw new RoutineAdapterError(`La rutina ${id} no existe o no tenés permiso para acceder a ella.`);
  }

  if (!isRoutineIdentityRow(data)) {
    throw new RoutineAdapterError(
      `Supabase devolvió una fila de routines con forma inesperada al diagnosticar ${id}.`
    );
  }

  if (data.version !== expectedVersion) {
    throw new RoutineConflictError(id, expectedVersion);
  }

  if (expectedLocalId !== undefined && data.local_id !== expectedLocalId) {
    throw new RoutinePayloadValidationError(
      `La rutina ${id} tiene local_id="${data.local_id}", pero el payload a guardar tiene id="${expectedLocalId}" — la identidad local de una rutina no se reasigna desde un UPDATE de payload.`
    );
  }

  // version y local_id (si aplicaba) coinciden con lo esperado, pero el
  // UPDATE original igual no afectó ninguna fila — la explicación más
  // probable es una escritura que se intercaló justo entre ese UPDATE y
  // este diagnóstico. Se informa como conflicto: es el resultado más
  // seguro (nunca se confirma un guardado que en realidad no pasó).
  throw new RoutineConflictError(id, expectedVersion);
}

/**
 * Único punto que hace UPDATE sobre `routines`. Filtra siempre por
 * `id` + `version = expectedVersion` (el mismo patrón que describe 0003)
 * y, cuando se pasa `expectedLocalId` (solo `updateRoutinePayload` lo
 * usa), también por `local_id = expectedLocalId` — en la MISMA consulta
 * atómica, no como un chequeo aparte: así el UPDATE de un payload jamás
 * puede terminar aplicado sobre una fila cuyo `local_id` sea distinto de
 * `payload.id`, sin necesidad de una transacción explícita ni de tocar
 * `local_id` (nunca se escribe, solo se filtra por él).
 *
 * Si el WHERE no matchea ninguna fila, `.maybeSingle()` devuelve
 * `data: null` sin error — `diagnoseUpdateFailure` decide entonces si fue
 * un conflicto de version, un intento de mover la identidad local, o una
 * fila que RLS no deja ver.
 */
async function applyOptimisticUpdate(
  supabase: SupabaseClient,
  id: string,
  expectedVersion: number,
  patch: Record<string, unknown>,
  expectedLocalId?: string
): Promise<RoutineRow> {
  assertValidExpectedVersion(expectedVersion);

  let query = supabase.from(ROUTINES_TABLE).update(patch).eq("id", id).eq("version", expectedVersion);

  if (expectedLocalId !== undefined) {
    query = query.eq("local_id", expectedLocalId);
  }

  const { data, error } = await query.select("*").maybeSingle();

  if (error) {
    throw new RoutineAdapterError(`No se pudo actualizar la rutina ${id}.`, error);
  }

  if (!data) {
    await diagnoseUpdateFailure(supabase, id, expectedVersion, expectedLocalId);
    // diagnoseUpdateFailure siempre revienta (Promise<never>) — este throw
    // es solo para que el chequeo de tipos no dependa de esa garantía.
    throw new RoutineConflictError(id, expectedVersion);
  }

  return parseRoutineRow(data as unknown);
}

/* ------------------------------------------------------------------ */
/* 4. Actualizar una rutina (control optimista con version)            */
/* ------------------------------------------------------------------ */

/**
 * Filtra el UPDATE, en la misma consulta, tanto por `id` + `version`
 * (control optimista) como por `local_id = payload.id` (identidad local
 * inmutable — ver comentario de `applyOptimisticUpdate`): si por lo que
 * sea `id` correspondiera a una fila con otro `local_id`, el UPDATE no
 * afecta ninguna fila y `diagnoseUpdateFailure` lo reporta como
 * `RoutinePayloadValidationError`, nunca como un guardado silencioso con
 * la identidad cambiada.
 */
export async function updateRoutinePayload(
  supabase: SupabaseClient,
  id: string,
  expectedVersion: number,
  payload: Routine
): Promise<RoutineRow> {
  if (!isRoutinePayload(payload)) {
    throw new RoutinePayloadValidationError(
      "El payload a actualizar no respeta la forma de Routine (lib/mock/types.ts)."
    );
  }
  return applyOptimisticUpdate(supabase, id, expectedVersion, { payload }, payload.id);
}

/* ------------------------------------------------------------------ */
/* 5. Archivar una rutina (borrado lógico)                             */
/* ------------------------------------------------------------------ */

/** Nunca borra la fila — fija `archived_at`, mismo criterio que 0003. Exige `expectedVersion` (ver comentario de `applyOptimisticUpdate`). */
export async function archiveRoutine(
  supabase: SupabaseClient,
  id: string,
  expectedVersion: number
): Promise<RoutineRow> {
  return applyOptimisticUpdate(supabase, id, expectedVersion, { archived_at: new Date().toISOString() });
}

/* ------------------------------------------------------------------ */
/* 6. Restaurar una rutina archivada                                   */
/* ------------------------------------------------------------------ */

/** Vuelve a dejar `archived_at` en `null`. Misma razón para exigir `expectedVersion` que en `archiveRoutine`. */
export async function restoreRoutine(
  supabase: SupabaseClient,
  id: string,
  expectedVersion: number
): Promise<RoutineRow> {
  return applyOptimisticUpdate(supabase, id, expectedVersion, { archived_at: null });
}
