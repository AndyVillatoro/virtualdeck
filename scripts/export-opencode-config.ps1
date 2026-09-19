# Exporta la configuracion global de OpenCode y la plantilla de proyecto a dos
# zips fechados en %TEMP%, y regenera docs/EXPORTAR-CONFIG.md con los pasos de
# importacion en otra PC.
#
#   .\scripts\export-opencode-config.ps1
#
# Zip 1 (global):    opencode.json, AGENTS.md, agents/, bin/agy-gemini.ps1, plugins/
#                    de %USERPROFILE%\.config\opencode\ -- sin *.bak*, node_modules, .env*
# Zip 2 (plantilla): opencode.json, .opencode/, AGENTS.md generico -- del repo actual
#
# Salida:
#   %TEMP%\opencode-global-<fecha>.zip
#   %TEMP%\opencode-plantilla-<fecha>.zip
#   docs\EXPORTAR-CONFIG.md

$ErrorActionPreference = 'Stop'
$crono = [System.Diagnostics.Stopwatch]::StartNew()
$raiz = Split-Path -Parent $PSScriptRoot
$dirGlobal = Join-Path $env:USERPROFILE '.config\opencode'
$fecha = Get-Date -Format 'yyyyMMdd-HHmm'

function Remove-Basura {
    param([string]$Staging)
    $basura = @(Get-ChildItem -LiteralPath $Staging -Recurse -Force | Where-Object {
        $_.Name -like '*.bak*' -or $_.Name -eq 'node_modules' -or $_.Name -like '.env*'
    })
    foreach ($item in $basura) {
        Remove-Item -LiteralPath $item.FullName -Recurse -Force -ErrorAction SilentlyContinue
    }
}

function New-Staging {
    param([string]$Prefijo)
    $dir = Join-Path $env:TEMP "$Prefijo-$fecha"
    if (Test-Path -LiteralPath $dir) { Remove-Item -LiteralPath $dir -Recurse -Force }
    New-Item -ItemType Directory -Path $dir | Out-Null
    return $dir
}

function New-Zip {
    param([string]$Staging, [string]$Zip)
    if (Test-Path -LiteralPath $Zip) { Remove-Item -LiteralPath $Zip -Force }
    $rutas = @(Get-ChildItem -LiteralPath $Staging -Force | ForEach-Object { $_.FullName })
    Compress-Archive -Path $rutas -DestinationPath $Zip
}

function Set-Archivo {
    param([string]$Ruta, [string]$Contenido)
    $utf8 = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($Ruta, $Contenido, $utf8)
}

# ---- Zip 1: configuracion global de OpenCode ----
Write-Host 'Exportando configuracion global...' -ForegroundColor Cyan
if (-not (Test-Path -LiteralPath $dirGlobal)) { throw "No existe la configuracion global: $dirGlobal" }
$st1 = New-Staging 'ocst-global'
try {
    foreach ($item in @('opencode.json', 'AGENTS.md', 'agents', 'plugins')) {
        $origen = Join-Path $dirGlobal $item
        if (Test-Path -LiteralPath $origen) {
            Copy-Item -LiteralPath $origen -Destination $st1 -Recurse -Force
        }
    }
    $agy = Join-Path $dirGlobal 'bin\agy-gemini.ps1'
    if (Test-Path -LiteralPath $agy) {
        New-Item -ItemType Directory -Path (Join-Path $st1 'bin') -Force | Out-Null
        Copy-Item -LiteralPath $agy -Destination (Join-Path $st1 'bin\agy-gemini.ps1') -Force
    }
    Remove-Basura $st1
    $zipGlobal = Join-Path $env:TEMP "opencode-global-$fecha.zip"
    New-Zip $st1 $zipGlobal
    $tam = [math]::Round((Get-Item $zipGlobal).Length / 1KB)
    Write-Host "  $zipGlobal  ($tam KB)" -ForegroundColor Green
} finally {
    Remove-Item -LiteralPath $st1 -Recurse -Force -ErrorAction SilentlyContinue
}

# ---- Zip 2: plantilla de proyecto ----
Write-Host 'Exportando plantilla de proyecto...' -ForegroundColor Cyan
$st2 = New-Staging 'ocst-plantilla'
try {
    Copy-Item -LiteralPath (Join-Path $raiz 'opencode.json') -Destination $st2 -Force
    Copy-Item -LiteralPath (Join-Path $raiz '.opencode') -Destination $st2 -Recurse -Force
    Remove-Basura $st2

    $agTemplate = @'
# AGENTS.md - Plantilla de proyecto

Guia de orquestacion multi-agente para OpenCode. Este archivo se copia a cada
proyecto nuevo desde la plantilla exportada; completar las secciones marcadas.

## 1. Reglas del proyecto

- _Completar_: convenciones, limites de calidad y reglas sagradas.
- Antes de dar una tarea por terminada y antes de commit, ejecutar la suite:
  npm run check
  Debe pasar con 0 errores.

## 2. Comunicacion entre modelos

- Tablero de tareas y bloqueos: docs/AGENT_COMMUNICATION.md
  (reclamar los archivos antes de editarlos y liberarlos al terminar).
- Registro de handoff: docs/HANDOFF.md (modelo, archivos tocados y resultados).
- Rama aislada por tarea: git checkout -b task/<prioridad>-<nombre>.

## 3. Comandos esenciales

  npm run check
  npm run build
  npm run dev
  npx tsc --noEmit
  npx eslint .
  npx depcruise src electron

## 4. Delegacion y privacidad

- Priorizar el modelo mas capaz para cada subtarea (orquestador, worker, etc.).
- Si el contenido es [privado], usar solo modelos locales o zero-retention.
'@
    Set-Archivo (Join-Path $st2 'AGENTS.md') $agTemplate
    $zipPlantilla = Join-Path $env:TEMP "opencode-plantilla-$fecha.zip"
    New-Zip $st2 $zipPlantilla
    $tam = [math]::Round((Get-Item $zipPlantilla).Length / 1KB)
    Write-Host "  $zipPlantilla  ($tam KB)" -ForegroundColor Green
} finally {
    Remove-Item -LiteralPath $st2 -Recurse -Force -ErrorAction SilentlyContinue
}

