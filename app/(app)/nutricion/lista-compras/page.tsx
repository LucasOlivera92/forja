"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import { getShoppingCheckedFoodIds, getShoppingList, toggleShoppingChecked } from "@/lib/mock/repository";
import { ShoppingList } from "@/lib/mock/types";

/**
 * Sprint 5.3 — Fase 4. Pantalla de solo lectura: consume `getShoppingList()`
 * (Shopping Engine en repository.ts) y muestra categoría → ingrediente →
 * cantidad semanal → unidad, sin recalcular nada acá. Los botones de
 * imprimir/PDF/compartir/exportar quedan deshabilitados a propósito — la
 * arquitectura ya está preparada (el objeto `ShoppingList` es plano y
 * serializable). Sprint 8.1: se agregan tildes de "comprado" (se reinician
 * cada semana) y compartir por WhatsApp / copiar la lista como texto.
 */

/** Texto plano de la lista (categoría → ítem: cantidad), listo para pegar en WhatsApp o en notas. */
function buildShoppingText(list: ShoppingList): string {
  const lines = ["🛒 Lista de compras FORJA", ""];
  for (const group of list.groups) {
    lines.push(group.categoryLabel.toUpperCase());
    for (const item of group.items) {
      lines.push(`• ${item.name}: ${item.quantity} ${item.unit === "unidad" ? "u." : item.unit}`);
    }
    lines.push("");
  }
  return lines.join("\n").trim();
}

export default function ListaComprasPage() {
  const [list, setList] = useState<ShoppingList | undefined>(undefined);
  const [checked, setChecked] = useState<string[]>([]);
  const [shareMessage, setShareMessage] = useState<string | null>(null);

  useEffect(() => {
    setList(getShoppingList());
    setChecked(getShoppingCheckedFoodIds());
  }, []);

  function handleWhatsApp() {
    if (!list) return;
    const url = `https://wa.me/?text=${encodeURIComponent(buildShoppingText(list))}`;
    window.open(url, "_blank", "noopener,noreferrer");
    setShareMessage(null);
  }

  async function handleCopy() {
    if (!list) return;
    try {
      await navigator.clipboard.writeText(buildShoppingText(list));
      setShareMessage("Lista copiada.");
    } catch {
      setShareMessage("No se pudo copiar. Probá con el botón de WhatsApp.");
    }
  }

  if (!list) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-display font-semibold">Lista de compras</h1>
        <Card>
          <p className="text-text-secondary text-sm">Cargando…</p>
        </Card>
      </div>
    );
  }

  const isEmpty = list.groups.length === 0;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Link href="/nutricion/planificacion" className="text-text-muted text-xs uppercase tracking-wide font-display">
          ← Planificación semanal
        </Link>
        <h1 className="text-2xl font-display font-semibold mt-1">Lista de compras</h1>
        <p className="text-text-secondary text-sm mt-1">
          Generada automáticamente a partir de tu planificación ({list.planned.planned}/{list.planned.total} comidas
          elegidas).
        </p>
      </div>

      {isEmpty && (
        <Card>
          <p className="text-text-secondary text-sm">
            Todavía no elegiste ninguna comida en tu planificación semanal — acá va a aparecer todo lo que necesites
            comprar.
          </p>
          <Link href="/nutricion/planificacion" className="block mt-3">
            <Button type="button" variant="secondary">
              Ir a planificación semanal
            </Button>
          </Link>
        </Card>
      )}

      {!isEmpty &&
        list.groups.map((group) => (
          <Card key={group.category}>
            <p className="text-text-muted text-xs uppercase tracking-wide font-display">{group.categoryLabel}</p>
            <ul className="flex flex-col gap-2 mt-3">
              {group.items.map((item) => {
                const bought = checked.includes(item.foodId);
                return (
                  <li key={item.foodId}>
                    <label className="flex items-center justify-between gap-3 cursor-pointer">
                      <span className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={bought}
                          onChange={() => setChecked(toggleShoppingChecked(item.foodId))}
                          className="h-5 w-5 accent-accent-primary"
                        />
                        <span className={bought ? "text-text-muted text-sm line-through" : "text-text-primary text-sm"}>
                          {item.name}
                        </span>
                      </span>
                      <span
                        className={
                          bought ? "text-text-muted text-sm line-through" : "text-text-secondary text-sm font-medium"
                        }
                      >
                        {item.quantity} {item.unit === "unidad" ? "u." : item.unit}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </Card>
        ))}

      {!isEmpty && (
        <div className="flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-3">
            <Button type="button" variant="secondary" onClick={handleWhatsApp}>
              💬 WhatsApp
            </Button>
            <Button type="button" variant="secondary" onClick={handleCopy}>
              📋 Copiar lista
            </Button>
          </div>
          <p aria-live="polite" className="text-text-secondary text-xs text-center min-h-[1rem]">
            {shareMessage}
          </p>
        </div>
      )}
    </div>
  );
}
