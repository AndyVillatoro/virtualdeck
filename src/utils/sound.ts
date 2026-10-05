// 5.4 — Catálogo de timbres para press. Antes existía un único click; ahora el
// usuario elige entre cuatro perfiles (incluido 'off'). Todos generados por
// Web Audio para no enviar archivos al bundle.
import type { DeckConfig } from '../types';

export type SoundProfile = 'click' | 'tick' | 'thud' | 'off';

// `label` es una **clave** del diccionario, no el texto: este archivo no es un
// componente y no puede llamar a `useT()`. Lo traduce quien lo pinta.
export const SOUND_PROFILES: { id: SoundProfile; label: string }[] = [
  { id: 'click', label: 'sound.click' },
  { id: 'tick',  label: 'sound.tick' },
  { id: 'thud',  label: 'sound.thud' },
  { id: 'off',   label: 'sound.off' },
];

let _ctx: AudioContext | null = null;

function ctx(): AudioContext {
  if (!_ctx || _ctx.state === 'closed') _ctx = new AudioContext();
  return _ctx;
}

function playClickTimbre(ac: AudioContext) {
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.connect(gain);
  gain.connect(ac.destination);
  osc.type = 'sine';
  osc.frequency.setValueAtTime(1400, ac.currentTime);
  osc.frequency.exponentialRampToValueAtTime(700, ac.currentTime + 0.05);
  gain.gain.setValueAtTime(0.12, ac.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.09);
  osc.start(ac.currentTime);
  osc.stop(ac.currentTime + 0.09);
}

function playTickTimbre(ac: AudioContext) {
  // Tick corto y agudo — pulso casi instantáneo de ruido filtrado.
  const buf = ac.createBuffer(1, ac.sampleRate * 0.025, ac.sampleRate);
  const ch = buf.getChannelData(0);
  for (let i = 0; i < ch.length; i++) {
    ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / ch.length, 2.5);
  }
  const src = ac.createBufferSource();
  src.buffer = buf;
  const filter = ac.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = 2200;
  const gain = ac.createGain();
  gain.gain.setValueAtTime(0.18, ac.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.025);
  src.connect(filter); filter.connect(gain); gain.connect(ac.destination);
  src.start();
}

function playThudTimbre(ac: AudioContext) {
  // Thud grave y corto, simulando golpe de tecla mecánica con cuerpo.
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.connect(gain);
  gain.connect(ac.destination);
  osc.type = 'sine';
  osc.frequency.setValueAtTime(220, ac.currentTime);
  osc.frequency.exponentialRampToValueAtTime(80, ac.currentTime + 0.12);
  gain.gain.setValueAtTime(0.22, ac.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.15);
  osc.start(ac.currentTime);
  osc.stop(ac.currentTime + 0.15);
}

export function playSound(profile: SoundProfile = 'click') {
  if (profile === 'off') return;
  try {
    const ac = ctx();
    switch (profile) {
      case 'click': playClickTimbre(ac); return;
      case 'tick':  playTickTimbre(ac); return;
      case 'thud':  playThudTimbre(ac); return;
    }
  } catch {}
}

// Ganancia de cada perfil (la misma que su timbre): el giro suena al 50 %.
const GANANCIA_PERFIL: Record<Exclude<SoundProfile, 'off'>, number> = {
  click: 0.12, tick: 0.18, thud: 0.22,
};

let ultimoGiro = 0;

/**
 * Tic de giro de perilla o tira: más grave y corto que el click (700→350 Hz
 * en 0.045 s frente a 1400→700 Hz en 0.09 s), al 50 % de la ganancia del
 * perfil elegido y con tope de uno cada 40 ms — girando rápido no se encolan.
 * Respeta el perfil `off` (quien llama respeta `soundOnPress`).
 */
export function playGiro(profile: SoundProfile = 'click') {
  if (profile === 'off') return;
  const ahora = Date.now();
  if (ahora - ultimoGiro < 40) return;
  ultimoGiro = ahora;
  try {
    const ac = ctx();
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(700, ac.currentTime);
    osc.frequency.exponentialRampToValueAtTime(350, ac.currentTime + 0.03);
    gain.gain.setValueAtTime((GANANCIA_PERFIL[profile] ?? 0.12) * 0.5, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.045);
    osc.start(ac.currentTime);
    osc.stop(ac.currentTime + 0.045);
  } catch {}
}

/**
 * Cambio de modo de una perilla multimodo (T-HW-19): distinto del giro a
 * propósito — ascendente (900→1350 Hz) en vez de descendente, a ganancia
 * completa y un poco más largo (0,07 s). Corto igual: es un aviso, no un tema.
 * Respeta el perfil `off` (quien llama respeta `soundOnPress`).
 */
export function playModo(profile: SoundProfile = 'click') {
  if (profile === 'off') return;
  try {
    const ac = ctx();
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(900, ac.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1350, ac.currentTime + 0.05);
    gain.gain.setValueAtTime(GANANCIA_PERFIL[profile] ?? 0.12, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.07);
    osc.start(ac.currentTime);
    osc.stop(ac.currentTime + 0.07);
  } catch {}
}

/**
 * Si suena al pulsar, en un solo sitio.
 *
 * Estaba repetido con `?? true` en `App`, `preferencias` y `TitleBar`, y con
 * `?? false` en la barra flotante: el mismo interruptor sonaba en el deck y
 * no en la barra. Todo el que lo necesite pasa por aquí.
 */
export function sonidoActivo(cfg: Pick<DeckConfig, 'soundOnPress'>): boolean {
  return cfg.soundOnPress ?? true;
}

/**
 * El timbre elegido, en un solo sitio (lo mismo que `sonidoActivo`, con el
 * `?? 'click'` que estaba copiado en cada pantalla).
 */
export function perfilSonido(cfg: Pick<DeckConfig, 'soundProfile'>): SoundProfile {
  return cfg.soundProfile ?? 'click';
}

