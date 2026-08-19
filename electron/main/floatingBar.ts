import { BrowserWindow, screen, app } from 'electron';
import { join } from 'path';

/**
 * Barra flotante: una columna de tiles que vive por encima de todo.
 *
 * Es una ventana aparte y no un panel dentro de la principal porque tiene que
 * poder estar en **otro monitor** que el deck, quedarse por delante de las demás
 * aplicaciones, y no tener fondo. Nada de eso se puede hacer desde dentro de la
 * ventana principal.
 *
 * Carga el mismo `index.html` con `#barra`; el renderer mira ese hash y dibuja
 * la barra en vez de la aplicación entera (ver `src/main.tsx`).
 */

const isDev = process.env.NODE_ENV === 'development';

let ventana: BrowserWindow | null = null;

/**
 * Movimientos hechos por nosotros, que no cuentan como "el usuario la movio".
 *
 * `setBounds` dispara `moved` igual que si la hubieran arrastrado. Sin esto,
 * recentrar la barra al crecer guardaria una Y en la configuracion, y a partir
 * de ahi dejaria de recentrarse: se centraria una sola vez y nunca mas.
 */
let movimientoPropio = 0;

export interface GeometriaBarra {
  /** Cuántos tiles caben. */
  huecos: number;
  /** Lado del monitor principal donde se pega. */
  lado: 'left' | 'right';
  /** Lado del tile en px (sin contar separación). */
  tile: number;
  /** Y absoluta guardada. `null` = centrada verticalmente. */
  y: number | null;
}

const SEPARACION = 8;
const MARGEN = 12;

/** Alto total que necesita la columna, incluida la fila del botón de cerrar. */
function alto(g: GeometriaBarra): number {
  return g.huecos * g.tile + Math.max(0, g.huecos - 1) * SEPARACION + MARGEN * 2;
}

function ancho(g: GeometriaBarra): number {
  return g.tile + MARGEN * 2;
}

/**
 * Dónde se coloca. Siempre en el monitor **principal**, aunque el deck esté en
 * otro: la barra es para tenerla a mano donde se trabaja, y el monitor principal
 * es la única referencia que no depende de dónde quedó la ventana del deck.
 */
function posicion(g: GeometriaBarra): { x: number; y: number; width: number; height: number } {
  const area = screen.getPrimaryDisplay().workArea;
  const w = ancho(g);
  const h = Math.min(alto(g), area.height);
  const x = g.lado === 'right' ? area.x + area.width - w : area.x;
  // Y guardada, pero recortada al área visible: un monitor que cambia de
  // resolución dejaría la barra fuera de la pantalla y sin forma de recuperarla.
  const yCentrada = Math.round(area.y + (area.height - h) / 2);
  const y = g.y === null ? yCentrada : Math.min(Math.max(g.y, area.y), area.y + area.height - h);
  return { x, y, width: w, height: h };
}

export function barraAbierta(): boolean {
  return !!ventana && !ventana.isDestroyed();
}

export function abrirBarra(g: GeometriaBarra): void {
  if (barraAbierta()) {
    aplicarGeometria(g);
    ventana!.showInactive();
    return;
  }

  const p = posicion(g);
  ventana = new BrowserWindow({
    ...p,
    frame: false,
    transparent: true,
    // Sin sombra: con `transparent` Windows dibuja la sombra sobre el
    // rectángulo entero de la ventana, no sobre los tiles, y se ve un marco
    // gris flotando alrededor de nada.
    hasShadow: false,
    resizable: false,
    movable: true,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    // No roba el foco al aparecer: la barra se pulsa de pasada, sin dejar de
    // trabajar en lo que haya debajo.
    focusable: true,
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true, contextIsolation: true, nodeIntegration: false,
      // Sesión propia, y no la del deck, por el **zoom**.
      //
      // Chromium guarda el nivel de zoom por origen y por sesión. El deck y la
      // barra cargan el mismo `index.html`, o sea el mismo origen: con la sesión
      // compartida, poner la interfaz al 150 % agrandaba también el contenido de
      // la barra, que tiene el tamaño de ventana calculado en píxeles y se
      // quedaba recortada — se veían tres tiles de cuatro y no había forma de
      // llegar al resto.
      //
      // El tamaño de los tiles de la barra se ajusta en su propia pantalla.
      partition: 'persist:vd-barra',
      zoomFactor: 1,
    },
  });

  ventana.setAlwaysOnTop(true, 'screen-saver');
  // Que siga visible aunque el usuario cambie de escritorio virtual.
  ventana.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  ventana.once('ready-to-show', () => ventana?.showInactive());

  // Al moverla, avisar a su propio renderer para que guarde la Y. El proceso
  // principal no escribe configuracion: de eso se encarga siempre el renderer.
  let temporizador: NodeJS.Timeout | null = null;
  ventana.on('moved', () => {
    if (temporizador) clearTimeout(temporizador);
    if (movimientoPropio > 0) { movimientoPropio -= 1; return; }
    temporizador = setTimeout(() => {
      if (!barraAbierta()) return;
      ventana!.webContents.send('bar:moved', ventana!.getBounds().y);
    }, 400);
  });
  ventana.on('closed', () => { ventana = null; });

  if (isDev && process.env['ELECTRON_RENDERER_URL']) {
    ventana.loadURL(`${process.env['ELECTRON_RENDERER_URL']}#barra`);
  } else {
    ventana.loadFile(join(__dirname, '../renderer/index.html'), { hash: 'barra' });
  }
}

