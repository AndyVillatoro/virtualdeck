/* Prueba pura del límite de frecuencia del mando LAN (T-SEC-07, H-04).

   Correr en la raíz del repo:
     npx tsx scripts/probar-limite-mando.ts
 */

import { LimiteFrecuencia, IntentosPareja } from '../electron/main/mando/limiteFrecuencia';

const fallos: string[] = [];
function comprobar(cond: boolean, msg: string) {
  if (!cond) { fallos.push(msg); console.error('  FALLO: ' + msg); } else console.log('  ok ' + msg);
}

let reloj = 0;
const ahora = () => reloj;

// Ráfaga: 120 de golpe pasan (abrir una página con muchas imágenes), la 121 no.
const api = new LimiteFrecuencia({ capacidad: 120, porSegundo: 30 }, ahora);
let admitidas = 0;
for (let i = 0; i < 121; i++) if (api.admitir('10.0.0.2')) admitidas++;
comprobar(admitidas === 120, 'rafaga de 120 admitida y la 121 cortada');

// Otra IP no paga lo de la primera.
comprobar(api.admitir('10.0.0.3'), 'cada IP tiene su propio cubo');

// Medio segundo después se recuperan 15.
reloj += 500;
admitidas = 0;
for (let i = 0; i < 20; i++) if (api.admitir('10.0.0.2')) admitidas++;
comprobar(admitidas === 15, 'se recuperan 30 por segundo');

// Uso real del móvil: un slider a 20/s durante 10 s nunca se corta.
const slider = new LimiteFrecuencia({ capacidad: 120, porSegundo: 30 }, ahora);
let cortadas = 0;
for (let i = 0; i < 200; i++) { reloj += 50; if (!slider.admitir('10.0.0.4')) cortadas++; }
comprobar(cortadas === 0, 'un slider a 20 por segundo no se corta');

// Emparejamiento: una IP que agota su cupo no quema el código para otra.
const pareja = new IntentosPareja(5, 20);
for (let i = 0; i < 5; i++) pareja.contar('10.0.0.66');
comprobar(!pareja.contar('10.0.0.66'), 'la IP que prueba en bucle se queda sin cupo');
comprobar(pareja.contar('10.0.0.2') && !pareja.agotado(), 'el telefono del dueño aun puede emparejar');

// Tope global: 20 intentos entre todas las IPs agotan el código.
const global = new IntentosPareja(5, 20);
for (let i = 0; i < 20; i++) global.contar(`10.0.1.${i}`);
comprobar(global.agotado() && !global.contar('10.0.0.2'), 'el tope global de 20 agota el codigo');

if (fallos.length) { console.error(`\nprobar-limite-mando: ${fallos.length} fallo(s)`); process.exitCode = 1; }
else console.log('probar-limite-mando: ok');
