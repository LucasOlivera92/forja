import { Card } from "@/shared/ui/Card";

export default function Page() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-display font-semibold">Descanso</h1>
      <Card>
        <p className="text-text-secondary text-sm">
          El registro de sueño de anoche va a vivir acá.
        </p>
        <p className="text-text-muted text-xs mt-3 font-display uppercase tracking-wide">
          Se implementa en un sprint posterior
        </p>
      </Card>
    </div>
  );
}
