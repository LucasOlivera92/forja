"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Card } from "@/shared/ui/Card";
import { ProgressBar } from "@/shared/ui/ProgressBar";
import { clsx } from "@/shared/utils/clsx";
import { getNutritionAnalytics } from "@/lib/mock/repository";
import { NutritionAnalyticsReport, NutritionStatsPeriod } from "@/lib/mock/types";

/**
 * Sprint 5.2 — "Motor de análisis nutricional". Todo lo que se muestra
 * acá sale de `getNutritionAnalytics()`, que a su vez deriva todo de
 * `MealCompletionLog` — esta pantalla no calcula nada, solo lee y
 * renderiza (ni un solo `reduce`/`filter` de macros vive acá).
 *
 * Sin gráficos todavía (no corresponde en este sprint): las barras de
 * "Adherencia por día de la semana" reutilizan el `ProgressBar` que ya
 * existe en el resto de FORJA — no se instaló ninguna librería nueva. El
 * modelo de datos (`NutritionAnalyticsReport.charts`) ya queda listo
 * para conectar una librería de gráficos más adelante sin tocar
 * repository.ts otra vez.
 */

const PERIODS: { value: NutritionStatsPeriod; label: string }[] = [
  { value: "semana", label: "Semana" },
  { value: "mes", label: "Mes" },
];

export default function EstadisticasNutricionalesPage() {
  const [period, setPeriod] = useState<NutritionStatsPeriod>("semana");
  const [report, setReport] = useState<NutritionAnalyticsReport | undefined>(undefined);

  useEffect(() => {
    setReport(getNutritionAnalytics(period));
  }, [period]);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Link href="/nutricion" className="text-text-muted text-xs uppercase tracking-wide font-display">
          ← Nutrición
        </Link>
        <h1 className="text-2xl font-display font-semibold mt-1">Estadísticas</h1>
        <p className="text-text-secondary text-sm mt-1">Tus datos, convertidos en progreso.</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {PERIODS.map((p) => (
          <button
            key={p.value}
            type="button"
            onClick={() => setPeriod(p.value)}
            className={clsx(
              "h-11 rounded-xl text-sm font-display uppercase tracking-wide border transition-colors",
              p.value === period
                ? "bg-accent-primary border-accent-primary text-white"
                : "bg-transparent border-border-subtle text-text-secondary"
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      {!report ? (
        <Card>
          <p className="text-text-secondary text-sm">Cargando…</p>
        </Card>
      ) : (
        <>
          <Card raised>
            <p className="text-text-muted text-xs uppercase tracking-wide font-display">Adherencia</p>
            <p className="text-3xl font-display font-semibold text-accent-primary mt-2">
              {report.adherencePercent}%
            </p>
            <ProgressBar percent={report.adherencePercent} className="mt-3" />
            <div className="flex items-center justify-between mt-3">
              <p className="text-text-secondary text-sm">Comidas realizadas</p>
              <p className="text-text-primary text-sm font-medium">{report.mealsCompleted}</p>
            </div>
            <div className="flex items-center justify-between mt-1">
              <p className="text-text-secondary text-sm">Comidas omitidas</p>
              <p className="text-text-primary text-sm font-medium">{report.mealsOmitted}</p>
            </div>
            <p className="text-text-muted text-[11px] mt-2">
              {report.periodStart} → {report.periodEnd} · {report.daysElapsed}{" "}
              {report.daysElapsed === 1 ? "día" : "días"}
            </p>
          </Card>

          <div className="grid grid-cols-2 gap-3">
            <Card>
              <p className="text-text-muted text-[11px] uppercase tracking-wide font-display">🔥 Racha actual</p>
              <p className="text-2xl font-display font-semibold text-gold-achievement mt-1">
                {report.currentStreak}
              </p>
              <p className="text-text-muted text-[11px]">{report.currentStreak === 1 ? "día" : "días"}</p>
            </Card>
            <Card>
              <p className="text-text-muted text-[11px] uppercase tracking-wide font-display">🏆 Mejor racha</p>
              <p className="text-2xl font-display font-semibold text-gold-achievement mt-1">{report.bestStreak}</p>
              <p className="text-text-muted text-[11px]">{report.bestStreak === 1 ? "día" : "días"}</p>
            </Card>
          </div>

          <Card className="flex flex-col gap-1.5">
            <p className="text-text-muted text-[11px] uppercase tracking-wide font-display mb-1">
              Promedios diarios
            </p>
            <AverageRow label="🥩 Proteína" value={`${report.averages.protein} g`} />
            <AverageRow label="⚡ Carbohidratos" value={`${report.averages.carbs} g`} />
            <AverageRow label="🥑 Grasas" value={`${report.averages.fat} g`} />
            <AverageRow label="🌱 Fibra" value={`${report.averages.fiber} g`} />
            <AverageRow label="🔥 Calorías" value={`${report.averages.kcal} kcal`} />
            <AverageRow label="💧 Agua" value="No disponible todavía" muted />
          </Card>

          <Card className="flex flex-col gap-3">
            <p className="text-text-muted text-[11px] uppercase tracking-wide font-display">
              Mejor y peor día de la semana
            </p>
            {report.bestWeekday && report.worstWeekday ? (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-text-muted text-[11px] uppercase tracking-wide font-display">Mejor</p>
                  <p className="text-text-primary text-sm font-medium mt-1">{report.bestWeekday.weekdayLabel}</p>
                  <p className="text-success text-xs mt-0.5">{report.bestWeekday.averageAdherencePercent}%</p>
                </div>
                <div>
                  <p className="text-text-muted text-[11px] uppercase tracking-wide font-display">A reforzar</p>
                  <p className="text-text-primary text-sm font-medium mt-1">{report.worstWeekday.weekdayLabel}</p>
                  <p className="text-danger text-xs mt-0.5">{report.worstWeekday.averageAdherencePercent}%</p>
                </div>
              </div>
            ) : (
              <p className="text-text-secondary text-sm">Todavía no hay suficiente historial para calcularlo.</p>
            )}
          </Card>

          {report.weekdayStats.length > 0 && (
            <Card className="flex flex-col gap-3">
              <p className="text-text-muted text-[11px] uppercase tracking-wide font-display">
                Adherencia por día de la semana
              </p>
              <div className="flex flex-col gap-2.5">
                {report.weekdayStats.map((day) => (
                  <div key={day.weekday}>
                    <div className="flex items-center justify-between">
                      <p className="text-text-secondary text-sm">{day.weekdayLabel}</p>
                      <p className="text-text-primary text-xs font-medium">{day.averageAdherencePercent}%</p>
                    </div>
                    <ProgressBar percent={day.averageAdherencePercent} className="mt-1" />
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function AverageRow({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <p className="text-text-secondary text-sm">{label}</p>
      <p className={clsx("text-sm font-medium", muted ? "text-text-muted italic" : "text-text-primary")}>{value}</p>
    </div>
  );
}
