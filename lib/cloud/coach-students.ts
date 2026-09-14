import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Sprint 6.12 — Lectura segura de "mis alumnos" para un coach.
 *
 * Aislado a propósito, mismo criterio que `lib/cloud/routines.ts`: el
 * proyecto no tiene tipos de Database generados para supabase-js, así que
 * todo lo que devuelve `.select()` se valida en runtime antes de tratarse
 * como una fila de `profiles`/`coach_students` — nunca se asume la forma
 * con `as any`.
 *
 * Nunca acepta un `coachId` enviado desde la UI: el coach autenticado se
 * resuelve acá adentro con `supabase.auth.getUser()`, mismo criterio que
 * usa `lib/cloud/routines-import.ts` para el alumno. La seguridad de fondo
 * (qué filas de `coach_students`/`profiles` puede ver este usuario) la
 * decide por completo RLS (migración 0002) — este módulo no la duplica,
 * solo evita mandar a Supabase una consulta que dependa de un id que no
 * sea el del usuario autenticado, y además verifica explícitamente el rol
 * antes de consultar nada (defensa adicional, no un reemplazo de RLS).
 *
 * No crea su propio cliente de Supabase (igual que `lib/cloud/routines.ts`):
 * cada función recibe un `SupabaseClient` ya armado como parámetro. Quien
 * llama es responsable de resolver `createClient()` (server o browser),
 * chequear que no sea `null`, y nunca pasar acá un cliente armado con la
 * `service_role` key.
 */

const PROFILES_TABLE = "profiles";
const COACH_STUDENTS_TABLE = "coach_students";

/** Datos de un alumno activo, tal como los necesita el panel de "Mis alumnos". */
export interface CoachStudentSummary {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  primary_goal: string | null;
  /** `created_at` de la relación `coach_students` (desde cuándo está vinculado) — no del perfil. */
  created_at: string;
}

/** Cualquier problema al verificar el rol, leer relaciones o leer perfiles — mensaje siempre neutral, nunca expone el error original al usuario final. */
export class CoachStudentsAccessError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = "CoachStudentsAccessError";
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

interface CoachStudentRelationRow {
  student_id: string;
  created_at: string;
}

function isCoachStudentRelationRow(value: unknown): value is CoachStudentRelationRow {
  return isPlainObject(value) && typeof value.student_id === "string" && typeof value.created_at === "string";
}

interface StudentProfileRow {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  primary_goal: string | null;
}

function isStudentProfileRow(value: unknown): value is StudentProfileRow {
  return (
    isPlainObject(value) &&
    typeof value.id === "string" &&
    isNullableString(value.full_name) &&
    isNullableString(value.avatar_url) &&
    isNullableString(value.primary_goal)
  );
}

/**
 * Usuario autenticado + verificación de que su perfil sea `role = "coach"`.
 * Nunca confía en nada que venga de la UI: resuelve todo desde la sesión
 * actual (`supabase.auth.getUser()`) y una lectura de `profiles` propia.
 * Revienta con `CoachStudentsAccessError` (mensaje siempre neutral) si no
 * hay sesión, si no se puede leer el perfil, o si el perfil no es coach.
 */
async function requireCurrentCoachId(supabase: SupabaseClient): Promise<string> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw new CoachStudentsAccessError("No se pudo verificar la sesión.", userError);
  }
  if (!user) {
    throw new CoachStudentsAccessError("No hay una sesión autenticada.");
  }

  const { data, error } = await supabase.from(PROFILES_TABLE).select("role").eq("id", user.id).maybeSingle();

  if (error) {
    throw new CoachStudentsAccessError("No se pudo verificar el perfil.", error);
  }
  if (!isPlainObject(data) || typeof data.role !== "string") {
    throw new CoachStudentsAccessError("No se pudo verificar el perfil.");
  }
  if (data.role !== "coach") {
    throw new CoachStudentsAccessError("Esta sección es solo para entrenadores.");
  }

  return user.id;
}

