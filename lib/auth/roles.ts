import type { Profile } from "./types";

/**
 * Chequeos de rol puros (sin I/O) — reciben el `Profile` ya cargado (por
 * ejemplo, vía `getCurrentProfile()`) en vez de ir a buscarlo ellos mismos,
 * para no mezclar autorización con acceso a datos.
 */

export function isAdmin(profile: Profile | null | undefined): boolean {
  return profile?.role === "admin";
}

export function isCoach(profile: Profile | null | undefined): boolean {
  return profile?.role === "coach";
}

export function isStudent(profile: Profile | null | undefined): boolean {
  return profile?.role === "student";
}
