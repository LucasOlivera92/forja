"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { createCoachInviteCode } from "@/lib/cloud/coach-invites";
import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";

export function CreateCoachInvite() {
  const [creating, setCreating] = useState(false);
  const [link, setLink] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function createInvite() {
    setCreating(true);
    setMessage(null);
    try {
      const supabase = createClient();
      if (!supabase) throw new Error();
      const code = await createCoachInviteCode(supabase);
      const invitationLink = `${window.location.origin}/registro-coach?codigo=${code}`;
      setLink(invitationLink);
      await navigator.clipboard.writeText(invitationLink);
      setMessage("Enlace creado y copiado. Vence en 14 días y sirve una sola vez.");
    } catch {
      setMessage("No se pudo crear la invitación.");
    } finally {
      setCreating(false);
    }
  }

  async function copyLink() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setMessage("Enlace copiado.");
    } catch {
      setMessage(link);
    }
  }

  return (
    <Card raised>
      <h2 className="text-lg font-display font-semibold">Invitar un coach</h2>
      <p className="text-text-secondary text-sm mt-1">Cada enlace es privado, vence en 14 días y solo puede usarse una vez.</p>
      <div className="mt-4 flex flex-col gap-2">
        <Button type="button" onClick={createInvite} disabled={creating}>
          {creating ? "Creando..." : "Crear enlace de coach"}
        </Button>
        {link && <Button type="button" variant="secondary" onClick={copyLink}>Copiar nuevamente</Button>}
      </div>
      <p aria-live="polite" className="text-text-secondary text-xs mt-3 min-h-4">{message}</p>
    </Card>
  );
}
