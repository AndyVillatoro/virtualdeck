import React, { useCallback, useEffect, useRef } from 'react';
import { useTheme } from '../../utils/theme';
import { celdasDeLinea, type MatrizPuntos, type PuntoCelda } from './matricesPuntos';

interface LienzoPuntosProps {
  matriz: MatrizPuntos;
  /** Hex con el que pinta el lápiz (en mono es el color fijo del glifo). */
  colorDibujo: string;
  /** El trazo entero borra en vez de pintar. */
  borrando: boolean;
  tamCelda?: number;
  alIniciarTrazo: () => void;
  alPintar: (m: MatrizPuntos) => void;
}

/**
 * EditorPuntos — rejilla de puntos pintable con ratón o dedo.
 *
 * Une lo mejor de los dos editores originales: el arrastre continuo con
 * detección de modo (pintar/borrar según la primera celda, del 5×7), el trazo
 * sin huecos por interpolación y el borrado con clic derecho (del de marca).
 * El pintado se acumula en una copia de trabajo y se vuelca por
 * `requestAnimationFrame` para que arrastrar en 17×17 no vaya a tirones.
 */
export function LienzoPuntos({
  matriz,
  colorDibujo,
  borrando,
  tamCelda,
  alIniciarTrazo,
  alPintar,
}: LienzoPuntosProps) {
  const VD = useTheme();
  const filas = matriz.length;
  const columnas = matriz[0]?.length ?? 0;
  const px = tamCelda ?? (columnas <= 5 ? 28 : 20);

  const marcoRef = useRef<HTMLDivElement | null>(null);
  const dibujandoRef = useRef(false);
  const valorTrazoRef = useRef<string>('');
  const ultimaRef = useRef<PuntoCelda | null>(null);
  const trabajoRef = useRef<MatrizPuntos>(matriz);
  const pendienteRef = useRef(false);
  const estadoRef = useRef({ alPintar });
  estadoRef.current.alPintar = alPintar;

  useEffect(() => {
    trabajoRef.current = matriz;
  }, [matriz]);

  const volcar = useCallback(() => {
    pendienteRef.current = false;
    estadoRef.current.alPintar(trabajoRef.current.map((fila) => [...fila]));
  }, []);

  const programarVolcado = useCallback(() => {
    if (pendienteRef.current) return;
    pendienteRef.current = true;
    requestAnimationFrame(volcar);
  }, [volcar]);

  const escribir = useCallback(
    (r: number, c: number, valor: string) => {
      if (r < 0 || r >= filas || c < 0 || c >= columnas) return;
      if (trabajoRef.current[r][c] === valor) return;
      const copia = trabajoRef.current.map((fila) => [...fila]);
      copia[r][c] = valor;
      trabajoRef.current = copia;
      programarVolcado();
    },
    [filas, columnas, programarVolcado],
  );

  const celdaDesdeEvento = useCallback(
    (e: { clientX: number; clientY: number }): PuntoCelda | null => {
      const el = marcoRef.current;
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0) return null;
      const c = Math.floor(((e.clientX - rect.left) / rect.width) * columnas);
      const r = Math.floor(((e.clientY - rect.top) / rect.height) * filas);
      if (r < 0 || r >= filas || c < 0 || c >= columnas) return null;
      return { r, c };
    },
    [filas, columnas],
  );

  const pintarLinea = useCallback(
    (desde: PuntoCelda | null, hasta: PuntoCelda, valor: string) => {
      for (const celda of celdasDeLinea(desde, hasta)) escribir(celda.r, celda.c, valor);
    },
    [escribir],
  );

  function alApoyar(e: React.PointerEvent) {
    if (e.pointerType === 'mouse' && e.button === 1) return;
    e.preventDefault();
    const celda = celdaDesdeEvento(e);
    if (!celda) return;
    const actual = trabajoRef.current[celda.r][celda.c] ?? '';
    const borrarEste = borrando || e.button === 2 || actual === colorDibujo;
    valorTrazoRef.current = borrarEste ? '' : colorDibujo;
    dibujandoRef.current = true;
    ultimaRef.current = celda;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    alIniciarTrazo();
    escribir(celda.r, celda.c, valorTrazoRef.current);
  }

  function alArrastrar(e: React.PointerEvent) {
    if (!dibujandoRef.current) return;
    const celda = celdaDesdeEvento(e);
    if (!celda) return;
    pintarLinea(ultimaRef.current, celda, valorTrazoRef.current);
    ultimaRef.current = celda;
  }

  function alSoltar() {
    dibujandoRef.current = false;
    ultimaRef.current = null;
  }

  return (
    <div
      ref={marcoRef}
      onPointerDown={alApoyar}
      onPointerMove={alArrastrar}
      onPointerUp={alSoltar}
      onPointerCancel={alSoltar}
      onPointerLeave={alSoltar}
      onContextMenu={(e) => e.preventDefault()}
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${columnas}, ${px}px)`,
        gridTemplateRows: `repeat(${filas}, ${px}px)`,
        gap: 3,
        padding: 8,
        background: '#070809',
        border: `1px solid ${VD.border}`,
        borderRadius: VD.radius.md,
        userSelect: 'none',
        touchAction: 'none',
        cursor: borrando ? 'cell' : 'crosshair',
      }}
    >
      {matriz.flatMap((fila, r) =>
        fila.map((c, x) => (
          <div
            key={`${r}-${x}`}
            style={{
              width: px,
              height: px,
              borderRadius: '50%',
              background: c || 'rgba(255, 255, 255, 0.06)',
              boxShadow: c ? `0 0 6px ${c}66` : undefined,
              pointerEvents: 'none',
            }}
          />
        )),
      )}
    </div>
  );
}
