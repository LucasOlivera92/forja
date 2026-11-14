"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import { clsx } from "@/shared/utils/clsx";
import { getAllSleepLogs, getSleepFoodInsights, getSleepLog, saveSleepLog } from "@/lib/mock/repository";
import type { SleepInsight, SleepLog, SleepQuality } from "@/lib/mock/types";
import { uploadSleepLogBestEffort } from "@/lib/cloud/sleep-import";
import { SleepCloudSync } from "./_components/SleepCloudSync";

/**
 * Sprint 8.0 — Descanso: un registro simple por noche (horas + calidad en 3
 * niveles) y, con el tiempo, conclusiones que cruzan el sueño con lo que se
 * marcó comer el día anterior (`getSleepFoodInsights`). Registrar tiene que
 * tardar segundos: dos toques (calidad) + horas + guardar.
 */

const QUALITY_OPTIONS: { value: SleepQuality; label: string; emoji: string }[] = [
  { value: "mal", label: "Mal", emoji: "😩" },
  { value: "regular", label: "Regular", emoji: "😐" },
  { value: "bien", label: "Bien", emoji: "😴" },
];

const QUALITY_LABEL: Record<SleepQuality, string> = { mal: "Mal", regular: "Regular", bien: "Bien" };

const HISTORY_LIMIT = 7;

interface DescansoData {
  today: SleepLog | null;
  history: SleepLog[];
  insights: SleepInsight[];
}

function loadData(): DescansoData {
  return { today: getSleepLog(), history: getAllSleepLogs().slice(0, HISTORY_LIMIT), insights: getSleepFoodInsights() };
}

/**
 * Los datos viven en localStorage (fuente externa). Se leen con
 * `useSyncExternalStore` usando un snapshot serializado (string): es estable
 * por valor, y en el servidor devuelve `null` para no desfasar la hidratación.
 */
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): string {
  return JSON.stringify(loadData());
}

function getServerSnapshot(): null {
  return null;
}

function notifyChange() {
  listeners.forEach((listener) => listener());
}

export default function DescansoPage() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const data = useMemo(() => (snapshot === null ? undefined : (JSON.parse(snapshot) as DescansoData)), [snapshot]);
  const [hours, setHours] = useState("");
  const [quality, setQuality] = useState<SleepQuality | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formLoaded, setFormLoaded] = useState(false);

  // Carga inicial del formulario con el registro de hoy (una sola vez, durante el render, sin efectos).
  if (data && !formLoaded) {
    setFormLoaded(true);
    if (data.today) {
      setHours(String(data.today.hours));
      setQuality(data.today.quality);
    }
  }

  function refresh() {
    notifyChange();
  }

  function handleSave() {
    const parsedHours = Number(hours.replace(",", "."));
    if (!quality || !Number.isFinite(parsedHours) || parsedHours <= 0 || parsedHours > 24) {
      setError("Cargá las horas dormidas (entre 0 y 24) y cómo dormiste.");
      return;
    }
    const saved = saveSleepLog({ hours: parsedHours, quality });
    if (!saved) {
      setError("No se pudo guardar. Probá de nuevo.");
      return;
    }
    setError(null);
    setHours(String(saved.hours));
    refresh();
    // Subida automática best-effort: el guardado local ya se hizo; si la nube falla, queda local.
    void uploadSleepLogBestEffort(saved);
  }

  if (!data) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-display font-semibold">Descanso</h1>
        <Card>
          <p className="text-text-secondary text-sm">Cargando…</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-display font-semibold">Descanso</h1>
        <p className="text-text-secondary text-sm mt-1">¿Cómo dormiste anoche?</p>
      </div>

      <Card className="flex flex-col gap-4">
        <div>
          <label className="text-text-muted text-[11px] uppercase tracking-wide font-display">Horas dormidas</label>
          <input
            type="number"
            inputMode="decimal"
            min={0}
            max={24}
            step="0.25"
            placeholder="Ej: 7.5"
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            className="h-11 w-full mt-1 rounded-lg bg-bg-surface-raised border border-border-subtle px-3 text-sm placeholder:text-text-muted"
          />
        </div>

        <div>
          <label className="text-text-muted text-[11px] uppercase tracking-wide font-display">Calidad del sueño</label>
          <div className="grid grid-cols-3 gap-2 mt-2">
            {QUALITY_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setQuality(option.value)}
                className={clsx(
                  "h-14 rounded-xl text-xs font-display uppercase tracking-wide border transition-colors flex flex-col items-center justify-center gap-0.5",
                  option.value === quality
                    ? "bg-accent-primary border-accent-primary text-white"
                    : "bg-transparent border-border-subtle text-text-secondary"
                )}
              >
                <span className="text-lg leading-none">{option.emoji}</span>
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <Button type="button" variant="primary" onClick={handleSave}>
          {data.today ? "Actualizar" : "Guardar"}
        </Button>
        {error && (
          <p aria-live="polite" className="text-danger text-xs text-center">
            {error}
          </p>
        )}
        {!error && data.today && (
          <p aria-live="polite" className="text-success text-xs text-center">
            Guardado: {data.today.hours} h · {QUALITY_LABEL[data.today.quality]}.
          </p>
        )}
      </Card>

      <Card className="flex flex-col gap-3">
        <p className="text-text-muted text-[11px] uppercase tracking-wide font-display">Posibles patrones observados</p>
        {data.insights.length === 0 ? (
          <p className="text-text-secondary text-sm">
            Todavía no hay datos suficientes. Hacen falta varias noches registradas junto con tus comidas tildadas para
            poder mostrar posibles patrones.
          </p>
        ) : (
          <>
            {data.insights.map((insight) => (
              <div key={insight.id}>
                <p className="text-text-primary text-sm font-medium">{insight.title}</p>
                <p className="text-text-secondary text-xs mt-0.5">{insight.detail}</p>
              </div>
            ))}
            <p className="text-text-muted text-[11px]">
              Son posibles patrones en tus datos, no un diagnóstico ni una prueba de que una cosa cause la otra.
            </p>
          </>
        )}
      </Card>

      {data.history.length > 0 && (
        <Card className="flex flex-col gap-2">
          <p className="text-text-muted text-[11px] uppercase tracking-wide font-display">Últimas noches</p>
          {data.history.map((log) => (
            <div key={log.date} className="flex items-center justify-between text-sm">
              <span className="text-text-secondary">{log.date}</span>
              <span className="text-text-primary">
                {log.hours} h · {QUALITY_LABEL[log.quality]}
              </span>
            </div>
          ))}
        </Card>
      )}

      <SleepCloudSync onSleepDownloaded={refresh} />
    </div>
  );
}
