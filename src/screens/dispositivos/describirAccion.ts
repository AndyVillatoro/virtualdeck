import type { ButtonAction, ButtonConfig } from '../../types';
import type { ControlSuperficie } from '../../types/superficies';
import type { PresetDock } from '../../data/presetsDock';

export type Traductor = (key: string, params?: Record<string, string | number>) => string;

function traducirTecla(tecla: string, t: Traductor): string {
  const k = tecla.trim();
  const lower = k.toLowerCase();
  if (lower === 'add') return 'NUM+';
  if (lower === 'subtract') return 'NUM-';
  if (lower === 'left') return t('disp.desc.teclaIzq');
  if (lower === 'right') return t('disp.desc.teclaDer');
  if (lower === 'up') return t('disp.desc.teclaArriba');
  if (lower === 'down') return t('disp.desc.teclaAbajo');
  return k.toUpperCase();
}

function formatearHotkey(hotkey: string, t: Traductor): string {
  if (!hotkey) return '';
  return hotkey
    .split('+')
    .map((p) => traducirTecla(p, t))
    .join(' + ');
}

function describirHotkey(a: ButtonAction, t: Traductor): string {
  const teclas = a.hotkey ? formatearHotkey(a.hotkey, t) : '';
  if (!teclas) return t('disp.desc.atajoVacio');
  return t('disp.desc.atajo', { teclas });
}

function describirAdjust(a: ButtonAction, t: Traductor): string {
  const target: string = a.adjustTarget || 'volume';
  const delta = a.adjustDelta ?? 0;
  const absDelta = Math.abs(delta);

  if (target === 'volume') {
    if (delta < 0) return t('disp.desc.bajarVolumen', { n: absDelta });
    if (delta > 0) return t('disp.desc.subirVolumen', { n: absDelta });
    return t('disp.desc.volumen');
  }

  if (target === 'brightness') {
    if (delta < 0) return t('disp.desc.bajarBrillo', { n: absDelta });
    if (delta > 0) return t('disp.desc.subirBrillo', { n: absDelta });
    return t('disp.desc.brillo');
  }

  const signo = delta > 0 ? '+' : '';
  return t('disp.desc.ajustarGenerico', { target: target.toUpperCase(), delta: `${signo}${delta}` });
}

function describirBrightness(a: ButtonAction, t: Traductor): string {
  const nivel = a.brightnessLevel ?? 100;
  return t('disp.desc.fijarBrillo', { n: nivel });
}

/**
 * Volumen de una app: «VOLUMEN SPOTIFY -5», «SILENCIAR APP ACTIVA».
 * Sin destino es la app en primer plano, igual que al ejecutar.
 */
function describirAppVolume(a: ButtonAction, t: Traductor): string {
  const quien = (a.appVolumeTarget?.trim() || t('disp.desc.appActiva')).toUpperCase();
  if (a.appVolumeMode === 'mute') return t('disp.desc.silenciarApp', { quien });
  if (a.appVolumeMode === 'set') return t('disp.desc.appVolumenFijo', { quien, n: a.appVolumeLevel ?? 0 });
  const d = a.appVolumeDelta ?? 0;
  return t('disp.desc.appVolumen', { quien, delta: `${d > 0 ? '+' : ''}${d}` });
}

function describirDiscord(a: ButtonAction, t: Traductor): string {
  const sub = a.discordAction;
  if (sub === 'toggle-mute') return t('disp.desc.discordMute');
  if (sub === 'toggle-deaf') return t('disp.desc.discordDeaf');
  return t('disp.desc.discordGenerico', { accion: (sub || '').toUpperCase() });
}

function describirIncrVar(a: ButtonAction, t: Traductor): string {
  const nombre = (a.varName || t('disp.desc.variableGenerica')).toUpperCase();
  const delta = a.varDelta ?? 1;
  const signo = delta > 0 ? '+' : '';
  return t('disp.desc.incrVar', { nombre, delta: `${signo}${delta}` });
}

function describirSetVar(a: ButtonAction, t: Traductor): string {
  const nombre = (a.varName || t('disp.desc.variableGenerica')).toUpperCase();
  const valor = a.varValue ?? '0';
  return t('disp.desc.setVar', { nombre, valor });
}

function recortarScript(cmd: string): string {
  const limpia = cmd.trim();
  const primerTrozo = limpia.split(/\s+/)[0] || limpia;
  const sinExe = primerTrozo.replace(/\.exe$/i, '');
  if (sinExe.length < limpia.length) {
    return `${sinExe}…`;
  }
  return sinExe.length > 18 ? `${sinExe.slice(0, 16)}…` : sinExe;
}

function describirScript(a: ButtonAction, t: Traductor): string {
  const cmd = a.script ? recortarScript(a.script) : '';
  if (!cmd) return t('disp.desc.scriptVacio');
  return t('disp.desc.script', { cmd });
}

function describirPageNav(a: ButtonAction, t: Traductor): string {
  if (a.pageNav === 'next') return t('disp.desc.paginaSig');
  if (a.pageNav === 'prev') return t('disp.desc.paginaAnt');
  if (a.pageNav === 'first') return t('disp.desc.paginaPrimera');
  if (a.pageNav === 'cycle') return t('disp.desc.paginaCycle');
  if (a.pageNav === 'goto') return t('disp.desc.paginaIr');
  return describirGenerico('page-nav', t);
}

function describirWindowCycle(a: ButtonAction, t: Traductor): string {
  if (a.windowCycle === 'prev') return t('disp.desc.ventanaAnt');
  return t('disp.desc.ventanaSig');
}

function describirGenerico(tipo: string, t: Traductor): string {
  const clave = `act.${tipo}.label`;
  const traducido = t(clave);
  return (traducido && traducido !== clave ? traducido : tipo).toUpperCase();
}

