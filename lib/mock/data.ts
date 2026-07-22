import { ExerciseCatalogItem, ExercisePrescription, MealCatalogItem, Routine, RoutineDayPlan, RoutineWeek } from "./types";

/**
 * Catálogo fijo. Refleja exactamente la rutina real de Luquita ("El Toro",
 * Plan_El_Toro_1) — 5 días, 6 ejercicios por día. `id` estable: cuando se
 * reemplace por tablas reales, estos mismos ids van a existir como filas.
 *
 * `videoUrl` es el único lugar del proyecto donde vive el link de técnica
 * de cada ejercicio — para cambiarlo alcanza con editar esta lista, no hay
 * ningún link hardcodeado dentro de un componente.
 */

export const EXERCISE_CATALOG: ExerciseCatalogItem[] = [
  // Día 1: Empuje / Hombro
  { id: "ex-press-plano-barra", name: "Press Plano con Barra", muscleGroup: "Pecho", videoUrl: "https://www.youtube.com/shorts/HzkHpIIo4IA" },
  { id: "ex-dominadas-prona", name: "Dominadas Prona", muscleGroup: "Espalda", videoUrl: "https://www.youtube.com/shorts/ZDNmQXCfbmM" },
  { id: "ex-hombro-z-press", name: "Hombros Z Press", muscleGroup: "Hombro", videoUrl: "https://www.youtube.com/shorts/FUJPvAD9jOo" },
  { id: "ex-frances-polea-trasnuca", name: "Francés Polea Trasnuca", muscleGroup: "Tríceps", videoUrl: "https://www.youtube.com/shorts/5Okf9XhBhJk" },
  { id: "ex-biceps-neutra-barra", name: "Bíceps Toma Neutra Barra", muscleGroup: "Bíceps", videoUrl: "https://www.youtube.com/watch?v=kxWh3ZjROxE" },
  { id: "ex-laterales-frontales-mancuerna", name: "Laterales + Frontales Mancuerna", muscleGroup: "Hombro", videoUrl: "https://www.youtube.com/shorts/tCihfHyR2Ts" },

  // Día 2: Pecho / Espalda + Core
  { id: "ex-maquina-pecho-1-brazo", name: "Máquina de Pecho 1 Brazo", muscleGroup: "Pecho", videoUrl: "https://www.youtube.com/shorts/zmRlND0jdqk" },
  { id: "ex-remo-menton-1-pie", name: "Remo al Mentón 1 Pie", muscleGroup: "Espalda", videoUrl: "https://www.youtube.com/shorts/uvzghA2eXcU" },
  { id: "ex-remo-t-semi-prono", name: "Remo T Semi Prono", muscleGroup: "Espalda", videoUrl: "https://www.youtube.com/shorts/uLr8HcW_7ig" },
  { id: "ex-biceps-media-esfera-barra", name: "Bíceps en Media Esfera con Barra", muscleGroup: "Bíceps", videoUrl: "https://www.youtube.com/shorts/GGJe2TDQAbw" },
  { id: "ex-t2b-plancha-antebrazo", name: "T2B Estricto + Plancha Antebrazo", muscleGroup: "Core", videoUrl: "https://www.youtube.com/shorts/B-B4I_LEQ58" },
  { id: "ex-press-frances-w-acostado", name: "Press Francés Barra W Acostado (Rompecráneo)", muscleGroup: "Tríceps", videoUrl: "https://www.youtube.com/shorts/CAUWI4sNPKk" },

  // Día 3: Hombro / Pecho + Potencia
  { id: "ex-press-hombro-parado-trasnuca", name: "Press de Hombro Parado Trasnuca", muscleGroup: "Hombro", videoUrl: "https://www.youtube.com/shorts/lgjsva8XsEw" },
  { id: "ex-press-pecho-mancuerna-1-brazo-puente", name: "Press Pecho Mancuerna 1 Brazo (Puente Cadera)", muscleGroup: "Pecho", videoUrl: "https://www.youtube.com/shorts/O7PMT-nWNTY" },
  { id: "ex-remo-1-brazo-ghd", name: "Remo 1 Brazo en GHD", muscleGroup: "Espalda", videoUrl: "https://www.youtube.com/shorts/4riS8gYu-3M" },
  { id: "ex-hang-power-clean", name: "Hang Power Clean 🏀", muscleGroup: "Cuerpo completo / Potencia", videoUrl: "https://www.youtube.com/shorts/_q0dkHb89us" },
  { id: "ex-biceps-pared-mancuernas-supino", name: "Bíceps Apoyando Espalda en Pared, Mancuernas Supino", muscleGroup: "Bíceps", videoUrl: "https://www.youtube.com/shorts/5zB4KI7OaaY" },
  { id: "ex-fondos-anillas", name: "Fondos en Anillas", muscleGroup: "Tríceps / Pecho", videoUrl: "https://www.youtube.com/shorts/5UUgrMWrEfI" },

  // Día 4: Espalda / Core Rotacional
  { id: "ex-press-landmine-estocada", name: "Press Landmine en Posición Estocada", muscleGroup: "Hombro / Core", videoUrl: "https://www.youtube.com/shorts/DHroGtml6MM" },
  { id: "ex-remo-renegado-mancuernas", name: "Remo Renegado con Mancuernas", muscleGroup: "Espalda / Core", videoUrl: "https://www.youtube.com/shorts/DZ17Zeu274s" },
  { id: "ex-australian-row-1-brazo", name: "Australian Row 1 Brazo", muscleGroup: "Espalda", videoUrl: "https://www.youtube.com/shorts/I4DR93poqt8" },
  { id: "ex-remo-plancha-lateral-1-brazo", name: "Remo en Plancha Lateral 1 Brazo", muscleGroup: "Core", videoUrl: "https://www.youtube.com/watch?v=Xv9QBl5LB0A" },
  { id: "ex-pull-over-media-esfera-mancuerna", name: "Pull Over en Media Esfera con Mancuerna", muscleGroup: "Espalda / Pecho", videoUrl: "https://www.youtube.com/shorts/k_cFbm-KXtI" },
  { id: "ex-vuelos-posteriores-peck-deck", name: "Vuelos Posteriores en Peck Deck", muscleGroup: "Hombro", videoUrl: "https://www.youtube.com/shorts/bcWuQqr_0PU" },

  // Día 5: Espalda / Potencia + Hombro
  { id: "ex-remo-barra-landmine", name: "Remo con Barra Landmine", muscleGroup: "Espalda", videoUrl: "https://www.youtube.com/watch?v=_bFf2_7iPNQ" },
  { id: "ex-split-jerk", name: "Split Jerk 🏀", muscleGroup: "Cuerpo completo / Potencia", videoUrl: "https://www.youtube.com/shorts/kf-lQamAAxs" },
  { id: "ex-rope-climb-manos", name: "Rope Climb con las Manos 🏀", muscleGroup: "Cuerpo completo / Potencia", videoUrl: "https://www.youtube.com/watch?v=iY0qSQxvDN4" },
  { id: "ex-face-pull-soga", name: "Cable Face Pull Soga", muscleGroup: "Hombro", videoUrl: "https://www.youtube.com/shorts/lbt7obncwVs" },
  { id: "ex-aperturas-peck-deck", name: "Aperturas Peck Deck", muscleGroup: "Pecho", videoUrl: "https://www.youtube.com/shorts/Y4jzm2c3szA" },
  { id: "ex-biceps-barra-prona", name: "Bíceps con Barra Toma Prona", muscleGroup: "Bíceps", videoUrl: "https://www.youtube.com/shorts/-lJFZ5cRaRM" },
];

