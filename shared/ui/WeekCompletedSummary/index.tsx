import { Card } from "@/shared/ui/Card";

/**
 * Sprint 6.2 — parte visual común de "Semana completada", extraída de
 * app/(app)/entreno/[weekId]/completada/page.tsx ("El Toro") sin cambiar
 * su apariencia, para que también la use la pantalla equivalente de
 * Mi Rutina. No sabe nada de `routineId` ni de repository — solo recibe
 * los datos ya resueltos por cada pantalla.
 */
interface WeekCompletedSummaryProps {
  weekLabel: string;
  completedDays: number;
  totalDays: number;
}

export function WeekCompletedSummary({ weekLabel, completedDays, totalDays }: WeekCompletedSummaryProps) {
  return (
    <Card raised className="flex flex-col items-center gap-2 py-10 text-center">
      <p className="text-3xl">✅</p>
      <h1 className="text-2xl font-display font-semibold mt-2">Semana completada</h1>
      <p className="text-text-secondary text-sm">{weekLabel}</p>

      <p className="text-text-muted text-[11px] uppercase tracking-wide font-display mt-6">
        Entrenamientos completados
      </p>
      <p className="text-3xl font-display font-semibold text-accent-primary">
        {completedDays} / {totalDays}
      </p>
    </Card>
  );
}
