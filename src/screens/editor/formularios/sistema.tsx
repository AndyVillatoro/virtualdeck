/** Lo que le habla al sistema: audio, teclas, portapapeles, procesos, pantalla. */
//
// La fachada: los catorce formularios viven repartidos por subfamilia en
// `./sistema/` y se reexportan con los mismos nombres, que es lo que importa
// `formularios/index.tsx`.

export { FormAudioDevice, FormVolumeSet } from './sistema/audio';
export { FormAdjust, FormBrightness } from './sistema/ajustes';
export { FormHotkey, FormClipboard, FormTypeText, FormKillProcess } from './sistema/entrada';
export { FormWindowSnap, FormWindowCycle } from './sistema/ventanas';
export { FormNotify, FormTts } from './sistema/avisos';
export { FormRegionCapture, FormMediaPlayPause } from './sistema/pantalla';
