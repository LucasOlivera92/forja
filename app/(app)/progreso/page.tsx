"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import {
  getAllDaySessionsSnapshot,
  getAllRoutineExecutionsSnapshot,
  getAllSleepLogs,
  getNutritionAnalytics,
} from "@/lib/mock/repository";
import { isDaySessionPayload, isRoutineExecutionPayload } from "@/lib/cloud/workout-logs";
import type { DaySession, NutritionAnalyticsReport, NutritionStatsPeriod, SleepLog } from "@/lib/mock/types";
import { ProgressGoalsAndPhotos } from "./_components/ProgressGoalsAndPhotos";

type ReportPeriod = NutritionStatsPeriod;

interface WorkoutSummary {
  sessions: number;
  completedSets: number;
  volumeKg: number;
}

interface SleepSummary {
  nights: number;
  averageHours: number | null;
  goodNights: number;
  regularNights: number;
  badNights: number;
}

interface ProgressReport {
  period: ReportPeriod;
  start: string;
  end: string;
  nutrition: NutritionAnalyticsReport;
  workout: WorkoutSummary;
  sleep: SleepSummary;
  recommendations: string[];
}

const emptySubscribe = () => () => undefined;

function sessionDate(session: DaySession): string | null {
  return session.date ?? session.finishedAt?.slice(0, 10) ?? null;
}

function collectWorkoutSessions(): DaySession[] {
  const live = getAllDaySessionsSnapshot().filter(isDaySessionPayload);
  const archived = getAllRoutineExecutionsSnapshot()
    .filter(isRoutineExecutionPayload)
    .flatMap((execution) => execution.sessions);
  const unique = new Map<string, DaySession>();

  for (const session of [...archived, ...live]) {
    const key = [session.routineId, session.weekId, session.dayId, session.date, session.finishedAt].join("|");
    unique.set(key, session);
  }
  return [...unique.values()];
}

function summarizeWorkout(start: string, end: string): WorkoutSummary {
  const sessions = collectWorkoutSessions().filter((session) => {
    const date = sessionDate(session);
    return session.finishedAt !== null && date !== null && date >= start && date <= end;
  });
  let completedSets = 0;
  let volumeKg = 0;

  for (const session of sessions) {
    for (const exercise of session.exercises) {
      for (const set of exercise.sets) {
        if (!set.done) continue;
        completedSets += 1;
        if (set.weight !== null && set.reps !== null) volumeKg += set.weight * set.reps;
      }
    }
  }
  return { sessions: sessions.length, completedSets, volumeKg: Math.round(volumeKg) };
}

function summarizeSleep(logs: SleepLog[], start: string, end: string): SleepSummary {
  const periodLogs = logs.filter((log) => log.date >= start && log.date <= end);
  return {
    nights: periodLogs.length,
    averageHours:
      periodLogs.length > 0
        ? Math.round((periodLogs.reduce((sum, log) => sum + log.hours, 0) / periodLogs.length) * 10) / 10
        : null,
    goodNights: periodLogs.filter((log) => log.quality === "bien").length,
    regularNights: periodLogs.filter((log) => log.quality === "regular").length,
    badNights: periodLogs.filter((log) => log.quality === "mal").length,
  };
}

function recommendationsFor(
  period: ReportPeriod,
  workout: WorkoutSummary,
  nutrition: NutritionAnalyticsReport,
  sleep: SleepSummary
): string[] {
  const recommendations: string[] = [];
  const workoutTarget = period === "semana" ? 3 : Math.max(3, Math.round(nutrition.daysElapsed * (3 / 7)));

  if (workout.sessions === 0) recommendations.push("Registrá y terminá al menos una sesión para medir tu constancia.");
  else if (workout.sessions < workoutTarget)
    recommendations.push(`Completaste ${workout.sessions} sesiones; buscá acercarte a ${workoutTarget} en este período.`);
  else recommendations.push(`Entrenamiento sólido: completaste ${workout.sessions} sesiones en el período.`);

  if (nutrition.adherencePercent < 70)
    recommendations.push("La principal oportunidad está en alimentación: prepará con anticipación las comidas más omitidas.");
  else if (nutrition.adherencePercent < 90)
    recommendations.push("Tu alimentación fue consistente; revisá los días omitidos para superar el 90% de adherencia.");
  else recommendations.push(`Muy buena adherencia nutricional: ${nutrition.adherencePercent}%.`);

  if (sleep.nights === 0) recommendations.push("Registrá tu descanso al despertar para detectar tendencias reales.");
  else if ((sleep.averageHours ?? 0) < 7)
    recommendations.push(`Promediaste ${sleep.averageHours} h de sueño; probá proteger una franja estable de 7 a 9 horas.`);
  else if (sleep.badNights > sleep.goodNights)
    recommendations.push("Las noches de mala calidad superaron a las buenas; revisá horarios, cenas y regularidad.");
  else recommendations.push(`Descanso favorable: ${sleep.averageHours} h promedio y ${sleep.goodNights} noches buenas.`);

  return recommendations;
}

function buildReport(period: ReportPeriod): ProgressReport {
  const nutrition = getNutritionAnalytics(period);
  const workout = summarizeWorkout(nutrition.periodStart, nutrition.periodEnd);
  const sleep = summarizeSleep(getAllSleepLogs(), nutrition.periodStart, nutrition.periodEnd);
  return {
    period,
    start: nutrition.periodStart,
    end: nutrition.periodEnd,
    nutrition,
    workout,
    sleep,
    recommendations: recommendationsFor(period, workout, nutrition, sleep),
  };
}

