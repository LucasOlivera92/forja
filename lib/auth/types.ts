/**
 * lib/auth — capa de usuarios/roles (Sprint 6.0).
 *
 * Separada a propósito de lib/mock/*: lib/mock sigue siendo la fuente de
 * datos de Nutrición/Entreno/Descanso/Progreso (localStorage, sin tocar).
 * Esta carpeta es la fuente de identidad/autorización, respaldada por
 * Supabase Auth + la tabla `profiles` (ver supabase/migrations/).
 */

/** Coincide con el CHECK constraint `profiles_role_check` (migración 0002). */
export type UserRole = "admin" | "coach" | "student";

/**
 * Espejo de la tabla `public.profiles` tal como queda después de la
 * migración 0002_roles_and_coach_students.sql. Si la migración todavía no
 * se aplicó contra el proyecto real, `role` y `avatar_url` no van a existir
 * en la base — los helpers de session.ts están escritos para no romper en
 * ese caso (ver comentarios ahí).
 */
export interface Profile {
  id: string;
  full_name: string | null;
  birth_date: string | null;
  height_cm: number | null;
  primary_goal: string | null;
  timezone: string | null;
  role: UserRole;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

/** Espejo de la tabla `public.coach_students` (migración 0002). */
export interface CoachStudent {
  id: string;
  coach_id: string;
  student_id: string;
  active: boolean;
  created_at: string;
}
