import { BrowserWindow, screen, type Display, type Rectangle } from 'electron';

/**
 * En qué monitor vive la ventana, y cómo volver a él (roadmap 103).
 *
 * Antes se guardaban solo x/y/ancho/alto, y la ventana acababa en el monitor
 * principal por tres caminos que se encadenaban:
 *
 * 1. Al arrancar con la sesión (`--oculto`) el segundo monitor a veces aún no
 *    está enumerado: las coordenadas guardadas no caían en ninguna pantalla y
 *    se recentraba en la principal.
 * 2. Si el monitor se dormía o se desconectaba (DisplayPort en ahorro, KVM),
 *    `display-removed` movía la ventana a la principal **y ese movimiento se
 *    guardaba**: desde ahí, todos los arranques eran en la principal.
 * 3. Cuando el monitor volvía, nadie devolvía la ventana.
 *
 * Ahora se guarda la **huella** del monitor (nombre, tamaño y escala; el id de
 * Windows cambia entre reinicios y puertos) y la posición relativa a su área de
 * trabajo. Lo que la propia aplicación recoloca no se guarda, y si el monitor
 * preferido no está, se queda **pendiente** y la ventana vuelve en cuanto
 * aparece.
 */

export interface HuellaMonitor {
  etiqueta: string;
  ancho: number;
  alto: number;
  escala: number;
  /** Posición de la ventana relativa al área de trabajo de ese monitor. */
  relX: number;
  relY: number;
}

export function huellaDe(d: Display, ventana: Rectangle): HuellaMonitor {
  return {
    etiqueta: (d.label ?? '').trim(),
    ancho: d.bounds.width,
    alto: d.bounds.height,
    escala: d.scaleFactor,
    relX: ventana.x - d.workArea.x,
    relY: ventana.y - d.workArea.y,
  };
}

/**
 * El monitor de la huella entre los conectados, del criterio más fiable al
 * menos: nombre y tamaño, tamaño y escala (monitores sin nombre), solo nombre
 * (cambió la resolución).
 */
export function buscarMonitor(h: HuellaMonitor, monitores: Display[] = screen.getAllDisplays()): Display | null {
  const mismoTamano = (d: Display) => d.bounds.width === h.ancho && d.bounds.height === h.alto;
  const etiqueta = (d: Display) => (d.label ?? '').trim();
  return (
    (h.etiqueta && monitores.find((d) => etiqueta(d) === h.etiqueta && mismoTamano(d))) ||
    monitores.find((d) => mismoTamano(d) && d.scaleFactor === h.escala) ||
    (h.etiqueta && monitores.find((d) => etiqueta(d) === h.etiqueta)) ||
    null
  );
}

/** Los límites de la ventana dentro de ese monitor, sin salirse de su área de trabajo. */
export function limitesEn(d: Display, h: HuellaMonitor, ancho: number, alto: number): Rectangle {
  const a = d.workArea;
  const w = Math.min(ancho, a.width);
  const hh = Math.min(alto, a.height);
  const x = Math.min(Math.max(a.x + h.relX, a.x), a.x + a.width - w);
  const y = Math.min(Math.max(a.y + h.relY, a.y), a.y + a.height - hh);
  return { x: Math.round(x), y: Math.round(y), width: w, height: hh };
}

// ── Estado de la ventana principal ─────────────────────────────────────────

/** El monitor donde el usuario dejó la ventana y que ahora no está conectado. */
let pendiente: HuellaMonitor | null = null;
/** La aplicación está moviendo la ventana: ese `moved` no es del usuario. */
let moviendoPorCodigo = false;

export function hayMonitorPendiente(): boolean {
  return pendiente !== null;
}

export function marcarPendiente(h: HuellaMonitor | null): void {
  pendiente = h;
}

/** ¿Este `moved`/`resized` lo provocó la aplicación? Entonces no se guarda. */
export function esMovimientoPropio(): boolean {
  return moviendoPorCodigo;
}

/** Mueve la ventana sin que el movimiento cuente como elección del usuario. */
export function moverSinGuardar(win: BrowserWindow, b: Rectangle): void {
  if (win.isDestroyed()) return;
  moviendoPorCodigo = true;
  win.setBounds(b);
  // Los eventos `moved`/`resized` llegan después de `setBounds`; el guardado
  // va con 500 ms de retardo, así que basta con cubrir ese margen.
  setTimeout(() => { moviendoPorCodigo = false; }, 800);
}

/** Si el monitor pendiente ya está, devuelve la ventana a él. */
export function volverAlPendiente(win: BrowserWindow): boolean {
  if (!pendiente || win.isDestroyed()) return false;
  const d = buscarMonitor(pendiente);
  if (!d) return false;
  const actual = win.getNormalBounds();
  const destino = limitesEn(d, pendiente, actual.width, actual.height);
  const estabaMax = win.isMaximized();
  if (estabaMax) win.unmaximize();
  moverSinGuardar(win, destino);
  if (estabaMax) win.maximize();
  console.log(`[ventana] de vuelta en «${pendiente.etiqueta || `${pendiente.ancho}x${pendiente.alto}`}»`);
  pendiente = null;
  return true;
}

/**
 * Tras arrancar, el monitor preferido puede tardar en aparecer y no siempre
 * llega un `display-added` (ya estaba conectado pero sin enumerar). Se mira
 * cada 2 s durante el primer minuto.
 */
export function vigilarPendienteAlArrancar(win: BrowserWindow): void {
  if (!pendiente) return;
  let intentos = 0;
  const t = setInterval(() => {
    intentos++;
    if (win.isDestroyed() || !pendiente || volverAlPendiente(win) || intentos >= 30) clearInterval(t);
  }, 2000);
}
