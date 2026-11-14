"use client";

import { useState } from "react";
import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import { createClient } from "@/lib/supabase/client";
import { importLocalSleepData } from "@/lib/cloud/sleep-import";
import { listSleepLogRows } from "@/lib/cloud/sleep";
import { adoptSleepLogFromCloud, getAllSleepLogs } from "@/lib/mock/repository";

interface SleepCloudSyncProps {
  /** Se llama únicamente si se descargó al menos una noche — así Descanso refresca su vista sin recargar la página. */
  onSleepDownloaded: () => void;
}

function pluralize(count: number, singular: string, plural: string): string {
  return count === 1 ? singular : plural;
}

function buildSyncMessage(uploaded: number, downloaded: number, identical: number, conflicts: number, errors: number): string {
  if (uploaded === 0 && downloaded === 0 && identical === 0 && conflicts === 0 && errors === 0) {
    return "Tu descanso ya estaba sincronizado.";
  }
  const parts: string[] = [];
  if (uploaded > 0) parts.push(`${uploaded} ${pluralize(uploaded, "noche subida", "noches subidas")}.`);
  if (downloaded > 0) parts.push(`${downloaded} ${pluralize(downloaded, "noche descargada", "noches descargadas")}.`);
  if (identical > 0) {
    parts.push(`${identical} ${pluralize(identical, "noche ya estaba sincronizada", "noches ya estaban sincronizadas")}.`);
  }
  if (conflicts > 0) {
    parts.push(`${conflicts} ${pluralize(conflicts, "conflicto", "conflictos")}. No se sobrescribió ningún dato.`);
  }
  if (errors > 0) parts.push(`${errors} ${pluralize(errors, "error", "errores")}.`);
  return parts.join(" ");
}

/**
 * Sprint 8.0 — Sincronización manual en ambas direcciones de Descanso, mismo
 * patrón que `NutritionCloudSync`/`WorkoutCloudSync`. Las noches nuevas ya
 * se suben solas al guardarlas; este botón sirve sobre todo para BAJAR a un
 * dispositivo nuevo. Solo corre al presionarlo, nunca sobrescribe un
 * conflicto, nunca borra, nunca recibe un userId desde la UI.
 */
export function SleepCloudSync({ onSleepDownloaded }: SleepCloudSyncProps) {
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

    let downloaded = 0;
    let errors = 0;

    try {
      const report = await importLocalSleepData(supabase);

      try {
        const localDates = new Set(getAllSleepLogs().map((log) => log.date));
        const cloudRows = await listSleepLogRows(supabase, report.userId);
        for (const row of cloudRows) {
          if (localDates.has(row.log_date)) continue; // ya clasificado por la subida
          try {
            if (adoptSleepLogFromCloud(row.payload)) downloaded += 1;
          } catch {
            errors += 1;
          }
        }
      } catch {
        errors += 1;
      }

      setMessage(
        buildSyncMessage(report.created, downloaded, report.identical, report.conflicts, report.invalid + report.failed + errors)
      );
      if (downloaded > 0) onSleepDownloaded();
    } catch {
      // Sin error.message, códigos ni objetos de Supabase.
      setMessage("No se pudo sincronizar tu descanso. Probá de nuevo más tarde.");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <Card>
      <p className="font-display text-sm uppercase tracking-wide">Respaldo de descanso</p>
      <p className="text-text-secondary text-sm mt-2">
        Tus noches se guardan solas en la nube. Usá este botón para descargarlas en un dispositivo nuevo.
      </p>
      <div className="mt-4">
        <Button type="button" variant="secondary" onClick={handleSync} disabled={syncing}>
          {syncing ? "Sincronizando..." : "Sincronizar descanso"}
        </Button>
      </div>
      <p aria-live="polite" className="text-text-secondary text-sm mt-2 min-h-[1.25rem]">
        {message}
      </p>
    </Card>
  );
}
