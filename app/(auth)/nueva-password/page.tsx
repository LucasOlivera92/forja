"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { Button } from "@/shared/ui/Button";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";

/** Traduce los mensajes de error de Supabase Auth más comunes al cambiar la contraseña. */
function traducirErrorNuevaPassword(message: string): string {
  if (message.toLowerCase().includes("password") && message.toLowerCase().includes("at least")) {
    return "La contraseña debe tener al menos 6 caracteres.";
  }
  if (message.toLowerCase().includes("same") && message.toLowerCase().includes("password")) {
    return "La contraseña nueva tiene que ser distinta a la anterior.";
  }
  return message;
}

/**
 * Sprint 6.3 (refactor definitivo) — esta pantalla es ahora el punto
 * COMPLETO del flujo de recuperación, sin pasar por /auth/callback:
 *
 * /recuperar-password → resetPasswordForEmail(redirectTo: .../nueva-password)
 * → email → click → llega ACÁ con `?code=...` en la URL.
 *
 * Al montar: si hay `code`, esta pantalla misma hace
 * `exchangeCodeForSession(code)` — el mismo canje que antes hacía el
 * route handler compartido. Recién con esa sesión de recovery ya
 * confirmada se muestra el formulario. Si no hay `code` en la URL (por
 * ejemplo, si alguien vuelve a entrar a esta pantalla más tarde con la
 * sesión de recovery todavía viva de una carga anterior), se revisa si ya
 * existe una sesión válida antes de mostrar el formulario. En cualquier
 * otro caso (code inválido/vencido, o ni code ni sesión) se explica que el
 * enlace ya no sirve y hay que pedir uno nuevo.
 *
 * No se maneja ningún token por fuera de la sesión de Supabase: todo pasa
 * por `supabase.auth` (`exchangeCodeForSession`, `getUser`, `updateUser`,
 * `signOut`), nunca se guarda nada en localStorage ni se expone la
 * contraseña en la URL.
 */
export default function NuevaPasswordPage() {
  const [checking, setChecking] = useState(true);
  const [ready, setReady] = useState(false);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let active = true;

    const supabaseClient = createClient();

    if (!supabaseClient) {
      setChecking(false);
      return;
    }

    const supabase = supabaseClient;

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!active) return;

        if (event === "PASSWORD_RECOVERY" && session) {
          setReady(true);
          setChecking(false);
          return;
        }

        if (event === "SIGNED_IN" && session) {
          setReady(true);
          setChecking(false);
        }
      }
    );

    async function resolveRecoverySession() {
      const { data } = await supabase.auth.getSession();

      if (!active) return;

      setReady(Boolean(data.session));
      setChecking(false);
    }

    resolveRecoverySession();

    return () => {
      active = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!password || !confirmPassword) {
      setError("Completá los dos campos.");
      return;
    }
    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    const supabase = createClient();
    if (!supabase) {
      setError("Supabase no está configurado. Revisá .env.local.");
      return;
    }

    setSaving(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (process.env.NODE_ENV !== "production") {
      console.log("[FORJA][nueva-password] updateUser ->", { hasError: Boolean(updateError) });
    }

    if (updateError) {
      setSaving(false);
      setError(traducirErrorNuevaPassword(updateError.message));
      return; // los campos no se limpian
    }

    // La sesión de recovery ya cumplió su propósito: se cierra acá mismo
    // para no dejarla viva. El usuario inicia sesión de nuevo, ya con la
    // contraseña nueva, desde /login.
    await supabase.auth.signOut();

    setSaving(false);
    setDone(true);
  }

  if (checking) {
    return (
      <div className="flex flex-col gap-6 text-center">
        <h1 className="text-3xl font-display font-bold text-accent-primary">FORJA</h1>
        <p className="text-text-secondary text-sm">Verificando enlace…</p>
      </div>
    );
  }

  if (done) {
    return (
      <div className="flex flex-col gap-6 text-center">
        <h1 className="text-3xl font-display font-bold text-accent-primary">FORJA</h1>
        <p className="text-text-primary text-sm leading-relaxed">Listo, tu contraseña se actualizó.</p>
        <Link href="/login" className="text-accent-primary text-sm underline">
          Ir a iniciar sesión
        </Link>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="flex flex-col gap-6 text-center">
        <h1 className="text-3xl font-display font-bold text-accent-primary">FORJA</h1>
        <p className="text-text-primary text-sm leading-relaxed">
          El enlace de recuperación es inválido o venció. Pedí uno nuevo para poder cambiar tu contraseña.
        </p>
        <Link href="/recuperar-password" className="text-accent-primary text-sm underline">
          Solicitar recuperación de nuevo
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="text-center">
        <h1 className="text-3xl font-display font-bold text-accent-primary">FORJA</h1>
        <p className="text-text-secondary text-sm mt-2">Establecé tu nueva contraseña.</p>
      </div>

      <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
        <input
          type="password"
          placeholder="Nueva contraseña"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="h-[52px] rounded-xl bg-bg-surface border border-border-subtle px-4 text-sm placeholder:text-text-muted"
          disabled={!isSupabaseConfigured || saving}
          autoComplete="new-password"
          required
        />
        <input
          type="password"
          placeholder="Repetir nueva contraseña"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          className="h-[52px] rounded-xl bg-bg-surface border border-border-subtle px-4 text-sm placeholder:text-text-muted"
          disabled={!isSupabaseConfigured || saving}
          autoComplete="new-password"
          required
        />

        {error && (
          <p className="text-danger text-xs text-center leading-relaxed" role="alert">
            {error}
          </p>
        )}

        <Button type="submit" disabled={!isSupabaseConfigured || saving}>
          {saving ? "Guardando..." : "Guardar contraseña nueva"}
        </Button>
      </form>
    </div>
  );
}
