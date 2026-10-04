import { useEffect, useRef, useState } from 'react';
import type { ButtonConfig, DeckConfig, ElectronAPI, InfoSuperficie, ModeloSuperficie } from '../../types';
import { DISPOSICIONES, huecoDeEntrada } from './disposicion';
import { pintarTecla, type ColoresSuperficie } from './pintarTecla';

/**
 * El pegamento entre el deck y los dispositivos físicos.
 *
 * Mantiene la lista viva de superficies, crea la página propia de cada una la
 * primera vez que aparece, convierte cada entrada del hardware en la pulsación
 * del botón de su hueco y mantiene las teclas LCD pintadas —solo las que
 * cambiaron, comparando una firma por tecla— y el brillo aplicado.
 *
 * `config` y `dispararBoton` se leen **por referencia** dentro de los
 * manejadores: son funciones/valores que se registran una sola vez en el
 * proceso principal y quedarían con el estado del primer render (ver
 * `CLAUDE.md`, el caso de `toggledIds`).
 */

export interface OpcionesSuperficies {
  api: ElectronAPI | undefined;
  config: DeckConfig;
  dispararBoton: (boton: ButtonConfig) => void;
  crearPaginaSuperficie: (info: InfoSuperficie) => void;
  colores: ColoresSuperficie;
}

interface PaginaDispositivo {
  indice: number;
  modelo: ModeloSuperficie;
  brillo?: number;
  botones: ButtonConfig[];
}

/** La página de un serial y sus botones, en orden de hueco (por posición). */
function paginaDe(config: DeckConfig, serial: string): PaginaDispositivo | null {
  const indice = config.pages.findIndex((p) => p.superficie?.serial === serial);
  if (indice < 0) return null;
  const superficie = config.pages[indice].superficie;
  if (!superficie) return null;
  return {
    indice,
    modelo: superficie.modelo,
    brillo: superficie.brillo,
    botones: config.buttons.filter((b) => b.page === indice),
  };
}

/** Lo que se dibuja de una tecla. Si no cambia, no se vuelve a pintar. */
function firmaDe(boton: ButtonConfig | undefined, colores: ColoresSuperficie): string {
  if (!boton) return 'empty';
  return JSON.stringify([
    boton.label, boton.icon, boton.imageData, boton.customGlyph57,
    boton.bgColor, boton.fgColor, boton.action?.type,
    colores.fondo, colores.texto,
  ]);
}

async function pintarCambiadas(
  api: ElectronAPI,
  serial: string,
  pagina: PaginaDispositivo,
  colores: ColoresSuperficie,
  firmas: Map<string, string[]>,
): Promise<void> {
  // Solo los primeros huecos son teclas con pantalla: los demás son botones y perillas.
  const teclas = DISPOSICIONES[pagina.modelo].teclas;
  // La firma se anota antes de pintar: si la config cambia otra vez mientras
  // tanto, la segunda pasada no repite lo que la primera ya está mandando.
  const firmasSerial = firmas.get(serial) ?? [];
  firmas.set(serial, firmasSerial);
  for (let hueco = 0; hueco < teclas; hueco++) {
    const boton = pagina.botones[hueco];
    const firma = firmaDe(boton, colores);
    if (firmasSerial[hueco] === firma) continue;
    firmasSerial[hueco] = firma;
    const jpeg = await pintarTecla(boton ?? null, pagina.modelo, colores);
    await api.superficies.imagen(serial, hueco, jpeg);
  }
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
  api, config, dispararBoton, crearPaginaSuperficie, colores,
}: OpcionesSuperficies): InfoSuperficie[] {
  const [dispositivos, setDispositivos] = useState<InfoSuperficie[]>([]);

  const configRef = useRef(config);
  const dispararRef = useRef(dispararBoton);
  const crearRef = useRef(crearPaginaSuperficie);
  configRef.current = config;
  dispararRef.current = dispararBoton;
  crearRef.current = crearPaginaSuperficie;

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
    const desuscribir = api.superficies.onCambio((lista) => { if (vivo) setDispositivos(lista); });
    return () => { vivo = false; desuscribir(); };
  }, [api]);

  useEffect(() => {
    if (!api) return;
    return api.superficies.onEntrada((entrada) => {
      const pagina = paginaDe(configRef.current, entrada.serial);
      if (!pagina) return;
      const hueco = huecoDeEntrada(pagina.modelo, entrada);
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
      const pagina = paginaDe(config, dispositivo.serial);
      if (!pagina) {
        if (!creadas.current.has(dispositivo.serial)) {
          creadas.current.add(dispositivo.serial);
          crearRef.current(dispositivo);
        }
        continue;
      }
      aplicarBrillo(api, dispositivo.serial, pagina.brillo, brillos.current);
      void pintarCambiadas(api, dispositivo.serial, pagina, { fondo, texto }, firmas.current);
    }
  }, [api, config, dispositivos, fondo, texto]);

  return dispositivos;
}
