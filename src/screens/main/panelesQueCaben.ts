// Movido tal cual desde el pie de `MainB.tsx` (la cabecera “Folder sub-deck
// overlay” venía arrastrada y viaja con la función).

/**
 * Qué paneles laterales se enseñan según el ancho (ver el comentario en
 * `MainB`). En `barra` el panel de música encendido sustituye a la barra
 * lateral: ahí el ancho es para la rejilla, no para dos columnas.
 */
export function panelesQueCaben<P extends { enabled: boolean }>(ancho: number, showSidebar: boolean, panelMusica: P, enBarra = false) {
  const cabeLateral = ancho >= 760;
  const cabenAmbos = ancho >= 1100;
  const verBarraLateral = showSidebar && cabeLateral && !(enBarra && panelMusica.enabled);
  const panelMusicaVisible: P = {
    ...panelMusica,
    enabled: panelMusica.enabled && cabeLateral && (enBarra || cabenAmbos || !verBarraLateral),
  };
  return { verBarraLateral, panelMusicaVisible };
}
