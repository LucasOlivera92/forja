/**
 * Tipos del repositorio mock (Sprint 1).
 * Misma forma que van a tener las tablas reales de Supabase más adelante
 * (set_logs, meal_logs) para que el reemplazo futuro no rompa las pantallas.
 */

export interface ExerciseCatalogItem {
  id: string;
  name: string;
  muscleGroup: string;
  targetSets: number;
  targetReps: string;
}

export interface RoutineDay {
  id: string;
  name: string;
  exercises: ExerciseCatalogItem[];
}

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

export interface WorkoutDayLog {
  date: string;
  routineId: string;
  exercises: WorkoutExerciseLog[];
  finishedAt: string | null;
}

export interface WorkoutProgress {
  totalSets: number;
  completedSets: number;
  finished: boolean;
  percent: number;
}

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

export type AceroState = "bruto" | "calentando" | "templado";

export interface DashboardSummary {
  date: string;
  workout: WorkoutProgress;
  nutrition: NutritionProgress;
  overallPercent: number;
  aceroState: AceroState;
  streak: number;
}
