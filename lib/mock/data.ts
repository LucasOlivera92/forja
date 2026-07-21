import { ExerciseCatalogItem, MealCatalogItem, RoutineDay } from "./types";

/**
 * Catálogo fijo (Sprint 1). Datos simulados para poder recorrer la app
 * de punta a punta antes de conectar Supabase. `id` estable: cuando se
 * reemplace por tablas reales, estos mismos ids van a existir como filas.
 */

export const EXERCISE_CATALOG: ExerciseCatalogItem[] = [
  {
    id: "ex-press-banca",
    name: "Press banca",
    muscleGroup: "Pecho",
    targetSets: 4,
    targetReps: "8-10",
  },
  {
    id: "ex-press-militar",
    name: "Press militar con mancuernas",
    muscleGroup: "Hombro",
    targetSets: 3,
    targetReps: "10-12",
  },
  {
    id: "ex-fondos",
    name: "Fondos en paralelas",
    muscleGroup: "Tríceps / Pecho",
    targetSets: 3,
    targetReps: "10-12",
  },
  {
    id: "ex-extension-triceps",
    name: "Extensión de tríceps en polea",
    muscleGroup: "Tríceps",
    targetSets: 3,
    targetReps: "12-15",
  },
];

export const TODAY_ROUTINE: RoutineDay = {
  id: "routine-empuje",
  name: "Empuje — Pecho / Hombro / Tríceps",
  exercises: EXERCISE_CATALOG,
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
