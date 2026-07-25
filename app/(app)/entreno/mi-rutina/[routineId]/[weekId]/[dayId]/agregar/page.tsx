"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useEffect, useMemo, useState, type MouseEvent } from "react";
import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import { clsx } from "@/shared/utils/clsx";
import {
  addExerciseToCustomRoutineDay,
  getExerciseCatalog,
  getFavoriteExerciseIdSet,
  toggleFavoriteExercise,
} from "@/lib/mock/repository";
import { ExerciseCatalogItem } from "@/lib/mock/types";

/** Extrae los valores únicos de un campo del catálogo, ordenados alfabéticamente. */
function uniqueValues(catalog: ExerciseCatalogItem[], pick: (ex: ExerciseCatalogItem) => string): string[] {
  return Array.from(new Set(catalog.map(pick))).sort((a, b) => a.localeCompare(b, "es"));
}

interface FilterChipsProps {
  label: string;
  options: string[];
  value: string | null;
  onChange: (value: string | null) => void;
}

/** Fila de chips de un solo filtro — click de nuevo sobre el activo lo apaga. */
function FilterChips({ label, options, value, onChange }: FilterChipsProps) {
  if (options.length === 0) return null;
  return (
    <div>
      <p className="text-text-muted text-[11px] uppercase tracking-wide font-display mb-2">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option === value ? null : option)}
            className={clsx(
              "h-9 px-4 rounded-full text-xs font-display uppercase tracking-wide border transition-colors",
              option === value
                ? "bg-accent-primary border-accent-primary text-white"
                : "bg-transparent border-border-subtle text-text-secondary"
            )}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Sprint 4.1 — Agregar ejercicio a un día de una rutina propia, en dos
 * pasos dentro de la misma pantalla (sin ruta extra por ejercicio, para
 * mantenerlo simple y rápido):
 * 1) Buscador + filtros → elegir ejercicio de la biblioteca existente.
 * 2) Series / Repeticiones / Descanso → Guardar.
 *
 * Sprint 4.5 — Biblioteca profesional: los filtros ahora leen los campos
 * enriquecidos de EXERCISE_CATALOG (categoría, músculo principal,
 * equipamiento, tipo) y se combinan entre sí (AND) además del buscador
 * por nombre. Sigue siendo el mismo EXERCISE_CATALOG de siempre — no se
 * crea ninguna biblioteca nueva — y la selección de un ejercicio guarda
 * exactamente igual que antes (`addExerciseToCustomRoutineDay`, sin tocar).
 *
 * Sprint 4.8 — ⭐ Favoritos: cada card suma un botón para marcar/desmarcar
 * (guarda solo el id en localStorage, aparte de EXERCISE_CATALOG — no se
 * duplica ni se crea otra biblioteca) y un filtro "⭐ Solo favoritos" que
 * se combina con el resto (AND, igual que los demás). También se corrige
 * la validación de series/repeticiones: ya no se puede guardar con
 * series en 0 o repeticiones vacías/"0" (antes se dejaban pasar en
 * silencio, quedaban guardadas como "0").
 */
