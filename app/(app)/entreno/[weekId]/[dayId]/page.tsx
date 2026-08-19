"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { use } from "react";
import { Button } from "@/shared/ui/Button";
import { WorkoutDayRegister } from "@/shared/ui/WorkoutDayRegister";
import { archiveWeekExecution, finishDay, getDayPlan, getWeek, getWeekCompletion } from "@/lib/mock/repository";
import { ROUTINE } from "@/lib/mock/data";

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
 * último entrenamiento registrado y un indicador ▲/▼/= comparado contra lo
 * que se está tipeando ahora mismo — sin storage nuevo, sin Supabase.
 *
 * Sprint 4.3 — si finalizar ESTE día es lo que completa las 5 de la
 * semana, se archiva la semana como una ejecución más
 * (archiveWeekExecution) y se va a la pantalla "Semana completada" en vez
 * de a Hoy. Cualquier otro día sigue yendo a Hoy exactamente igual que
 * antes — no cambia nada del registro en sí.
 *
 * Sprint 6.2 — el bloque de ejercicios/registro (inputs de peso/reps,
 * "último entrenamiento", delta) se extrajo a `WorkoutDayRegister`
 * (shared/ui/) para que una rutina propia pueda usarlo también. Esta
 * pantalla le pasa `routineId={ROUTINE.id}` explícito, igual que a
 * `getDayPlan`/`getWeek`/`getWeekCompletion`/`finishDay`/
 * `archiveWeekExecution` — ninguna de esas llamadas depende ya del
 * default del repositorio, aunque el default siga siendo el mismo valor.
 * El comportamiento visual y funcional de "El Toro" no cambia.
 */
export default function DiaPage({ params }: { params: Promise<{ weekId: string; dayId: string }> }) {
  const { weekId, dayId } = use(params);
  const dayPlan = getDayPlan(weekId, dayId, ROUTINE.id);
  const week = getWeek(weekId, ROUTINE.id);
  const router = useRouter();

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
   * Guarda la sesión como finalizada. Si con este día se completan las 5
   * de la semana, archiva la ejecución y muestra la pantalla de cierre;
   * si no, vuelve a Hoy exactamente como siempre.
   */
  function handleFinish() {
    const before = getWeekCompletion(weekId, ROUTINE.id);
    finishDay(weekId, dayId, ROUTINE.id);
    const after = getWeekCompletion(weekId, ROUTINE.id);
    const justCompletedWeek =
      before.completedDays < before.totalDays && after.completedDays === after.totalDays && after.totalDays > 0;

    if (justCompletedWeek) {
      archiveWeekExecution(weekId, ROUTINE.id);
      router.push(`/entreno/${weekId}/completada`);
    } else {
      router.push("/hoy");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Link href={`/entreno/${weekId}`} className="text-text-muted text-xs uppercase tracking-wide font-display">
          ← {week.label}
        </Link>
        <h1 className="text-2xl font-display font-semibold mt-1">{dayPlan.name}</h1>
      </div>

      <WorkoutDayRegister routineId={ROUTINE.id} weekId={weekId} dayId={dayId} dayPlan={dayPlan} />

      <Button type="button" variant="primary" onClick={handleFinish}>
        Finalizar entrenamiento
      </Button>
    </div>
  );
}
