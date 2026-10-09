import { useCallback, useEffect, useRef } from 'react';
import type { ButtonConfig, DeckConfig, ElectronAPI, InfoSuperficie } from '../../types';
import type { TFunc } from '../i18n';
import type { DetalleAccion } from '../acciones/base';
import { destinoDock } from '../acciones/pageNav';
import { paginaDe, type VivoPagina } from './paginasSuperficie';
import { teclaSobrePerilla, teclasLcd } from './disposicion';
import {
  pintarAvisoTecla, pintarTecla, resolverBotonLcd,
  type ColoresSuperficie, type OpcionesPintado,
} from './pintarTecla';
import { avisoDeCuadrantes, avisoDeGiro, avisoDeModo, avisoDePagina, type AvisoPerilla } from './avisoPerilla';

/**
 * El aviso de la tecla al girar una perilla (T-HW-21, roadmap 85).
 *
 * Al girar, la tecla LCD de encima enseña el valor ~1,2 s y luego vuelve a su
 * icono. Este hook guarda **un aviso por aparato** (el último giro manda), lo
 * pinta, lo restaura y avisa al animador para que no lo pise mientras dura.
 *
 * - Sin avisos activos no queda ningún temporizador: se crea al girar y se
 *   borra al vencer.
 * - Girar rápido no encola repintados: cada aviso lleva una **generación** y
 *   un envío solo se aplica si sigue siendo el vigente; el temporizador se
 *   reinicia con cada giro.
 * - El detalle sale de la acción (`DetalleAccion`); si no hay, la etiqueta.
 *   `page-nav` se calcula con `destinoDock`, la misma regla que navega.
 */

/** Lo que dura el aviso en la tecla desde el último giro. */
const MS_AVISO_TECLA = 1200;

interface AvisoActivo {
  hueco: number;
  generacion: number;
  temporizador: ReturnType<typeof setTimeout>;
}

export interface OpcionesAvisoPerilla {
  api: ElectronAPI | undefined;
  config: DeckConfig;
  dispositivos: InfoSuperficie[];
  paginasActivas: Record<string, string>;
  colores: ColoresSuperficie;
  iconoSvg?: OpcionesPintado['iconoSvg'];
  esGlifoDot?: OpcionesPintado['esGlifoDot'];
  /** Estado vivo: la página se resuelve como la pinta el resto (visibleIf). */
  vivo: VivoPagina;
  t: TFunc;
  /** Refresca la imagen que enseña la pantalla de Dispositivos. */
  alPintar: (serial: string, hueco: number, dataUrl: string | undefined) => void;
}

export interface AvisoPerillaApi {
  /** Enseña el valor del giro en la tecla de encima de la perilla. */
  avisarDeGiro: (serial: string, perilla: number, boton: ButtonConfig, detalle?: DetalleAccion) => void;
  /** Enseña «MODO n/total» al pulsar una perilla multimodo. */
  avisarDeModo: (serial: string, perilla: number, siguiente: number, total: number) => void;
  /** Enseña que un mosaico 2×2 no se puede pulsar desde la tecla física. */
  avisarDeCuadrantes: (serial: string, hueco: number) => void;
  /** ¿Esa tecla está enseñando un aviso? (el pintor y el animador la dejan quieta). */
  conAviso: (serial: string, hueco: number) => boolean;
}

