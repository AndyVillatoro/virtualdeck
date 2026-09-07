/**
 * Un servidor que habla el protocolo del SDK de OpenRGB.
 *
 * Existe para las capturas de prensa: el gestor RGB no se puede fotografiar
 * sin dispositivos, y esta máquina no tiene ninguno. En vez de inyectar
 * dispositivos falsos dentro de `electron/main/rgb.ts` —que dejaría el código
 * de la aplicación sin ejercitar justo en la pantalla que se enseña—, se
 * levanta un servidor de verdad en el puerto 6742 y VirtualDeck se conecta a
 * él con su `openrgb-sdk` de siempre.
 *
 * El formato binario está copiado del **lector** del SDK
 * (`node_modules/openrgb-sdk/src/device.ts`): las cadenas van con su longitud
 * en 16 bits **incluyendo el cero final**, y el orden de los campos de un modo
 * cambia según la versión del protocolo. Se responde `3` a la negociación
 * porque es la versión más baja que ya trae brillo, que es lo que el gestor
 * enseña; con la 4 y la 5 habría que añadir segmentos y nombres alternativos
 * de LED que nada de esto usa.
 */
import { createServer } from 'node:net';

const CMD = {
  contarControladores: 0,
  datosDelControlador: 1,
  versionDelProtocolo: 40,
  nombreDelCliente: 50,
  listaDePerfiles: 150,
};
const VERSION = 3;

// ── Empaquetado ───────────────────────────────────────────────────────────
const u32 = (n) => { const b = Buffer.alloc(4); b.writeUInt32LE(n >>> 0); return b; };
const i32 = (n) => { const b = Buffer.alloc(4); b.writeInt32LE(n); return b; };
const u16 = (n) => { const b = Buffer.alloc(2); b.writeUInt16LE(n); return b; };

/** Cadena con longitud en 16 bits que **cuenta el cero final**. */
function cadena(s) {
  const t = Buffer.from(s, 'utf8');
  return Buffer.concat([u16(t.length + 1), t, Buffer.from([0])]);
}

const color = (hex) => Buffer.from([
  parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16), 0,
]);

const listaDeColores = (arr) => Buffer.concat([u16(arr.length), ...arr.map(color)]);

// Bits de `flags` de un modo, tal y como los lee el SDK.
export const F = {
  velocidad: 1, dirIzqDer: 2, dirArrAba: 4, dirHorVer: 8,
  brillo: 16, colorPorLed: 32, colorDelModo: 64, colorAlAzar: 128,
};

function modo(m) {
  return Buffer.concat([
    cadena(m.nombre),
    i32(m.valor ?? 0),
    u32(m.flags), u32(m.velocidadMin ?? 0), u32(m.velocidadMax ?? 0),
    u32(m.brilloMin ?? 0), u32(m.brilloMax ?? 0),
    u32(m.colorMin ?? 0), u32(m.colorMax ?? 0),
    u32(m.velocidad ?? 0), u32(m.brillo ?? 0),
    u32(m.direccion ?? 0), u32(m.modoDeColor),
    listaDeColores(m.colores ?? []),
  ]);
}

function zona(z) {
  return Buffer.concat([
    cadena(z.nombre), i32(z.tipo),
    u32(z.ledsMin), u32(z.ledsMax), u32(z.leds),
    u16(0), // sin matriz
  ]);
}

/** El cuerpo de `datosDelControlador`, con su tamaño delante. */
function paqueteDeDispositivo(d) {
  const leds = d.zonas.flatMap((z) =>
    Array.from({ length: z.leds }, (_, i) => Buffer.concat([cadena(`${z.nombre} ${i + 1}`), u32(0)])));
  const colores = d.zonas.flatMap((z) => Array.from({ length: z.leds }, (_, i) => z.colores[i % z.colores.length]));

  const cuerpo = Buffer.concat([
    i32(d.tipo),
    cadena(d.nombre), cadena(d.fabricante), cadena(d.descripcion),
    cadena(d.version), cadena(d.serie), cadena(d.ubicacion),
    u16(d.modos.length), i32(d.modoActivo),
    ...d.modos.map(modo),
    u16(d.zonas.length), ...d.zonas.map(zona),
    u16(leds.length), ...leds,
    listaDeColores(colores),
  ]);
  return Buffer.concat([u32(cuerpo.length + 4), cuerpo]);
}

