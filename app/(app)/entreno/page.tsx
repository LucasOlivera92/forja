"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Card } from "@/shared/ui/Card";
import { ProgressBar } from "@/shared/ui/ProgressBar";
import { getRoutine, getWeekCompletion } from "@/lib/mock/repository";

const routine = getRoutine();

interface WeekRow {
  id: string;
  label: string;
  completedDays: number;
  totalDays: number;
  percent: number;
}

export default function EntrenoPage() {
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
        <h1 className="text-2xl font-display font-semibold">Entreno</h1>
        <p className="text-text-secondary text-sm mt-1">{routine.name}</p>
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
