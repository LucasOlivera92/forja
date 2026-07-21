import { ButtonHTMLAttributes } from "react";
import { clsx } from "@/shared/utils/clsx";

type Variant = "primary" | "secondary" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

/**
 * Botón base del design system (Paso 5).
 * - primary: acción principal de la pantalla (regla: una sola por pantalla)
 * - secondary: acciones alternativas
 * - ghost: acciones terciarias, solo texto
 */
export function Button({ variant = "primary", className, children, ...props }: ButtonProps) {
  return (
    <button
      className={clsx(
        "h-[52px] rounded-xl font-display text-sm tracking-wide uppercase transition-transform active:scale-[0.97] disabled:opacity-50 disabled:active:scale-100",
        variant === "primary" &&
          "bg-accent-primary text-white hover:bg-accent-primary-hover w-full",
        variant === "secondary" &&
          "border border-border-subtle text-text-secondary bg-transparent w-full",
        variant === "ghost" && "text-accent-primary bg-transparent px-0 h-auto normal-case font-body",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
