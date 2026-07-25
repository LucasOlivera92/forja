"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import { AceroElement } from "@/shared/ui/AceroElement";
import { ProgressBar } from "@/shared/ui/ProgressBar";
import {
  getCurrentDayPointer,
  getDashboardSummary,
  getDayPlan,
  getDaySummary,
  getRoutine,
  getWeek,
} from "@/lib/mock/repository";
import { DashboardSummary, DayPointer, DaySummary, RoutineDayPlan } from "@/lib/mock/types";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Buenos días";
  if (hour < 19) return "Buenas tardes";
  return "Buenas noches";
}

interface TodayInfo {
  pointer: DayPointer | null;
  routineName: string | null;
  weekNumber: number | null;
  dayPlan: RoutineDayPlan | null;
  daySummary: DaySummary | null;
}

/**
 * Sprint 4.7 — "Hoy" pasa a ser el centro de mando: el usuario tiene que
 * entender en menos de 3 segundos qué le toca hacer. Se mantiene el
 * saludo, el streak y el bloque de Acero exactamente igual que antes;
 * debajo se reemplazan las dos cards de enlace ("Entreno de hoy" /
 * "Nutrición de hoy") por cuatro bloques nuevos, cada uno con una sola
 * función: Entrenamiento de hoy, Próximo objetivo, Estadísticas rápidas
 * y una barra de progreso semanal.
 *
 * Todo sale de funciones que YA existen en el repositorio — no se
 * agrega ninguna lógica ni cálculo nuevo acá ni en repository.ts:
 * `getDashboardSummary()` (workout/weekProgress/aceroState/streak, igual
 * que antes), `getCurrentDayPointer()` (mismo puntero que ya usaba el
 * link viejo), y `getWeek`/`getDayPlan`/`getRoutine`/`getDaySummary`
 * (todas de Sprint 3.x, sin tocar) para los datos puntuales de la
 * tarjeta "Entrenamiento de hoy" y de "Estadísticas rápidas".
 *
 * No se toca Nutrición (ni su repository ni su pantalla): solo deja de
 * tener una tarjeta de acceso directo acá — sigue disponible desde
 * BottomNav, que tampoco se toca.
 */
export default function HoyPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [today, setToday] = useState<TodayInfo | null>(null);

  useEffect(() => {
    setSummary(getDashboardSummary());

    const pointer = getCurrentDayPointer();
    if (!pointer) {
      setToday({ pointer: null, routineName: null, weekNumber: null, dayPlan: null, daySummary: null });
    } else {
      setToday({
        pointer,
        routineName: getRoutine(pointer.routineId).name,
        weekNumber: getWeek(pointer.weekId, pointer.routineId)?.number ?? null,
        dayPlan: getDayPlan(pointer.weekId, pointer.dayId, pointer.routineId) ?? null,
        daySummary: getDaySummary(pointer.weekId, pointer.dayId, pointer.routineId),
      });
    }
  }, []);

  if (!summary || !today) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-display font-semibold">FORJA</h1>
        <Card>
          <p className="text-text-secondary text-sm">Cargando tu día…</p>
        </Card>
      </div>
    );
  }

  const { workout, aceroState, weekProgress, streak } = summary;
  const { pointer, routineName, weekNumber, dayPlan, daySummary } = today;
  const entrenoHref = pointer ? `/entreno/${pointer.weekId}/${pointer.dayId}` : "/entreno";

  const weekComplete = weekProgress.totalDays > 0 && weekProgress.completedDays === weekProgress.totalDays;
  const remainingDays = Math.max(0, weekProgress.totalDays - weekProgress.completedDays);

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
        <AceroElement state={aceroState} weekProgress={weekProgress} />
      </Card>

      <Card raised>
        <p className="text-text-muted text-xs uppercase tracking-wide font-display">🔥 Entrenamiento de hoy</p>

        {workout.finished ? (
          <>
            <p className="text-success text-sm font-display uppercase tracking-wide mt-3">✅ Entrenamiento completado</p>
            <p className="text-text-secondary text-sm mt-1">Excelente trabajo.</p>
            <Link href={entrenoHref} className="block mt-4">
              <Button type="button" variant="secondary">
                Ver entrenamiento
              </Button>
            </Link>
          </>
        ) : pointer && dayPlan ? (
          <>
            <p className="text-text-primary text-sm mt-3">
              {routineName} · Semana {weekNumber ?? "—"} · Día {dayPlan.order}
            </p>
            <p className="text-text-secondary text-sm mt-1">Objetivo: {dayPlan.name}</p>
            <p className="text-text-muted text-xs mt-1">{dayPlan.exercises.length} ejercicios</p>
            <Link href={entrenoHref} className="block mt-4">
              <Button type="button" variant="primary">
                ▶ Comenzar entrenamiento
              </Button>
            </Link>
          </>
        ) : (
          <p className="text-text-secondary text-sm mt-3">No hay entrenamientos pendientes.</p>
        )}
      </Card>

      <Card raised>
        <p className="text-text-muted text-xs uppercase tracking-wide font-display">🎯 Próximo objetivo</p>
        {weekComplete ? (
          <>
            <p className="text-gold-achievement text-sm font-display uppercase tracking-wide mt-3">
              🏆 Semana completada
            </p>
            <p className="text-text-secondary text-sm mt-1">Esperando reinicio.</p>
          </>
        ) : (
          <>
            <p className="text-text-primary text-sm mt-3">Completar Semana {weekNumber ?? "—"}</p>
            <p className="text-text-secondary text-sm mt-1">
              Restan: {remainingDays} {remainingDays === 1 ? "día" : "días"}
            </p>
          </>
        )}
      </Card>

      <Card>
        <p className="text-text-muted text-xs uppercase tracking-wide font-display">Estadísticas rápidas</p>
        <div className="flex flex-col gap-1.5 mt-3">
          <div className="flex items-center justify-between">
            <p className="text-text-secondary text-sm">Series realizadas</p>
            <p className="text-text-primary text-sm font-medium">{workout.completedSets}</p>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-text-secondary text-sm">Ejercicios completados</p>
            <p className="text-text-primary text-sm font-medium">{daySummary?.exercisesCompleted ?? 0}</p>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-text-secondary text-sm">Peso total movido</p>
            <p className="text-text-primary text-sm font-medium">{daySummary?.totalVolume ?? 0} kg</p>
          </div>
        </div>
      </Card>

      <Card>
        <p className="text-text-muted text-xs uppercase tracking-wide font-display">Semana</p>
        <ProgressBar percent={weekProgress.percent} className="mt-2" />
        <p className="text-text-secondary text-sm mt-2">
          {weekProgress.completedDays} / {weekProgress.totalDays} días
        </p>
      </Card>
    </div>
  );
}
