"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import {
  deleteCustomRoutine,
  duplicateCustomRoutine,
  getRoutines,
  isBaseRoutine,
  renameCustomRoutine,
} from "@/lib/mock/repository";
import { Routine } from "@/lib/mock/types";

/**
 * Sprint 3.5 — Entreno unificado: la raíz de /entreno ahora es el catálogo
 * de rutinas (antes vivía por separado en /rutinas, que quedó eliminado
 * para no duplicar pantallas). El flujo completo queda:
 * Entreno (catálogo) → Rutina → Semana → Día → Registro.
 *
 * "El Toro" sigue usando exactamente las mismas rutas de siempre
 * (/entreno/semanas → /entreno/[weekId] → /entreno/[weekId]/[dayId], las
 * mismas que usa Hoy) — sin ningún cambio. Las rutinas base sin contenido
 * (Running Base, Básquet Inicial, Hipertrofia Full Body) siguen mostrando
 * "Próximamente", deshabilitadas.
 *
 * Sprint 4.0 — botón "➕ Crear rutina" (lleva a /entreno/nueva) y
 * getRoutines() ahora también trae las rutinas creadas por el usuario
 * desde localStorage — por eso la carga se movió a un efecto (antes era
 * síncrona porque el catálogo era 100% estático) para no romper la
 * hidratación entre servidor y cliente.
 *
 * Sprint 4.1 — las rutinas propias (creadas por el usuario) ya no
 * dependen de tener contenido cargado para ser clickeables: llevan al
 * constructor (/entreno/mi-rutina/[routineId]), donde se arman semanas,
 * días y ejercicios desde la interfaz. `isBaseRoutine()` distingue una
 * rutina propia de una de data.ts sin tocar nada de "El Toro".
 *
 * Sprint 4.6.2 — el botón visible "🗑 Eliminar" de Sprint 4.6.1 se
 * reemplaza por un menú contextual "⋮" (solo en rutinas propias) con
 * Renombrar / Duplicar rutina / Eliminar rutina. El `<Link>` sigue sin
 * envolver toda la Card (mismo motivo que 4.6.1: ahora hay más de una
 * zona interactiva), y el menú se cierra solo al elegir una opción o al
 * clickear afuera (listener de `mousedown` en `document`, sin librerías).
 * Renombrar/duplicar/eliminar reutilizan enteramente el repositorio
 * (`renameCustomRoutine`/`duplicateCustomRoutine`/`deleteCustomRoutine`)
 * — esta pantalla no valida ni transforma nada, solo llama y refresca.
 * Las rutinas base no se tocan: siguen con exactamente el mismo markup
 * de siempre (Card completa dentro del Link, o sin Link si no son
 * clickeables), sin menú.
 */
export default function EntrenoPage() {
  const [routines, setRoutines] = useState<Routine[] | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [renamingRoutineId, setRenamingRoutineId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const menuRef = useRef<HTMLDivElement | null>(null);

  function refresh() {
    setRoutines(getRoutines());
  }

  useEffect(() => {
    setRoutines(getRoutines());
  }, []);

  useEffect(() => {
    if (!openMenuId) return;
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [openMenuId]);

  function startRename(routine: Routine) {
    setOpenMenuId(null);
    setRenamingRoutineId(routine.id);
    setRenameValue(routine.name);
  }

  function cancelRename() {
    setRenamingRoutineId(null);
  }

  function saveRename(routineId: string) {
    const result = renameCustomRoutine(routineId, renameValue);
    if (!result) return;
    setRenamingRoutineId(null);
    refresh();
  }

  function handleDuplicate(routine: Routine) {
    setOpenMenuId(null);
    duplicateCustomRoutine(routine.id);
    refresh();
  }

  function handleDelete(routine: Routine) {
    setOpenMenuId(null);
    const confirmed = window.confirm(
      "¿Eliminar esta rutina?\n\nSe eliminarán también sus semanas, ejercicios y progreso.\n\nEsta acción no se puede deshacer."
    );
    if (!confirmed) return;
    deleteCustomRoutine(routine.id);
    refresh();
  }

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
          const isCustom = !isBaseRoutine(routine.id);
          // Una rutina base solo es navegable si ya tiene contenido real
          // (hoy, únicamente "El Toro"); una rutina propia siempre lo es,
          // porque lleva al constructor para empezar a armarla.
          const clickable = isCustom || routine.weeks.length > 0;
          const href = isCustom ? `/entreno/mi-rutina/${routine.id}` : "/entreno/semanas";

          const cardBody = (
            <>
              <div className="flex items-center justify-between">
                <p className="font-display text-lg uppercase tracking-wide">{routine.name}</p>
                {!clickable && (
                  <span className="text-text-muted text-xs font-display uppercase tracking-wide">Próximamente</span>
                )}
              </div>
              <p className="text-text-secondary text-sm mt-1">{routine.description}</p>
              <p className="text-text-muted text-xs mt-3">
                {routine.sport} · {routine.goal}
              </p>
              {routine.weeksCount > 0 && (
                <p className="text-text-muted text-xs mt-1">
                  {routine.weeksCount} semanas · {routine.daysPerWeek} días por semana
                </p>
              )}
            </>
          );

          if (isCustom) {
            const isRenaming = renamingRoutineId === routine.id;
            const isMenuOpen = openMenuId === routine.id;

            return (
              <Card key={routine.id} raised>
                {isRenaming ? (
                  <div className="flex flex-col gap-3">
                    <div>
                      <label className="text-text-muted text-[11px] uppercase tracking-wide font-display">
                        Nombre
                      </label>
                      <input
                        type="text"
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        className="h-11 w-full mt-1 rounded-lg bg-bg-surface-raised border border-border-subtle px-3 text-sm placeholder:text-text-muted"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Button type="button" variant="secondary" onClick={cancelRename}>
                        Cancelar
                      </Button>
                      <Button
                        type="button"
                        variant="primary"
                        disabled={renameValue.trim().length === 0}
                        onClick={() => saveRename(routine.id)}
                      >
                        Guardar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-3">
                    <Link href={href} className="flex-1 active:scale-[0.98] transition-transform">
                      {cardBody}
                    </Link>
                    <div
                      className="relative shrink-0"
                      ref={(el) => {
                        if (isMenuOpen) menuRef.current = el;
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => setOpenMenuId(isMenuOpen ? null : routine.id)}
                        aria-label="Más opciones"
                        className="h-8 w-8 flex items-center justify-center rounded-full text-text-secondary text-lg leading-none hover:bg-bg-surface-raised"
                      >
                        ⋮
                      </button>
                      {isMenuOpen && (
                        <div className="absolute right-0 top-full mt-1 w-48 rounded-xl border border-border-subtle bg-bg-surface-raised shadow-lg shadow-black/20 py-1 z-10">
                          <button
                            type="button"
                            onClick={() => startRename(routine)}
                            className="w-full text-left px-3 py-2 text-sm text-text-primary hover:bg-bg-surface"
                          >
                            ✏️ Renombrar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDuplicate(routine)}
                            className="w-full text-left px-3 py-2 text-sm text-text-primary hover:bg-bg-surface"
                          >
                            📄 Duplicar rutina
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(routine)}
                            className="w-full text-left px-3 py-2 text-sm text-danger hover:bg-bg-surface"
                          >
                            🗑 Eliminar rutina
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </Card>
            );
          }

          const card = (
            <Card raised={clickable} className={clickable ? "active:scale-[0.98] transition-transform" : "opacity-60"}>
              {cardBody}
            </Card>
          );

          return clickable ? (
            <Link key={routine.id} href={href}>
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
