import { useEffect, useRef, useState } from 'react';
import type {
  ButtonConfig, DeckConfig, DisposicionSuperficie, ElectronAPI, InfoSuperficie,
} from '../../types';
import { huecoDeEntrada, teclasLcd } from './disposicion';
import { pintarTecla, type ColoresSuperficie, type OpcionesPintado } from './pintarTecla';

/**
 * El pegamento entre el deck y los dispositivos físicos.
 *
 * Mantiene la lista viva de superficies y la tabla de modelos, crea la página
 * propia de cada dispositivo la primera vez que aparece, convierte cada
 * entrada del hardware en la pulsación del botón de su hueco y mantiene las
 * teclas LCD pintadas —solo las que cambiaron, comparando una firma por
 * tecla— con el brillo aplicado.
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
  dispararBoton: (boton: ButtonConfig) => void;
  crearPaginaSuperficie: (info: InfoSuperficie) => void;
  colores: ColoresSuperficie;
}

interface PaginaDispositivo {
  indice: number;
  disposicion: DisposicionSuperficie;
  rotacion?: number;
  brillo?: number;
  botones: ButtonConfig[];
}

/** La página de un serial y sus botones, en orden de hueco (por posición). */
function paginaDe(config: DeckConfig, serial: string, disposicion: DisposicionSuperficie): PaginaDispositivo | null {
  const indice = config.pages.findIndex((p) => p.superficie?.serial === serial);
  if (indice < 0) return null;
  const superficie = config.pages[indice].superficie;
  if (!superficie) return null;
  return {
    indice,
    disposicion,
    rotacion: superficie.rotacion,
    brillo: superficie.brillo,
    botones: config.buttons.filter((b) => b.page === indice),
  };
}

/** Lo que se dibuja de una tecla. Si no cambia, no se vuelve a pintar. */
function firmaDe(boton: ButtonConfig | undefined, ancho: number, alto: number, rotacion: number, colores: ColoresSuperficie): string {
  if (!boton) return 'empty';
  return JSON.stringify([
    boton.label, boton.icon, boton.imageData, boton.customGlyph57, boton.brandIcon,
    boton.brandIconCustomBitmap, boton.brandIconCustomColor, boton.brandIconCustomPalette,
    boton.bgColor, boton.fgColor, boton.action?.type,
    ancho, alto, rotacion, colores.fondo, colores.texto,
  ]);
}

async function pintarCambiadas(
  api: ElectronAPI,
  serial: string,
  pagina: PaginaDispositivo,
  colores: ColoresSuperficie,
  opciones: OpcionesPintado,
  firmas: Map<string, string[]>,
): Promise<void> {
  const previas = firmas.get(serial) ?? [];
  const nuevas: string[] = [];
  for (const { hueco, indice, lcd } of teclasLcd(pagina.disposicion)) {
    const boton = pagina.botones[hueco];
    const rotacion = pagina.rotacion ?? lcd.rotacion;
    const firma = firmaDe(boton, lcd.ancho, lcd.alto, rotacion, colores);
    nuevas[hueco] = firma;
    if (previas[hueco] === firma) continue;
    const jpeg = await pintarTecla(boton ?? null, lcd, colores, opciones, rotacion);
    await api.superficies.imagen(serial, indice, jpeg);
  }
  firmas.set(serial, nuevas);
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

export function useSuperficies({
  api, config, dispararBoton, crearPaginaSuperficie, colores, iconoSvg,
}: OpcionesSuperficies): { dispositivos: InfoSuperficie[]; modelos: Record<string, DisposicionSuperficie> } {
  const [dispositivos, setDispositivos] = useState<InfoSuperficie[]>([]);
  const [modelos, setModelos] = useState<Record<string, DisposicionSuperficie>>({});

  const configRef = useRef(config);
  const dispositivosRef = useRef(dispositivos);
  const dispararRef = useRef(dispararBoton);
  const crearRef = useRef(crearPaginaSuperficie);
  const iconoRef = useRef(iconoSvg);
  configRef.current = config;
  dispositivosRef.current = dispositivos;
  dispararRef.current = dispararBoton;
  crearRef.current = crearPaginaSuperficie;
  iconoRef.current = iconoSvg;

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

  useEffect(() => {
    if (!api) return;
    return api.superficies.onEntrada((entrada) => {
      const dispositivo = dispositivosRef.current.find((d) => d.serial === entrada.serial);
      if (!dispositivo) return;
      const pagina = paginaDe(configRef.current, entrada.serial, dispositivo.disposicion);
      if (!pagina) return;
      const hueco = huecoDeEntrada(pagina.disposicion, entrada);
      if (hueco === null) return;
      const boton = pagina.botones[hueco];
      if (boton && boton.action.type !== 'none') dispararRef.current(boton);
    });
  }, [api]);

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

    for (const dispositivo of conectados) {
      const pagina = paginaDe(config, dispositivo.serial, dispositivo.disposicion);
      if (!pagina) {
        if (!creadas.current.has(dispositivo.serial)) {
          creadas.current.add(dispositivo.serial);
          crearRef.current(dispositivo);
        }
        continue;
      }
      aplicarBrillo(api, dispositivo.serial, pagina.brillo, brillos.current);
      void pintarCambiadas(
        api, dispositivo.serial, pagina, { fondo, texto },
        { iconoSvg: iconoRef.current }, firmas.current,
      );
    }
  }, [api, config, dispositivos, fondo, texto]);

  return { dispositivos, modelos };
}
