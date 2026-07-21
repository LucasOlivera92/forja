"use client";

import { useEffect, useState } from "react";
import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import { clsx } from "@/shared/utils/clsx";
import {
  finishWorkout,
  getTodayRoutine,
  getWorkoutLog,
  toggleSetDone,
  updateSet,
} from "@/lib/mock/repository";
import { WorkoutDayLog } from "@/lib/mock/types";

const routine = getTodayRoutine();

export default function EntrenoPage() {
  const [log, setLog] = useState<WorkoutDayLog | null>(null);

  useEffect(() => {
    setLog(getWorkoutLog());
  }, []);

  if (!log) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-display font-semibold">Entreno</h1>
        <Card>
          <p className="text-text-secondary text-sm">Cargando tu rutina…</p>
        </Card>
      </div>
    );
  }

  const allSets = log.exercises.flatMap((ex) => ex.sets);
  const completedSets = allSets.filter((s) => s.done).length;
  const allDone = allSets.length > 0 && completedSets === allSets.length;

  function handleSetField(exerciseId: string, setNumber: number, field: "reps" | "weight", value: string) {
    const parsed = value === "" ? null : Number(value);
    const patch = field === "reps" ? { reps: parsed } : { weight: parsed };
    setLog(updateSet(exerciseId, setNumber, patch));
  }

  function handleToggle(exerciseId: string, setNumber: number) {
    setLog(toggleSetDone(exerciseId, setNumber));
  }

  function handleFinish() {
    setLog(finishWorkout());
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-display font-semibold">Entreno</h1>
        <p className="text-text-secondary text-sm mt-1">{routine.name}</p>
      </div>

      {log.finishedAt && (
        <Card raised>
          <p className="text-success text-sm font-display uppercase tracking-wide">
            Entrenamiento completado
          </p>
          <p className="text-text-secondary text-xs mt-1">
            Registrado a las{" "}
            {new Date(log.finishedAt).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
          </p>
        </Card>
      )}

      {routine.exercises.map((exercise) => {
        const exerciseLog = log.exercises.find((ex) => ex.exerciseId === exercise.id);
        if (!exerciseLog) return null;

        return (
          <Card key={exercise.id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-text-primary text-sm font-medium">{exercise.name}</p>
                <p className="text-text-muted text-xs mt-0.5">
                  {exercise.muscleGroup} · objetivo {exercise.targetSets}x{exercise.targetReps}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2 mt-4">
              {exerciseLog.sets.map((set) => (
                <div key={set.setNumber} className="flex items-center gap-2">
                  <span className="w-6 text-text-muted text-xs shrink-0">#{set.setNumber}</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    placeholder="Reps"
                    value={set.reps ?? ""}
                    onChange={(e) => handleSetField(exercise.id, set.setNumber, "reps", e.target.value)}
                    className="h-11 flex-1 min-w-0 rounded-lg bg-bg-surface-raised border border-border-subtle px-3 text-sm placeholder:text-text-muted"
                  />
                  <input
                    type="number"
                    inputMode="decimal"
                    placeholder="Kg"
                    value={set.weight ?? ""}
                    onChange={(e) => handleSetField(exercise.id, set.setNumber, "weight", e.target.value)}
                    className="h-11 flex-1 min-w-0 rounded-lg bg-bg-surface-raised border border-border-subtle px-3 text-sm placeholder:text-text-muted"
                  />
                  <button
                    type="button"
                    onClick={() => handleToggle(exercise.id, set.setNumber)}
                    aria-label={set.done ? "Marcar serie como pendiente" : "Marcar serie como hecha"}
                    className={clsx(
                      "h-11 w-11 shrink-0 rounded-lg border flex items-center justify-center transition-colors",
                      set.done
                        ? "bg-accent-primary border-accent-primary text-white"
                        : "border-border-subtle text-text-muted"
                    )}
                  >
                    <CheckIcon />
                  </button>
                </div>
              ))}
            </div>
          </Card>
        );
      })}

      <div className="sticky bottom-24">
        <Button onClick={handleFinish} disabled={!allDone || Boolean(log.finishedAt)}>
          {log.finishedAt
            ? "Entrenamiento finalizado"
            : allDone
              ? "Finalizar entrenamiento"
              : `Registrá las ${allSets.length - completedSets} series que faltan`}
        </Button>
      </div>
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
