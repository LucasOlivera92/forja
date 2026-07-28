import {
  ExerciseCatalogItem,
  ExercisePrescription,
  FavoriteFoodCategory,
  FoodCatalogItem,
  MealCatalogItem,
  MealTemplate,
  Routine,
  RoutineDayPlan,
  RoutineSplitCategory,
  RoutineTemplate,
  RoutineWeek,
} from "./types";

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
  { id: "ex-press-plano-barra", name: "Press Plano con Barra", muscleGroup: "Pecho", videoUrl: "https://www.youtube.com/shorts/HzkHpIIo4IA", description: "Press horizontal con barra en banco plano, movimiento base de empuje de pecho.", equipment: "Barra", exerciseType: "Compuesto", category: "Pecho", primaryMuscle: "Pectoral", secondaryMuscles: ["Tríceps", "Deltoide anterior"], level: "Intermedio", unilateral: false },
  { id: "ex-dominadas-prona", name: "Dominadas Prona", muscleGroup: "Espalda", videoUrl: "https://www.youtube.com/shorts/ZDNmQXCfbmM", description: "Tracción vertical con toma prona en barra fija, trabaja dorsal ancho.", equipment: "Peso corporal", exerciseType: "Compuesto", category: "Espalda", primaryMuscle: "Dorsal ancho", secondaryMuscles: ["Bíceps", "Romboides"], level: "Avanzado", unilateral: false },
  { id: "ex-hombro-z-press", name: "Hombros Z Press", muscleGroup: "Hombro", videoUrl: "https://www.youtube.com/shorts/FUJPvAD9jOo", description: "Press de hombro sentado en el piso con piernas extendidas, exige estabilidad de core.", equipment: "Barra", exerciseType: "Compuesto", category: "Hombros", primaryMuscle: "Deltoide", secondaryMuscles: ["Tríceps", "Core"], level: "Avanzado", unilateral: false },
  { id: "ex-frances-polea-trasnuca", name: "Francés Polea Trasnuca", muscleGroup: "Tríceps", videoUrl: "https://www.youtube.com/shorts/5Okf9XhBhJk", description: "Extensión de tríceps por detrás de la nuca con polea, foco en la cabeza larga.", equipment: "Polea", exerciseType: "Aislamiento", category: "Brazos", primaryMuscle: "Tríceps", secondaryMuscles: [], level: "Intermedio", unilateral: false },
  { id: "ex-biceps-neutra-barra", name: "Bíceps Toma Neutra Barra", muscleGroup: "Bíceps", videoUrl: "https://www.youtube.com/watch?v=kxWh3ZjROxE", description: "Curl de bíceps con barra en agarre neutro, reduce estrés en muñeca.", equipment: "Barra", exerciseType: "Aislamiento", category: "Brazos", primaryMuscle: "Bíceps", secondaryMuscles: ["Antebrazo"], level: "Principiante", unilateral: false },
  { id: "ex-laterales-frontales-mancuerna", name: "Laterales + Frontales Mancuerna", muscleGroup: "Hombro", videoUrl: "https://www.youtube.com/shorts/tCihfHyR2Ts", description: "Elevaciones laterales y frontales combinadas con mancuernas, aíslan deltoides.", equipment: "Mancuernas", exerciseType: "Aislamiento", category: "Hombros", primaryMuscle: "Deltoide lateral", secondaryMuscles: ["Deltoide anterior"], level: "Principiante", unilateral: false },

  // Día 2: Pecho / Espalda + Core
  { id: "ex-maquina-pecho-1-brazo", name: "Máquina de Pecho 1 Brazo", muscleGroup: "Pecho", videoUrl: "https://www.youtube.com/shorts/zmRlND0jdqk", description: "Press de pecho unilateral en máquina, corrige desbalances entre lados.", equipment: "Máquina", exerciseType: "Compuesto", category: "Pecho", primaryMuscle: "Pectoral", secondaryMuscles: ["Tríceps"], level: "Intermedio", unilateral: true },
  { id: "ex-remo-menton-1-pie", name: "Remo al Mentón 1 Pie", muscleGroup: "Espalda", videoUrl: "https://www.youtube.com/shorts/uvzghA2eXcU", description: "Remo vertical apoyado en un pie, suma exigencia de equilibrio al tirón.", equipment: "Mancuernas", exerciseType: "Compuesto", category: "Espalda", primaryMuscle: "Deltoide posterior", secondaryMuscles: ["Trapecio", "Core"], level: "Avanzado", unilateral: true },
  { id: "ex-remo-t-semi-prono", name: "Remo T Semi Prono", muscleGroup: "Espalda", videoUrl: "https://www.youtube.com/shorts/uLr8HcW_7ig", description: "Remo con barra T en agarre semi prono, foco en espalda media.", equipment: "Barra T", exerciseType: "Compuesto", category: "Espalda", primaryMuscle: "Dorsal ancho", secondaryMuscles: ["Romboides", "Bíceps"], level: "Intermedio", unilateral: false },
  { id: "ex-biceps-media-esfera-barra", name: "Bíceps en Media Esfera con Barra", muscleGroup: "Bíceps", videoUrl: "https://www.youtube.com/shorts/GGJe2TDQAbw", description: "Curl de bíceps parado sobre media esfera, suma inestabilidad controlada.", equipment: "Barra", exerciseType: "Aislamiento", category: "Brazos", primaryMuscle: "Bíceps", secondaryMuscles: ["Core"], level: "Avanzado", unilateral: false },
  { id: "ex-t2b-plancha-antebrazo", name: "T2B Estricto + Plancha Antebrazo", muscleGroup: "Core", videoUrl: "https://www.youtube.com/shorts/B-B4I_LEQ58", description: "Toes-to-bar estricto combinado con plancha isométrica en antebrazos.", equipment: "Barra fija", exerciseType: "Isométrico", category: "Core", primaryMuscle: "Recto abdominal", secondaryMuscles: ["Flexores de cadera", "Antebrazo"], level: "Avanzado", unilateral: false },
  { id: "ex-press-frances-w-acostado", name: "Press Francés Barra W Acostado (Rompecráneo)", muscleGroup: "Tríceps", videoUrl: "https://www.youtube.com/shorts/CAUWI4sNPKk", description: "Extensión de tríceps acostado con barra W, movimiento clásico de aislamiento.", equipment: "Barra W", exerciseType: "Aislamiento", category: "Brazos", primaryMuscle: "Tríceps", secondaryMuscles: [], level: "Intermedio", unilateral: false },

  // Día 3: Hombro / Pecho + Potencia
  { id: "ex-press-hombro-parado-trasnuca", name: "Press de Hombro Parado Trasnuca", muscleGroup: "Hombro", videoUrl: "https://www.youtube.com/shorts/lgjsva8XsEw", description: "Press de hombro parado bajando la barra por detrás de la nuca.", equipment: "Barra", exerciseType: "Compuesto", category: "Hombros", primaryMuscle: "Deltoide", secondaryMuscles: ["Tríceps"], level: "Avanzado", unilateral: false },
  { id: "ex-press-pecho-mancuerna-1-brazo-puente", name: "Press Pecho Mancuerna 1 Brazo (Puente Cadera)", muscleGroup: "Pecho", videoUrl: "https://www.youtube.com/shorts/O7PMT-nWNTY", description: "Press de pecho unilateral sosteniendo puente de cadera, suma activación de core y glúteo.", equipment: "Mancuernas", exerciseType: "Compuesto", category: "Pecho", primaryMuscle: "Pectoral", secondaryMuscles: ["Core", "Glúteo"], level: "Avanzado", unilateral: true },
  { id: "ex-remo-1-brazo-ghd", name: "Remo 1 Brazo en GHD", muscleGroup: "Espalda", videoUrl: "https://www.youtube.com/shorts/4riS8gYu-3M", description: "Remo unilateral apoyado en banco GHD, foco en espalda con rango controlado.", equipment: "GHD", exerciseType: "Compuesto", category: "Espalda", primaryMuscle: "Dorsal ancho", secondaryMuscles: ["Bíceps"], level: "Intermedio", unilateral: true },
  { id: "ex-hang-power-clean", name: "Hang Power Clean 🏀", muscleGroup: "Cuerpo completo / Potencia", videoUrl: "https://www.youtube.com/shorts/_q0dkHb89us", description: "Levantamiento olímpico desde la cadera, desarrolla potencia de cuerpo completo.", equipment: "Barra olímpica", exerciseType: "Potencia", category: "Piernas", primaryMuscle: "Cuádriceps", secondaryMuscles: ["Glúteo", "Trapecio", "Core"], level: "Avanzado", unilateral: false },
  { id: "ex-biceps-pared-mancuernas-supino", name: "Bíceps Apoyando Espalda en Pared, Mancuernas Supino", muscleGroup: "Bíceps", videoUrl: "https://www.youtube.com/shorts/5zB4KI7OaaY", description: "Curl de bíceps con espalda apoyada en la pared para eliminar impulso.", equipment: "Mancuernas", exerciseType: "Aislamiento", category: "Brazos", primaryMuscle: "Bíceps", secondaryMuscles: [], level: "Principiante", unilateral: false },
  { id: "ex-fondos-anillas", name: "Fondos en Anillas", muscleGroup: "Tríceps / Pecho", videoUrl: "https://www.youtube.com/shorts/5UUgrMWrEfI", description: "Fondos en anillas suspendidas, exige estabilidad extra de hombro y core.", equipment: "Anillas", exerciseType: "Compuesto", category: "Pecho", primaryMuscle: "Pectoral", secondaryMuscles: ["Tríceps", "Deltoide anterior"], level: "Avanzado", unilateral: false },

  // Día 4: Espalda / Core Rotacional
  { id: "ex-press-landmine-estocada", name: "Press Landmine en Posición Estocada", muscleGroup: "Hombro / Core", videoUrl: "https://www.youtube.com/shorts/DHroGtml6MM", description: "Press con barra landmine en estocada, combina empuje de hombro con estabilidad de tren inferior.", equipment: "Landmine", exerciseType: "Compuesto", category: "Hombros", primaryMuscle: "Deltoide", secondaryMuscles: ["Core", "Cuádriceps"], level: "Avanzado", unilateral: true },
  { id: "ex-remo-renegado-mancuernas", name: "Remo Renegado con Mancuernas", muscleGroup: "Espalda / Core", videoUrl: "https://www.youtube.com/shorts/DZ17Zeu274s", description: "Remo alternado en posición de plancha con mancuernas, suma antirrotación de core.", equipment: "Mancuernas", exerciseType: "Compuesto", category: "Espalda", primaryMuscle: "Dorsal ancho", secondaryMuscles: ["Core"], level: "Avanzado", unilateral: true },
  { id: "ex-australian-row-1-brazo", name: "Australian Row 1 Brazo", muscleGroup: "Espalda", videoUrl: "https://www.youtube.com/shorts/I4DR93poqt8", description: "Remo horizontal con cuerpo suspendido, unilateral, con peso corporal.", equipment: "Peso corporal", exerciseType: "Compuesto", category: "Espalda", primaryMuscle: "Dorsal ancho", secondaryMuscles: ["Bíceps", "Core"], level: "Intermedio", unilateral: true },
  { id: "ex-remo-plancha-lateral-1-brazo", name: "Remo en Plancha Lateral 1 Brazo", muscleGroup: "Core", videoUrl: "https://www.youtube.com/watch?v=Xv9QBl5LB0A", description: "Remo unilateral sostenido en plancha lateral, trabajo antirrotación de core.", equipment: "Mancuernas", exerciseType: "Isométrico", category: "Core", primaryMuscle: "Oblicuos", secondaryMuscles: ["Dorsal ancho"], level: "Avanzado", unilateral: true },
  { id: "ex-pull-over-media-esfera-mancuerna", name: "Pull Over en Media Esfera con Mancuerna", muscleGroup: "Espalda / Pecho", videoUrl: "https://www.youtube.com/shorts/k_cFbm-KXtI", description: "Pull-over acostado sobre media esfera, involucra dorsal y pecho.", equipment: "Mancuerna", exerciseType: "Aislamiento", category: "Espalda", primaryMuscle: "Dorsal ancho", secondaryMuscles: ["Pectoral"], level: "Intermedio", unilateral: false },
  { id: "ex-vuelos-posteriores-peck-deck", name: "Vuelos Posteriores en Peck Deck", muscleGroup: "Hombro", videoUrl: "https://www.youtube.com/shorts/bcWuQqr_0PU", description: "Vuelos posteriores en máquina peck deck, foco en deltoides posterior.", equipment: "Máquina", exerciseType: "Aislamiento", category: "Hombros", primaryMuscle: "Deltoide posterior", secondaryMuscles: [], level: "Principiante", unilateral: false },

  // Día 5: Espalda / Potencia + Hombro
  { id: "ex-remo-barra-landmine", name: "Remo con Barra Landmine", muscleGroup: "Espalda", videoUrl: "https://www.youtube.com/watch?v=_bFf2_7iPNQ", description: "Remo con barra anclada en landmine, tirón horizontal con agarre neutro.", equipment: "Landmine", exerciseType: "Compuesto", category: "Espalda", primaryMuscle: "Dorsal ancho", secondaryMuscles: ["Bíceps"], level: "Intermedio", unilateral: false },
  { id: "ex-split-jerk", name: "Split Jerk 🏀", muscleGroup: "Cuerpo completo / Potencia", videoUrl: "https://www.youtube.com/shorts/kf-lQamAAxs", description: "Levantamiento olímpico de empuje con recepción en split, desarrolla potencia.", equipment: "Barra olímpica", exerciseType: "Potencia", category: "Hombros", primaryMuscle: "Deltoide", secondaryMuscles: ["Cuádriceps", "Core"], level: "Avanzado", unilateral: false },
  { id: "ex-rope-climb-manos", name: "Rope Climb con las Manos 🏀", muscleGroup: "Cuerpo completo / Potencia", videoUrl: "https://www.youtube.com/watch?v=iY0qSQxvDN4", description: "Trepa de soga solo con brazos, fuerza y potencia de tren superior.", equipment: "Soga", exerciseType: "Potencia", category: "Espalda", primaryMuscle: "Dorsal ancho", secondaryMuscles: ["Bíceps", "Antebrazo"], level: "Avanzado", unilateral: false },
  { id: "ex-face-pull-soga", name: "Cable Face Pull Soga", muscleGroup: "Hombro", videoUrl: "https://www.youtube.com/shorts/lbt7obncwVs", description: "Tirón facial con soga en polea, trabaja deltoides posterior y rotadores.", equipment: "Polea", exerciseType: "Aislamiento", category: "Hombros", primaryMuscle: "Deltoide posterior", secondaryMuscles: ["Trapecio"], level: "Principiante", unilateral: false },
  { id: "ex-aperturas-peck-deck", name: "Aperturas Peck Deck", muscleGroup: "Pecho", videoUrl: "https://www.youtube.com/shorts/Y4jzm2c3szA", description: "Aperturas de pecho en máquina peck deck, aislamiento del pectoral.", equipment: "Máquina", exerciseType: "Aislamiento", category: "Pecho", primaryMuscle: "Pectoral", secondaryMuscles: [], level: "Principiante", unilateral: false },
  { id: "ex-biceps-barra-prona", name: "Bíceps con Barra Toma Prona", muscleGroup: "Bíceps", videoUrl: "https://www.youtube.com/shorts/-lJFZ5cRaRM", description: "Curl de bíceps con barra en agarre prono (reverse curl), suma antebrazo.", equipment: "Barra", exerciseType: "Aislamiento", category: "Brazos", primaryMuscle: "Antebrazo", secondaryMuscles: ["Bíceps"], level: "Intermedio", unilateral: false },
];