function reportAsText(report: ProgressReport): string {
  const label = report.period === "semana" ? "SEMANAL" : "MENSUAL";
  return [
    `FORJA — INFORME ${label}`,
    `${report.start} al ${report.end}`,
    "",
    "ENTRENAMIENTO",
    `• Sesiones terminadas: ${report.workout.sessions}`,
    `• Series completadas: ${report.workout.completedSets}`,
    `• Volumen registrado: ${report.workout.volumeKg.toLocaleString("es-AR")} kg`,
    "",
    "ALIMENTACIÓN",
    `• Adherencia: ${report.nutrition.adherencePercent}%`,
    `• Comidas realizadas: ${report.nutrition.mealsCompleted}`,
    `• Comidas omitidas: ${report.nutrition.mealsOmitted}`,
    `• Promedio diario: ${report.nutrition.averages.protein} g proteína · ${report.nutrition.averages.carbs} g carbohidratos · ${report.nutrition.averages.fat} g grasas`,
    "",
    "DESCANSO",
    `• Noches registradas: ${report.sleep.nights}`,
    `• Horas promedio: ${report.sleep.averageHours ?? "Sin datos"}`,
    `• Calidad: ${report.sleep.goodNights} buenas · ${report.sleep.regularNights} regulares · ${report.sleep.badNights} malas`,
    "",
    "PRÓXIMOS PASOS",
    ...report.recommendations.map((item) => `• ${item}`),
  ].join("\n");
}

export default function ProgressPage() {
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);
  const [period, setPeriod] = useState<ReportPeriod>("semana");
  const [message, setMessage] = useState<string | null>(null);
  const report = useMemo(() => (mounted ? buildReport(period) : null), [mounted, period]);

  async function copyReport() {
    if (!report) return;
    try {
      await navigator.clipboard.writeText(reportAsText(report));
      setMessage("Informe copiado.");
    } catch {
      setMessage("No se pudo copiar el informe.");
    }
  }

  function shareReport() {
    if (!report) return;
    window.open(`https://wa.me/?text=${encodeURIComponent(reportAsText(report))}`, "_blank", "noopener,noreferrer");
  }

  if (!report) return <p className="text-text-secondary text-sm">Preparando tu progreso…</p>;

  return (
    <div className="flex flex-col gap-4 report-print">
      <div>
        <h1 className="text-2xl font-display font-semibold">Progreso</h1>
        <p className="text-text-secondary text-sm mt-1">Datos reales del {report.start} al {report.end}</p>
      </div>

      <div className="grid grid-cols-2 gap-2 no-print">
        <Button type="button" variant={period === "semana" ? "primary" : "secondary"} onClick={() => setPeriod("semana")}>
          Semana
        </Button>
        <Button type="button" variant={period === "mes" ? "primary" : "secondary"} onClick={() => setPeriod("mes")}>
          Mes
        </Button>
      </div>

      <div className="no-print contents">
        <ProgressGoalsAndPhotos
          period={period}
          daysElapsed={report.nutrition.daysElapsed}
          workoutSessions={report.workout.sessions}
          nutritionAdherence={report.nutrition.adherencePercent}
          averageSleepHours={report.sleep.averageHours}
        />
      </div>

      <SummaryCard title="🏋️ Entrenamiento" items={[
        ["Sesiones terminadas", report.workout.sessions],
        ["Series completadas", report.workout.completedSets],
        ["Volumen registrado", `${report.workout.volumeKg.toLocaleString("es-AR")} kg`],
      ]} />
      <SummaryCard title="🥗 Alimentación" items={[
        ["Adherencia", `${report.nutrition.adherencePercent}%`],
        ["Comidas realizadas", report.nutrition.mealsCompleted],
        ["Comidas omitidas", report.nutrition.mealsOmitted],
        ["Proteína promedio", `${report.nutrition.averages.protein} g/día`],
      ]} />
      <SummaryCard title="🌙 Descanso" items={[
        ["Noches registradas", report.sleep.nights],
        ["Horas promedio", report.sleep.averageHours === null ? "Sin datos" : `${report.sleep.averageHours} h`],
        ["Calidad", `${report.sleep.goodNights} bien · ${report.sleep.regularNights} regular · ${report.sleep.badNights} mal`],
      ]} />

      <Card raised>
        <h2 className="text-lg font-display font-semibold">Dónde mejorar</h2>
        <ul className="mt-3 flex flex-col gap-2 text-text-secondary text-sm">
          {report.recommendations.map((item) => <li key={item}>• {item}</li>)}
        </ul>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 no-print">
        <Button type="button" variant="secondary" onClick={copyReport}>📋 Copiar</Button>
        <Button type="button" variant="secondary" onClick={shareReport}>💬 WhatsApp</Button>
        <Button type="button" variant="primary" onClick={() => window.print()}>⬇ Guardar PDF</Button>
      </div>
      <p aria-live="polite" className="text-text-secondary text-sm min-h-5 no-print">{message}</p>
    </div>
  );
}

function SummaryCard({ title, items }: { title: string; items: Array<[string, string | number]> }) {
  return (
    <Card>
      <h2 className="text-lg font-display font-semibold">{title}</h2>
      <dl className="mt-3 flex flex-col gap-2">
        {items.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-4 text-sm">
            <dt className="text-text-secondary">{label}</dt>
            <dd className="text-text-primary font-medium text-right">{value}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}
