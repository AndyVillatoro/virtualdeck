/**
 * Pruebas puras de los endurecimientos de T-SEC-08.
 *
 * Solo funciones que no necesitan Electron para correr (aunque algunos
 * módulos importen `electron`, las funciones probadas no lo usan).
 */

import assert from 'node:assert';
import { resolve } from 'node:path';
import { rutaImagenDesdeUrl } from '../electron/main/ventana/protocoloVd';
import { direccionAceptable } from '../electron/main/integraciones/galeria';
import { paginaMando } from '../electron/main/mando/paginaMando';
import { mandar, type OrdenRemota } from '../electron/main/mando/mandoRemoto';

const dir = resolve('C:/fake/virtualdeck/images');

function ok(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

// 1. Protocolo vd:// rechaza % y # (T-SEC-07 H-13).
const foto = rutaImagenDesdeUrl('vd://images/foto.png', dir);
ok(foto != null && foto.includes('foto.png'), 'foto.png válida');
ok(rutaImagenDesdeUrl('vd://images/foto%23.png', dir) === null, '# debe rechazarse');
ok(rutaImagenDesdeUrl('vd://images/foto%25.png', dir) === null, '% debe rechazarse');
ok(rutaImagenDesdeUrl('vd://images/../secreto.txt', dir) === null, 'traversal directo');
ok(rutaImagenDesdeUrl('vd://images/..%2f..%2fsecreto.txt', dir) === null, 'traversal codificado');
ok(rutaImagenDesdeUrl('vd://images/nul.png', dir) === null, 'nombre reservado');
ok(rutaImagenDesdeUrl('vd://images/a*.png', dir) === null, '* sigue rechazado (comodin)');

// 2. Galería rechaza loopback/IPv6 privados (T-SEC-07 H-12).
ok(direccionAceptable('https://example.com/path') === true, 'example.com aceptable');
ok(direccionAceptable('https://127.0.0.1') === false, '127.0.0.1 rechazado');
ok(direccionAceptable('https://[::1]') === false, '[::1] rechazado');
ok(direccionAceptable('https://[::ffff:127.0.0.1]') === false, '[::ffff:...] rechazado');
ok(direccionAceptable('https://[fe80::1]') === false, 'fe80 rechazado');
ok(direccionAceptable('https://[fc00::1]') === false, 'fc00 rechazado');
ok(direccionAceptable('https://[fd00::1]') === false, 'fd00 rechazado');
ok(direccionAceptable('https://192.168.1.1') === false, '192.168 rechazado');
ok(direccionAceptable('http://example.com') === false, 'http rechazado');
ok(direccionAceptable('https://fdroid.org/repo.json') === true, 'un dominio que empieza por fd sigue valido');
ok(direccionAceptable('https://fcbarcelona.com') === true, 'un dominio que empieza por fc sigue valido');

// 3. Página del mando sanea acento y tema (T-SEC-07 H-03).
const html = paginaMando('nonce-s', 'nonce-c', {
  theme: 'invalido',
  accent: '"</style><script>alert(1)</script>',
});
ok(!html.includes('</style><script>'), 'acento malicioso no se interpola');
ok(html.includes('#4a8ef0') || html.includes('#4A8EF0'), 'acento por defecto usado');
ok(html.includes('"dark"') || html.includes("'dark'"), 'tema inválido cae a dark');

// 4. Acento válido se mantiene.
const html2 = paginaMando('nonce-s', 'nonce-c', { theme: 'dot480', accent: '#ff3b30' });
ok(html2.includes('#ff3b30') || html2.includes('#FF3B30'), 'acento válido se conserva');

// 5. Mando remoto: host con ruta y token con caracteres de control se cortan
// antes de abrir ninguna conexión (T-SEC-07 H-05).
async function remoto() {
  const r1 = await mandar({ host: '192.168.1.1:80/admin/reboot?x=1#', token: 'abc', boton: 'b1' } as OrdenRemota);
  ok(!r1.ok && r1.error === 'sinHost', 'host con ruta rechazado');
  const r2 = await mandar({ host: '127.0.0.1', token: '\u0001abc', boton: 'b1' } as OrdenRemota);
  ok(!r2.ok && r2.error === 'sinToken', 'token con control al principio rechazado');
}

remoto().then(() => console.log('probar-endurecer: OK'), (e) => { console.error(e.message); process.exitCode = 1; });
