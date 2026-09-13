// Automatización del empaquetado para Microsoft Store (MSIX / AppX)
//
// 1. Genera los assets requeridos en build/appx/
// 2. Compila los bundles de producción (electron-vite build)
// 3. Monta la estructura con electron-builder
// 4. Empaqueta el MSIX definitivo con makeappx.exe del Windows SDK
// 5. Valida el manifiesto y genera el checklist para Partner Center
//
// Ejecutar: `npm run package:store` o `node scripts/build-store.mjs`

import { existsSync, readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { execSync } from 'node:child_process';

const ROOT = resolve('.');
const PKG_PATH = join(ROOT, 'package.json');
const pkg = JSON.parse(readFileSync(PKG_PATH, 'utf-8'));
const VERSION = pkg.version;

console.log(`\n======================================================`);
console.log(`  VirtualDeck — Empaquetador para Microsoft Store`);
console.log(`  Versión: ${VERSION}  (MSIX: ${VERSION}.0)`);
console.log(`======================================================\n`);

// Paso 1: Generar assets de iconos de Store
console.log(`[1/5] Generando iconos oficiales de la Store en build/appx/...`);
try {
  execSync('node scripts/generate-appx-assets.js', { stdio: 'inherit', cwd: ROOT });
} catch (e) {
  console.error('Error generando iconos para AppX:', e.message);
  process.exit(1);
}

// Paso 2: Compilación de producción
console.log(`\n[2/5] Compilando bundles de Electron / React (electron-vite build)...`);
try {
  execSync('cmd.exe /c npx electron-vite build', { stdio: 'inherit', cwd: ROOT });
} catch (e) {
  console.error('Error en electron-vite build:', e.message);
  process.exit(1);
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
  console.error(`\n[ERROR] No se encontró el staging en ${stagingDir}. Revisa la salida de electron-builder.`);
  process.exit(1);
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

// Paso 4: Localizar makeappx.exe en Windows SDK
console.log(`\n[4/5] Buscando makeappx.exe en Windows SDK Kits...`);
const kitsBase = 'C:\\Program Files (x86)\\Windows Kits\\10\\bin';
let makeappxPath = null;

if (existsSync(kitsBase)) {
  const versions = readdirSync(kitsBase).filter((d) => d.startsWith('10.')).sort().reverse();
  for (const v of versions) {
    const candidate = join(kitsBase, v, 'x64', 'makeappx.exe');
    if (existsSync(candidate)) {
      makeappxPath = candidate;
      break;
    }
  }
}

if (!makeappxPath) {
  console.error(`\n[ERROR] No se encontró makeappx.exe en ${kitsBase}. Instala el SDK de Windows 10/11.`);
  process.exit(1);
}

console.log(`      Utilizando SDK makeappx: ${makeappxPath}`);

const targetMsix = join(ROOT, 'dist', `VirtualDeck-${VERSION}.msix`);
console.log(`      Empaquetando en: ${targetMsix}...`);

try {
  execSync(`"${makeappxPath}" pack /f "${mappingFile}" /p "${targetMsix}" /o`, {
    stdio: 'inherit',
    cwd: ROOT,
  });
} catch (e) {
  console.error('Error al empaquetar con makeappx:', e.message);
  process.exit(1);
}

// Paso 5: Validar artefacto y manifiesto
console.log(`\n[5/5] Verificando integridad del paquete...`);
if (!existsSync(targetMsix)) {
  console.error(`[ERROR] El archivo ${targetMsix} no existe.`);
  process.exit(1);
}

const sizeMb = (statSync(targetMsix).size / (1024 * 1024)).toFixed(1);
const manifestContent = readFileSync(manifestFile, 'utf-8');

const hasVersion = manifestContent.includes(`Version="${VERSION}.0"`);
const hasMinVersion = manifestContent.includes('MinVersion="10.0.17763.0"');
const hasProtocol = manifestContent.includes('windows.protocol');
const hasStartup = manifestContent.includes('windows.startupTask');
const hasFullTrust = manifestContent.includes('runFullTrust');

console.log(`  ✓ Paquete generado con éxito: ${targetMsix} (${sizeMb} MB)`);
console.log(`  ✓ Versión en manifiesto (${VERSION}.0): ${hasVersion ? 'OK' : 'ALERTA: no coincide'}`);
console.log(`  ✓ MinVersion moderna (>= 10.0.17763.0): ${hasMinVersion ? 'OK' : 'ALERTA: inferior a 17763'}`);
console.log(`  ✓ Protocolo virtualdeck://: ${hasProtocol ? 'OK' : 'ALERTA: falta protocolo'}`);
console.log(`  ✓ Tarea de inicio con Windows: ${hasStartup ? 'OK' : 'ALERTA: falta startupTask'}`);
console.log(`  ✓ runFullTrust declarado: ${hasFullTrust ? 'OK' : 'ALERTA: falta full trust'}`);

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
console.log(`   - Copia las notas relevantes de CHANGELOG.md (versión [${VERSION}]).`);
console.log(`5. En "Notas para la certificación" (Certification notes):`);
console.log(`   - Verifica que figuren las notas técnicas de runFullTrust (ver docs/MICROSOFT-STORE.md §4).`);
console.log(`6. Haz clic en "Enviar a la Store" (Submit to the Store).`);
console.log(`======================================================\n`);

