"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { Card } from "@/shared/ui/Card";
import { clsx } from "@/shared/utils/clsx";
import { getWeek, isDayCompleted } from "@/lib/mock/repository";

interface DayRow {
  id: string;
  order: number;
  name: string;
  completed: boolean;
}

export default function SemanaPage({ params }: { params: Promise<{ weekId: string }> }) {
  const { weekId } = use(params);
  const week = getWeek(weekId);
  const [days, setDays] = useState<DayRow[] | null>(null);

  useEffect(() => {
    if (!week) return;
    setDays(
      week.days.map((day) => ({
        id: day.id,
        order: day.order,
        name: day.name,
        completed: isDayCompleted(weekId, day.id, week.routineId),
      }))
    );
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

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Link href="/entreno" className="text-text-muted text-xs uppercase tracking-wide font-display">
          ← Entreno
        </Link>
        <h1 className="text-2xl font-display font-semibold mt-1">{week.label}</h1>
      </div>

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
    </div>
  );
}
