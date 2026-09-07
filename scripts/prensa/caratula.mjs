/**
 * La carátula de la pista de las capturas.
 *
 * Es una retícula de puntos generada aquí, no una portada de nadie: una
 * captura de la ficha de la Store con la carátula de un disco real publica
 * material con derechos de otra persona. Sale del mismo lenguaje visual que el
 * resto de la aplicación —la trama de puntos y los tres colores de la
 * paleta—, así que en pantalla se lee como parte de VirtualDeck.
 *
 *   node scripts/prensa/caratula.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const LADO = 17;         // el mismo 17×17 de los iconos de marca
const PASO = 14;
const RELLENO = 11;
const TAMANO = LADO * PASO + RELLENO * 2;

const FONDO = '#191919';
const COLORES = ['#4a8ef0', '#2dd4bf', '#a78bfa'];
const APAGADO = 'rgba(220,220,220,0.05)';

/** Tres ondas concéntricas: encendido si el radio cae dentro de un anillo. */
function svg() {
  const centro = (LADO - 1) / 2;
  let puntos = '';
  for (let y = 0; y < LADO; y++) {
    for (let x = 0; x < LADO; x++) {
      const r = Math.hypot(x - centro, y - centro);
      const anillo = Math.floor(r / 2.1);
      const encendido = r < 8.6 && anillo % 2 === 0;
      const color = encendido ? COLORES[anillo % COLORES.length] : APAGADO;
      const radio = encendido ? 4.6 : 2.2;
      puntos += `<circle cx="${RELLENO + x * PASO + PASO / 2}" cy="${RELLENO + y * PASO + PASO / 2}" r="${radio}" fill="${color}"/>`;
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${TAMANO}" height="${TAMANO}" viewBox="0 0 ${TAMANO} ${TAMANO}">`
    + `<rect width="${TAMANO}" height="${TAMANO}" fill="${FONDO}"/>${puntos}</svg>`;
}

export async function caratulaEnBase64() {
  const sharp = (await import('sharp')).default;
  const png = await sharp(Buffer.from(svg())).png().toBuffer();
  return `data:image/png;base64,${png.toString('base64')}`;
}

/**
 * La pista que se enseña.
 *
 * Título, artista y fuente son inventados a propósito: ver
 * `electron/main/mediosFijos.ts`. «Reproductor local» en vez del nombre de un
 * servicio, para no dar a entender que hay una integración que no existe.
 */
export async function reproduccion() {
  return {
    title: 'Retícula en azul',
    artist: 'Pista de demostración',
    status: 'Playing',
    source: 'Reproductor local',
    thumbnail: await caratulaEnBase64(),
    controls: { next: true, prev: true, shuffle: true, repeat: true },
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const destino = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'docs', 'prensa', 'fuentes');
  mkdirSync(destino, { recursive: true });
  const datos = await reproduccion();
  writeFileSync(join(destino, 'reproduccion.json'), `${JSON.stringify(datos, null, 2)}\n`);
  const sharp = (await import('sharp')).default;
  writeFileSync(join(destino, 'caratula.png'), await sharp(Buffer.from(svg())).png().toBuffer());
  console.log(`escrito ${join(destino, 'reproduccion.json')}`);
}
