"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import { getNutritionProfile } from "@/lib/mock/repository";
import { NutritionProfile } from "@/lib/mock/types";

/**
 * Sprint 5.0 (continuación) — "FORJA NUTRICIÓN": pantalla de visualización
 * de los objetivos nutricionales diarios. Es un hijo estático nuevo de
 * /nutricion (no reemplaza esa pantalla, que sigue siendo donde se
 * configura/edita el perfil y los favoritos — acá solo se lee).
 *
 * Todo sale de `getNutritionProfile()`, la misma función que ya usa
 * /nutricion — no se agrega ningún cálculo nuevo ni ninguna estructura de
 * datos duplicada. No hay "consumido / objetivo" (X/Y): FORJA todavía no
 * tiene un registro de comidas atado a estos macros (eso es Sprint 5.1 en
 * adelante — "No macros automáticos", del spec original del Sprint 5.0),
 * así que las cards muestran únicamente el objetivo configurado.
 */
export default function ObjetivosNutricionalesPage() {
  const [profile, setProfile] = useState<NutritionProfile | null | undefined>(undefined);

  useEffect(() => {
    setProfile(getNutritionProfile());
  }, []);

  if (profile === undefined) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-text-secondary text-sm">Cargando…</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-display font-semibold">Todavía no configuraste tu plan</h1>
        <p className="text-text-secondary text-sm">Armá tu perfil nutricional para ver tus objetivos acá.</p>
        <Link href="/nutricion">
          <Button type="button" variant="primary">
            Configurar plan nutricional
          </Button>
        </Link>
      </div>
    );
  }

  const goals: { icon: string; label: string; value: string }[] = [
    { icon: "🥩", label: "Proteína", value: `${profile.targetProtein} g` },
    { icon: "⚡", label: "Carbohidratos", value: `${profile.targetCarbs} g` },
    { icon: "🥑", label: "Grasas", value: `${profile.targetFat} g` },
    { icon: "💧", label: "Agua", value: `${Math.round(profile.targetWaterLiters * 1000)} ml` },
    { icon: "🌱", label: "Fibra", value: `${profile.targetFiber} g` },
    { icon: "🍎", label: "Frutas", value: `${profile.targetFruitPortions} porciones` },
    { icon: "🥦", label: "Verduras", value: `${profile.targetVegetablesGrams} g` },
  ];

  const updatedAtLabel = new Date(profile.updatedAt).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  return (
    <div className="flex flex-col gap-4">
      <Link href="/nutricion" className="text-text-muted text-xs uppercase tracking-wide font-display">
        ← Nutrición
      </Link>

      <Card raised className="flex flex-col items-center gap-1 py-8 text-center">
        <p className="text-gold-achievement text-2xl font-display font-bold uppercase tracking-wide">
          Forja Nutrición
        </p>
        <p className="text-text-secondary text-sm italic mt-1">&ldquo;Tu cuerpo se construye todos los días&rdquo;</p>

        <div className="flex gap-6 mt-6">
          <div className="flex flex-col items-center">
            <p className="text-text-muted text-[11px] uppercase tracking-wide font-display">Calorías objetivo</p>
            <p className="text-2xl font-display font-semibold text-accent-primary mt-1">
              {profile.targetCalories}
            </p>
            <p className="text-text-muted text-[11px]">kcal</p>
          </div>
          <div className="w-px bg-border-subtle" />
          <div className="flex flex-col items-center">
            <p className="text-text-muted text-[11px] uppercase tracking-wide font-display">Peso objetivo</p>
            <p className="text-2xl font-display font-semibold text-accent-primary mt-1">{profile.targetWeightKg}</p>
            <p className="text-text-muted text-[11px]">kg</p>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        {goals.map((goal) => (
          <Card key={goal.label} raised className="flex flex-col items-center gap-1 py-5 text-center">
            <p className="text-2xl">{goal.icon}</p>
            <p className="text-text-muted text-[11px] uppercase tracking-wide font-display mt-1">{goal.label}</p>
            <p className="text-text-primary text-base font-display font-semibold">{goal.value}</p>
          </Card>
        ))}
      </div>

      <p className="text-text-muted text-xs text-center">Última actualización: {updatedAtLabel}</p>

      <Link href="/nutricion">
        <Button type="button" variant="secondary">
          ✏️ Editar objetivos
        </Button>
      </Link>
    </div>
  );
}
