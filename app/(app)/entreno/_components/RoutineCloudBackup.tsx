"use client";

import { useState } from "react";
import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import { createClient } from "@/lib/supabase/client";
import { importMissingCurrentUserRoutines, planCurrentUserRoutineImport } from "@/lib/cloud/routines-import";
import type { RoutineImportReport } from "@/lib/cloud/routines-import";
import { listRoutinesForAthlete, updateRoutinePayload, RoutineConflictError } from "@/lib/cloud/routines";
import type { RoutineRow } from "@/lib/cloud/routines";
import { mergeCloudRoutinesIntoLocal, replaceCustomRoutineWithCloudVersion } from "@/lib/mock/repository";
import type { Routine } from "@/lib/mock/types";

interface RoutineCloudBackupProps {
  /** Se llama únicamente si la sincronización descargó al menos una rutina nueva, o si se resolvió un conflicto — así Entreno refresca su lista sin sondear nada por su cuenta. */
  onRoutinesDownloaded: () => void;
}

/** Un conflicto detectado por `planCurrentUserRoutineImport`, con ambas versiones completas a mano para poder mostrarlas y resolverlas. */
interface RoutineConflict {
  localId: string;
  localRoutine: Routine;
  cloudRow: RoutineRow;
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
 *
 * Sprint 6.11 — Resolución manual y segura de conflictos. Cuando la
 * sincronización detecta conflictos, se arma la lista completa (ambas
 * versiones) con `planCurrentUserRoutineImport` (mismo módulo, función de
 * solo lectura ya existente) y se muestra una tarjeta por rutina en
 * conflicto con dos elecciones explícitas del usuario — nunca se
 * sobrescribe nada automáticamente, ni acá ni en el resto de la
 * sincronización.
 */
export function RoutineCloudBackup({ onRoutinesDownloaded }: RoutineCloudBackupProps) {
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [conflicts, setConflicts] = useState<RoutineConflict[]>([]);
  const [resolvingLocalId, setResolvingLocalId] = useState<string | null>(null);
  const [resolutionMessage, setResolutionMessage] = useState<string | null>(null);

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

      if (uploadReport.conflicts > 0) {
        try {
          const plan = await planCurrentUserRoutineImport(supabase);
          const nextConflicts: RoutineConflict[] = [];
          for (const item of plan.items) {
            if (item.status === "conflict" && item.routine && item.cloudRow) {
              nextConflicts.push({
                localId: item.routine.id,
                localRoutine: item.routine,
                cloudRow: item.cloudRow,
              });
            }
          }
          setConflicts(nextConflicts);
        } catch {
          // No se pudo armar el detalle de los conflictos (el resumen de
          // arriba ya informó la cantidad) — no se expone el error interno,
          // y la lista de conflictos anterior se conserva tal cual.
        }
      } else {
        setConflicts([]);
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

  function removeConflict(localId: string) {
    setConflicts((prev) => prev.filter((c) => c.localId !== localId));
  }

  /** "Usar este dispositivo": pisa la fila de Supabase con la versión local, con control optimista de version. */
  async function handleUseLocalVersion(conflict: RoutineConflict) {
    const confirmed = window.confirm(
      `Vas a reemplazar, en la nube, la rutina "${conflict.localRoutine.name}" por la versión guardada en este dispositivo.\n\n` +
        "Se va a perder el contenido que estaba guardado en la nube para esta rutina. Esta acción no se puede deshacer."
    );
    if (!confirmed) return;

    setResolvingLocalId(conflict.localId);
    setResolutionMessage(null);

    const supabase = createClient();
    if (!supabase) {
      setResolutionMessage("No se pudo conectar con la nube. Probá de nuevo más tarde.");
      setResolvingLocalId(null);
      return;
    }

    try {
      await updateRoutinePayload(supabase, conflict.cloudRow.id, conflict.cloudRow.version, conflict.localRoutine);
      removeConflict(conflict.localId);
      setResolutionMessage(`Se guardó en la nube la versión de este dispositivo de "${conflict.localRoutine.name}".`);
      onRoutinesDownloaded();
    } catch (error) {
      if (error instanceof RoutineConflictError) {
        setResolutionMessage(
          `La versión en la nube de "${conflict.localRoutine.name}" cambió de nuevo mientras tanto. ` +
            "No se sobrescribió ningún dato — volvé a sincronizar para verla actualizada."
        );
      } else {
        setResolutionMessage(
          `No se pudo guardar la versión de este dispositivo de "${conflict.localRoutine.name}". Probá de nuevo más tarde.`
        );
      }
    } finally {
      setResolvingLocalId(null);
    }
  }

  /** "Usar versión de la nube": pisa la rutina local (localStorage) con la versión de Supabase. No hace ninguna llamada a Supabase. */
  function handleUseCloudVersion(conflict: RoutineConflict) {
    const cloudName = conflict.cloudRow.payload.name;
    const confirmed = window.confirm(
      `Vas a reemplazar, en este dispositivo, la rutina "${cloudName}" por la versión guardada en la nube.\n\n` +
        "Se va a perder el contenido que tenías en este dispositivo para esta rutina. Esta acción no se puede deshacer."
    );
    if (!confirmed) return;

    setResolvingLocalId(conflict.localId);
    setResolutionMessage(null);

    const replaced = replaceCustomRoutineWithCloudVersion(conflict.cloudRow.payload);

    if (replaced) {
      removeConflict(conflict.localId);
      setResolutionMessage(`Se guardó en este dispositivo la versión de la nube de "${cloudName}".`);
      onRoutinesDownloaded();
    } else {
      setResolutionMessage(
        `No se pudo aplicar la versión de la nube de "${cloudName}": ya no está entre tus rutinas de este dispositivo.`
      );
      removeConflict(conflict.localId);
    }

    setResolvingLocalId(null);
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

      {conflicts.length > 0 && (
        <div className="mt-4 flex flex-col gap-3 pt-3 border-t border-border-subtle">
          <p className="text-text-muted text-[11px] uppercase tracking-wide font-display">
            Rutinas con conflicto — elegí qué versión conservar
          </p>

          {conflicts.map((conflict) => {
            const isResolving = resolvingLocalId === conflict.localId;
            return (
              <div key={conflict.localId} className="rounded-lg bg-bg-surface-raised border border-border-subtle p-3">
                <p className="font-display text-sm">{conflict.localRoutine.name}</p>
                <p className="text-text-muted text-xs mt-1">
                  Existe una versión distinta en este dispositivo y en la nube.
                </p>
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={isResolving || syncing}
                    onClick={() => handleUseLocalVersion(conflict)}
                  >
                    Usar este dispositivo
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={isResolving || syncing}
                    onClick={() => handleUseCloudVersion(conflict)}
                  >
                    Usar versión de la nube
                  </Button>
                </div>
              </div>
            );
          })}

          <p aria-live="polite" className="text-text-secondary text-sm min-h-[1.25rem]">
            {resolutionMessage}
          </p>
        </div>
      )}
    </Card>
  );
}
