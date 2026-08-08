"use client";

import { useState } from "react";
import { Button } from "@/shared/ui/Button";
import { createClient } from "@/lib/supabase/client";

/**
 * Botón reutilizable de "Cerrar sesión" (Sprint: Cerrar sesión).
 *
 * Usa el mismo cliente de navegador de Supabase que login/registro
 * (`lib/supabase/client`), sin lógica nueva de autenticación. Después de
 * `signOut()`, fuerza una navegación DURA a `/login` (no `router.push`):
 * así se descarta cualquier estado de React/cache del router que hubiera
 * quedado en memoria de la sesión anterior, y `/login` arranca de cero —
 * necesario para poder iniciar sesión con otra cuenta de inmediato desde
 * la misma computadora.
 */
export function LogoutButton() {
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    const supabase = createClient();
    if (supabase) {
      await supabase.auth.signOut();
    }
    window.location.assign("/login");
  }

  return (
    <Button type="button" variant="ghost" disabled={loading} onClick={handleLogout}>
      {loading ? "Cerrando sesión..." : "Cerrar sesión"}
    </Button>
  );
}
