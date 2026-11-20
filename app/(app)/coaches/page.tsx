import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isCurrentForjaAdmin, listManagedCoaches } from "@/lib/cloud/coach-invites";
import { Card } from "@/shared/ui/Card";
import { CreateCoachInvite } from "./_components/CreateCoachInvite";

export default async function CoachesPage() {
  const supabase = await createClient();
  if (!supabase || !(await isCurrentForjaAdmin(supabase))) redirect("/hoy");

  let coaches: Awaited<ReturnType<typeof listManagedCoaches>> = [];
  let loadFailed = false;
  try {
    coaches = await listManagedCoaches(supabase);
  } catch {
    loadFailed = true;
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-display font-semibold">RED DE COACHES</h1>
        <p className="text-text-secondary text-sm mt-1">Tu estructura de entrenadores y alumnos.</p>
      </div>
      <CreateCoachInvite />
      <h2 className="text-lg font-display font-semibold mt-2">Coaches activos</h2>
      {loadFailed ? (
        <Card><p className="text-text-secondary text-sm">No se pudo cargar la red. Probá nuevamente.</p></Card>
      ) : coaches.length === 0 ? (
        <Card><p className="text-text-secondary text-sm">Todavía no hay coaches registrados.</p></Card>
      ) : (
        coaches.map((coach) => (
          <Card key={coach.id}>
            <div className="flex justify-between gap-4 items-center">
              <p className="font-display uppercase tracking-wide">{coach.fullName}</p>
              <p className="text-accent-primary text-sm font-medium">
                {coach.activeStudents} {coach.activeStudents === 1 ? "alumno" : "alumnos"}
              </p>
            </div>
          </Card>
        ))
      )}
    </div>
  );
}