export default function AgregarEjercicioPage({
  params,
}: {
  params: Promise<{ routineId: string; weekId: string; dayId: string }>;
}) {
  const { routineId, weekId, dayId } = use(params);
  const router = useRouter();
  const dayHref = `/entreno/mi-rutina/${routineId}/${weekId}/${dayId}`;

  const [catalog, setCatalog] = useState<ExerciseCatalogItem[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [muscle, setMuscle] = useState<string | null>(null);
  const [equipment, setEquipment] = useState<string | null>(null);
  const [type, setType] = useState<string | null>(null);
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [selected, setSelected] = useState<ExerciseCatalogItem | null>(null);

  const [sets, setSets] = useState("4");
  const [reps, setReps] = useState("10");
  const [rest, setRest] = useState("60");

  useEffect(() => {
    setCatalog(getExerciseCatalog());
    setFavoriteIds(getFavoriteExerciseIdSet());
  }, []);

  function handleToggleFavorite(exerciseId: string, event: MouseEvent) {
    event.stopPropagation();
    toggleFavoriteExercise(exerciseId);
    setFavoriteIds(getFavoriteExerciseIdSet());
  }

  const categoryOptions = useMemo(() => uniqueValues(catalog, (ex) => ex.category), [catalog]);
  const muscleOptions = useMemo(() => uniqueValues(catalog, (ex) => ex.primaryMuscle), [catalog]);
  const equipmentOptions = useMemo(() => uniqueValues(catalog, (ex) => ex.equipment), [catalog]);
  const typeOptions = useMemo(() => uniqueValues(catalog, (ex) => ex.exerciseType), [catalog]);

  const trimmedQuery = query.trim().toLowerCase();
  const results = catalog.filter((ex) => {
    if (trimmedQuery && !ex.name.toLowerCase().includes(trimmedQuery)) return false;
    if (category && ex.category !== category) return false;
    if (muscle && ex.primaryMuscle !== muscle) return false;
    if (equipment && ex.equipment !== equipment) return false;
    if (type && ex.exerciseType !== type) return false;
    if (onlyFavorites && !favoriteIds.has(ex.id)) return false;
    return true;
  });

  const hasActiveFilter = Boolean(trimmedQuery || category || muscle || equipment || type || onlyFavorites);

  function clearFilters() {
    setQuery("");
    setCategory(null);
    setMuscle(null);
    setEquipment(null);
    setType(null);
    setOnlyFavorites(false);
  }

  const setsNum = Number(sets);
  const repsTrimmed = reps.trim();
  const saveError =
    !Number.isFinite(setsNum) || setsNum < 1
      ? "Ingresá una cantidad de series mayor a 0."
      : !repsTrimmed || repsTrimmed === "0"
        ? "Ingresá una cantidad de repeticiones."
        : null;

  function handleSave() {
    if (!selected || saveError) return;
    addExerciseToCustomRoutineDay(routineId, weekId, dayId, {
      exerciseId: selected.id,
      targetSets: setsNum,
      targetReps: repsTrimmed,
      restSeconds: Math.max(0, Number(rest) || 0),
    });
    router.push(dayHref);
  }

  if (selected) {
    return (
      <div className="flex flex-col gap-4">
        <div>
          <button
            type="button"
            onClick={() => setSelected(null)}
            className="text-text-muted text-xs uppercase tracking-wide font-display"
          >
            ← Cambiar ejercicio
          </button>
          <h1 className="text-2xl font-display font-semibold mt-1">{selected.name}</h1>
          <p className="text-text-secondary text-sm mt-1">{selected.primaryMuscle}</p>
        </div>

        <Card className="flex flex-col gap-4">
          <div>
            <label className="text-text-muted text-[11px] uppercase tracking-wide font-display">Series</label>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              value={sets}
              onChange={(e) => setSets(e.target.value)}
              className="h-11 w-full mt-1 rounded-lg bg-bg-surface-raised border border-border-subtle px-3 text-sm placeholder:text-text-muted"
            />
          </div>
          <div>
            <label className="text-text-muted text-[11px] uppercase tracking-wide font-display">Repeticiones</label>
            <input
              type="text"
              inputMode="numeric"
              placeholder="Ej: 10"
              value={reps}
              onChange={(e) => setReps(e.target.value)}
              className="h-11 w-full mt-1 rounded-lg bg-bg-surface-raised border border-border-subtle px-3 text-sm placeholder:text-text-muted"
            />
          </div>
          <div>
            <label className="text-text-muted text-[11px] uppercase tracking-wide font-display">
              Descanso (segundos)
            </label>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              value={rest}
              onChange={(e) => setRest(e.target.value)}
              className="h-11 w-full mt-1 rounded-lg bg-bg-surface-raised border border-border-subtle px-3 text-sm placeholder:text-text-muted"
            />
          </div>
        </Card>

        {saveError && <p className="text-danger text-xs">{saveError}</p>}

        <Button type="button" variant="primary" disabled={Boolean(saveError)} onClick={handleSave}>
          Guardar
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Link href={dayHref} className="text-text-muted text-xs uppercase tracking-wide font-display">
          ← Volver
        </Link>
        <h1 className="text-2xl font-display font-semibold mt-1">Agregar ejercicio</h1>
      </div>

      <input
        type="text"
        placeholder="Buscar ejercicio…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="h-11 w-full rounded-lg bg-bg-surface-raised border border-border-subtle px-3 text-sm placeholder:text-text-muted"
      />

      <div className="flex flex-col gap-3">
        <FilterChips label="Categoría" options={categoryOptions} value={category} onChange={setCategory} />
        <FilterChips label="Grupo muscular" options={muscleOptions} value={muscle} onChange={setMuscle} />
        <FilterChips label="Equipamiento" options={equipmentOptions} value={equipment} onChange={setEquipment} />
        <FilterChips label="Tipo" options={typeOptions} value={type} onChange={setType} />

        <button
          type="button"
          onClick={() => setOnlyFavorites((value) => !value)}
          className={clsx(
            "h-9 px-4 rounded-full text-xs font-display uppercase tracking-wide border transition-colors self-start",
            onlyFavorites
              ? "bg-accent-primary border-accent-primary text-white"
              : "bg-transparent border-border-subtle text-text-secondary"
          )}
        >
          ⭐ Solo favoritos
        </button>

        {hasActiveFilter && (
          <button
            type="button"
            onClick={clearFilters}
            className="text-accent-primary text-xs font-display uppercase tracking-wide self-start"
          >
            Limpiar filtros
          </button>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <p className="text-text-muted text-xs">
          {results.length} {results.length === 1 ? "ejercicio" : "ejercicios"}
        </p>
        {results.length === 0 && <p className="text-text-muted text-sm">No hay ejercicios para esta búsqueda.</p>}
        {results.map((exercise) => (
          <Card
            key={exercise.id}
            className="active:scale-[0.98] transition-transform cursor-pointer"
            onClick={() => setSelected(exercise)}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-text-primary text-sm font-medium">{exercise.name}</p>
                <p className="text-text-muted text-xs mt-0.5">
                  {exercise.primaryMuscle} · {exercise.equipment} · {exercise.exerciseType}
                </p>
              </div>
              <button
                type="button"
                onClick={(e) => handleToggleFavorite(exercise.id, e)}
                aria-label={favoriteIds.has(exercise.id) ? "Quitar de favoritos" : "Marcar favorito"}
                className="text-lg leading-none shrink-0"
              >
                {favoriteIds.has(exercise.id) ? "⭐" : "☆"}
              </button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
