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
/* Nutrición — motor del plan nutricional (Sprint 5.0)                  */
/* ------------------------------------------------------------------ */

/**
 * Sprint 5.0 — Perfil nutricional único del usuario. Es el "motor" sobre
 * el que Sprint 5.1 va a generar automáticamente Desayuno/Almuerzo/
 * Merienda/Cena usando exclusivamente los alimentos favoritos de acá. NO
 * reemplaza `MealCatalogItem`/`MealLogEntry` (el diario de comidas
 * existente, del que depende `getDashboardSummary` — no se toca) — es un
 * concepto nuevo y separado, guardado bajo su propia key.
 */
export type NutritionGoal = "Volumen" | "Recomposición corporal" | "Definición" | "Mantenimiento";

export type ActivityLevel = "Baja" | "Moderada" | "Alta" | "Deportista";

/** Sprint 5.0 — las 5 categorías fijas del selector de alimentos favoritos. */
export type FavoriteFoodCategory = "proteinas" | "carbohidratos" | "grasas" | "frutas" | "verduras";

export interface NutritionProfile {
  heightCm: number;
  weightKg: number;
  goal: NutritionGoal;
  activity: ActivityLevel;
  mealsPerDay: number;
  /**
   * Objetivos diarios editables a mano — Sprint 5.0 NO los calcula
   * automáticamente (eso llega en Sprint 5.2, cuando se adapten según
   * cambio de peso/objetivo/actividad/frecuencia de entrenamiento).
   */
  targetProtein: number;
  targetCarbs: number;
  targetFat: number;
  targetWaterLiters: number;
  /**
   * Sprint 5.0 (continuación — "Objetivos nutricionales diarios"): mismo
   * patrón que los targets de arriba, editables a mano, arrancan en 0.
   */
  targetWeightKg: number;
  targetCalories: number;
  targetFiber: number;
  targetFruitPortions: number;
  targetVegetablesGrams: number;
  favoriteProteins: string[];
  favoriteCarbs: string[];
  favoriteFats: string[];
  favoriteFruits: string[];
  favoriteVegetables: string[];
  /**
   * Sprint 5.0 (continuación) — metadata de auditoría, ISO 8601. `createdAt`
   * se fija una sola vez en `saveNutritionProfile`; `updatedAt` se
   * refresca en cada `updateNutritionProfile` (incluida cualquier edición
   * de objetivos o favoritos). No hay `userId`: la app entera es de un
   * solo usuario local sobre `localStorage` — no existe ningún concepto
   * de sesión/autenticación en ningún otro módulo de FORJA todavía (el
   * login vive deshabilitado en "modo demo", ver `lib/supabase/env.ts`).
   * Agregar un `userId` acá sería un campo muerto que nadie escribe ni
   * lee. El día que se conecte Supabase de verdad, ahí sí se agrega junto
   * con la columna real de la tabla `nutrition_profiles`.
   */
  createdAt: string;
  updatedAt: string;
}

/**
 * Sprint 5.0 — datos del formulario inicial "Configurar plan nutricional".
 * Los objetivos diarios y los favoritos arrancan vacíos/en 0 y se editan
 * después, ya con el perfil creado.
 */
export interface CreateNutritionProfileInput {
  heightCm: number;
  weightKg: number;
  goal: NutritionGoal;
  activity: ActivityLevel;
  mealsPerDay: number;
}

/** Sprint 5.0 — edición parcial de cualquier campo del perfil ya creado (objetivos diarios, favoritos, o los datos base). */
export type UpdateNutritionProfileInput = Partial<NutritionProfile>;

/* ------------------------------------------------------------------ */
/* Nutrición — Sistema de Comidas Inteligentes (Sprint 5.1)             */
/* ------------------------------------------------------------------ */

/**
 * Sprint 5.1 — Catálogo Maestro de Alimentos: única fuente de verdad de
 * macros por alimento. Las Meal Templates de abajo NUNCA guardan macros a
 * mano — solo referencian un `foodId` de acá + una cantidad, y los
 * totales se calculan siempre en `computeMealTemplateMacros()`.
 *
 * Ojo: NO tiene un campo `kcal`. Las calorías se derivan siempre con la
 * fórmula estándar 4/4/9 (proteína×4 + carbohidratos×4 + grasas×9) en
 * `repository.ts` — guardar kcal como campo aparte sería un dato
 * duplicado que se puede desincronizar de los macros (Principio 2 de
 * AGENTS.md: "cada dato debe tener un propósito", no "por si acaso").
 */
