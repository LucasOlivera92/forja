"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { createClient } from "@/lib/supabase/client";
import { getNutritionProfile } from "@/lib/mock/repository";
import {
  getCurrentUserId,
  getProgressGoals,
  getProgressPhotoUrl,
  listProgressCheckins,
  saveProgressCheckin,
  saveProgressGoals,
  uploadProgressPhoto,
  type ProgressCheckin,
  type ProgressGoals,
  type ProgressPhotoView,
} from "@/lib/cloud/progress";

interface ProgressGoalsAndPhotosProps {
  period: "semana" | "mes";
  daysElapsed: number;
  workoutSessions: number;
  nutritionAdherence: number;
  averageSleepHours: number | null;
}

type PhotoFiles = Record<ProgressPhotoView, File | null>;

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function weightProgress(start: number | null, current: number | null, target: number | null): number {
  if (start === null || current === null || target === null || start === target) return 0;
  const progress = ((current - start) / (target - start)) * 100;
  return clampPercent(progress);
}

function defaultGoals(athleteId: string): ProgressGoals {
  const profile = getNutritionProfile();
  return {
    athleteId,
    startingWeightKg: profile?.weightKg ?? null,
    targetWeightKg: profile?.targetWeightKg && profile.targetWeightKg > 0 ? profile.targetWeightKg : null,
    workoutsPerWeek: 3,
    sleepHours: 8,
    nutritionAdherence: 90,
  };
}

