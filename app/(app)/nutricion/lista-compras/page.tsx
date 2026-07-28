"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import { getShoppingList } from "@/lib/mock/repository";
import { ShoppingList } from "@/lib/mock/types";

/**
 * Sprint 5.3 — Fase 4. Pantalla de solo lectura: consume `getShoppingList()`
 * (Shopping Engine en repository.ts) y muestra categoría → ingrediente →
 * cantidad semanal → unidad, sin recalcular nada acá. Los botones de
 * imprimir/PDF/compartir/exportar quedan deshabilitados a propósito — la
 * arquitectura ya está preparada (el objeto `ShoppingList` es plano y
 * serializable), pero implementarlos es explícitamente un sprint futuro.
 */

export default function ListaComprasPage() {
  const [list, setList] = useState<ShoppingList | undefined>(undefined);

  useEffect(() => {
    setList(getShoppingList());
  }, []);

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
              {group.items.map((item) => (
                <li key={item.foodId} className="flex items-center justify-between">
                  <span className="text-text-primary text-sm">{item.name}</span>
                  <span className="text-text-secondary text-sm font-medium">
                    {item.quantity} {item.unit === "unidad" ? "u." : item.unit}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        ))}

      {!isEmpty && (
        <div className="grid grid-cols-2 gap-3">
          <Button type="button" variant="secondary" disabled>
            🖨️ Imprimir
          </Button>
          <Button type="button" variant="secondary" disabled>
            📄 Exportar PDF
          </Button>
          <Button type="button" variant="secondary" disabled>
            🔗 Compartir
          </Button>
          <Button type="button" variant="secondary" disabled>
            ⬇️ Exportar
          </Button>
        </div>
      )}
    </div>
  );
}