export function cerrarBarra(): void {
  if (!barraAbierta()) return;
  ventana!.close();
  ventana = null;
}

export function aplicarGeometria(g: GeometriaBarra): void {
  if (!barraAbierta()) return;
  movimientoPropio += 1;
  ventana!.setBounds(posicion(g));
}

/**
 * Ajusta la ventana al contenido que el renderer dice necesitar.
 *
 * Red de seguridad para que no vuelva a pasar lo del recorte: el alto se
 * calcula aquí a partir de la configuración, pero cualquier diferencia de zoom,
 * fuente o densidad de pantalla cambia lo que ocupa de verdad. En vez de
 * confiar en la cuenta, la barra se mide después de dibujarse y pide el tamaño
 * exacto.
 */
export function ajustarAlContenido(ancho: number, alto: number, centrar: boolean): void {
  if (!barraAbierta()) return;
  const b = ventana!.getBounds();
  const area = screen.getPrimaryDisplay().workArea;
  const w = Math.max(24, Math.round(ancho));
  const h = Math.min(Math.max(24, Math.round(alto)), area.height);
  if (Math.abs(b.width - w) < 2 && Math.abs(b.height - h) < 2) return;
  // Si estaba pegada al borde derecho, se mantiene pegada al cambiar de ancho.
  const pegadaDerecha = Math.abs(b.x + b.width - (area.x + area.width)) < 4;
  const x = pegadaDerecha ? area.x + area.width - w : b.x;
  // Al crecer, la columna **no** se alarga hacia abajo.
  //
  // Si el usuario no la ha movido, se recentra en la pantalla. Si la movió, se
  // reparte alrededor del centro donde la dejó. En los dos casos los tiles
  // nuevos salen mitad arriba y mitad abajo, en vez de irse cayendo hacia el
  // borde inferior hasta chocar con él.
  const centroDeseado = centrar
    ? area.y + area.height / 2
    : b.y + b.height / 2;
  const y = Math.round(Math.min(Math.max(centroDeseado - h / 2, area.y), area.y + area.height - h));
  movimientoPropio += 1;
  ventana!.setBounds({ x, y, width: w, height: h });
}

/**
 * Cuántos tiles de `tile` px caben de alto en el monitor principal.
 *
 * Se calcula aquí y no en la pantalla de ajustes porque el deck puede estar en
 * otro monitor: `window.screen` daría el del deck, no el de la barra.
 */
export function huecosQueCaben(tile: number): number {
  const area = screen.getPrimaryDisplay().workArea;
  const util = area.height - MARGEN * 2 + SEPARACION;
  return Math.max(1, Math.floor(util / (Math.max(8, tile) + SEPARACION)));
}

/** Y actual, para guardarla cuando el usuario mueve la barra. */
export function posicionActual(): { y: number } | null {
  if (!barraAbierta()) return null;
  return { y: ventana!.getBounds().y };
}

/** Reenvía la config nueva a la barra para que se redibuje sin recargarla. */
export function avisarCambioDeConfig(data: unknown): void {
  if (!barraAbierta()) return;
  ventana!.webContents.send('config:changed', data);
}

app.on('before-quit', () => { try { cerrarBarra(); } catch { /* ya cerrada */ } });
