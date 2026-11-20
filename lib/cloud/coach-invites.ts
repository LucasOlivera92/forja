import type { SupabaseClient } from "@supabase/supabase-js";

export type CoachInviteClaimResult = "promoted" | "already_coach" | "invalid_code" | "not_student" | "not_authenticated";

const CLAIM_RESULTS = new Set<CoachInviteClaimResult>([
  "promoted",
  "already_coach",
  "invalid_code",
  "not_student",
  "not_authenticated",
]);

export function normalizeCoachInviteCode(value: string): string {
  return value.trim().toUpperCase();
}

export async function isCurrentForjaAdmin(supabase: SupabaseClient): Promise<boolean> {
  const { data, error } = await supabase.rpc("is_forja_admin");
  if (error) return false;
  return data === true;
}

export async function createCoachInviteCode(supabase: SupabaseClient): Promise<string> {
  const { data, error } = await supabase.rpc("create_coach_invite_code");
  if (error || typeof data !== "string") throw new Error("No se pudo crear la invitación.");
  return data;
}

export async function isValidCoachInviteCode(supabase: SupabaseClient, code: string): Promise<boolean> {
  const normalized = normalizeCoachInviteCode(code);
  if (!/^[A-Z0-9]{16}$/.test(normalized)) return false;
  const { data, error } = await supabase.rpc("is_valid_coach_invite_code", { p_code: normalized });
  if (error) throw new Error("No se pudo validar la invitación.");
  return data === true;
}

export async function claimCoachInviteCode(
  supabase: SupabaseClient,
  code: string
): Promise<CoachInviteClaimResult> {
  const { data, error } = await supabase.rpc("claim_coach_invite_code", {
    p_code: normalizeCoachInviteCode(code),
  });
  if (error || typeof data !== "string" || !CLAIM_RESULTS.has(data as CoachInviteClaimResult)) {
    throw new Error("No se pudo activar el perfil de entrenador.");
  }
  return data as CoachInviteClaimResult;
}

export async function claimCoachInviteFromMetadata(
  supabase: SupabaseClient,
  metadata: unknown
): Promise<CoachInviteClaimResult | null> {
  if (typeof metadata !== "object" || metadata === null || Array.isArray(metadata)) return null;
  const code = (metadata as Record<string, unknown>).coach_invite_code;
  if (typeof code !== "string" || code.trim() === "") return null;
  return claimCoachInviteCode(supabase, code);
}

export interface ManagedCoachSummary {
  id: string;
  fullName: string;
  activeStudents: number;
}

export async function listManagedCoaches(supabase: SupabaseClient): Promise<ManagedCoachSummary[]> {
  if (!(await isCurrentForjaAdmin(supabase))) throw new Error("Acceso no autorizado.");

  const [{ data: profiles, error: profilesError }, { data: relations, error: relationsError }] = await Promise.all([
    supabase.from("profiles").select("id, full_name").eq("role", "coach").order("full_name"),
    supabase.from("coach_students").select("coach_id").eq("active", true),
  ]);
  if (profilesError || relationsError) throw new Error("No se pudo cargar la red de coaches.");

  const counts = new Map<string, number>();
  for (const value of (relations ?? []) as unknown[]) {
    if (typeof value !== "object" || value === null || Array.isArray(value)) continue;
    const coachId = (value as Record<string, unknown>).coach_id;
    if (typeof coachId === "string") counts.set(coachId, (counts.get(coachId) ?? 0) + 1);
  }

  const coaches: ManagedCoachSummary[] = [];
  for (const value of (profiles ?? []) as unknown[]) {
    if (typeof value !== "object" || value === null || Array.isArray(value)) continue;
    const row = value as Record<string, unknown>;
    if (typeof row.id !== "string") continue;
    coaches.push({
      id: row.id,
      fullName: typeof row.full_name === "string" && row.full_name.trim() ? row.full_name : "Coach sin nombre",
      activeStudents: counts.get(row.id) ?? 0,
    });
  }
  return coaches;
}
