import { EXERCISE_CATALOG, MEAL_CATALOG, TODAY_ROUTINE } from "./data";
import {
  AceroState,
  DashboardSummary,
  MealCatalogItem,
  MealLogEntry,
  NutritionProgress,
  RoutineDay,
  SetEntry,
  WorkoutDayLog,
  WorkoutProgress,
} from "./types";

/**
 * Repositorio mock (Sprint 1). Persiste en localStorage con la misma forma
 * de datos que van a tener las tablas reales de Supabase (set_logs,
 * meal_logs) — cuando se conecte la base real, solo cambia de dónde vienen
 * los datos, no cómo las pantallas los usan.
 */

const WORKOUT_KEY_PREFIX = "forja.workout.";
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

function emptyWorkoutLog(date: string): WorkoutDayLog {
  return {
    date,
    routineId: TODAY_ROUTINE.id,
    exercises: TODAY_ROUTINE.exercises.map((ex) => ({
      exerciseId: ex.id,
      sets: Array.from({ length: ex.targetSets }, (_, i) => ({
        setNumber: i + 1,
        reps: null,
        weight: null,
        done: false,
      })),
    })),
    finishedAt: null,
  };
}

/* ---------------------------- Entreno ---------------------------- */

export function getTodayRoutine(): RoutineDay {
  return TODAY_ROUTINE;
}

export function getWorkoutLog(date?: string): WorkoutDayLog {
  const key = todayKey(date);
  return readJSON(WORKOUT_KEY_PREFIX + key, emptyWorkoutLog(key));
}

export function updateSet(
  exerciseId: string,
  setNumber: number,
  patch: Partial<Pick<SetEntry, "reps" | "weight">>,
  date?: string
): WorkoutDayLog {
  const key = todayKey(date);
  const log = getWorkoutLog(key);
  const next: WorkoutDayLog = {
    ...log,
    exercises: log.exercises.map((ex) =>
      ex.exerciseId !== exerciseId
        ? ex
        : {
            ...ex,
            sets: ex.sets.map((s) => (s.setNumber !== setNumber ? s : { ...s, ...patch })),
          }
    ),
  };
  writeJSON(WORKOUT_KEY_PREFIX + key, next);
  return next;
}

export function toggleSetDone(exerciseId: string, setNumber: number, date?: string): WorkoutDayLog {
  const key = todayKey(date);
  const log = getWorkoutLog(key);
  const next: WorkoutDayLog = {
    ...log,
    exercises: log.exercises.map((ex) =>
      ex.exerciseId !== exerciseId
        ? ex
        : {
            ...ex,
            sets: ex.sets.map((s) => (s.setNumber !== setNumber ? s : { ...s, done: !s.done })),
          }
    ),
  };
  writeJSON(WORKOUT_KEY_PREFIX + key, next);
  syncHistory(key);
  return next;
}

export function finishWorkout(date?: string): WorkoutDayLog {
  const key = todayKey(date);
  const log = getWorkoutLog(key);
  const next: WorkoutDayLog = { ...log, finishedAt: new Date().toISOString() };
  writeJSON(WORKOUT_KEY_PREFIX + key, next);
  syncHistory(key);
  return next;
}

export function getWorkoutProgress(date?: string): WorkoutProgress {
  const log = getWorkoutLog(date);
  const allSets = log.exercises.flatMap((ex) => ex.sets);
  const totalSets = allSets.length;
  const completedSets = allSets.filter((s) => s.done).length;
  return {
    totalSets,
    completedSets,
    finished: Boolean(log.finishedAt),
    percent: totalSets === 0 ? 0 : Math.round((completedSets / totalSets) * 100),
  };
}

/* --------------------------- Nutrición ---------------------------- */

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

/* ------------------------ Dashboard / Acero ------------------------ */

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

function getAceroState(overallPercent: number): AceroState {
  if (overallPercent >= 100) return "templado";
  if (overallPercent > 0) return "calentando";
  return "bruto";
}

export function getDashboardSummary(date?: string): DashboardSummary {
  const key = todayKey(date);
  const workout = getWorkoutProgress(key);
  const nutrition = getNutritionProgress(key);
  const overallPercent = Math.round((workout.percent + nutrition.percent) / 2);

  return {
    date: key,
    workout,
    nutrition,
    overallPercent,
    aceroState: getAceroState(overallPercent),
    streak: getStreak(),
  };
}
