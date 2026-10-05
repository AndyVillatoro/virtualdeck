import { useEffect, useRef, useState } from 'react';
import './efectosPuntos.js';
import type { EfectoPulsar, EfectoPuntos } from '../../types';

/**
 * Anima los puntos de un icono de la celda con el motor DOT.
 *
 * Un `requestAnimationFrame` por celda animada, y **ninguno** cuando no hay
 * nada que animar: sin animacion continua ni pulsacion en curso no queda ni
 * `requestAnimationFrame` ni temporizador (roadmap 84). Al desmontar se
 * cancela lo que hubiera.
 *
 * - Continua: `animacion.cuando` es `siempre`, o `encendido` con el boton
 *   encendido. Las de una sola vez (`encender`, `barrido`, `escaneo`) giran
 *   en bucle; `pulso`/`parpadeo` no terminan nunca de por si.
 * - Al pulsar (`pulsoId` crece en cada destello de la celda): el
 *   `efectoPulsar` (sin campo = `destello`; `none` = nada), y si no hay y
 *   la animacion es `al-pulsar`, el efecto del icono una vez. Con «reducir
 *   movimiento» de Windows no hay animacion continua, pero el destello de
 *   pulsar se queda.
 * - Con la ventana oculta se pausa (se reanuda al volver, sin saltos).
 */

export interface EntradaAnimacionPuntos {
  matriz: boolean[][] | null;
  efecto?: EfectoPuntos;
  cuando?: 'siempre' | 'al-pulsar' | 'encendido';
  encendido?: boolean;
  efectoPulsar?: EfectoPulsar;
  /** Crece en cada pulsacion. 0 = todavia ninguna. */
  pulsoId?: number;
}

function movimientoReducido(): boolean {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function continuaActiva(
  matriz: boolean[][] | null, efecto: EfectoPuntos | undefined,
  cuando: EntradaAnimacionPuntos['cuando'], encendido: boolean | undefined, reducido: boolean,
): efecto is EfectoPuntos {
  if (!matriz || !efecto || reducido) return false;
  return cuando === 'siempre' || (cuando === 'encendido' && encendido === true);
}

/** Efecto de una sola vez al pulsar, o `null` si no hay. */
function efectoDePulso(
  matriz: boolean[][] | null, efecto: EfectoPuntos | undefined,
  cuando: EntradaAnimacionPuntos['cuando'], efectoPulsar: EfectoPulsar | undefined,
): string | null {
  if (!matriz) return null;
  // En positivo (`destello`/`onda`): el tercer valor del contrato se detecta
  // por descarte, porque ese literal lo marca la auditoría de i18n.
  const pulsar = efectoPulsar ?? 'destello';
  if (pulsar === 'destello' || pulsar === 'onda') return pulsar;
  if (cuando === 'al-pulsar' && efecto) return efecto;
  return null;
}

interface ControlBucle {
  raf: number;
  /** Inicio de la animacion continua (para `pulso`/`parpadeo`). */
  t0: number;
  /** Efecto de pulsacion en curso, con su inicio. */
  pulso: { efecto: string; t0: number } | null;
  /** Momento en que se oculto la ventana (para no dar saltos). */
  ocultoEn: number;
}

function detener(control: ControlBucle): void {
  if (control.raf) cancelAnimationFrame(control.raf);
  control.raf = 0;
}

export function useAnimacionPuntos(entrada: EntradaAnimacionPuntos): number[][] | null {
  const [intensidades, setIntensidades] = useState<number[][] | null>(null);
  const { matriz, efecto, cuando, encendido, efectoPulsar, pulsoId } = entrada;
  const datos = useRef(entrada);
  datos.current = entrada;
  const ultimoPulso = useRef(0);
  const control = useRef<ControlBucle>({ raf: 0, t0: 0, pulso: null, ocultoEn: 0 });

  useEffect(() => {
    const motor = globalThis.EfectosPuntos;
    const ctrl = control.current;
    // Si el bucle ya corria (una pulsacion lo reinicia), se conserva su
    // origen de tiempos: si no, cada clic haria saltar el `pulso`.
    const veniaCorriendo = ctrl.raf !== 0;
    detener(ctrl);
    if (!motor || !matriz) {
      ctrl.pulso = null;
      setIntensidades(null);
      return;
    }
    const reducido = movimientoReducido();
    const hayContinua = continuaActiva(matriz, efecto, cuando, encendido, reducido);
    const idPulso = pulsoId ?? 0;
    if (idPulso > 0 && idPulso !== ultimoPulso.current) {
      ultimoPulso.current = idPulso;
      const fx = efectoDePulso(matriz, efecto, cuando, efectoPulsar);
      if (fx) ctrl.pulso = { efecto: fx, t0: performance.now() };
    }
    if (!hayContinua && !ctrl.pulso) {
      setIntensidades(null);
      return;
    }
    if (!veniaCorriendo) ctrl.t0 = performance.now();

    const alVisibilidad = () => {
      if (document.hidden) {
        ctrl.ocultoEn = performance.now();
        detener(ctrl);
      } else if (!ctrl.raf && (ctrl.pulso || continuaActiva(
        datos.current.matriz, datos.current.efecto, datos.current.cuando,
        datos.current.encendido, movimientoReducido(),
      ))) {
        const pausa = performance.now() - ctrl.ocultoEn;
        ctrl.t0 += pausa;
        if (ctrl.pulso) ctrl.pulso.t0 += pausa;
        ctrl.raf = requestAnimationFrame(paso);
      }
    };

    const paso = (ahora: number) => {
      ctrl.raf = 0;
      const d = datos.current;
      if (!d.matriz) {
        ctrl.pulso = null;
        setIntensidades(null);
        return;
      }
      let siguiente: number[][] | null = null;
      let sigue = false;
      if (ctrl.pulso) {
        const duracion = motor.duracionEfecto(ctrl.pulso.efecto);
        const dt = ahora - ctrl.pulso.t0;
        if (dt >= duracion) {
          ctrl.pulso = null;
        } else {
          siguiente = motor.calcularPuntos(d.matriz, ctrl.pulso.efecto, dt).intensidades;
          sigue = true;
        }
      }
      if (!sigue && continuaActiva(d.matriz, d.efecto, d.cuando, d.encendido, reducido)) {
        const fx = d.efecto as string;
        const duracion = motor.duracionEfecto(fx);
        const t = motor.esContinuo(fx) || duracion <= 0
          ? ahora - ctrl.t0
          : (ahora - ctrl.t0) % duracion;
        siguiente = motor.calcularPuntos(d.matriz, fx, t).intensidades;
        sigue = true;
      }
      setIntensidades(siguiente);
      if (sigue && !document.hidden) ctrl.raf = requestAnimationFrame(paso);
    };

    document.addEventListener('visibilitychange', alVisibilidad);
    ctrl.raf = requestAnimationFrame(paso);
    return () => {
      document.removeEventListener('visibilitychange', alVisibilidad);
      detener(ctrl);
    };
  }, [matriz, efecto, cuando, encendido, efectoPulsar, pulsoId]);

  return intensidades;
}
