"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import { ProgressBar } from "@/shared/ui/ProgressBar";
import { clsx } from "@/shared/utils/clsx";
import { getWeek, getWeekCompletion, getWeekExecutionHistory, isDayCompleted, restartWeek } from "@/lib/mock/repository";

interface DayRow {
  id: string;
  order: number;
  name: string;
  completed: boolean;
}

/** Fecha ISO → DD/MM/AAAA, sin depender de ninguna librería nueva. */
function formatDate(iso: string): string {
  const date = new Date(iso);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${date.getFullYear()}`;
}

/**
 * Sprint 4.3.1 — Resumen de semana + "Reiniciar semana" inteligente.
 * Arriba: barra de progreso + "X de Y días completados" (ProgressBar ya
 * existente, misma que usa /entreno/semanas) y "Última ejecución" (fecha
 * de la ejecución archivada más reciente, o el mensaje si nunca se
 * completó). Abajo de la lista de días, un botón permanente "🔄 Reiniciar
 * semana" — solo visible con al menos 1 día completado — que pide
 * confirmación y llama a `restartWeek()` (archiva si hacía falta y
 * siempre limpia el progreso en vivo), reutilizando toda la lógica de
 * Sprint 4.3 sin duplicar nada.
 */
export default function SemanaPage({ params }: { params: Promise<{ weekId: string }> }) {
  const { weekId } = use(params);
  const week = getWeek(weekId);
  const [days, setDays] = useState<DayRow[] | null>(null);
  const [completion, setCompletion] = useState<{ completedDays: number; totalDays: number } | null>(null);
  const [lastExecutionAt, setLastExecutionAt] = useState<string | null>(null);

  function refresh() {
    if (!week) return;
    setDays(
      week.days.map((day) => ({
        id: day.id,
        order: day.order,
        name: day.name,
        completed: isDayCompleted(weekId, day.id),
      }))
    );
    setCompletion(getWeekCompletion(weekId));
    const executions = getWeekExecutionHistory(weekId);
    setLastExecutionAt(executions.at(-1)?.completedAt ?? null);
  }

  useEffect(() => {
    if (!week) return;
    setDays(
      week.days.map((day) => ({
        id: day.id,
        order: day.order,
        name: day.name,
        completed: isDayCompleted(weekId, day.id),
      }))
    );
    setCompletion(getWeekCompletion(weekId));
    const executions = getWeekExecutionHistory(weekId);
    setLastExecutionAt(executions.at(-1)?.completedAt ?? null);
  }, [weekId, week]);

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

  const rows: DayRow[] = days ?? week.days.map((d) => ({ id: d.id, order: d.order, name: d.name, completed: false }));
  const completedDays = completion?.completedDays ?? 0;
  const totalDays = completion?.totalDays ?? week.days.length;
  const percent = totalDays === 0 ? 0 : Math.round((completedDays / totalDays) * 100);

  function handleRestart() {
    const confirmed = window.confirm(
      "¿Reiniciar esta semana?\n\nSe conservará todo el historial de entrenamientos.\nSolo se reiniciará el progreso actual."
    );
    if (!confirmed) return;
    restartWeek(weekId);
    refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Link href="/entreno" className="text-text-muted text-xs uppercase tracking-wide font-display">
          ← Entreno
        </Link>
        <h1 className="text-2xl font-display font-semibold mt-1">{week.label}</h1>
      </div>

      <Card>
        <ProgressBar percent={percent} />
        <p className="text-text-secondary text-sm mt-2">
          {completedDays} de {totalDays} días completados
        </p>

        <div className="mt-4 pt-3 border-t border-border-subtle">
          <p className="text-text-muted text-[11px] uppercase tracking-wide font-display">Última ejecución</p>
          <p className="text-text-secondary text-sm mt-1">
            {lastExecutionAt ? formatDate(lastExecutionAt) : "Todavía no completaste esta semana."}
          </p>
        </div>
      </Card>

      <div className="flex flex-col gap-3">
        {rows.map((day) => (
          <Link key={day.id} href={`/entreno/${weekId}/${day.id}`}>
            <Card className="active:scale-[0.98] transition-transform">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-text-muted text-xs uppercase tracking-wide font-display">Día {day.order}</p>
                  <p className="text-text-primary text-sm font-medium mt-1">{day.name}</p>
                </div>
                <span
                  className={clsx(
                    "text-xs font-display uppercase tracking-wide shrink-0",
                    day.completed ? "text-success" : "text-text-muted"
                  )}
                >
                  {day.completed ? "✔ Completado" : "Pendiente"}
                </span>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      {completedDays >= 1 && (
        <Button type="button" variant="secondary" onClick={handleRestart}>
          🔄 Reiniciar semana
        </Button>
      )}
    </div>
  );
}