export function useAvisoPerilla(opciones: OpcionesAvisoPerilla): AvisoPerillaApi {
  const { api, config, dispositivos, paginasActivas, colores, iconoSvg, esGlifoDot, vivo, t, alPintar } = opciones;
  const avisos = useRef(new Map<string, AvisoActivo>());

  // Al desmontar, ningún temporizador sigue vivo.
  useEffect(() => {
    const vivos = avisos.current;
    return () => {
      for (const aviso of vivos.values()) clearTimeout(aviso.temporizador);
      vivos.clear();
    };
  }, []);

  const paginaDeSerial = useCallback((serial: string) => {
    const dispositivo = dispositivos.find((d) => d.serial === serial);
    if (!dispositivo) return null;
    return paginaDe(config, serial, dispositivo.disposicion, paginasActivas[serial], vivo);
  }, [config, dispositivos, paginasActivas, vivo]);

  /** Repinta la tecla normal cuando vence el aviso, si nadie lo renovó. */
  const restaurar = useCallback(async (serial: string, hueco: number, generacion: number) => {
    const activo = avisos.current.get(serial);
    if (!activo || activo.generacion !== generacion) return;
    avisos.current.delete(serial);
    if (!api) return;
    const pagina = paginaDeSerial(serial);
    const tecla = pagina && teclasLcd(pagina.disposicion).find((c) => c.hueco === hueco);
    if (!pagina || !tecla) return;
    const boton = pagina.botones[hueco];
    const encendido = !!boton && (config.toggledIds ?? []).includes(boton.id);
    const efectivo = boton ? resolverBotonLcd(boton, encendido) : boton;
    const rotacion = pagina.rotacion ?? tecla.lcd.rotacion;
    const imagen = await pintarTecla(
      efectivo ?? null, tecla.lcd, colores, { iconoSvg, esGlifoDot }, rotacion,
    );
    // Otro giro pudo empezar mientras se pintaba: si es así, manda el suyo.
    if (avisos.current.has(serial)) return;
    await api.superficies.imagen(serial, tecla.indice, imagen.jpegBase64);
    if (imagen.dataUrl) alPintar(serial, hueco, imagen.dataUrl);
  }, [api, config.toggledIds, paginaDeSerial, colores, iconoSvg, esGlifoDot, alPintar]);

  const mostrar = useCallback((serial: string, hueco: number, aviso: AvisoPerilla) => {
    if (!api) return;
    const anterior = avisos.current.get(serial);
    if (anterior) clearTimeout(anterior.temporizador);
    // Girar rápido no encola repintados: el último valor manda y el
    // temporizador se reinicia con una generación nueva.
    const generacion = (anterior?.generacion ?? 0) + 1;
    const temporizador = setTimeout(() => { void restaurar(serial, hueco, generacion); }, MS_AVISO_TECLA);
    avisos.current.set(serial, { hueco, generacion, temporizador });

    void (async () => {
      const pagina = paginaDeSerial(serial);
      const tecla = pagina && teclasLcd(pagina.disposicion).find((c) => c.hueco === hueco);
      if (!pagina || !tecla) return;
      const rotacion = pagina.rotacion ?? tecla.lcd.rotacion;
      const imagen = await pintarAvisoTecla(aviso, tecla.lcd, colores, rotacion);
      if (avisos.current.get(serial)?.generacion !== generacion) return;
      await api.superficies.imagen(serial, tecla.indice, imagen.jpegBase64);
      if (imagen.dataUrl) alPintar(serial, hueco, imagen.dataUrl);
    })();
  }, [api, paginaDeSerial, colores, alPintar, restaurar]);

  const avisarDeGiro = useCallback((
    serial: string, perilla: number, boton: ButtonConfig, detalle?: DetalleAccion,
  ) => {
    const pagina = paginaDeSerial(serial);
    if (!pagina) return;
    const hueco = teclaSobrePerilla(pagina.disposicion, perilla);
    if (hueco === null) return;
    let aviso = avisoDeGiro(detalle, boton, t);
    if (boton.action.type === 'page-nav') {
      const destino = destinoDock(boton.action, config.pages, serial, paginasActivas[serial]);
      if (destino) aviso = avisoDePagina(destino.indice, destino.total, t);
    }
    mostrar(serial, hueco, aviso);
  }, [paginaDeSerial, mostrar, t, config.pages, paginasActivas]);

  const avisarDeModo = useCallback((serial: string, perilla: number, siguiente: number, total: number) => {
    const pagina = paginaDeSerial(serial);
    if (!pagina) return;
    const hueco = teclaSobrePerilla(pagina.disposicion, perilla);
    if (hueco === null) return;
    mostrar(serial, hueco, avisoDeModo(siguiente, total, t));
  }, [paginaDeSerial, mostrar, t]);

  const avisarDeCuadrantes = useCallback((serial: string, hueco: number) => {
    mostrar(serial, hueco, avisoDeCuadrantes(t));
  }, [mostrar, t]);

  const conAviso = useCallback((serial: string, hueco: number) => {
    return avisos.current.get(serial)?.hueco === hueco;
  }, []);

  return { avisarDeGiro, avisarDeModo, avisarDeCuadrantes, conAviso };
}