# ---- docs/EXPORTAR-CONFIG.md ----
$nomGlobal = Split-Path $zipGlobal -Leaf
$nomPlantilla = Split-Path $zipPlantilla -Leaf
$doc = Join-Path $raiz 'docs\EXPORTAR-CONFIG.md'
$textoDoc = @'
# Exportar e importar la configuracion de OpenCode

Generado por `scripts/export-opencode-config.ps1` a partir de la PC origen;
se regenera en cada ejecucion. Describe como llevar la configuracion global de
OpenCode y la plantilla de proyecto a otra PC.

## 1. Que se exporta

| Zip | Contenido | Destino en la PC nueva |
|---|---|---|
| `__GLOBAL__` | opencode.json, AGENTS.md, agents/, bin/agy-gemini.ps1, plugins/ | %USERPROFILE%\.config\opencode\ |
| `__PLANTILLA__` | opencode.json, .opencode/, AGENTS.md generico | raiz de un proyecto nuevo |

Ambos zips quedan en %TEMP% de la PC origen y se copian a la PC nueva tal cual.
Se excluyen siempre: *.bak*, node_modules/ y .env*.

## 2. Requisitos en la PC nueva

- Node.js y npm instalados.
- OpenCode instalado (misma version o superior a la de origen).
- CLI de Antigravity (agy) instalada para el acceso a Gemini (seccion 6).
- Los zips no incluyen binarios, sesiones ni credenciales.

## 3. Importar la configuracion global

1. Cerrar OpenCode si esta abierto.
2. Si ya existe `%USERPROFILE%\.config\opencode`, renombrarlo como respaldo:
   ```powershell
   Rename-Item "$env:USERPROFILE\.config\opencode" "opencode.bak-<fecha>"
   ```
3. Crear el directorio y descomprimir el zip dentro:
   ```powershell
   New-Item -ItemType Directory "$env:USERPROFILE\.config\opencode" -Force | Out-Null
   Expand-Archive -Path "C:\ruta\al\zip\__GLOBAL__" -DestinationPath "$env:USERPROFILE\.config\opencode" -Force
   ```
   Los archivos deben quedar en la raiz: opencode.json, AGENTS.md, agents/, bin/ y plugins/.
4. Revisar `opencode.json`: los providers locales (lmstudio, ollama, bonsai)
   apuntan a localhost de la PC de origen; ajustarlos o eliminarlos si no se usan.

## 4. Crear un proyecto nuevo con la plantilla

1. Descomprimir `__PLANTILLA__` en la raiz del proyecto nuevo:
   ```powershell
   Expand-Archive -Path "C:\ruta\al\zip\__PLANTILLA__" -DestinationPath "C:\proyectos\nuevo" -Force
   ```
   Deja `opencode.json`, `.opencode/` y `AGENTS.md` (generico) en la raiz.
2. Completar `AGENTS.md` con las reglas del proyecto.
3. Si el proyecto se clona desde git, copiar los tres elementos del zip a la
   raiz clonada.

## 5. Dependencias y verificacion

1. Instalar dependencias en la raiz del proyecto:
   ```powershell
   npm install
   ```
2. Pasar la suite de calidad (obligatoria antes de cada commit):
   ```powershell
   npm run check
   ```
   Debe terminar con 0 errores.
3. Chequeo de tipos y capas (si aplica al proyecto):
   ```powershell
   npx tsc --noEmit
   npx depcruise src electron
   ```

## 6. Credenciales y tokens (nunca se exportan)

- Auth de providers de OpenCode: `opencode auth login` en la PC nueva.
- Spotify: el token vive en localStorage del cliente (clave `vd-spotify-token`);
  iniciar sesion de nuevo desde el panel de integraciones.
- Discord: reintroducir el Client ID / token de StreamKit en el panel de ajustes.
- Agy (Gemini via Antigravity CLI): instalar la CLI y validar:
  ```powershell
  agy -p="Reply with exactly: OK"
  ```
  Debe responder exactamente `OK`.

## 7. Comprobacion final

- Abrir OpenCode y confirmar que el agente por defecto, los subagentes y el
  plugin cargan sin errores.
- Ejecutar un turno corto en el proyecto nuevo para validar permisos y skills.
- Borrar los respaldos `.bak` una vez confirmada la importacion.
'@
$textoDoc = $textoDoc.Replace('__GLOBAL__', $nomGlobal).Replace('__PLANTILLA__', $nomPlantilla)
Set-Archivo $doc $textoDoc
Write-Host "  $doc" -ForegroundColor Green

# ---- resumen ----
$crono.Stop()
Write-Host ("Listo en {0:N1} s." -f $crono.Elapsed.TotalSeconds) -ForegroundColor Cyan