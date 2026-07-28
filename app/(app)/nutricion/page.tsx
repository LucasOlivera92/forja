"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import { clsx } from "@/shared/utils/clsx";
import {
  getFavoriteFoodOptions,
  getNutritionProfile,
  saveNutritionProfile,
  updateNutritionProfile,
} from "@/lib/mock/repository";
import { ActivityLevel, FavoriteFoodCategory, NutritionGoal, NutritionProfile } from "@/lib/mock/types";

/**
 * Sprint 5.0 — "Motor del plan nutricional". Reemplaza el contenido de
 * esta pantalla: ya no es un diario de comidas / contador de calorías
 * (eso seguía viviendo en `MEAL_CATALOG`/`getMealLog`/`toggleMeal` en el
 * repositorio, sin tocar — `getDashboardSummary` sigue funcionando igual
 * que siempre, el Dashboard no muestra ni depende de esta pantalla).
 *
 * Acá se construye el perfil nutricional único del usuario: datos base
 * (altura, peso, objetivo, actividad, comidas por día), objetivos diarios
 * editables a mano (proteína/carbohidratos/grasas/agua — SIN cálculo
 * automático, eso es Sprint 5.2) y alimentos favoritos por categoría
 * (toque para agregar/quitar, se guarda solo, sin botón "Guardar"). Esta
 * es la base sobre la que Sprint 5.1 va a generar automáticamente
 * Desayuno/Almuerzo/Merienda/Cena usando exclusivamente estos favoritos.
 */

const GOALS: NutritionGoal[] = ["Volumen", "Recomposición corporal", "Definición", "Mantenimiento"];
const ACTIVITY_LEVELS: ActivityLevel[] = ["Baja", "Moderada", "Alta", "Deportista"];

const FOOD_CATEGORY_LABELS: Record<FavoriteFoodCategory, string> = {
  proteinas: "Proteínas",
  carbohidratos: "Carbohidratos",
  grasas: "Grasas",
  frutas: "Frutas",
  verduras: "Verduras",
};

const FOOD_CATEGORY_FIELDS: Record<FavoriteFoodCategory, keyof NutritionProfile> = {
  proteinas: "favoriteProteins",
  carbohidratos: "favoriteCarbs",
  grasas: "favoriteFats",
  frutas: "favoriteFruits",
  verduras: "favoriteVegetables",
};

const FOOD_CATEGORIES: FavoriteFoodCategory[] = ["proteinas", "carbohidratos", "grasas", "frutas", "verduras"];

type SaveState = "idle" | "saving" | "success" | "error";

