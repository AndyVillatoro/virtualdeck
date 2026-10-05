import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  ButtonConfig, DeckConfig, DisposicionSuperficie, ElectronAPI, InfoSuperficie,
} from '../../types';
import { botonesResueltos } from '../botonesFijos';
import { huecoDeEntrada, huecosDeControl, teclasLcd } from './disposicion';
import {
  claveModoPerilla, podarModosHuerfanos, podarModosPorPagina, resolverEntradaPerilla,
} from './modosPerilla';
import { playModo, sonidoActivo, perfilSonido } from '../sound';
import {
  esAppPropia, idPaginaSegunApp, idPaginaPredeterminada, normalizarApp,
} from './paginaSegunApp';
import { brilloDeSuperficie, rotacionDeSuperficie } from './ajustesSuperficie';
import {
  fuentesLcdListas, pintarTecla, prepararFuentesLcd,
  type ColoresSuperficie, type OpcionesPintado,
} from './pintarTecla';

/**
 * El pegamento entre el deck y los dispositivos físicos.
 *
 * Mantiene la lista viva de superficies, la tabla de modelos y **la última
 * imagen que se mandó a cada tecla** (sin rotar, como data URL) para que la
 * pantalla enseñe exactamente lo que recibió el aparato.
 *
 * Crea la página propia de cada dispositivo la primera vez que aparece,
 * convierte cada entrada del hardware en la pulsación del botón de su hueco y
 * mantiene las teclas LCD pintadas —solo las que cambiaron, comparando una
 * firma por tecla— con el brillo aplicado. La firma incluye si las fuentes
 * reales (JetBrains Mono, DotGothic16) ya cargaron, para repintar cuando
 * lleguen. En una perilla multimodo (`modosPerilla`, T-HW-19) pulsar cambia
 * el modo activo en memoria y girar dispara lo del modo activo, no lo del
 * hueco (ver `decidirPerilla`).
 *
 * Cada dispositivo puede tener **varias páginas** (todas las que lleven su
 * serial) y enseña la **activa**, que se guarda por id de página en `activas`
 * y no en la config: borrar o reordenar renumera los índices. La activa
 * cambia sola con la aplicación en primer plano (`idPaginaSegunApp`, con el
 * mismo evento y filtro que `useAutoProfile`) o a mano con `activarPagina`.
 * Lo elegido a mano es además la **base**: cuando la app en primer plano no
 * tiene página vinculada, se vuelve a la base y no a la primera.
 *
 * `config` y `dispararBoton` se leen **por referencia** dentro de los
 * manejadores: son funciones/valores que se registran una sola vez en el
 * proceso principal y quedarían con el estado del primer render (ver
 * `CLAUDE.md`, el caso de `toggledIds`).
 *
 * El brillo en vivo no pasa por aquí: la pantalla llama a
 * `api.superficies.brillo` mientras se desliza (y `fijarBrilloSuperficie` al
 * soltar). Este hook solo aplica el valor de la página cuando **cambia** o
 * cuando el dispositivo aparece, y recuerda lo último que aplicó para no
 * pisar lo que se acaba de poner en vivo.
 */

export interface OpcionesSuperficies extends OpcionesPintado {
  api: ElectronAPI | undefined;
  config: DeckConfig;
  dispararBoton: (boton: ButtonConfig, opts?: { sonido?: 'giro'; serial?: string }) => void;
  crearPaginaSuperficie: (info: InfoSuperficie) => void;
  colores: ColoresSuperficie;
  /** Aviso al cambiar de modo en una perilla multimodo (lo pinta quien llama). */
  alCambiarModo?: (info: {
    serial: string;
    /** Perilla en base 1, para enseñar. */
    perilla: number;
    /** Modo activo en base 0 (0 = los huecos de la perilla). */
    modo: number;
    total: number;
    label: string;
  }) => void;
}

export interface Superficies {
  dispositivos: InfoSuperficie[];
  modelos: Record<string, DisposicionSuperficie>;
  /** Última imagen pintada por serial, indexada por hueco. */
  imagenes: Record<string, (string | undefined)[]>;
  /** Página activa de cada serial, por id de página (ver `paginaSegunApp`). */
  paginasActivas: Record<string, string>;
  /** Modo activo de cada perilla multimodo, por `claveModoPerilla`. En memoria. */
  modosActivos: Record<string, number>;
  /** Pone una página activa en el aparato (la pestaña elegida en DispositivosB). */
  activarPagina: (serial: string, paginaId: string) => void;
}

