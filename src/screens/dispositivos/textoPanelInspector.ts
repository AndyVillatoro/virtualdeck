import { describirAccion, describirPulsar } from './describirAccion';
import type { ButtonConfig } from '../../types';
import type { ControlSuperficie } from '../../types/superficies';
import type { ControlMeta } from './tiposPanelInspector';

type Texto = (key: string, params?: Record<string, string | number>) => string;

export function obtenerNombreYTipoControl(meta: ControlMeta, t: Texto): { nombre: string; tipo: string } {
  if (meta.control === 'key') {
    return {
      nombre: t('disp.tecla', { n: meta.indice + 1 }),
      tipo: t('disp.tipo.tecla'),
    };
  }
  if (meta.control === 'button') {
    return {
      nombre: t('disp.boton', { n: meta.indice + 1 }),
      tipo: t('disp.tipo.boton'),
    };
  }
  if (meta.control === 'swipe') {
    const gestoStr = meta.gesto === 'der' ? t('disp.der') : t('disp.izq');
    return {
      nombre: `${t('disp.tira', { n: meta.indice + 1 })} · ${gestoStr}`,
      tipo: t('disp.tipo.tira'),
    };
  }
  let gestoStr = t('disp.pulsar');
  if (meta.gesto === 'izq') {
    gestoStr = t('disp.izq');
  } else if (meta.gesto === 'der') {
    gestoStr = t('disp.der');
  }
  return {
    nombre: `${t('disp.perilla', { n: meta.indice + 1 })} · ${gestoStr}`,
    tipo: t('disp.tipo.perilla'),
  };
}

export function etiquetaGestoPerilla(gesto: 'izq' | 'pulsar' | 'der', t: (k: string) => string): string {
  if (gesto === 'izq') return t('disp.gesto.giroIzq');
  if (gesto === 'der') return t('disp.gesto.giroDer');
  return t('disp.gesto.pulsar');
}

/** Lo guardado que el aparato no va a ejecutar, dicho en avisos cortos. */
function avisosDelBoton(
  controlMeta: ControlMeta,
  boton: ButtonConfig | undefined,
  t: Texto,
): string[] {
  const avisos: string[] = [];
  if (boton?.subButtons?.length === 4) avisos.push(t('ed.inspector.cuadrantes'));
  const pasos = boton?.actions?.length ?? 0;
  if (pasos > 1) avisos.push(t('ed.inspector.secuencia', { n: pasos }));
  // Mantener pulsado solo corre en teclas y botones (despachoTecla).
  const esperaLarga = controlMeta.control === 'key' || controlMeta.control === 'button';
  if (esperaLarga && boton?.longPressAction && boton.longPressAction.type !== 'none') {
    avisos.push(t('ed.inspector.mantener', { desc: describirAccion(boton.longPressAction, t) }));
  }
  return avisos;
}

/**
 * Lo que hace el hueco elegido (T-HW-19).
 *
 * Con modos, pulsar cambia de modo en vez de ejecutar su acción: se dice eso
 * («PULSAR · CAMBIAR MODO (n)») y no la acción que no va a correr. Además se
 * avisa de lo que el aparato no ejecuta aunque esté guardado: cuadrantes 2×2,
 * una secuencia, mantener pulsado o la mitad de apagado de un interruptor.
 */
export function textoAccionSeleccionada(
  controlMeta: ControlMeta,
  boton: ButtonConfig | undefined,
  t: Texto,
): string {
  const multimodo = controlMeta.control === 'knob'
    && controlMeta.gesto === 'pulsar'
    && (boton?.modosPerilla?.length ?? 0) > 0;
  const base = multimodo
    ? describirPulsar(boton, t)
    : describirAccion(boton?.action, t, boton?.isToggle ? boton.actionToggleOff : undefined);
  const avisos = avisosDelBoton(controlMeta, boton, t);
  return avisos.length > 0 ? `${base} · ${avisos.join(' · ')}` : base;
}

/** El glifo de reserva cuando el hueco todavía no tiene icono. */
export function iconoFallback(tipo?: ControlSuperficie): string {
  if (tipo === 'knob') return 'KNOB';
  if (tipo === 'swipe') return 'SWIPE';
  if (tipo === 'button') return 'DOTS';
  return 'ADD';
}