/** Objetivo (series x reps) de un ejercicio para una semana puntual. */
interface WeekTarget {
  sets: number;
  reps: string;
}

/**
 * Ejercicio dentro de la plantilla de un día, con su progresión semana a
 * semana ya definida — nada de esto se calcula ni se infiere, sale
 * directo de la rutina original (Plan_El_Toro_1). `progression[i]` es el
 * objetivo de la semana `i + 1`.
 */
interface DayExerciseTemplate {
  exerciseId: string;
  order: number;
  progression: WeekTarget[];
}

/** Progresión estándar del plan: mismas 4 series todas las semanas, reps variable. */
function progression(reps1: string, reps2: string, reps3: string, reps4: string, sets = 4): WeekTarget[] {
  return [reps1, reps2, reps3, reps4].map((reps) => ({ sets, reps }));
}

function dayExercise(exerciseId: string, order: number, progressionForExercise: WeekTarget[]): DayExerciseTemplate {
  return { exerciseId, order, progression: progressionForExercise };
}

/**
 * Plantilla del split semanal (5 días, 6 ejercicios cada uno), con la
 * progresión real de series/reps semana a semana tal como está definida en
 * la rutina original. Se reutiliza para generar las 4 semanas de la
 * rutina activa sin duplicar la data: cada semana resuelve su propio
 * objetivo (`resolvePrescription`) a partir de esta misma plantilla.
 */
