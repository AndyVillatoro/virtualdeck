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
 * Cuando movimos la ventana nosotros, para no confundirlo con un arrastre.
 *
 * `setBounds` dispara `moved` igual que si la hubieran arrastrado. Sin esto,
 * recentrar la barra al crecer guardaria una Y en la configuracion, y a partir
 * de ahi dejaria de recentrarse: se centraria una sola vez y nunca mas.
 *
 * Era un **contador**, y ahi estaba el fallo: `setBounds` no emite siempre
 * exactamente un `moved`. Cambiando solo el tamaño no emite ninguno y el
 * contador se quedaba alto, tragandose el siguiente arrastre de verdad;
 * cambiando tamaño y posicion a la vez Windows puede emitir dos, y entonces el
 * segundo pasaba por movimiento del usuario, guardaba una Y y **la barra
 * dejaba de centrarse para siempre**. Que es justo lo reportado.
 *
 * Con una marca de tiempo da igual cuantos eventos lleguen.
 */
let instanteMovimientoPropio = 0;
/** Margen para los `moved` que llegan detras de un `setBounds`. */
const MS_MOVIMIENTO_PROPIO = 400;

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
/**
 * @param recentrar Ignorar la Y guardada y volver al centro de la pantalla.
 *   Se usa cuando cambia el numero de tiles. La Y guardada es el **borde de
 *   arriba**, asi que respetarla al crecer alarga la columna hacia abajo desde
 *   ahi: los tiles nuevos se van cayendo hacia el borde inferior y la barra
 *   deja de estar centrada. Al abrir si se respeta, para que una barra
 *   arrastrada vuelva donde la dejaron.
 */
function posicion(g: GeometriaBarra, recentrar = false): { x: number; y: number; width: number; height: number } {
  const area = screen.getPrimaryDisplay().workArea;
  const w = ancho(g);
  const h = Math.min(alto(g), area.height);
  const x = g.lado === 'right' ? area.x + area.width - w : area.x;
  // Y guardada, pero recortada al área visible: un monitor que cambia de
  // resolución dejaría la barra fuera de la pantalla y sin forma de recuperarla.
  const yCentrada = Math.round(area.y + (area.height - h) / 2);
  const y = (recentrar || g.y === null)
    ? yCentrada
    : Math.min(Math.max(g.y, area.y), area.y + area.height - h);
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
    if (Date.now() - instanteMovimientoPropio < MS_MOVIMIENTO_PROPIO) return;
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
  instanteMovimientoPropio = Date.now();
  // `aplicarGeometria` corre justo cuando cambia la configuracion de la barra
  // —tiles, tamaño, lado—, que es cuando toca volver al centro.
  ventana!.setBounds(posicion(g, true));
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
export function ajustarAlContenido(ancho: number, alto: number): void {
  if (!barraAbierta()) return;
  const b = ventana!.getBounds();
  const area = screen.getPrimaryDisplay().workArea;
  const w = Math.max(24, Math.round(ancho));
  const h = Math.min(Math.max(24, Math.round(alto)), area.height);
  if (Math.abs(b.width - w) < 2 && Math.abs(b.height - h) < 2) return;
  // Si estaba pegada al borde derecho, se mantiene pegada al cambiar de ancho.
  const pegadaDerecha = Math.abs(b.x + b.width - (area.x + area.width)) < 4;
  const x = pegadaDerecha ? area.x + area.width - w : b.x;
  // Al cambiar de tamaño, la columna se vuelve a centrar en la pantalla.
  //
  // Antes solo se centraba mientras el usuario no la hubiera movido nunca:
  // en cuanto arrastraba una vez quedaba una Y guardada y a partir de ahi
  // crecia alrededor de donde la dejo. En la practica eso es «no se centra»,
  // porque cualquiera la mueve el primer dia. Arrastrarla sigue valiendo —se
  // queda donde la sueltes— hasta que cambie el numero de tiles.
  const centroDeseado = area.y + area.height / 2;
  const y = Math.round(Math.min(Math.max(centroDeseado - h / 2, area.y), area.y + area.height - h));
  instanteMovimientoPropio = Date.now();
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

/**
 * Reparte la configuración nueva a **las dos ventanas**.
 *
 * Antes solo iba a la barra: el deck le hablaba a la barra y la barra no le
 * hablaba al deck. Con eso, todo lo que la barra guarda —su posición vertical,
 * y ahora las variables que cambian sus botones— se perdía en cuanto el deck
 * volvía a guardar, porque seguía teniendo en memoria la configuración de
 * antes.
 *
 * Quien lo recibe **no vuelve a guardar**; solo adopta lo que la otra ventana
 * puede cambiar. Sin esa regla esto sería un bucle.
 */
export function avisarCambioDeConfig(data: unknown, principal?: BrowserWindow): void {
  if (barraAbierta()) ventana!.webContents.send('config:changed', data);
  if (principal && !principal.isDestroyed()) principal.webContents.send('config:changed', data);
}

app.on('before-quit', () => { try { cerrarBarra(); } catch { /* ya cerrada */ } });
