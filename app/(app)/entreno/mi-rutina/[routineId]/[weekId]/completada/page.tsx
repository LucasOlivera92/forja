"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useEffect, useState } from "react";
import { Button } from "@/shared/ui/Button";
import { WeekCompletedSummary } from "@/shared/ui/WeekCompletedSummary";
import { getWeek, getWeekCompletion, resetWeekProgress } from "@/lib/mock/repository";
import { RoutineWeek } from "@/lib/mock/types";

/**
 * Sprint 6.2 — Pantalla de cierre de semana para una rutina PROPIA,
 * equivalente a app/(app)/entreno/[weekId]/completada/page.tsx ("El
 * Toro"), reutilizando la misma tarjeta visual (`WeekCompletedSummary`) y
 * la misma acción de reinicio (`resetWeekProgress`). No depende de
 * `ROUTINE.id` en ningún momento: `routineId` viene siempre de la ruta
 * (`/entreno/mi-rutina/[routineId]/[weekId]/completada`) y se pasa
 * explícito a `getWeek`, `getWeekCompletion` y `resetWeekProgress`.
 *
 * Única diferencia de comportamiento respecto a El Toro: al reiniciar la
 * semana, vuelve a la lista de días de Mi Rutina
 * (`/entreno/mi-rutina/${routineId}/${weekId}`) en vez de a "/hoy", ya que
 * el Dashboard de Hoy no tiene noción de rutinas propias (ver nota de
 * alcance en la pantalla del día).
 */
export default function MiRutinaSemanaCompletadaPage({
  params,
}: {
  params: Promise<{ routineId: string; weekId: string }>;
}) {
  const { routineId, weekId } = use(params);
  const router = useRouter();

  const [week, setWeek] = useState<RoutineWeek | null | undefined>(undefined);
  const [completion, setCompletion] = useState<{ completedDays: number; totalDays: number } | null>(null);

  useEffect(() => {
    setWeek(getWeek(weekId, routineId) ?? null);
    setCompletion(getWeekCompletion(weekId, routineId));
  }, [routineId, weekId]);

  function handleRestart() {
    resetWeekProgress(weekId, routineId);
    router.push(`/entreno/mi-rutina/${routineId}/${weekId}`);
  }

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

  return (
    <div className="flex flex-col gap-4">
      <Link
        href={`/entreno/mi-rutina/${routineId}`}
        className="text-text-muted text-xs uppercase tracking-wide font-display"
      >
        ← Volver a la rutina
      </Link>

      <WeekCompletedSummary
        weekLabel={week.displayName || week.label}
        completedDays={completion?.completedDays ?? week.days.length}
        totalDays={completion?.totalDays ?? week.days.length}
      />

      <Button type="button" variant="primary" onClick={handleRestart}>
        🔄 Reiniciar semana
      </Button>
    </div>
  );
}
