import type { SupabaseClient } from "@supabase/supabase-js";

export interface ProgressGoals {
  athleteId: string;
  startingWeightKg: number | null;
  targetWeightKg: number | null;
  workoutsPerWeek: number;
  sleepHours: number;
  nutritionAdherence: number;
}

export type ProgressPhotoView = "front" | "side" | "back";

export interface ProgressCheckin {
  id: string;
  athleteId: string;
  checkinMonth: string;
  weightKg: number | null;
  waistCm: number | null;
  frontPath: string;
  sidePath: string;
  backPath: string;
  notes: string;
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) return Number(value);
  return null;
}

function asObject(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error("Respuesta inválida.");
  return value as Record<string, unknown>;
}

function parseGoals(value: unknown): ProgressGoals {
  const row = asObject(value);
  if (typeof row.athlete_id !== "string") throw new Error("Objetivos inválidos.");
  const workouts = asNumber(row.workouts_per_week);
  const sleep = asNumber(row.sleep_hours);
  const nutrition = asNumber(row.nutrition_adherence);
  if (workouts === null || sleep === null || nutrition === null) throw new Error("Objetivos inválidos.");
  return {
    athleteId: row.athlete_id,
    startingWeightKg: asNumber(row.starting_weight_kg),
    targetWeightKg: asNumber(row.target_weight_kg),
    workoutsPerWeek: workouts,
    sleepHours: sleep,
    nutritionAdherence: nutrition,
  };
}

function parseCheckin(value: unknown): ProgressCheckin {
  const row = asObject(value);
  if (
    typeof row.id !== "string" || typeof row.athlete_id !== "string" || typeof row.checkin_month !== "string" ||
    typeof row.front_path !== "string" || typeof row.side_path !== "string" || typeof row.back_path !== "string" ||
    typeof row.notes !== "string"
  ) throw new Error("Check-in inválido.");
  return {
    id: row.id,
    athleteId: row.athlete_id,
    checkinMonth: row.checkin_month,
    weightKg: asNumber(row.weight_kg),
    waistCm: asNumber(row.waist_cm),
    frontPath: row.front_path,
    sidePath: row.side_path,
    backPath: row.back_path,
    notes: row.notes,
  };
}

export async function getCurrentUserId(supabase: SupabaseClient): Promise<string> {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error("No se pudo verificar la sesión.");
  return user.id;
}

export async function getProgressGoals(supabase: SupabaseClient, athleteId: string): Promise<ProgressGoals | null> {
  const { data, error } = await supabase.from("progress_goals").select("*").eq("athlete_id", athleteId).maybeSingle();
  if (error) throw new Error("No se pudieron cargar los objetivos.");
  return data ? parseGoals(data) : null;
}

export async function saveProgressGoals(
  supabase: SupabaseClient,
  goals: ProgressGoals
): Promise<ProgressGoals> {
  const { data, error } = await supabase.from("progress_goals").upsert({
    athlete_id: goals.athleteId,
    starting_weight_kg: goals.startingWeightKg,
    target_weight_kg: goals.targetWeightKg,
    workouts_per_week: goals.workoutsPerWeek,
    sleep_hours: goals.sleepHours,
    nutrition_adherence: goals.nutritionAdherence,
  }, { onConflict: "athlete_id" }).select("*").single();
  if (error) throw new Error("No se pudieron guardar los objetivos.");
  return parseGoals(data);
}

export async function listProgressCheckins(supabase: SupabaseClient, athleteId: string): Promise<ProgressCheckin[]> {
  const { data, error } = await supabase.from("progress_checkins").select("*").eq("athlete_id", athleteId)
    .order("checkin_month", { ascending: false });
  if (error) throw new Error("No se pudieron cargar los check-ins.");
  return (data ?? []).map(parseCheckin);
}

export async function uploadProgressPhoto(
  supabase: SupabaseClient,
  athleteId: string,
  month: string,
  view: ProgressPhotoView,
  file: File
): Promise<string> {
  const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `${athleteId}/${month}/${view}.${extension}`;
  const { error } = await supabase.storage.from("progress-photos").upload(path, file, {
    contentType: file.type,
    upsert: true,
  });
  if (error) throw new Error("No se pudo subir una de las fotos.");
  return path;
}

export async function saveProgressCheckin(
  supabase: SupabaseClient,
  input: Omit<ProgressCheckin, "id">
): Promise<ProgressCheckin> {
  const { data, error } = await supabase.from("progress_checkins").upsert({
    athlete_id: input.athleteId,
    checkin_month: input.checkinMonth,
    weight_kg: input.weightKg,
    waist_cm: input.waistCm,
    front_path: input.frontPath,
    side_path: input.sidePath,
    back_path: input.backPath,
    notes: input.notes,
  }, { onConflict: "athlete_id,checkin_month" }).select("*").single();
  if (error) throw new Error("No se pudo guardar el check-in.");
  return parseCheckin(data);
}

export async function getProgressPhotoUrl(supabase: SupabaseClient, path: string): Promise<string> {
  const { data, error } = await supabase.storage.from("progress-photos").createSignedUrl(path, 3600);
  if (error) throw new Error("No se pudo abrir la foto.");
  return data.signedUrl;
}
