"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "@/shared/utils/clsx";

const TABS = [
  { href: "/hoy", label: "Hoy", icon: HomeIcon },
  { href: "/entreno", label: "Entreno", icon: DumbbellIcon },
  { href: "/nutricion", label: "Nutrición", icon: MealIcon },
  { href: "/descanso", label: "Descanso", icon: MoonIcon },
  { href: "/progreso", label: "Progreso", icon: ChartIcon },
] as const;

/**
 * Barra de navegación inferior (Paso 4 / Paso 5).
 * 5 destinos fijos, siempre visible en (app)/layout.tsx.
 * Nunca se oculta ni colapsa — es la constante de los 3 niveles de navegación.
 */
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-bg-surface border-t border-border-subtle
                 pb-[env(safe-area-inset-bottom)] z-50"
      aria-label="Navegación principal"
    >
      <div className="flex h-16 max-w-md mx-auto">
        {TABS.map((tab) => {
          const active = pathname.startsWith(tab.href);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="flex-1 flex flex-col items-center justify-center gap-1"
            >
              <Icon
                className={clsx("w-[22px] h-[22px]", active ? "text-accent-primary" : "text-text-muted")}
              />
              <span
                className={clsx(
                  "text-[11px] font-body font-medium",
                  active ? "text-accent-primary" : "text-text-muted"
                )}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

/* Set de íconos de línea, coherente con el paso 5 (Lucide-style, sin dependencia extra en Sprint 0) */
function HomeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path d="M3 11.5 12 4l9 7.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function DumbbellIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path d="M6.5 7v10M17.5 7v10M3 10v4M21 10v4M6.5 12h11" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function MealIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path d="M6 3v7a2 2 0 0 0 2 2v9M6 3v9M9 3v9M15 3c-1.5 0-2 1.5-2 3v4a2 2 0 0 0 2 2v9-9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function MoonIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function ChartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path d="M4 20V10M11 20V4M18 20v-7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
