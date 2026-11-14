"use client";

import { useEffect } from "react";
import { startWorkoutAutoSync } from "@/lib/cloud/workout-autosync";

/**
 * Sprint 7.3 — Monta la subida automática de registros de Entreno mientras
 * la app esté abierta. No renderiza nada. Se desactiva al desmontar.
 */
export function WorkoutAutoSync() {
  useEffect(() => startWorkoutAutoSync(), []);
  return null;
}
