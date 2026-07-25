"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useEffect, useState } from "react";
import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import { getWeek, getWeekCompletion, resetWeekProgress } from "@/lib/mock/repository";
import { RoutineWeek } from "@/lib/mock/types";

/**
 * Sprint 4.3 — Pantalla de cierre de semana, para "El Toro" (misma ruta
 * /entreno/[weekId] que ya existe, solo se agrega este hijo estático
 * "completada" — no se toca /entreno/[weekId]/[dayId] ni /entreno/semanas).
 * Se llega acá únicamente al finalizar el día que completa la 5ta serie
 * de la semana (ver entreno/[weekId]/[dayId]/page.tsx). Todavía sin
 * estadísticas ni gráficos — solo confirma el cierre y ofrece reiniciar.
 *
 * "Reiniciar semana" limpia el progreso EN VIVO (resetWeekProgress) para
 * que la semana quede lista para correrse de nuevo; el historial de lo ya
 * hecho queda a salvo, archivado como ejecución, y sigue alimentando
 * "Último entrenamiento" en la pantalla de registro.
 */
export default function SemanaCompletadaPage({ params }: { params: Promise<{ weekId: string }> }) {
  const { weekId } = use(params);
  const router = useRouter();

  const [week, setWeek] = useState<RoutineWeek | null | undefined>(undefined);
  const [completion, setCompletion] = useState<{ completedDays: number; totalDays: number } | null>(null);

  useEffect(() => {
    setWeek(getWeek(weekId) ?? null);
    setCompletion(getWeekCompletion(weekId));
  }, [weekId]);

  function handleRestart() {
    resetWeekProgress(weekId);
    router.push("/hoy");
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
        <Link href="/entreno" className="text-accent-primary text-sm">
          ← Volver a Entreno
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Link href="/entreno" className="text-text-muted text-xs uppercase tracking-wide font-display">
        ← Entreno
      </Link>

      <Card raised className="flex flex-col items-center gap-2 py-10 text-center">
        <p className="text-3xl">✅</p>
        <h1 className="text-2xl font-display font-semibold mt-2">Semana completada</h1>
        <p className="text-text-secondary text-sm">{week.label}</p>

        <p className="text-text-muted text-[11px] uppercase tracking-wide font-display mt-6">
          Entrenamientos completados
        </p>
        <p className="text-3xl font-display font-semibold text-accent-primary">
          {completion?.completedDays ?? week.days.length} / {completion?.totalDays ?? week.days.length}
        </p>
      </Card>

      <Button type="button" variant="primary" onClick={handleRestart}>
        🔄 Reiniciar semana
      </Button>
    </div>
  );
}
