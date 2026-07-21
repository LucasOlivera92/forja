import { redirect } from "next/navigation";

// La raíz nunca se muestra: el middleware decide entre /login y /hoy.
export default function RootPage() {
  redirect("/hoy");
}