/**
 * Sprint 4.6 — Plantillas FORJA para el flujo "Crear rutina". Solo
 * estructura (nombre sugerido, semanas y días con sus nombres) — NUNCA
 * ejercicios, así que no tienen nada que ver con `EXERCISE_CATALOG` ni
 * con `DAY_TEMPLATES` (que es el armado fijo de "El Toro", sin relación
 * con esto). La pantalla de creación las lee vía `getRoutineTemplates()`
 * y las usa solo para precompletar el formulario existente — nunca
 * guardan nada por sí solas.
 */
export const ROUTINE_TEMPLATES: RoutineTemplate[] = [
  {
    id: "plantilla-hipertrofia-3d",
    name: "Hipertrofia 3 días",
    description: "Split de empuje / tracción / pierna, 3 días por semana.",
    weeksCount: 4,
    weekNames: ["Adaptación", "Progresión", "Intensificación", "Consolidación"],
    dayNames: ["Empuje", "Tracción", "Piernas"],
  },
  {
    id: "plantilla-hipertrofia-4d",
    name: "Hipertrofia 4 días",
    description: "Split por grupos musculares, 4 días por semana.",
    weeksCount: 4,
    weekNames: ["Adaptación", "Progresión", "Intensificación", "Consolidación"],
    dayNames: ["Pecho y Tríceps", "Espalda y Bíceps", "Piernas", "Hombros y Core"],
  },
  {
    id: "plantilla-hipertrofia-5d",
    name: "Hipertrofia 5 días",
    description: "Split clásico de 5 días por grupo muscular.",
    weeksCount: 4,
    weekNames: ["Adaptación", "Progresión", "Intensificación", "Consolidación"],
    dayNames: ["Empuje", "Tracción", "Piernas", "Hombros", "Brazos"],
  },
  {
    id: "plantilla-full-body",
    name: "Full Body",
    description: "Cuerpo completo, 3 días por semana.",
    weeksCount: 4,
    weekNames: ["Adaptación", "Progresión", "Intensificación", "Consolidación"],
    dayNames: ["Full Body A", "Full Body B", "Full Body C"],
  },
  {
    id: "plantilla-push-pull-legs",
    name: "Push Pull Legs",
    description: "Empuje / tracción / pierna, doble vuelta, 6 días por semana.",
    weeksCount: 4,
    weekNames: ["Adaptación", "Progresión", "Intensificación", "Consolidación"],
    dayNames: ["Push A", "Pull A", "Legs A", "Push B", "Pull B", "Legs B"],
  },
  {
    id: "plantilla-upper-lower",
    name: "Upper / Lower",
    description: "Tren superior / inferior con descanso intermedio, 5 días.",
    weeksCount: 4,
    weekNames: ["Adaptación", "Progresión", "Intensificación", "Consolidación"],
    dayNames: ["Upper A", "Lower A", "Descanso", "Upper B", "Lower B"],
  },
  {
    id: "plantilla-running-base",
    name: "Running Base",
    description: "Base aeróbica para running, 4 días por semana.",
    weeksCount: 4,
    weekNames: ["Adaptación", "Progresión", "Intensificación", "Consolidación"],
    dayNames: ["Rodaje Suave", "Series", "Rodaje Largo", "Regenerativo"],
  },
  {
    id: "plantilla-basquet-inicial",
    name: "Básquet Inicial",
    description: "Introducción al entrenamiento físico de básquet, 3 días por semana.",
    weeksCount: 4,
    weekNames: ["Adaptación", "Progresión", "Intensificación", "Consolidación"],
    dayNames: ["Fundamentos", "Técnica Individual", "Scrimmage"],
  },
];