export default function NutricionPage() {
  const foodOptions = getFavoriteFoodOptions();
  const [profile, setProfile] = useState<NutritionProfile | null | undefined>(undefined);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    setProfile(getNutritionProfile());
  }, []);

  if (profile === undefined) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-display font-semibold">Nutrición</h1>
        <Card>
          <p className="text-text-secondary text-sm">Cargando…</p>
        </Card>
      </div>
    );
  }

  if (!profile) {
    return <NutritionProfileForm onCreated={setProfile} />;
  }

  function commit(patch: Partial<NutritionProfile>) {
    const updated = updateNutritionProfile(patch);
    if (updated) setProfile(updated);
  }

  function toggleFavorite(category: FavoriteFoodCategory, food: string) {
    const field = FOOD_CATEGORY_FIELDS[category];
    const current = (profile![field] as string[]) ?? [];
    const next = current.includes(food) ? current.filter((f) => f !== food) : [...current, food];
    commit({ [field]: next } as Partial<NutritionProfile>);
    // El usuario siguió tocando chips después de guardar/errar — el mensaje anterior ya no aplica.
    if (saveState !== "idle") {
      setSaveState("idle");
      setSaveMessage(null);
    }
  }

  const totalFavorites = FOOD_CATEGORIES.reduce(
    (sum, category) => sum + ((profile![FOOD_CATEGORY_FIELDS[category]] as string[])?.length ?? 0),
    0
  );

  /**
   * Botón "Guardar preferencias": cada chip ya persiste solo al tocarlo
   * (`toggleFavorite` -> `commit` -> `updateNutritionProfile`, la misma
   * función que usa el resto de la pantalla — no se duplica lógica de
   * guardado acá). Este botón es la confirmación explícita que pedía el
   * flujo: valida que haya al menos un favorito elegido, reutiliza
   * `updateNutritionProfile` para re-confirmar el estado actual del
   * perfil, y muestra loading/éxito/error sin perder la selección en
   * ningún caso (el estado de `profile` no se toca si falla).
   */
  async function handleSaveFavorites() {
    if (totalFavorites === 0) {
      setSaveState("error");
      setSaveMessage("Seleccioná al menos un alimento favorito antes de guardar.");
      return;
    }

    setSaveState("saving");
    setSaveMessage(null);
    try {
      await new Promise((resolve) => setTimeout(resolve, 350));
      const updated = updateNutritionProfile({
        favoriteProteins: profile!.favoriteProteins,
        favoriteCarbs: profile!.favoriteCarbs,
        favoriteFats: profile!.favoriteFats,
        favoriteFruits: profile!.favoriteFruits,
        favoriteVegetables: profile!.favoriteVegetables,
      });
      if (!updated) {
        throw new Error("No se encontró un plan nutricional configurado.");
      }
      setProfile(updated);
      setSaveState("success");
      setSaveMessage("Preferencias guardadas.");
    } catch (err) {
      setSaveState("error");
      setSaveMessage(err instanceof Error ? err.message : "No se pudieron guardar las preferencias. Probá de nuevo.");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-display font-semibold">Nutrición</h1>
        <p className="text-text-secondary text-sm mt-1">Tu plan nutricional</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Link href="/nutricion/hoy">
          <Button type="button" variant="secondary">
            🍽️ Comidas de hoy
          </Button>
        </Link>
        <Link href="/nutricion/objetivos">
          <Button type="button" variant="secondary">
            🎯 Ver objetivos
          </Button>
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Link href="/nutricion/estadisticas">
          <Button type="button" variant="secondary">
            📊 Ver estadísticas
          </Button>
        </Link>
        <Link href="/nutricion/planificacion">
          <Button type="button" variant="secondary">
            🗓️ Planificación semanal
          </Button>
        </Link>
      </div>
      <Link href="/nutricion/lista-compras">
        <Button type="button" variant="secondary">
          🛒 Lista de compras
        </Button>
      </Link>

      <Card className="flex flex-col gap-4">
        <p className="text-text-muted text-[11px] uppercase tracking-wide font-display">Datos base</p>

        <div className="grid grid-cols-2 gap-3">
          <NumberField label="Peso (kg)" value={profile.weightKg} onCommit={(v) => commit({ weightKg: v })} />
          <NumberField label="Altura (cm)" value={profile.heightCm} onCommit={(v) => commit({ heightCm: v })} />
        </div>

        <div>
          <label className="text-text-muted text-[11px] uppercase tracking-wide font-display">Objetivo</label>
          <div className="flex flex-wrap gap-2 mt-2">
            {GOALS.map((goal) => (
              <button
                key={goal}
                type="button"
                onClick={() => commit({ goal })}
                className={clsx(
                  "h-9 px-4 rounded-full text-xs font-display uppercase tracking-wide border transition-colors",
                  goal === profile.goal
                    ? "bg-accent-primary border-accent-primary text-white"
                    : "bg-transparent border-border-subtle text-text-secondary"
                )}
              >
                {goal}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-text-muted text-[11px] uppercase tracking-wide font-display">
            Nivel de actividad
          </label>
          <div className="flex flex-wrap gap-2 mt-2">
            {ACTIVITY_LEVELS.map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => commit({ activity: level })}
                className={clsx(
                  "h-9 px-4 rounded-full text-xs font-display uppercase tracking-wide border transition-colors",
                  level === profile.activity
                    ? "bg-accent-primary border-accent-primary text-white"
                    : "bg-transparent border-border-subtle text-text-secondary"
                )}
              >
                {level}
              </button>
            ))}
          </div>
        </div>

        <NumberField
          label="Cantidad de comidas por día"
          value={profile.mealsPerDay}
          onCommit={(v) => commit({ mealsPerDay: v })}
        />
      </Card>

      <Card className="flex flex-col gap-4">
        <p className="text-text-muted text-[11px] uppercase tracking-wide font-display">Objetivos diarios</p>
        <div className="grid grid-cols-2 gap-3">
          <NumberField
            label="Proteínas (g)"
            value={profile.targetProtein}
            onCommit={(v) => commit({ targetProtein: v })}
          />
          <NumberField
            label="Carbohidratos (g)"
            value={profile.targetCarbs}
            onCommit={(v) => commit({ targetCarbs: v })}
          />
          <NumberField label="Grasas (g)" value={profile.targetFat} onCommit={(v) => commit({ targetFat: v })} />
          <NumberField
            label="Agua (L)"
            value={profile.targetWaterLiters}
            onCommit={(v) => commit({ targetWaterLiters: v })}
            step="0.1"
          />
          <NumberField label="Fibra (g)" value={profile.targetFiber} onCommit={(v) => commit({ targetFiber: v })} />
          <NumberField
            label="Frutas (porciones)"
            value={profile.targetFruitPortions}
            onCommit={(v) => commit({ targetFruitPortions: v })}
          />
          <NumberField
            label="Verduras (g)"
            value={profile.targetVegetablesGrams}
            onCommit={(v) => commit({ targetVegetablesGrams: v })}
          />
          <NumberField
            label="Calorías (kcal)"
            value={profile.targetCalories}
            onCommit={(v) => commit({ targetCalories: v })}
          />
        </div>
        <NumberField
          label="Peso objetivo (kg)"
          value={profile.targetWeightKg}
          onCommit={(v) => commit({ targetWeightKg: v })}
          step="0.1"
        />
      </Card>

      <Card className="flex flex-col gap-4">
        <p className="text-text-muted text-[11px] uppercase tracking-wide font-display">Alimentos favoritos</p>
        {FOOD_CATEGORIES.map((category) => {
          const field = FOOD_CATEGORY_FIELDS[category];
          const selected = (profile[field] as string[]) ?? [];
          return (
            <div key={category}>
              <label className="text-text-muted text-[11px] uppercase tracking-wide font-display">
                {FOOD_CATEGORY_LABELS[category]}
              </label>
              <div className="flex flex-wrap gap-2 mt-2">
                {foodOptions[category].map((food) => {
                  const isSelected = selected.includes(food);
                  return (
                    <button
                      key={food}
                      type="button"
                      onClick={() => toggleFavorite(category, food)}
                      className={clsx(
                        "h-9 px-4 rounded-full text-xs font-display uppercase tracking-wide border transition-colors",
                        isSelected
                          ? "bg-accent-primary border-accent-primary text-white"
                          : "bg-transparent border-border-subtle text-text-secondary"
                      )}
                    >
                      {isSelected ? "☑ " : "☐ "}
                      {food}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </Card>

      <div className="flex flex-col gap-2">
        <Button
          type="button"
          variant="primary"
          disabled={saveState === "saving" || totalFavorites === 0}
          onClick={handleSaveFavorites}
        >
          {saveState === "saving" ? "Guardando…" : "Guardar preferencias"}
        </Button>
        {saveState === "success" && saveMessage && <p className="text-success text-xs text-center">{saveMessage}</p>}
        {saveState === "error" && saveMessage && <p className="text-danger text-xs text-center">{saveMessage}</p>}
      </div>
    </div>
  );
}

function NumberField({
  label,
  value,
  onCommit,
  step,
}: {
  label: string;
  value: number;
  onCommit: (value: number) => void;
  step?: string;
}) {
  const [text, setText] = useState(String(value));

  useEffect(() => {
    setText(String(value));
  }, [value]);

  function commitText() {
    const parsed = Number(text);
    onCommit(Number.isFinite(parsed) ? Math.max(0, parsed) : 0);
  }

  return (
    <div>
      <label className="text-text-muted text-[11px] uppercase tracking-wide font-display">{label}</label>
      <input
        type="number"
        inputMode="decimal"
        min={0}
        step={step ?? "1"}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={commitText}
        className="h-11 w-full mt-1 rounded-lg bg-bg-surface-raised border border-border-subtle px-3 text-sm placeholder:text-text-muted"
      />
    </div>
  );
}

function NutritionProfileForm({ onCreated }: { onCreated: (profile: NutritionProfile) => void }) {
  const [weightKg, setWeightKg] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [goal, setGoal] = useState<NutritionGoal | null>(null);
  const [activity, setActivity] = useState<ActivityLevel | null>(null);
  const [mealsPerDay, setMealsPerDay] = useState("4");

  const canSave =
    Number(weightKg) > 0 && Number(heightCm) > 0 && goal !== null && activity !== null && Number(mealsPerDay) > 0;

  function handleSave() {
    if (!canSave || !goal || !activity) return;
    const profile = saveNutritionProfile({
      weightKg: Number(weightKg),
      heightCm: Number(heightCm),
      goal,
      activity,
      mealsPerDay: Number(mealsPerDay),
    });
    onCreated(profile);
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-display font-semibold">Nutrición</h1>
        <p className="text-text-secondary text-sm mt-1">Configurar plan nutricional</p>
      </div>

      <Card className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-text-muted text-[11px] uppercase tracking-wide font-display">Peso (kg)</label>
            <input
              type="number"
              inputMode="decimal"
              min={0}
              value={weightKg}
              onChange={(e) => setWeightKg(e.target.value)}
              className="h-11 w-full mt-1 rounded-lg bg-bg-surface-raised border border-border-subtle px-3 text-sm placeholder:text-text-muted"
            />
          </div>
          <div>
            <label className="text-text-muted text-[11px] uppercase tracking-wide font-display">Altura (cm)</label>
            <input
              type="number"
              inputMode="decimal"
              min={0}
              value={heightCm}
              onChange={(e) => setHeightCm(e.target.value)}
              className="h-11 w-full mt-1 rounded-lg bg-bg-surface-raised border border-border-subtle px-3 text-sm placeholder:text-text-muted"
            />
          </div>
        </div>

        <div>
          <label className="text-text-muted text-[11px] uppercase tracking-wide font-display">Objetivo</label>
          <div className="flex flex-wrap gap-2 mt-2">
            {GOALS.map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGoal(g)}
                className={clsx(
                  "h-9 px-4 rounded-full text-xs font-display uppercase tracking-wide border transition-colors",
                  g === goal
                    ? "bg-accent-primary border-accent-primary text-white"
                    : "bg-transparent border-border-subtle text-text-secondary"
                )}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-text-muted text-[11px] uppercase tracking-wide font-display">
            Nivel de actividad
          </label>
          <div className="flex flex-wrap gap-2 mt-2">
            {ACTIVITY_LEVELS.map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => setActivity(level)}
                className={clsx(
                  "h-9 px-4 rounded-full text-xs font-display uppercase tracking-wide border transition-colors",
                  level === activity
                    ? "bg-accent-primary border-accent-primary text-white"
                    : "bg-transparent border-border-subtle text-text-secondary"
                )}
              >
                {level}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-text-muted text-[11px] uppercase tracking-wide font-display">
            Cantidad de comidas por día
          </label>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            value={mealsPerDay}
            onChange={(e) => setMealsPerDay(e.target.value)}
            className="h-11 w-full mt-1 rounded-lg bg-bg-surface-raised border border-border-subtle px-3 text-sm placeholder:text-text-muted"
          />
        </div>
      </Card>

      <Button type="button" variant="primary" disabled={!canSave} onClick={handleSave}>
        Guardar
      </Button>
    </div>
  );
}
