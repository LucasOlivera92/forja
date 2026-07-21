"use client";

import { useEffect, useState } from "react";
import { Card } from "@/shared/ui/Card";
import { clsx } from "@/shared/utils/clsx";
import { getMealCatalog, getMealLog, toggleMeal } from "@/lib/mock/repository";
import { MealLogEntry } from "@/lib/mock/types";

const meals = getMealCatalog();

export default function NutricionPage() {
  const [log, setLog] = useState<MealLogEntry[] | null>(null);

  useEffect(() => {
    setLog(getMealLog());
  }, []);

  if (!log) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-display font-semibold">Nutrición</h1>
        <Card>
          <p className="text-text-secondary text-sm">Cargando tu plan de hoy…</p>
        </Card>
      </div>
    );
  }

  const completed = log.filter((e) => e.completedAt);
  const kcalTarget = meals.reduce((sum, m) => sum + m.kcal, 0);
  const kcalConsumed = meals
    .filter((m) => completed.some((e) => e.mealId === m.id))
    .reduce((sum, m) => sum + m.kcal, 0);

  function handleToggle(mealId: string) {
    setLog(toggleMeal(mealId));
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-display font-semibold">Nutrición</h1>
        <p className="text-text-secondary text-sm mt-1">
          {completed.length} / {meals.length} comidas · {kcalConsumed} / {kcalTarget} kcal
        </p>
      </div>

      {meals.map((meal) => {
        const entry = log.find((e) => e.mealId === meal.id);
        const done = Boolean(entry?.completedAt);

        return (
          <Card key={meal.id} className="transition-colors">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-text-muted text-xs uppercase tracking-wide font-display">
                  {meal.slotLabel}
                </p>
                <p className="text-text-primary text-sm font-medium mt-1">{meal.name}</p>
              </div>
              <button
                type="button"
                onClick={() => handleToggle(meal.id)}
                aria-pressed={done}
                className={clsx(
                  "h-11 w-11 shrink-0 rounded-lg border flex items-center justify-center transition-colors",
                  done
                    ? "bg-success border-success text-white"
                    : "border-border-subtle text-text-muted"
                )}
              >
                <CheckIcon />
              </button>
            </div>

            <ul className="text-text-secondary text-xs mt-3 flex flex-col gap-1">
              {meal.items.map((item) => (
                <li key={item}>· {item}</li>
              ))}
            </ul>

            <div className="flex gap-3 mt-3 pt-3 border-t border-border-subtle">
              <Macro label="Kcal" value={meal.kcal} />
              <Macro label="Prot" value={`${meal.protein}g`} />
              <Macro label="Carb" value={`${meal.carbs}g`} />
              <Macro label="Grasa" value={`${meal.fat}g`} />
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function Macro({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col">
      <span className="text-text-muted text-[10px] uppercase tracking-wide">{label}</span>
      <span className="text-text-secondary text-xs font-medium">{value}</span>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
      <path d="M5 12.5 10 17.5 19 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
