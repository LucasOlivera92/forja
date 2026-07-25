"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useEffect, useState } from "react";
import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import {
  getRoutine,
  getRoutines,
  getWeeks,
  isBaseRoutine,
  renameCustomRoutineWeek,
  updateCustomRoutineInfo,
} from "@/lib/mock/repository";
import { Routine, RoutineWeek } from "@/lib/mock/types";

/**
 * Sprint 4.1 — Semanas de una rutina PROPIA (creada en /entreno/nueva).
 * Ruta separada de /entreno/[weekId]/... (la de "El Toro", que no se
 * toca) para no chocar con esa jerarquía de rutas — mismo patrón de
 * lectura (getRoutine/getWeeks) ya usado en el resto de la app.
 *
 * getWeeks() ya resuelve el esqueleto de semanas/días aunque todavía no
 * se haya guardado ningún ejercicio (Sprint 4.1, repository.ts), así que
 * esta pantalla deja de mostrar "Próximamente" apenas se crea la rutina.
 *
 * Sprint 4.4 — cada semana se puede renombrar (ej: "Adaptación"). Si
 * nunca se le pone nombre, se sigue mostrando el genérico ("Semana N").
 * Solo aplica acá (rutinas propias); "El Toro" no tiene esta opción.
 *
 * Sprint 4.6.1 — si `routineId` ya no existe (rutina propia eliminada
 * desde el catálogo, por ejemplo en otra pestaña) redirige a /entreno en
 * vez de mostrar esta pantalla: `getRoutine()` siempre devuelve algo
 * (cae a "El Toro" si no encuentra el id), así que sin este chequeo se
 * vería la rutina base disfrazada de rutina propia. Solo valida
 * existencia — no toca ninguna lógica del constructor.
 *
 * Sprint 4.8 — "Resumen" (semanas/días/total de ejercicios, calculado
 * acá mismo sobre `weeks`, sin ningún cálculo nuevo en el repositorio) y
 * "✏️ Editar rutina": formulario inline con los mismos 5 campos de
 * /entreno/nueva, que llama a `updateCustomRoutineInfo` (nueva,
 * repository.ts). Si al guardar se reducen semanas o días se pide
 * confirmación primero (se pierde contenido); si se aumentan, el
 * repositorio ya genera las semanas/días vacíos nuevos solo. No permite
 * guardar con nombre vacío o semanas/días en 0 (mensaje simple debajo
 * del formulario, botón Guardar deshabilitado).
 */
