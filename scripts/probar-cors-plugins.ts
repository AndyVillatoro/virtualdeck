/**
 * Pruebas puras del filtro CORS de Property Inspector (T-SEC-07 H-10).
 *
 * No necesita Electron: solo evalúa la función pura `debeInyectarCors`.
 */

import assert from 'node:assert';
import { debeInyectarCors, esHostLocal } from '../electron/main/plugins/ventanaPI';

function ok(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

// Loopback IPv4 entero (127.0.0.0/8) debe rechazar CORS.
ok(!debeInyectarCors('http://127.0.0.1:8080/data', 12345), '127.0.0.1');
ok(!debeInyectarCors('http://127.0.0.2:8080/data', 12345), '127.0.0.2');
ok(!debeInyectarCors('http://127.255.255.255:8080/data', 12345), '127.255.255.255');

// localhost y *.localhost deben rechazar CORS.
ok(!debeInyectarCors('http://localhost:8080/data', 12345), 'localhost');
ok(!debeInyectarCors('http://foo.localhost:8080/data', 12345), '*.localhost');

// IPv6 loopback y mapeadas deben rechazar CORS.
ok(!debeInyectarCors('http://[::1]:8080/data', 12345), '::1');
ok(!debeInyectarCors('http://[::ffff:127.0.0.1]:8080/data', 12345), '::ffff:127.0.0.1');

// Rangos privados IPv4 deben rechazar CORS.
ok(!debeInyectarCors('http://10.0.0.1/data', 12345), '10.0.0.1');
ok(!debeInyectarCors('http://172.16.0.1/data', 12345), '172.16.0.1');
ok(!debeInyectarCors('http://172.31.255.255/data', 12345), '172.31.255.255');
ok(!debeInyectarCors('http://192.168.1.1/data', 12345), '192.168.1.1');
ok(!debeInyectarCors('http://169.254.1.1/data', 12345), '169.254.1.1');

// IPv6 link-local y unique-local deben rechazar CORS.
ok(!debeInyectarCors('http://[fe80::1]/data', 12345), 'fe80::1');
ok(!debeInyectarCors('http://[fc00::1]/data', 12345), 'fc00::1');
ok(!debeInyectarCors('http://[fd00::1]/data', 12345), 'fd00::1');

// Nombres sin punto (posibles nombres de equipo locales) deben rechazar CORS.
ok(!debeInyectarCors('http://mi-servidor/data', 12345), 'nombre sin punto');
ok(!debeInyectarCors('http://foo/data', 12345), 'foo sin punto');

// Dominios públicos normales SÍ deben recibir CORS.
ok(debeInyectarCors('http://api.example.com/data', 12345), 'api.example.com');
ok(debeInyectarCors('https://fdroid.org/repo.json', 12345), 'fdroid.org');
ok(debeInyectarCors('https://fcbarcelona.com/data', 12345), 'fcbarcelona.com');
ok(debeInyectarCors('https://cdn.jsdelivr.net/npm/foo', 12345), 'cdn.jsdelivr.net');

// URL inválida se trata como permitida (mantiene comportamiento anterior).
ok(debeInyectarCors('no-es-una-url', 12345), 'URL inválida pasa');

// La primitiva `esHostLocal` acepta hostname con/sin corchetes.
ok(esHostLocal('[::1]'), 'esHostLocal con corchetes');
ok(!esHostLocal('example.com'), 'esHostLocal rechaza público');

console.log('probar-cors-plugins: OK');

// El servidor de archivos del propio plugin sigue recibiendo CORS (su PI carga de ahí).
ok(debeInyectarCors('http://127.0.0.1:12345/pi/index.html', 12345), 'puerto propio del plugin');
ok(!debeInyectarCors('http://127.0.0.1:12346/otro', 12345), 'otro puerto local no');
ok(debeInyectarCors('https://fdroid.org/x', 12345), 'dominio publico que empieza por fd');
console.log('probar-cors-plugins: casos del puerto propio ok');
