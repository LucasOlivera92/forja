import { redirect } from "next/navigation";

/** Sprint 3.5 — /rutinas quedó unificado dentro de /entreno. Ver app/(app)/rutinas/page.tsx. */
export default function RutinaSemanaRedirect() {
  redirect("/entreno");
}
