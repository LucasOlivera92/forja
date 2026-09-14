import Link from "next/link";
import { BottomNav } from "@/shared/ui/BottomNav";
import { LogoutButton } from "@/lib/auth/components/LogoutButton";
import { UserSessionGate } from "@/lib/auth/components/UserSessionGate";
import { getCurrentProfile, isCoach } from "@/lib/auth";

/**
 * Layout de las 5 pantallas principales (Paso 8).
 * La verificación de sesión real vive en proxy.ts — acá solo se pinta el
 * shell visual que es constante en los 3 niveles de navegación.
 *
 * Sprint "Cerrar sesión": se agrega una barra chica arriba de `<main>`,
 * igual en las 5 pantallas, con el botón de logout — así queda accesible
 * desde toda la app sin tocar ninguna pantalla individual (Nutrición,
 * Entreno, Descanso, Progreso, Hoy siguen exactamente igual).
 *
 * Sprint 6.1: `{children}` (las 5 pantallas) queda envuelto en
 * `UserSessionGate` para que ninguna pantalla llegue a leer/escribir
 * `localStorage` (vía lib/mock/repository.ts) antes de conocer el
 * `user.id` — necesario para namespacear esos datos por usuario. El
 * botón de logout y la navegación inferior quedan afuera del gate,
 * siguen visibles de inmediato.
 *
 * Sprint 6.12: en la misma barra de arriba se agrega un enlace
 * "Mis alumnos", visible ÚNICAMENTE para perfiles con `role = "coach"`
 * (`getCurrentProfile()` + `isCoach()`, ya resueltos en el servidor antes
 * de renderizar — layout pasa a ser async). Ocultarlo para el resto es
 * solo UX: la verificación real de acceso vive en
 * `app/(app)/alumnos/page.tsx` y `.../alumnos/[studentId]/page.tsx`, que
 * vuelven a chequear el rol (y, para un alumno puntual, el vínculo activo)
 * por su cuenta — este layout nunca es la única barrera de seguridad.
 * BottomNav y las 5 secciones existentes no se tocan.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();
  const showAlumnosLink = isCoach(profile);

  return (
    <div className="min-h-screen pb-20">
      <div className="max-w-md mx-auto px-5 pt-4 flex items-center justify-end gap-4">
        {showAlumnosLink && (
          <Link href="/alumnos" className="text-text-secondary text-xs uppercase tracking-wide font-display">
            Mis alumnos
          </Link>
        )}
        <LogoutButton />
      </div>
      <main className="max-w-md mx-auto px-5 pt-2">
        <UserSessionGate>{children}</UserSessionGate>
      </main>
      <BottomNav />
    </div>
  );
}
