/**
 * Reglas de bloqueo de apariencia y título para acciones de plugin (T-FIX-04).
 *
 * El SDK de Stream Deck define:
 * - Si el plugin controla la imagen (manda imagen por visual store o define imágenes propias en su manifiesto),
 *   la sección de apariencia (icono, animaciones, colores) se bloquea.
 * - El título se puede editar por el usuario, salvo que el manifiesto de la acción declare `UserTitleEnabled: false`.
 * - Si el plugin no define imágenes propias, la apariencia queda libre para el usuario.
 */

export interface ParametrosAparienciaPlugin {
  esPlugin: boolean;
  tieneVisualImagen?: boolean;
  tieneImagenPropia?: boolean;
  userTitleEnabled?: boolean;
}

export interface ReglasAparienciaPlugin {
  bloquearApariencia: boolean;
  bloquearTitulo: boolean;
  controlaImagen: boolean;
  motivoBloqueoApariencia?: string;
  motivoBloqueoTitulo?: string;
}

export function resolverReglasAparienciaPlugin(params: ParametrosAparienciaPlugin): ReglasAparienciaPlugin {
  if (!params.esPlugin) {
    return {
      bloquearApariencia: false,
      bloquearTitulo: false,
      controlaImagen: false,
    };
  }

  // Un plugin controla la imagen si ya envió una imagen visual o si define imágenes propias
  // (por defecto true en acciones de plugin salvo que explícitamente sea false).
  const defineImagenesPropias = params.tieneImagenPropia ?? true;
  const controlaImagen = Boolean(params.tieneVisualImagen || defineImagenesPropias);

  const bloquearTitulo = params.userTitleEnabled === false;

  return {
    bloquearApariencia: controlaImagen,
    bloquearTitulo,
    controlaImagen,
    ...(controlaImagen ? { motivoBloqueoApariencia: 'ed.plugin.aparienciaBloqueada' } : {}),
    ...(bloquearTitulo ? { motivoBloqueoTitulo: 'ed.plugin.tituloBloqueado' } : {}),
  };
}
