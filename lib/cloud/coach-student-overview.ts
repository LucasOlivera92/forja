import type { SupabaseClient } from "@supabase/supabase-js";
import { listNutritionDailyLogRows } from "@/lib/cloud/nutrition";
import { getProgressGoals, listProgressCheckins, type ProgressCheckin, type ProgressGoals } from "@/lib/cloud/progress";
import { listSleepLogRows } from "@/lib/cloud/sleep";
import { listWorkoutExecutionRows, listWorkoutSessionRows } from "@/lib/cloud/workout-logs";
import type { DaySession } from "@/lib/mock/types";

export interface CoachStudentOverview {
  periodStart: string;
  periodEnd: string;
  workout: {
    sessions: number;
    completedSets: number;
    volumeKg: number;
  };
  nutrition: {
    loggedDays: number;
    mealsCompleted: number;
    averageProtein: number;
    averageCarbs: number;
    averageFat: number;
    averageKcal: number;
  };
  sleep: {
    nights: number;
    averageHours: number | null;
    goodNights: number;
    regularNights: number;
    badNights: number;
  };
  goals: ProgressGoals | null;
  latestCheckin: ProgressCheckin | null;
  unavailableSections: string[];
}

function isoDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function sessionDate(session: DaySession): string | null {
  return session.date ?? session.finishedAt?.slice(0, 10) ?? null;
}

function sessionKey(session: DaySession): string {
  return [session.routineId, session.weekId, session.dayId, session.date, session.finishedAt].join("|");
}

/**
 * Resumen cloud de los últimos 30 días de un alumno. La autorización no
 * vive acá: quien llama verifica primero el vínculo coach→alumno y RLS
 * vuelve a restringir cada lectura en Supabase.
 */
export async function getCoachStudentOverview(
  supabase: SupabaseClient,
  athleteId: string
): Promise<CoachStudentOverview> {
  const now = new Date();
  const start = new Date(now);
  start.setUTCDate(start.getUTCDate() - 29);
  const periodStart = isoDate(start);
  const periodEnd = isoDate(now);
  const unavailableSections: string[] = [];

  const [sessionResult, executionResult, nutritionResult, sleepResult, goalsResult, checkinsResult] =
    await Promise.allSettled([
      listWorkoutSessionRows(supabase, athleteId),
      listWorkoutExecutionRows(supabase, athleteId),
      listNutritionDailyLogRows(supabase, athleteId),
      listSleepLogRows(supabase, athleteId),
      getProgressGoals(supabase, athleteId),
      listProgressCheckins(supabase, athleteId),
    ]);

  if (sessionResult.status === "rejected" && executionResult.status === "rejected") unavailableSections.push("entrenamiento");
  if (nutritionResult.status === "rejected") unavailableSections.push("alimentación");
  if (sleepResult.status === "rejected") unavailableSections.push("descanso");
  if (goalsResult.status === "rejected" || checkinsResult.status === "rejected") unavailableSections.push("progreso");

  const uniqueSessions = new Map<string, DaySession>();
  if (executionResult.status === "fulfilled") {
    for (const row of executionResult.value) {
      for (const session of row.payload.sessions) uniqueSessions.set(sessionKey(session), session);
    }
  }
  if (sessionResult.status === "fulfilled") {
    for (const row of sessionResult.value) uniqueSessions.set(sessionKey(row.payload), row.payload);
  }

  const workoutSessions = [...uniqueSessions.values()].filter((session) => {
    const date = sessionDate(session);
    return session.finishedAt !== null && date !== null && date >= periodStart && date <= periodEnd;
  });
  let completedSets = 0;
  let volumeKg = 0;
  for (const session of workoutSessions) {
    for (const exercise of session.exercises) {
      for (const set of exercise.sets) {
        if (!set.done) continue;
        completedSets += 1;
        if (set.weight !== null && set.reps !== null) volumeKg += set.weight * set.reps;
      }
    }
  }

  const nutritionRows = nutritionResult.status === "fulfilled"
    ? nutritionResult.value.filter((row) => row.log_date >= periodStart && row.log_date <= periodEnd)
    : [];
  const nutritionEntries = nutritionRows.flatMap((row) => row.payload);
  const loggedDays = nutritionRows.length;
  const average = (selector: (entry: (typeof nutritionEntries)[number]) => number) =>
    loggedDays === 0 ? 0 : Math.round(nutritionEntries.reduce((sum, entry) => sum + selector(entry), 0) / loggedDays);

  const sleepRows = sleepResult.status === "fulfilled"
    ? sleepResult.value.filter((row) => row.log_date >= periodStart && row.log_date <= periodEnd)
    : [];
  const averageHours = sleepRows.length === 0
    ? null
    : Math.round((sleepRows.reduce((sum, row) => sum + row.hours, 0) / sleepRows.length) * 10) / 10;

  return {
    periodStart,
    periodEnd,
    workout: {
      sessions: workoutSessions.length,
      completedSets,
      volumeKg: Math.round(volumeKg),
    },
    nutrition: {
      loggedDays,
      mealsCompleted: nutritionEntries.length,
      averageProtein: average((entry) => entry.protein),
      averageCarbs: average((entry) => entry.carbs),
      averageFat: average((entry) => entry.fat),
      averageKcal: average((entry) => entry.kcal),
    },
    sleep: {
      nights: sleepRows.length,
      averageHours,
      goodNights: sleepRows.filter((row) => row.quality === "bien").length,
      regularNights: sleepRows.filter((row) => row.quality === "regular").length,
      badNights: sleepRows.filter((row) => row.quality === "mal").length,
    },
    goals: goalsResult.status === "fulfilled" ? goalsResult.value : null,
    latestCheckin: checkinsResult.status === "fulfilled" ? (checkinsResult.value[0] ?? null) : null,
    unavailableSections,
  };
}
