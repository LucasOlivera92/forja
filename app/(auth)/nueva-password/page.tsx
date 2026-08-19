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
 * Sprint 6.3 — pantalla de "nueva contraseña", último paso del flujo de
 * recuperación: /recuperar-password → email → /auth/callback (canjea el
 * código y detecta `type=recovery`) → esta pantalla, ya con la sesión de
 * recovery guardada en cookies por el propio callback.
 *
 * Esta pantalla NUNCA maneja tokens por su cuenta: usa exactamente la
 * sesión que ya dejó `exchangeCodeForSession` en el callback (mismo
 * cliente de `lib/supabase/client`, que lee las cookies de Supabase como
 * cualquier otra pantalla). Si no hay sesión (link vencido, ya usado, o se
 * entra acá directo sin pasar por el callback), se lo dice claro al
 * usuario y lo manda a pedir la recuperación de nuevo — no se implementa
 * ningún sistema paralelo de verificación.
 */
export default function NuevaPasswordPage() {
  const [checkingSession, setCheckingSession] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  // Se lee con window.location en vez de useSearchParams (que en el App
  // Router obliga a envolver la página en <Suspense>) para no agregar esa
  // pieza extra a una pantalla que ya necesita su propio chequeo de sesión
  // en useEffect — mismo patrón que ya usa el resto de app/(auth)/*.
  const [callbackError, setCallbackError] = useState<string | null>(null);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setCallbackError(new URLSearchParams(window.location.search).get("error"));
    }

    const supabase = createClient();
    if (!supabase) {
      setCheckingSession(false);
      return;
    }

    supabase.auth.getUser().then(({ data }) => {
      setHasSession(Boolean(data.user));
      setCheckingSession(false);
    });
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    const supabase = createClient();
    if (!supabase) {
      setError("Supabase no está configurado. Revisá .env.local.");
      return;
    }

    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (process.env.NODE_ENV !== "production") {
      console.log("[FORJA][nueva-password] updateUser ->", { hasError: Boolean(updateError) });
    }

    if (updateError) {
      setLoading(false);
      setError(traducirErrorNuevaPassword(updateError.message));
      return; // los campos no se limpian
    }

    // La sesión de recovery ya cumplió su propósito: se cierra acá mismo
    // para no dejarla viva. El usuario inicia sesión de nuevo, ya con la
    // contraseña nueva, desde /login.
    await supabase.auth.signOut();

    setLoading(false);
    setDone(true);
  }

  if (checkingSession) {
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
        <p className="text-text-primary text-sm leading-relaxed">
          Listo, tu contraseña se actualizó. Iniciá sesión con la contraseña nueva.
        </p>
        <Link href="/login" className="text-accent-primary text-sm underline">
          Ir a iniciar sesión
        </Link>
      </div>
    );
  }

  if (!hasSession) {
    return (
      <div className="flex flex-col gap-6 text-center">
        <h1 className="text-3xl font-display font-bold text-accent-primary">FORJA</h1>
        <p className="text-text-primary text-sm leading-relaxed">
          {callbackError
            ? "Este enlace de recuperación ya no es válido."
            : "Tu enlace de recuperación venció o ya fue usado."}{" "}
          Pedí uno nuevo para poder cambiar tu contraseña.
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
          placeholder="Contraseña nueva"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="h-[52px] rounded-xl bg-bg-surface border border-border-subtle px-4 text-sm placeholder:text-text-muted"
          disabled={!isSupabaseConfigured || loading}
          autoComplete="new-password"
          required
        />
        <input
          type="password"
          placeholder="Confirmar contraseña nueva"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          className="h-[52px] rounded-xl bg-bg-surface border border-border-subtle px-4 text-sm placeholder:text-text-muted"
          disabled={!isSupabaseConfigured || loading}
          autoComplete="new-password"
          required
        />

        {error && (
          <p className="text-danger text-xs text-center leading-relaxed" role="alert">
            {error}
          </p>
        )}

        <Button type="submit" disabled={!isSupabaseConfigured || loading}>
          {loading ? "Guardando..." : "Guardar contraseña nueva"}
        </Button>
      </form>
    </div>
  );
}