export default function MiRutinaPage({ params }: { params: Promise<{ routineId: string }> }) {
  const { routineId } = use(params);
  const router = useRouter();
  const [routine, setRoutine] = useState<Routine | null>(null);
  const [weeks, setWeeks] = useState<RoutineWeek[]>([]);
  const [renamingWeekId, setRenamingWeekId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [editName, setEditName] = useState("");
  const [editGoal, setEditGoal] = useState("");
  const [editSport, setEditSport] = useState("");
  const [editWeeksCount, setEditWeeksCount] = useState("");
  const [editDaysPerWeek, setEditDaysPerWeek] = useState("");

  function refresh() {
    setRoutine(getRoutine(routineId));
    setWeeks(getWeeks(routineId));
  }

  useEffect(() => {
    const routineExists = isBaseRoutine(routineId) || getRoutines().some((r) => r.id === routineId);
    if (!routineExists) {
      router.push("/entreno");
      return;
    }
    setRoutine(getRoutine(routineId));
    setWeeks(getWeeks(routineId));
  }, [routineId, router]);

  if (!routine) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-text-secondary text-sm">Cargando…</p>
      </div>
    );
  }

  const totalExercises = weeks.reduce(
    (sum, week) => sum + week.days.reduce((daySum, day) => daySum + day.exercises.length, 0),
    0
  );

  function startRename(week: RoutineWeek) {
    setRenamingWeekId(week.id);
    setRenameValue(week.displayName ?? "");
  }

  function cancelRename() {
    setRenamingWeekId(null);
  }

  function saveRename(weekId: string) {
    renameCustomRoutineWeek(routineId, weekId, renameValue);
    setRenamingWeekId(null);
    refresh();
  }

  const startEditInfo = () => {
    setEditName(routine.name);
    setEditGoal(routine.goal);
    setEditSport(routine.sport);
    setEditWeeksCount(String(routine.weeksCount));
    setEditDaysPerWeek(String(routine.daysPerWeek));
    setIsEditingInfo(true);
  };

  function cancelEditInfo() {
    setIsEditingInfo(false);
  }

  const editWeeksNum = Math.max(0, Number(editWeeksCount) || 0);
  const editDaysNum = Math.max(0, Number(editDaysPerWeek) || 0);
  const editInfoError =
    editName.trim().length === 0
      ? "Ingresá un nombre."
      : editWeeksNum < 1
        ? "La cantidad de semanas tiene que ser mayor a 0."
        : editDaysNum < 1
          ? "La cantidad de días tiene que ser mayor a 0."
          : null;

  const saveEditInfo = () => {
    if (editInfoError) return;

    const losesWeeks = editWeeksNum < routine.weeksCount;
    const losesDays = editDaysNum < routine.daysPerWeek;
    if (losesWeeks || losesDays) {
      const confirmed = window.confirm(
        "¿Guardar estos cambios?\n\nAl reducir semanas o días se eliminan las semanas/días sobrantes junto con sus ejercicios. Esta acción no se puede deshacer."
      );
      if (!confirmed) return;
    }

    const updated = updateCustomRoutineInfo(routineId, {
      name: editName,
      goal: editGoal,
      sport: editSport,
      weeksCount: editWeeksNum,
      daysPerWeek: editDaysNum,
    });
    if (!updated) return;

    setIsEditingInfo(false);
    refresh();
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Link href="/entreno" className="text-text-muted text-xs uppercase tracking-wide font-display">
          ← Entreno
        </Link>

        {isEditingInfo ? (
          <Card className="flex flex-col gap-4 mt-3">
            <div>
              <label className="text-text-muted text-[11px] uppercase tracking-wide font-display">Nombre</label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="h-11 w-full mt-1 rounded-lg bg-bg-surface-raised border border-border-subtle px-3 text-sm placeholder:text-text-muted"
              />
            </div>
            <div>
              <label className="text-text-muted text-[11px] uppercase tracking-wide font-display">Objetivo</label>
              <input
                type="text"
                value={editGoal}
                onChange={(e) => setEditGoal(e.target.value)}
                className="h-11 w-full mt-1 rounded-lg bg-bg-surface-raised border border-border-subtle px-3 text-sm placeholder:text-text-muted"
              />
            </div>
            <div>
              <label className="text-text-muted text-[11px] uppercase tracking-wide font-display">Deporte</label>
              <input
                type="text"
                value={editSport}
                onChange={(e) => setEditSport(e.target.value)}
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
                  value={editWeeksCount}
                  onChange={(e) => setEditWeeksCount(e.target.value)}
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
                  value={editDaysPerWeek}
                  onChange={(e) => setEditDaysPerWeek(e.target.value)}
                  className="h-11 w-full mt-1 rounded-lg bg-bg-surface-raised border border-border-subtle px-3 text-sm placeholder:text-text-muted"
                />
              </div>
            </div>

            {editInfoError && <p className="text-danger text-xs">{editInfoError}</p>}

            <div className="grid grid-cols-2 gap-3">
              <Button type="button" variant="secondary" onClick={cancelEditInfo}>
                Cancelar
              </Button>
              <Button type="button" variant="primary" disabled={Boolean(editInfoError)} onClick={saveEditInfo}>
                Guardar
              </Button>
            </div>
          </Card>
        ) : (
          <>
            <div className="flex items-start justify-between gap-3 mt-1">
              <div>
                <h1 className="text-2xl font-display font-semibold">{routine.name}</h1>
                <p className="text-text-secondary text-sm mt-1">{routine.description}</p>
              </div>
              <Button type="button" variant="ghost" className="shrink-0" onClick={startEditInfo}>
                ✏️ Editar rutina
              </Button>
            </div>

            <Card className="mt-3">
              <p className="text-text-muted text-[11px] uppercase tracking-wide font-display">Resumen</p>
              <p className="text-text-primary text-sm mt-2">
                {routine.weeksCount} {routine.weeksCount === 1 ? "semana" : "semanas"} · {routine.daysPerWeek}{" "}
                {routine.daysPerWeek === 1 ? "día" : "días"} · {totalExercises}{" "}
                {totalExercises === 1 ? "ejercicio" : "ejercicios"}
              </p>
            </Card>
          </>
        )}
      </div>

      <div className="flex flex-col gap-3">
        {weeks.map((week) => (
          <Card key={week.id} raised>
            {renamingWeekId === week.id ? (
              <div className="flex flex-col gap-3">
                <div>
                  <label className="text-text-muted text-[11px] uppercase tracking-wide font-display">
                    Nombre de la semana
                  </label>
                  <input
                    type="text"
                    placeholder={week.label}
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    className="h-11 w-full mt-1 rounded-lg bg-bg-surface-raised border border-border-subtle px-3 text-sm placeholder:text-text-muted"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Button type="button" variant="secondary" onClick={cancelRename}>
                    Cancelar
                  </Button>
                  <Button type="button" variant="primary" onClick={() => saveRename(week.id)}>
                    Guardar
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3">
                <Link
                  href={`/entreno/mi-rutina/${routineId}/${week.id}`}
                  className="flex-1 active:scale-[0.98] transition-transform"
                >
                  <p className="font-display text-lg uppercase tracking-wide">{week.displayName || week.label}</p>
                  <p className="text-text-secondary text-sm mt-1">{week.days.length} días</p>
                </Link>
                <Button type="button" variant="ghost" className="shrink-0" onClick={() => startRename(week)}>
                  ✏️
                </Button>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
