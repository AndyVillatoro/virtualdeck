/* Prueba pura de lo que NO se importa con una configuracion (T-SEC-07, H-14).

   Correr en la raiz del repo:
     npx tsx scripts/probar-ajustes-equipo.ts
 */

import { conservarAjustesDelEquipo } from '../src/comun/ajustesEquipo';

const fallos: string[] = [];
function comprobar(cond: boolean, msg: string) {
  if (!cond) { fallos.push(msg); console.error('  FALLO: ' + msg); } else console.log('  ok ' + msg);
}

const actual = {
  remote: { enabled: false, port: 8787, token: 'mio', allowLan: false },
  companion: { enabled: true, port: 48201, token: 'ext' },
  sensors: { enabled: true, host: '127.0.0.1', port: 8085, showWidget: true },
  rgb: { enabled: true, host: '127.0.0.1', port: 6742, autoConnect: true, spawnOnStart: false, profiles: [] },
};

const ajena = {
  buttons: [{ id: 'b1' }],
  remote: { enabled: true, port: 8787, token: 'atacante', allowLan: true },
  companion: { enabled: true, port: 48201, token: 'otro' },
  sensors: { enabled: true, host: '10.0.0.9', port: 80, spawnOnStart: true, spawnElevated: true, lhmPath: 'C:/x/malo.exe', showWidget: false },
  rgb: { enabled: true, host: '10.0.0.9', port: 1, openrgbPath: 'C:/x/otro.exe', spawnOnStart: true, autoConnect: true, profiles: [{ id: 'p1' }] },
};

const r = conservarAjustesDelEquipo(ajena, actual) as typeof ajena;
comprobar(r.remote.token === 'mio' && r.remote.enabled === false && r.remote.allowLan === false, 'el mando LAN se queda como en este equipo');
comprobar(r.companion.token === 'ext', 'la extension se queda como en este equipo');
comprobar(r.sensors.lhmPath === undefined && r.sensors.spawnElevated === undefined && r.sensors.spawnOnStart === undefined, 'ni ruta ni arranque elevado de LHM del archivo');
comprobar(r.sensors.host === '127.0.0.1' && r.sensors.port === 8085, 'host y puerto de sensores del equipo');
comprobar(r.sensors.showWidget === false, 'lo demas de sensores si se importa');
comprobar(r.rgb.openrgbPath === undefined && r.rgb.spawnOnStart === false && r.rgb.host === '127.0.0.1', 'ni ruta ni arranque de OpenRGB del archivo');
comprobar(r.rgb.profiles.length === 1, 'los perfiles RGB si se importan');
comprobar(r.buttons.length === 1, 'los botones si se importan');

const sinLocal = conservarAjustesDelEquipo(ajena, {}) as Record<string, unknown>;
comprobar(!('remote' in sinLocal) && !('companion' in sinLocal), 'sin ajustes locales, las secciones del equipo se quitan (valen los por defecto)');
comprobar(conservarAjustesDelEquipo(null, actual) === null, 'un archivo que no es objeto pasa tal cual (lo rechaza la validacion)');

if (fallos.length) { console.error(`\nprobar-ajustes-equipo: ${fallos.length} fallo(s)`); process.exitCode = 1; }
else console.log('probar-ajustes-equipo: ok');
