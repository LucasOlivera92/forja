"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import { createRoutine } from "@/lib/mock/repository";

/**
 * Sprint 4.0 — Formulario mínimo para crear una rutina propia desde la
 * interfaz, sin tocar código ni Supabase. Solo pide los 5 campos del
 * sprint (nombre, objetivo, deporte, semanas, días); no carga ejercicios
 * todavía — la rutina se guarda con `weeks: []`, igual que las demás
 * rutinas del catálogo que todavía no tienen contenido cargado.
 */
export default function NuevaRutinaPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [goal, setGoal] = useState("");
  const [sport, setSport] = useState("");
  const [weeksCount, setWeeksCount] = useState("4");
  const [daysPerWeek, setDaysPerWeek] = useState("5");

  const canSave = name.trim().length > 0;

  function handleSave() {
    if (!canSave) return;
    createRoutine({
      name: name.trim(),
      goal: goal.trim(),
      sport: sport.trim(),
      weeksCount: Math.max(1, Number(weeksCount) || 0),
      daysPerWeek: Math.max(1, Number(daysPerWeek) || 0),
    });
    router.push("/entreno");
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Link href="/entreno" className="text-text-muted text-xs uppercase tracking-wide font-display">
          ← Entreno
        </Link>
        <h1 className="text-2xl font-display font-semibold mt-1">Crear rutina</h1>
      </div>

      <Card className="flex flex-col gap-4">
        <div>
          <label className="text-text-muted text-[11px] uppercase tracking-wide font-display">Nombre</label>
          <input
            type="text"
            placeholder="Ej: Fuerza 5x5"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-11 w-full mt-1 rounded-lg bg-bg-surface-raised border border-border-subtle px-3 text-sm placeholder:text-text-muted"
          />
        </div>

        <div>
          <label className="text-text-muted text-[11px] uppercase tracking-wide font-display">Objetivo</label>
          <input
            type="text"
            placeholder="Ej: Hipertrofia"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            className="h-11 w-full mt-1 rounded-lg bg-bg-surface-raised border border-border-subtle px-3 text-sm placeholder:text-text-muted"
          />
        </div>

        <div>
          <label className="text-text-muted text-[11px] uppercase tracking-wide font-display">Deporte</label>
          <input
            type="text"
            placeholder="Ej: Musculación"
            value={sport}
            onChange={(e) => setSport(e.target.value)}
            className="h-11 w-full mt-1 rounded-lg bg-bg-surface-raised border border-border-subtle px-3 text-sm placeholder:text-text-muted"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-text-muted text-[11px] uppercase tracking-wide font-display">
              Cantidad de semanas
            </label>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              value={weeksCount}
              onChange={(e) => setWeeksCount(e.target.value)}
              className="h-11 w-full mt-1 rounded-lg bg-bg-surface-raised border border-border-subtle px-3 text-sm placeholder:text-text-muted"
            />
          </div>
          <div>
            <label className="text-text-muted text-[11px] uppercase tracking-wide font-display">
              Cantidad de días
            </label>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              value={daysPerWeek}
              onChange={(e) => setDaysPerWeek(e.target.value)}
              className="h-11 w-full mt-1 rounded-lg bg-bg-surface-raised border border-border-subtle px-3 text-sm placeholder:text-text-muted"
            />
          </div>
        </div>
      </Card>

      <Button type="button" variant="primary" disabled={!canSave} onClick={handleSave}>
        Guardar
      </Button>
    </div>
  );
}
