"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import {
  copyExercisesFromDay,
  deleteCustomRoutineExercise,
  duplicateCustomRoutineExercise,
  getDayPlan,
  getExercise,
  getRoutine,
  getSuggestedMuscleGroupForRoutine,
  getWeeks,
  moveCustomRoutineExercise,
  updateCustomRoutineExercise,
} from "@/lib/mock/repository";
import { Routine, RoutineDayPlan, RoutineWeek } from "@/lib/mock/types";

/**
 * Sprint 4.1 — Día de una rutina PROPIA: lista los ejercicios ya
 * agregados y ofrece "➕ Agregar ejercicio". A diferencia del día de "El
 * Toro" (/entreno/[weekId]/[dayId]), acá todavía no hay registro de
 * peso/reps.
 *
 * Sprint 4.2 — Editor completo por ejercicio: ✏️ Editar (series, reps,
 * descanso, notas — el nombre queda solo lectura, sigue viniendo de la
 * biblioteca), 🗑 Eliminar (con confirmación), 📄 Duplicar y ⬆/⬇ para
 * reordenar de a una posición. Todo pasa por funciones de repository.ts
 * que solo escriben sobre rutinas propias (nunca sobre "El Toro" ni las
 * demás rutinas base).
 *
 * Sprint 4.8 — "📋 Copiar desde otro día": elegir semana → elegir día →
 * confirmar, reemplaza los ejercicios de ESTE día por los de planificación
 * del día elegido (`copyExercisesFromDay`, nueva — nunca copia progreso,
 * eso ni siquiera vive en `Routine.weeks`). También se corrige la
 * validación del editor de ejercicios: ya no se puede guardar con series
 * en 0 o repeticiones vacías/"0" (antes se dejaban pasar en silencio).
 *
 * Sprint 4.9 — si la rutina eligió una "guía de distribución muscular" al
 * crearse, se muestra un subtítulo "Grupo sugerido: {grupo}" debajo del
 * título del día, mientras el día no tenga `displayName` propio (se oculta
 * apenas el usuario lo renombra desde la pantalla de la semana).
 */
