# Compila VirtualDeck en release y arma el instalador.
#
#   .\scripts\build-installer.ps1
#
# Deja `dist\VirtualDeck-Setup-<version>.exe`.
#
# La versión sale de Cargo.toml, que es la única fuente de verdad: escribirla
# también aquí garantizaría que un día no coincidan.

$ErrorActionPreference = 'Stop'
$raiz = Split-Path -Parent $PSScriptRoot

# cargo y makensis escriben su progreso por stderr. Con ErrorActionPreference en
# 'Stop', Windows PowerShell 5.1 convierte cada linea de stderr de un ejecutable
# nativo en un error terminante, y la compilacion "falla" aunque haya ido bien.
# Se comprueba $LASTEXITCODE a mano, que es lo unico que dice la verdad.
function Invoke-Nativo {
    param([scriptblock]$Bloque, [string]$Que)
    $previo = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try { & $Bloque } finally { $ErrorActionPreference = $previo }
    if ($LASTEXITCODE -ne 0) { throw "$Que fallo (codigo $LASTEXITCODE)" }
}

# --- version ---------------------------------------------------------------
$cargo = Get-Content (Join-Path $raiz 'Cargo.toml') -Raw
if ($cargo -notmatch '(?m)^\s*version\s*=\s*"([^"]+)"') {
    throw "No se encontro la version en Cargo.toml"
}
$version = $Matches[1]

# Windows exige cuatro numeros para los datos de version del recurso. De
# `1.0.0-alpha.1` se toma `1.0.0` y se completa con un cero.
if ($version -notmatch '^(\d+)\.(\d+)\.(\d+)') {
    throw "La version '$version' no empieza por X.Y.Z"
}
$versionNum = "$($Matches[1]).$($Matches[2]).$($Matches[3]).0"

Write-Host "VirtualDeck $version" -ForegroundColor Cyan

# --- makensis --------------------------------------------------------------
# Se busca en el PATH, en la instalacion normal de NSIS, y en la cache que dejo
# electron-builder — que es la que hay en esta maquina y evita instalar nada.
$candidatos = @(
    (Get-Command makensis.exe -ErrorAction SilentlyContinue).Source,
    "${env:ProgramFiles(x86)}\NSIS\makensis.exe",
    "$env:ProgramFiles\NSIS\makensis.exe"
)
$candidatos += Get-ChildItem "$env:LOCALAPPDATA\electron-builder\Cache\nsis" -Filter makensis.exe `
    -Recurse -ErrorAction SilentlyContinue | ForEach-Object { $_.FullName }

$makensis = $candidatos | Where-Object { $_ -and (Test-Path $_) } | Select-Object -First 1
if (-not $makensis) {
    throw "No se encontro makensis.exe. Instala NSIS desde https://nsis.sourceforge.io/"
}
Write-Host "  NSIS: $makensis" -ForegroundColor DarkGray

# --- compilar --------------------------------------------------------------
Write-Host "`nCompilando en release..." -ForegroundColor Cyan
Push-Location $raiz
try {
    Invoke-Nativo { cargo build --release -p vd-app } 'cargo build'
} finally {
    Pop-Location
}

$exe = Join-Path $raiz 'target\release\vd-app.exe'
if (-not (Test-Path $exe)) { throw "No se genero $exe" }
$mbExe = [math]::Round((Get-Item $exe).Length / 1MB, 2)
Write-Host "  Binario: $mbExe MB" -ForegroundColor DarkGray

# --- empaquetar ------------------------------------------------------------
$dist = Join-Path $raiz 'dist'
if (-not (Test-Path $dist)) { New-Item -ItemType Directory $dist | Out-Null }

Write-Host "`nArmando el instalador..." -ForegroundColor Cyan
$nsi = Join-Path $raiz 'installer\virtualdeck.nsi'
Invoke-Nativo {
    & $makensis /V2 "/DVERSION=$version" "/DVERSION_NUM=$versionNum" "/DEXE=$exe" $nsi
} 'makensis'

$salida = Join-Path $dist "VirtualDeck-Setup-$version.exe"
$mb = [math]::Round((Get-Item $salida).Length / 1MB, 2)

Write-Host "`n  $salida" -ForegroundColor Green
Write-Host "  $mb MB (objetivo: menos de 20 MB)" -ForegroundColor Green
if ($mb -gt 20) {
    Write-Host "  AVISO: se paso del objetivo declarado en docs/MIGRACION-RUST.md" -ForegroundColor Yellow
}
