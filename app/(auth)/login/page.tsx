import { Button } from "@/shared/ui/Button";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export default function LoginPage() {
  return (
    <div className="flex flex-col gap-8">
      <div className="text-center">
        <h1 className="text-3xl font-display font-bold text-accent-primary">FORJA</h1>
        <p className="text-text-secondary text-sm mt-2">Todo se forja.</p>
      </div>

      <form className="flex flex-col gap-3">
        <input
          type="email"
          placeholder="Email"
          className="h-[52px] rounded-xl bg-bg-surface border border-border-subtle px-4 text-sm placeholder:text-text-muted"
          disabled={!isSupabaseConfigured}
        />
        <input
          type="password"
          placeholder="Contraseña"
          className="h-[52px] rounded-xl bg-bg-surface border border-border-subtle px-4 text-sm placeholder:text-text-muted"
          disabled={!isSupabaseConfigured}
        />
        <Button type="submit" disabled={!isSupabaseConfigured}>
          Entrar
        </Button>
      </form>

      {!isSupabaseConfigured && (
        <p className="text-warning text-xs text-center leading-relaxed">
          Modo demo: conectá tu proyecto de Supabase en .env.local para
          habilitar el login real (Sprint 1).
        </p>
      )}
    </div>
  );
}
