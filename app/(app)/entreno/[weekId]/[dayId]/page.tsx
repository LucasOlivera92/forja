"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useEffect, useState } from "react";
import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import { clsx } from "@/shared/utils/clsx";
import {
  compareExerciseToHistory,
  finishDay,
  getDayPlan,
  getDaySession,
  getExercise,
  getExerciseHistory,
  getWeek,
  updateExerciseSet,
} from "@/lib/mock/repository";
import { DaySession, ExerciseHistoryEntry } from "@/lib/mock/types";

/**
 * Sprint 3.2 — motor de prescripción y registro. Cada ejercicio del día
 * muestra el objetivo real de ESA semana (ya resuelto en lib/mock/data.ts)
 * y un único registro de peso/reps realizadas por ejercicio (no una fila
 * por serie): completar ese registro una vez alcanza para todas las series
 * prescriptas, para que cargar el entrenamiento sea rápido desde el
 * celular. Por debajo se sigue guardando por serie (misma sesión de
 * lib/mock/repository.ts, sin tocar esa arquitectura) — la simplificación
 * es solo de la pantalla.
 *
 * Sprint 3.7 — botón "Finalizar entrenamiento" al final de la lista:
 * conecta con finishDay() (ya existente en el repositorio, ahora también
 * marca las series como hechas) y vuelve a Hoy, que en su próximo mount
 * lee getDashboardSummary() y ya refleja el entrenamiento completado.
 *
 * Sprint 3.9 — historial inmediato: debajo de cada ejercicio se muestra el
 * último entrenamiento registrado (getExerciseHistory(), ya existente en
 * el repositorio) y un indicador ▲/▼/= comparado contra lo que se está
 * tipeando ahora mismo (compareExerciseToHistory(), nueva pero reutiliza
 * exactamente los mismos datos — sin storage nuevo, sin Supabase).
 */
export default function DiaPage({ params }: { params: Promise<{ weekId: string; dayId: string }> }) {
  const { weekId, dayId } = use(params);
  const dayPlan = getDayPlan(weekId, dayId);
  const week = getWeek(weekId);
  const router = useRouter();

  const [session, setSession] = useState<DaySession | null>(null);
  const [history, setHistory] = useState<Record<string, ExerciseHistoryEntry | null>>({});

  useEffect(() => {
    if (!dayPlan) return;
    setSession(getDaySession(weekId, dayId));
    setHistory(
      Object.fromEntries(
        dayPlan.exercises.map((prescription) => [
          prescription.exerciseId,
          getExerciseHistory(prescription.exerciseId, weekId, dayId),
        ])
      )
    );
  }, [weekId, dayId, dayPlan]);

  if (!dayPlan || !week) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-display font-semibold">Día no encontrado</h1>
        <Link href="/entreno" className="text-accent-primary text-sm">
          ← Volver a Entreno
        </Link>
      </div>
    );
  }

  /**
   * Aplica el mismo valor a todas las series prescriptas del ejercicio: el
   * usuario registra el ejercicio una sola vez, no serie por serie.
   */
  function handleField(exerciseId: string, totalSets: number, field: "reps" | "weight", value: string) {
    const parsed = value === "" ? null : Number(value);
    const patch = field === "reps" ? { reps: parsed } : { weight: parsed };
    for (let setNumber = 1; setNumber <= totalSets; setNumber++) {
      updateExerciseSet(weekId, dayId, exerciseId, setNumber, patch);
    }
    setSession(getDaySession(weekId, dayId));
  }

  /** Guarda la sesión como finalizada y vuelve a Hoy, que ya lee el progreso actualizado. */
  function handleFinish() {
    finishDay(weekId, dayId);
    router.push("/hoy");
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Link href={`/entreno/${weekId}`} className="text-text-muted text-xs uppercase tracking-wide font-display">
          ← {week.label}
        </Link>
        <h1 className="text-2xl font-display font-semibold mt-1">{dayPlan.name}</h1>
      </div>

      <div className="flex flex-col gap-3">
        {dayPlan.exercises
          .slice()
          .sort((a, b) => a.order - b.order)
          .map((prescription) => {
            const exercise = getExercise(prescription.exerciseId);
            const exerciseLog = session?.exercises.find((ex) => ex.exerciseId === prescription.exerciseId);
            const registro = exerciseLog?.sets[0];
            if (!exercise) return null;

            const ultimoEntrenamiento = history[prescription.exerciseId] ?? null;
            const delta = compareExerciseToHistory(
              { weight: registro?.weight ?? null, reps: registro?.reps ?? null },
              ultimoEntrenamiento
            );

            return (
              <Card key={prescription.exerciseId}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-text-primary text-sm font-medium">{exercise.name}</p>
                    <p className="text-text-muted text-xs mt-0.5">
                      {exercise.muscleGroup} · Objetivo: {prescription.targetSets}×{prescription.targetReps}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    className="shrink-0 whitespace-nowrap"
                    onClick={() => window.open(exercise.videoUrl, "_blank", "noopener,noreferrer")}
                  >
                    ▶ Ver técnica
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-4">
                  <div>
                    <label className="text-text-muted text-[11px] uppercase tracking-wide font-display">
                      Peso utilizado
                    </label>
                    <input
                      type="number"
                      inputMode="decimal"
                      placeholder="Kg"
                      value={registro?.weight ?? ""}
                      onChange={(e) => handleField(exercise.id, prescription.targetSets, "weight", e.target.value)}
                      className="h-11 w-full mt-1 rounded-lg bg-bg-surface-raised border border-border-subtle px-3 text-sm placeholder:text-text-muted"
                    />
                  </div>
                  <div>
                    <label className="text-text-muted text-[11px] uppercase tracking-wide font-display">
                      Repeticiones realizadas
                    </label>
                    <input
                      type="number"
                      inputMode="numeric"
                      placeholder="Reps"
                      value={registro?.reps ?? ""}
                      onChange={(e) => handleField(exercise.id, prescription.targetSets, "reps", e.target.value)}
                      className="h-11 w-full mt-1 rounded-lg bg-bg-surface-raised border border-border-subtle px-3 text-sm placeholder:text-text-muted"
                    />
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-border-subtle">
                  <p className="text-text-muted text-[11px] uppercase tracking-wide font-display">
                    Último entrenamiento
                  </p>
                  {ultimoEntrenamiento ? (
                    <>
                      <p className="text-text-secondary text-sm mt-1">
                        {ultimoEntrenamiento.weight != null ? `${ultimoEntrenamiento.weight} kg` : "—"} ×{" "}
                        {ultimoEntrenamiento.reps ?? "—"}
                      </p>
                      {delta.kind && (
                        <p
                          className={clsx(
                            "text-xs font-medium mt-1",
                            delta.kind === "equal" && "text-text-muted",
                            delta.kind !== "equal" && delta.value > 0 && "text-success",
                            delta.kind !== "equal" && delta.value < 0 && "text-danger"
                          )}
                        >
                          {delta.kind === "equal"
                            ? "= Igual que la última vez"
                            : `${delta.value > 0 ? "▲" : "▼"} ${delta.value > 0 ? "+" : ""}${delta.value} ${
                                delta.kind === "weight" ? "kg" : "repeticiones"
                              }`}
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-text-muted text-sm mt-1">Aún no hay registros anteriores.</p>
                  )}
                </div>
              </Card>
            );
          })}
      </div>

      <Button type="button" variant="primary" onClick={handleFinish}>
        Finalizar entrenamiento
      </Button>
    </div>
  );
}
