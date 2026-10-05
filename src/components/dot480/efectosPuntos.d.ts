/**
 * Tipos del motor de animacion DOT (`efectosPuntos.js`).
 *
 * El motor es un script clasico sin imports ni exports (para incrustarlo tal
 * cual en la pagina del movil): al cargarse deja el motor en
 * `globalThis.EfectosPuntos`. Este archivo declara esa forma para TypeScript.
 * El `matrizDeBoton` opcional lo registra la capa de componentes
 * (`animacionPuntos.ts`) para que la tecla fisica resuelva matrices sin
 * importar componentes desde `src/utils` (ver la regla `utils-no-ui`).
 */

export type EfectoMotor =
  | 'encender'
  | 'barrido'
  | 'pulso'
  | 'parpadeo'
  | 'escaneo'
  | 'destello'
  | 'onda';

export interface ResultadoMotor {
  /** Intensidad 0-1 por punto, con la misma forma que la matriz de entrada. */
  intensidades: number[][];
  /** Solo las de una sola vez terminan; `pulso`/`parpadeo`, nunca. */
  terminado: boolean;
}

export interface MotorPuntos {
  calcularPuntos(matriz: boolean[][], efecto: string, t: number): ResultadoMotor;
  duracionEfecto(efecto: string): number;
  esContinuo(efecto: string): boolean;
  /** La capa de componentes lo registra; `src/utils` lo usa si existe. */
  matrizDeBoton?: (boton: unknown) => boolean[][] | null;
  DUR_ENCENDER_MS: number;
  DUR_BARRIDO_MS: number;
  PERIODO_PULSO_MS: number;
  PERIODO_PARPADEO_MS: number;
  DUR_ESCANEO_MS: number;
  DUR_DESTELLO_MS: number;
  DUR_ONDA_MS: number;
}

declare global {
  interface GlobalThis {
    EfectosPuntos: MotorPuntos;
  }
}

export {};