export function ProgressGoalsAndPhotos({
  period,
  daysElapsed,
  workoutSessions,
  nutritionAdherence,
  averageSleepHours,
}: ProgressGoalsAndPhotosProps) {
  const [goals, setGoals] = useState<ProgressGoals | null>(null);
  const [checkins, setCheckins] = useState<ProgressCheckin[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingGoals, setSavingGoals] = useState(false);
  const [savingCheckin, setSavingCheckin] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [weight, setWeight] = useState("");
  const [waist, setWaist] = useState("");
  const [notes, setNotes] = useState("");
  const [photos, setPhotos] = useState<PhotoFiles>({ front: null, side: null, back: null });

  useEffect(() => {
    let active = true;
    async function load() {
      const supabase = createClient();
      if (!supabase) {
        if (active) setLoading(false);
        return;
      }
      try {
        const athleteId = await getCurrentUserId(supabase);
        const [storedGoals, storedCheckins] = await Promise.all([
          getProgressGoals(supabase, athleteId),
          listProgressCheckins(supabase, athleteId),
        ]);
        if (!active) return;
        setGoals(storedGoals ?? defaultGoals(athleteId));
        setCheckins(storedCheckins);
      } catch {
        if (active) setMessage("Para activar metas y fotos, primero aplicá la migración de Progreso.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, []);

  const latestCheckin = checkins[0] ?? null;
  const monthCompleted = checkins.some((checkin) => checkin.checkinMonth === currentMonth());
  const rings = useMemo(() => {
    if (!goals) return [];
    const workoutTarget = period === "semana"
      ? goals.workoutsPerWeek
      : Math.max(1, Math.round(goals.workoutsPerWeek * (daysElapsed / 7)));
    return [
      { label: "Entreno", percent: clampPercent((workoutSessions / workoutTarget) * 100), detail: `${workoutSessions}/${workoutTarget} sesiones` },
      { label: "Nutrición", percent: clampPercent((nutritionAdherence / goals.nutritionAdherence) * 100), detail: `${nutritionAdherence}% adherencia` },
      { label: "Descanso", percent: averageSleepHours === null ? 0 : clampPercent((averageSleepHours / goals.sleepHours) * 100), detail: averageSleepHours === null ? "Sin registros" : `${averageSleepHours}/${goals.sleepHours} h` },
      { label: "Peso", percent: weightProgress(goals.startingWeightKg, latestCheckin?.weightKg ?? goals.startingWeightKg, goals.targetWeightKg), detail: latestCheckin?.weightKg ? `${latestCheckin.weightKg} kg` : "Sin check-in" },
    ];
  }, [averageSleepHours, daysElapsed, goals, latestCheckin, nutritionAdherence, period, workoutSessions]);

  async function handleSaveGoals() {
    if (!goals) return;
    setSavingGoals(true);
    setMessage(null);
    try {
      const supabase = createClient();
      if (!supabase) throw new Error();
      const saved = await saveProgressGoals(supabase, goals);
      setGoals(saved);
      setMessage("Objetivos guardados.");
    } catch {
      setMessage("No se pudieron guardar los objetivos.");
    } finally {
      setSavingGoals(false);
    }
  }

  function selectPhoto(view: ProgressPhotoView, file: File | null) {
    if (file && (!file.type.startsWith("image/") || file.size > 8 * 1024 * 1024)) {
      setMessage("Cada foto debe ser JPG, PNG o WebP y pesar menos de 8 MB.");
      return;
    }
    setPhotos((current) => ({ ...current, [view]: file }));
  }

  async function handleSaveCheckin() {
    if (!goals || !photos.front || !photos.side || !photos.back) {
      setMessage("Subí las tres fotos: frente, perfil y espalda.");
      return;
    }
    setSavingCheckin(true);
    setMessage(null);
    try {
      const supabase = createClient();
      if (!supabase) throw new Error();
      const month = currentMonth();
      const athleteId = goals.athleteId;
      const [frontPath, sidePath, backPath] = await Promise.all([
        uploadProgressPhoto(supabase, athleteId, month, "front", photos.front),
        uploadProgressPhoto(supabase, athleteId, month, "side", photos.side),
        uploadProgressPhoto(supabase, athleteId, month, "back", photos.back),
      ]);
      const saved = await saveProgressCheckin(supabase, {
        athleteId,
        checkinMonth: month,
        weightKg: weight.trim() ? Number(weight) : null,
        waistCm: waist.trim() ? Number(waist) : null,
        frontPath,
        sidePath,
        backPath,
        notes: notes.trim(),
      });
      setCheckins((current) => [saved, ...current.filter((item) => item.checkinMonth !== month)]);
      setPhotos({ front: null, side: null, back: null });
      setMessage("Check-in mensual guardado de forma privada.");
    } catch {
      setMessage("No se pudo guardar el check-in. Probá nuevamente.");
    } finally {
      setSavingCheckin(false);
    }
  }

  async function openPhoto(path: string) {
    try {
      const supabase = createClient();
      if (!supabase) throw new Error();
      const url = await getProgressPhotoUrl(supabase, path);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      setMessage("No se pudo abrir la foto privada.");
    }
  }

  if (loading) return <Card><p className="text-text-secondary text-sm">Cargando objetivos…</p></Card>;
  if (!goals) return <Card><p className="text-warning text-sm">{message ?? "Progreso todavía no está configurado."}</p></Card>;

  return (
    <>
      <Card raised>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-text-muted text-[11px] uppercase tracking-wide font-display">Objetivos del período</p>
            <h2 className="text-lg font-display font-semibold mt-1">Tu tablero</h2>
          </div>
          <span className="text-xs text-text-muted">0–100%</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5">
          {rings.map((ring) => <ProgressRing key={ring.label} {...ring} />)}
        </div>
      </Card>

      <Card>
        <details>
          <summary className="cursor-pointer font-display text-sm uppercase tracking-wide">⚙️ Configurar objetivos</summary>
          <div className="grid grid-cols-2 gap-3 mt-4">
            <GoalInput label="Peso inicial" value={goals.startingWeightKg} onChange={(value) => setGoals({ ...goals, startingWeightKg: value })} />
            <GoalInput label="Peso objetivo" value={goals.targetWeightKg} onChange={(value) => setGoals({ ...goals, targetWeightKg: value })} />
            <GoalInput label="Entrenos/semana" value={goals.workoutsPerWeek} onChange={(value) => setGoals({ ...goals, workoutsPerWeek: value ?? 3 })} />
            <GoalInput label="Horas de sueño" value={goals.sleepHours} onChange={(value) => setGoals({ ...goals, sleepHours: value ?? 8 })} />
            <GoalInput label="Adherencia nutricional %" value={goals.nutritionAdherence} onChange={(value) => setGoals({ ...goals, nutritionAdherence: value ?? 90 })} />
          </div>
          <Button type="button" variant="secondary" className="mt-4" disabled={savingGoals} onClick={handleSaveGoals}>
            {savingGoals ? "Guardando…" : "Guardar objetivos"}
          </Button>
        </details>
      </Card>

      <Card raised={!monthCompleted}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-text-muted text-[11px] uppercase tracking-wide font-display">Check-in mensual</p>
            <h2 className="text-lg font-display font-semibold mt-1">Fotos comparables</h2>
          </div>
          <span className={monthCompleted ? "text-success text-xs" : "text-warning text-xs"}>
            {monthCompleted ? "✓ Completo" : "Pendiente"}
          </span>
        </div>
        <p className="text-text-secondary text-sm mt-3">
          Repetí siempre la misma ropa, lugar, luz, distancia, postura y horario. Sin filtros y con la cámara a la altura del torso.
        </p>

        {!monthCompleted && (
          <div className="mt-4 flex flex-col gap-3">
            <div className="grid grid-cols-3 gap-2">
              <PhotoInput label="Frente" view="front" file={photos.front} onSelect={selectPhoto} />
              <PhotoInput label="Perfil" view="side" file={photos.side} onSelect={selectPhoto} />
              <PhotoInput label="Espalda" view="back" file={photos.back} onSelect={selectPhoto} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <TextInput label="Peso (kg)" value={weight} onChange={setWeight} />
              <TextInput label="Cintura (cm)" value={waist} onChange={setWaist} />
            </div>
            <label className="text-text-muted text-[11px] uppercase tracking-wide font-display">
              Nota opcional
              <textarea value={notes} onChange={(event) => setNotes(event.target.value)} className="mt-1 w-full min-h-20 rounded-lg bg-bg-surface-raised border border-border-subtle p-3 text-sm text-text-primary normal-case font-body" />
            </label>
            <Button type="button" disabled={savingCheckin} onClick={handleSaveCheckin}>
              {savingCheckin ? "Guardando fotos…" : "Guardar check-in del mes"}
            </Button>
          </div>
        )}

        {checkins.length > 0 && (
          <div className="mt-5 pt-4 border-t border-border-subtle">
            <p className="text-text-muted text-[11px] uppercase tracking-wide font-display">Historial</p>
            {checkins.slice(0, 6).map((checkin) => (
              <div key={checkin.id} className="mt-3 flex items-center justify-between gap-3 text-sm">
                <div>
                  <p className="text-text-primary">{checkin.checkinMonth.slice(0, 7)}</p>
                  <p className="text-text-muted text-xs">{checkin.weightKg ? `${checkin.weightKg} kg` : "Sin peso"}{checkin.waistCm ? ` · ${checkin.waistCm} cm cintura` : ""}</p>
                </div>
                <div className="flex gap-2">
                  <button type="button" className="text-accent-primary text-xs" onClick={() => openPhoto(checkin.frontPath)}>Frente</button>
                  <button type="button" className="text-accent-primary text-xs" onClick={() => openPhoto(checkin.sidePath)}>Perfil</button>
                  <button type="button" className="text-accent-primary text-xs" onClick={() => openPhoto(checkin.backPath)}>Espalda</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
      <p aria-live="polite" className="text-text-secondary text-sm min-h-5">{message}</p>
    </>
  );
}

function ProgressRing({ label, percent, detail }: { label: string; percent: number; detail: string }) {
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - percent / 100);
  return (
    <div className="flex flex-col items-center text-center">
      <div className="relative h-24 w-24">
        <svg viewBox="0 0 96 96" className="h-24 w-24 -rotate-90" aria-hidden="true">
          <circle cx="48" cy="48" r={radius} fill="none" stroke="var(--border-subtle)" strokeWidth="8" />
          <circle cx="48" cy="48" r={radius} fill="none" stroke="var(--accent-primary)" strokeWidth="8" strokeLinecap="round"
            strokeDasharray={circumference} strokeDashoffset={offset} />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center font-display text-lg">{percent}%</span>
      </div>
      <p className="font-display text-xs uppercase mt-2">{label}</p>
      <p className="text-text-muted text-[11px] mt-1">{detail}</p>
    </div>
  );
}

function GoalInput({ label, value, onChange }: { label: string; value: number | null; onChange: (value: number | null) => void }) {
  return <label className="text-text-muted text-[11px] uppercase tracking-wide font-display">{label}<input type="number" inputMode="decimal" value={value ?? ""} onChange={(event) => onChange(event.target.value ? Number(event.target.value) : null)} className="mt-1 h-11 w-full rounded-lg bg-bg-surface-raised border border-border-subtle px-3 text-sm text-text-primary normal-case font-body" /></label>;
}

function TextInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="text-text-muted text-[11px] uppercase tracking-wide font-display">{label}<input type="number" inputMode="decimal" value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 h-11 w-full rounded-lg bg-bg-surface-raised border border-border-subtle px-3 text-sm text-text-primary normal-case font-body" /></label>;
}

function PhotoInput({ label, view, file, onSelect }: { label: string; view: ProgressPhotoView; file: File | null; onSelect: (view: ProgressPhotoView, file: File | null) => void }) {
  return (
    <label className="min-h-24 rounded-xl border border-dashed border-border-subtle flex flex-col items-center justify-center p-2 text-center cursor-pointer">
      <span className="text-xl">📷</span><span className="font-display text-xs uppercase mt-1">{label}</span>
      <span className="text-text-muted text-[10px] mt-1 line-clamp-1">{file?.name ?? "Elegir foto"}</span>
      <input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="sr-only" onChange={(event) => onSelect(view, event.target.files?.[0] ?? null)} />
    </label>
  );
}
