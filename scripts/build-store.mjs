// Automatización del empaquetado para Microsoft Store (MSIX / AppX)
//
// 1. (opcional) Bump semver de package.json (+ package-lock)
// 2. Validaciones previas: config appx, extensions.xml, assets, makeappx, CHANGELOG
// 3. Genera los assets requeridos en build/appx/ [--skip-assets]
// 4. Compila los bundles de producción (electron-vite build) [--skip-build]
// 5. Monta la estructura con electron-builder
// 6. Empaqueta el MSIX definitivo con makeappx.exe del Windows SDK
// 7. Valida el manifiesto y genera dist/store-submission-VERSION.md
//
// Ejecutar: `npm run package:store` o `node scripts/build-store.mjs [opciones]`
//
// Opciones:
//   --bump patch|minor|major  Sube la versión antes de empaquetar (exige entrada en CHANGELOG.md)
//   --check-only              Solo validaciones, sin compilar ni empaquetar
//   --preflight               Corre `npm run check` antes de empaquetar (lento, pero seguro)
//   --skip-assets             No regenera los PNGs de build/appx/
//   --skip-build              No recompila (reusa out/); solo reempaqueta y valida
//   --yes                     No interactivo (hoy no pregunta nada; reserva para CI)

import { existsSync, readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { execSync } from 'node:child_process';

const ROOT = resolve('.');
const PKG_PATH = join(ROOT, 'package.json');

const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const valorDe = (n) => {
  const i = args.indexOf(n);
  return i >= 0 && i + 1 < args.length ? args[i + 1] : undefined;
};

function fallar(msg) {
  console.error(`\n[ERROR] ${msg}`);
  process.exit(1);
}

function leerPkg() {
  return JSON.parse(readFileSync(PKG_PATH, 'utf-8'));
}

function subirVersion(v, tipo) {
  const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(v);
  if (!m) fallar(`la versión actual (${v}) no es semver X.Y.Z; actualiza package.json a mano`);
  let may = Number(m[1]);
  let men = Number(m[2]);
  let par = Number(m[3]);
  if (tipo === 'major') { may++; men = 0; par = 0; }
  else if (tipo === 'minor') { men++; par = 0; }
  else if (tipo === 'patch') { par++; }
  else fallar(`--bump admite patch|minor|major, no '${tipo}'`);
  return `${may}.${men}.${par}`;
}

/** Extracto de la sección ## [VERSION] del CHANGELOG, o null si no existe. */
function extractoChangelog(version) {
  let texto;
  try { texto = readFileSync(join(ROOT, 'CHANGELOG.md'), 'utf-8'); }
  catch { return null; }
  const lineas = texto.split(/\r?\n/);
  const inicio = lineas.findIndex((l) => l.trim() === `## [${version}]` || l.startsWith(`## [${version}] `));
  if (inicio < 0) return null;
  const fin = lineas.findIndex((l, i) => i > inicio && l.startsWith('## ['));
  return lineas.slice(inicio, fin < 0 ? undefined : fin).join('\n').trim();
}

// --- Bump semver -----------------------------------------------------------
let pkg = leerPkg();
const bump = valorDe('--bump');
if (bump) {
  const nueva = subirVersion(pkg.version, bump);
  pkg.version = nueva;
  writeFileSync(PKG_PATH, `${JSON.stringify(pkg, null, 2)}\n`, 'utf-8');
  console.log(`Versión subida a ${nueva} en package.json`);
  try {
    execSync('npm install --package-lock-only --no-audit --no-fund', { stdio: 'pipe', cwd: ROOT });
    console.log('package-lock.json sincronizado');
  } catch {
    console.warn('AVISO: no se pudo sincronizar package-lock.json; corre `npm install --package-lock-only` a mano');
  }
  pkg = leerPkg();
}
const VERSION = pkg.version;

// --- Validaciones previas (también las corre --check-only) ------------------
const fallos = [];
const avisos = [];

const appx = pkg.build?.appx;
for (const campo of ['identityName', 'publisher', 'publisherDisplayName']) {
  if (!appx?.[campo]) fallos.push(`package.json: falta build.appx.${campo}`);
}
const extensionsXml = join(ROOT, 'build', 'appx', 'extensions.xml');
if (!existsSync(extensionsXml)) {
  fallos.push('falta build/appx/extensions.xml');
} else {
  const ext = readFileSync(extensionsXml, 'utf-8');
  if (!ext.includes('windows.protocol')) fallos.push('extensions.xml: falta windows.protocol (virtualdeck://)');
  if (!ext.includes('windows.startupTask')) fallos.push('extensions.xml: falta windows.startupTask');
}
const appxDir = join(ROOT, 'build', 'appx');
const pngs = existsSync(appxDir) ? readdirSync(appxDir).filter((f) => f.endsWith('.png')) : [];
if (pngs.length < 7) avisos.push(`build/appx trae ${pngs.length} PNGs (se esperan 7; se regeneran en el paso 1 salvo --skip-assets)`);

const kitsBase = 'C:\\Program Files (x86)\\Windows Kits\\10\\bin';
let makeappxPath = null;
if (existsSync(kitsBase)) {
  const versiones = readdirSync(kitsBase).filter((d) => d.startsWith('10.')).sort().reverse();
  for (const v of versiones) {
    const candidato = join(kitsBase, v, 'x64', 'makeappx.exe');
    if (existsSync(candidato)) { makeappxPath = candidato; break; }
  }
}
if (!makeappxPath) fallos.push(`no se encontró makeappx.exe en ${kitsBase} (instala el SDK de Windows 10/11)`);

const extracto = extractoChangelog(VERSION);
if (!extracto) fallos.push(`CHANGELOG.md no trae entrada ## [${VERSION}]: añádela antes de publicar`);

try {
  const sucio = execSync('git status --porcelain', { stdio: 'pipe', cwd: ROOT }).toString().trim();
  if (sucio) avisos.push('el árbol git tiene cambios sin commitear; el .msix no reflejará un estado etiquetable');
} catch { /* sin git, no pasa nada */ }

for (const a of avisos) console.warn(`AVISO: ${a}`);
if (fallos.length) {
  for (const f of fallos) console.error(`  · ${f}`);
  fallar('validaciones previas sin pasar (ver arriba)');
}
console.log('Validaciones previas: OK');

if (flag('--check-only')) {
  console.log('Modo --check-only: sin compilar ni empaquetar. Todo en orden.');
  process.exit(0);
}

console.log(`\n======================================================`);
console.log(`  VirtualDeck — Empaquetador para Microsoft Store`);
console.log(`  Versión: ${VERSION}  (MSIX: ${VERSION}.0)`);
console.log(`======================================================\n`);

if (flag('--preflight')) {
  console.log(`[0/5] Preflight: npm run check...`);
  try {
    execSync('cmd.exe /c npm run check', { stdio: 'inherit', cwd: ROOT });
  } catch {
    fallar('npm run check falló; arregla antes de empaquetar');
  }
}

// Paso 1: Generar assets de iconos de Store
if (!flag('--skip-assets')) {
  console.log(`[1/5] Generando iconos oficiales de la Store en build/appx/...`);
  try {
    execSync('node scripts/generate-appx-assets.js', { stdio: 'inherit', cwd: ROOT });
  } catch (e) {
    fallar(`generando iconos para AppX: ${e.message}`);
  }
} else {
  console.log(`[1/5] Omitido (--skip-assets): se reutilizan los PNGs de build/appx/`);
}

// Paso 2: Compilación de producción
if (!flag('--skip-build')) {
  console.log(`\n[2/5] Compilando bundles de Electron / React (electron-vite build)...`);
  try {
    execSync('cmd.exe /c npx electron-vite build', { stdio: 'inherit', cwd: ROOT });
  } catch (e) {
    fallar(`en electron-vite build: ${e.message}`);
  }
} else {
  console.log(`\n[2/5] Omitido (--skip-build): se reutiliza out/`);
}

// Paso 3: Montar la estructura de la aplicación para AppX
console.log(`\n[3/5] Preparando staging de empaquetado con electron-builder...`);
try {
  // electron-builder monta dist/__appx-x64 y sus mappings.
  // En Windows 11 su makeappx interno (2018) puede fallar con spawn UNKNOWN,
  // por lo que capturamos y continuamos hacia makeappx del Windows SDK.
  execSync('cmd.exe /c npx electron-builder --win appx --publish never', { stdio: 'pipe', cwd: ROOT });
} catch {
  // Si falla en el paso final de empaquetado pero dejó el staging listo, continuamos.
}

const stagingDir = join(ROOT, 'dist', '__appx-x64');
const mappingFile = join(stagingDir, 'mapping.txt');
const manifestFile = join(stagingDir, 'AppxManifest.xml');

if (!existsSync(mappingFile) || !existsSync(manifestFile)) {
  fallar(`no se encontró el staging en ${stagingDir}. Revisa la salida de electron-builder.`);
}

// Asegurar que la versión en AppxManifest.xml coincida con package.json
let manifestRaw = readFileSync(manifestFile, 'utf-8');
if (!manifestRaw.includes(`Version="${VERSION}.0"`)) {
  manifestRaw = manifestRaw.replace(/Version="[0-9.]+"/, `Version="${VERSION}.0"`);
  console.log(`      Actualizada versión en AppxManifest.xml a ${VERSION}.0`);
}

// Actualizar TargetDeviceFamily: Partner Center rechaza MinVersion <= 10.0.17134.0
if (manifestRaw.includes('TargetDeviceFamily')) {
  manifestRaw = manifestRaw.replace(
    /<TargetDeviceFamily[^>]+>/,
    '<TargetDeviceFamily Name="Windows.Desktop" MinVersion="10.0.17763.0" MaxVersionTested="10.0.22621.0" />'
  );
  console.log(`      Actualizado TargetDeviceFamily a MinVersion="10.0.17763.0" y MaxVersionTested="10.0.22621.0"`);
}
writeFileSync(manifestFile, manifestRaw, 'utf-8');

// Limpiar mapping.txt: en Electron 33 ciertos ficheros legados (como chrome_100_percent.pak)
// ya no existen y causan error 0x80070002 en makeappx.
const rawMapping = readFileSync(mappingFile, 'utf-8');
const validLines = [];
let skippedCount = 0;
for (const line of rawMapping.split(/\r?\n/)) {
  const match = line.match(/^"([^"]+)"\s+"([^"]+)"$/);
  if (match) {
    const srcPath = match[1];
    if (existsSync(srcPath)) {
      validLines.push(line);
    } else {
      skippedCount++;
    }
  } else {
    validLines.push(line);
  }
}
writeFileSync(mappingFile, validLines.join('\r\n'), 'utf-8');
if (skippedCount > 0) {
  console.log(`      Depuradas ${skippedCount} referencias huérfanas de Electron en mapping.txt`);
}

// Paso 4: Empaquetar con makeappx del SDK (ya localizado en validaciones)
console.log(`\n[4/5] Empaquetando con makeappx del SDK...`);
console.log(`      Utilizando SDK makeappx: ${makeappxPath}`);

const targetMsix = join(ROOT, 'dist', `VirtualDeck-${VERSION}.msix`);
console.log(`      Empaquetando en: ${targetMsix}...`);

try {
  execSync(`"${makeappxPath}" pack /f "${mappingFile}" /p "${targetMsix}" /o`, {
    stdio: 'inherit',
    cwd: ROOT,
  });
} catch (e) {
  fallar(`al empaquetar con makeappx: ${e.message}`);
}

// Paso 5: Validar artefacto y manifiesto
console.log(`\n[5/5] Verificando integridad del paquete...`);
if (!existsSync(targetMsix)) {
  fallar(`el archivo ${targetMsix} no existe.`);
}

const sizeMb = (statSync(targetMsix).size / (1024 * 1024)).toFixed(1);
const manifestContent = readFileSync(manifestFile, 'utf-8');

const cheques = [
  ['Versión en manifiesto', `Version="${VERSION}.0"`, manifestContent.includes(`Version="${VERSION}.0"`)],
  ['MinVersion moderna (>= 10.0.17763.0)', 'MinVersion="10.0.17763.0"', manifestContent.includes('MinVersion="10.0.17763.0"')],
  ['Protocolo virtualdeck://', 'windows.protocol', manifestContent.includes('windows.protocol')],
  ['Tarea de inicio con Windows', 'windows.startupTask', manifestContent.includes('windows.startupTask')],
  ['runFullTrust declarado', 'runFullTrust', manifestContent.includes('runFullTrust')],
];

console.log(`  ✓ Paquete generado con éxito: ${targetMsix} (${sizeMb} MB)`);
let todoOk = true;
for (const [nombre, , ok] of cheques) {
  console.log(`  ${ok ? '✓' : '✗'} ${nombre}: ${ok ? 'OK' : 'ALERTA'}`);
  if (!ok) todoOk = false;
}
if (!todoOk) fallar('el manifiesto no pasó todas las comprobaciones (ver arriba)');

// Ficha de envío para Partner Center
const ficha = join(ROOT, 'dist', `store-submission-${VERSION}.md`);
const lineasFicha = [
  `# Envío a Microsoft Store — VirtualDeck ${VERSION}`,
  ``,
  `- Paquete: \`dist/VirtualDeck-${VERSION}.msix\` (${sizeMb} MB)`,
  `- Versión MSIX: \`${VERSION}.0\``,
  `- Generado: ${new Date().toISOString()}`,
  ``,
  `## Comprobaciones del manifiesto`,
  ``,
  ...cheques.map(([nombre, clave, ok]) => `- [${ok ? 'x' : ' '}] ${nombre} (\`${clave}\`)`),
  ``,
  `## Novedades de esta versión (pegar en Partner Center)`,
  ``,
  '```',
  extracto,
  '```',
  ``,
  `## Notas para la certificación`,
  ``,
  `- Ver docs/MICROSOFT-STORE.md §4 (notas técnicas de runFullTrust) y §4.1 (versión corta).`,
  `- Partner Center: https://partner.microsoft.com/dashboard/apps-and-games/overview`,
];
writeFileSync(ficha, lineasFicha.join('\n'), 'utf-8');

console.log(`\n======================================================`);
console.log(`  PASOS SIGUIENTES PARA PUBLICAR EN PARTNER CENTER`);
console.log(`======================================================`);
console.log(`1. Accede a Partner Center: https://partner.microsoft.com/dashboard/apps-and-games/overview`);
console.log(`2. Entra en VirtualDeck -> Iniciar una nueva presentación (Submission).`);
console.log(`3. En la sección "Paquetes":`);
console.log(`   - Arrastra y sube el archivo generado:`);
console.log(`     ${targetMsix}`);
console.log(`   - Verifica que la versión detectada sea ${VERSION}.0.`);
console.log(`4. En "Descripciones de la Store" -> "Novedades de esta versión":`);
console.log(`   - Pega el extracto ya preparado en:`);
console.log(`     ${ficha}`);
console.log(`5. En "Notas para la certificación" (Certification notes):`);
console.log(`   - Verifica que figuren las notas técnicas de runFullTrust (ver docs/MICROSOFT-STORE.md §4).`);
console.log(`6. Haz clic en "Enviar a la Store" (Submit to the Store).`);
console.log(`======================================================\n`);