/**
 * Sprint 4.9 — "Plantillas inteligentes de distribución muscular": guía
 * puramente informativa, distinta de `ROUTINE_TEMPLATES` (que arma
 * semanas/días completos). Acá solo se sugiere, para cada categoría, qué
 * grupo muscular corresponde a cada día según la cantidad de días de
 * entrenamiento (1 a 6) — nunca se aplica sola, ni autocompleta nada; la
 * UI solo la muestra como referencia (pantalla de creación) o como
 * subtítulo por día (constructor), y deja de mostrarla apenas el usuario
 * personaliza el nombre de ese día. "Personalizada" queda vacía a
 * propósito: es la opción de "sin guía".
 */
export const ROUTINE_SPLITS: Record<RoutineSplitCategory, Record<number, string[]>> = {
  Hipertrofia: {
    1: ["Full Body"],
    2: ["Tren Superior", "Tren Inferior"],
    3: ["Empuje", "Tracción", "Piernas"],
    4: ["Pecho + Tríceps", "Espalda + Bíceps", "Piernas", "Hombros + Core"],
    5: ["Pecho + Tríceps", "Espalda + Bíceps", "Piernas", "Hombros", "Upper"],
    6: ["Pecho", "Espalda", "Piernas", "Hombros", "Brazos", "Core"],
  },
  Fuerza: {
    1: ["Full Body"],
    2: ["Tren Superior", "Tren Inferior"],
    3: ["Sentadilla", "Press Banca", "Peso Muerto"],
    4: ["Sentadilla", "Press Banca", "Peso Muerto", "Accesorios"],
    5: ["Sentadilla", "Press Banca", "Peso Muerto", "Press Militar", "Accesorios"],
    6: [
      "Sentadilla",
      "Press Banca",
      "Peso Muerto",
      "Press Militar",
      "Accesorios Tren Superior",
      "Accesorios Tren Inferior",
    ],
  },
  Definición: {
    1: ["Full Body + Cardio"],
    2: ["Tren Superior + Cardio", "Tren Inferior + Cardio"],
    3: ["Empuje + Cardio", "Tracción + Cardio", "Piernas + Cardio"],
    4: ["Pecho + Tríceps", "Espalda + Bíceps", "Piernas", "Hombros + Cardio"],
    5: ["Pecho + Tríceps", "Espalda + Bíceps", "Piernas", "Hombros", "Cardio + Core"],
    6: ["Pecho", "Espalda", "Piernas", "Hombros", "Brazos", "Cardio + Core"],
  },
  Running: {
    1: ["Rodaje Suave"],
    2: ["Rodaje Suave", "Series"],
    3: ["Rodaje Suave", "Series", "Rodaje Largo"],
    4: ["Rodaje Suave", "Series", "Rodaje Largo", "Regenerativo"],
    5: ["Rodaje Suave", "Series", "Fartlek", "Rodaje Largo", "Regenerativo"],
    6: ["Rodaje Suave", "Series", "Fartlek", "Rodaje Largo", "Regenerativo", "Fuerza"],
  },
  Básquet: {
    1: ["Fundamentos"],
    2: ["Fundamentos", "Físico"],
    3: ["Fundamentos", "Técnica Individual", "Scrimmage"],
    4: ["Fundamentos", "Técnica Individual", "Físico", "Scrimmage"],
    5: ["Fundamentos", "Técnica Individual", "Físico", "Táctica", "Scrimmage"],
    6: ["Fundamentos", "Técnica Individual", "Físico", "Táctica", "Tiro", "Scrimmage"],
  },
  Personalizada: {},
};

/**
 * Sprint 3.6 — Prescripción semanal real por ejercicio.
 *
 * Cada ejercicio guarda su propia prescripción (series x reps) para cada
 * una de las 4 semanas, como 4 objetos explícitos e independientes — no
 * hay ninguna función que genere o comparta un patrón entre ejercicios.
 * Cambiar la semana 3 de un ejercicio no puede afectar a ningún otro
 * ejercicio ni a otra semana: cada valor está escrito una sola vez, en un
 * solo lugar, tal como figura en la rutina original (Plan_El_Toro_1).
 */
interface WeekPrescription {
  week: number;
  sets: number;
  reps: string;
}

/**
 * Ejercicio dentro de un día, con su propia prescripción semana a semana
 * (`weeks`, siempre longitud 4 — una entrada explícita por semana).
 */
interface DayExerciseTemplate {
  exerciseId: string;
  order: number;
  weeks: WeekPrescription[];
}

