"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/shared/ui/Button";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";

/**
 * Traduce los mensajes de error de Supabase Auth (en inglés) a algo legible
 * en español, sin perder el mensaje original si no reconocemos el caso.
 */
function traducirErrorLogin(message: string): string {
  if (message.includes("Invalid login credentials")) {
    return "Email o contraseña incorrectos.";
  }
  if (message.includes("Email not confirmed")) {
    return "Confirmá tu email antes de iniciar sesión.";
  }
  return message;
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    // Sin esto, el <form> hace un submit nativo del navegador (GET a la
    // misma URL) que recarga la página entera — eso era el bug real: nunca
    // se llamaba a Supabase, solo se veía un reload que "limpiaba" los campos.
    event.preventDefault();
    setError(null);

    const supabase = createClient();
    if (!supabase) {
      setError("Supabase no está configurado. Revisá .env.local.");
      return;
    }

    setLoading(true);
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (process.env.NODE_ENV !== "production") {
      // Log de diagnóstico solo en desarrollo. Nunca imprime password ni tokens.
      console.log("[FORJA][login] signInWithPassword ->", {
        hasError: Boolean(signInError),
        hasSession: Boolean(data.session),
      });
    }

    if (signInError) {
      setLoading(false);
      setError(traducirErrorLogin(signInError.message));
      return; // el email y la contraseña quedan tal cual — no se limpian
    }

    // La sesión ya quedó en cookies (createBrowserClient de @supabase/ssr las
    // setea solo). router.refresh() fuerza a que el próximo request del App
    // Router (y por lo tanto el proxy) vea la cookie nueva.
    router.replace("/hoy");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="text-center">
        <h1 className="text-3xl font-display font-bold text-accent-primary">FORJA</h1>
        <p className="text-text-secondary text-sm mt-2">Todo se forja.</p>
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
        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="h-[52px] rounded-xl bg-bg-surface border border-border-subtle px-4 text-sm placeholder:text-text-muted"
          disabled={!isSupabaseConfigured || loading}
          autoComplete="current-password"
          required
        />

        {error && (
          <p className="text-danger text-xs text-center leading-relaxed" role="alert">
            {error}
          </p>
        )}

        <Button type="submit" disabled={!isSupabaseConfigured || loading}>
          {loading ? "Ingresando..." : "Entrar"}
        </Button>
      </form>

      <div className="flex flex-col gap-2 text-center">
        <Link href="/recuperar-password" className="text-accent-primary text-xs underline">
          ¿Olvidaste tu contraseña?
        </Link>
        <p className="text-text-secondary text-xs">
          ¿No tenés cuenta?{" "}
          <Link href="/registro" className="text-accent-primary underline">
            Registrate
          </Link>
        </p>
      </div>

      {!isSupabaseConfigured && (
        <p className="text-warning text-xs text-center leading-relaxed">
          Modo demo: conectá tu proyecto de Supabase en .env.local para
          habilitar el login real (Sprint 1).
        </p>
      )}
    </div>
  );
}