export default function MiRutinaDiaPage({
  params,
}: {
  params: Promise<{ routineId: string; weekId: string; dayId: string }>;
}) {
  const { routineId, weekId, dayId } = use(params);
  const [dayPlan, setDayPlan] = useState<RoutineDayPlan | null | undefined>(undefined);
  const [weeks, setWeeks] = useState<RoutineWeek[]>([]);
  const [routine, setRoutine] = useState<Routine | null>(null);
  const [editingOrder, setEditingOrder] = useState<number | null>(null);
  const [editSets, setEditSets] = useState("");
  const [editReps, setEditReps] = useState("");
  const [editRest, setEditRest] = useState("");
  const [editNotes, setEditNotes] = useState("");

  const [showCopyPanel, setShowCopyPanel] = useState(false);
  const [copySourceWeekId, setCopySourceWeekId] = useState<string | null>(null);

  function refresh() {
    setDayPlan(getDayPlan(weekId, dayId, routineId) ?? null);
    setWeeks(getWeeks(routineId));
    setRoutine(getRoutine(routineId));
  }

  useEffect(() => {
    setDayPlan(getDayPlan(weekId, dayId, routineId) ?? null);
    setWeeks(getWeeks(routineId));
    setRoutine(getRoutine(routineId));
  }, [routineId, weekId, dayId]);

  if (dayPlan === undefined) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-text-secondary text-sm">Cargando…</p>
      </div>
    );
  }

  if (!dayPlan) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-display font-semibold">Día no encontrado</h1>
        <Link href={`/entreno/mi-rutina/${routineId}/${weekId}`} className="text-accent-primary text-sm">
          ← Volver
        </Link>
      </div>
    );
  }

  const exercises = dayPlan.exercises.slice().sort((a, b) => a.order - b.order);
  const suggestedGroup =
    routine && !dayPlan.displayName ? getSuggestedMuscleGroupForRoutine(routine, dayPlan.order) : null;

  function startEdit(order: number) {
    const exercise = exercises.find((ex) => ex.order === order);
    if (!exercise) return;
    setEditingOrder(order);
    setEditSets(String(exercise.targetSets));
    setEditReps(exercise.targetReps);
    setEditRest(exercise.restSeconds != null ? String(exercise.restSeconds) : "");
    setEditNotes(exercise.notes ?? "");
  }

  function cancelEdit() {
    setEditingOrder(null);
  }

  const editSetsNum = Number(editSets);
  const editRepsTrimmed = editReps.trim();
  const editError =
    !Number.isFinite(editSetsNum) || editSetsNum < 1
      ? "Ingresá una cantidad de series mayor a 0."
      : !editRepsTrimmed || editRepsTrimmed === "0"
        ? "Ingresá una cantidad de repeticiones."
        : null;

  function saveEdit(order: number) {
    if (editError) return;
    updateCustomRoutineExercise(routineId, weekId, dayId, order, {
      targetSets: editSetsNum,
      targetReps: editRepsTrimmed,
      restSeconds: Math.max(0, Number(editRest) || 0),
      notes: editNotes.trim() || undefined,
    });
    setEditingOrder(null);
    refresh();
  }

  function handleDelete(order: number) {
    if (!window.confirm("¿Eliminar este ejercicio del día?")) return;
    deleteCustomRoutineExercise(routineId, weekId, dayId, order);
    refresh();
  }

  function handleDuplicate(order: number) {
    duplicateCustomRoutineExercise(routineId, weekId, dayId, order);
    refresh();
  }

  function handleMove(order: number, direction: "up" | "down") {
    moveCustomRoutineExercise(routineId, weekId, dayId, order, direction);
    refresh();
  }

  function toggleCopyPanel() {
    setShowCopyPanel((open) => !open);
    setCopySourceWeekId(null);
  }

  function handleCopyFromDay(sourceWeekId: string, sourceWeekLabel: string, sourceDayId: string, sourceDayLabel: string) {
    const confirmed = window.confirm(
      `¿Copiar los ejercicios de "${sourceDayLabel}" (${sourceWeekLabel}) a este día?\n\nSe reemplazarán los ejercicios actuales de este día. No se copia progreso ni historial.`
    );
    if (!confirmed) return;
    copyExercisesFromDay(routineId, sourceWeekId, sourceDayId, weekId, dayId);
    setShowCopyPanel(false);
    setCopySourceWeekId(null);
    refresh();
  }

  const copySourceWeek = weeks.find((week) => week.id === copySourceWeekId) ?? null;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Link
          href={`/entreno/mi-rutina/${routineId}/${weekId}`}
          className="text-text-muted text-xs uppercase tracking-wide font-display"
        >
          ← Volver
        </Link>
        <h1 className="text-2xl font-display font-semibold mt-1">{dayPlan.name}</h1>
        {suggestedGroup && (
          <p className="text-text-muted text-[11px] mt-1">
            Grupo sugerido:
            <br />
            {suggestedGroup}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-3">
        {exercises.length === 0 && (
          <Card>
            <p className="text-text-muted text-sm">Todavía no agregaste ejercicios a este día.</p>
          </Card>
        )}
        {exercises.map((prescription, index) => {
          const exercise = getExercise(prescription.exerciseId);
          if (!exercise) return null;
          const isEditing = editingOrder === prescription.order;

          if (isEditing) {
            return (
              <Card key={`${prescription.exerciseId}-${prescription.order}`} className="flex flex-col gap-4">
                <div>
                  <label className="text-text-muted text-[11px] uppercase tracking-wide font-display">Nombre</label>
                  <p className="text-text-primary text-sm mt-1">{exercise.name}</p>
                </div>
                <div>
                  <label className="text-text-muted text-[11px] uppercase tracking-wide font-display">Series</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    value={editSets}
                    onChange={(e) => setEditSets(e.target.value)}
                    className="h-11 w-full mt-1 rounded-lg bg-bg-surface-raised border border-border-subtle px-3 text-sm placeholder:text-text-muted"
                  />
                </div>
                <div>
                  <label className="text-text-muted text-[11px] uppercase tracking-wide font-display">
                    Repeticiones
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={editReps}
                    onChange={(e) => setEditReps(e.target.value)}
                    className="h-11 w-full mt-1 rounded-lg bg-bg-surface-raised border border-border-subtle px-3 text-sm placeholder:text-text-muted"
                  />
                </div>
                <div>
                  <label className="text-text-muted text-[11px] uppercase tracking-wide font-display">
                    Descanso (segundos)
                  </label>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={editRest}
                    onChange={(e) => setEditRest(e.target.value)}
                    className="h-11 w-full mt-1 rounded-lg bg-bg-surface-raised border border-border-subtle px-3 text-sm placeholder:text-text-muted"
                  />
                </div>
                <div>
                  <label className="text-text-muted text-[11px] uppercase tracking-wide font-display">
                    Notas (opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: bajar controlado"
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    className="h-11 w-full mt-1 rounded-lg bg-bg-surface-raised border border-border-subtle px-3 text-sm placeholder:text-text-muted"
                  />
                </div>

                {editError && <p className="text-danger text-xs">{editError}</p>}

                <div className="grid grid-cols-2 gap-3">
                  <Button type="button" variant="secondary" onClick={cancelEdit}>
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    disabled={Boolean(editError)}
                    onClick={() => saveEdit(prescription.order)}
                  >
                    Guardar
                  </Button>
                </div>
              </Card>
            );
          }

          return (
            <Card key={`${prescription.exerciseId}-${prescription.order}`}>
              <p className="text-text-primary text-sm font-medium">{exercise.name}</p>
              <p className="text-text-muted text-xs mt-0.5">
                {exercise.muscleGroup} · {prescription.targetSets}×{prescription.targetReps}
                {prescription.restSeconds ? ` · Descanso ${prescription.restSeconds}s` : ""}
              </p>
              {prescription.notes && <p className="text-text-muted text-xs mt-1 italic">{prescription.notes}</p>}

              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3">
                <Button type="button" variant="ghost" onClick={() => startEdit(prescription.order)}>
                  ✏️ Editar
                </Button>
                <Button type="button" variant="ghost" onClick={() => handleDuplicate(prescription.order)}>
                  📄 Duplicar
                </Button>
                <Button type="button" variant="ghost" onClick={() => handleDelete(prescription.order)}>
                  🗑 Eliminar
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={index === 0}
                  onClick={() => handleMove(prescription.order, "up")}
                >
                  ⬆ Subir
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={index === exercises.length - 1}
                  onClick={() => handleMove(prescription.order, "down")}
                >
                  ⬇ Bajar
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="flex flex-col gap-3">
        <Button type="button" variant="secondary" onClick={toggleCopyPanel}>
          📋 Copiar desde otro día
        </Button>

        {showCopyPanel && (
          <Card>
            {!copySourceWeek ? (
              <>
                <p className="text-text-muted text-[11px] uppercase tracking-wide font-display mb-2">
                  Elegí una semana
                </p>
                <div className="flex flex-wrap gap-2">
                  {weeks.map((week) => (
                    <button
                      key={week.id}
                      type="button"
                      onClick={() => setCopySourceWeekId(week.id)}
                      className="h-9 px-4 rounded-full text-xs font-display uppercase tracking-wide border bg-transparent border-border-subtle text-text-secondary"
                    >
                      {week.displayName || week.label}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setCopySourceWeekId(null)}
                  className="text-text-muted text-xs uppercase tracking-wide font-display mb-2"
                >
                  ← Elegir otra semana
                </button>
                <p className="text-text-muted text-[11px] uppercase tracking-wide font-display mb-2">
                  Elegí un día de {copySourceWeek.displayName || copySourceWeek.label}
                </p>
                <div className="flex flex-col gap-2">
                  {copySourceWeek.days
                    .filter((day) => !(copySourceWeek.id === weekId && day.id === dayId))
                    .map((day) => (
                      <button
                        key={day.id}
                        type="button"
                        onClick={() =>
                          handleCopyFromDay(
                            copySourceWeek.id,
                            copySourceWeek.displayName || copySourceWeek.label,
                            day.id,
                            day.displayName || day.name
                          )
                        }
                        className="text-left rounded-lg border border-border-subtle bg-bg-surface-raised px-3 py-2"
                      >
                        <p className="text-text-primary text-sm">{day.displayName || day.name}</p>
                        <p className="text-text-muted text-xs mt-0.5">{day.exercises.length} ejercicios</p>
                      </button>
                    ))}
                </div>
              </>
            )}
          </Card>
        )}
      </div>

      <Link href={`/entreno/mi-rutina/${routineId}/${weekId}/${dayId}/agregar`}>
        <Button type="button" variant="secondary">
          ➕ Agregar ejercicio
        </Button>
      </Link>
    </div>
  );
}