function dayExercise(exerciseId: string, order: number, weeks: WeekPrescription[]): DayExerciseTemplate {
  return { exerciseId, order, weeks };
}

/**
 * Split semanal (5 días, 6 ejercicios cada uno). Cada ejercicio define su
 * propio arreglo de 4 prescripciones (semana 1 a 4) de forma literal e
 * independiente, lista para que una rutina futura tenga cualquier
 * combinación de series/reps por semana sin heredar nada de otro ejercicio.
 */
const DAY_TEMPLATES: Array<{ name: string; exercises: DayExerciseTemplate[] }> = [
  {
    name: "Empuje / Hombro",
    exercises: [
      dayExercise("ex-press-plano-barra", 1, [
        { week: 1, sets: 4, reps: "10" },
        { week: 2, sets: 4, reps: "8" },
        { week: 3, sets: 4, reps: "6" },
        { week: 4, sets: 4, reps: "12" },
      ]),
      dayExercise("ex-dominadas-prona", 2, [
        { week: 1, sets: 4, reps: "10" },
        { week: 2, sets: 4, reps: "8" },
        { week: 3, sets: 4, reps: "6" },
        { week: 4, sets: 4, reps: "12" },
      ]),
      dayExercise("ex-hombro-z-press", 3, [
        { week: 1, sets: 4, reps: "10" },
        { week: 2, sets: 4, reps: "8" },
        { week: 3, sets: 4, reps: "6" },
        { week: 4, sets: 4, reps: "12" },
      ]),
      dayExercise("ex-frances-polea-trasnuca", 4, [
        { week: 1, sets: 4, reps: "15" },
        { week: 2, sets: 4, reps: "12" },
        { week: 3, sets: 4, reps: "10" },
        { week: 4, sets: 4, reps: "15" },
      ]),
      dayExercise("ex-biceps-neutra-barra", 5, [
        { week: 1, sets: 4, reps: "15" },
        { week: 2, sets: 4, reps: "12" },
        { week: 3, sets: 4, reps: "10" },
        { week: 4, sets: 4, reps: "15" },
      ]),
      dayExercise("ex-laterales-frontales-mancuerna", 6, [
        { week: 1, sets: 4, reps: "15" },
        { week: 2, sets: 4, reps: "12" },
        { week: 3, sets: 4, reps: "10" },
        { week: 4, sets: 4, reps: "15" },
      ]),
    ],
  },
  {
    name: "Pecho / Espalda + Core",
    exercises: [
      dayExercise("ex-maquina-pecho-1-brazo", 1, [
        { week: 1, sets: 4, reps: "10" },
        { week: 2, sets: 4, reps: "8" },
        { week: 3, sets: 4, reps: "6" },
        { week: 4, sets: 4, reps: "12" },
      ]),
      dayExercise("ex-remo-menton-1-pie", 2, [
        { week: 1, sets: 4, reps: "10" },
        { week: 2, sets: 4, reps: "8" },
        { week: 3, sets: 4, reps: "6" },
        { week: 4, sets: 4, reps: "12" },
      ]),
      dayExercise("ex-remo-t-semi-prono", 3, [
        { week: 1, sets: 4, reps: "10" },
        { week: 2, sets: 4, reps: "8" },
        { week: 3, sets: 4, reps: "6" },
        { week: 4, sets: 4, reps: "12" },
      ]),
      dayExercise("ex-biceps-media-esfera-barra", 4, [
        { week: 1, sets: 4, reps: "15" },
        { week: 2, sets: 4, reps: "12" },
        { week: 3, sets: 4, reps: "10" },
        { week: 4, sets: 4, reps: "15" },
      ]),
      dayExercise("ex-t2b-plancha-antebrazo", 5, [
        { week: 1, sets: 4, reps: '12 + 40"' },
        { week: 2, sets: 4, reps: '14 + 40"' },
        { week: 3, sets: 4, reps: '14 + 40"' },
        { week: 4, sets: 4, reps: '12 + 40"' },
      ]),
      dayExercise("ex-press-frances-w-acostado", 6, [
        { week: 1, sets: 4, reps: "15" },
        { week: 2, sets: 4, reps: "12" },
        { week: 3, sets: 4, reps: "10" },
        { week: 4, sets: 4, reps: "15" },
      ]),
    ],
  },
  {
    name: "Hombro / Pecho + Potencia",
    exercises: [
      dayExercise("ex-press-hombro-parado-trasnuca", 1, [
        { week: 1, sets: 4, reps: "10" },
        { week: 2, sets: 4, reps: "8" },
        { week: 3, sets: 4, reps: "6" },
        { week: 4, sets: 4, reps: "12" },
      ]),
      dayExercise("ex-press-pecho-mancuerna-1-brazo-puente", 2, [
        { week: 1, sets: 4, reps: "10" },
        { week: 2, sets: 4, reps: "8" },
        { week: 3, sets: 4, reps: "6" },
        { week: 4, sets: 4, reps: "12" },
      ]),
      dayExercise("ex-remo-1-brazo-ghd", 3, [
        { week: 1, sets: 4, reps: "10" },
        { week: 2, sets: 4, reps: "8" },
        { week: 3, sets: 4, reps: "6" },
        { week: 4, sets: 4, reps: "12" },
      ]),
      dayExercise("ex-hang-power-clean", 4, [
        { week: 1, sets: 4, reps: "6" },
        { week: 2, sets: 4, reps: "4" },
        { week: 3, sets: 4, reps: "2" },
        { week: 4, sets: 4, reps: "8" },
      ]),
      dayExercise("ex-biceps-pared-mancuernas-supino", 5, [
        { week: 1, sets: 4, reps: "15" },
        { week: 2, sets: 4, reps: "12" },
        { week: 3, sets: 4, reps: "10" },
        { week: 4, sets: 4, reps: "15" },
      ]),
      dayExercise("ex-fondos-anillas", 6, [
        { week: 1, sets: 4, reps: "10" },
        { week: 2, sets: 4, reps: "8" },
        { week: 3, sets: 4, reps: "6" },
        { week: 4, sets: 4, reps: "12" },
      ]),
    ],
  },
  {
    name: "Espalda / Core Rotacional",
    exercises: [
      dayExercise("ex-press-landmine-estocada", 1, [
        { week: 1, sets: 4, reps: "10" },
        { week: 2, sets: 4, reps: "8" },
        { week: 3, sets: 4, reps: "6" },
        { week: 4, sets: 4, reps: "12" },
      ]),
      dayExercise("ex-remo-renegado-mancuernas", 2, [
        { week: 1, sets: 4, reps: "10" },
        { week: 2, sets: 4, reps: "8" },
        { week: 3, sets: 4, reps: "6" },
        { week: 4, sets: 4, reps: "12" },
      ]),
      dayExercise("ex-australian-row-1-brazo", 3, [
        { week: 1, sets: 4, reps: "10" },
        { week: 2, sets: 4, reps: "8" },
        { week: 3, sets: 4, reps: "6" },
        { week: 4, sets: 4, reps: "12" },
      ]),
      dayExercise("ex-remo-plancha-lateral-1-brazo", 4, [
        { week: 1, sets: 4, reps: "10/10" },
        { week: 2, sets: 4, reps: "10/10" },
        { week: 3, sets: 4, reps: "10/10" },
        { week: 4, sets: 4, reps: "10/10" },
      ]),
      dayExercise("ex-pull-over-media-esfera-mancuerna", 5, [
        { week: 1, sets: 4, reps: "15" },
        { week: 2, sets: 4, reps: "12" },
        { week: 3, sets: 4, reps: "10" },
        { week: 4, sets: 4, reps: "15" },
      ]),
      dayExercise("ex-vuelos-posteriores-peck-deck", 6, [
        { week: 1, sets: 4, reps: "15" },
        { week: 2, sets: 4, reps: "12" },
        { week: 3, sets: 4, reps: "10" },
        { week: 4, sets: 4, reps: "15" },
      ]),
    ],
  },
  {
    name: "Espalda / Potencia + Hombro",
    exercises: [
      dayExercise("ex-remo-barra-landmine", 1, [
        { week: 1, sets: 4, reps: "10" },
        { week: 2, sets: 4, reps: "8" },
        { week: 3, sets: 4, reps: "6" },
        { week: 4, sets: 4, reps: "12" },
      ]),
      dayExercise("ex-split-jerk", 2, [
        { week: 1, sets: 4, reps: "6" },
        { week: 2, sets: 4, reps: "4" },
        { week: 3, sets: 4, reps: "2" },
        { week: 4, sets: 4, reps: "8" },
      ]),
      dayExercise("ex-rope-climb-manos", 3, [
        { week: 1, sets: 4, reps: "2" },
        { week: 2, sets: 4, reps: "3" },
        { week: 3, sets: 4, reps: "4" },
        { week: 4, sets: 4, reps: "5" },
      ]),
      dayExercise("ex-face-pull-soga", 4, [
        { week: 1, sets: 4, reps: "15" },
        { week: 2, sets: 4, reps: "12" },
        { week: 3, sets: 4, reps: "10" },
        { week: 4, sets: 4, reps: "15" },
      ]),
      dayExercise("ex-aperturas-peck-deck", 5, [
        { week: 1, sets: 4, reps: "15" },
        { week: 2, sets: 4, reps: "12" },
        { week: 3, sets: 4, reps: "10" },
        { week: 4, sets: 4, reps: "15" },
      ]),
      dayExercise("ex-biceps-barra-prona", 6, [
        { week: 1, sets: 4, reps: "15" },
        { week: 2, sets: 4, reps: "12" },
        { week: 3, sets: 4, reps: "10" },
        { week: 4, sets: 4, reps: "15" },
      ]),
    ],
  },
];

