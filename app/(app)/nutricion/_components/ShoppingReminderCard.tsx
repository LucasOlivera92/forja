"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import { shouldShowShoppingReminder } from "@/lib/mock/repository";

function subscribe(): () => void {
  // El valor depende solo del día y de localStorage al montar; no hay nada que escuchar.
  return () => {};
}

/**
 * Sprint 8.1 — Aviso semanal: sábado y domingo, si ya hay comidas
 * planificadas, recuerda armar la lista de compras de la semana. Solo
 * aparece dentro de la app (sin notificaciones push). `useSyncExternalStore`
 * con snapshot de servidor `false` evita desfasajes de hidratación (el
 * servidor no conoce ni el día local ni el localStorage) sin usar efectos.
 */
export function ShoppingReminderCard() {
  const show = useSyncExternalStore(subscribe, shouldShowShoppingReminder, () => false);
  if (!show) return null;

  return (
    <Card raised>
      <p className="font-display text-sm uppercase tracking-wide">🛒 Tu lista de compras está lista</p>
      <p className="text-text-secondary text-sm mt-2">
        Armala hoy con lo que planificaste para la semana y andá al súper sin perder tiempo.
      </p>
      <Link href="/nutricion/lista-compras" className="block mt-3">
        <Button type="button" variant="primary">
          Ver lista de compras
        </Button>
      </Link>
    </Card>
  );
}
