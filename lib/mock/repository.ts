import { EXERCISE_CATALOG, MEAL_CATALOG, ROUTINE, ROUTINE_SPLITS, ROUTINE_TEMPLATES, ROUTINES } from "./data";
import {
  AceroState,
  AddExerciseInput,
  CreateRoutineInput,
  DashboardSummary,
  DayPointer,
  DaySession,
  DaySummary,
  ExerciseCatalogItem,
  ExerciseHistoryEntry,
  ExercisePrescription,
  ExerciseProgressDelta,
  MealCatalogItem,
  MealLogEntry,
  NutritionProgress,
  Routine,
  RoutineDayPlan,
  RoutineExecution,
  RoutineSplitCategory,
  RoutineTemplate,
  RoutineWeek,
  SetEntry,
  UpdateExerciseInput,
  UpdateRoutineInfoInput,
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
const CUSTOM_ROUTINES_KEY = "forja.routines.custom";
const EXECUTIONS_KEY_PREFIX = "forja.executions.";
const FAVORITE_EXERCISES_KEY = "forja.exercises.favorites";

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

/**
 * Sprint 4.6.1 — Borra todas las keys de localStorage que empiecen con
 * `prefix`. Hace falta porque el progreso por día (`forja.session.`) y
 * las ejecuciones archivadas (`forja.executions.`) no viven en un único
 * array (como las rutinas), sino en una key por día/semana — así que
 * "borrar todo lo de esta rutina" significa enumerar y eliminar cada key
 * suya, no sobrescribir un solo valor. Junta las keys primero y recién
 * después las borra, para no mutar `localStorage` mientras se recorre
 * por índice.
 */
function removeKeysWithPrefix(prefix: string): void {
  if (!isBrowser()) return;
  const keysToRemove: string[] = [];
  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i);
    if (key && key.startsWith(prefix)) keysToRemove.push(key);
  }
  keysToRemove.forEach((key) => window.localStorage.removeItem(key));
}

/* ------------------------------------------------------------------ */
/* Catálogo: rutina / semanas / días / ejercicios                      */
/* ------------------------------------------------------------------ */

/**
 * Sprint 4.0 — rutinas creadas por el usuario desde /entreno/nueva, sin
 * tocar Supabase todavía: viven en localStorage, separadas de las
 * rutinas base de data.ts (que nunca se escriben, solo se leen).
 */
function getCustomRoutines(): Routine[] {
  return readJSON<Routine[]>(CUSTOM_ROUTINES_KEY, []);
}

/**
 * Sprint 4.6 — Igual que `buildEmptyWeeks` (mismos ids `semana-N`/`dia-N`,
 * sin ejercicios), pero aplicando los nombres sugeridos de una plantilla
 * como `displayName` de semana y día (Sprint 4.4 — campo aditivo, con
 * fallback a "Semana N"/"Día N" si el usuario lo borra después). Los
 * nombres de día se repiten idénticos en cada semana, tal como los
 * define la plantilla. No agrega ningún ejercicio.
 */
function buildTemplateWeeks(routine: Routine, weekNames: string[], dayNames: string[]): RoutineWeek[] {
  return Array.from({ length: routine.weeksCount }, (_, weekIndex) => {
    const weekNumber = weekIndex + 1;
    const weekId = `semana-${weekNumber}`;
    return {
      id: weekId,
      routineId: routine.id,
      number: weekNumber,
      label: `Semana ${weekNumber}`,
      displayName: weekNames[weekIndex] || undefined,
      days: Array.from({ length: routine.daysPerWeek }, (_, dayIndex) => ({
        id: `dia-${dayIndex + 1}`,
        weekId,
        routineId: routine.id,
        order: dayIndex + 1,
        name: `Día ${dayIndex + 1}`,
        displayName: dayNames[dayIndex] || undefined,
        exercises: [],
      })),
    };
  });
}

/**
 * Crea una rutina propia con los 5 campos del formulario. Queda con
 * `weeks: []` (sin ejercicios todavía) — el catálogo ya sabe mostrar
 * rutinas vacías así, igual que Running Base/Básquet Inicial/Hipertrofia
 * Full Body.
 *
 * Sprint 4.6 — Si `input.weekNames`/`input.dayNames` vienen (elegidos
 * desde una plantilla FORJA) y su longitud coincide con
 * `weeksCount`/`daysPerWeek`, la rutina se crea con esas semanas/días ya
 * materializados (mismo `buildTemplateWeeks` de arriba) en vez de
 * `weeks: []`. Sin plantilla, el comportamiento es exactamente el mismo
 * de siempre.
 *
 * Sprint 4.9 — Si `input.splitCategory` viene, se guarda tal cual en
 * `Routine.splitCategory` — solo una etiqueta para que el constructor
 * pueda mostrar después "Grupo sugerido" por día (`getSuggestedMuscleGroup`).
 * No cambia `weeks`, ni ningún otro campo: es puramente informativo.
 */
