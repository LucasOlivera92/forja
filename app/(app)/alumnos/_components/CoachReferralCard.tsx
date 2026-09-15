"use client";

import { useState } from "react";
import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";

interface CoachReferralCardProps {
  code: string;
}

export function CoachReferralCard({ code }: CoachReferralCardProps) {
  const [message, setMessage] = useState<string | null>(null);

  function getInvitationText() {
    return `Sumate a FORJA como mi alumna. Registrate en ${window.location.origin}/registro e ingresá mi código de entrenador: ${code}`;
  }

  async function copyInvitation() {
    try {
      await navigator.clipboard.writeText(getInvitationText());
      setMessage("Invitación copiada. Ya podés enviársela a tu alumna.");
    } catch {
      setMessage(`Código: ${code}`);
    }
  }

  async function shareInvitation() {
    if (!navigator.share) {
      await copyInvitation();
      return;
    }

    try {
      await navigator.share({
        title: "Invitación a FORJA",
        text: getInvitationText(),
      });
      setMessage("Invitación compartida.");
    } catch {
      // Cancelar el selector nativo no es un error que necesite mostrarse.
    }
  }

  return (
    <Card raised>
      <p className="font-display text-lg uppercase tracking-wide">Invitar alumnas</p>
      <p className="text-text-secondary text-sm mt-1">
        Compartí este código. Cuando una alumna se registre con él, aparecerá automáticamente en tu lista.
      </p>
      <p className="font-display text-3xl tracking-[0.2em] text-accent-primary mt-4" aria-label={`Código ${code}`}>
        {code}
      </p>
      <div className="grid grid-cols-2 gap-2 mt-4">
        <Button type="button" variant="secondary" onClick={copyInvitation}>
          Copiar
        </Button>
        <Button type="button" onClick={shareInvitation}>
          Compartir
        </Button>
      </div>
      <p aria-live="polite" className="text-text-secondary text-xs mt-3 min-h-[1rem]">
        {message}
      </p>
    </Card>
  );
}
