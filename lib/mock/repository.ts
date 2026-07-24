import { EXERCISE_CATALOG, MEAL_CATALOG, ROUTINE, ROUTINES } from "./data";
import {
  AceroState,
  DashboardSummary,
  DayPointer,
  DaySession,
  DaySummary,
  ExerciseCatalogItem,
  ExerciseHistoryEntry,
  ExerciseProgressDelta,
  MealCatalogItem,
  MealLogEntry,
  NutritionProgress,
  Routine,
  RoutineDayPlan,
  RoutineWeek,
  SetEntry,
  WeekProgress,
  WorkoutProgress,
} from "./types";

/**
 * Repositorio mock. Persiste en localStorage con la misma forma de datos
 * que van a tener las tablas reales de Supabase (routines, routine_weeks,
 * routine_days, set_logs, meal_logs) — cuando se conecte la base real,
 * solo cambia de dónde vienen los datos, no cómo las pantallas los usan.
 *
 * Todas las funciones de entreno reciben `routineId` opcional (default: la
 * rutina activa) para no atarlas a una sola rutina — la base para soportar
 * múltiples rutinas y múltiples usuarios más adelante.
 */

const SESSION_KEY_PREFIX = "forja.session.";
const MEALS_KEY_PREFIX = "forja.meals.";
const HISTORY_KEY = "forja.history";

function todayKey(date?: string): string {
  return date ?? new Date().toISOString().slice(0, 10);
}

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function readJSON<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJSON<T>(key: string, value: T): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

/* ------------------------------------------------------------------ */
/* Catálogo: rutina / semanas / días / ejercicios                      */
/* ------------------------------------------------------------------ */

export function getRoutine(routineId: string = ROUTINE.id): Routine {
  // Con multi-rutina real (Sprint 3.4) esto sería un SELECT por routineId
  // contra la tabla `routines` — acá busca en el catálogo mock ROUTINES.
  return ROUTINES.find((r) => r.id === routineId) ?? ROUTINE;
}

/** Catálogo completo de rutinas — usado por la pantalla /rutinas. */
export function getRoutines(): Routine[] {
  return ROUTINES;
}

export function getWeeks(routineId?: string): RoutineWeek[] {
  return getRoutine(routineId).weeks;
}

export function getWeek(weekId: string, routineId?: string): RoutineWeek | undefined {
  return getWeeks(routineId).find((w) => w.id === weekId);
}

export function getDayPlan(weekId: string, dayId: string, routineId?: string): RoutineDayPlan | undefined {
  return getWeek(weekId, routineId)?.days.find((d) => d.id === dayId);
}

export function getExercise(exerciseId: string): ExerciseCatalogItem | undefined {
  return EXERCISE_CATALOG.find((ex) => ex.id === exerciseId);
}

/* ------------------------------------------------------------------ */
/* Sesión de un día (progreso real del usuario)                        */
/* ------------------------------------------------------------------ */

function sessionKey(weekId: string, dayId: string, routineId: string): string {
  return `${SESSION_KEY_PREFIX}${routineId}.${weekId}.${dayId}`;
}

function emptySession(weekId: string, dayId: string, routineId: string): DaySession {
  const dayPlan = getDayPlan(weekId, dayId, routineId);
  return {
    routineId,
    weekId,
    dayId,
    date: null,
    startedAt: null,
    finishedAt: null,
    exercises: (dayPlan?.exercises ?? []).map((prescription) => ({
      exerciseId: prescription.exerciseId,
      sets: Array.from({ length: prescription.targetSets }, (_, i) => ({
        setNumber: i + 1,
        reps: null,
        weight: null,
        done: false,
      })),
    })),
  };
}

export function getDaySession(weekId: string, dayId: string, routineId: string = ROUTINE.id): DaySession {
  return readJSON(sessionKey(weekId, dayId, routineId), emptySession(weekId, dayId, routineId));
}

function writeSession(session: DaySession): void {
  writeJSON(sessionKey(session.weekId, session.dayId, session.routineId), session);
}

function touchSessionStart(session: DaySession): DaySession {
  if (session.startedAt) return session;
  return { ...session, startedAt: new Date().toISOString(), date: session.date ?? todayKey() };
}