interface PaginaDispositivo {
  indice: number;
  disposicion: DisposicionSuperficie;
  rotacion?: number;
  brillo?: number;
  botones: ButtonConfig[];
}

/** La página activa de un serial y sus botones, en orden de hueco (por posición). */
function paginaDe(
  config: DeckConfig, serial: string, disposicion: DisposicionSuperficie, paginaId?: string,
): PaginaDispositivo | null {
  const delSerial: number[] = [];
  config.pages.forEach((p, i) => { if (p.superficie?.serial === serial) delSerial.push(i); });
  if (delSerial.length === 0) return null;
  // Por id, nunca por índice: borrar o reordenar páginas renumera los
  // índices. Si el id ya no existe, se vuelve a la predeterminada.
  let indice = paginaId !== undefined
    ? delSerial.find((i) => config.pages[i].id === paginaId)
    : undefined;
  if (indice === undefined) {
    const predeterminada = idPaginaPredeterminada(config.pages, serial);
    indice = delSerial.find((i) => config.pages[i].id === predeterminada) ?? delSerial[0];
  }
  if (!config.pages[indice].superficie) return null;
  return {
    indice,
    disposicion,
    rotacion: rotacionDeSuperficie(config, serial),
    brillo: brilloDeSuperficie(config, serial),
    // Resueltos con los fijos del dock: lo que se pinta es lo que se dispara
    // al pulsar (y viceversa), en el mismo hueco.
    botones: botonesResueltos(config, indice),
  };
}

/** Lo que se dibuja de una tecla. Si no cambia, no se vuelve a pintar. */
function firmaDe(
  boton: ButtonConfig | undefined, ancho: number, alto: number, rotacion: number,
  colores: ColoresSuperficie, fuentes: boolean,
): string {
  if (!boton) return `empty:${ancho}:${alto}:${rotacion}:${fuentes}`;
  return JSON.stringify([
    boton.label, boton.icon, boton.imageData, boton.customGlyph57, boton.brandIcon,
    boton.brandIconCustomBitmap, boton.brandIconCustomColor, boton.brandIconCustomPalette,
    boton.bgColor, boton.fgColor, boton.action?.type,
    ancho, alto, rotacion, colores.fondo, colores.texto, fuentes,
  ]);
}

/** Pinta las teclas cuya firma cambió y devuelve las imágenes nuevas por hueco. */
async function pintarCambiadas(
  api: ElectronAPI,
  serial: string,
  pagina: PaginaDispositivo,
  colores: ColoresSuperficie,
  opciones: OpcionesPintado,
  firmas: Map<string, string[]>,
  fuentes: boolean,
): Promise<Record<number, string>> {
  const previas = firmas.get(serial) ?? [];
  const nuevas: string[] = [];
  const pintadas: Record<number, string> = {};
  for (const { hueco, indice, lcd } of teclasLcd(pagina.disposicion)) {
    const boton = pagina.botones[hueco];
    const rotacion = pagina.rotacion ?? lcd.rotacion;
    const firma = firmaDe(boton, lcd.ancho, lcd.alto, rotacion, colores, fuentes);
    nuevas[hueco] = firma;
    if (previas[hueco] === firma) continue;
    const imagen = await pintarTecla(boton ?? null, lcd, colores, opciones, rotacion);
    await api.superficies.imagen(serial, indice, imagen.jpegBase64);
    if (imagen.dataUrl) pintadas[hueco] = imagen.dataUrl;
  }
  firmas.set(serial, nuevas);
  return pintadas;
}

function aplicarBrillo(
  api: ElectronAPI,
  serial: string,
  brillo: number | undefined,
  aplicados: Map<string, number>,
): void {
  if (brillo === undefined || aplicados.get(serial) === brillo) return;
  aplicados.set(serial, brillo);
  void api.superficies.brillo(serial, brillo);
}

type DecisionPerilla =
  | { kind: 'normal' }
  | { kind: 'nada' }
  | { kind: 'cambiarModo'; siguiente: number; total: number; label: string }
  | { kind: 'disparar'; boton: ButtonConfig; giro: boolean };

/**
 * Los tres botones de una perilla (izq, pulsar, der), por índice de perilla.
 * `null` si el modelo no trae ese control o los huecos no cuadran.
 */
