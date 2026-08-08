import { BottomNav } from "@/shared/ui/BottomNav";
import { LogoutButton } from "@/lib/auth/components/LogoutButton";

/**
 * Layout de las 5 pantallas principales (Paso 8).
 * La verificación de sesión real vive en proxy.ts — acá solo se pinta el
 * shell visual que es constante en los 3 niveles de navegación.
 *
 * Sprint "Cerrar sesión": se agrega una barra chica arriba de `<main>`,
 * igual en las 5 pantallas, con el botón de logout — así queda accesible
 * desde toda la app sin tocar ninguna pantalla individual (Nutrición,
 * Entreno, Descanso, Progreso, Hoy siguen exactamente igual).
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen pb-20">
      <div className="max-w-md mx-auto px-5 pt-4 flex justify-end">
        <LogoutButton />
      </div>
      <main className="max-w-md mx-auto px-5 pt-2">{children}</main>
      <BottomNav />
    </div>
  );
}
