"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/shared/ui/Button";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";

/** Traduce los mensajes de error de Supabase Auth más comunes al registrarse. */
function traducirErrorRegistro(message: string): string {
  if (message.includes("User already registered")) {
    return "Ya existe una cuenta con ese email.";
  }
  if (message.toLowerCase().includes("password") && message.toLowerCase().includes("at least")) {
    return "La contraseña debe tener al menos 6 caracteres.";
  }
  if (message.toLowerCase().includes("invalid") && message.toLowerCase().includes("email")) {
    return "Ese email no es válido.";
  }
  return message;
}

export default function RegistroPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingConfirmation, setPendingConfirmation] = useState(false);

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
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        // Usa el origen actual (localhost en dev, el dominio real en
        // producción) en vez de un dominio fijo, para que el link del
        // email de confirmación funcione en cualquier entorno.
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (process.env.NODE_ENV !== "production") {
      console.log("[FORJA][registro] signUp ->", {
        hasError: Boolean(signUpError),
        hasSession: Boolean(data.session),
        hasUser: Boolean(data.user),
      });
    }

    if (signUpError) {
      setLoading(false);
      setError(traducirErrorRegistro(signUpError.message));
      return; // no se limpian los campos
    }

    if (data.session && data.user) {
      // Confirmación de email desactivada en el proyecto: ya hay sesión.
      // Creamos el perfil ahora mismo con role = student explícito (el
      // proxy también lo haría por default si nos lo salteáramos).
      const { error: profileError } = await supabase.from("profiles").upsert(
        { id: data.user.id, full_name: fullName, role: "student" },
        { onConflict: "id" }
      );

      if (process.env.NODE_ENV !== "production") {
        console.log("[FORJA][registro] crear perfil ->", { ok: !profileError });
      }

      setLoading(false);
      router.replace("/hoy");
      router.refresh();
      return;
    }

    // Confirmación de email activada: no hay sesión todavía. El perfil se
    // termina de crear solo (role = student por default) la primera vez
    // que este usuario haga login, vía proxy.ts.
    setLoading(false);
    setPendingConfirmation(true);
  }

  if (pendingConfirmation) {
    return (
      <div className="flex flex-col gap-6 text-center">
        <h1 className="text-3xl font-display font-bold text-accent-primary">FORJA</h1>
        <p className="text-text-primary text-sm leading-relaxed">
          Te enviamos un email de confirmación a <strong>{email}</strong>. Confirmá tu
          cuenta y después iniciá sesión.
        </p>
        <Link href="/login" className="text-accent-primary text-sm underline">
          Ir a iniciar sesión
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="text-center">
        <h1 className="text-3xl font-display font-bold text-accent-primary">FORJA</h1>
        <p className="text-text-secondary text-sm mt-2">Creá tu cuenta.</p>
      </div>

      <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Nombre completo"
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          className="h-[52px] rounded-xl bg-bg-surface border border-border-subtle px-4 text-sm placeholder:text-text-muted"
          disabled={!isSupabaseConfigured || loading}
          autoComplete="name"
          required
        />
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
          autoComplete="new-password"
          required
        />
        <input
          type="password"
          placeholder="Confirmar contraseña"
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
          {loading ? "Creando cuenta..." : "Crear cuenta"}
        </Button>
      </form>

      <p className="text-text-secondary text-xs text-center">
        ¿Ya tenés cuenta?{" "}
        <Link href="/login" className="text-accent-primary underline">
          Iniciá sesión
        </Link>
      </p>

      {!isSupabaseConfigured && (
        <p className="text-warning text-xs text-center leading-relaxed">
          Modo demo: conectá tu proyecto de Supabase en .env.local para
          habilitar el registro real.
        </p>
      )}
    </div>
  );
}
