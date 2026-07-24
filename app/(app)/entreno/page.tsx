"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import { getRoutines } from "@/lib/mock/repository";
import { Routine } from "@/lib/mock/types";

/**
 * Sprint 3.5 — Entreno unificado: la raíz de /entreno ahora es el catálogo
 * de rutinas (antes vivía por separado en /rutinas, que quedó eliminado
 * para no duplicar pantallas). El flujo completo queda:
 * Entreno (catálogo) → Rutina (semanas, /entreno/semanas) → Semana (días,
 * /entreno/[weekId]) → Día (registro, /entreno/[weekId]/[dayId]) — estas
 * últimas dos pantallas son exactamente las mismas que ya usaba Hoy para
 * ir directo al registro, sin ningún cambio.
 *
 * Solo "El Toro" tiene semanas cargadas hoy; las otras rutinas del
 * catálogo (base o creadas por el usuario) son metadata sin contenido
 * todavía y se muestran deshabilitadas.
 *
 * Sprint 4.0 — botón "➕ Crear rutina" (lleva a /entreno/nueva) y
 * getRoutines() ahora también trae las rutinas creadas por el usuario
 * desde localStorage — por eso la carga se movió a un efecto (antes era
 * síncrona porque el catálogo era 100% estático) para no romper la
 * hidratación entre servidor y cliente.
 */
export default function EntrenoPage() {
  const [routines, setRoutines] = useState<Routine[] | null>(null);

  useEffect(() => {
    setRoutines(getRoutines());
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-display font-semibold">Entreno</h1>
        <p className="text-text-secondary text-sm mt-1">Elegí tu rutina</p>
      </div>

      <Link href="/entreno/nueva">
        <Button type="button" variant="secondary">
          ➕ Crear rutina
        </Button>
      </Link>

      <div className="flex flex-col gap-3">
        {(routines ?? []).map((routine) => {
          const hasContent = routine.weeks.length > 0;
          const card = (
            <Card
              raised={hasContent}
              className={hasContent ? "active:scale-[0.98] transition-transform" : "opacity-60"}
            >
              <div className="flex items-center justify-between">
                <p className="font-display text-lg uppercase tracking-wide">{routine.name}</p>
                {!hasContent && (
                  <span className="text-text-muted text-xs font-display uppercase tracking-wide">Próximamente</span>
                )}
              </div>
              <p className="text-text-secondary text-sm mt-1">{routine.description}</p>
              <p className="text-text-muted text-xs mt-3">
                {routine.sport} · {routine.goal}
              </p>
              {hasContent && (
                <p className="text-text-muted text-xs mt-1">
                  {routine.weeksCount} semanas · {routine.daysPerWeek} días por semana
                </p>
              )}
            </Card>
          );

          return hasContent ? (
            <Link key={routine.id} href="/entreno/semanas">
              {card}
            </Link>
          ) : (
            <div key={routine.id}>{card}</div>
          );
        })}
      </div>
    </div>
  );
}
