import Link from "next/link";
import { redirect } from "next/navigation";
import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import { getCurrentProfile, isCoach } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getActiveStudentForCurrentCoach } from "@/lib/cloud/coach-students";
import { getCoachStudentOverview, type CoachStudentOverview } from "@/lib/cloud/coach-student-overview";
import { listRoutinesForAthlete } from "@/lib/cloud/routines";
import type { RoutineRow } from "@/lib/cloud/routines";

/**
 * Sprint 6.12 — Detalle de un alumno para su coach: perfil básico + sus
 * rutinas guardadas en Supabase. Solo lectura (no crea, edita, archiva ni
 * elimina nada) — reutiliza `listRoutinesForAthlete` de
 * `lib/cloud/routines.ts` tal cual, sin duplicar su lógica.
 *
 * No confía en que el enlace "Ver alumno" solo aparezca para alumnos
 * propios: vuelve a verificar acá, en el servidor, tanto el rol del
 * usuario como que `studentId` corresponda a una relación ACTIVA con el
 * coach autenticado (`getActiveStudentForCurrentCoach`). Cualquiera de
 * las dos cosas que falle redirige, sin mostrar ni un dato del alumno.
 */
export default async function AlumnoDetallePage({ params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = await params;

  const profile = await getCurrentProfile();
  if (!isCoach(profile)) {
    redirect("/hoy");
  }

  const supabase = await createClient();
  if (!supabase) {
    return (
      <div className="flex flex-col gap-4">
        <Link href="/alumnos" className="text-text-muted text-xs uppercase tracking-wide font-display">
          ← Volver a Mis alumnos
        </Link>
        <Card>
          <p className="text-text-secondary text-sm">No se pudo conectar con la nube. Probá de nuevo más tarde.</p>
        </Card>
      </div>
    );
  }

  let student;
  try {
    student = await getActiveStudentForCurrentCoach(supabase, studentId);
  } catch {
    student = null;
  }

  if (!student) {
    redirect("/alumnos");
  }

  let routines: RoutineRow[] = [];
  let overview: CoachStudentOverview | null = null;
  let loadFailed = false;
  try {
    [routines, overview] = await Promise.all([
      listRoutinesForAthlete(supabase, studentId),
      getCoachStudentOverview(supabase, studentId),
    ]);
  } catch {
    // No se expone el error interno — solo se informa que no se pudieron cargar.
    loadFailed = true;
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Link href="/alumnos" className="text-text-muted text-xs uppercase tracking-wide font-display">
          ← Volver a Mis alumnos
        </Link>
        <h1 className="text-2xl font-display font-semibold mt-1">{student.full_name || "Alumno sin nombre"}</h1>
        {student.primary_goal && <p className="text-text-secondary text-sm mt-1">{student.primary_goal}</p>}
      </div>

      {overview && (
        <>
          <Card raised>
            <p className="text-text-muted text-xs uppercase tracking-wide">Últimos 30 días</p>
            <p className="text-text-secondary text-sm mt-1">
              {overview.periodStart} al {overview.periodEnd}
            </p>
          </Card>

          <div className="grid grid-cols-1 gap-3">
            <MetricCard title="🏋️ Entrenamiento" items={[
              ["Sesiones terminadas", overview.workout.sessions],
              ["Series completadas", overview.workout.completedSets],
              ["Volumen", `${overview.workout.volumeKg.toLocaleString("es-AR")} kg`],
            ]} />
            <MetricCard title="🥗 Alimentación" items={[
              ["Días registrados", overview.nutrition.loggedDays],
              ["Comidas completadas", overview.nutrition.mealsCompleted],
              ["Proteína promedio", `${overview.nutrition.averageProtein} g/día`],
              ["Promedio energético", `${overview.nutrition.averageKcal} kcal/día`],
            ]} />
            <MetricCard title="🌙 Descanso" items={[
              ["Noches registradas", overview.sleep.nights],
              ["Horas promedio", overview.sleep.averageHours === null ? "Sin datos" : `${overview.sleep.averageHours} h`],
              ["Calidad", `${overview.sleep.goodNights} bien · ${overview.sleep.regularNights} regular · ${overview.sleep.badNights} mal`],
            ]} />
            <MetricCard title="📈 Progreso" items={[
              ["Peso actual", overview.latestCheckin?.weightKg ? `${overview.latestCheckin.weightKg} kg` : "Sin check-in"],
              ["Cintura", overview.latestCheckin?.waistCm ? `${overview.latestCheckin.waistCm} cm` : "Sin check-in"],
              ["Objetivo de peso", overview.goals?.targetWeightKg ? `${overview.goals.targetWeightKg} kg` : "Sin definir"],
              ["Último check-in", overview.latestCheckin?.checkinMonth ?? "Pendiente"],
            ]} />
          </div>

          {overview.unavailableSections.length > 0 && (
            <Card>
              <p className="text-warning text-sm">
                No se pudo cargar temporalmente: {overview.unavailableSections.join(", ")}.
              </p>
            </Card>
          )}
        </>
      )}

      {loadFailed ? (
        <Card>
          <p className="text-text-secondary text-sm">No se pudieron cargar las rutinas de este alumno. Probá de nuevo más tarde.</p>
        </Card>
      ) : routines.length === 0 ? (
        <Card>
          <p className="text-text-secondary text-sm">Este alumno todavía no tiene rutinas guardadas.</p>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {routines.map((routine) => (
            <Card key={routine.id} raised>
              <p className="font-display text-lg uppercase tracking-wide">{routine.payload.name}</p>
              <p className="text-text-muted text-xs mt-1">
                {routine.payload.weeksCount} semanas · {routine.payload.daysPerWeek} días por semana
              </p>
            </Card>
          ))}
        </div>
      )}

      <Link href="/alumnos">
        <Button type="button" variant="secondary">
          Volver a Mis alumnos
        </Button>
      </Link>
    </div>
  );
}

function MetricCard({ title, items }: { title: string; items: Array<[string, string | number]> }) {
  return (
    <Card>
      <h2 className="text-lg font-display font-semibold">{title}</h2>
      <dl className="mt-3 flex flex-col gap-2">
        {items.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-4 text-sm">
            <dt className="text-text-secondary">{label}</dt>
            <dd className="text-text-primary font-medium text-right">{value}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}
