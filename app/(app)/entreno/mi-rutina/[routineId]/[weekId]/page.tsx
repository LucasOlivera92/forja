"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import { clsx } from "@/shared/utils/clsx";
import {
  clearCustomRoutineDay,
  duplicateCustomRoutineDay,
  getWeek,
  renameCustomRoutineDay,
} from "@/lib/mock/repository";
import { RoutineWeek } from "@/lib/mock/types";

/**
 * Sprint 4.1 — Días de una semana de una rutina PROPIA.
 *
 * Sprint 4.4 — cada día se puede renombrar (ej: "Empuje"), duplicar
 * (copia todos sus ejercicios — series, reps, descanso, notas — a otro
 * día de la misma semana, sin tocar progreso) o vaciar (borra sus
 * ejercicios sin borrar el día ni la semana). El contador de ejercicios
 * ahora se muestra siempre ("0 ejercicios", "3 ejercicios", etc.), para
 * poder ver de un vistazo el estado de la semana sin entrar a cada día.
 * Solo aplica acá (rutinas propias); "El Toro" no se toca.
 */
export default function MiRutinaSemanaPage({
  params,
}: {
  params: Promise<{ routineId: string; weekId: string }>;
}) {
  const { routineId, weekId } = use(params);
  const [week, setWeek] = useState<RoutineWeek | null | undefined>(undefined);
  const [renamingDayId, setRenamingDayId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [duplicatingDayId, setDuplicatingDayId] = useState<string | null>(null);

  function refresh() {
    setWeek(getWeek(weekId, routineId) ?? null);
  }

  useEffect(() => {
    setWeek(getWeek(weekId, routineId) ?? null);
  }, [routineId, weekId]);

  if (week === undefined) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-text-secondary text-sm">Cargando…</p>
      </div>
    );
  }

  if (!week) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-display font-semibold">Semana no encontrada</h1>
        <Link href={`/entreno/mi-rutina/${routineId}`} className="text-accent-primary text-sm">
          ← Volver
        </Link>
      </div>
    );
  }

  const days = week.days.slice().sort((a, b) => a.order - b.order);

  function startRename(dayId: string, currentDisplayName: string | undefined) {
    setDuplicatingDayId(null);
    setRenamingDayId(dayId);
    setRenameValue(currentDisplayName ?? "");
  }

  function cancelRename() {
    setRenamingDayId(null);
  }

  function saveRename(dayId: string) {
    renameCustomRoutineDay(routineId, weekId, dayId, renameValue);
    setRenamingDayId(null);
    refresh();
  }

  function toggleDuplicate(dayId: string) {
    setRenamingDayId(null);
    setDuplicatingDayId((current) => (current === dayId ? null : dayId));
  }

  function handleDuplicateTo(sourceDayId: string, sourceLabel: string, targetDayId: string, targetLabel: string) {
    const confirmed = window.confirm(
      `¿Copiar los ejercicios de "${sourceLabel}" a "${targetLabel}"?\n\nSe reemplazarán los ejercicios actuales de "${targetLabel}". No se copia progreso, solo la estructura.`
    );
    if (!confirmed) return;
    duplicateCustomRoutineDay(routineId, weekId, sourceDayId, targetDayId);
    setDuplicatingDayId(null);
    refresh();
  }

  function handleClear(dayId: string, label: string) {
    const confirmed = window.confirm(`¿Vaciar "${label}"?\n\nSe eliminarán todos sus ejercicios. El día no se borra.`);
    if (!confirmed) return;
    clearCustomRoutineDay(routineId, weekId, dayId);
    refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Link
          href={`/entreno/mi-rutina/${routineId}`}
          className="text-text-muted text-xs uppercase tracking-wide font-display"
        >
          ← Volver
        </Link>
        <h1 className="text-2xl font-display font-semibold mt-1">{week.displayName || week.label}</h1>
      </div>

      <div className="flex flex-col gap-3">
        {days.map((day) => {
          const label = day.displayName || day.name;

          if (renamingDayId === day.id) {
            return (
              <Card key={day.id} className="flex flex-col gap-3">
                <div>
                  <label className="text-text-muted text-[11px] uppercase tracking-wide font-display">
                    Nombre del día
                  </label>
                  <input
                    type="text"
                    placeholder={day.name}
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    className="h-11 w-full mt-1 rounded-lg bg-bg-surface-raised border border-border-subtle px-3 text-sm placeholder:text-text-muted"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Button type="button" variant="secondary" onClick={cancelRename}>
                    Cancelar
                  </Button>
                  <Button type="button" variant="primary" onClick={() => saveRename(day.id)}>
                    Guardar
                  </Button>
                </div>
              </Card>
            );
          }

          const otherDays = days.filter((d) => d.id !== day.id);

          return (
            <Card key={day.id}>
              <div className="flex items-center justify-between gap-3">
                <Link
                  href={`/entreno/mi-rutina/${routineId}/${weekId}/${day.id}`}
                  className="flex-1 active:scale-[0.98] transition-transform"
                >
                  <p className="text-text-muted text-xs uppercase tracking-wide font-display">Día {day.order}</p>
                  <p className="text-text-primary text-sm font-medium mt-1">{label}</p>
                  <p className="text-text-muted text-xs mt-1">{day.exercises.length} ejercicios</p>
                </Link>
              </div>

              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3">
                <Button type="button" variant="ghost" onClick={() => startRename(day.id, day.displayName)}>
                  ✏️ Renombrar
                </Button>
                <Button type="button" variant="ghost" onClick={() => toggleDuplicate(day.id)}>
                  📄 Duplicar día
                </Button>
                <Button type="button" variant="ghost" onClick={() => handleClear(day.id, label)}>
                  🗑 Vaciar día
                </Button>
              </div>

              {duplicatingDayId === day.id && (
                <div className="mt-3 pt-3 border-t border-border-subtle">
                  {otherDays.length === 0 ? (
                    <p className="text-text-muted text-xs">No hay otro día en esta semana para copiar.</p>
                  ) : (
                    <>
                      <p className="text-text-muted text-[11px] uppercase tracking-wide font-display mb-2">
                        Copiar a…
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {otherDays.map((target) => (
                          <button
                            key={target.id}
                            type="button"
                            onClick={() =>
                              handleDuplicateTo(day.id, label, target.id, target.displayName || target.name)
                            }
                            className={clsx(
                              "h-9 px-4 rounded-full text-xs font-display uppercase tracking-wide border",
                              "bg-transparent border-border-subtle text-text-secondary"
                            )}
                          >
                            {target.displayName || target.name}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