export function updateExerciseSet(
  weekId: string,
  dayId: string,
  exerciseId: string,
  setNumber: number,
  patch: Partial<Pick<SetEntry, "reps" | "weight">>,
  routineId: string = ROUTINE.id
): DaySession {
  const session = touchSessionStart(getDaySession(weekId, dayId, routineId));
  const next: DaySession = {
    ...session,
    exercises: session.exercises.map((ex) =>
      ex.exerciseId !== exerciseId
        ? ex
        : { ...ex, sets: ex.sets.map((s) => (s.setNumber !== setNumber ? s : { ...s, ...patch })) }
    ),
  };
  writeSession(next);
  return next;
}

export function toggleSetDone(
  weekId: string,
  dayId: string,
  exerciseId: string,
  setNumber: number,
  routineId: string = ROUTINE.id
): DaySession {
  const session = touchSessionStart(getDaySession(weekId, dayId, routineId));
  const next: DaySession = {
    ...session,
    exercises: session.exercises.map((ex) =>
      ex.exerciseId !== exerciseId
        ? ex
        : { ...ex, sets: ex.sets.map((s) => (s.setNumber !== setNumber ? s : { ...s, done: !s.done })) }
    ),
  };
  writeSession(next);
  if (next.date) syncHistory(next.date);
  return next;
}

/**
 * Sprint 3.7 — Finalizar entrenamiento. Marca la sesión como terminada y,
 * ya que el registro (Sprint 3.2) es un único peso/reps por ejercicio para
 * todas sus series, da por completadas todas las series registradas: así
 * `getWorkoutProgress`/`getDashboardSummary` (ya existentes, sin tocar)
 * reflejan el 100% en Hoy apenas se vuelve a esa pantalla.
 */
export function finishDay(weekId: string, dayId: string, routineId: string = ROUTINE.id): DaySession {
  const session = touchSessionStart(getDaySession(weekId, dayId, routineId));
  const next: DaySession = {
    ...session,
    finishedAt: new Date().toISOString(),
    exercises: session.exercises.map((ex) => ({
      ...ex,
      sets: ex.sets.map((s) => ({ ...s, done: true })),
    })),
  };
  writeSession(next);
  if (next.date) syncHistory(next.date);
  return next;
}

export function isDayCompleted(weekId: string, dayId: string, routineId: string = ROUTINE.id): boolean {
  return Boolean(getDaySession(weekId, dayId, routineId).finishedAt);
}

export function getWeekCompletion(weekId: string, routineId?: string): { completedDays: number; totalDays: number } {
  const week = getWeek(weekId, routineId);
  const days = week?.days ?? [];
  const completedDays = days.filter((d) => isDayCompleted(weekId, d.id, week?.routineId)).length;
  return { completedDays, totalDays: days.length };
}

function getAllStartedSessions(routineId: string = ROUTINE.id): DaySession[] {
  const sessions: DaySession[] = [];
  for (const week of getWeeks(routineId)) {
    for (const day of week.days) {
      const session = getDaySession(week.id, day.id, routineId);
      if (session.date) sessions.push(session);
    }
  }
  return sessions;
}

