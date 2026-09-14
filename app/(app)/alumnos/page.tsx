import Link from "next/link";
import { redirect } from "next/navigation";
import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import { getCurrentProfile, isCoach } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { listActiveStudentsForCurrentCoach } from "@/lib/cloud/coach-students";

/**
 * Sprint 6.12 — "Mis alumnos": panel real (Supabase) para coaches, de solo
 * lectura este sprint (sin crear/editar/archivar/eliminar nada). Server
 * Component: la verificación de rol corre acá antes de renderizar nada, y
 * `listActiveStudentsForCurrentCoach` resuelve el coach autenticado por su
 * cuenta — esta pantalla nunca le pasa ni le inventa un id de coach.
 *
 * Quien no es coach nunca ve esta pantalla: se redirige a /hoy de
 * inmediato, sin depender de que el enlace esté oculto en el layout (esa
 * ocultación es solo UX, no la verificación real).
 */
export default async function AlumnosPage() {
  const profile = await getCurrentProfile();
  if (!isCoach(profile)) {
    redirect("/hoy");
  }

  const supabase = await createClient();
  if (!supabase) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-display font-semibold">MIS ALUMNOS</h1>
        <Card>
          <p className="text-text-secondary text-sm">No se pudo conectar con la nube. Probá de nuevo más tarde.</p>
        </Card>
      </div>
    );
  }

  let students: Awaited<ReturnType<typeof listActiveStudentsForCurrentCoach>> = [];
  let loadFailed = false;

  try {
    students = await listActiveStudentsForCurrentCoach(supabase);
  } catch {
    // No se expone el error interno (podría traer detalles de Supabase) —
    // solo se informa que no se pudo cargar la lista.
    loadFailed = true;
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-display font-semibold">MIS ALUMNOS</h1>

      {loadFailed ? (
        <Card>
          <p className="text-text-secondary text-sm">No se pudieron cargar tus alumnos. Probá de nuevo más tarde.</p>
        </Card>
      ) : students.length === 0 ? (
        <Card>
          <p className="text-text-secondary text-sm">Todavía no tenés alumnos vinculados.</p>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {students.map((student) => (
            <Card key={student.id} raised>
              <p className="font-display text-lg uppercase tracking-wide">{student.full_name || "Alumno sin nombre"}</p>
              {student.primary_goal && <p className="text-text-secondary text-sm mt-1">{student.primary_goal}</p>}
              <div className="mt-3">
                <Link href={`/alumnos/${student.id}`}>
                  <Button type="button" variant="secondary">
                    Ver alumno
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