export type FoodUnit = "g" | "ml" | "unidad";

export interface FoodCatalogItem {
  id: string;
  name: string;
  unit: FoodUnit;
  /**
   * Macros por 100 (si `unit` es "g" o "ml") o por 1 (si `unit` es
   * "unidad") — la cantidad de referencia se deriva siempre de `unit` en
   * vez de guardarse como campo aparte (mismo motivo que el kcal: evitar
   * un dato redundante que se pueda desincronizar).
   */
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

/** Sprint 5.1 — un ítem de una Meal Template: solo referencia + cantidad, nunca macros. */
export interface MealTemplateItem {
  foodId: string;
  /** Gramos/ml si el alimento es por peso, o cantidad de unidades si es "unidad". */
  quantity: number;
}

/**
 * Sprint 5.1 — Meal Template: unidad principal del sistema de comidas (no
 * el alimento suelto). Reutiliza `MealSlot` (ya definido arriba para el
 * diario de comidas viejo) para `mealType` en vez de inventar un enum
 * nuevo con el mismo significado. Sin editor todavía — las 8 plantillas
 * iniciales (2 opciones × 4 tipos de comida) quedan precargadas en
 * `MEAL_TEMPLATES` (data.ts); `active`/`order` ya preparan el terreno
 * para un editor futuro sin tener que migrar el modelo.
 */
export interface MealTemplate {
  id: string;
  mealType: MealSlot;
  /** "Opción A" / "Opción B" — string libre a propósito, para no atar el modelo a exactamente 2 opciones en el futuro. */
  optionLabel: string;
  name: string;
  items: MealTemplateItem[];
  order: number;
  active: boolean;
}

/** Sprint 5.1 — resultado de calcular los macros de una Meal Template (o de un registro diario). Siempre calculado, nunca tipeado a mano. */
export interface MealMacros {
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  kcal: number;
}

/**
 * Sprint 5.1 — "Registro diario": lo que queda guardado al tocar
 * "Marcar {tipo} realizado". Los macros son una FOTO calculada en el
 * momento (vía `computeMealTemplateMacros`) y se persisten en el
 * registro — no se recalculan cada vez leyendo la plantilla en vivo — a
 * propósito: si mañana se edita una Meal Template o un alimento del
 * catálogo, los días ya registrados no deben cambiar retroactivamente
 * (mismo criterio que ya usa `MealCatalogItem`, que guarda kcal/macros
 * fijos por comida). Sigue sin haber `userId`: un solo usuario local,
 * igual que el resto de FORJA (ver nota en `NutritionProfile`).
 */
export interface MealCompletionLog {
  id: string;
  mealTemplateId: string;
  mealType: MealSlot;
  /** Fecha calendario (YYYY-MM-DD), para agrupar por día como el resto de la app. */
  date: string;
  /** Momento exacto (ISO 8601) — de acá sale la hora mostrada en la UI. */
  completedAt: string;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  kcal: number;
}

/**
 * Sprint 5.1 — progreso nutricional del día, sumando todos los
 * `MealCompletionLog` de hoy contra los objetivos del `NutritionProfile`.
 * Distinto de `NutritionProgress` (Sprint 3.x, basado en `MEAL_CATALOG` y
 * kcal solamente) — ese sigue alimentando `getDashboardSummary()` sin
 * tocarse; este es el progreso de macros del nuevo sistema de comidas.
 */
export interface NutritionDailyProgress {
  consumed: MealMacros;
  target: {
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
    kcal: number;
  };
  /** 0-100, redondeado, por macro — clampeado a 100 aunque se pase del objetivo. */
  percent: {
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
    kcal: number;
  };
}

/* ------------------------------------------------------------------ */
/* Nutrición — Motor de Análisis (Sprint 5.2)                          */
/* ------------------------------------------------------------------ */

/**
 * Sprint 5.2 — Todo lo de acá se DERIVA de `MealCompletionLog` en el
 * momento de pedirlo (repository.ts) — no hay ninguna tabla/key nueva en
 * localStorage. `MealTemplate` sigue siendo solo plantilla y
 * `FOOD_CATALOG` sigue siendo la única fuente de verdad de un alimento;
 * este motor no le agrega ni le saca responsabilidades a ninguno de los
 * dos, solo lee lo que el usuario ya registró.
 */
export type NutritionStatsPeriod = "semana" | "mes";

/**
 * Rollup de UN día — la unidad mínima de la que salen todas las demás
 * métricas (adherencia, promedios, rachas, series de gráfico). Reutiliza
 * `MealMacros` para no duplicar la forma de "un grupo de macros".
 */
export interface NutritionDailyStat extends MealMacros {
  date: string;
  mealsCompleted: number;
  /** Cantidad de tipos de comida distintos que existen hoy en el sistema (hoy: 4 — desayuno/almuerzo/merienda/cena). Se deriva de `MEAL_TEMPLATES`, nunca un número fijo repetido en varios lados. */
  mealsExpected: number;
  adherencePercent: number;
}

/** Promedio de adherencia de un día de la semana (Lunes, Martes, ...) a lo largo de todo el historial disponible. */
export interface NutritionWeekdayStat {
  /** 0 = domingo .. 6 = sábado, igual que `Date.getDay()`. */
  weekday: number;
  weekdayLabel: string;
  averageAdherencePercent: number;
  /** Cuántos días de ese día-de-semana hay en el historial — para no confundir "1 solo domingo registrado" con una tendencia real. */
  daysCounted: number;
}

/** Sprint 5.2 — un punto de una serie lista para graficar. `x` es genérico (fecha calendario, o nombre de día de semana para `adherenceByWeekday`). */
export interface NutritionChartSeriesPoint {
  x: string;
  value: number;
}

export interface NutritionChartSeries {
  id: string;
  label: string;
  unit: string;
  points: NutritionChartSeriesPoint[];
}

/** Sprint 5.2 — racha de días con adherencia 100% (los 4 tipos de comida completados ese día). Mismo criterio que ya usa `getStreak()` para el Acero, aplicado a nutrición. */
export interface NutritionStreaks {
  current: number;
  best: number;
}

/**
 * Sprint 5.2 — reporte de estadísticas para un período (semana o mes que
 * contiene `periodStart`). Es el objeto que alimenta la pantalla de
 * Estadísticas y, más adelante, el informe descargable — mismo patrón
 * que `DashboardSummary` (un solo objeto agregado, calculado a partir de
 * piezas ya existentes, sin volver a calcular nada dos veces).
 */
export interface NutritionAnalyticsReport {
  period: NutritionStatsPeriod;
  periodStart: string;
  periodEnd: string;
  /** Días ya transcurridos del período (capados a hoy — un período en curso nunca cuenta días futuros como "comidas omitidas"). */
  daysElapsed: number;

