import { redirect } from "next/navigation";

/**
 * Sprint 3.5 — /rutinas quedó unificado dentro de /entreno (catálogo de
 * rutinas → semanas → días → registro). No se pudo eliminar este archivo
 * físicamente (restricción del entorno), así que redirige automáticamente
 * a /entreno para no dejar una pantalla duplicada.
 */
export default function RutinasRedirect() {
  redirect("/entreno");
}