/** Primer día no completado (semana y día en orden) — el "siguiente paso". */
export function getCurrentDayPointer(routineId: string = ROUTINE.id): DayPointer | null {
  for (const week of getWeeks(routineId)) {
    for (const day of week.days) {
      if (!isDayCompleted(week.id, day.id, routineId)) {
        return { routineId, weekId: week.id, dayId: day.id };
      }
    }
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Historial y progreso por ejercicio                                  */
/* ------------------------------------------------------------------ */

function bestSet(sets: SetEntry[]): SetEntry | null {
  const done = sets.filter((s) => s.done);
  if (done.length === 0) return null;
  return done.reduce((best, current) => {
    const bestWeight = best.weight ?? 0;
    const currentWeight = current.weight ?? 0;
    if (currentWeight !== bestWeight) return currentWeight > bestWeight ? current : best;
    return (current.reps ?? 0) > (best.reps ?? 0) ? current : best;
  });
}

/**
 * Última vez que se registró este ejercicio con al menos una serie hecha,
 * en una sesión finalizada distinta de la que se está viendo ahora mismo.
 */
export function getExerciseHistory(
  exerciseId: string,
  excludeWeekId?: string,
  excludeDayId?: string,
  routineId: string = ROUTINE.id
): ExerciseHistoryEntry | null {
  const candidates = getAllStartedSessions(routineId)
    .filter((s) => s.finishedAt)
    .filter((s) => !(s.weekId === excludeWeekId && s.dayId === excludeDayId))
    .sort((a, b) => (b.finishedAt ?? "").localeCompare(a.finishedAt ?? ""));

  for (const session of candidates) {
    const exerciseLog = session.exercises.find((ex) => ex.exerciseId === exerciseId);
    if (!exerciseLog) continue;
    const best = bestSet(exerciseLog.sets);
    if (!best) continue;
    return { weight: best.weight, reps: best.reps, date: session.date ?? "" };
  }
  return null;
}

/** Compara la mejor serie de hoy contra el último entrenamiento registrado. */
export function getExerciseProgressDelta(
  weekId: string,
  dayId: string,
  exerciseId: string,
  routineId: string = ROUTINE.id
): ExerciseProgressDelta {
  const session = getDaySession(weekId, dayId, routineId);
  const exerciseLog = session.exercises.find((ex) => ex.exerciseId === exerciseId);
  const current = exerciseLog ? bestSet(exerciseLog.sets) : null;
  const history = getExerciseHistory(exerciseId, weekId, dayId, routineId);

  if (!current || !history) return { kind: null, value: 0 };

  if (current.weight != null && history.weight != null && current.weight > history.weight) {
    return { kind: "weight", value: Math.round((current.weight - history.weight) * 10) / 10 };
  }

  if (
    current.reps != null &&
    history.reps != null &&
    current.reps > history.reps &&
    (current.weight ?? 0) >= (history.weight ?? 0)
  ) {
    return { kind: "reps", value: current.reps - history.reps };
  }

  return { kind: null, value: 0 };
}

export function getDaySummary(weekId: string, dayId: string, routineId: string = ROUTINE.id): DaySummary {
  const session = getDaySession(weekId, dayId, routineId);

  const durationMinutes =
    session.startedAt && session.finishedAt
      ? Math.max(1, Math.round((new Date(session.finishedAt).getTime() - new Date(session.startedAt).getTime()) / 60000))
      : 0;

  const totalVolume = session.exercises.reduce(
    (sum, ex) => sum + ex.sets.filter((s) => s.done).reduce((setSum, s) => setSum + (s.reps ?? 0) * (s.weight ?? 0), 0),
    0
  );

  const exercisesCompleted = session.exercises.filter((ex) => ex.sets.length > 0 && ex.sets.every((s) => s.done)).length;

  return {
    durationMinutes,
    totalVolume: Math.round(totalVolume),
    exercisesCompleted,
    totalExercises: session.exercises.length,
  };
}

/* ------------------------------------------------------------------ */
/* Nutrición                                                            */
/* ------------------------------------------------------------------ */

export function getMealCatalog(): MealCatalogItem[] {
  return MEAL_CATALOG;
}

export function getMealLog(date?: string): MealLogEntry[] {
  const key = todayKey(date);
  const fallback: MealLogEntry[] = MEAL_CATALOG.map((m) => ({
    mealId: m.id,
    date: key,
    completedAt: null,
  }));
  return readJSON(MEALS_KEY_PREFIX + key, fallback);
}

export function toggleMeal(mealId: string, date?: string): MealLogEntry[] {
  const key = todayKey(date);
  const log = getMealLog(key);
  const next = log.map((entry) =>
    entry.mealId !== mealId
      ? entry
      : { ...entry, completedAt: entry.completedAt ? null : new Date().toISOString() }
  );
  writeJSON(MEALS_KEY_PREFIX + key, next);
  syncHistory(key);
  return next;
}

export function getNutritionProgress(date?: string): NutritionProgress {
  const key = todayKey(date);
  const log = getMealLog(key);
  const completed = log.filter((e) => e.completedAt);
  const kcalTarget = MEAL_CATALOG.reduce((sum, m) => sum + m.kcal, 0);
  const kcalConsumed = MEAL_CATALOG.filter((m) => completed.some((e) => e.mealId === m.id)).reduce(
    (sum, m) => sum + m.kcal,
    0
  );
  return {
    totalMeals: MEAL_CATALOG.length,
    completedMeals: completed.length,
    kcalTarget,
    kcalConsumed,
    percent: MEAL_CATALOG.length === 0 ? 0 : Math.round((completed.length / MEAL_CATALOG.length) * 100),
  };
}

/* ------------------------------------------------------------------ */
/* Dashboard / Acero                                                    */
/* ------------------------------------------------------------------ */

/**
 * Progreso de entreno "de hoy" para el Dashboard. Busca una sesión con
 * fecha calendario = hoy (sin importar qué semana/día de rutina sea); si
 * todavía no se tocó nada hoy, muestra el objetivo del día pendiente para
 * que la tarjeta del Dashboard siempre pueda enlazar al siguiente paso.
 */
export function getWorkoutProgress(date?: string): WorkoutProgress {
  const key = todayKey(date);
  const todaysSession = getAllStartedSessions().find((s) => s.date === key);

  if (todaysSession) {
    const allSets = todaysSession.exercises.flatMap((ex) => ex.sets);
    const totalSets = allSets.length;
    const completedSets = allSets.filter((s) => s.done).length;
    return {
      totalSets,
      completedSets,
      finished: Boolean(todaysSession.finishedAt),
      percent: totalSets === 0 ? 0 : Math.round((completedSets / totalSets) * 100),
    };
  }

  const pointer = getCurrentDayPointer();
  if (!pointer) {
    // No quedan días pendientes en la rutina.
    return { totalSets: 0, completedSets: 0, finished: true, percent: 100 };
  }

  const dayPlan = getDayPlan(pointer.weekId, pointer.dayId, pointer.routineId);
  const totalSets = (dayPlan?.exercises ?? []).reduce((sum, ex) => sum + ex.targetSets, 0);
  return { totalSets, completedSets: 0, finished: false, percent: 0 };
}

function syncHistory(date: string): void {
  const workout = getWorkoutProgress(date);
  const nutrition = getNutritionProgress(date);
  const fullyDone = workout.finished && nutrition.completedMeals === nutrition.totalMeals;

  const history = readJSON<string[]>(HISTORY_KEY, []);
  const has = history.includes(date);

  if (fullyDone && !has) {
    writeJSON(HISTORY_KEY, [...history, date].sort());
  } else if (!fullyDone && has) {
    writeJSON(
      HISTORY_KEY,
      history.filter((d) => d !== date)
    );
  }
}

function getStreak(): number {
  const history = new Set(readJSON<string[]>(HISTORY_KEY, []));
  let streak = 0;
  const cursor = new Date();

  // Si hoy todavía no está completo, la racha se cuenta desde ayer.
  const today = cursor.toISOString().slice(0, 10);
  if (!history.has(today)) {
    cursor.setDate(cursor.getDate() - 1);
  }

  while (true) {
    const key = cursor.toISOString().slice(0, 10);
    if (!history.has(key)) break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

/**
 * Sprint 3.8 — Progreso semanal (días de rutina completados / días totales
 * de la semana activa), única fuente de verdad del estado visual del
 * Acero. Reutiliza getWeekCompletion() ya existente — no agrega ningún
 * tracking nuevo, solo lo combina.
 *
 * "Semana activa" = la última semana (en orden) que ya tiene al menos un
 * día completado. No se usa directamente getCurrentDayPointer() acá,
 * porque su semana salta a la próxima apenas se termina el 5to día — con
 * ese criterio el Acero nunca llegaría a mostrarse en "forjado" (5/5): al
 * completar el último día, saltaría directo a 0/5 de la semana siguiente.
 */
function getCurrentWeekProgress(routineId: string = ROUTINE.id): WeekProgress {
  const weeks = getWeeks(routineId);
  if (weeks.length === 0) return { completedDays: 0, totalDays: 0, percent: 0 };

  let active = getWeekCompletion(weeks[0].id, routineId);
  for (const week of weeks) {
    const completion = getWeekCompletion(week.id, routineId);
    if (completion.completedDays > 0) active = completion;
  }

  return {
    completedDays: active.completedDays,
    totalDays: active.totalDays,
    percent: active.totalDays === 0 ? 0 : Math.round((active.completedDays / active.totalDays) * 100),
  };
}

/** Los 6 estados del Acero, en orden de progreso semanal (0 a 5 de 5 días). */
const ACERO_STAGES: AceroState[] = ["frio", "iniciando", "calentando", "en-forja", "casi-listo", "forjado"];

function getAceroState(weekProgress: WeekProgress): AceroState {
  if (weekProgress.totalDays === 0) return "frio";
  const stageIndex = Math.round((weekProgress.completedDays / weekProgress.totalDays) * (ACERO_STAGES.length - 1));
  return ACERO_STAGES[Math.min(Math.max(stageIndex, 0), ACERO_STAGES.length - 1)];
}

export function getDashboardSummary(date?: string): DashboardSummary {
  const key = todayKey(date);
  const workout = getWorkoutProgress(key);
  const nutrition = getNutritionProgress(key);
  const overallPercent = Math.round((workout.percent + nutrition.percent) / 2);
  const weekProgress = getCurrentWeekProgress();

  return {
    date: key,
    workout,
    nutrition,
    overallPercent,
    weekProgress,
    aceroState: getAceroState(weekProgress),
    streak: getStreak(),
  };
}
