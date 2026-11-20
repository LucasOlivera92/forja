import { CoachRegistrationForm } from "./CoachRegistrationForm";

export default async function RegistroCoachPage({
  searchParams,
}: {
  searchParams: Promise<{ codigo?: string }>;
}) {
  const { codigo = "" } = await searchParams;
  return <CoachRegistrationForm initialCode={codigo} />;
}