const DAY_TEMPLATES: Array<{ name: string; exercises: DayExerciseTemplate[] }> = [
  {
    name: "Empuje / Hombro",
    exercises: [
      dayExercise("ex-press-plano-barra", 1, progression("10", "8", "6", "12")),
      dayExercise("ex-dominadas-prona", 2, progression("10", "8", "6", "12")),
      dayExercise("ex-hombro-z-press", 3, progression("10", "8", "6", "12")),
      dayExercise("ex-frances-polea-trasnuca", 4, progression("15", "12", "10", "15")),
      dayExercise("ex-biceps-neutra-barra", 5, progression("15", "12", "10", "15")),
      dayExercise("ex-laterales-frontales-mancuerna", 6, progression("15", "12", "10", "15")),
    ],
  },
  {
    name: "Pecho / Espalda + Core",
    exercises: [
      dayExercise("ex-maquina-pecho-1-brazo", 1, progression("10", "8", "6", "12")),
      dayExercise("ex-remo-menton-1-pie", 2, progression("10", "8", "6", "12")),
      dayExercise("ex-remo-t-semi-prono", 3, progression("10", "8", "6", "12")),
      dayExercise("ex-biceps-media-esfera-barra", 4, progression("15", "12", "10", "15")),
      dayExercise("ex-t2b-plancha-antebrazo", 5, progression('12 + 40"', '14 + 40"', '14 + 40"', '12 + 40"')),
      dayExercise("ex-press-frances-w-acostado", 6, progression("15", "12", "10", "15")),
    ],
  },
  {
    name: "Hombro / Pecho + Potencia",
    exercises: [
      dayExercise("ex-press-hombro-parado-trasnuca", 1, progression("10", "8", "6", "12")),
      dayExercise("ex-press-pecho-mancuerna-1-brazo-puente", 2, progression("10", "8", "6", "12")),
      dayExercise("ex-remo-1-brazo-ghd", 3, progression("10", "8", "6", "12")),
      dayExercise("ex-hang-power-clean", 4, progression("6", "4", "2", "8")),
      dayExercise("ex-biceps-pared-mancuernas-supino", 5, progression("15", "12", "10", "15")),
      dayExercise("ex-fondos-anillas", 6, progression("10", "8", "6", "12")),
    ],
  },
  {
    name: "Espalda / Core Rotacional",
    exercises: [
      dayExercise("ex-press-landmine-estocada", 1, progression("10", "8", "6", "12")),
      dayExercise("ex-remo-renegado-mancuernas", 2, progression("10", "8", "6", "12")),
      dayExercise("ex-australian-row-1-brazo", 3, progression("10", "8", "6", "12")),
      dayExercise("ex-remo-plancha-lateral-1-brazo", 4, progression("10/10", "10/10", "10/10", "10/10")),
      dayExercise("ex-pull-over-media-esfera-mancuerna", 5, progression("15", "12", "10", "15")),
      dayExercise("ex-vuelos-posteriores-peck-deck", 6, progression("15", "12", "10", "15")),
    ],
  },
  {
    name: "Espalda / Potencia + Hombro",
    exercises: [
      dayExercise("ex-remo-barra-landmine", 1, progression("10", "8", "6", "12")),
      dayExercise("ex-split-jerk", 2, progression("6", "4", "2", "8")),
      dayExercise("ex-rope-climb-manos", 3, progression("2", "3", "4", "5")),
      dayExercise("ex-face-pull-soga", 4, progression("15", "12", "10", "15")),
      dayExercise("ex-aperturas-peck-deck", 5, progression("15", "12", "10", "15")),
      dayExercise("ex-biceps-barra-prona", 6, progression("15", "12", "10", "15")),
    ],
  },
];

