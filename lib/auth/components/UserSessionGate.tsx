"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { resolveUserSession, setCachedUserId } from "@/lib/auth/client-session";
import { migrateLegacyLocalDataToUser } from "@/lib/mock/repository";

/**
 * Sprint 6.1 — aislamiento de datos por usuario.
 *
 * Envuelve el contenido de cada pantalla dentro de `app/(app)/layout.tsx`
 * y NO lo monta hasta resolver el `user.id` autenticado. Sin esto, una
 * pantalla de Entreno/Nutrición podría disparar su `useEffect` de carga
 * (que llama a `lib/mock/repository.ts`) antes de que exista el
 * namespace por usuario — exactamente la carrera de timing que este
 * sprint pide evitar.
 *
 * En la práctica esto resuelve en milisegundos: `proxy.ts` ya validó la
 * sesión del lado del servidor antes de llegar a cualquier ruta de
 * `(app)/*`, así que casi siempre hay usuario. Mientras se resuelve, no
 * se muestra nada nuevo (ni una pantalla de carga distinta): la barra de
 * arriba y la navegación inferior (fuera de este gate, en el layout) ya
 * están visibles, y el `<main>` queda vacío por un instante — no es un
 * cambio de diseño, es el mismo layout sin contenido todavía.
 */
export function UserSessionGate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;

    resolveUserSession().then((userId) => {
      if (!active) return;
      if (userId) {
        // Una sola vez por navegador (ver migrateLegacyLocalDataToUser):
        // si hay datos de Entreno/Nutrición guardados antes de este
        // sprint, sin namespace, se copian a la clave namespaceada de
        // este usuario. No borra ni pisa nada existente.
        migrateLegacyLocalDataToUser(userId);
      }
      setReady(true);
    });

    const supabase = createClient();
    const listener = supabase?.auth.onAuthStateChange((_event, session) => {
      setCachedUserId(session?.user?.id ?? null);
    });

    return () => {
      active = false;
      listener?.data.subscription.unsubscribe();
    };
  }, []);

  if (!ready) return null;

  return <>{children}</>;
}
