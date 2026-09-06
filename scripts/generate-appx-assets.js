// Los iconos que la Microsoft Store pide para el paquete MSIX.
//
// Sin esta carpeta, electron-builder mete **las imagenes de ejemplo que trae
// dentro** (`SampleAppx.150x150.png` y compañia): el paquete se construye sin
// una sola queja y la aplicacion aparece en el menu de inicio con el icono
// generico de Microsoft. Se vio en el `mapping.txt` que genera.
//
// Se derivan del mismo `build/icon.png` que ya usa todo lo demas, sobre el
// fondo oscuro de la aplicacion: los mosaicos de Windows no son transparentes,
// y un PNG con alfa sale sobre el color de acento del usuario, que cambia.
//
//   node scripts/generate-appx-assets.js

const sharp = require('sharp');
const { mkdirSync } = require('fs');
const { join } = require('path');

const FONDO = { r: 15, g: 15, b: 15, alpha: 1 }; // el mismo #0f0f0f de backgroundColor
const SALIDA = join(__dirname, '..', 'build', 'appx');
const ORIGEN = join(__dirname, '..', 'build', 'icon.png');

// Los cuatro que el manifiesto declara, mas los tres opcionales que Windows usa
// si estan. La proporcion del icono se respeta: se centra, no se estira.
const MEDIDAS = [
  ['StoreLogo.png', 50, 50],
  ['Square44x44Logo.png', 44, 44],
  ['Square150x150Logo.png', 150, 150],
  ['Wide310x150Logo.png', 310, 150],
  ['SmallTile.png', 71, 71],
  ['LargeTile.png', 310, 310],
  ['SplashScreen.png', 620, 300],
];

async function main() {
  mkdirSync(SALIDA, { recursive: true });
  for (const [nombre, ancho, alto] of MEDIDAS) {
    // El icono ocupa el 70% del lado corto: Windows recorta los bordes de los
    // mosaicos, y a sangre se come las esquinas del dibujo.
    const lado = Math.round(Math.min(ancho, alto) * 0.7);
    const icono = await sharp(ORIGEN).resize(lado, lado, { fit: 'contain' }).toBuffer();
    await sharp({ create: { width: ancho, height: alto, channels: 4, background: FONDO } })
      .composite([{ input: icono, gravity: 'center' }])
      .png()
      .toFile(join(SALIDA, nombre));
    console.log(`  ${nombre.padEnd(24)} ${ancho}x${alto}`);
  }
  console.log(`appx: ${MEDIDAS.length} iconos en build/appx/`);
}

main().catch((e) => { console.error(e); process.exit(1); });
