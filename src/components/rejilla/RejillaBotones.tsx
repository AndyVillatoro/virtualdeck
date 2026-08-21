import React, { useEffect, useRef, useState, type ReactNode } from 'react';
import type { ButtonConfig } from '../../types';

/**
 * La rejilla de botones, compartida por la pantalla principal y la de kiosko.
 *
 * Las dos la dibujaban por separado, y el cálculo de la caja —el `useEffect`
 * con el `ResizeObserver` y los dos modos de encaje— estaba **duplicado línea
 * por línea**. Eso es lo que se comparte aquí. Lo que cada pantalla cuelga de
 * cada celda no se unifica: la principal pasa veinte props (selección,
 * arrastre, widgets, pulsación larga) y kiosko pasa seis. Forzarlas a un
 * mismo juego de props sería inventar una abstracción que ninguna de las dos
 * pidió; por eso la celda la sigue construyendo cada pantalla, vía `celda`.
 */

/** Cómo se encaja la rejilla en el hueco disponible. */
export type ModoCasilla = 'square' | 'fill';

/** Separacion entre casillas. Entra en el calculo del encaje, no solo en el CSS. */
const HUECO = 8;

interface Props {
  botones: ButtonConfig[];
  columnas: number;
  filas: number;
  modo: ModoCasilla;
  /** Margen entre la rejilla y el borde del hueco. */
  relleno: number;
  /** Cada pantalla arma su propia celda con las props que necesita. */
  celda: (boton: ButtonConfig) => ReactNode;
  /**
   * Algo de fuera que cambia el tamaño del hueco sin que el `ResizeObserver`
   * llegue a tiempo (la barra lateral de la principal). Al cambiar, se
   * recalcula.
   */
  senal?: unknown;
  onTouchStart?: React.TouchEventHandler<HTMLDivElement>;
  onTouchEnd?: React.TouchEventHandler<HTMLDivElement>;
}

export function RejillaBotones({
  botones, columnas, filas, modo, relleno, celda, senal, onTouchStart, onTouchEnd,
}: Props) {
  const hueco = useRef<HTMLDivElement>(null);
  const [caja, setCaja] = useState<{ w: number; h: number }>({ w: 0, h: 0 });

  // En 'square' la rejilla se ciñe a la proporción columnas/filas y deja
  // margen; en 'fill' ocupa todo el hueco y las casillas salen algo
  // rectangulares.
  useEffect(() => {
    const el = hueco.current;
    if (!el) return;
    const calcular = () => {
      // `clientWidth` **incluye el relleno**. Medirlo sin descontarlo daba una
      // caja 2*relleno mas grande que el hueco real; lo que sobraba lo recortaba
      // el `overflow: hidden` sin avisar, y por eso las casillas salian mas
      // altas que anchas en el modo que existe para que sean cuadradas.
      const W = el.clientWidth - relleno * 2, H = el.clientHeight - relleno * 2;
      if (W <= 0 || H <= 0) return;
      if (modo === 'fill') { setCaja({ w: W, h: H }); return; }
      // El lado de casilla mas grande que cabe a lo ancho y a lo alto.
      //
      // Antes se ceñia la caja entera a la proporcion columnas/filas, y de ahi
      // salian casillas que **no eran cuadradas** en el modo que existe justo
      // para que lo sean: los huecos entre casillas no entraban en la cuenta,
      // asi que se repartian mal entre los dos ejes. Con 4x3 en 481x384 daba
      // 114x123. Descontando los huecos primero, el lado es uno solo y sale
      // igual en los dos.
      const lado = Math.min(
        (W - (columnas - 1) * HUECO) / columnas,
        (H - (filas - 1) * HUECO) / filas,
      );
      if (lado <= 0) { setCaja({ w: W, h: H }); return; }
      setCaja({
        w: Math.floor(lado * columnas + (columnas - 1) * HUECO),
        h: Math.floor(lado * filas + (filas - 1) * HUECO),
      });
    };
    calcular();
    const observador = new ResizeObserver(calcular);
    observador.observe(el);
    return () => observador.disconnect();
  }, [columnas, filas, modo, relleno, senal]);

  return (
    <div
      ref={hueco}
      style={{
        flex: 1, padding: relleno, minWidth: 0, minHeight: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden',
      }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div style={{
        width: caja.w || '100%',
        height: caja.h || '100%',
        display: 'grid',
        gridTemplateColumns: `repeat(${columnas}, minmax(0, 1fr))`,
        gridTemplateRows: `repeat(${filas}, minmax(0, 1fr))`,
        gap: HUECO,
      }}>
        {botones.map((b) => celda(b))}
      </div>
    </div>
  );
}
