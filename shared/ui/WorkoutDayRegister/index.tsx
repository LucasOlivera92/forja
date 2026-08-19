"use client";

import { useEffect, useState } from "react";
import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import { clsx } from "@/shared/utils/clsx";
import {
  compareExerciseToHistory,
  getDaySession,
  getExercise,
  getExerciseHistory,
  updateExerciseSet,
} from "@/lib/mock/repository";
import { DaySession, ExerciseHistoryEntry, RoutineDayPlan } from "@/lib/mock/types";

/**
 * Sprint 6.2 — bloque de registro de entrenamiento (peso/reps por
 * ejercicio, "último entrenamiento" y delta ▲/▼/=), extraído tal cual de
 * app/(app)/entreno/[weekId]/[dayId]/page.tsx ("El Toro") sin cambiar su
 * comportamiento visual, para que también lo use una rutina propia
 * (Mi Rutina).
 *
 * `routineId` es una prop OBLIGATORIA y siempre se pasa explícita a
 * `lib/mock/repository.ts` (getDaySession, getExerciseHistory,
 * updateExerciseSet) — este componente nunca depende del default
 * `ROUTINE.id`, así que el mismo código sirve igual para "El Toro" que
 * para cualquier rutina creada por el usuario.
 *
 * No incluye el botón "Finalizar entrenamiento": la navegación posterior
 * a finalizar difiere entre El Toro y Mi Rutina (rutas distintas), así
 * que ese handler queda en cada pantalla que use este componente — acá
 * solo se muestran los ejercicios y se guarda peso/reps por serie.
 */
interface WorkoutDayRegisterProps {
  routineId: string;
  weekId: string;
  dayId: string;
  dayPlan: RoutineDayPlan;
}

export function WorkoutDayRegister({ routineId, weekId, dayId, dayPlan }: WorkoutDayRegisterProps) {
  const [session, setSession] = useState<DaySession | null>(null);
  const [history, setHistory] = useState<Record<string, ExerciseHistoryEntry | null>>({});

  useEffect(() => {
    setSession(getDaySession(weekId, dayId, routineId));
    setHistory(
      Object.fromEntries(
        dayPlan.exercises.map((prescription) => [
          prescription.exerciseId,
          getExerciseHistory(prescription.exerciseId, weekId, dayId, routineId),
        ])
      )
    );
  }, [routineId, weekId, dayId, dayPlan]);

  /**
   * Aplica el mismo valor a todas las series prescriptas del ejercicio: el
   * usuario registra el ejercicio una sola vez, no serie por serie.
   */
  function handleField(exerciseId: string, totalSets: number, field: "reps" | "weight", value: string) {
    const parsed = value === "" ? null : Number(value);
    const patch = field === "reps" ? { reps: parsed } : { weight: parsed };
    for (let setNumber = 1; setNumber <= totalSets; setNumber++) {
      updateExerciseSet(weekId, dayId, exerciseId, setNumber, patch, routineId);
    }
    setSession(getDaySession(weekId, dayId, routineId));
  }

  return (
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
  );
}
