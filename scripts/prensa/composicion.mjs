/**
 * Lo que se compone **después** de la captura: fondos, barras y lienzos.
 *
 * `Page.captureScreenshot` fotografía un documento, no la pantalla. Todo lo
 * que no quepa en un solo documento se junta aquí con `sharp`, por las
 * coordenadas reales de cada ventana y no por un montaje a ojo:
 *
 * - La **barra flotante** es otra ventana transparente: se captura por su CDP
 *   (con fondo alfa) y se pega en el margen del lienzo.
 * - El **kiosko de barra** (1280×480) y la **vista del móvil** son más
 *   pequeños que 16:9: se pegan centrados en un lienzo OLED de 1920×1080, que
 *   es la medida que pide la Store.
 */

import { conectar, dormir, evaluar } from './cdp.mjs';
import { PUERTO_CDP, esperarPagina } from './ventanas.mjs';

/**
 * La imagen de escritorio sobre la que va la barra, ajustada a la pantalla.
 *
 * Se escala a la medida **exacta** de la pantalla de la escena porque las
 * coordenadas de la barra están en esa pantalla: si la imagen midiera otra
 * cosa, la columna caería descolocada. `cover` recorta lo que sobra en vez de
 * deformar, y recorta **por la derecha** (donde va la columna): la franja que
 * se va es la del borde, no la del contenido.
 */
export async function fondoDeEscritorio(escena) {
  const sharp = (await import('sharp')).default;
  const { ancho, alto } = escena.pantalla;
  const original = await sharp(escena.fondo).metadata();
  if (original.width < ancho) {
    process.stdout.write(
      `  aviso: el fondo mide ${original.width}×${original.height} y hay que ampliarlo a ${ancho}×${alto}; va a salir blando\n`,
    );
  }
  return sharp(escena.fondo)
    .resize(ancho, alto, { fit: 'cover', position: 'left' })
    .png()
    .toBuffer();
}

/**
 * Pega la barra flotante encima del fondo, pegada al margen derecho.
 *
 * No es un montaje libre: la ventana de la barra es **transparente** y lo
 * único opaco son los tiles (ver `src/main.tsx`), así que se captura con su
 * canal alfa y se superpone. En Windows la pantalla física suele ser mayor que
 * el lienzo (1440p, 4K), por lo que `screenX` real cae fuera: la barra se
 * pega al margen derecho del lienzo, que es donde el proceso principal la
 * coloca en la escena.
 */
export async function conBarraFlotante(fondoPng, escena) {
  await esperarPagina((t) => t.url.includes('#barra'), 'la ventana de la barra flotante');
  const sharp = (await import('sharp')).default;
  const cdp = await conectar(PUERTO_CDP, (t) => t.url.includes('#barra'));
  try {
    const caja = await evaluar(cdp, `({
      x: window.screenX, y: window.screenY,
      ancho: window.innerWidth, alto: window.innerHeight,
    })`);
    if (!caja.ancho || !caja.alto) throw new Error('la ventana de la barra flotante no tiene tamaño');

    // Su propio tamaño y la escala de la escena: así los tiles quedan a la
    // misma escala que la ventana de debajo. Cambiar el ancho o el alto aquí
    // la relayoutaría y dejaría de ser la barra que hay en pantalla.
    await cdp.enviar('Emulation.setDeviceMetricsOverride', {
      width: caja.ancho, height: caja.alto,
      deviceScaleFactor: escena.escala, mobile: false,
    });
    await cdp.enviar('Emulation.setDefaultBackgroundColorOverride', {
      color: { r: 0, g: 0, b: 0, a: 0 },
    });
    await dormir(600);
    const { data } = await cdp.enviar('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });

    const metaFondo = await sharp(fondoPng).metadata();
    const barraAncho = Math.round(caja.ancho * escena.escala);
    const barraAlto = Math.round(caja.alto * escena.escala);
    const margen = Math.round(16 * escena.escala);
    const left = metaFondo.width - barraAncho - margen;
    const top = Math.max(0, Math.round((metaFondo.height - barraAlto) / 2));

    return sharp(fondoPng)
      .composite([{ input: Buffer.from(data, 'base64'), left, top }])
      .png()
      .toBuffer();
  } finally {
    cdp.cerrar();
  }
}

/**
 * Mete una captura más pequeña que 16:9 en un lienzo OLED 1920×1080, centrada.
 *
 * El kiosko de barra es 1280×480 real y la vista del móvil es un teléfono en
 * vertical: ninguna de las dos llega al mínimo de la Store (1366×768) por sí
 * sola. El contenido se escala **lo más grande que quepa** en el lienzo sin
 * deformarse (al alto el teléfono, al ancho la barra) y se centra, sin marco
 * ni adorno: lo que sobra es el mismo fondo OLED de la app.
 */
export async function conLienzo(png, { ancho, alto, fondo }) {
  const sharp = (await import('sharp')).default;
  const contenido = await sharp(png).resize({ width: ancho, height: alto, fit: 'inside' }).png().toBuffer();
  const meta = await sharp(contenido).metadata();
  const left = Math.round((ancho - meta.width) / 2);
  const top = Math.round((alto - meta.height) / 2);
  return sharp({ create: { width: ancho, height: alto, channels: 4, background: fondo } })
    .composite([{ input: contenido, left, top }])
    .png()
    .toBuffer();
}
