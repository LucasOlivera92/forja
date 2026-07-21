import { HTMLAttributes } from "react";
import { clsx } from "@/shared/utils/clsx";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  raised?: boolean;
}

/** Tarjeta base (Paso 5): radio 16px, sombra solo si está "elevada". */
export function Card({ raised = false, className, children, ...props }: CardProps) {
  return (
    <div
      className={clsx(
        "rounded-2xl p-5 border border-border-subtle",
        raised ? "bg-bg-surface-raised shadow-lg shadow-black/20" : "bg-bg-surface",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
