import { AceroState, WeekProgress } from "@/lib/mock/types";
import { clsx } from "@/shared/utils/clsx";

interface AceroElementProps {
  state: AceroState;
  weekProgress: WeekProgress;
}

const STATE_COPY: Record<AceroState, { label: string; hint: string }> = {
  frio: { label: "Frío", hint: "El acero aún está frío." },
  iniciando: { label: "Iniciando", hint: "Comenzaste a forjar." },
  calentando: { label: "Calentando", hint: "El metal está calentándose." },
  "en-forja": { label: "En forja", hint: "La forja está en pleno proceso." },
  "casi-listo": { label: "Casi listo", hint: "El acero casi alcanza su punto máximo." },
  forjado: { label: "Forjado", hint: "La pieza ha sido forjada." },
};

/**
 * Sprint 3.8.1 — color de ACENTO por estado (label, borde, glow). Mismos
 * tokens de siempre. Se separa del color de RELLENO de abajo para que el
 * texto siga siendo legible incluso en "frío", donde el bloque usa un
 * negro casi puro.
 */
const STATE_ACCENT: Record<AceroState, string> = {
  frio: "var(--text-muted)",
  iniciando: "var(--info-steel)",
  calentando: "var(--accent-primary)",
  "en-forja": "var(--danger)",
  "casi-listo": "var(--warning)",
  forjado: "var(--text-primary)",
};

// Hex plano de cada color de acento — mismos valores que los tokens de
// globals.css, para poder componerles alpha (`${hex}66`) en boxShadow/borde.
const ACCENT_HEX: Record<AceroState, string> = {
  frio: "#7C7362",
  iniciando: "#4E7A87",
  calentando: "#D4632E",
  "en-forja": "#B4483C",
  "casi-listo": "#C99A3E",
  forjado: "#F5F0E6",
};

/**
 * Sprint 3.8.1 — FIX del bug reportado: el bloque no se veía cambiar de
 * estado porque su relleno era un gradiente que a los pocos px ya se
 * degradaba hacia var(--bg-surface-raised) — el MISMO color de fondo de
 * la Card que lo contiene (ver hoy/page.tsx: <Card raised>). Resultado:
 * la mayor parte del bloque terminaba mimetizada con su propio fondo y
 * los 6 estados se veían casi idénticos.
 *
 * Ahora el relleno es 100% el color propio del estado (con un leve
 * sombreado neutro encima para dar volumen, no para diluir el color), así
 * que cada estado ocupa el bloque completo y es inconfundible.
 */
const FILL_HEX: Record<AceroState, string> = {
  frio: "#17140F", // --bg-base: gris casi negro, bien distinto del fondo de la Card
  iniciando: "#4E7A87", // --info-steel
  calentando: "#D4632E", // --accent-primary
  "en-forja": "#B4483C", // --danger
  "casi-listo": "#C99A3E", // --warning
  forjado: "#F5F0E6", // --text-primary
};

/**
 * Identidad visual de FORJA. Único elemento de este tipo en la app — vive
 * solo en el Dashboard. Representa el progreso SEMANAL de entrenamiento
 * (días de rutina completados / días totales de la semana activa) como un
 * trozo de metal que va de frío a incandescente en 6 etapas — toda la
 * información sale de `weekProgress`, calculado en getDashboardSummary()
 * (misma fuente de siempre, sin duplicar estado, sin tocar esa lógica).
 */
export function AceroElement({ state, weekProgress }: AceroElementProps) {
  const accent = STATE_ACCENT[state];
  const accentHex = ACCENT_HEX[state];
  const fillHex = FILL_HEX[state];
  const copy = STATE_COPY[state];
  const { completedDays, totalDays, percent } = weekProgress;

  // 0 en "frío" (sin brillo todavía) hasta ~55px en "forjado".
  const glowBlur = Math.round(percent * 0.55);

  return (
    <div className="relative flex flex-col items-center py-6">
      <div
        className={clsx(
          "relative w-28 h-28 rounded-[28%] border-2 transition-[background,box-shadow,border-color] duration-700 ease-out",
          (state === "iniciando" || state === "calentando" || state === "en-forja") && "animate-acero-pulse",
          (state === "casi-listo" || state === "forjado") && "animate-acero-glow"
        )}
        style={{
          // Capa de brillo/sombra neutra (blanco/negro) ENCIMA del color
          // sólido del estado — nunca se mezcla con el fondo de la Card.
          background: `linear-gradient(155deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0) 40%, rgba(0,0,0,0.32) 100%), ${fillHex}`,
          borderColor: `${accentHex}80`,
          boxShadow: glowBlur === 0 ? "none" : `0 0 ${glowBlur}px ${accentHex}70`,
        }}
        role="img"
        aria-label={`El Acero: ${copy.label}, ${completedDays} de ${totalDays} días de la semana forjados`}
      >
        {state === "forjado" && (
          <>
            <span
              className="animate-acero-sparkle absolute top-3 left-4 w-1.5 h-1.5 rounded-full"
              style={{ background: "var(--gold-achievement)", animationDelay: "0s" }}
            />
            <span
              className="animate-acero-sparkle absolute top-8 right-5 w-1 h-1 rounded-full"
              style={{ background: "var(--gold-achievement)", animationDelay: "0.5s" }}
            />
            <span
              className="animate-acero-sparkle absolute bottom-5 left-8 w-1 h-1 rounded-full"
              style={{ background: "var(--gold-achievement)", animationDelay: "1s" }}
            />
          </>
        )}
      </div>
      <p className="font-display text-xs uppercase tracking-wide mt-4" style={{ color: accent }}>
        {copy.label} · {completedDays}/{totalDays} días
      </p>
      <p className="text-text-muted text-xs mt-1 text-center max-w-[220px]">{copy.hint}</p>
    </div>
  );
}
