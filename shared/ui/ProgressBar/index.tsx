import { clsx } from "@/shared/utils/clsx";

interface ProgressBarProps {
  percent: number;
  className?: string;
}

/** Barra de progreso mínima, reutilizada en Dashboard y en Entreno. */
export function ProgressBar({ percent, className }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, percent));
  return (
    <div className={clsx("h-1.5 rounded-full bg-bg-surface-raised overflow-hidden", className)}>
      <div
        className="h-full rounded-full bg-accent-primary transition-[width] duration-500"
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
