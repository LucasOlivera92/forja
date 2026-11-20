"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { claimCoachInviteCode, isValidCoachInviteCode, normalizeCoachInviteCode } from "@/lib/cloud/coach-invites";
import { Button } from "@/shared/ui/Button";

export function CoachRegistrationForm({ initialCode }: { initialCode: string }) {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingConfirmation, setPendingConfirmation] = useState(false);
  const code = normalizeCoachInviteCode(initialCode);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (password !== confirmPassword) return setError("Las contraseñas no coinciden.");
    if (password.length < 6) return setError("La contraseña debe tener al menos 6 caracteres.");
    const supabase = createClient();
    if (!supabase) return setError("No se pudo conectar con FORJA.");

    setLoading(true);
    try {
      if (!(await isValidCoachInviteCode(supabase, code))) {
        setError("Esta invitación no existe, venció o ya fue utilizada.");
        return;
      }
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName, coach_invite_code: code },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (signUpError) {
        setError(signUpError.message.includes("already registered") ? "Ya existe una cuenta con ese email." : "No se pudo crear la cuenta.");
        return;
      }
      if (data.session && data.user) {
        const { error: profileError } = await supabase.from("profiles").upsert(
          { id: data.user.id, full_name: fullName, role: "student" },
          { onConflict: "id" }
        );
        if (profileError) throw new Error();
        const result = await claimCoachInviteCode(supabase, code);
        if (result !== "promoted" && result !== "already_coach") throw new Error();
        await supabase.auth.updateUser({ data: { coach_invite_code: null } });
        router.replace("/alumnos");
        router.refresh();
        return;
      }
      setPendingConfirmation(true);
    } catch {
      setError("No se pudo activar la cuenta de entrenador. Probá nuevamente.");
    } finally {
      setLoading(false);
    }
  }

  if (pendingConfirmation) {
    return (
      <div className="flex flex-col gap-6 text-center">
        <h1 className="text-3xl font-display font-bold text-accent-primary">FORJA COACH</h1>
        <p className="text-text-primary text-sm">Confirmá el email que enviamos a <strong>{email}</strong>.</p>
        <Link href="/login" className="text-accent-primary text-sm underline">Ir a iniciar sesión</Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-7">
      <div className="text-center">
        <h1 className="text-3xl font-display font-bold text-accent-primary">FORJA COACH</h1>
        <p className="text-text-secondary text-sm mt-2">Creá tu espacio de entrenamiento.</p>
      </div>
      <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
        <input className="h-[52px] rounded-xl bg-bg-surface border border-border-subtle px-4 text-sm" placeholder="Nombre completo" value={fullName} onChange={(event) => setFullName(event.target.value)} required disabled={loading} />
        <input className="h-[52px] rounded-xl bg-bg-surface border border-border-subtle px-4 text-sm" type="email" placeholder="Email" value={email} onChange={(event) => setEmail(event.target.value)} required disabled={loading} />
        <input className="h-[52px] rounded-xl bg-bg-surface border border-border-subtle px-4 text-sm" type="password" placeholder="Contraseña" value={password} onChange={(event) => setPassword(event.target.value)} required disabled={loading} />
        <input className="h-[52px] rounded-xl bg-bg-surface border border-border-subtle px-4 text-sm" type="password" placeholder="Confirmar contraseña" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required disabled={loading} />
        {error && <p className="text-danger text-xs text-center" role="alert">{error}</p>}
        <Button type="submit" disabled={loading || !code}>{loading ? "Creando espacio..." : "Crear cuenta de coach"}</Button>
      </form>
      {!code && <p className="text-danger text-xs text-center">El enlace de invitación está incompleto.</p>}
      <Link href="/login" className="text-accent-primary text-xs text-center underline">Ya tengo cuenta</Link>
    </div>
  );
}
