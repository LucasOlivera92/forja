"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import { ProgressBar } from "@/shared/ui/ProgressBar";
import { clsx } from "@/shared/utils/clsx";
import {
  CATEGORY_EMOJI,
  computeMealTemplateMacros,
  getFoodCatalog,
  getMealTemplates,
  getWeeklyMealPlan,
  getWeeklyMealPlanCompletion,
  repeatMondayToSaturday,
  setWeeklyMealPlanSlot,
} from "@/lib/mock/repository";
import { MealSlot, MealTemplate, Weekday, WeeklyMealPlan, WeeklyMealPlanCompletion } from "@/lib/mock/types";

/**
 * Sprint 5.3 — "Planificación semanal". Cada día tiene 4 casilleros
 * independientes (Desayuno/Almuerzo/Merienda/Cena, un `MealSlot` cada
 * uno) — es la única fuente de verdad (`WeeklyMealPlan`, sin cambios
 * desde 5.3). "Repetir de lunes a sábado" sigue siendo el atajo para no
 * repetir la elección los 7 días; el domingo queda siempre aparte.
 *
 * Sprint 5.6 — fix de dos bugs introducidos por el "modo bloques" de
 * 5.3.1/5.3.2 (agrupar Desayuno+Merienda y Almuerzo+Cena bajo una sola
 * decisión): (1) los macros mostrados eran la SUMA de dos comidas
 * distintas mostrada como si fuera una sola opción, y (2) al no poder
 * elegir Desayuno y Merienda por separado, elegir uno pisaba al otro en
 * la práctica. Esta pantalla vuelve a seleccionar y mostrar cada
 * `MealSlot` de forma independiente — la arquitectura (`WeeklyMealPlan`,
 * `MealTemplate`, `computeMealTemplateMacros`) no cambió en nada, solo
 * se dejó de agrupar dos casilleros bajo un solo control en la UI.
 */

const OPTION_BADGES = ["🅰️", "🅱️"];

const foodById = new Map(getFoodCatalog().map((food) => [food.id, food]));

/** Ícono + cantidad + nombre, leídos 100% del catálogo — mismo criterio que /nutricion/hoy. */
function formatIngredient(foodId: string, quantity: number): string {
  const food = foodById.get(foodId);
  if (!food) return "";
  const emoji = CATEGORY_EMOJI[food.category];
  const qtyText = food.unit === "unidad" ? `${quantity} ${food.name}` : `${quantity} ${food.unit} ${food.name}`;
  return `${emoji} ${qtyText}`;
}

const WEEKDAYS: { id: Weekday; label: string }[] = [
  { id: "lunes", label: "Lunes" },
  { id: "martes", label: "Martes" },
  { id: "miercoles", label: "Miércoles" },
  { id: "jueves", label: "Jueves" },
  { id: "viernes", label: "Viernes" },
  { id: "sabado", label: "Sábado" },
];

const DOMINGO: { id: Weekday; label: string } = { id: "domingo", label: "Domingo" };

const MEAL_TYPES: { id: MealSlot; label: string; emoji: string }[] = [
  { id: "desayuno", label: "Desayuno", emoji: "🍳" },
  { id: "almuerzo", label: "Almuerzo", emoji: "🍗" },
  { id: "merienda", label: "Merienda", emoji: "🥪" },
  { id: "cena", label: "Cena", emoji: "🌙" },
];

export default function PlanificacionPage() {
  const [plan, setPlan] = useState<WeeklyMealPlan | undefined>(undefined);
  const [completion, setCompletion] = useState<WeeklyMealPlanCompletion | undefined>(undefined);
  const [openDay, setOpenDay] = useState<Weekday | null>(null);
  const [repeatMessage, setRepeatMessage] = useState<string | null>(null);

  function refresh() {
    setPlan(getWeeklyMealPlan());
    setCompletion(getWeeklyMealPlanCompletion());
  }

  useEffect(() => {
    refresh();
    setOpenDay("lunes");
  }, []);

  if (!plan || !completion) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-display font-semibold">Planificación semanal</h1>
        <Card>
          <p className="text-text-secondary text-sm">Cargando…</p>
        </Card>
      </div>
    );
  }

  /** Cada MealSlot guarda y muestra su propio estado — elegir uno nunca toca a los demás. */
  function handleChoose(weekday: Weekday, mealType: MealSlot, templateId: string, alreadyChosen: boolean) {
    setWeeklyMealPlanSlot(weekday, mealType, alreadyChosen ? null : templateId);
    refresh();
    setRepeatMessage(null);
  }

  function handleRepeat() {
    repeatMondayToSaturday();
    refresh();
    setRepeatMessage("Lunes a sábado ya tienen la misma planificación. Domingo quedó libre.");
  }

  const percent = Math.round((completion.planned / completion.total) * 100);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Link href="/nutricion" className="text-text-muted text-xs uppercase tracking-wide font-display">
          ← Nutrición
        </Link>
        <h1 className="text-2xl font-display font-semibold mt-1">Planificación semanal</h1>
        <p className="text-text-secondary text-sm mt-1">
          Elegí las 4 comidas del lunes y repetilas toda la semana. FORJA arma la lista sola.
        </p>
      </div>

      <Card raised>
        <div className="flex items-center justify-between">
          <p className="text-text-muted text-xs uppercase tracking-wide font-display">Comidas planificadas</p>
          <p className="text-text-primary text-sm font-medium">
            {completion.planned}/{completion.total}
          </p>
        </div>
        <div className="mt-2">
          <ProgressBar percent={percent} />
        </div>
      </Card>

      <Button type="button" variant="primary" onClick={handleRepeat}>
        🔁 Repetir de lunes a sábado
      </Button>
      {repeatMessage && <p className="text-success text-xs text-center">{repeatMessage}</p>}

      <Link href="/nutricion/lista-compras">
        <Button type="button" variant="secondary">
          🛒 Ver lista de compras
        </Button>
      </Link>

      <div className="flex flex-col gap-3">
        {WEEKDAYS.map((weekday) => (
          <DayCard key={weekday.id} weekday={weekday} plan={plan} isOpen={openDay === weekday.id} onToggle={setOpenDay} onChoose={handleChoose} />
        ))}
      </div>

      <div>
        <p className="text-text-muted text-xs uppercase tracking-wide font-display mb-3">
          Domingo — comida libre o planificación aparte
        </p>
        <DayCard weekday={DOMINGO} plan={plan} isOpen={openDay === DOMINGO.id} onToggle={setOpenDay} onChoose={handleChoose} />
      </div>
    </div>
  );
}