type DescriptorFn = (a: ButtonAction, t: Traductor) => string;

const MAPA_DESCRIPTORES: Record<string, DescriptorFn> = {
  none: (_a, t) => t('disp.desc.sinAccion'),
  hotkey: (a, t) => describirHotkey(a, t),
  adjust: (a, t) => describirAdjust(a, t),
  brightness: (a, t) => describirBrightness(a, t),
  'app-volume': (a, t) => describirAppVolume(a, t),
  mute: (_a, t) => t('disp.desc.mute'),
  'media-next': (_a, t) => t('disp.desc.mediaNext'),
  'media-prev': (_a, t) => t('disp.desc.mediaPrev'),
  'media-play-pause': (_a, t) => t('disp.desc.mediaPlayPause'),
  discord: (a, t) => describirDiscord(a, t),
  'incr-var': (a, t) => describirIncrVar(a, t),
  'set-var': (a, t) => describirSetVar(a, t),
  script: (a, t) => describirScript(a, t),
  'page-nav': (a, t) => describirPageNav(a, t),
  'window-cycle': (a, t) => describirWindowCycle(a, t),
};

export function describirAccion(
  accion: ButtonAction | undefined | null,
  t: Traductor,
  apagado?: ButtonAction | undefined | null,
): string {
  if (!accion || !accion.type || accion.type === 'none') {
    return t('disp.desc.sinAccion');
  }
  const descriptor = MAPA_DESCRIPTORES[accion.type];
  const base = descriptor ? descriptor(accion, t) : describirGenerico(accion.type, t);
  if (apagado && apagado.type && apagado.type !== 'none') {
    return `${base} / ${t('disp.desc.otraVez', { desc: describirAccion(apagado, t) })}`;
  }
  return base;
}

/**
 * Lo que hace la pulsación de una perilla (T-HW-19).
 *
 * Con `modosPerilla` pulsar ya no ejecuta su acción: cambia de modo, y el
 * inspector lo dice así — «PULSAR · CAMBIAR MODO (3)» — en vez de enseñar la
 * acción que no va a correr. Sin modos es la descripción de siempre.
 */
export function describirPulsar(boton: ButtonConfig | undefined, t: Traductor): string {
  const n = boton?.modosPerilla?.length ?? 0;
  if (n > 0) return t('disp.desc.cambiarModo', { n });
  return describirAccion(boton?.action, t);
}

export interface FilaGestoPreset {
  gesto?: string;
  desc: string;
  otraVez?: string;
}

/**
 * En un preset, un atajo o un script solo dicen **qué tecla** pulsan
 * («ATAJO CTRL + Z»), no para qué; la etiqueta del preset sí («DESHACER»).
 * Juntos se lee las dos cosas: «DESHACER · CTRL + Z». Y si el hueco alterna
 * (pulsar otra vez deshace), la segunda acción va en su propia línea más tenue
 * («OTRA VEZ: ESC») para evitar textos larguísimos que se desborden.
 */
function resolverDescHueco(
  hueco: PresetDock['huecos'][number] | undefined,
  t: Traductor,
): string {
  const accion = hueco?.action;
  const tipo = accion?.type;
  if (!hueco?.label || (tipo !== 'hotkey' && tipo !== 'script')) {
    return describirAccion(accion, t);
  }
  const detalle = tipo === 'hotkey' ? formatearHotkey(accion?.hotkey ?? '', t) : describirAccion(accion, t);
  return hueco.label.toUpperCase() === detalle.toUpperCase() ? detalle : `${hueco.label} · ${detalle}`;
}

function resolverOtraVez(
  hueco: PresetDock['huecos'][number] | undefined,
  t: Traductor,
): string | undefined {
  const apagado = hueco?.isToggle ? hueco?.actionToggleOff : undefined;
  if (!apagado || !apagado.type || apagado.type === 'none') {
    return undefined;
  }
  const descApagado = apagado.type === 'hotkey'
    ? formatearHotkey(apagado.hotkey ?? '', t)
    : describirAccion(apagado, t);
  return t('disp.desc.otraVez', { desc: descApagado });
}

function describirHueco(
  hueco: PresetDock['huecos'][number] | undefined,
  t: Traductor,
): { desc: string; otraVez?: string } {
  return {
    desc: resolverDescHueco(hueco, t),
    otraVez: resolverOtraVez(hueco, t),
  };
}

export function describirPreset(
  preset: PresetDock,
  control: ControlSuperficie,
  t: Traductor,
): FilaGestoPreset[] {
  if (control === 'knob') {
    const h0 = describirHueco(preset.huecos[0], t);
    const h1 = describirHueco(preset.huecos[1], t);
    const h2 = describirHueco(preset.huecos[2], t);
    return [
      { gesto: t('disp.gesto.giroIzq'), desc: h0.desc, otraVez: h0.otraVez },
      { gesto: t('disp.gesto.pulsar'), desc: h1.desc, otraVez: h1.otraVez },
      { gesto: t('disp.gesto.giroDer'), desc: h2.desc, otraVez: h2.otraVez },
    ];
  }
  if (control === 'swipe') {
    const h0 = describirHueco(preset.huecos[0], t);
    const h1 = describirHueco(preset.huecos[1], t);
    const descCombinada = [h0.desc, h1.desc].filter(Boolean).join(' / ');
    const otraVezCombinada = [h0.otraVez, h1.otraVez].filter(Boolean).join(' / ') || undefined;
    return [
      {
        gesto: t('disp.gesto.deslizar'),
        desc: descCombinada,
        otraVez: otraVezCombinada,
      },
    ];
  }
  const h0 = describirHueco(preset.huecos[0], t);
  return [
    {
      desc: h0.desc,
      otraVez: h0.otraVez,
    },
  ];
}
