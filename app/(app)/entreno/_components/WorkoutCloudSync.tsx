"use client";

import { useState } from "react";
import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import { createClient } from "@/lib/supabase/client";
import { importLocalWorkoutData } from "@/lib/cloud/workout-import";
import {
  isDaySessionPayload,
  isRoutineExecutionPayload,
  listWorkoutExecutionRows,
  listWorkoutSessionRows,
} from "@/lib/cloud/workout-logs";
import {
  adoptDaySessionFromCloud,
  adoptRoutineExecutionFromCloud,
  getAllDaySessionsSnapshot,
  getAllRoutineExecutionsSnapshot,
} from "@/lib/mock/repository";

interface WorkoutCloudSyncProps {
  /** Se llama únicamente si se descargó al menos un registro — así Entreno refresca su vista sin recargar la página. */
  onWorkoutDownloaded: () => void;
}

function pluralize(count: number, singular: string, plural: string): string {
  return count === 1 ? singular : plural;
}

function buildSyncMessage(uploaded: number, downloaded: number, identical: number, conflicts: number, errors: number): string {
  if (uploaded === 0 && downloaded === 0 && identical === 0 && conflicts === 0 && errors === 0) {
    return "Tu entreno ya estaba sincronizado.";
  }

  const parts: string[] = [];
  if (uploaded > 0) parts.push(`${uploaded} ${pluralize(uploaded, "registro subido", "registros subidos")}.`);
  if (downloaded > 0) parts.push(`${downloaded} ${pluralize(downloaded, "registro descargado", "registros descargados")}.`);
  if (identical > 0) {
    parts.push(`${identical} ${pluralize(identical, "registro ya estaba sincronizado", "registros ya estaban sincronizados")}.`);
  }
  if (conflicts > 0) {
    parts.push(`${conflicts} ${pluralize(conflicts, "conflicto", "conflictos")}. No se sobrescribió ningún dato.`);
  }
  if (errors > 0) parts.push(`${errors} ${pluralize(errors, "error", "errores")}.`);
  return parts.join(" ");
}

/**
 * Sprint 7.3 — Sincronización manual en ambas direcciones de los registros
 * de Entreno (pesos/reps por día + semanas archivadas), mismo patrón que
 * `NutritionCloudSync`/`RoutineCloudBackup`. La subida automática de cada
 * serie ya la hace `lib/cloud/workout-autosync.ts`; este botón sirve sobre
 * todo para BAJAR a un dispositivo nuevo (y para subir lo que haya
 * quedado pendiente). Solo corre al presionar el botón, nunca sobrescribe
 * un conflicto, nunca borra y nunca recibe un userId desde la UI.
 *
 * 1. Sube lo local que falte (`importLocalWorkoutData`) — su informe ya
 *    clasifica identical/conflict contra lo que existía en la nube.
 * 2. Con el `userId` verificado de ese informe, lee la nube y baja
 *    únicamente lo que NO existe localmente (sesiones por día,
 *    ejecuciones por id).
 *
 * Los datos descargados se ven mejor si las rutinas ya están sincronizadas
 * en este dispositivo (la sesión referencia una rutina por id).
 */
export function WorkoutCloudSync({ onWorkoutDownloaded }: WorkoutCloudSyncProps) {
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSync() {
    setSyncing(true);
    setMessage(null);

    const supabase = createClient();
    if (!supabase) {
      setMessage("No se pudo conectar con la nube. Probá de nuevo más tarde.");
      setSyncing(false);
      return;
    }

    let uploaded = 0;
    let downloaded = 0;
    let errors = 0;

    try {
      const report = await importLocalWorkoutData(supabase);
      const userId = report.userId;

      uploaded = report.sessions.created + report.executions.created;
      const identical = report.sessions.identical + report.executions.identical;
      const conflicts = report.sessions.conflicts + report.executions.conflicts;
      errors = report.sessions.invalid + report.sessions.failed + report.executions.invalid + report.executions.failed;

      // Descarga: sesiones por día que no existen localmente.
      try {
        const localSessionKeys = new Set<string>();
        for (const value of getAllDaySessionsSnapshot()) {
          if (isDaySessionPayload(value)) localSessionKeys.add(`${value.routineId}/${value.weekId}/${value.dayId}`);
        }
        const cloudSessions = await listWorkoutSessionRows(supabase, userId);
        for (const row of cloudSessions) {
          if (localSessionKeys.has(`${row.routine_id}/${row.week_id}/${row.day_id}`)) continue; // ya clasificado por la subida
          try {
            if (adoptDaySessionFromCloud(row.payload)) downloaded += 1;
          } catch {
            errors += 1;
          }
        }
      } catch {
        errors += 1;
      }

      // Descarga: ejecuciones archivadas que no existen localmente.
      try {
        const localExecutionIds = new Set<string>();
        for (const value of getAllRoutineExecutionsSnapshot()) {
          if (isRoutineExecutionPayload(value)) localExecutionIds.add(value.id);
        }
        const cloudExecutions = await listWorkoutExecutionRows(supabase, userId);
        for (const row of cloudExecutions) {
          if (localExecutionIds.has(row.execution_id)) continue;
          try {
            if (adoptRoutineExecutionFromCloud(row.payload)) downloaded += 1;
          } catch {
            errors += 1;
          }
        }
      } catch {
        errors += 1;
      }

      setMessage(buildSyncMessage(uploaded, downloaded, identical, conflicts, errors));
      if (downloaded > 0) onWorkoutDownloaded();
    } catch {
      // Sin error.message, códigos ni objetos de Supabase: podrían traer detalles internos.
      setMessage("No se pudo sincronizar tu entreno. Probá de nuevo más tarde.");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <Card>
      <p className="font-display text-sm uppercase tracking-wide">Respaldo de entreno</p>
      <p className="text-text-secondary text-sm mt-2">
        Tus pesos y series se guardan solos en la nube. Usá este botón para descargarlos en un dispositivo nuevo
        (sincronizá primero tus rutinas).
      </p>

      <div className="mt-4">
        <Button type="button" variant="secondary" onClick={handleSync} disabled={syncing}>
          {syncing ? "Sincronizando..." : "Sincronizar entreno"}
        </Button>
      </div>

      <p aria-live="polite" className="text-text-secondary text-sm mt-2 min-h-[1.25rem]">
        {message}
      </p>
    </Card>
  );
}
