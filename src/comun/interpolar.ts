/**
 * `{NOMBRE}` → valor de la variable, compartido entre el deck y el mando.
 *
 * Vive en `src/comun/` porque los dos procesos lo usan y tienen que dar el
 * mismo resultado: la regla `main-no-renderer` no deja que `electron/main`
 * importe de `src/utils`, y la copia del móvil ya se había separado.
 */

/** Sustituye `{nombre}` por el valor en `estado`. La variable ausente sale como ''. */
export function interpolate(template: string | undefined, state: Record<string, string> | undefined): string {
  if (!template) return '';
  if (!state) return template;
  return template.replace(/\{(\w+)\}/g, (_, key) => state[key] ?? '');
}
