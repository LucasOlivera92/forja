/**
 * Combinador de clases mínimo — evita sumar una dependencia (clsx/cn)
 * para algo que se resuelve en 5 líneas. Coherente con la regla de
 * simplicidad del paso 8: no agregar librerías que no hacen falta.
 */
export function clsx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}
