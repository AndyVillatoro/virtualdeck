# Compila el nucleo nativo (Rust) y lo deja donde Electron lo carga.
#
#   .\scripts\build-native.ps1            # release
#   .\scripts\build-native.ps1 -Debug     # mas rapido de compilar, mas lento al correr
#
# Deja `native/vd-core.node`.
#
# El archivo se llama `.node` aunque sea una DLL: es lo que Node espera de un
# modulo nativo. Y va fuera del asar (ver `asarUnpack` en package.json), porque
# Node no puede cargar una biblioteca dinamica desde dentro del archivo.

param([switch]$Debug)

$ErrorActionPreference = 'Stop'
$raiz = Split-Path -Parent $PSScriptRoot

# cargo escribe su progreso por stderr y, con ErrorActionPreference en 'Stop',
# Windows PowerShell 5.1 lo trata como error terminante aunque haya ido bien.
function Invoke-Nativo {
    param([scriptblock]$Bloque, [string]$Que)
    $previo = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try { & $Bloque } finally { $ErrorActionPreference = $previo }
    if ($LASTEXITCODE -ne 0) { throw "$Que fallo (codigo $LASTEXITCODE)" }
}

$perfil = if ($Debug) { 'debug' } else { 'release' }
Write-Host "Compilando el nucleo nativo ($perfil)..." -ForegroundColor Cyan

Push-Location $raiz
try {
    if ($Debug) {
        Invoke-Nativo { cargo build -p vd-node } 'cargo build'
    } else {
        Invoke-Nativo { cargo build --release -p vd-node } 'cargo build'
    }
} finally {
    Pop-Location
}

$dll = Join-Path $raiz "target\$perfil\vd_node.dll"
if (-not (Test-Path $dll)) { throw "No se genero $dll" }

$destinoDir = Join-Path $raiz 'native'
if (-not (Test-Path $destinoDir)) { New-Item -ItemType Directory $destinoDir | Out-Null }
$destino = Join-Path $destinoDir 'vd-core.node'
Copy-Item $dll $destino -Force

$kb = [math]::Round((Get-Item $destino).Length / 1KB)
Write-Host "  $destino  ($kb KB)" -ForegroundColor Green