function DayCard({
  weekday,
  plan,
  isOpen,
  onToggle,
  onChoose,
}: {
  weekday: { id: Weekday; label: string };
  plan: WeeklyMealPlan;
  isOpen: boolean;
  onToggle: (weekday: Weekday | null) => void;
  onChoose: (weekday: Weekday, mealType: MealSlot, templateId: string, alreadyChosen: boolean) => void;
}) {
  const plannedCount = MEAL_TYPES.filter((meal) => plan[weekday.id][meal.id]).length;

  return (
    <Card>
      <button
        type="button"
        onClick={() => onToggle(isOpen ? null : weekday.id)}
        className="flex items-center justify-between w-full"
      >
        <p className="text-text-primary text-sm font-medium">{weekday.label}</p>
        <p className="text-text-muted text-xs font-display uppercase tracking-wide">
          {plannedCount}/{MEAL_TYPES.length} {isOpen ? "▲" : "▼"}
        </p>
      </button>

      {isOpen && (
        <div className="flex flex-col gap-4 mt-4 pt-4 border-t border-border-subtle">
          {MEAL_TYPES.map((meal) => {
            const options = getMealTemplates(meal.id);
            const chosenId = plan[weekday.id][meal.id];

            return (
              <div key={meal.id}>
                <label className="text-text-muted text-[11px] uppercase tracking-wide font-display">
                  {meal.emoji} {meal.label}
                </label>
                <div className="flex flex-col gap-2 mt-2">
                  {options.map((template, index) => {
                    const isChosen = chosenId === template.id;
                    return (
                      <button
                        key={template.id}
                        type="button"
                        onClick={() => onChoose(weekday.id, meal.id, template.id, isChosen)}
                        className={clsx(
                          "w-full text-left rounded-xl border px-4 py-3 transition-colors",
                          isChosen ? "bg-accent-primary border-accent-primary" : "bg-transparent border-border-subtle"
                        )}
                      >
                        <p
                          className={clsx(
                            "text-sm font-display uppercase tracking-wide",
                            isChosen ? "text-white" : "text-text-primary"
                          )}
                        >
                          {OPTION_BADGES[index] ?? "•"} {template.optionLabel}
                        </p>
                        <OptionSummary template={template} isChosen={isChosen} />
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

const MAX_VISIBLE_INGREDIENTS = 3;

/**
 * Resumen debajo de cada botón de opción — 100% derivado en vivo de ESA
 * `MealTemplate` (hasta 3 ingredientes + sus propios macros, vía
 * `computeMealTemplateMacros`). Nunca combina dos comidas distintas: acá
 * es donde estaba el Bug 1 — se sumaban los macros de dos MealTemplates
 * (ej. desayuno + merienda) y se mostraban como si fueran los de una
 * sola opción.
 */
function OptionSummary({ template, isChosen }: { template: MealTemplate; isChosen: boolean }) {
  const visibleItems = template.items.slice(0, MAX_VISIBLE_INGREDIENTS);
  const extraCount = template.items.length - visibleItems.length;
  const macros = computeMealTemplateMacros(template);

  const secondaryText = isChosen ? "text-white/80" : "text-text-muted";
  const macrosText = isChosen ? "text-white" : "text-text-secondary";

  return (
    <div className="flex flex-col gap-0.5 mt-1.5">
      {visibleItems.map((item, index) => (
        <p key={`${item.foodId}-${index}`} className={clsx("text-xs", secondaryText)}>
          {formatIngredient(item.foodId, item.quantity)}
        </p>
      ))}
      {extraCount > 0 && <p className={clsx("text-xs", secondaryText)}>+{extraCount} ingredientes</p>}
      <p className={clsx("text-xs font-medium mt-0.5", macrosText)}>
        P {macros.protein}g • C {macros.carbs}g • G {macros.fat}g
      </p>
    </div>
  );
}
