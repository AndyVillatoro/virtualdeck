import { contextoDeBoton } from '../src/comun/contextoPlugin';
import {
  guardarVisualMando,
  olvidarVisualMando,
  olvidarVisualesDe,
  visualParaMando,
  LIMITE_IMAGEN_MANDO_BYTES,
} from '../electron/main/plugins/visualesMando';

/**
 * Pruebas puras del visual de plugin para el mando móvil (T-PLG-05, 83 c).
 *
 * No toca el sistema ni Electron: solo la tienda de `visualesMando.ts` y la
 * formación del contexto de `src/comun/contextoPlugin.ts`. Correrla:
 *
 *   npx tsx scripts/probar-visual-mando.ts
 */

const PNG = 'data:image/png;base64,iVBORw0KGgo=';
const GIF = 'data:image/gif;base64,R0lGODlhAQABAAAAACw=';
const SVG = 'data:image/svg+xml;base64,PHN2Zz4=';
const PNG_OSCURO = 'data:image/x-icon;base64,AAABAAEAEBA=';
// Un data URL de raster que decodifica justo más allá del tope del mando.
const cuerpoGrande = 'A'.repeat(Math.floor((LIMITE_IMAGEN_MANDO_BYTES + 1) * 4 / 3) + 8);
const PNG_GRANDE = `data:image/png;base64,${cuerpoGrande}`;

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(`FALLA: ${msg}`);
  console.log(`ok  ${msg}`);
}

function main(): void {
  // 1. El contexto de un botón del deck, igual que el deck (`deck:<id>`).
  assert(contextoDeBoton('b1') === 'deck:b1', 'contexto deck:<id>');

  // 2. La tienda arranca vacía.
  assert(visualParaMando('deck:b1') === undefined, 'sin visual no hay nada');

  // 3. setImage graba la imagen y setTitle sustituye al título sin borrarla
  //    (la fusión por claves del hallazgo #9).
  guardarVisualMando({ contexto: 'deck:b1', imagen: PNG });
  assert(visualParaMando('deck:b1')?.imagen === PNG, 'setImage graba imagen');
  guardarVisualMando({ contexto: 'deck:b1', titulo: 'hola' });
  const v3 = visualParaMando('deck:b1');
  assert(v3?.imagen === PNG && v3.titulo === 'hola', 'setTitle no borra la imagen');

  // 4. Un setState no crea entrada ni borra nada.
  guardarVisualMando({ contexto: 'deck:b1', estado: 2 });
  assert(visualParaMando('deck:b1')?.imagen === PNG, 'setState no borra');
  assert(visualParaMando('deck:b2') === undefined, 'setState sin entrada no crea');
  guardarVisualMando({ contexto: 'deck:b3', estado: 3 });
  assert(visualParaMando('deck:b3') === undefined, 'setState solo no deja visual');

  // 5. setImage '' borra la imagen del mando pero conserva el título.
  guardarVisualMando({ contexto: 'deck:b4', imagen: PNG, titulo: 'sigo' });
  guardarVisualMando({ contexto: 'deck:b4', imagen: '' });
  const v5 = visualParaMando('deck:b4');
  assert(v5 && !v5.imagen && v5.titulo === 'sigo', 'imagen vacia borra imagen, no titulo');
  guardarVisualMando({ contexto: 'deck:b4', titulo: '' });
  assert(visualParaMando('deck:b4') === undefined, 'sin imagen y sin titulo no hay visual');

  // 6. Una imagen que el mando no puede representar no actualiza la tienda:
  //    el móvil se queda con lo último que sí pudo enseñar.
  guardarVisualMando({ contexto: 'deck:b6', imagen: PNG });
  guardarVisualMando({ contexto: 'deck:b6', imagen: SVG });
  assert(visualParaMando('deck:b6')?.imagen === PNG, 'svg no borra la anterior');
  guardarVisualMando({ contexto: 'deck:b6', imagen: PNG_OSCURO });
  assert(visualParaMando('deck:b6')?.imagen === PNG, 'mime raro no borra la anterior');
  guardarVisualMando({ contexto: 'deck:b6', imagen: PNG_GRANDE });
  assert(visualParaMando('deck:b6')?.imagen === PNG, 'imagen fuera del tope no borra');

  // 7. Una imagen raster dentro del tope sí entra y la sustituye.
  guardarVisualMando({ contexto: 'deck:b6', imagen: GIF });
  assert(visualParaMando('deck:b6')?.imagen === GIF, 'gif dentro del tope sustituye');

  // 8. El olvido: por contexto y por lote (plugin detenido o desinstalado).
  olvidarVisualMando('deck:b6');
  assert(visualParaMando('deck:b6') === undefined, 'olvidarVisualMando borra solo esa');
  guardarVisualMando({ contexto: 'deck:b8', imagen: PNG });
  guardarVisualMando({ contexto: 'deck:b9', imagen: PNG });
  olvidarVisualesDe(['deck:b8', 'deck:b9']);
  assert(visualParaMando('deck:b8') === undefined && visualParaMando('deck:b9') === undefined,
    'olvidarVisualesDe borra el lote');

  // 9. Otros contextos no se cruzan: cada superficie lleva el suyo delante.
  guardarVisualMando({ contexto: 'dock-x:b5', imagen: PNG });
  assert(visualParaMando('deck:b5') === undefined, 'el contexto de dock no sale en deck');

  console.log('\nvisual-mando: ok');
}

try {
  main();
} catch (e) {
  console.error((e as Error).message);
  process.exit(1);
}
