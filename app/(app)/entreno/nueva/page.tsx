"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import { clsx } from "@/shared/utils/clsx";
import { createRoutine, getRoutineTemplates } from "@/lib/mock/repository";
import { RoutineTemplate } from "@/lib/mock/types";

type CreationMode = "cero" | "plantilla";

/**
 * Sprint 4.0 — Formulario mínimo para crear una rutina propia desde la
 * interfaz, sin tocar código ni Supabase. Solo pide los 5 campos del
 * sprint (nombre, objetivo, deporte, semanas, días); no carga ejercicios
 * todavía — la rutina se guarda con `weeks: []`, igual que las demás
 * rutinas del catálogo que todavía no tienen contenido cargado.
 *
 * Sprint 4.6 — "Plantillas FORJA": arriba del formulario de siempre se
 * agrega un selector "Crear desde cero" / "Elegir una plantilla". Elegir
 * una plantilla solo PRECOMPLETA el mismo formulario (nombre, semanas,
 * días) — no guarda nada todavía, el usuario sigue teniendo que tocar
 * "Guardar", y puede editar cualquier campo después de elegirla (no se
 * bloquea ni se deshabilita nada). Las plantillas viven en
 * `ROUTINE_TEMPLATES` (lib/mock/data.ts) y nunca traen ejercicios, solo
 * nombres de semana/día — la lógica de qué hacer con esos nombres vive
 * en el repositorio (`createRoutine`), no acá.
 */
export default function NuevaRutinaPage() {
  const router = useRouter();
  const templates = getRoutineTemplates();

  const [mode, setMode] = useState<CreationMode>("cero");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [weekNames, setWeekNames] = useState<string[] | null>(null);
  const [dayNames, setDayNames] = useState<string[] | null>(null);

  const [name, setName] = useState("");
  const [goal, setGoal] = useState("");
  const [sport, setSport] = useState("");
  const [weeksCount, setWeeksCount] = useState("4");
  const [daysPerWeek, setDaysPerWeek] = useState("5");

  const canSave = name.trim().length > 0;

  function selectMode(next: CreationMode) {
    setMode(next);
    if (next === "cero") {
      setSelectedTemplateId(null);
      setWeekNames(null);
      setDayNames(null);
    }
  }

  function applyTemplate(template: RoutineTemplate) {
    setSelectedTemplateId(template.id);
    setName(template.name);
    setWeeksCount(String(template.weeksCount));
    setDaysPerWeek(String(template.dayNames.length));
    setWeekNames(template.weekNames);
    setDayNames(template.dayNames);
  }

  function handleSave() {
    if (!canSave) return;
    const weeksNum = Math.max(1, Number(weeksCount) || 0);
    const daysNum = Math.max(1, Number(daysPerWeek) || 0);
    // Si el usuario tocó semanas/días después de elegir la plantilla, los
    // nombres ya no calzan — se ignoran y la rutina se crea igual que
    // "desde cero" (nunca se guardan nombres desalineados).
    const templateStillValid = weekNames && dayNames && weekNames.length === weeksNum && dayNames.length === daysNum;

    createRoutine({
      name: name.trim(),
      goal: goal.trim(),
      sport: sport.trim(),
      weeksCount: weeksNum,
      daysPerWeek: daysNum,
      weekNames: templateStillValid ? (weekNames as string[]) : undefined,
      dayNames: templateStillValid ? (dayNames as string[]) : undefined,
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

      <div className="grid grid-cols-2 gap-3">
        <Button
          type="button"
          variant={mode === "cero" ? "primary" : "secondary"}
          onClick={() => selectMode("cero")}
        >
          Crear desde cero
        </Button>
        <Button
          type="button"
          variant={mode === "plantilla" ? "primary" : "secondary"}
          onClick={() => selectMode("plantilla")}
        >
          Elegir una plantilla
        </Button>
      </div>

      {mode === "plantilla" && (
        <div className="flex flex-col gap-3">
          <p className="text-text-muted text-[11px] uppercase tracking-wide font-display">Plantillas FORJA</p>
          {templates.map((template) => {
            const isSelected = template.id === selectedTemplateId;
            return (
              <Card
                key={template.id}
                raised={isSelected}
                className={clsx(
                  "cursor-pointer active:scale-[0.98] transition-transform",
                  isSelected && "border-accent-primary"
                )}
                onClick={() => applyTemplate(template)}
              >
                <p className="font-display text-base uppercase tracking-wide">{template.name}</p>
                <p className="text-text-secondary text-sm mt-1">{template.description}</p>
                <p className="text-text-muted text-xs mt-2">
                  {template.weeksCount} semanas · {template.dayNames.length} días por semana
                </p>
              </Card>
            );
          })}
        </div>
      )}

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