const ROUTINE_ID = "routine-forja-basico";
const WEEK_COUNT = 4;

/** Resuelve el objetivo real (series x reps) de un ejercicio para una semana puntual. */
function resolvePrescription(template: DayExerciseTemplate, weekIndex: number): ExercisePrescription {
  const target = template.progression[weekIndex] ?? template.progression[template.progression.length - 1];
  return { exerciseId: template.exerciseId, order: template.order, targetSets: target.sets, targetReps: target.reps };
}

function buildWeeks(routineId: string): RoutineWeek[] {
  return Array.from({ length: WEEK_COUNT }, (_, weekIndex) => {
    const weekNumber = weekIndex + 1;
    const weekId = `semana-${weekNumber}`;

    const days: RoutineDayPlan[] = DAY_TEMPLATES.map((template, dayIndex) => ({
      id: `dia-${dayIndex + 1}`,
      weekId,
      routineId,
      order: dayIndex + 1,
      name: template.name,
      exercises: template.exercises.map((exerciseTemplate) => resolvePrescription(exerciseTemplate, weekIndex)),
    }));

    return {
      id: weekId,
      routineId,
      number: weekNumber,
      label: `Semana ${weekNumber}`,
      days,
    };
  });
}

/**
 * Rutina activa (mock). En un producto multi-rutina, esto sería una fila
 * más de una tabla `routines` filtrada por usuario — el repositorio ya
 * está escrito para recibir un `routineId` en vez de asumir esta constante.
 */
export const ROUTINE: Routine = {
  id: ROUTINE_ID,
  name: "FORJA — Básico",
  weeks: buildWeeks(ROUTINE_ID),
};

export const MEAL_CATALOG: MealCatalogItem[] = [
  {
    id: "meal-desayuno",
    slot: "desayuno",
    slotLabel: "Desayuno",
    name: "Avena con claras y banana",
    items: ["60g avena", "3 claras de huevo", "1 banana", "1 cdta miel"],
    kcal: 420,
    protein: 28,
    carbs: 55,
    fat: 9,
  },
  {
    id: "meal-almuerzo",
    slot: "almuerzo",
    slotLabel: "Almuerzo",
    name: "Pollo, arroz y vegetales",
    items: ["200g pechuga de pollo", "150g arroz", "Vegetales grillados", "1 cda aceite de oliva"],
    kcal: 650,
    protein: 48,
    carbs: 70,
    fat: 15,
  },
  {
    id: "meal-merienda",
    slot: "merienda",
    slotLabel: "Merienda",
    name: "Yogur griego con nueces y miel",
    items: ["200g yogur griego", "20g nueces", "1 cdta miel"],
    kcal: 320,
    protein: 22,
    carbs: 30,
    fat: 12,
  },
  {
    id: "meal-cena",
    slot: "cena",
    slotLabel: "Cena",
    name: "Salmón con batata y ensalada",
    items: ["180g salmón", "200g batata", "Ensalada verde", "1 cda aceite de oliva"],
    kcal: 580,
    protein: 40,
    carbs: 45,
    fat: 20,
  },
];
