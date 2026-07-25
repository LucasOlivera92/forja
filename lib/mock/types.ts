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
  /** Configurable por ejercicio — nunca hardcodeado en un componente. Sprint 4.5: pasa a ser opcional. */
  videoUrl?: string;
  /** Metadata de catálogo (Sprint 3.4) — el ejercicio existe una sola vez acá; las rutinas solo lo referencian. */
  description: string;
  equipment: string;
  exerciseType: string;
  /**
   * Sprint 4.5 — Biblioteca profesional de ejercicios. Todos los campos de
   * abajo son enriquecimiento del mismo EXERCISE_CATALOG existente (no se
   * crea un catálogo nuevo).
   */
  /** Categoría fija (reutiliza `ExerciseCategory`, ya usada en el buscador de ejercicios). */
  category: ExerciseCategory;
  /** Músculo principal trabajado (más específico que `muscleGroup`, ej: "Pectoral"). */
  primaryMuscle: string;
  /** Músculos secundarios involucrados (ej: ["Tríceps", "Deltoide anterior"]). */
  secondaryMuscles: string[];
  /** Nivel de dificultad. */
  level: ExerciseLevel;
  /** true si el ejercicio se realiza un lado del cuerpo por vez. */
  unilateral: boolean;
}

export interface ExercisePrescription {
  exerciseId: string;
  order: number;
  targetSets: number;
  targetReps: string;
  /** Sprint 4.1 — descanso en segundos entre series. Opcional: las rutinas base (El Toro) no lo usan. */
  restSeconds?: number;
  /** Sprint 4.2 — notas libres del editor de rutinas propias. Opcional. */
  notes?: string;
}

export interface RoutineDayPlan {
  id: string;
  weekId: string;
  routineId: string;
  order: number;
  name: string;
  /** Sprint 4.4 — nombre propio opcional (ej: "Empuje", "Pull"), solo para rutinas propias. Si no está, se sigue mostrando `name`. No reemplaza ni afecta el `id`. */
  displayName?: string;
  exercises: ExercisePrescription[];
}

export interface RoutineWeek {
  id: string;
  routineId: string;
  number: number;
  label: string;
  /** Sprint 4.4 — nombre propio opcional (ej: "Adaptación", "Descarga"), solo para rutinas propias. Si no está, se sigue mostrando `label` ("Semana N"). No reemplaza ni afecta el `id`. */
  displayName?: string;
  days: RoutineDayPlan[];
}

export interface Routine {
  id: string;
  name: string;
  /** Metadata de catálogo (Sprint 3.4) — para la pantalla /rutinas. */
  description: string;
  sport: string;
  goal: string;
  weeksCount: number;
  daysPerWeek: number;
  weeks: RoutineWeek[];
  /**
   * Sprint 4.9 — categoría de distribución muscular elegida (opcional) al
   * crear la rutina, solo para mostrar sugerencias informativas en el
   * constructor ("Grupo sugerido"). No afecta nombres, ejercicios ni
   * ningún otro campo — puramente informativo.
   */
  splitCategory?: RoutineSplitCategory;
}

/** Sprint 4.9 — las 6 categorías fijas de "Plantillas inteligentes de distribución muscular". */
export type RoutineSplitCategory = "Hipertrofia" | "Fuerza" | "Definición" | "Running" | "Básquet" | "Personalizada";

/**
 * Sprint 4.0 — datos del formulario "Crear rutina" (/entreno/nueva). Sin
 * ejercicios: la rutina se crea con `weeks: []` y queda igual que las
 * demás rutinas todavía sin contenido en el catálogo.
 */
export interface CreateRoutineInput {
  name: string;
  goal: string;
  sport: string;
  weeksCount: number;
  daysPerWeek: number;
  /**
   * Sprint 4.6 — nombres de semana/día sugeridos por una plantilla FORJA
   * (opcional). Si no vienen (o no coinciden en longitud con
   * `weeksCount`/`daysPerWeek`), la rutina se crea exactamente igual que
   * siempre: `weeks: []`, sin ningún nombre precargado.
   */
  weekNames?: string[];
  dayNames?: string[];
  /**
   * Sprint 4.9 — categoría de distribución muscular sugerida (opcional),
   * elegida como guía informativa en la pantalla de creación. Si viene,
   * queda guardada en `Routine.splitCategory` para que el constructor
   * pueda mostrar "Grupo sugerido" por día. No autocompleta ningún otro
   * campo.
   */
  splitCategory?: RoutineSplitCategory;
}

