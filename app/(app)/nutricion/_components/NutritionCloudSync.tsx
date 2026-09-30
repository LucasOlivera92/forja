"use client";

import { useState } from "react";
import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import { createClient } from "@/lib/supabase/client";
import { importLocalNutritionData } from "@/lib/cloud/nutrition-import";
import { getNutritionProfileRow, getWeeklyMealPlanRow, listNutritionDailyLogRows } from "@/lib/cloud/nutrition";
import {
  adoptNutritionDailyLogFromCloud,
  adoptNutritionProfileFromCloud,
  adoptWeeklyMealPlanFromCloud,
  getAllNutritionLogDates,
} from "@/lib/mock/repository";
import type { MealSlot, NutritionProfile, Weekday, WeeklyMealPlan } from "@/lib/mock/types";

interface NutritionCloudSyncProps {
  /** Se llama únicamente si se descargó un perfil nuevo — así /nutricion refresca su vista sin recargar la página. */
  onProfileDownloaded: (profile: NutritionProfile) => void;
}

const WEEKDAYS: readonly Weekday[] = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"];
const MEAL_SLOTS: readonly MealSlot[] = ["desayuno", "almuerzo", "merienda", "cena"];

/** `true` si los 28 casilleros (7 días × 4 tipos) están en `null` — misma definición de "sin planificación" que usa el importador. */
function isWeeklyMealPlanEmpty(plan: WeeklyMealPlan): boolean {
  return WEEKDAYS.every((day) => MEAL_SLOTS.every((slot) => plan[day][slot] === null));
}

function pluralize(count: number, singular: string, plural: string): string {
  return count === 1 ? singular : plural;
}

function buildSyncMessage(uploaded: number, downloaded: number, identical: number, conflicts: number, errors: number): string {
  if (uploaded === 0 && downloaded === 0 && identical === 0 && conflicts === 0 && errors === 0) {
    return "Tu nutrición ya estaba sincronizada.";
  }

  const parts: string[] = [];
  if (uploaded > 0) parts.push(`${uploaded} ${pluralize(uploaded, "elemento subido", "elementos subidos")}.`);
  if (downloaded > 0) parts.push(`${downloaded} ${pluralize(downloaded, "elemento descargado", "elementos descargados")}.`);
  if (identical > 0) {
    parts.push(`${identical} ${pluralize(identical, "elemento ya estaba sincronizado", "elementos ya estaban sincronizados")}.`);
  }
  if (conflicts > 0) {
    parts.push(`${conflicts} ${pluralize(conflicts, "conflicto", "conflictos")}. No se sobrescribió ningún dato.`);
  }
  if (errors > 0) parts.push(`${errors} ${pluralize(errors, "error", "errores")}.`);

  return parts.join(" ");
}

/**
 * Sprint 7.1 — Sincronización manual en ambas direcciones de Nutrición,
 * mismo patrón que `RoutineCloudBackup` (Sprint 6.9): todo dentro de un
 * mismo click, sin `useEffect`, nunca sobrescribe un conflicto.
 *
 * 1. Sube lo local que falte (`importLocalNutritionData`,
 *    `lib/cloud/nutrition-import.ts`) — resuelve y verifica el usuario
 *    autenticado internamente; este componente nunca le pasa ni le
 *    inventa un `athleteId`/`userId`. Ese mismo informe ya compara
 *    semánticamente lo local contra lo que YA existía en la nube
 *    (identical/conflict) para perfil, planificación y cada día local.
 * 2. Con el `userId` verificado que devuelve ese informe, baja lo que
 *    falte localmente:
 *    - Perfil: solo si este dispositivo no tenía ninguno
 *      (`profile.status === "skipped"` en el informe de subida).
 *    - Planificación: solo si la de este dispositivo estaba
 *      completamente vacía (`weeklyPlan.status === "skipped"`).
 *    - Registros diarios: solo las fechas que existen en la nube y NO
 *      existen localmente (las que sí existían localmente ya las
 *      clasificó el paso 1).
 *
 * Cada paso de la descarga está aislado en su propio try/catch: un error
 * puntual (por ejemplo, no se pudo leer la planificación) no aborta el
 * resto de la sincronización ni la subida ya confirmada.
 */