function trioDePerilla(
  pagina: PaginaDispositivo,
  indice: number,
): { izq: ButtonConfig | undefined; pulsar: ButtonConfig | undefined; der: ButtonConfig | undefined } | null {
  const control = pagina.disposicion.controles
    .find((c) => c.tipo === 'knob' && c.indice === indice);
  if (!control) return null;
  const huecos = huecosDeControl(pagina.disposicion, control);
  if (huecos[0] === undefined || huecos[1] === undefined || huecos[2] === undefined) return null;
  return {
    izq: pagina.botones[huecos[0]],
    pulsar: pagina.botones[huecos[1]],
    der: pagina.botones[huecos[2]],
  };
}

/**
 * Entrada de una perilla: multimodo o lo de antes (T-HW-19).
 *
 * Si el botón del hueco «pulsar» trae `modosPerilla`, la decisión sale de
 * `resolverEntradaPerilla` (función pura); si no, `normal` y quien llama sigue
 * el camino de antes. No toca estado ni suena: solo decide.
 */
function decidirPerilla(
  pagina: PaginaDispositivo,
  entrada: { indice: number; gesto: 'down' | 'up' | 'izq' | 'der' },
  modoActual: number,
): DecisionPerilla {
  if (entrada.gesto !== 'izq' && entrada.gesto !== 'der' && entrada.gesto !== 'down') {
    return { kind: 'normal' };
  }
  const trio = trioDePerilla(pagina, entrada.indice);
  const modos = trio?.pulsar?.modosPerilla ?? [];
  if (!trio || modos.length === 0) return { kind: 'normal' };
  const gesto = entrada.gesto === 'down' ? 'pulsar' : entrada.gesto;
  const res = resolverEntradaPerilla({
    gesto,
    botonIzq: trio.izq,
    botonPulsar: trio.pulsar,
    botonDer: trio.der,
    modoActual,
  });
  if (res.kind === 'cambiarModo') {
    return {
      kind: 'cambiarModo',
      siguiente: res.siguiente,
      total: res.total,
      label: res.siguiente === 0
        ? (trio.pulsar?.label ?? '')
        : (modos[res.siguiente - 1]?.label ?? ''),
    };
  }
  if (res.kind === 'disparar') return { kind: 'disparar', boton: res.boton, giro: gesto !== 'pulsar' };
  return { kind: 'nada' };
}

