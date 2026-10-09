import { useEffect, useMemo, useState } from 'react';
import type { ButtonConfig, DeckConfig, ElectronAPI, Sensor } from '../../types';
import { botonesResueltos } from '../botonesFijos';
import { datosDeWidget, type DatosWidget, type FuentesWidget } from '../../comun/widgets';
import { useClimaWidget, useDivisas } from '../fuentesWidget';
import { useNowPlayingActivation, useNowPlayingExterno } from '../nowPlaying';
import { formatoFecha, formatoHora } from '../formatos';
import { resolveLang } from '../i18n';

/**
 * Los datos vivos de los widgets en la tecla física de los docks.
 *
 * La tecla LCD dibujaba icono y etiqueta, pero un botón con widget (reloj,
 * clima, reproducción, sensor, variable, divisa) seguía mostrando su icono en
 * el aparato. Aquí se calculan los mismos datos que la celda con
 * `datosDeWidget`, la función pura que ya comparten el deck y el mando móvil.
 *
 * Mira **solo** los botones de las páginas con `superficie` (y los fijos que
 * caen en ellas, vía `botonesResueltos`) y **solo** los tipos que tienen algo
 * que enseñar en una tecla: `slider` queda fuera porque la tecla no tiene
 * gesto continuo. Cada fuente se enciende solo si hay un widget suyo:
 *
 * - clima: `useClimaWidget` no consulta nada si no hay widget de clima;
 * - divisas: `useDivisas` pide solo las bases que aparezcan en los botones;
 * - reproducción: se pide activación con la clave `dock` —el sondeo es del
 *   proveedor y sigue corriendo si otro consumidor lo necesita— y el valor se
 *   lee del almacén de módulo, porque este hook vive fuera del proveedor;
 * - reloj: no queda ningún temporizador si no hay widget de reloj, y con él
 *   se recalcula una vez por minuto, alineado al cambio de minuto;
 * - sensores: se reciben ya sondeados, que `useSuperficies` los necesita de
 *   todos modos para `visibleIf`; aquí no se crea otro sondeo.
 *
 * Sin widgets en los docks no se sondea nada y el mapa sale vacío.
 */

/** Clave de activación del sondeo de reproducción para la tecla física. */
const CLAVE_REPRODUCCION_DOCK = 'dock';

/**
 * Lo que falta para el próximo cambio de minuto, con un margen para no quedar
 * justo en el borde y disparar dos veces. Función pura: el temporizador la usa.
 */
function retardoProximoMinuto(ahora: Date): number {
  return (60 - ahora.getSeconds()) * 1000 - ahora.getMilliseconds() + 50;
}

/** La hora actual, actualizada al cambio de minuto (no cada segundo). */
function useRelojMinuto(activo: boolean): Date {
  const [reloj, setReloj] = useState(() => new Date());
  useEffect(() => {
    if (!activo) return;
    let temporizador: number;
    const tic = () => {
      const ahora = new Date();
      setReloj(ahora);
      temporizador = window.setTimeout(tic, retardoProximoMinuto(ahora));
    };
    tic();
    return () => window.clearTimeout(temporizador);
  }, [activo]);
  return reloj;
}

/** Los botones con widget de todas las páginas de dock, fijos incluidos. */
function botonesDeDocks(config: DeckConfig): ButtonConfig[] {
  const salida: ButtonConfig[] = [];
  config.pages.forEach((pagina, i) => {
    if (!pagina.superficie) return;
    for (const boton of botonesResueltos(config, i)) {
      if (boton.widget && boton.widget !== 'slider') salida.push(boton);
    }
  });
  return salida;
}

export interface OpcionesWidgetsSuperficie {
  config: DeckConfig;
  api: ElectronAPI | undefined;
  /** Las lecturas ya sondeadas por `useSuperficies` para `visibleIf`. */
  sensores: Sensor[];
}

export function useWidgetsSuperficie({
  config, api, sensores,
}: OpcionesWidgetsSuperficie): Record<string, DatosWidget> {
  const botones = useMemo(() => botonesDeDocks(config), [config]);
  const hayClima = botones.some((b) => b.widget === 'weather');
  const hayReproduccion = botones.some((b) => b.widget === 'now-playing');
  const reloj = useRelojMinuto(botones.some((b) => b.widget === 'clock'));
  const clima = useClimaWidget(hayClima, api);
  const divisas = useDivisas(botones, api);
  const sonando = useNowPlayingExterno();

  // La activación es por consumidor: apagarla aquí no apaga la de la barra
  // lateral o kiosko, y el sondeo para solo cuando no queda ninguna.
  const activar = useNowPlayingActivation(CLAVE_REPRODUCCION_DOCK);
  useEffect(() => {
    activar(hayReproduccion);
    return () => activar(false);
  }, [activar, hayReproduccion]);

  // `resolveLang` y no `useLang`: este hook corre en el cuerpo de `App`, que
  // está fuera del `LanguageProvider` (lo renderiza App), así que el contexto
  // devolvería el idioma por defecto y el reloj no seguiría al elegido.
  const lang = resolveLang(config.language);
  const hora = useMemo(() => formatoHora(lang), [lang]);
  const fecha = useMemo(() => formatoFecha(lang), [lang]);

  return useMemo(() => {
    const fuentes: FuentesWidget = {
      estado: config.state,
      reloj,
      // Dato viejo de una fuente ya apagada no se enseña: al quitar el widget
      // se vuelve al icono, no a la última lectura.
      clima: hayClima ? clima : null,
      sonando: hayReproduccion ? sonando : null,
      sensores,
      divisas,
      hora,
      fecha,
      lang,
    };
    const mapa: Record<string, DatosWidget> = {};
    for (const boton of botones) {
      const datos = datosDeWidget(boton, fuentes);
      if (datos) mapa[boton.id] = datos;
    }
    return mapa;
  }, [
    botones, config.state, reloj, clima, hayClima, sonando, hayReproduccion,
    sensores, divisas, hora, fecha, lang,
  ]);
}