/**
 * Alumnos activos del coach autenticado. Dos consultas encadenadas — nunca
 * un join manual con datos sin validar — cada una con su propio guard de
 * runtime:
 * 1. Relaciones de `coach_students` con `coach_id = usuario actual` y
 *    `active = true` (nunca trae relaciones inactivas ni de otro coach).
 * 2. Perfiles (`profiles`) de esos `student_id`.
 *
 * Si un `student_id` de la relación no aparece entre los perfiles leídos
 * (RLS lo esconde, o el perfil no existe), esa relación se omite en vez de
 * inventar datos — nunca se muestra un alumno con campos vacíos a ciegas.
 */
export async function listActiveStudentsForCurrentCoach(supabase: SupabaseClient): Promise<CoachStudentSummary[]> {
  const coachId = await requireCurrentCoachId(supabase);

  const { data: relations, error: relationsError } = await supabase
    .from(COACH_STUDENTS_TABLE)
    .select("student_id, created_at")
    .eq("coach_id", coachId)
    .eq("active", true);

  if (relationsError) {
    throw new CoachStudentsAccessError("No se pudieron leer tus alumnos.", relationsError);
  }

  const relationRows = ((relations ?? []) as unknown[]).filter(isCoachStudentRelationRow);
  if (relationRows.length === 0) return [];

  const studentIds = relationRows.map((row) => row.student_id);

  const { data: profiles, error: profilesError } = await supabase
    .from(PROFILES_TABLE)
    .select("id, full_name, avatar_url, primary_goal")
    .in("id", studentIds);

  if (profilesError) {
    throw new CoachStudentsAccessError("No se pudieron leer tus alumnos.", profilesError);
  }

  const profileRows = ((profiles ?? []) as unknown[]).filter(isStudentProfileRow);
  const profileById = new Map(profileRows.map((row) => [row.id, row]));

  const summaries: CoachStudentSummary[] = [];
  for (const relation of relationRows) {
    const profile = profileById.get(relation.student_id);
    if (!profile) continue;
    summaries.push({
      id: profile.id,
      full_name: profile.full_name,
      avatar_url: profile.avatar_url,
      primary_goal: profile.primary_goal,
      created_at: relation.created_at,
    });
  }

  return summaries;
}

/**
 * Un alumno puntual, solo si tiene una relación ACTIVA con el coach
 * autenticado — nunca busca el perfil directamente por id sin antes
 * confirmar el vínculo. Así una pantalla `/alumnos/[studentId]` nunca
 * puede usarse para consultar el perfil de alguien que no es alumno activo
 * de este coach, incluso si alguien arma la URL a mano.
 *
 * Devuelve `null` (nunca revienta) si no hay vínculo activo o si el perfil
 * no se pudo leer — quien llama debe tratar `null` como "no corresponde" y
 * redirigir, sin distinguir el motivo exacto.
 */
export async function getActiveStudentForCurrentCoach(
  supabase: SupabaseClient,
  studentId: string
): Promise<CoachStudentSummary | null> {
  const coachId = await requireCurrentCoachId(supabase);

  const { data: relation, error: relationError } = await supabase
    .from(COACH_STUDENTS_TABLE)
    .select("student_id, created_at")
    .eq("coach_id", coachId)
    .eq("student_id", studentId)
    .eq("active", true)
    .maybeSingle();

  if (relationError) {
    throw new CoachStudentsAccessError("No se pudo verificar el vínculo con este alumno.", relationError);
  }
  if (!isCoachStudentRelationRow(relation)) return null;

  const { data: profile, error: profileError } = await supabase
    .from(PROFILES_TABLE)
    .select("id, full_name, avatar_url, primary_goal")
    .eq("id", relation.student_id)
    .maybeSingle();

  if (profileError) {
    throw new CoachStudentsAccessError("No se pudo leer el perfil del alumno.", profileError);
  }
  if (!isStudentProfileRow(profile)) return null;

  return {
    id: profile.id,
    full_name: profile.full_name,
    avatar_url: profile.avatar_url,
    primary_goal: profile.primary_goal,
    created_at: relation.created_at,
  };
}