/**
 * Sprint 4.6 — Plantilla fija de rutina ("Plantillas FORJA"). Nunca
 * incluye ejercicios: solo acelera la creación con un nombre sugerido,
 * cantidad de semanas/días y sus nombres. El usuario puede cambiar
 * absolutamente todo después de crearla.
 */
export interface RoutineTemplate {
  id: string;
  name: string;
  description: string;
  weeksCount: number;
  /** Longitud === weeksCount. */
  weekNames: string[];
  /** Longitud === cantidad de días por semana; se repite igual en cada semana. */
  dayNames: string[];
}

/**
 * Sprint 4.1 — datos del formulario "Agregar ejercicio" dentro del
 * constructor de una rutina propia (/entreno/mi-rutina/...).
 */
export interface AddExerciseInput {
  exerciseId: string;
  targetSets: number;
  targetReps: string;
  restSeconds: number;
}

/** Sprint 4.1 — las 6 categorías fijas del buscador de ejercicios. */
export type ExerciseCategory = "Pecho" | "Espalda" | "Piernas" | "Hombros" | "Brazos" | "Core";

/** Sprint 4.5 — nivel de dificultad del ejercicio (biblioteca profesional). */
export type ExerciseLevel = "Principiante" | "Intermedio" | "Avanzado";

/** Sprint 4.2 — datos editables de un ejercicio ya agregado a una rutina propia (el nombre no se edita acá, es solo lectura). */
export interface UpdateExerciseInput {
  targetSets: number;
  targetReps: string;
  restSeconds: number;
  notes?: string;
}

/**
 * Sprint 4.8 — datos editables de la información general de una rutina
 * propia ("✏️ Editar rutina" en el constructor). Mismos 5 campos que
 * `CreateRoutineInput` sin los opcionales de plantilla (`weekNames`/
 * `dayNames`), que solo aplican al crear.
 */
export interface UpdateRoutineInfoInput {
  name: string;
  goal: string;
  sport: string;
  weeksCount: number;
  daysPerWeek: number;
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

/**
 * Sprint 4.3 — "Ejecución de rutina": una rutina no es una única pasada,
 * se puede correr infinitas veces. Cada vez que se completan los 5 días
 * de una semana, esa semana queda archivada acá como una ejecución más
 * (#1, #2, #3...) — reutiliza el mismo `DaySession` de siempre (sin
 * inventar un formato nuevo), solo lo snapshotea para que "Reiniciar
 * semana" pueda limpiar el progreso en vivo sin perder este historial.
 */
export interface RoutineExecution {
  id: string;
  routineId: string;
  weekId: string;
  /** 1, 2, 3... — cuántas veces se completó esta semana hasta ahora. */
  executionNumber: number;
  completedAt: string;
  sessions: DaySession[];
}

export interface ExerciseHistoryEntry {
  weight: number | null;
  reps: number | null;
  date: string;
}

/** Sprint 3.9 — "equal" cubre el caso "=" (mismo peso y reps que la última vez). */
export type ProgressDeltaKind = "weight" | "reps" | "equal" | null;

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

/**
 * Sprint 3.8 — 6 estados del Acero, atados al progreso semanal (días de
 * rutina completados / días totales de la semana), no al progreso diario.
 */
export type AceroState = "frio" | "iniciando" | "calentando" | "en-forja" | "casi-listo" | "forjado";

/** Progreso de la semana activa de la rutina — misma forma que ya devuelve getWeekCompletion(), con el percent ya resuelto. */
export interface WeekProgress {
  completedDays: number;
  totalDays: number;
  percent: number;
}

export interface DashboardSummary {
  date: string;
  workout: WorkoutProgress;
  nutrition: NutritionProgress;
  overallPercent: number;
  /** Progreso semanal (Sprint 3.8) — fuente de verdad del estado visual del Acero. */
  weekProgress: WeekProgress;
  aceroState: AceroState;
  streak: number;
}
