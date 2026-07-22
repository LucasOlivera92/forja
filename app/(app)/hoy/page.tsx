"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Card } from "@/shared/ui/Card";
import { AceroElement } from "@/shared/ui/AceroElement";
import { ProgressBar } from "@/shared/ui/ProgressBar";
import { getCurrentDayPointer, getDashboardSummary } from "@/lib/mock/repository";
import { DashboardSummary } from "@/lib/mock/types";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Buenos días";
  if (hour < 19) return "Buenas tardes";
  return "Buenas noches";
}

export default function HoyPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);

  useEffect(() => {
    setSummary(getDashboardSummary());
  }, []);

  if (!summary) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-display font-semibold">FORJA</h1>
        <Card>
          <p className="text-text-secondary text-sm">Cargando tu día…</p>
        </Card>
      </div>
    );
  }

  const { workout, nutrition, aceroState, overallPercent, streak } = summary;
  const pointer = getCurrentDayPointer();
  const entrenoHref = pointer ? `/entreno/${pointer.weekId}/${pointer.dayId}` : "/entreno";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-display font-semibold">{getGreeting()}</h1>
          <p className="text-text-secondary text-sm mt-1">Hoy tenés una nueva oportunidad de forjarte.</p>
        </div>
        {streak > 0 && (
          <div className="flex items-center gap-1 rounded-full bg-bg-surface border border-border-subtle px-3 py-1.5 shrink-0">
            <span className="text-gold-achievement text-sm font-display font-semibold">{streak}</span>
            <span className="text-text-muted text-[11px] uppercase tracking-wide">
              {streak === 1 ? "día" : "días"}
            </span>
          </div>
        )}
      </div>

      <Card raised>
        <AceroElement state={aceroState} percent={overallPercent} />
      </Card>

      <Link href={entrenoHref}>
        <Card className="active:scale-[0.98] transition-transform">
          <div className="flex items-center justify-between">
            <p className="text-text-muted text-xs uppercase tracking-wide font-display">Entreno de hoy</p>
            {workout.finished && (
              <span className="text-success text-xs font-display uppercase tracking-wide">Completo</span>
            )}
          </div>
          <p className="text-text-primary text-sm mt-2">
            {workout.completedSets} / {workout.totalSets} series registradas
          </p>
          <ProgressBar percent={workout.percent} className="mt-3" />
        </Card>
      </Link>

      <Link href="/nutricion">
        <Card className="active:scale-[0.98] transition-transform">
          <div className="flex items-center justify-between">
            <p className="text-text-muted text-xs uppercase tracking-wide font-display">Nutrición de hoy</p>
            {nutrition.completedMeals === nutrition.totalMeals && (
              <span className="text-success text-xs font-display uppercase tracking-wide">Completo</span>
            )}
          </div>
          <p className="text-text-primary text-sm mt-2">
            {nutrition.completedMeals} / {nutrition.totalMeals} comidas · {nutrition.kcalConsumed} /{" "}
            {nutrition.kcalTarget} kcal
          </p>
          <ProgressBar percent={nutrition.percent} className="mt-3" />
        </Card>
      </Link>
    </div>
  );
}
