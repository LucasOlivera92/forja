/**
 * Tipos del repositorio mock.
 * Misma forma que van a tener las tablas reales de Supabase más adelante
 * (routines, routine_weeks, routine_days, exercise_prescriptions,
 * set_logs, meal_logs) para que el reemplazo futuro no rompa las pantallas.
 */

/* ------------------------------------------------------------------ */
/* Entreno — catálogo (Rutina → Semana → Día → Ejercicio)              */
/* ------------------------------------------------------------------ */

export interface ExerciseCatalogItem {
  id: string;
  name: string;
  muscleGroup: string;
  /** Configurable por ejercicio — nunca hardcodeado en un componente. */
  videoUrl: string;
}

export interface ExercisePrescription {
  exerciseId: string;
  order: number;
  targetSets: number;
  targetReps: string;
}

export interface RoutineDayPlan {
  id: string;
  weekId: string;
  routineId: string;
  order: number;
  name: string;
  exercises: ExercisePrescription[];
}

export interface RoutineWeek {
  id: string;
  routineId: string;
  number: number;
  label: string;
  days: RoutineDayPlan[];
}

export interface Routine {
  id: string;
  name: string;
  weeks: RoutineWeek[];
}

/* ------------------------------------------------------------------ */
/* Entreno — progreso (sesión real de un usuario en un día de rutina)  */
/* ------------------------------------------------------------------ */

export interface SetEntry {
  setNumber: number;
  reps: number | null;
  weight: number | null;
  done: boolean;
}

export interface WorkoutExerciseLog {
  exerciseId: string;
  sets: SetEntry[];
}

export interface DaySession {
  routineId: string;
  weekId: string;
  dayId: string;
  /** Fecha calendario (YYYY-MM-DD) del primer registro de esta sesión. */
  date: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  exercises: WorkoutExerciseLog[];
}

export interface WorkoutProgress {
  totalSets: number;
  completedSets: number;
  finished: boolean;
  percent: number;
}

export interface ExerciseHistoryEntry {
  weight: number | null;
  reps: number | null;
  date: string;
}

export type ProgressDeltaKind = "weight" | "reps" | null;

export interface ExerciseProgressDelta {
  kind: ProgressDeltaKind;
  value: number;
}

export interface DaySummary {
  durationMinutes: number;
  totalVolume: number;
  exercisesCompleted: number;
  totalExercises: number;
}

export interface DayPointer {
  routineId: string;
  weekId: string;
  dayId: string;
}

/* ------------------------------------------------------------------ */
/* Nutrición                                                           */
/* ------------------------------------------------------------------ */

export type MealSlot = "desayuno" | "almuerzo" | "merienda" | "cena";

export interface MealCatalogItem {
  id: string;
  slot: MealSlot;
  slotLabel: string;
  name: string;
  items: string[];
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface MealLogEntry {
  mealId: string;
  date: string;
  completedAt: string | null;
}

export interface NutritionProgress {
  totalMeals: number;
  completedMeals: number;
  kcalTarget: number;
  kcalConsumed: number;
  percent: number;
}

/* ------------------------------------------------------------------ */
/* Dashboard                                                            */
/* ------------------------------------------------------------------ */

export type AceroState = "bruto" | "calentando" | "templado";

export interface DashboardSummary {
  date: string;
  workout: WorkoutProgress;
  nutrition: NutritionProgress;
  overallPercent: number;
  aceroState: AceroState;
  streak: number;
}
