import { useEffect, type RefObject } from 'react';

/**
 * Toque, doble toque y pulsación larga en pantalla táctil.
 *
 * Va por `addEventListener` con `passive: false` y no por los manejadores de
 * React porque **hay que poder llamar a `preventDefault()`**: sin eso, mantener
 * el dedo abre el menú contextual del navegador y selecciona el texto de la
 * celda, y la acción alternativa nunca llega. Los eventos táctiles de React son
 * pasivos y no lo permiten.
 *
 * Solo se engancha cuando el botón tiene acción alternativa: si no, el
 * comportamiento normal del navegador ya está bien y no hay motivo para
 * secuestrarlo.
 */

interface Opciones {
  /** La celda. */
  ref: RefObject<HTMLElement>;
  /** Si no hay acción alternativa, no se engancha nada. */
  activo: boolean;
  /** Marca visual mientras el dedo está encima. */
  setPressed: (v: boolean) => void;
  /** Destello de confirmación. */
  destellar: () => void;
  /** Se pone a true cuando disparó la larga, para que el clic siguiente se ignore. */
  yaDisparoRef: { current: boolean };
  alPulsar: () => void;
  alPulsarLargo: () => void;
}

const MS_LARGA = 500;
/** Ventana del doble toque. Más de esto y ya se siente como dos toques sueltos. */
const MS_DOBLE = 320;

/*
 * El nombre empieza por `use` y no por `usar` a proposito: la regla
 * `rules-of-hooks` de eslint identifica los hooks por ese prefijo, y con un
 * nombre en español deja de comprobar que los hooks de dentro se llamen bien.
 * Es de las pocas cosas donde el idioma del codigo lo decide la herramienta.
 */
export function usePulsacionTactil({
  ref, activo, setPressed, destellar, yaDisparoRef, alPulsar, alPulsarLargo,
}: Opciones) {
  useEffect(() => {
    const el = ref.current;
    if (!el || !activo) return;

    let temporizador: number | null = null;
    let disparo = false;
    let ultimoToque = 0;

    const parar = () => {
      if (temporizador !== null) { clearTimeout(temporizador); temporizador = null; }
    };

    const inicio = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      e.preventDefault();
      disparo = false;
      setPressed(true);
      yaDisparoRef.current = false;
      temporizador = window.setTimeout(() => {
        disparo = true;
        temporizador = null;
        yaDisparoRef.current = true;
        setPressed(false);
        destellar();
        alPulsarLargo();
      }, MS_LARGA);
    };

    const fin = (e: TouchEvent) => {
      e.preventDefault();
      setPressed(false);
      parar();
      if (!disparo) {
        const ahora = Date.now();
        const esDoble = ahora - ultimoToque < MS_DOBLE;
        ultimoToque = esDoble ? 0 : ahora;
        destellar();
        if (esDoble) alPulsarLargo();
        else alPulsar();
      }
      disparo = false;
    };

    const cancelar = () => {
      setPressed(false);
      parar();
      disparo = false;
    };

    el.addEventListener('touchstart', inicio, { passive: false });
    el.addEventListener('touchend', fin, { passive: false });
    el.addEventListener('touchcancel', cancelar);
    return () => {
      el.removeEventListener('touchstart', inicio);
      el.removeEventListener('touchend', fin);
      el.removeEventListener('touchcancel', cancelar);
      parar();
    };
  }, [ref, activo, setPressed, destellar, yaDisparoRef, alPulsar, alPulsarLargo]);
}
