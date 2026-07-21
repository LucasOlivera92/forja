import { AceroState } from "@/lib/mock/types";
import { clsx } from "@/shared/utils/clsx";

interface AceroElementProps {
  state: AceroState;
  percent: number;
}

const STATE_COPY: Record<AceroState, { label: string; hint: string }> = {
  bruto: { label: "En bruto", hint: "Todavía no forjaste nada hoy." },
  calentando: { label: "Calentando", hint: "El metal está tomando temperatura." },
  templado: { label: "Templado", hint: "Hoy quedó forjado. Bien ahí." },
};

const STATE_COLOR: Record<AceroState, string> = {
  bruto: "var(--info-steel)",
  calentando: "var(--accent-primary)",
  templado: "var(--gold-achievement)",
};

// Mismos valores que los tokens de globals.css, en hex plano: los tokens
// son variables CSS y no se les puede componer una transparencia (`${var}66`)
// en un string de JS, así que para glow/borde con alpha usamos el hex directo.
const STATE_HEX: Record<AceroState, string> = {
  bruto: "#4E7A87",
  calentando: "#D4632E",
  templado: "#C9A24E",
};

/**
 * Identidad visual de FORJA (Sprint 1). Único elemento de este tipo en la
 * app — vive solo en el Dashboard. Representa el progreso del día como un
 * trozo de metal que pasa de "en bruto" a "calentando" a "templado" a
 * medida que se completan entreno y nutrición.
 */
export function AceroElement({ state, percent }: AceroElementProps) {
  const color = STATE_COLOR[state];
  const hex = STATE_HEX[state];
  const copy = STATE_COPY[state];

  return (
    <div className="relative flex flex-col items-center py-6">
      <div
        className={clsx(
          "relative w-28 h-28 rounded-[28%] transition-[background,box-shadow] duration-700 ease-out",
          state === "calentando" && "animate-acero-pulse",
          state === "templado" && "animate-acero-glow"
        )}
        style={{
          background: `linear-gradient(155deg, ${color} 0%, var(--bg-surface-raised) 85%)`,
          boxShadow: `0 0 ${10 + percent * 0.4}px ${hex}66`,
        }}
        role="img"
        aria-label={`El Acero: ${copy.label}, ${percent}% del día forjado`}
      >
        <div className="absolute inset-0 rounded-[28%] border" style={{ borderColor: `${hex}55` }} />
      </div>
      <p className="font-display text-xs uppercase tracking-wide mt-4" style={{ color }}>
        {copy.label} · {percent}%
      </p>
      <p className="text-text-muted text-xs mt-1 text-center max-w-[220px]">{copy.hint}</p>
    </div>
  );
}
