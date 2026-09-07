"use client";

import { useState } from "react";
import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import { createClient } from "@/lib/supabase/client";
import { importMissingCurrentUserRoutines } from "@/lib/cloud/routines-import";
import type { RoutineImportReport } from "@/lib/cloud/routines-import";
import { listRoutinesForAthlete } from "@/lib/cloud/routines";
import { mergeCloudRoutinesIntoLocal } from "@/lib/mock/repository";

interface RoutineCloudBackupProps {
  /** Se llama únicamente si la sincronización descargó al menos una rutina nueva — así Entreno refresca su lista sin sondear nada por su cuenta. */
  onRoutinesDownloaded: () => void;
}

function pluralize(count: number, singular: string, plural: string): string {
  return count === 1 ? singular : plural;
}

/**
 * Arma el mensaje final combinando lo que subió `importMissingCurrentUserRoutines`
 * (created/identical/conflicts/archived/invalid/failed) con lo que bajó
 * `mergeCloudRoutinesIntoLocal` (added/skipped). Una misma corrida puede
 * subir, bajar, y tener problemas a la vez — por eso cada parte se arma
 * por separado y se concatenan, en vez de asumir que solo pasa una cosa.
 */
function buildSyncMessage(uploadReport: RoutineImportReport, downloaded: { added: number; skipped: number }): string {
  const problems = uploadReport.conflicts + uploadReport.archived + uploadReport.invalid + uploadReport.failed;
  const parts: string[] = [];

  if (uploadReport.created > 0) {
    parts.push(`${uploadReport.created} ${pluralize(uploadReport.created, "rutina subida", "rutinas subidas")}.`);
  }

  if (downloaded.added > 0) {
    parts.push(`${downloaded.added} ${pluralize(downloaded.added, "rutina descargada", "rutinas descargadas")}.`);
  }

  if (problems > 0) {
    const details: string[] = [];
    if (uploadReport.conflicts > 0) details.push(`${uploadReport.conflicts} con conflicto`);
    if (uploadReport.archived > 0) {
      details.push(`${uploadReport.archived} archivada${uploadReport.archived === 1 ? "" : "s"}`);
    }
    if (uploadReport.invalid > 0) {
      details.push(`${uploadReport.invalid} inválida${uploadReport.invalid === 1 ? "" : "s"}`);
    }
    if (uploadReport.failed > 0) details.push(`${uploadReport.failed} con error`);
    parts.push(`${details.join(", ")}. No se sobrescribió ningún dato.`);
  }

  if (parts.length === 0) {
    parts.push("Tus rutinas ya estaban sincronizadas.");
  }

  return parts.join(" ");
}

/**
 * Sprint 6.9 — Sincronización manual en AMBAS direcciones. Reutiliza
 * exclusivamente piezas ya existentes y aprobadas, sin ningún mecanismo
 * nuevo de identidad ni de almacenamiento:
 *
 * 1. Sube (`importMissingCurrentUserRoutines`, lib/cloud/routines-import.ts)
 *    — resuelve y verifica el usuario autenticado internamente; este
 *    componente nunca le pasa ni le inventa un id de usuario.
 * 2. Lee las rutinas activas ya en Supabase para ese mismo usuario
 *    (`listRoutinesForAthlete(supabase, report.userId)`).
 * 3. Baja lo que falte localmente (`mergeCloudRoutinesIntoLocal`,
 *    lib/mock/repository.ts) — nunca sobrescribe una rutina local ni
 *    escribe si no hay nada nuevo, y respeta el namespace por usuario de
 *    siempre (mismo `readJSON`/`writeJSON` de toda la vida).
 *
 * Todo dentro del mismo click: no hay ningún `useEffect` acá, ni nada que
 * se dispare al montar la pantalla o al importar este módulo — el único
 * disparador es el botón.
 */
export function RoutineCloudBackup({ onRoutinesDownloaded }: RoutineCloudBackupProps) {
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

    try {
      const uploadReport = await importMissingCurrentUserRoutines(supabase);
      const remoteRows = await listRoutinesForAthlete(supabase, uploadReport.userId);
      const downloaded = mergeCloudRoutinesIntoLocal(remoteRows.map((row) => row.payload));

      setMessage(buildSyncMessage(uploadReport, downloaded));

      if (downloaded.added > 0) {
        onRoutinesDownloaded();
      }
    } catch {
      // A propósito no se muestra error.message, códigos ni el objeto que
      // haya devuelto Supabase: podrían traer detalles internos. El
      // usuario solo necesita saber que no se sincronizó y que puede reintentar.
      setMessage("No se pudo sincronizar tus rutinas. Probá de nuevo más tarde.");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <Card>
      <p className="font-display text-sm uppercase tracking-wide">Respaldo en la nube</p>
      <p className="text-text-secondary text-sm mt-2">
        Guardá tus rutinas para acceder a ellas de forma segura desde otros dispositivos.
      </p>

      <div className="mt-4">
        <Button type="button" variant="secondary" onClick={handleSync} disabled={syncing}>
          {syncing ? "Sincronizando..." : "Sincronizar rutinas"}
        </Button>
      </div>

      <p aria-live="polite" className="text-text-secondary text-sm mt-2 min-h-[1.25rem]">
        {message}
      </p>
    </Card>
  );
}
