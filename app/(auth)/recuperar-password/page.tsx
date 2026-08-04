"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Button } from "@/shared/ui/Button";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";

function traducirErrorRecuperacion(message: string): string {
  if (message.toLowerCase().includes("invalid") && message.toLowerCase().includes("email")) {
    return "Ese email no es válido.";
  }
  return message;
}

export default function RecuperarPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const supabase = createClient();
    if (!supabase) {
      setError("Supabase no está configurado. Revisá .env.local.");
      return;
    }

    setLoading(true);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: typeof window !== "undefined" ? `${window.location.origin}/login` : undefined,
    });

    if (process.env.NODE_ENV !== "production") {
      console.log("[FORJA][recuperar-password] resetPasswordForEmail ->", {
        hasError: Boolean(resetError),
      });
    }

    setLoading(false);

    if (resetError) {
      setError(traducirErrorRecuperacion(resetError.message));
      return; // el email no se limpia
    }

    setSent(true);
  }

  if (sent) {
    return (
      <div className="flex flex-col gap-6 text-center">
        <h1 className="text-3xl font-display font-bold text-accent-primary">FORJA</h1>
        <p className="text-text-primary text-sm leading-relaxed">
          Si <strong>{email}</strong> tiene una cuenta en FORJA, te enviamos un email con
          instrucciones para recuperar tu contraseña.
        </p>
        <Link href="/login" className="text-accent-primary text-sm underline">
          Volver a iniciar sesión
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="text-center">
        <h1 className="text-3xl font-display font-bold text-accent-primary">FORJA</h1>
        <p className="text-text-secondary text-sm mt-2">Recuperar contraseña.</p>
      </div>

      <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="h-[52px] rounded-xl bg-bg-surface border border-border-subtle px-4 text-sm placeholder:text-text-muted"
          disabled={!isSupabaseConfigured || loading}
          autoComplete="email"
          required
        />

        {error && (
          <p className="text-danger text-xs text-center leading-relaxed" role="alert">
            {error}
          </p>
        )}

        <Button type="submit" disabled={!isSupabaseConfigured || loading}>
          {loading ? "Enviando..." : "Enviar instrucciones"}
        </Button>
      </form>

      <p className="text-text-secondary text-xs text-center">
        <Link href="/login" className="text-accent-primary underline">
          Volver a iniciar sesión
        </Link>
      </p>

      {!isSupabaseConfigured && (
        <p className="text-warning text-xs text-center leading-relaxed">
          Modo demo: conectá tu proyecto de Supabase en .env.local para
          habilitar la recuperación real.
        </p>
      )}
    </div>
  );
}