export function useSuperficies({
  api, config, dispararBoton, crearPaginaSuperficie, colores, iconoSvg, esGlifoDot, alCambiarModo,
}: OpcionesSuperficies): Superficies {
  const [dispositivos, setDispositivos] = useState<InfoSuperficie[]>([]);
  const [modelos, setModelos] = useState<Record<string, DisposicionSuperficie>>({});
  const [imagenes, setImagenes] = useState<Record<string, (string | undefined)[]>>({});
  const [fuentesListas, setFuentesListas] = useState(false);
  /** Página activa de cada serial, por id de página. En memoria: no se guarda. */
  const [activas, setActivas] = useState<Record<string, string>>({});
  /** Base elegida a mano de cada serial, por id de página. En memoria. */
  const [bases, setBases] = useState<Record<string, string>>({});
  /** Modo activo de cada perilla multimodo, por `claveModoPerilla`. En memoria. */
  const [modos, setModos] = useState<Record<string, number>>({});

  const configRef = useRef(config);
  const dispositivosRef = useRef(dispositivos);
  const imagenesRef = useRef(imagenes);
  const activasRef = useRef(activas);
  const basesRef = useRef(bases);
  const modosRef = useRef(modos);
  const dispararRef = useRef(dispararBoton);
  const crearRef = useRef(crearPaginaSuperficie);
  const alCambiarModoRef = useRef(alCambiarModo);
  const iconoRef = useRef(iconoSvg);
  const esGlifoDotRef = useRef(esGlifoDot);
  configRef.current = config;
  dispositivosRef.current = dispositivos;
  imagenesRef.current = imagenes;
  activasRef.current = activas;
  basesRef.current = bases;
  modosRef.current = modos;
  dispararRef.current = dispararBoton;
  crearRef.current = crearPaginaSuperficie;
  alCambiarModoRef.current = alCambiarModo;
  iconoRef.current = iconoSvg;
  esGlifoDotRef.current = esGlifoDot;

  const creadas = useRef(new Set<string>());
  const firmas = useRef(new Map<string, string[]>());
  const brillos = useRef(new Map<string, number>());
  const conectadosAntes = useRef(new Set<string>());

  useEffect(() => {
    if (!api) return;
    let vivo = true;
    api.superficies.listar()
      .then((lista) => { if (vivo) setDispositivos(lista); })
      .catch(() => {});
    api.superficies.modelos()
      .then((tabla) => { if (vivo) setModelos(tabla); })
      .catch(() => {});
    const desuscribir = api.superficies.onCambio((lista) => { if (vivo) setDispositivos(lista); });
    return () => { vivo = false; desuscribir(); };
  }, [api]);

  // Las fuentes pueden llegar después del primer pintado: `loadingdone` repinta.
  useEffect(() => {
    let vivo = true;
    const alListo = () => { if (vivo) setFuentesListas(fuentesLcdListas()); };
    void prepararFuentesLcd().then(alListo);
    if (typeof document !== 'undefined' && document.fonts) {
      document.fonts.addEventListener('loadingdone', alListo);
    }
    return () => {
      vivo = false;
      if (typeof document !== 'undefined' && document.fonts) {
        document.fonts.removeEventListener('loadingdone', alListo);
      }
    };
  }, []);

  useEffect(() => {
    if (!api) return;
    return api.superficies.onEntrada((entrada) => {
      const dispositivo = dispositivosRef.current.find((d) => d.serial === entrada.serial);
      if (!dispositivo) return;
      const pagina = paginaDe(
        configRef.current, entrada.serial, dispositivo.disposicion, activasRef.current[entrada.serial],
      );
      if (!pagina) return;
      // Perilla multimodo (T-HW-19): pulsar cambia de modo, girar ejecuta el
      // modo activo. Sin `modosPerilla` la decisión es `normal` y sigue abajo.
      if (entrada.control === 'knob') {
        const clave = claveModoPerilla(entrada.serial, entrada.indice);
        const decision = decidirPerilla(pagina, entrada, modosRef.current[clave] ?? 0);
        if (decision.kind === 'cambiarModo') {
          setModos((prev) => ({ ...prev, [clave]: decision.siguiente }));
          const cfg = configRef.current;
          if (sonidoActivo(cfg)) playModo(perfilSonido(cfg));
          alCambiarModoRef.current?.({
            serial: entrada.serial,
            perilla: entrada.indice + 1,
            modo: decision.siguiente,
            total: decision.total,
            label: decision.label,
          });
          return;
        }
        if (decision.kind === 'disparar') {
          if (decision.boton.action.type === 'none') return;
          if (decision.giro) {
            dispararRef.current(decision.boton, { sonido: 'giro', serial: entrada.serial });
          } else {
            dispararRef.current(decision.boton, { serial: entrada.serial });
          }
          return;
        }
        if (decision.kind === 'nada') return;
      }
      const hueco = huecoDeEntrada(pagina.disposicion, entrada);
      if (hueco === null) return;
      const boton = pagina.botones[hueco];
      if (!boton || boton.action.type === 'none') return;
      // Girar una perilla o deslizar una tira (izq/der) suena con el tic de
      // giro; pulsar (down) suena como siempre. El serial viaja en `opts` para
      // que un botón `page-nav` navegue entre las páginas de **este** dock.
      if (entrada.gesto === 'izq' || entrada.gesto === 'der') {
        dispararRef.current(boton, { sonido: 'giro', serial: entrada.serial });
      } else {
        dispararRef.current(boton, { serial: entrada.serial });
      }
    });
  }, [api]);

  // Cada dispositivo cambia su página con la aplicación en primer plano,
  // por su cuenta: mismo evento, misma normalización y mismo filtro que
  // `useAutoProfile`, y el mismo `autoProfileSwitch === false` para apagarlo.
  useEffect(() => {
    if (!api?.events?.onActiveAppChanged) return;
    const aplicarApp = (nombre: string | null | undefined) => {
      const app = normalizarApp(nombre);
      if (esAppPropia(app)) return;
      const paginas = configRef.current.pages;
      if (configRef.current.autoProfileSwitch === false) return;
      const seriales = new Set<string>();
      for (const p of paginas) if (p.superficie) seriales.add(p.superficie.serial);
      if (seriales.size === 0) return;
      setActivas((prev) => {
        let cambio = false;
        const next = { ...prev };
        for (const serial of seriales) {
          // Sin vínculo se vuelve a la base elegida a mano, no a la primera.
          const id = idPaginaSegunApp(paginas, serial, app, basesRef.current[serial] ?? null);
          if (id && next[serial] !== id) { next[serial] = id; cambio = true; }
        }
        return cambio ? next : prev;
      });
    };
    const alCambiar = (info: { processName: string | null; windowTitle: string | null } | null) => {
      if (info) aplicarApp(info.processName);
    };
    api.window?.getActiveApp?.()
      .then((app) => { if (app) aplicarApp(app.processName); })
      .catch(() => {});
    const off = api.events.onActiveAppChanged(alCambiar);
    return () => { off?.(); };
  }, [api]);

  // Si la página activa o la base de un serial ya no existe (borrada), se
  // olvida: al resolver se vuelve a la predeterminada.
  useEffect(() => {
    setActivas((prev) => {
      const seriales = Object.keys(prev);
      if (seriales.length === 0) return prev;
      let cambio = false;
      const next = { ...prev };
      for (const serial of seriales) {
        const vive = config.pages.some((p) => p.id === next[serial] && p.superficie?.serial === serial);
        if (!vive) { delete next[serial]; cambio = true; }
      }
      return cambio ? next : prev;
    });
    setBases((prev) => {
      const seriales = Object.keys(prev);
      if (seriales.length === 0) return prev;
      let cambio = false;
      const next = { ...prev };
      for (const serial of seriales) {
        const vive = config.pages.some((p) => p.id === next[serial] && p.superficie?.serial === serial);
        if (!vive) { delete next[serial]; cambio = true; }
      }
      return cambio ? next : prev;
    });
    // Los modos de un serial sin páginas son llaves muertas: se olvidan.
    setModos((prev) => {
      const vivos: string[] = [];
      for (const p of config.pages) if (p.superficie) vivos.push(p.superficie.serial);
      return podarModosHuerfanos(prev, vivos);
    });
  }, [config.pages]);

  // El modo activo es por página del dock: al cambiar, vuelve a 0.
  const activasAnteriores = useRef(activas);
  useEffect(() => {
    const antes = activasAnteriores.current;
    activasAnteriores.current = activas;
    setModos((prev) => podarModosPorPagina(prev, antes, activas));
  }, [activas]);

  /** Pone una página activa en el aparato. El id tiene que ser de ese serial. */
  const activarPagina = useCallback((serial: string, paginaId: string) => {
    const esDelSerial = configRef.current.pages
      .some((p) => p.id === paginaId && p.superficie?.serial === serial);
    if (!esDelSerial) return;
    // Lo elegido a mano es la base: ahí se vuelve cuando la app en primer
    // plano no tiene página vinculada.
    setBases((prev) => (prev[serial] === paginaId ? prev : { ...prev, [serial]: paginaId }));
    setActivas((prev) => (prev[serial] === paginaId ? prev : { ...prev, [serial]: paginaId }));
  }, []);

  const fondo = colores.fondo;
  const texto = colores.texto;
  useEffect(() => {
    if (!api) return;
    const conectados = dispositivos.filter((d) => d.conectado);

    // Al reconectar, el dispositivo perdió las imágenes: firma y brillo se olvidan.
    const ahora = new Set(conectados.map((d) => d.serial));
    for (const serial of ahora) {
      if (!conectadosAntes.current.has(serial)) {
        firmas.current.delete(serial);
        brillos.current.delete(serial);
      }
    }
    conectadosAntes.current = ahora;

    void (async () => {
      const nuevasImagenes = { ...imagenesRef.current };
      let cambio = false;
      for (const dispositivo of conectados) {
        const pagina = paginaDe(
          config, dispositivo.serial, dispositivo.disposicion, activas[dispositivo.serial],
        );
        if (!pagina) {
          if (!creadas.current.has(dispositivo.serial)) {
            creadas.current.add(dispositivo.serial);
            crearRef.current(dispositivo);
          }
          continue;
        }
        aplicarBrillo(api, dispositivo.serial, pagina.brillo, brillos.current);
        const pintadas = await pintarCambiadas(
          api, dispositivo.serial, pagina, { fondo, texto },
          { iconoSvg: iconoRef.current, esGlifoDot: esGlifoDotRef.current }, firmas.current, fuentesListas,
        );
        const huecos = Object.keys(pintadas);
        if (huecos.length === 0) continue;
        const previas = nuevasImagenes[dispositivo.serial] ? [...nuevasImagenes[dispositivo.serial]] : [];
        for (const hueco of huecos) previas[Number(hueco)] = pintadas[Number(hueco)];
        nuevasImagenes[dispositivo.serial] = previas;
        cambio = true;
      }
      if (cambio) setImagenes(nuevasImagenes);
    })();
  }, [api, config, dispositivos, activas, fondo, texto, fuentesListas]);

  return { dispositivos, modelos, imagenes, paginasActivas: activas, modosActivos: modos, activarPagina };
}
