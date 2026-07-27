"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import { clsx } from "@/shared/utils/clsx";
import {
  completeMealTemplate,
  computeMealTemplateMacros,
  getFoodCatalog,
  getMealCompletionLog,
  getMealTemplates,
  getNutritionDailyProgress,
  getNutritionProfile,
} from "@/lib/mock/repository";
import { MealCompletionLog, MealSlot, MealTemplate, NutritionDailyProgress } from "@/lib/mock/types";

/**
 * Sprint 5.1 — "Sistema de Comidas Inteligentes". Pantalla nueva,
 * independiente de /nutricion (perfil/objetivos/favoritos, sin tocar) y
 * de /nutricion/objetivos (visualización de targets, sin tocar). Acá se
 * vive el ciclo diario: 2 opciones precargadas por tipo de comida, macros
 * siempre calculados desde `FOOD_CATALOG` (nunca a mano), y un solo click
 * para marcarla — sin confirmaciones, sin modales, sin formularios
 * (Principios 1 y 5 de AGENTS.md).
 *
 * "Actualizar el dashboard" del spec se resuelve acá mismo, con la card
 * de "Progreso de hoy" (`getNutritionDailyProgress`) — decisión de
 * diseño: no se tocó app/(app)/hoy/page.tsx (el Dashboard real de FORJA),
 * porque esa pantalla quedó fuera de alcance en cada sprint anterior y
 * este spec no trae un mockup de cómo debería verse ahí. Si se quiere
 * ese progreso también en el Dashboard, es un cambio aparte a pedir
 * explícitamente.
 */

const MEAL_TYPES: MealSlot[] = ["desayuno", "almuerzo", "merienda", "cena"];

const MEAL_TYPE_INFO: Record<MealSlot, { label: string; emoji: string }> = {
  desayuno: { label: "Desayuno", emoji: "🍳" },
  almuerzo: { label: "Almuerzo", emoji: "🍗" },
  merienda: { label: "Merienda", emoji: "🥪" },
  cena: { label: "Cena", emoji: "🌙" },
};

const foodById = new Map(getFoodCatalog().map((food) => [food.id, food]));

function formatItem(foodId: string, quantity: number): string {
  const food = foodById.get(foodId);
  if (!food) return "";
  return food.unit === "unidad" ? `${quantity} ${food.name}` : `${quantity} ${food.unit} ${food.name}`;
}

export default function ComidasDeHoyPage() {
  const [log, setLog] = useState<MealCompletionLog[] | undefined>(undefined);
  const [progress, setProgress] = useState<NutritionDailyProgress | undefined>(undefined);
  const [hasProfile, setHasProfile] = useState<boolean>(false);

  function refresh() {
    setLog(getMealCompletionLog());
    setProgress(getNutritionDailyProgress());
    setHasProfile(getNutritionProfile() !== null);
  }

  useEffect(() => {
    refresh();
  }, []);

  if (log === undefined || !progress) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-display font-semibold">Comidas de hoy</h1>
        <Card>
          <p className="text-text-secondary text-sm">Cargando…</p>
        </Card>
      </div>
    );
  }

  function handleComplete(templateId: string) {
    completeMealTemplate(templateId);
    refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Link href="/nutricion" className="text-text-muted text-xs uppercase tracking-wide font-display">
          ← Nutrición
        </Link>
        <h1 className="text-2xl font-display font-semibold mt-1">Comidas de hoy</h1>
      </div>

      {!hasProfile && (
        <Card>
          <p className="text-text-secondary text-sm">
            Todavía no configuraste tu plan nutricional — los objetivos de esta pantalla van a estar en 0 hasta que lo
            hagas.
          </p>
          <Link href="/nutricion" className="block mt-3">
            <Button type="button" variant="secondary">
              Configurar plan nutricional
            </Button>
          </Link>
        </Card>
      )}

      <Card raised>
        <p className="text-text-muted text-xs uppercase tracking-wide font-display">Progreso de hoy</p>
        <div className="flex flex-col gap-1.5 mt-3">
          <ProgressRow label="🥩 Proteína" consumed={progress.consumed.protein} target={progress.target.protein} unit="g" />
          <ProgressRow
            label="⚡ Carbohidratos"
            consumed={progress.consumed.carbs}
            target={progress.target.carbs}
            unit="g"
          />
          <ProgressRow label="🥑 Grasas" consumed={progress.consumed.fat} target={progress.target.fat} unit="g" />
          <ProgressRow label="🌱 Fibra" consumed={progress.consumed.fiber} target={progress.target.fiber} unit="g" />
          <ProgressRow
            label="🔥 Calorías"
            consumed={progress.consumed.kcal}
            target={progress.target.kcal}
            unit="kcal"
          />
        </div>
      </Card>

      {MEAL_TYPES.map((mealType) => {
        const options = getMealTemplates(mealType);
        const completedEntry = log.find((entry) => entry.mealType === mealType);
        const info = MEAL_TYPE_INFO[mealType];

        return (
          <div key={mealType} className="flex flex-col gap-3">
            <p className="text-text-muted text-xs uppercase tracking-wide font-display">
              {info.emoji} {info.label}
            </p>

            {options.map((template) => (
              <MealOptionCard
                key={template.id}
                template={template}
                isChosen={completedEntry?.mealTemplateId === template.id}
                isBlocked={Boolean(completedEntry) && completedEntry?.mealTemplateId !== template.id}
                onComplete={() => handleComplete(template.id)}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
}

function ProgressRow({
  label,
  consumed,
  target,
  unit,
}: {
  label: string;
  consumed: number;
  target: number;
  unit: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <p className="text-text-secondary text-sm">{label}</p>
      <p className="text-text-primary text-sm font-medium">
        {consumed} {target > 0 ? `/ ${target} ${unit}` : unit}
      </p>
    </div>
  );
}

function MealOptionCard({
  template,
  isChosen,
  isBlocked,
  onComplete,
}: {
  template: MealTemplate;
  isChosen: boolean;
  isBlocked: boolean;
  onComplete: () => void;
}) {
  const macros = computeMealTemplateMacros(template);

  return (
    <Card raised={isChosen} className={clsx(isBlocked && "opacity-50")}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-text-muted text-[11px] uppercase tracking-wide font-display">{template.optionLabel}</p>
          <p className="text-text-primary text-sm font-medium mt-1">{template.name}</p>
        </div>
        {isChosen && <p className="text-success text-xs font-display uppercase tracking-wide shrink-0">✅ Hecho</p>}
      </div>

      <ul className="text-text-secondary text-xs mt-3 flex flex-col gap-1">
        {template.items.map((item) => (
          <li key={item.foodId}>· {formatItem(item.foodId, item.quantity)}</li>
        ))}
      </ul>

      <div className="flex gap-3 mt-3 pt-3 border-t border-border-subtle">
        <Macro label="Prot" value={`${macros.protein}g`} />
        <Macro label="Carb" value={`${macros.carbs}g`} />
        <Macro label="Grasa" value={`${macros.fat}g`} />
        <Macro label="Kcal" value={macros.kcal} />
      </div>

      {!isChosen && (
        <Button type="button" variant="secondary" disabled={isBlocked} onClick={onComplete} className="mt-3">
          {isBlocked ? "No elegida hoy" : `✅ Marcar ${MEAL_TYPE_INFO[template.mealType].label.toLowerCase()} realizado`}
        </Button>
      )}
    </Card>
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
