"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Card } from "@/shared/ui/Card";
import { ProgressBar } from "@/shared/ui/ProgressBar";
import { getRoutine, getWeekCompletion } from "@/lib/mock/repository";

/**
 * Sprint 3.5 — Semanas de la rutina activa (El Toro). Mismo contenido que
 * antes vivía en /entreno (raíz): se movió un nivel más abajo porque la
 * raíz de /entreno ahora es el catálogo de rutinas. La navegación hacia
 * semana/día/registro que sigue desde acá (/entreno/[weekId] y
 * /entreno/[weekId]/[dayId]) NO se tocó — sigue siendo exactamente la
 * misma que ya usa Hoy para ir directo al registro del día pendiente.
 */
const routine = getRoutine();

interface WeekRow {
  id: string;
  label: string;
  completedDays: number;
  totalDays: number;
  percent: number;
}

export default function EntrenoSemanasPage() {
  const [weeks, setWeeks] = useState<WeekRow[] | null>(null);

  useEffect(() => {
    setWeeks(
      routine.weeks.map((week) => {
        const { completedDays, totalDays } = getWeekCompletion(week.id, routine.id);
        return {
          id: week.id,
          label: week.label,
          completedDays,
          totalDays,
          percent: totalDays === 0 ? 0 : Math.round((completedDays / totalDays) * 100),
        };
      })
    );
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Link href="/entreno" className="text-text-muted text-xs uppercase tracking-wide font-display">
          ← Entreno
        </Link>
        <h1 className="text-2xl font-display font-semibold mt-1">{routine.name}</h1>
      </div>

      <div className="flex flex-col gap-3">
        {(weeks ?? routine.weeks.map((w) => ({ id: w.id, label: w.label, completedDays: 0, totalDays: w.days.length, percent: 0 }))).map(
          (week) => (
            <Link key={week.id} href={`/entreno/${week.id}`}>
              <Card raised className="active:scale-[0.98] transition-transform">
                <div className="flex items-center justify-between">
                  <p className="font-display text-lg uppercase tracking-wide">{week.label}</p>
                  {week.percent === 100 && (
                    <span className="text-success text-xs font-display uppercase tracking-wide">Completa</span>
                  )}
                </div>
                <p className="text-text-secondary text-sm mt-1">
                  {week.completedDays} / {week.totalDays} días
                </p>
                <ProgressBar percent={week.percent} className="mt-3" />
              </Card>
            </Link>
          )
        )}
      </div>
    </div>
  );
}
