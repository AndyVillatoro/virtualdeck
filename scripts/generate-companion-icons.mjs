import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { deflateSync, crc32 } from 'node:zlib';

function calcularCrc32(buf) {
  // En Node >= 18 zlib.crc32 está disponible o lo calculamos con tabla estándar
  if (typeof crc32 === 'function') {
    return crc32(buf);
  }
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) {
      c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
    }
  }
  return (c ^ 0xffffffff) >>> 0;
}

function crearChunk(tipo, datos) {
  const longitud = Buffer.alloc(4);
  longitud.writeUInt32BE(datos.length, 0);
  const tipoBuffer = Buffer.from(tipo, 'ascii');
  const contenido = Buffer.concat([tipoBuffer, datos]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(calcularCrc32(contenido), 0);
  return Buffer.concat([longitud, contenido, crc]);
}

function generarIconoPng(tamano) {
  const firma = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR: 13 bytes
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(tamano, 0); // width
  ihdr.writeUInt32BE(tamano, 4); // height
  ihdr.writeUInt8(8, 8);         // bit depth (8)
  ihdr.writeUInt8(6, 9);         // color type (RGBA = 6)
  ihdr.writeUInt8(0, 10);        // compression
  ihdr.writeUInt8(0, 11);        // filter
  ihdr.writeUInt8(0, 12);        // interlace

  const chunkIhdr = crearChunk('IHDR', ihdr);

  // Scanlines RGBA: (1 byte filtro 0x00 + tamano * 4 bytes RGBA) * tamano filas
  const bytesPorFila = 1 + tamano * 4;
  const rawData = Buffer.alloc(bytesPorFila * tamano);

  const radioBorde = Math.max(1, Math.floor(tamano * 0.15));

  for (let y = 0; y < tamano; y++) {
    const offsetFila = y * bytesPorFila;
    rawData.writeUInt8(0, offsetFila); // Filter 0

    for (let x = 0; x < tamano; x++) {
      const pxOffset = offsetFila + 1 + x * 4;

      // Fondo OLED: #070809 (7, 8, 9, 255)
      let r = 7, g = 8, b = 9, a = 255;

      // Borde redondeado sutil
      const distEsquina = Math.max(
        0,
        Math.max(radioBorde - x, 0) + Math.max(radioBorde - y, 0),
        Math.max(x - (tamano - 1 - radioBorde), 0) + Math.max(radioBorde - y, 0),
        Math.max(radioBorde - x, 0) + Math.max(y - (tamano - 1 - radioBorde), 0),
        Math.max(x - (tamano - 1 - radioBorde), 0) + Math.max(y - (tamano - 1 - radioBorde), 0)
      );

      // Icono central: Matriz de puntos OLED cyan/celeste (#38bdf8)
      // Representando una pantalla / deck con un punto central y un marco
      const margen = Math.floor(tamano * 0.22);
      const enMarco = (x >= margen && x < tamano - margen && (y === margen || y === tamano - margen - 1)) ||
                      (y >= margen && y < tamano - margen && (x === margen || x === tamano - margen - 1));

      const centroX = Math.floor(tamano / 2);
      const centroY = Math.floor(tamano / 2);
      const radioPunto = Math.max(1, Math.floor(tamano * 0.12));
      const distCentro = Math.sqrt((x - centroX) ** 2 + (y - centroY) ** 2);

      if (distCentro <= radioPunto) {
        // Punto central activo: #38bdf8
        r = 56; g = 189; b = 248; a = 255;
      } else if (enMarco) {
        // Marco de pantalla: #1e293b
        r = 30; g = 41; b = 59; a = 255;
      }

      rawData.writeUInt8(r, pxOffset);
      rawData.writeUInt8(g, pxOffset + 1);
      rawData.writeUInt8(b, pxOffset + 2);
      rawData.writeUInt8(a, pxOffset + 3);
    }
  }

  const comprimido = deflateSync(rawData);
  const chunkIdat = crearChunk('IDAT', comprimido);
  const chunkIend = crearChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([firma, chunkIhdr, chunkIdat, chunkIend]);
}

const tamanos = [16, 32, 48, 128];
for (const t of tamanos) {
  const png = generarIconoPng(t);
  const destino = join('companion-extension', 'icons', `icon-${t}.png`);
  writeFileSync(destino, png);
  console.log(`Generado ${destino} (${png.length} bytes)`);
}