export function createRoutine(input: CreateRoutineInput): Routine {
  const base: Routine = {
    id: `routine-custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: input.name,
    description: `Rutina personalizada · ${input.sport || "Sin deporte"} · ${input.goal || "Sin objetivo"}`,
    sport: input.sport,
    goal: input.goal,
    weeksCount: input.weeksCount,
    daysPerWeek: input.daysPerWeek,
    weeks: [],
    splitCategory: input.splitCategory,
  };

  const useTemplate =
    input.weekNames !== undefined &&
    input.dayNames !== undefined &&
    input.weekNames.length === input.weeksCount &&
    input.dayNames.length === input.daysPerWeek;

  const routine: Routine = useTemplate
    ? { ...base, weeks: buildTemplateWeeks(base, input.weekNames as string[], input.dayNames as string[]) }
    : base;

  writeJSON(CUSTOM_ROUTINES_KEY, [...getCustomRoutines(), routine]);
  return routine;
}

/** Sprint 4.6 — "Plantillas FORJA" fijas (sin ejercicios) para el flujo "Crear rutina". */
export function getRoutineTemplates(): RoutineTemplate[] {
  return ROUTINE_TEMPLATES;
}

/** Sprint 4.9 — distribuciones sugeridas de grupo muscular por categoría/cantidad de días, para la pantalla "Crear rutina". */
export function getRoutineSplits(): Record<RoutineSplitCategory, Record<number, string[]>> {
  return ROUTINE_SPLITS;
}

/**
 * Sprint 4.9 — Grupo muscular sugerido para el día `dayOrder` (1-based)
 * de UNA rutina ya conocida (`routine.splitCategory` + `routine.daysPerWeek`).
 * Función PURA (no lee localStorage) a propósito: las pantallas del
 * constructor ya tienen la rutina cargada en estado (fetcheada en su
 * propio `useEffect`, como toda lectura de localStorage en esta app), así
 * que pueden llamar a esta versión directamente en el render sin ningún
 * riesgo de mismatch de hidratación. Único lugar donde se hace este
 * lookup (`ROUTINE_SPLITS[categoría]?.[daysPerWeek]?.[orden-1]`) — nadie
 * más lo repite. Devuelve `null` si la rutina no eligió categoría, o si
 * esa categoría no tiene distribución definida para su cantidad de días
 * (ej: "Personalizada", o más de 6 días).
 */
export function getSuggestedMuscleGroupForRoutine(routine: Routine, dayOrder: number): string | null {
  if (!routine.splitCategory) return null;
  const distribution = ROUTINE_SPLITS[routine.splitCategory]?.[routine.daysPerWeek];
  return distribution?.[dayOrder - 1] ?? null;
}

/** Igual que `getSuggestedMuscleGroupForRoutine`, pero recibiendo `routineId` en vez de la rutina ya cargada (busca con `getRoutine`, que sí lee localStorage). */
export function getSuggestedMuscleGroup(routineId: string, dayOrder: number): string | null {
  return getSuggestedMuscleGroupForRoutine(getRoutine(routineId), dayOrder);
}

export function getRoutine(routineId: string = ROUTINE.id): Routine {
  // Con multi-rutina real (Sprint 3.4) esto sería un SELECT por routineId
  // contra la tabla `routines` — acá busca primero en el catálogo mock
  // (ROUTINES) y después en las rutinas creadas por el usuario.
  return getRoutines().find((r) => r.id === routineId) ?? ROUTINE;
}

/** Catálogo completo de rutinas (base + creadas por el usuario) — usado por la pantalla /entreno. */
export function getRoutines(): Routine[] {
  return [...ROUTINES, ...getCustomRoutines()];
}

/**
 * Sprint 4.1 — true si `routineId` es una de las rutinas de data.ts (El
 * Toro / stubs), nunca una creada por el usuario. Sirve como guarda para
 * no mutar jamás una rutina base desde el constructor de rutinas propias.
 */
export function isBaseRoutine(routineId: string): boolean {
  return ROUTINES.some((r) => r.id === routineId);
}

/**
 * Sprint 4.6.1 — Elimina por completo una rutina propia: la rutina en sí
 * (`CUSTOM_ROUTINES_KEY`, mismo array que usa `createRoutine`/las
 * mutaciones del constructor) y todos sus datos asociados que viven bajo
 * su propio `routineId` en localStorage — progreso por día
 * (`forja.session.{routineId}.*`) y ejecuciones de semana archivadas
 * (`forja.executions.{routineId}.*`) — para no dejar nada huérfano.
 *
 * Guarda de siempre: jamás toca una rutina base (`isBaseRoutine`), y
 * jamás toca `forja.meals.*`/`forja.history` (no son datos de una
 * rutina puntual, son de Nutrición/streak global — fuera de alcance).
 *
 * Devuelve `null` si `routineId` es una rutina base (guarda), `false` si
 * no existe ninguna rutina propia con ese id (no-op seguro), `true` si
 * se eliminó.
 */
export function deleteCustomRoutine(routineId: string): boolean | null {
  if (isBaseRoutine(routineId)) return null;

  const customRoutines = getCustomRoutines();
  const exists = customRoutines.some((r) => r.id === routineId);
  if (!exists) return false;

  writeJSON(
    CUSTOM_ROUTINES_KEY,
    customRoutines.filter((r) => r.id !== routineId)
  );

  removeKeysWithPrefix(`${SESSION_KEY_PREFIX}${routineId}.`);
  removeKeysWithPrefix(`${EXECUTIONS_KEY_PREFIX}${routineId}.`);

  return true;
}

/**
 * Sprint 4.6.2 — Renombra una rutina propia completa (el nombre de la
 * rutina, no el de una semana ni un día — para eso ya existen
 * `renameCustomRoutineWeek`/`renameCustomRoutineDay` desde Sprint 4.4).
 * Solo cambia `name`: semanas, ejercicios, progreso e historial no viven
 * en este campo, así que quedan intactos sin hacer nada especial.
 * Guarda de siempre (`isBaseRoutine`); nombre vacío/en blanco no hace
 * nada (devuelve `null`), igual que exige el formulario de creación.
 */
export function renameCustomRoutine(routineId: string, newName: string): Routine | null {
  if (isBaseRoutine(routineId)) return null;

  const trimmed = newName.trim();
  if (!trimmed) return null;

  const customRoutines = getCustomRoutines();
  const index = customRoutines.findIndex((r) => r.id === routineId);
  if (index === -1) return null;

  const updated: Routine = { ...customRoutines[index], name: trimmed };
  const nextCustomRoutines = [...customRoutines];
  nextCustomRoutines[index] = updated;
  writeJSON(CUSTOM_ROUTINES_KEY, nextCustomRoutines);
  return updated;
}

/**
 * Sprint 4.6.2 — Duplica una rutina propia completa: semanas, días y
 * ejercicios (series, reps, descanso, notas — todo), bajo un id nuevo y
 * el nombre "Copia de {nombre}". Clon profundo de `weeks` (no una
 * referencia compartida), y `routineId` de cada semana/día se reasigna
 * al id nuevo para no dejar ninguna referencia cruzada a la rutina
 * original. Nunca copia progreso, sesiones ni historial: esos datos
 * nunca vivieron dentro de `Routine.weeks` (viven aparte, en
 * `forja.session.*`/`forja.executions.*` keyed por routineId), así que
 * la copia — con un routineId propio — automáticamente no hereda nada
 * de eso sin necesidad de "no copiarlo" explícitamente.
 */
export function duplicateCustomRoutine(routineId: string): Routine | null {
  if (isBaseRoutine(routineId)) return null;

  const customRoutines = getCustomRoutines();
  const source = customRoutines.find((r) => r.id === routineId);
  if (!source) return null;

  const newId = `routine-custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  const duplicate: Routine = {
    ...source,
    id: newId,
    name: `Copia de ${source.name}`,
    weeks: source.weeks.map((week) => ({
      ...week,
      routineId: newId,
      days: week.days.map((day) => ({
        ...day,
        routineId: newId,
        exercises: day.exercises.map((exercise) => ({ ...exercise })),
      })),
    })),
  };

  writeJSON(CUSTOM_ROUTINES_KEY, [...customRoutines, duplicate]);
  return duplicate;
}

/**
 * Sprint 4.1 — esqueleto de semanas/días vacío (sin ejercicios) para una
 * rutina propia, a partir de `weeksCount`/`daysPerWeek` (ya cargados al
 * crearla en Sprint 4.0). Función pura: no escribe en localStorage, solo
 * la usa getWeeks() para poder mostrar Semana/Día antes de que exista el
 * primer ejercicio, y addExerciseToCustomRoutineDay() para materializarla
 * recién cuando hay algo real que guardar.
 */
function buildEmptyWeeks(routine: Routine): RoutineWeek[] {
  return Array.from({ length: routine.weeksCount }, (_, weekIndex) => {
    const weekNumber = weekIndex + 1;
    const weekId = `semana-${weekNumber}`;
    return {
      id: weekId,
      routineId: routine.id,
      number: weekNumber,
      label: `Semana ${weekNumber}`,
      days: Array.from({ length: routine.daysPerWeek }, (_, dayIndex) => ({
        id: `dia-${dayIndex + 1}`,
        weekId,
        routineId: routine.id,
        order: dayIndex + 1,
        name: `Día ${dayIndex + 1}`,
        exercises: [],
      })),
    };
  });
}

/**
 * Sprint 4.8 — Ajusta la cantidad de días de UNA semana a `daysPerWeek`
 * nuevo. Si sobran días, los recorta del final (se pierden sus
 * ejercicios — la confirmación de esto vive en la UI, acá solo se
 * ejecuta lo ya confirmado). Si faltan, agrega días vacíos nuevos al
 * final con el mismo esquema de ids que `buildEmptyWeeks`
 * (`dia-{N}`/"Día {N}") para que el resto del constructor (rename,
 * agregar ejercicio, etc.) los trate exactamente igual que cualquier
 * otro día. Los días que se conservan (`displayName`, ejercicios) no se
 * tocan.
 */
function resizeWeekDays(week: RoutineWeek, daysPerWeek: number): RoutineWeek {
  const currentDays = week.days;
  if (currentDays.length === daysPerWeek) return week;

  if (currentDays.length > daysPerWeek) {
    return { ...week, days: currentDays.slice(0, daysPerWeek) };
  }

  const extraDays: RoutineDayPlan[] = Array.from({ length: daysPerWeek - currentDays.length }, (_, i) => {
    const dayIndex = currentDays.length + i;
    return {
      id: `dia-${dayIndex + 1}`,
      weekId: week.id,
      routineId: week.routineId,
      order: dayIndex + 1,
      name: `Día ${dayIndex + 1}`,
      exercises: [],
    };
  });

  return { ...week, days: [...currentDays, ...extraDays] };
}

/**
 * Sprint 4.8 — Ajusta semanas y días de una rutina propia a los nuevos
 * `weeksCount`/`daysPerWeek` del editor de información general. Primero
 * ajusta los días de cada semana YA existente (`resizeWeekDays`, arriba);
 * después, si faltan semanas, agrega semanas nuevas completas (mismo
 * esquema de `buildEmptyWeeks`); si sobran, recorta del final. Semanas y
 * días que se conservan no pierden nada (displayName, ejercicios).
 */
function resizeRoutineWeeks(routine: Routine, weeks: RoutineWeek[], weeksCount: number, daysPerWeek: number): RoutineWeek[] {
  const resized = weeks.map((week) => resizeWeekDays(week, daysPerWeek));

  if (resized.length === weeksCount) return resized;

  if (resized.length > weeksCount) {
    return resized.slice(0, weeksCount);
  }

  const extraWeeks: RoutineWeek[] = Array.from({ length: weeksCount - resized.length }, (_, i) => {
    const weekNumber = resized.length + i + 1;
    const weekId = `semana-${weekNumber}`;
    return {
      id: weekId,
      routineId: routine.id,
      number: weekNumber,
      label: `Semana ${weekNumber}`,
      days: Array.from({ length: daysPerWeek }, (_, dayIndex) => ({
        id: `dia-${dayIndex + 1}`,
        weekId,
        routineId: routine.id,
        order: dayIndex + 1,
        name: `Día ${dayIndex + 1}`,
        exercises: [],
      })),
    };
  });

  return [...resized, ...extraWeeks];
}

/**
 * Sprint 4.8 — "✏️ Editar rutina": cambia nombre/objetivo/deporte/
 * semanas/días de una rutina propia. Si aumentan semanas o días, genera
 * automáticamente las nuevas vacías (`resizeRoutineWeeks`); si
 * disminuyen, recorta lo que sobra (la confirmación de "se va a perder
 * contenido" es responsabilidad de la UI — acá se asume ya confirmado).
 * `description` se recalcula con el mismo formato que usa `createRoutine`
 * para no quedar desactualizada si cambia el objetivo o el deporte.
 * Devuelve `null` si es una rutina base (guarda), o si el nombre queda
 * vacío o semanas/días quedan en 0 (mismas validaciones que crear).
 */
export function updateCustomRoutineInfo(routineId: string, input: UpdateRoutineInfoInput): Routine | null {
  if (isBaseRoutine(routineId)) return null;

  const trimmedName = input.name.trim();
  if (!trimmedName || input.weeksCount < 1 || input.daysPerWeek < 1) return null;

  const customRoutines = getCustomRoutines();
  const index = customRoutines.findIndex((r) => r.id === routineId);
  if (index === -1) return null;

  const routine = customRoutines[index];
  const currentWeeks = routine.weeks.length > 0 ? routine.weeks : buildEmptyWeeks(routine);
  const nextWeeks = resizeRoutineWeeks(routine, currentWeeks, input.weeksCount, input.daysPerWeek);

  const trimmedGoal = input.goal.trim();
  const trimmedSport = input.sport.trim();

  const updated: Routine = {
    ...routine,
    name: trimmedName,
    goal: trimmedGoal,
    sport: trimmedSport,
    description: `Rutina personalizada · ${trimmedSport || "Sin deporte"} · ${trimmedGoal || "Sin objetivo"}`,
    weeksCount: input.weeksCount,
    daysPerWeek: input.daysPerWeek,
    weeks: nextWeeks,
  };

  const nextCustomRoutines = [...customRoutines];
  nextCustomRoutines[index] = updated;
  writeJSON(CUSTOM_ROUTINES_KEY, nextCustomRoutines);
  return updated;
}

export function getWeeks(routineId?: string): RoutineWeek[] {
  const routine = getRoutine(routineId);
  return routine.weeks.length > 0 ? routine.weeks : buildEmptyWeeks(routine);
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

/** Biblioteca completa de ejercicios (Sprint 4.1) — misma fuente que ya usa toda la app, sin duplicarla. */
export function getExerciseCatalog(): ExerciseCatalogItem[] {
  return EXERCISE_CATALOG;
}

/**
 * Sprint 4.8 — Favoritos de la biblioteca de ejercicios: una simple lista
 * de `exerciseId` en localStorage, aparte de `EXERCISE_CATALOG` (que no
 * se toca ni se duplica — esto es solo una marca sobre ejercicios que ya
 * existen ahí). No está atado a ninguna rutina: es una preferencia del
 * usuario, válida en cualquier constructor.
 */
function getFavoriteExerciseIds(): string[] {
  return readJSON<string[]>(FAVORITE_EXERCISES_KEY, []);
}

export function isFavoriteExercise(exerciseId: string): boolean {
  return getFavoriteExerciseIds().includes(exerciseId);
}

export function toggleFavoriteExercise(exerciseId: string): string[] {
  const current = getFavoriteExerciseIds();
  const next = current.includes(exerciseId)
    ? current.filter((id) => id !== exerciseId)
    : [...current, exerciseId];
  writeJSON(FAVORITE_EXERCISES_KEY, next);
  return next;
}

/** Sprint 4.8 — set de ids favoritos, para que la pantalla de filtros lo consulte sin recalcular nada. */
export function getFavoriteExerciseIdSet(): Set<string> {
  return new Set(getFavoriteExerciseIds());
}

/**
 * Sprint 4.2 — helper interno compartido por todas las mutaciones del
 * constructor de rutinas propias (agregar/editar/eliminar/duplicar/
 * reordenar ejercicios de un día). Centraliza: la guarda de "nunca tocar
 * una rutina base" (`isBaseRoutine`, así "El Toro" y los stubs de data.ts
 * quedan siempre intactos), materializar el esqueleto de semanas/días si
 * todavía no existía, ubicar la semana/día correcto, y la escritura final
 * en localStorage. Cada función pública de abajo solo define CÓMO cambia
 * la lista de ejercicios de ese día puntual.
 */
function mutateCustomRoutineDay(
  routineId: string,
  weekId: string,
  dayId: string,
  mutate: (exercises: ExercisePrescription[]) => ExercisePrescription[]
): Routine | null {
  if (isBaseRoutine(routineId)) return null;

  const customRoutines = getCustomRoutines();
  const routineIndex = customRoutines.findIndex((r) => r.id === routineId);
  if (routineIndex === -1) return null;

  const routine = customRoutines[routineIndex];
  const weeks = routine.weeks.length > 0 ? routine.weeks : buildEmptyWeeks(routine);

  let dayFound = false;
  const nextWeeks = weeks.map((week) => {
    if (week.id !== weekId) return week;
    return {
      ...week,
      days: week.days.map((day) => {
        if (day.id !== dayId) return day;
        dayFound = true;
        return { ...day, exercises: mutate(day.exercises) };
      }),
    };
  });

  if (!dayFound) return null;

  const updatedRoutine: Routine = { ...routine, weeks: nextWeeks };
  const nextCustomRoutines = [...customRoutines];
  nextCustomRoutines[routineIndex] = updatedRoutine;
  writeJSON(CUSTOM_ROUTINES_KEY, nextCustomRoutines);

  return updatedRoutine;
}

/** Reasigna `order` 1..N según la posición real en el arreglo — mantiene el orden siempre prolijo tras borrar/duplicar/mover. */
function resequence(exercises: ExercisePrescription[]): ExercisePrescription[] {
  return exercises.map((exercise, index) => ({ ...exercise, order: index + 1 }));
}

/** Agrega un ejercicio al día de una rutina PROPIA (biblioteca existente, sin duplicarla). */
export function addExerciseToCustomRoutineDay(
  routineId: string,
  weekId: string,
  dayId: string,
  input: AddExerciseInput
): Routine | null {
  return mutateCustomRoutineDay(routineId, weekId, dayId, (exercises) => [
    ...exercises,
    {
      exerciseId: input.exerciseId,
      order: exercises.length + 1,
      targetSets: input.targetSets,
      targetReps: input.targetReps,
      restSeconds: input.restSeconds,
    },
  ]);
}

/**
 * Sprint 4.2 — Edita series/reps/descanso/notas de un ejercicio ya
 * agregado. El nombre no se edita (es solo lectura en la pantalla) porque
 * sigue viniendo de la biblioteca (`getExercise(exerciseId)`), no se
 * duplica acá. `order` identifica cuál de los ejercicios del día se
 * edita (necesario porque un mismo ejercicio puede estar duplicado).
 */
export function updateCustomRoutineExercise(
  routineId: string,
  weekId: string,
  dayId: string,
  order: number,
  patch: UpdateExerciseInput
): Routine | null {
  return mutateCustomRoutineDay(routineId, weekId, dayId, (exercises) =>
    exercises.map((exercise) =>
      exercise.order === order
        ? {
            ...exercise,
            targetSets: patch.targetSets,
            targetReps: patch.targetReps,
            restSeconds: patch.restSeconds,
            notes: patch.notes,
          }
        : exercise
    )
  );
}

/** Elimina un único ejercicio del día (por `order`) y reordena el resto para que quede 1..N sin huecos. */
export function deleteCustomRoutineExercise(
  routineId: string,
  weekId: string,
  dayId: string,
  order: number
): Routine | null {
  return mutateCustomRoutineDay(routineId, weekId, dayId, (exercises) =>
    resequence(exercises.filter((exercise) => exercise.order !== order))
  );
}

/** Duplica un ejercicio (con todos sus datos) inmediatamente debajo del original. */
export function duplicateCustomRoutineExercise(
  routineId: string,
  weekId: string,
  dayId: string,
  order: number
): Routine | null {
  return mutateCustomRoutineDay(routineId, weekId, dayId, (exercises) => {
    const index = exercises.findIndex((exercise) => exercise.order === order);
    if (index === -1) return exercises;
    const copy: ExercisePrescription = { ...exercises[index] };
    const next = [...exercises.slice(0, index + 1), copy, ...exercises.slice(index + 1)];
    return resequence(next);
  });
}

/** Mueve un ejercicio una sola posición (arriba o abajo) — sin drag & drop. */
export function moveCustomRoutineExercise(
  routineId: string,
  weekId: string,
  dayId: string,
  order: number,
  direction: "up" | "down"
): Routine | null {
  return mutateCustomRoutineDay(routineId, weekId, dayId, (exercises) => {
    const index = exercises.findIndex((exercise) => exercise.order === order);
    if (index === -1) return exercises;
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= exercises.length) return exercises;
    const next = [...exercises];
    [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
    return resequence(next);
  });
}

/**
 * Sprint 4.4 — helper general (más amplio que `mutateCustomRoutineDay`,
 * que solo tocaba la lista de ejercicios de UN día): permite reescribir
 * las semanas completas de una rutina propia. Sirve para renombrar
 * semanas o días, y para duplicar/vaciar un día (duplicar puede
 * involucrar dos días a la vez, así que no entra en el helper anterior).
 * Misma guarda de siempre (`isBaseRoutine`) y mismo patrón de
 * materializar el esqueleto si hacía falta.
 */
function mutateCustomRoutineWeeks(
  routineId: string,
  mutate: (weeks: RoutineWeek[]) => RoutineWeek[]
): Routine | null {
  if (isBaseRoutine(routineId)) return null;

  const customRoutines = getCustomRoutines();
  const routineIndex = customRoutines.findIndex((r) => r.id === routineId);
  if (routineIndex === -1) return null;

  const routine = customRoutines[routineIndex];
  const weeks = routine.weeks.length > 0 ? routine.weeks : buildEmptyWeeks(routine);

  const updatedRoutine: Routine = { ...routine, weeks: mutate(weeks) };
  const nextCustomRoutines = [...customRoutines];
  nextCustomRoutines[routineIndex] = updatedRoutine;
  writeJSON(CUSTOM_ROUTINES_KEY, nextCustomRoutines);

  return updatedRoutine;
}

/**
 * Sprint 4.4 — Renombra una semana propia (ej: "Adaptación"). Un nombre
 * vacío/en blanco borra el `displayName` y la pantalla vuelve a mostrar
 * el genérico ("Semana N") — no hace falta un botón aparte para "quitar
 * el nombre".
 */
export function renameCustomRoutineWeek(routineId: string, weekId: string, displayName: string): Routine | null {
  const trimmed = displayName.trim();
  return mutateCustomRoutineWeeks(routineId, (weeks) =>
    weeks.map((week) => (week.id !== weekId ? week : { ...week, displayName: trimmed || undefined }))
  );
}

/** Igual que `renameCustomRoutineWeek`, pero para un día propio (ej: "Empuje", "Pull"). */
export function renameCustomRoutineDay(
  routineId: string,
  weekId: string,
  dayId: string,
  displayName: string
): Routine | null {
  const trimmed = displayName.trim();
  return mutateCustomRoutineWeeks(routineId, (weeks) =>
    weeks.map((week) =>
      week.id !== weekId
        ? week
        : {
            ...week,
            days: week.days.map((day) => (day.id !== dayId ? day : { ...day, displayName: trimmed || undefined })),
          }
    )
  );
}

/**
 * Sprint 4.8 — Igual que lo que hacía `duplicateCustomRoutineDay`
 * (Sprint 4.4), pero sin exigir que origen y destino estén en la misma
 * semana: copia únicamente la PLANIFICACIÓN de `sourceDayId` (series,
 * reps, descanso, notas — todo) a `targetDayId`, reemplazando los
 * ejercicios que tuviera el destino. Nunca copia progreso, sesiones ni
 * historial: viven aparte, keyed por semana/día, y esta función solo
 * toca `Routine.weeks`. No hace nada si origen y destino son el mismo
 * día de la misma semana.
 */
export function copyExercisesFromDay(
  routineId: string,
  sourceWeekId: string,
  sourceDayId: string,
  targetWeekId: string,
  targetDayId: string
): Routine | null {
  if (sourceWeekId === targetWeekId && sourceDayId === targetDayId) return null;

  return mutateCustomRoutineWeeks(routineId, (weeks) => {
    const sourceWeek = weeks.find((week) => week.id === sourceWeekId);
    const sourceDay = sourceWeek?.days.find((day) => day.id === sourceDayId);
    if (!sourceDay) return weeks;

    return weeks.map((week) => {
      if (week.id !== targetWeekId) return week;
      return {
        ...week,
        days: week.days.map((day) =>
          day.id !== targetDayId ? day : { ...day, exercises: sourceDay.exercises.map((exercise) => ({ ...exercise })) }
        ),
      };
    });
  });
}

/**
 * Sprint 4.4 — Copia TODOS los ejercicios de `sourceDayId` a
 * `targetDayId`, dentro de la misma semana. Sprint 4.8 — pasa a ser un
 * caso particular de `copyExercisesFromDay` (mismo `weekId` de origen y
 * destino), para no duplicar la lógica de copiado.
 */
export function duplicateCustomRoutineDay(
  routineId: string,
  weekId: string,
  sourceDayId: string,
  targetDayId: string
): Routine | null {
  return copyExercisesFromDay(routineId, weekId, sourceDayId, weekId, targetDayId);
}

/** Vacía un día: borra todos sus ejercicios sin borrar el día ni la semana. */
export function clearCustomRoutineDay(routineId: string, weekId: string, dayId: string): Routine | null {
  return mutateCustomRoutineDay(routineId, weekId, dayId, () => []);
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

/* ------------------------------------------------------------------ */
/* Ejecuciones de rutina (Sprint 4.3)                                   */
/* ------------------------------------------------------------------ */

function weekExecutionsKey(routineId: string, weekId: string): string {
  return `${EXECUTIONS_KEY_PREFIX}${routineId}.${weekId}`;
}

function getWeekExecutions(weekId: string, routineId: string = ROUTINE.id): RoutineExecution[] {
  return readJSON<RoutineExecution[]>(weekExecutionsKey(routineId, weekId), []);
}

/** Cuántas veces se completó esta semana hasta ahora — para mostrar "Ejecución #N" en pantallas futuras. */
export function getWeekExecutionCount(weekId: string, routineId: string = ROUTINE.id): number {
  return getWeekExecutions(weekId, routineId).length;
}

/**
 * Sprint 4.3 — Archiva la semana actual como una ejecución más (#1, #2,
 * #3...) SOLO si sus 5 días ya están completos. Guarda una copia (no una
 * referencia) de cada `DaySession` de esos días, tal como están en ese
 * momento — así "Reiniciar semana" puede limpiar el progreso en vivo sin
 * perder jamás estos registros. Nunca sobrescribe ejecuciones anteriores:
 * siempre agrega una nueva al final de la lista.
 */
export function archiveWeekExecution(weekId: string, routineId: string = ROUTINE.id): RoutineExecution | null {
  const week = getWeek(weekId, routineId);
  if (!week || week.days.length === 0) return null;

  const allComplete = week.days.every((day) => isDayCompleted(weekId, day.id, routineId));
  if (!allComplete) return null;

  const existing = getWeekExecutions(weekId, routineId);
  const execution: RoutineExecution = {
    id: `exec-${routineId}-${weekId}-${Date.now()}`,
    routineId,
    weekId,
    executionNumber: existing.length + 1,
    completedAt: new Date().toISOString(),
    sessions: week.days.map((day) => getDaySession(weekId, day.id, routineId)),
  };

  writeJSON(weekExecutionsKey(routineId, weekId), [...existing, execution]);
  return execution;
}

/**
 * Sprint 4.3 — "Reiniciar semana": limpia el progreso EN VIVO de los 5
 * días (checks, series hechas, `finishedAt`) para que la semana quede
 * lista para correrse de nuevo, reutilizando exactamente el mismo
 * `emptySession()`/`writeSession()` que ya usa el resto del repositorio
 * — no borra nada de lo ya archivado por `archiveWeekExecution()`, ni
 * toca el catálogo/estructura de la rutina (ejercicios, semanas, días).
 */
export function resetWeekProgress(weekId: string, routineId: string = ROUTINE.id): void {
  const week = getWeek(weekId, routineId);
  if (!week) return;
  for (const day of week.days) {
    writeSession(emptySession(weekId, day.id, routineId));
  }
}

/** El `finishedAt` más reciente entre un grupo de sesiones, o null si ninguna está finalizada. */
function latestFinishedAt(sessions: DaySession[]): string | null {
  const timestamps = sessions.map((s) => s.finishedAt).filter((t): t is string => Boolean(t));
  if (timestamps.length === 0) return null;
  return timestamps.sort().at(-1) ?? null;
}

/**
 * Sprint 4.3.1 — True si el estado EN VIVO actual de la semana (5/5, con
 * sus `finishedAt` puntuales) ya quedó archivado como la última ejecución
 * registrada. Compara el `finishedAt` más reciente en vivo contra el de
 * esa última ejecución: si coinciden, ya se archivó (por ejemplo, el
 * usuario terminó el día 5, ya se auto-archivó en Sprint 4.3, y ahora
 * solo está reiniciando desde /entreno/[weekId] sin haber tocado nada
 * más) — evita crear una ejecución duplicada con los mismos datos.
 */
function isCurrentCompletionArchived(weekId: string, routineId: string = ROUTINE.id): boolean {
  const week = getWeek(weekId, routineId);
  if (!week || week.days.length === 0) return false;

  const liveLatest = latestFinishedAt(week.days.map((day) => getDaySession(weekId, day.id, routineId)));
  if (!liveLatest) return false;

  const executions = getWeekExecutions(weekId, routineId);
  const lastExecution = executions.at(-1);
  if (!lastExecution) return false;

  return latestFinishedAt(lastExecution.sessions) === liveLatest;
}

/**
 * Sprint 4.3.1 — "Reiniciar semana" inteligente: si la semana está 5/5 y
 * ese estado todavía no fue archivado, la archiva (`archiveWeekExecution`,
 * sin duplicar); en cualquier caso, siempre limpia el progreso en vivo
 * (`resetWeekProgress`). Reutiliza ambas funciones tal cual — no agrega
 * ninguna escritura nueva, solo decide en qué orden llamarlas.
 */
export function restartWeek(weekId: string, routineId: string = ROUTINE.id): { archived: boolean } {
  const completion = getWeekCompletion(weekId, routineId);
  let archived = false;

  if (completion.totalDays > 0 && completion.completedDays === completion.totalDays) {
    if (!isCurrentCompletionArchived(weekId, routineId)) {
      archived = Boolean(archiveWeekExecution(weekId, routineId));
    }
  }

  resetWeekProgress(weekId, routineId);
  return { archived };
}

/**
 * Sprint 4.3.1 — Base para el futuro "Centro de Rendimiento": expone el
 * historial completo de ejecuciones de una semana (no solo el conteo),
 * sin agregar ninguna fuente de datos nueva — son las mismas
 * `RoutineExecution` que ya archiva `archiveWeekExecution()`. De acá van
 * a poder salir en el futuro cosas como mejor peso levantado, más
 * repeticiones o tiempo promedio por semana, calculándolas sobre estos
 * mismos datos — todavía sin UI ni cálculos, solo el acceso.
 */
export function getWeekExecutionHistory(weekId: string, routineId: string = ROUTINE.id): RoutineExecution[] {
  return getWeekExecutions(weekId, routineId);
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

/** Sprint 4.3 — mismas sesiones que arriba, pero rescatadas de ejecuciones ya archivadas (semanas reiniciadas incluidas). */
function getAllArchivedSessions(routineId: string = ROUTINE.id): DaySession[] {
  const sessions: DaySession[] = [];
  for (const week of getWeeks(routineId)) {
    for (const execution of getWeekExecutions(week.id, routineId)) {
      sessions.push(...execution.sessions);
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
 *
 * Sprint 4.3 — busca tanto en las sesiones EN VIVO como en las ya
 * ARCHIVADAS por `archiveWeekExecution()`. Así, después de "Reiniciar
 * semana" (que limpia las sesiones en vivo de esa semana), "Último
 * entrenamiento" sigue encontrando y comparando contra la última
 * ejecución terminada, en vez de perder el historial.
 *
 * El `excludeWeekId`/`excludeDayId` (para no comparar un día contra sí
 * mismo) solo se aplica a las sesiones EN VIVO: como cada ejecución
 * reutiliza los mismos ids de semana/día (siempre "semana-1"/"dia-1",
 * etc.), una sesión ARCHIVADA de una ejecución anterior nunca es "la
 * misma sesión" que se está viendo ahora, aunque comparta esos ids — es
 * justamente la comparación que se busca al repetir una semana.
 */
export function getExerciseHistory(
  exerciseId: string,
  excludeWeekId?: string,
  excludeDayId?: string,
  routineId: string = ROUTINE.id
): ExerciseHistoryEntry | null {
  const liveCandidates = getAllStartedSessions(routineId)
    .filter((s) => s.finishedAt)
    .filter((s) => !(s.weekId === excludeWeekId && s.dayId === excludeDayId));
  const archivedCandidates = getAllArchivedSessions(routineId).filter((s) => s.finishedAt);

  const candidates = [...liveCandidates, ...archivedCandidates].sort((a, b) =>
    (b.finishedAt ?? "").localeCompare(a.finishedAt ?? "")
  );

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

/**
 * Sprint 3.9 — Compara el registro que el usuario está tipeando ahora
 * mismo (todavía sin marcar `done`, porque eso recién pasa al finalizar
 * el día — Sprint 3.7) contra `getExerciseHistory()` — a diferencia de
 * `getExerciseProgressDelta()` de arriba, que solo mira series ya hechas
 * de la sesión de hoy. Pensada para la pantalla de registro: apenas el
 * usuario carga peso/reps, ya puede ver si mejoró, empeoró o repitió
 * respecto a la última vez.
 */
export function compareExerciseToHistory(
  current: { weight: number | null; reps: number | null },
  history: ExerciseHistoryEntry | null
): ExerciseProgressDelta {
  if (!history || current.weight == null || current.reps == null || history.weight == null || history.reps == null) {
    return { kind: null, value: 0 };
  }

  if (current.weight !== history.weight) {
    return { kind: "weight", value: Math.round((current.weight - history.weight) * 10) / 10 };
  }

  if (current.reps !== history.reps) {
    return { kind: "reps", value: current.reps - history.reps };
  }

  return { kind: "equal", value: 0 };
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
