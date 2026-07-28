"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import { ProgressBar } from "@/shared/ui/ProgressBar";
import { clsx } from "@/shared/utils/clsx";
import { getMealTemplates, getWeeklyMealPlan, getWeeklyMealPlanCompletion, setWeeklyMealPlanSlot } from "@/lib/mock/repository";
import { MealSlot, Weekday, WeeklyMealPlan, WeeklyMealPlanCompletion } from "@/lib/mock/types";

/**
 * Sprint 5.3 — "Planificación semanal". El usuario nunca escribe nada
 * acá: por cada día × tipo de comida elige una de las Meal Templates ya
 * existentes (Sprint 5.1) tocando un chip — igual que el patrón de
 * favoritos/objetivos de /nutricion, sin botón "Guardar" porque cada
 * toque persiste solo (`setWeeklyMealPlanSlot`). No se crean comidas
 * nuevas acá, solo se referencian por id — el Shopping Engine
 * (/nutricion/lista-compras) es quien recorre esta planificación.
 */

const WEEKDAYS: { id: Weekday; label: string }[] = [
  { id: "lunes", label: "Lunes" },
  { id: "martes", label: "Martes" },
  { id: "miercoles", label: "Miércoles" },
  { id: "jueves", label: "Jueves" },
  { id: "viernes", label: "Viernes" },
  { id: "sabado", label: "Sábado" },
  { id: "domingo", label: "Domingo" },
];

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

  function handleChoose(weekday: Weekday, mealType: MealSlot, templateId: string, alreadyChosen: boolean) {
    const updated = setWeeklyMealPlanSlot(weekday, mealType, alreadyChosen ? null : templateId);
    setPlan(updated);
    setCompletion(getWeeklyMealPlanCompletion());
  }

  const percent = Math.round((completion.planned / completion.total) * 100);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Link href="/nutricion" className="text-text-muted text-xs uppercase tracking-wide font-display">
          ← Nutrición
        </Link>
        <h1 className="text-2xl font-display font-semibold mt-1">Planificación semanal</h1>
        <p className="text-text-secondary text-sm mt-1">Elegí qué vas a comer cada día. FORJA arma la lista sola.</p>
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

      <Link href="/nutricion/lista-compras">
        <Button type="button" variant="secondary">
          🛒 Ver lista de compras
        </Button>
      </Link>

      <div className="flex flex-col gap-3">
        {WEEKDAYS.map(({ id: weekday, label }) => {
          const isOpen = openDay === weekday;
          const plannedCount = MEAL_TYPES.filter((meal) => plan[weekday][meal.id]).length;

          return (
            <Card key={weekday}>
              <button
                type="button"
                onClick={() => setOpenDay(isOpen ? null : weekday)}
                className="flex items-center justify-between w-full"
              >
                <p className="text-text-primary text-sm font-medium">{label}</p>
                <p className="text-text-muted text-xs font-display uppercase tracking-wide">
                  {plannedCount}/{MEAL_TYPES.length} {isOpen ? "▲" : "▼"}
                </p>
              </button>

              {isOpen && (
                <div className="flex flex-col gap-4 mt-4 pt-4 border-t border-border-subtle">
                  {MEAL_TYPES.map((meal) => {
                    const options = getMealTemplates(meal.id);
                    const chosenId = plan[weekday][meal.id];

                    return (
                      <div key={meal.id}>
                        <label className="text-text-muted text-[11px] uppercase tracking-wide font-display">
                          {meal.emoji} {meal.label}
                        </label>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {options.map((template) => {
                            const isChosen = chosenId === template.id;
                            return (
                              <button
                                key={template.id}
                                type="button"
                                onClick={() => handleChoose(weekday, meal.id, template.id, isChosen)}
                                className={clsx(
                                  "h-9 px-4 rounded-full text-xs font-display uppercase tracking-wide border transition-colors",
                                  isChosen
                                    ? "bg-accent-primary border-accent-primary text-white"
                                    : "bg-transparent border-border-subtle text-text-secondary"
                                )}
                              >
                                {isChosen ? "☑ " : "☐ "}
                                {template.name}
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
        })}
      </div>
    </div>
  );
}
