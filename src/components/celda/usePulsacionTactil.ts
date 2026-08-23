import { useEffect, type RefObject } from 'react';

/**
 * Toque y arrastre con el dedo.
 *
 * Va por `addEventListener` con `passive: false` y no por los manejadores de
 * React porque **hay que poder llamar a `preventDefault()`**: sin eso, mantener
 * el dedo abre el menú contextual del navegador, selecciona el texto de la
 * celda y desplaza la página mientras se arrastra. Los eventos táctiles de
 * React son pasivos y no lo permiten.
 *
 * Mantener pulsado **arrastra**. Con un dedo no hay otra forma de mover un
 * botón a otra casilla: el arrastre HTML5 es solo de ratón. La acción
 * alternativa se queda para el ratón, que sí tiene sitio para las dos cosas
 * (pulsación larga para la acción, arrastre nativo para mover).
 *
 * Antes esto hacía doble toque = acción alternativa. Se quitó: había dos
 * gestos para lo mismo y ninguno para lo que de verdad falta con una pantalla
 * táctil, que es reordenar.
 */

/** Cuánto hay que aguantar el dedo para que empiece el arrastre. */
const MS_LARGA = 500;

/** Clase de la celda; es también la diana del arrastre. */
const SELECTOR_CELDA = '.vd-btn';

/**
 * Eventos que se pasan las celdas entre ellas.
 *
 * El arrastre táctil lo lleva la celda de origen, pero quien sabe qué hacer
 * con el suelte es la de destino —tiene su propio `onDrop`—, y son componentes
 * hermanos sin nada en común. Un evento del DOM sobre el elemento de destino
 * es el camino corto: no hay que subir estado al padre ni pasar callbacks por
 * media aplicación.
 */
export const EVENTO_SOBRE = 'vd:sobre';
export const EVENTO_FUERA = 'vd:fuera';
export const EVENTO_SOLTAR = 'vd:soltar';

interface Opciones {
  /** La celda. */
  ref: RefObject<HTMLElement>;
  /** Solo se engancha donde el arrastre tiene sentido: la rejilla principal. */
  activo: boolean;
  /** Id del botón, que es lo que viaja en el arrastre. */
  idBoton: string;
  /** Marca visual mientras el dedo está encima. */
  setPressed: (v: boolean) => void;
  /** Destello de confirmación; aquí avisa de que el arrastre ha empezado. */
  destellar: () => void;
  /** Se pone a true cuando arrastró, para que el clic siguiente se ignore. */
  yaDisparoRef: { current: boolean };
  alPulsar: () => void;
}

/*
 * El nombre empieza por `use` y no por `usar` a proposito: la regla
 * `rules-of-hooks` de eslint identifica los hooks por ese prefijo, y con un
 * nombre en español deja de comprobar que los hooks de dentro se llamen bien.
 * Es de las pocas cosas donde el idioma del codigo lo decide la herramienta.
 */
export function usePulsacionTactil({
  ref, activo, idBoton, setPressed, destellar, yaDisparoRef, alPulsar,
}: Opciones) {
  useEffect(() => {
    const el = ref.current;
    if (!el || !activo) return;

    let temporizador: number | null = null;
    let arrastrando = false;
    let ultimaDiana: Element | null = null;

    const parar = () => {
      if (temporizador !== null) { clearTimeout(temporizador); temporizador = null; }
    };

    const dianaBajoElDedo = (t: Touch): Element | null => {
      const e = document.elementFromPoint(t.clientX, t.clientY);
      const celda = e?.closest(SELECTOR_CELDA) ?? null;
      return celda === el ? null : celda;
    };

    const marcar = (nueva: Element | null) => {
      if (nueva === ultimaDiana) return;
      ultimaDiana?.dispatchEvent(new CustomEvent(EVENTO_FUERA));
      nueva?.dispatchEvent(new CustomEvent(EVENTO_SOBRE));
      ultimaDiana = nueva;
    };

    const soltarTodo = () => {
      marcar(null);
      arrastrando = false;
      el.style.opacity = '';
      setPressed(false);
      parar();
    };

    const inicio = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      setPressed(true);
      yaDisparoRef.current = false;
      temporizador = window.setTimeout(() => {
        temporizador = null;
        arrastrando = true;
        yaDisparoRef.current = true;
        setPressed(false);
        // El botón se aclara mientras viaja, para que se vea cuál se está
        // moviendo: sin cursor no hay ninguna otra pista.
        el.style.opacity = '0.45';
        destellar();
      }, MS_LARGA);
    };

    const mover = (e: TouchEvent) => {
      if (!arrastrando) {
        // Mover el dedo antes de tiempo es desplazar, no pulsar.
        parar();
        setPressed(false);
        return;
      }
      e.preventDefault();
      marcar(dianaBajoElDedo(e.touches[0]));
    };

    const fin = (e: TouchEvent) => {
      e.preventDefault();
      if (arrastrando) {
        const destino = ultimaDiana;
        soltarTodo();
        destino?.dispatchEvent(new CustomEvent(EVENTO_SOLTAR, { detail: idBoton }));
        return;
      }
      const habiaTemporizador = temporizador !== null;
      soltarTodo();
      // Sin temporizador vivo es que el dedo se movió y ya se cancelo.
      if (habiaTemporizador) { destellar(); alPulsar(); }
    };

    el.addEventListener('touchstart', inicio, { passive: false });
    el.addEventListener('touchmove', mover, { passive: false });
    el.addEventListener('touchend', fin, { passive: false });
    el.addEventListener('touchcancel', soltarTodo);
    return () => {
      el.removeEventListener('touchstart', inicio);
      el.removeEventListener('touchmove', mover);
      el.removeEventListener('touchend', fin);
      el.removeEventListener('touchcancel', soltarTodo);
      soltarTodo();
    };
  }, [ref, activo, idBoton, setPressed, destellar, yaDisparoRef, alPulsar]);
}
