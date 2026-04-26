// 5.4 — Catálogo de timbres para press. Antes existía un único click; ahora el
// usuario elige entre cuatro perfiles (incluido 'off'). Todos generados por
// Web Audio para no enviar archivos al bundle.

export type SoundProfile = 'click' | 'tick' | 'thud' | 'off';

export const SOUND_PROFILES: { id: SoundProfile; label: string }[] = [
  { id: 'click', label: 'Click mecánico' },
  { id: 'tick',  label: 'Tick' },
  { id: 'thud',  label: 'Thud' },
  { id: 'off',   label: 'Silencio' },
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

// Compat con código previo: playClick es el perfil 'click'.
export function playClick() { playSound('click'); }