export function NutritionCloudSync({ onProfileDownloaded }: NutritionCloudSyncProps) {
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
    let identical = 0;
    let conflicts = 0;
    let errors = 0;

    try {
      const uploadReport = await importLocalNutritionData(supabase);
      const userId = uploadReport.userId;

      // Tally de lo que ya resolvió la subida (perfil + planificación + cada día local).
      if (uploadReport.profile.status === "created") uploaded += 1;
      else if (uploadReport.profile.status === "identical") identical += 1;
      else if (uploadReport.profile.status === "conflict") conflicts += 1;
      else if (uploadReport.profile.status === "invalid" || uploadReport.profile.status === "failed") errors += 1;

      if (uploadReport.weeklyPlan.status === "created") uploaded += 1;
      else if (uploadReport.weeklyPlan.status === "identical") identical += 1;
      else if (uploadReport.weeklyPlan.status === "conflict") conflicts += 1;
      else if (uploadReport.weeklyPlan.status === "invalid" || uploadReport.weeklyPlan.status === "failed") errors += 1;

      uploaded += uploadReport.dailyLogs.created;
      identical += uploadReport.dailyLogs.identical;
      conflicts += uploadReport.dailyLogs.conflicts;
      errors += uploadReport.dailyLogs.invalid + uploadReport.dailyLogs.failed;

      // Descarga: perfil — solo si este dispositivo no tenía ninguno.
      if (uploadReport.profile.status === "skipped") {
        try {
          const cloudProfile = await getNutritionProfileRow(supabase, userId);
          if (cloudProfile) {
            const adopted = adoptNutritionProfileFromCloud(cloudProfile.payload);
            if (adopted) {
              downloaded += 1;
              onProfileDownloaded(adopted);
            }
            // `adopted === null` => otra pestaña ya creó un perfil local justo ahora; no se pisa ni se cuenta.
          }
        } catch {
          errors += 1;
        }
      }

      // Descarga: planificación semanal — solo si la local estaba completamente vacía.
      if (uploadReport.weeklyPlan.status === "skipped") {
        try {
          const cloudPlan = await getWeeklyMealPlanRow(supabase, userId);
          if (cloudPlan) {
            if (isWeeklyMealPlanEmpty(cloudPlan.payload)) {
              // Ambas vacías: no hay nada que bajar ni que perder.
              identical += 1;
            } else {
              const adopted = adoptWeeklyMealPlanFromCloud(cloudPlan.payload);
              if (adopted) downloaded += 1;
            }
          }
        } catch {
          errors += 1;
        }
      }

      // Descarga: registros diarios — solo fechas que existen en la nube y no localmente.
      try {
        const localDates = new Set(getAllNutritionLogDates());
        const cloudRows = await listNutritionDailyLogRows(supabase, userId);
        for (const row of cloudRows) {
          if (localDates.has(row.log_date)) continue; // ya lo clasificó la subida (identical/conflict/created).
          try {
            const adopted = adoptNutritionDailyLogFromCloud(row.log_date, row.payload);
            if (adopted) downloaded += 1;
          } catch {
            errors += 1;
          }
        }
      } catch {
        errors += 1;
      }

      setMessage(buildSyncMessage(uploaded, downloaded, identical, conflicts, errors));
    } catch {
      // A propósito no se muestra error.message, códigos ni el objeto que
      // haya devuelto Supabase: podrían traer detalles internos. El
      // usuario solo necesita saber que no se sincronizó y que puede reintentar.
      setMessage("No se pudo sincronizar tu nutrición. Probá de nuevo más tarde.");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <Card>
      <p className="font-display text-sm uppercase tracking-wide">Respaldo nutricional</p>
      <p className="text-text-secondary text-sm mt-2">
        Guardá tu perfil, planificación y registros para acceder a ellos de forma segura desde otros dispositivos.
      </p>

      <div className="mt-4">
        <Button type="button" variant="secondary" onClick={handleSync} disabled={syncing}>
          {syncing ? "Sincronizando..." : "Sincronizar nutrición"}
        </Button>
      </div>

      <p aria-live="polite" className="text-text-secondary text-sm mt-2 min-h-[1.25rem]">
        {message}
      </p>
    </Card>
  );
}