const ROUTINE_ID = "routine-forja-basico";
const WEEK_COUNT = 4;

/** Resuelve la prescripción propia del ejercicio para una semana puntual (por número de semana, no por índice). */
function resolvePrescription(template: DayExerciseTemplate, weekNumber: number): ExercisePrescription {
  const target = template.weeks.find((w) => w.week === weekNumber) ?? template.weeks[template.weeks.length - 1];
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
      exercises: template.exercises.map((exerciseTemplate) => resolvePrescription(exerciseTemplate, weekNumber)),
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
 *
 * Es la rutina real de Luquita (Plan_El_Toro_1), primera rutina del
 * catálogo de /rutinas (Sprint 3.4). Mismo `id` de siempre — no se toca
 * para no romper sesiones ya guardadas — solo cambia el `name` visible.
 */
export const ROUTINE: Routine = {
  id: ROUTINE_ID,
  name: "El Toro",
  description: "Split de 5 días orientado a hipertrofia con bloques de potencia olímpica.",
  sport: "Musculación",
  goal: "Hipertrofia y potencia",
  weeksCount: WEEK_COUNT,
  daysPerWeek: DAY_TEMPLATES.length,
  weeks: buildWeeks(ROUTINE_ID),
};

/**
 * Rutinas adicionales del catálogo (Sprint 3.4) — solo metadata, todavía
 * sin semanas cargadas (`weeks: []`). Sirven para poblar la pantalla
 * /rutinas con más de una tarjeta; no tienen navegación de detalle real
 * hasta que se cargue su contenido en un sprint futuro.
 */
const RUNNING_BASE_ROUTINE: Routine = {
  id: "routine-running-base",
  name: "Running Base",
  description: "Plan introductorio de acondicionamiento para correr distancias base.",
  sport: "Running",
  goal: "Resistencia aeróbica",
  weeksCount: 0,
  daysPerWeek: 0,
  weeks: [],
};

const BASQUET_INICIAL_ROUTINE: Routine = {
  id: "routine-basquet-inicial",
  name: "Básquet Inicial",
  description: "Trabajo físico general orientado a jugadores de básquet en etapa inicial.",
  sport: "Básquet",
  goal: "Rendimiento deportivo",
  weeksCount: 0,
  daysPerWeek: 0,
  weeks: [],
};

const HIPERTROFIA_FULL_BODY_ROUTINE: Routine = {
  id: "routine-hipertrofia-full-body",
  name: "Hipertrofia Full Body",
  description: "Rutina de cuerpo completo enfocada en ganancia de masa muscular.",
  sport: "Musculación",
  goal: "Hipertrofia",
  weeksCount: 0,
  daysPerWeek: 0,
  weeks: [],
};

/** Catálogo completo de rutinas — fuente de datos de la pantalla /rutinas. */
export const ROUTINES: Routine[] = [
  ROUTINE,
  RUNNING_BASE_ROUTINE,
  BASQUET_INICIAL_ROUTINE,
  HIPERTROFIA_FULL_BODY_ROUTINE,
];

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

/**
 * Sprint 5.0 — catálogo fijo de alimentos favoritos para el selector de
 * chips del perfil nutricional. Separado de `MEAL_CATALOG` a propósito:
 * esto no son comidas armadas, son ingredientes sueltos que Sprint 5.1 va
 * a combinar para generar Desayuno/Almuerzo/Merienda/Cena.
 */
export const FAVORITE_FOOD_OPTIONS: Record<FavoriteFoodCategory, string[]> = {
  proteinas: ["Pollo", "Carne", "Atún", "Huevos", "Yogur Griego", "Cerdo", "Pescado"],
  carbohidratos: ["Arroz", "Papa", "Batata", "Avena", "Pan", "Fideos", "Quinoa"],
  grasas: ["Palta", "Aceite de oliva", "Nueces", "Almendras", "Manteca de maní"],
  frutas: ["Banana", "Kiwi", "Frutillas", "Mandarina", "Manzana", "Arándanos"],
  verduras: ["Brócoli", "Espinaca", "Tomate", "Zanahoria", "Lechuga", "Pepino"],
};

/**
 * Sprint 5.1 — Catálogo Maestro de Alimentos. Única fuente de verdad de
 * macros por alimento: las Meal Templates de abajo solo referencian un
 * `id` de acá + una cantidad, nunca guardan proteína/carbohidratos/grasa
 * a mano. Valores por 100g/100ml (o por 1 "unidad" para huevo/banana/
 * kiwi/pan/scoop) — estándar de etiqueta nutricional, redondeados. Sin
 * `kcal`: se deriva siempre con la fórmula 4/4/9 en `repository.ts`.
 *
 * Sprint 5.4 — "Base Maestra Nutricional real". Se corrigieron los
 * valores de varios alimentos contra tablas de referencia reales (USDA
 * FoodData Central para alimentos genéricos, fatsecret.com.ar para el
 * producto de marca argentina). Dos decisiones de arquitectura quedaron
 * documentadas en el propio dato:
 *
 * 1. `food-pechuga-pollo` usa valores de pechuga CRUDA (spec 5.4:
 *    "Pollo (pechuga cruda) → 100g"), lo que baja su proteína de 31g a
 *    23g/100g — esto reduce, no aumenta, la proteína total de las
 *    comidas que la usan.
 * 2. `food-arroz-blanco` se mantiene en base COCIDA (no "cruda" como
 *    sugiere el ejemplo del spec) porque las MealTemplates ya
 *    referencian cantidades de arroz pensadas como porción cocida
 *    (150g); pasar a valores crudos multiplicaría por ~3 sus macros sin
 *    poder tocar la cantidad en la MealTemplate, rompiendo la
 *    coherencia de macros diarios.
 *
 * Sprint 5.5 — "Base Maestra Nutricional definitiva". Catálogo ampliado
 * a ~90 alimentos para cubrir el uso real de personas en recomposición
 * corporal / volumen / definición, cada uno con su `source` (Principio
 * de trazabilidad del sprint — ver JSDoc de `FoodCatalogItem` en
 * types.ts). Los 25 alimentos de Sprints 5.1-5.4 mantienen exactamente
 * su `id` y sus valores (ya habían sido corregidos contra fuentes reales
 * en 5.4) — este sprint solo les agrega `source` y suma alimentos
 * nuevos, nunca reemplaza uno existente por otro con distinto id.
 *
 * Nota de arquitectura — categorías: `FavoriteFoodCategory` (Sprint 5.0)
 * solo tiene 5 valores (proteinas/carbohidratos/grasas/frutas/verduras).
 * El spec de este sprint agrupa alimentos en "Legumbres" y "Bebidas",
 * que no son categorías propias del modelo — agregar categorías nuevas
 * tocaría el selector de favoritos y el Shopping Engine (explícitamente
 * fuera de alcance: "No modificar Shopping Engine"). Las legumbres se
 * catalogan como `carbohidratos` (su macro dominante por peso) y las
 * bebidas sin macros relevantes (agua/café/té/mate) como
 * `carbohidratos` también, a modo de bucket neutro documentado acá; la
 * leche descremada se cataloga como `proteinas` (mismo criterio que
 * `food-leche-proteica`). Ninguna de las 5 bebidas es usada por ninguna
 * MealTemplate hoy, así que esta categorización no afecta ningún
 * cálculo existente — es solo metadata para una futura pantalla de
 * bebidas.
 */
export const FOOD_CATALOG: FoodCatalogItem[] = [
  /* ---------------------------- Proteínas ---------------------------- */
  { id: "food-huevo", name: "Huevo", unit: "unidad", category: "proteinas", protein: 6.3, carbs: 0.4, fat: 4.8, fiber: 0, source: "USDA FoodData Central" },
  { id: "food-claras", name: "Claras de huevo", unit: "g", category: "proteinas", protein: 10.9, carbs: 0.7, fat: 0.2, fiber: 0, source: "USDA FoodData Central" },
  { id: "food-pechuga-pollo", name: "Pechuga de pollo (cruda)", unit: "g", category: "proteinas", protein: 23, carbs: 0, fat: 2.7, fiber: 0, source: "USDA FoodData Central" },
  { id: "food-muslo-pollo", name: "Muslo de pollo (crudo)", unit: "g", category: "proteinas", protein: 20, carbs: 0, fat: 9.3, fiber: 0, source: "USDA FoodData Central" },
  { id: "food-carne-magra", name: "Carne vacuna magra (bife, cruda)", unit: "g", category: "proteinas", protein: 22, carbs: 0, fat: 7, fiber: 0, source: "USDA FoodData Central" },
  { id: "food-carne-picada-magra", name: "Carne picada magra (cruda)", unit: "g", category: "proteinas", protein: 20, carbs: 0, fat: 10, fiber: 0, source: "USDA FoodData Central" },
  { id: "food-cerdo-magro", name: "Cerdo magro (lomo, crudo)", unit: "g", category: "proteinas", protein: 21, carbs: 0, fat: 2.2, fiber: 0, source: "USDA FoodData Central" },
  { id: "food-pavo", name: "Pavo (pechuga, cruda)", unit: "g", category: "proteinas", protein: 23.7, carbs: 0, fat: 0.7, fiber: 0, source: "USDA FoodData Central" },
  { id: "food-atun", name: "Atún (lata al agua)", unit: "g", category: "proteinas", protein: 25.5, carbs: 0, fat: 0.8, fiber: 0, source: "USDA FoodData Central" },
  { id: "food-salmon", name: "Salmón (crudo)", unit: "g", category: "proteinas", protein: 20.4, carbs: 0, fat: 13.4, fiber: 0, source: "USDA FoodData Central" },
  { id: "food-merluza", name: "Merluza (cruda)", unit: "g", category: "proteinas", protein: 18.6, carbs: 0, fat: 0.9, fiber: 0, source: "USDA FoodData Central" },
  { id: "food-tilapia", name: "Tilapia (cruda)", unit: "g", category: "proteinas", protein: 20, carbs: 0, fat: 1.7, fiber: 0, source: "USDA FoodData Central" },
  { id: "food-langostinos", name: "Langostinos (crudos)", unit: "g", category: "proteinas", protein: 20.1, carbs: 0, fat: 1, fiber: 0, source: "USDA FoodData Central" },
  { id: "food-yogur-griego", name: "Yogur griego natural", unit: "g", category: "proteinas", protein: 9, carbs: 4, fat: 5, fiber: 0, source: "USDA FoodData Central" },
  { id: "food-queso-cottage", name: "Queso cottage", unit: "g", category: "proteinas", protein: 10.6, carbs: 4.8, fat: 2.3, fiber: 0, source: "USDA FoodData Central" },
  { id: "food-queso-untable-light", name: "Queso untable light", unit: "g", category: "proteinas", protein: 3.7, carbs: 4, fat: 13, fiber: 0, source: "FatSecret" },
  { id: "food-queso-duro", name: "Queso duro", unit: "g", category: "proteinas", protein: 35.8, carbs: 3.2, fat: 25.8, fiber: 0, source: "FatSecret" },
  { id: "food-whey-protein", name: "Proteína Whey", unit: "unidad", category: "proteinas", protein: 24, carbs: 2, fat: 2, fiber: 0, source: "Etiqueta fabricante" },
  { id: "food-leche-protein-serenisima", name: "Leche Protein La Serenísima", unit: "ml", category: "proteinas", protein: 5.2, carbs: 4.6, fat: 0, fiber: 0, source: "Etiqueta oficial La Serenísima" },
  { id: "food-leche-proteica", name: "Leche proteica", unit: "ml", category: "proteinas", protein: 5.2, carbs: 4.6, fat: 1.5, fiber: 0, source: "FatSecret" },
  { id: "food-leche-descremada", name: "Leche descremada", unit: "ml", category: "proteinas", protein: 3.4, carbs: 5, fat: 0.1, fiber: 0, source: "USDA FoodData Central" },

  /* -------------------------- Carbohidratos -------------------------- */
  { id: "food-arroz-blanco", name: "Arroz blanco cocido", unit: "g", category: "carbohidratos", protein: 2.7, carbs: 28, fat: 0.3, fiber: 0.4, source: "USDA FoodData Central" },
  { id: "food-arroz-integral", name: "Arroz integral (crudo)", unit: "g", category: "carbohidratos", protein: 7.9, carbs: 76, fat: 2.9, fiber: 3.5, source: "USDA FoodData Central" },
  { id: "food-avena", name: "Avena arrollada", unit: "g", category: "carbohidratos", protein: 16.9, carbs: 66.3, fat: 6.9, fiber: 10.6, source: "USDA FoodData Central" },
  { id: "food-harina-avena", name: "Harina de avena", unit: "g", category: "carbohidratos", protein: 15, carbs: 68, fat: 7, fiber: 7, source: "USDA FoodData Central" },
  { id: "food-papa", name: "Papa (cruda)", unit: "g", category: "carbohidratos", protein: 2, carbs: 17.5, fat: 0.1, fiber: 2.2, source: "USDA FoodData Central" },
  { id: "food-batata", name: "Batata", unit: "g", category: "carbohidratos", protein: 1.5, carbs: 17.7, fat: 0.1, fiber: 2, source: "USDA FoodData Central" },
  { id: "food-fideos-secos", name: "Fideos secos", unit: "g", category: "carbohidratos", protein: 13, carbs: 74.7, fat: 1.5, fiber: 3.2, source: "USDA FoodData Central" },
  { id: "food-fideos-integrales", name: "Fideos integrales secos", unit: "g", category: "carbohidratos", protein: 13.9, carbs: 73.4, fat: 2.9, fiber: 9.2, source: "USDA FoodData Central" },
  { id: "food-quinoa", name: "Quinoa cocida", unit: "g", category: "carbohidratos", protein: 4.4, carbs: 21, fat: 1.9, fiber: 2.8, source: "USDA FoodData Central" },
  { id: "food-cuscus", name: "Cuscús cocido", unit: "g", category: "carbohidratos", protein: 3.8, carbs: 23, fat: 0.2, fiber: 1.4, source: "USDA FoodData Central" },
  { id: "food-polenta", name: "Polenta cocida", unit: "g", category: "carbohidratos", protein: 2, carbs: 13.6, fat: 0.3, fiber: 1, source: "FatSecret" },
  { id: "food-pan-blanco", name: "Pan blanco", unit: "g", category: "carbohidratos", protein: 7.6, carbs: 50.6, fat: 3.3, fiber: 2.4, source: "USDA FoodData Central" },
  { id: "food-pan-integral", name: "Pan integral", unit: "unidad", category: "carbohidratos", protein: 3.9, carbs: 12.5, fat: 1.1, fiber: 2.1, source: "USDA FoodData Central" },
  { id: "food-tortilla-trigo", name: "Tortilla de trigo", unit: "g", category: "carbohidratos", protein: 8, carbs: 50, fat: 7, fiber: 2.7, source: "USDA FoodData Central" },
  { id: "food-tortilla-integral", name: "Tortilla integral", unit: "g", category: "carbohidratos", protein: 9.3, carbs: 47.2, fat: 10.2, fiber: 6, source: "USDA FoodData Central" },
  { id: "food-lentejas", name: "Lentejas cocidas", unit: "g", category: "carbohidratos", protein: 9.1, carbs: 20.3, fat: 0.4, fiber: 8, source: "USDA FoodData Central" },
  { id: "food-garbanzos", name: "Garbanzos cocidos", unit: "g", category: "carbohidratos", protein: 8.9, carbs: 27.4, fat: 2.6, fiber: 7.6, source: "USDA FoodData Central" },
  { id: "food-porotos-negros", name: "Porotos negros cocidos", unit: "g", category: "carbohidratos", protein: 8.9, carbs: 23.7, fat: 0.5, fiber: 8.7, source: "USDA FoodData Central" },
  { id: "food-porotos-blancos", name: "Porotos blancos cocidos", unit: "g", category: "carbohidratos", protein: 7.5, carbs: 24.3, fat: 0.1, fiber: 7.3, source: "USDA FoodData Central" },

  /* ------------------------------ Frutas ------------------------------ */
  { id: "food-banana", name: "Banana", unit: "unidad", category: "frutas", protein: 1.3, carbs: 27, fat: 0.4, fiber: 3.1, source: "USDA FoodData Central" },
  { id: "food-manzana", name: "Manzana", unit: "unidad", category: "frutas", protein: 0.5, carbs: 25, fat: 0.3, fiber: 4.4, source: "USDA FoodData Central" },
  { id: "food-pera", name: "Pera", unit: "unidad", category: "frutas", protein: 0.7, carbs: 27, fat: 0.3, fiber: 5.5, source: "USDA FoodData Central" },
  { id: "food-kiwi", name: "Kiwi", unit: "unidad", category: "frutas", protein: 0.9, carbs: 11.1, fat: 0.4, fiber: 2.3, source: "USDA FoodData Central" },
  { id: "food-mandarina", name: "Mandarina", unit: "unidad", category: "frutas", protein: 0.7, carbs: 11.7, fat: 0.3, fiber: 1.6, source: "USDA FoodData Central" },
  { id: "food-naranja", name: "Naranja", unit: "unidad", category: "frutas", protein: 1.2, carbs: 15.5, fat: 0.2, fiber: 3.1, source: "USDA FoodData Central" },
  { id: "food-pomelo", name: "Pomelo", unit: "unidad", category: "frutas", protein: 1.4, carbs: 18.6, fat: 0.2, fiber: 3.7, source: "USDA FoodData Central" },
  { id: "food-frutillas", name: "Frutillas", unit: "g", category: "frutas", protein: 0.7, carbs: 7.7, fat: 0.3, fiber: 2, source: "USDA FoodData Central" },
  { id: "food-arandanos", name: "Arándanos", unit: "g", category: "frutas", protein: 0.7, carbs: 14, fat: 0.3, fiber: 2.4, source: "USDA FoodData Central" },
  { id: "food-uvas", name: "Uvas", unit: "g", category: "frutas", protein: 0.7, carbs: 18.1, fat: 0.2, fiber: 0.9, source: "USDA FoodData Central" },
  { id: "food-anana", name: "Ananá", unit: "g", category: "frutas", protein: 0.5, carbs: 13, fat: 0.1, fiber: 1.4, source: "USDA FoodData Central" },
  { id: "food-mango", name: "Mango", unit: "g", category: "frutas", protein: 0.8, carbs: 15, fat: 0.4, fiber: 1.6, source: "USDA FoodData Central" },
  { id: "food-durazno", name: "Durazno", unit: "unidad", category: "frutas", protein: 1.4, carbs: 15.2, fat: 0.4, fiber: 2.3, source: "USDA FoodData Central" },
  { id: "food-ciruela", name: "Ciruela", unit: "unidad", category: "frutas", protein: 0.5, carbs: 7.5, fat: 0.2, fiber: 0.9, source: "USDA FoodData Central" },

  /* ----------------------------- Verduras ----------------------------- */
  { id: "food-tomate", name: "Tomate", unit: "g", category: "verduras", protein: 0.9, carbs: 3.9, fat: 0.2, fiber: 1.2, source: "USDA FoodData Central" },
  { id: "food-lechuga", name: "Lechuga", unit: "g", category: "verduras", protein: 1.4, carbs: 2.9, fat: 0.2, fiber: 1.3, source: "USDA FoodData Central" },
  { id: "food-espinaca", name: "Espinaca", unit: "g", category: "verduras", protein: 2.9, carbs: 3.6, fat: 0.4, fiber: 2.2, source: "USDA FoodData Central" },
  { id: "food-acelga", name: "Acelga", unit: "g", category: "verduras", protein: 1.8, carbs: 3.7, fat: 0.2, fiber: 1.6, source: "USDA FoodData Central" },
  { id: "food-brocoli", name: "Brócoli", unit: "g", category: "verduras", protein: 2.8, carbs: 6.6, fat: 0.4, fiber: 2.6, source: "USDA FoodData Central" },
  { id: "food-coliflor", name: "Coliflor", unit: "g", category: "verduras", protein: 1.9, carbs: 5, fat: 0.3, fiber: 2, source: "USDA FoodData Central" },
  { id: "food-pepino", name: "Pepino", unit: "g", category: "verduras", protein: 0.7, carbs: 3.6, fat: 0.1, fiber: 0.5, source: "USDA FoodData Central" },
  { id: "food-zanahoria", name: "Zanahoria", unit: "g", category: "verduras", protein: 0.9, carbs: 9.6, fat: 0.2, fiber: 2.8, source: "USDA FoodData Central" },
  { id: "food-morron-rojo", name: "Morrón rojo", unit: "g", category: "verduras", protein: 1, carbs: 6, fat: 0.3, fiber: 2.1, source: "USDA FoodData Central" },
  { id: "food-morron-verde", name: "Morrón verde", unit: "g", category: "verduras", protein: 0.9, carbs: 4.6, fat: 0.2, fiber: 1.7, source: "USDA FoodData Central" },
  { id: "food-cebolla", name: "Cebolla", unit: "g", category: "verduras", protein: 0.9, carbs: 8.5, fat: 0.1, fiber: 1.7, source: "USDA FoodData Central" },
  { id: "food-zapallito", name: "Zapallito", unit: "g", category: "verduras", protein: 1.2, carbs: 3.1, fat: 0.3, fiber: 1, source: "USDA FoodData Central" },
  { id: "food-zucchini", name: "Zucchini", unit: "g", category: "verduras", protein: 1.2, carbs: 3.1, fat: 0.3, fiber: 1, source: "USDA FoodData Central" },
  { id: "food-berenjena", name: "Berenjena", unit: "g", category: "verduras", protein: 1, carbs: 5.9, fat: 0.2, fiber: 3, source: "USDA FoodData Central" },
  { id: "food-repollo", name: "Repollo", unit: "g", category: "verduras", protein: 1, carbs: 6.4, fat: 0.2, fiber: 2.2, source: "USDA FoodData Central" },
  { id: "food-remolacha", name: "Remolacha", unit: "g", category: "verduras", protein: 1.7, carbs: 8.8, fat: 0.3, fiber: 3.1, source: "USDA FoodData Central" },
  { id: "food-apio", name: "Apio", unit: "g", category: "verduras", protein: 0.5, carbs: 3.3, fat: 0.2, fiber: 1.6, source: "USDA FoodData Central" },
  { id: "food-champinones", name: "Champiñones", unit: "g", category: "verduras", protein: 3.1, carbs: 3.3, fat: 0.3, fiber: 1, source: "USDA FoodData Central" },

  /* -------------------------- Grasas saludables ------------------------ */
  { id: "food-palta", name: "Palta", unit: "g", category: "grasas", protein: 2, carbs: 8.5, fat: 14.7, fiber: 6.7, source: "USDA FoodData Central" },
  { id: "food-aceite-oliva", name: "Aceite de oliva extra virgen", unit: "g", category: "grasas", protein: 0, carbs: 0, fat: 100, fiber: 0, source: "USDA FoodData Central" },
  { id: "food-almendras", name: "Almendras", unit: "g", category: "grasas", protein: 21.2, carbs: 21.6, fat: 49.9, fiber: 12.5, source: "USDA FoodData Central" },
  { id: "food-nueces", name: "Nueces", unit: "g", category: "grasas", protein: 15.2, carbs: 13.7, fat: 65.2, fiber: 6.7, source: "USDA FoodData Central" },
  { id: "food-castanas-caju", name: "Castañas de cajú", unit: "g", category: "grasas", protein: 18.2, carbs: 30.2, fat: 43.9, fiber: 3.3, source: "USDA FoodData Central" },
  { id: "food-pistachos", name: "Pistachos", unit: "g", category: "grasas", protein: 20.2, carbs: 27.7, fat: 45, fiber: 10.6, source: "USDA FoodData Central" },
  { id: "food-avellanas", name: "Avellanas", unit: "g", category: "grasas", protein: 15, carbs: 16.7, fat: 60.8, fiber: 9.7, source: "USDA FoodData Central" },
  { id: "food-frutos-secos", name: "Frutos secos (mix)", unit: "g", category: "grasas", protein: 18, carbs: 19, fat: 50, fiber: 10, source: "USDA FoodData Central" },
  { id: "food-manteca-mani", name: "Mantequilla de maní 100%", unit: "g", category: "grasas", protein: 22, carbs: 24, fat: 50, fiber: 6, source: "USDA FoodData Central" },
  { id: "food-semillas-chia", name: "Semillas de chía", unit: "g", category: "grasas", protein: 16.5, carbs: 42.1, fat: 30.7, fiber: 34.4, source: "USDA FoodData Central" },
  { id: "food-semillas-lino", name: "Semillas de lino", unit: "g", category: "grasas", protein: 18.3, carbs: 28.9, fat: 42.2, fiber: 27.3, source: "USDA FoodData Central" },
  { id: "food-semillas-girasol", name: "Semillas de girasol", unit: "g", category: "grasas", protein: 20.8, carbs: 20, fat: 51.5, fiber: 8.6, source: "USDA FoodData Central" },

  /* ------------------------------ Bebidas ------------------------------ */
  { id: "food-agua", name: "Agua", unit: "ml", category: "carbohidratos", protein: 0, carbs: 0, fat: 0, fiber: 0, source: "USDA FoodData Central" },
  { id: "food-cafe", name: "Café (negro, sin azúcar)", unit: "ml", category: "carbohidratos", protein: 0.1, carbs: 0.3, fat: 0, fiber: 0, source: "USDA FoodData Central" },
  { id: "food-te", name: "Té (sin azúcar)", unit: "ml", category: "carbohidratos", protein: 0.1, carbs: 0.3, fat: 0, fiber: 0, source: "USDA FoodData Central" },
  { id: "food-mate", name: "Mate (infusión, sin azúcar)", unit: "ml", category: "carbohidratos", protein: 0.1, carbs: 0.5, fat: 0, fiber: 0, source: "FatSecret" },
];

/**
 * Sprint 5.1 — "Sistema de Comidas Inteligentes": la unidad principal ya
 * no es el alimento suelto, es la comida armada. 2 opciones precargadas
 * por cada tipo (Desayuno/Almuerzo/Merienda/Cena) — sin editor todavía,
 * tal como pide el spec. Los macros de cada una se calculan siempre a
 * partir de `FOOD_CATALOG` (`computeMealTemplateMacros` en repository.ts)
 * — acá no hay ni un solo número de proteína/carbohidrato/grasa.
 */
export const MEAL_TEMPLATES: MealTemplate[] = [
  {
    id: "meal-desayuno-a",
    mealType: "desayuno",
    optionLabel: "Opción A",
    name: "Huevos con avena y banana",
    order: 1,
    active: true,
    items: [
      { foodId: "food-huevo", quantity: 4 },
      { foodId: "food-avena", quantity: 80 },
      { foodId: "food-banana", quantity: 1 },
      { foodId: "food-queso-duro", quantity: 20 },
    ],
  },
  {
    id: "meal-desayuno-b",
    mealType: "desayuno",
    optionLabel: "Opción B",
    name: "Panqueques de avena",
    order: 2,
    active: true,
    items: [
      { foodId: "food-huevo", quantity: 3 },
      { foodId: "food-harina-avena", quantity: 80 },
      { foodId: "food-leche-proteica", quantity: 150 },
      { foodId: "food-arandanos", quantity: 100 },
      { foodId: "food-kiwi", quantity: 1 },
    ],
  },
  {
    id: "meal-almuerzo-a",
    mealType: "almuerzo",
    optionLabel: "Opción A",
    name: "Pollo con arroz y brócoli",
    order: 1,
    active: true,
    items: [
      { foodId: "food-pechuga-pollo", quantity: 200 },
      { foodId: "food-arroz-blanco", quantity: 150 },
      { foodId: "food-brocoli", quantity: 100 },
      { foodId: "food-aceite-oliva", quantity: 10 },
    ],
  },
  {
    id: "meal-almuerzo-b",
    mealType: "almuerzo",
    optionLabel: "Opción B",
    name: "Bife con batata y palta",
    order: 2,
    active: true,
    items: [
      { foodId: "food-carne-magra", quantity: 180 },
      { foodId: "food-batata", quantity: 200 },
      { foodId: "food-palta", quantity: 50 },
      { foodId: "food-espinaca", quantity: 50 },
    ],
  },
  {
    id: "meal-merienda-a",
    mealType: "merienda",
    optionLabel: "Opción A",
    name: "Yogur con frutos secos y banana",
    order: 1,
    active: true,
    items: [
      { foodId: "food-yogur-griego", quantity: 200 },
      { foodId: "food-frutos-secos", quantity: 20 },
      { foodId: "food-banana", quantity: 1 },
    ],
  },
  {
    id: "meal-merienda-b",
    mealType: "merienda",
    optionLabel: "Opción B",
    name: "Tostadas con manteca de maní",
    order: 2,
    active: true,
    items: [
      { foodId: "food-pan-integral", quantity: 2 },
      { foodId: "food-manteca-mani", quantity: 20 },
      { foodId: "food-banana", quantity: 1 },
    ],
  },
  {
    id: "meal-cena-a",
    mealType: "cena",
    optionLabel: "Opción A",
    name: "Salmón con batata y brócoli",
    order: 1,
    active: true,
    items: [
      { foodId: "food-salmon", quantity: 180 },
      { foodId: "food-batata", quantity: 200 },
      { foodId: "food-brocoli", quantity: 100 },
    ],
  },
  {
    id: "meal-cena-b",
    mealType: "cena",
    optionLabel: "Opción B",
    name: "Atún con quinoa y espinaca",
    order: 2,
    active: true,
    items: [
      { foodId: "food-atun", quantity: 150 },
      { foodId: "food-quinoa", quantity: 150 },
      { foodId: "food-espinaca", quantity: 100 },
    ],
  },
];
