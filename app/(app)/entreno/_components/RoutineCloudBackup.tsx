"use client";

import { useState } from "react";
import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import { createClient } from "@/lib/supabase/client";
import { importMissingCurrentUserRoutines } from "@/lib/cloud/routines-import";
import type { RoutineImportReport } from "@/lib/cloud/routines-import";

interface RoutineCloudBackupProps {
  customRoutineCount: number;
}

function pluralizeRoutinesGuardadas(count: number): string {
  return count === 1 ? "rutina guardada" : "rutinas guardadas";
}

/**
 * Arma el mensaje final a partir del informe de `importMissingCurrentUserRoutines`
 * (created/identical/conflicts/archived/invalid/failed). Una misma corrida
 * puede combinar creadas con problemas a la vez (por ejemplo, 2 nuevas y 1
 * en conflicto) — por eso las partes se arman por separado y se unen, en
 * vez de asumir que solo pasa una cosa por corrida.
 */
function buildReportMessage(report: RoutineImportReport): string {
  const problems = report.conflicts + report.archived + report.invalid + report.failed;
  const parts: string[] = [];

  if (report.created > 0) {
    parts.push(`${report.created} ${pluralizeRoutinesGuardadas(report.created)} correctamente.`);
  }

  if (problems > 0) {
    const details: string[] = [];
    if (report.conflicts > 0) details.push(`${report.conflicts} con conflicto`);
    if (report.archived > 0) details.push(`${report.archived} archivada${report.archived === 1 ? "" : "s"}`);
    if (report.invalid > 0) details.push(`${report.invalid} inválida${report.invalid === 1 ? "" : "s"}`);
    if (report.failed > 0) details.push(`${report.failed} con error`);
    parts.push(`${details.join(", ")}. No se sobrescribió ningún dato.`);
  }

  if (parts.length === 0) {
    parts.push("Tus rutinas ya estaban guardadas.");
  }

  return parts.join(" ");
}

/**
 * Sprint 6.8 — Tarjeta visible y manual para guardar rutinas propias en
 * Supabase. Usa exclusivamente lo que ya existe y está aprobado:
 * `createClient()` (lib/supabase/client.ts — siempre la anon key + la
 * sesión del usuario, nunca service_role) e `importMissingCurrentUserRoutines()`
 * (lib/cloud/routines-import.ts, que resuelve y verifica el usuario
 * autenticado internamente — este componente nunca le pasa ni le inventa
 * un id de usuario). No lee ni escribe `localStorage` directamente: eso
 * lo hace, puertas adentro, el importador.
 *
 * El guardado NUNCA es automático: no hay ningún `useEffect` acá, ni nada
 * que se dispare al montar la pantalla o al importar este módulo — el
 * único disparador es el click del botón.
 */
export function RoutineCloudBackup({ customRoutineCount }: RoutineCloudBackupProps) {
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (customRoutineCount === 0) return null;

  async function handleSave() {
    setSaving(true);
    setMessage(null);

    const supabase = createClient();
    if (!supabase) {
      setMessage("No se pudo conectar con la nube. Probá de nuevo más tarde.");
      setSaving(false);
      return;
    }

    try {
      const report = await importMissingCurrentUserRoutines(supabase);
      setMessage(buildReportMessage(report));
    } catch {
      // A propósito no se muestra error.message, códigos ni el objeto que
      // haya devuelto Supabase: podrían traer detalles internos. El
      // usuario solo necesita saber que no se guardó y que puede reintentar.
      setMessage("No se pudieron guardar tus rutinas. Probá de nuevo más tarde.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <p className="font-display text-sm uppercase tracking-wide">Respaldo en la nube</p>
      <p className="text-text-secondary text-sm mt-2">
        Guardá tus rutinas para acceder a ellas de forma segura desde otros dispositivos.
      </p>

      <div className="mt-4">
        <Button type="button" variant="secondary" onClick={handleSave} disabled={saving}>
          {saving ? "Guardando..." : "Guardar rutinas"}
        </Button>
      </div>

      <p aria-live="polite" className="text-text-secondary text-sm mt-2 min-h-[1.25rem]">
        {message}
      </p>
    </Card>
  );
}