  mealsCompleted: number;
  mealsExpected: number;
  mealsOmitted: number;
  /** % de adherencia del período completo (comidas realizadas / esperadas). */
  adherencePercent: number;

  /** Promedio diario de cada macro en el período (los días sin ningún registro cuentan como 0, no se excluyen del promedio). */
  averages: MealMacros;
  /**
   * Agua promedio: siempre `null` a propósito. FORJA todavía no tiene
   * ninguna forma de registrar agua consumida (no existe esa función en
   * ningún lado del repositorio) — mostrar un 0 o inventar un valor acá
   * sería un dato falso. Cuando exista un registro de agua real, este
   * campo pasa a ser `number`.
   */
  waterAverageMl: null;

  /** Calculados sobre TODO el historial disponible (no solo este período) — son patrones estructurales, no algo que tenga sentido "por semana". */
  bestWeekday: NutritionWeekdayStat | null;
  worstWeekday: NutritionWeekdayStat | null;
  weekdayStats: NutritionWeekdayStat[];
  currentStreak: number;
  bestStreak: number;

  /** Un `NutritionDailyStat` por cada día del período — la materia prima de todo lo de arriba, y lo que arma las series de `charts`. */
  dailyStats: NutritionDailyStat[];

  /**
   * Series listas para pasarle a una librería de gráficos en un sprint
   * futuro. Todavía no se renderiza ningún gráfico (no corresponde
   * todavía según el spec) — esto es solo el modelo de datos.
   */
  charts: {
    weeklyAdherence: NutritionChartSeries;
    proteinEvolution: NutritionChartSeries;
    carbsEvolution: NutritionChartSeries;
    fatEvolution: NutritionChartSeries;
    mealsCompliance: NutritionChartSeries;
    adherenceByWeekday: NutritionChartSeries;
  };
}

/* ------------------------------------------------------------------ */
/* Nutrición — Tendencias e Insights (Sprint 5.2.1)                     */
/* ------------------------------------------------------------------ */

/**
 * Sprint 5.2.1 — "¿Estoy mejorando?" en vez de "semana A vs. semana B"
 * aisladas. `up`/`down` solo cuando el cambio supera el umbral de ruido
 * (`STABLE_THRESHOLD_PERCENT` en repository.ts) — un cambio de 1-2% no
 * es una tendencia, es variación normal día a día.
 */
export type TrendDirection = "up" | "down" | "stable";

export interface NutritionTrendMetric {
  metric: "protein" | "carbs" | "fat" | "fiber" | "kcal" | "adherencePercent";
  label: string;
  unit: string;
  /** Promedio del período actual. */
  current: number;
  /**
   * Promedio de los `baselinePeriods` períodos ANTERIORES (no un solo
   * período aislado) — así una sola semana rara no dispara un "▲"/"▼"
   * que no refleja una tendencia real.
   */
  baseline: number;
  changePercent: number;
  direction: TrendDirection;
}

/**
 * Sprint 5.2.1 — reemplaza el viejo `weekOverWeek: {current, previous}`
 * (comparación de un solo par de semanas) por un modelo de tendencia:
 * el período actual contra el PROMEDIO de varios períodos anteriores.
 * Se apoya enteramente en `getNutritionAnalytics` — no recalcula macros
 * ni adherencia por su cuenta.
 */
export interface NutritionTrends {
  period: NutritionStatsPeriod;
  periodStart: string;
  periodEnd: string;
  /** Cuántos períodos anteriores se promediaron para el baseline (ej: 4 semanas). */
  baselinePeriods: number;
  metrics: NutritionTrendMetric[];
}

/** Sprint 5.2.1 — de qué "familia" es la recomendación; determina ícono/color cuando se muestre en la UI. */
export type InsightType = "positive" | "warning" | "suggestion" | "milestone" | "info";

export type InsightPriority = "alta" | "media" | "baja";

/**
 * Sprint 5.2.1 — estructura única para cualquier recomendación
 * automática (reglas simples o IA, en un sprint futuro). Hoy nadie
 * genera insights todavía (`getNutritionInsights` devuelve `[]`) — esto
 * es el molde que va a usar esa lógica cuando exista, para que nunca
 * haya dos formatos distintos de "recomendación" en FORJA.
 */
export interface NutritionInsight {
  id: string;
  type: InsightType;
  priority: InsightPriority;
  title: string;
  description: string;
  /** A qué métrica del Analytics Engine se refiere (ej: "protein", "adherencePercent") — para poder ubicarla sin duplicar el dato numérico acá. */
  metric: string;
  createdAt: string;
}

/**
 * Sprint 5.2 (actualizado en 5.2.1) — toda la información que un informe
 * descargable futuro va a necesitar. Todavía NO hay exportación (ni PDF
 * ni ningún archivo) — esto es solo la data ya armada y lista,
 * reutilizando `getNutritionAnalytics`/`getNutritionTrends` sin duplicar
 * ningún cálculo.
 */
export interface NutritionReportData {
  generatedAt: string;
  profile: NutritionProfile | null;
  today: NutritionDailyProgress;
  week: NutritionAnalyticsReport;
  month: NutritionAnalyticsReport;
  /** "¿Estoy mejorando?" — semana actual vs. promedio de las últimas semanas, no un par aislado. */
  trends: NutritionTrends;
  /** Últimos ~60 días, día por día — para la sección de historial del informe. */
  history: NutritionDailyStat[];
  /** Recomendaciones automáticas — vacío hasta que un sprint futuro implemente la lógica que las genera (reglas o IA), usando siempre `NutritionInsight`. */
  insights: NutritionInsight[];
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