// ── Los dispositivos que se enseñan ───────────────────────────────────────
// Nombres de modelos reales porque es lo que un usuario ve en OpenRGB, y
// ninguno identifica a nadie: no hay número de serie ni nombre de equipo.
const MODOS_PLACA = [
  { nombre: 'Direct',         flags: F.colorPorLed | F.brillo, modoDeColor: 1, brilloMin: 0, brilloMax: 100, brillo: 100, colorMin: 0, colorMax: 0 },
  { nombre: 'Static',         flags: F.colorDelModo | F.brillo, modoDeColor: 2, brilloMin: 0, brilloMax: 100, brillo: 90, colorMin: 1, colorMax: 1, colores: ['#4a8ef0'] },
  { nombre: 'Breathing',      flags: F.velocidad | F.colorDelModo | F.brillo, modoDeColor: 2, velocidadMin: 0, velocidadMax: 5, velocidad: 3, brilloMin: 0, brilloMax: 100, brillo: 80, colorMin: 1, colorMax: 1, colores: ['#a78bfa'] },
  { nombre: 'Spectrum Cycle', flags: F.velocidad | F.brillo, modoDeColor: 0, velocidadMin: 0, velocidadMax: 5, velocidad: 2, brilloMin: 0, brilloMax: 100, brillo: 85 },
  { nombre: 'Rainbow Wave',   flags: F.velocidad | F.dirIzqDer | F.brillo, modoDeColor: 0, velocidadMin: 0, velocidadMax: 5, velocidad: 3, brilloMin: 0, brilloMax: 100, brillo: 85 },
];

const DISPOSITIVOS = [
  {
    nombre: 'ASUS ROG STRIX B650-E GAMING WIFI', fabricante: 'ASUS', tipo: 0,
    descripcion: 'ASUS Aura Motherboard', version: '1.0', serie: '', ubicacion: 'I2C: /dev/i2c-0, address 0x4E',
    modoActivo: 0, modos: MODOS_PLACA,
    zonas: [
      { nombre: 'Aura Addressable 1', tipo: 2, ledsMin: 0, ledsMax: 120, leds: 16, colores: ['#4a8ef0', '#2dd4bf', '#a78bfa'] },
      { nombre: 'Motherboard',        tipo: 1, ledsMin: 3, ledsMax: 3,   leds: 3,  colores: ['#4a8ef0'] },
    ],
  },
  {
    nombre: 'Corsair Vengeance RGB Pro', fabricante: 'Corsair', tipo: 1,
    descripcion: 'Corsair RGB DRAM', version: '', serie: '', ubicacion: 'I2C: /dev/i2c-0, address 0x58',
    modoActivo: 1, modos: MODOS_PLACA.slice(0, 4),
    zonas: [
      { nombre: 'DIMM 1', tipo: 1, ledsMin: 10, ledsMax: 10, leds: 10, colores: ['#4a8ef0'] },
      { nombre: 'DIMM 2', tipo: 1, ledsMin: 10, ledsMax: 10, leds: 10, colores: ['#4a8ef0'] },
    ],
  },
  {
    nombre: 'Razer BlackWidow V3', fabricante: 'Razer', tipo: 5,
    descripcion: 'Razer Keyboard Device', version: '', serie: '', ubicacion: 'HID: /dev/hidraw3',
    modoActivo: 0, modos: MODOS_PLACA,
    zonas: [{ nombre: 'Keyboard', tipo: 1, ledsMin: 22, ledsMax: 22, leds: 22, colores: ['#4a8ef0', '#4a8ef0', '#2dd4bf'] }],
  },
];

function cabecera(idDispositivo, comando, tamano) {
  const b = Buffer.alloc(16);
  b.write('ORGB', 0, 'ascii');
  b.writeUInt32LE(idDispositivo, 4);
  b.writeUInt32LE(comando, 8);
  b.writeUInt32LE(tamano, 12);
  return b;
}

export function arrancar(puerto = 6742) {
  const servidor = createServer((sock) => {
    let pendiente = Buffer.alloc(0);
    sock.on('data', (trozo) => {
      pendiente = Buffer.concat([pendiente, trozo]);
      // Los mensajes llegan pegados: se consume mientras haya uno completo.
      while (pendiente.length >= 16) {
        if (pendiente.subarray(0, 4).toString('ascii') !== 'ORGB') { pendiente = Buffer.alloc(0); return; }
        const idDispositivo = pendiente.readUInt32LE(4);
        const comando = pendiente.readUInt32LE(8);
        const tamano = pendiente.readUInt32LE(12);
        if (pendiente.length < 16 + tamano) return;
        pendiente = pendiente.subarray(16 + tamano);

        const responder = (cuerpo) => sock.write(Buffer.concat([cabecera(idDispositivo, comando, cuerpo.length), cuerpo]));
        if (comando === CMD.versionDelProtocolo) responder(u32(VERSION));
        else if (comando === CMD.contarControladores) responder(u32(DISPOSITIVOS.length));
        else if (comando === CMD.datosDelControlador) responder(paqueteDeDispositivo(DISPOSITIVOS[idDispositivo] ?? DISPOSITIVOS[0]));
        else if (comando === CMD.listaDePerfiles) responder(Buffer.concat([u32(6), u16(0)]));
        // Todo lo demás (pintar LEDs, cambiar de modo, redimensionar) se acepta
        // en silencio: el protocolo no espera respuesta y aquí no hay luces.
      }
    });
    sock.on('error', () => {});
  });
  return new Promise((ok) => servidor.listen(puerto, '127.0.0.1', () => ok(servidor)));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  arrancar().then(() => console.log('openrgb falso escuchando en 6742'));
}
