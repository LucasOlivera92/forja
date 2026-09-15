import type { SupabaseClient } from "@supabase/supabase-js";

export type CoachReferralClaimResult =
  | "linked"
  | "already_linked"
  | "already_has_coach"
  | "invalid_code"
  | "not_student"
  | "not_authenticated";

const CLAIM_RESULTS = new Set<CoachReferralClaimResult>([
  "linked",
  "already_linked",
  "already_has_coach",
  "invalid_code",
  "not_student",
  "not_authenticated",
]);

export class CoachReferralError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = "CoachReferralError";
  }
}

export function normalizeCoachReferralCode(value: string): string {
  return value.trim().toUpperCase();
}

export async function getCurrentCoachReferralCode(
  supabase: SupabaseClient
): Promise<string | null> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new CoachReferralError("No se pudo verificar la sesión.", userError);
  }

  const { data, error } = await supabase
    .from("coach_referral_codes")
    .select("code")
    .eq("coach_id", user.id)
    .eq("active", true)
    .maybeSingle();

  if (error) {
    throw new CoachReferralError("No se pudo leer el código de entrenador.", error);
  }
  if (data === null) return null;
  if (typeof data !== "object" || typeof data.code !== "string") {
    throw new CoachReferralError("Supabase devolvió un código de entrenador inesperado.");
  }
  return data.code;
}

export async function isValidCoachReferralCode(
  supabase: SupabaseClient,
  code: string
): Promise<boolean> {
  const normalized = normalizeCoachReferralCode(code);
  if (!/^[A-Z0-9]{8}$/.test(normalized)) return false;

  const { data, error } = await supabase.rpc("is_valid_coach_referral_code", {
    p_code: normalized,
  });

  if (error) {
    throw new CoachReferralError("No se pudo validar el código de entrenador.", error);
  }
  return data === true;
}

export async function claimCoachReferralCode(
  supabase: SupabaseClient,
  code: string
): Promise<CoachReferralClaimResult> {
  const normalized = normalizeCoachReferralCode(code);
  const { data, error } = await supabase.rpc("claim_coach_referral_code", {
    p_code: normalized,
  });

  if (error) {
    throw new CoachReferralError("No se pudo vincular la cuenta con el entrenador.", error);
  }
  if (typeof data !== "string" || !CLAIM_RESULTS.has(data as CoachReferralClaimResult)) {
    throw new CoachReferralError("Supabase devolvió un resultado inesperado al vincular el entrenador.");
  }

  return data as CoachReferralClaimResult;
}

/**
 * Canjea el código guardado durante signUp. Sirve como fallback cuando la
 * confirmación de email está activada y el usuario recién obtiene sesión en
 * una request posterior. Si no hay código, no hace nada.
 */
export async function claimReferralFromUserMetadata(
  supabase: SupabaseClient,
  metadata: unknown
): Promise<CoachReferralClaimResult | null> {
  if (typeof metadata !== "object" || metadata === null || Array.isArray(metadata)) return null;
  const code = (metadata as Record<string, unknown>).coach_referral_code;
  if (typeof code !== "string" || code.trim() === "") return null;
  return claimCoachReferralCode(supabase, code);
}
