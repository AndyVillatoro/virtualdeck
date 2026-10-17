import assert from 'node:assert';
import { resolverReglasAparienciaPlugin } from './reglasApariencia';

console.log('test: reglasApariencia');

// 1. No es plugin: nada bloqueado
{
  const r = resolverReglasAparienciaPlugin({ esPlugin: false });
  assert.strictEqual(r.bloquearApariencia, false);
  assert.strictEqual(r.bloquearTitulo, false);
  assert.strictEqual(r.controlaImagen, false);
  assert.strictEqual(r.motivoBloqueoApariencia, undefined);
  assert.strictEqual(r.motivoBloqueoTitulo, undefined);
}

// 2. Plugin por defecto (userTitleEnabled: true/undefined, tieneImagenPropia: true/undefined)
{
  const r = resolverReglasAparienciaPlugin({ esPlugin: true });
  assert.strictEqual(r.bloquearApariencia, true);
  assert.strictEqual(r.bloquearTitulo, false);
  assert.strictEqual(r.controlaImagen, true);
  assert.strictEqual(r.motivoBloqueoApariencia, 'ed.plugin.aparienciaBloqueada');
  assert.strictEqual(r.motivoBloqueoTitulo, undefined);
}

// 3. Plugin con UserTitleEnabled: false
{
  const r = resolverReglasAparienciaPlugin({
    esPlugin: true,
    userTitleEnabled: false,
  });
  assert.strictEqual(r.bloquearApariencia, true);
  assert.strictEqual(r.bloquearTitulo, true);
  assert.strictEqual(r.motivoBloqueoTitulo, 'ed.plugin.tituloBloqueado');
}

// 4. Plugin con UserTitleEnabled: true explícito
{
  const r = resolverReglasAparienciaPlugin({
    esPlugin: true,
    userTitleEnabled: true,
  });
  assert.strictEqual(r.bloquearTitulo, false);
}

// 5. Plugin que NO define imágenes propias ni tiene imagen visual
{
  const r = resolverReglasAparienciaPlugin({
    esPlugin: true,
    tieneImagenPropia: false,
    tieneVisualImagen: false,
  });
  assert.strictEqual(r.bloquearApariencia, false);
  assert.strictEqual(r.controlaImagen, false);
  assert.strictEqual(r.motivoBloqueoApariencia, undefined);
}

// 6. Plugin que no define imágenes en manifiesto pero mandó imagen visual por setImage
{
  const r = resolverReglasAparienciaPlugin({
    esPlugin: true,
    tieneImagenPropia: false,
    tieneVisualImagen: true,
  });
  assert.strictEqual(r.bloquearApariencia, true);
  assert.strictEqual(r.controlaImagen, true);
  assert.strictEqual(r.motivoBloqueoApariencia, 'ed.plugin.aparienciaBloqueada');
}

console.log('OK: reglasApariencia');
