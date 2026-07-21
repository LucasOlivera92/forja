import { BottomNav } from "@/shared/ui/BottomNav";

/**
 * Layout de las 5 pantallas principales (Paso 8).
 * La verificación de sesión real vive en middleware.ts — acá solo
 * se pinta el shell visual que es constante en los 3 niveles de navegación.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen pb-20">
      <main className="max-w-md mx-auto px-5 pt-8">{children}</main>
      <BottomNav />
    </div>
  );
}
