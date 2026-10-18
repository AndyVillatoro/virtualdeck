import { runPS as runPSShared } from '../launcher/ps-helpers';
import { tm } from '../sistema/idioma';
import type { MediaCommand } from './mediaTipos';

export function runPS(script: string): Promise<{ stdout: string; stderr: string; ok: boolean }> {
  return runPSShared(script, { timeoutMs: 10000, maxBufferBytes: 5 * 1024 * 1024 });
}

// Await de WinRT en PowerShell 5.1: hay que convertir el IAsyncOperation a un
// Task de .NET vía System.Runtime.WindowsRuntime + reflection (AsTask). El truco
// anterior de hacer polling de $op.Status NO funciona en PS 5.1 stock: la
// propiedad AsyncStatus no se proyecta y queda vacía ('' -ne 0 y '' -ne 1), por
// lo que Await-Op devolvía siempre $null → el manager salía null → el widget de
// música no mostraba nada. Verificado en vivo: polling = manager null, AsTask = OK.
// Await-Op recibe el tipo de resultado explícito (la introspección de la interfaz
// del op no es fiable sobre el RCW proyectado). Para ops con progreso (OpenReadAsync
// del thumbnail) se pasa además el $progressType.
const PREAMBLE = `
$ErrorActionPreference = 'Continue'
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$asTaskGeneric = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation\`1' })[0]
$asTaskProgress = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperationWithProgress\`2' })[0]
function Await-Op($op, $resultType, [int]$timeoutMs = 5000, $progressType = $null) {
  if ($null -eq $op) { return $null }
  try {
    if ($null -ne $progressType) { $m = $asTaskProgress.MakeGenericMethod(@($resultType, $progressType)) }
    else { $m = $asTaskGeneric.MakeGenericMethod($resultType) }
    $netTask = $m.Invoke($null, @($op))
    if (-not $netTask.Wait($timeoutMs)) { return $null }
    return $netTask.Result
  } catch { return $null }
}
# Alias de tipo con el loader WinRT completo (,Namespace,ContentType=WindowsRuntime)
# para que resuelvan sin depender del orden de carga del winmd.
$TMgr = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager,Windows.Media.Control,ContentType=WindowsRuntime]
$TProps = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties,Windows.Media.Control,ContentType=WindowsRuntime]
$TStream = [Windows.Storage.Streams.IRandomAccessStreamWithContentType,Windows.Storage.Streams,ContentType=WindowsRuntime]
$smtcType = $TMgr
$mgr = Await-Op ($smtcType::RequestAsync()) $TMgr 5000
`.trim();

export const QUICK_SCRIPT = `
${PREAMBLE}
if ($null -eq $mgr) { Write-Output 'ERR|||no manager'; exit }
$sessions = $mgr.GetSessions()
$best = $null
$bestRank = -1
foreach ($s in $sessions) {
  try {
    $props = Await-Op ($s.TryGetMediaPropertiesAsync()) $TProps 3000
    if ($null -eq $props) { continue }
    $st = $s.GetPlaybackInfo().PlaybackStatus.ToString()
    $hasTitle = $props.Title -and $props.Title.Length -gt 0
    $rank = -1
    if ($st -eq 'Playing' -and $hasTitle) { $rank = 3 }
    elseif ($st -eq 'Paused' -and $hasTitle) { $rank = 2 }
    elseif ($hasTitle) { $rank = 1 }
    elseif ($st -eq 'Playing' -or $st -eq 'Paused') { $rank = 0 }
    if ($rank -gt $bestRank) {
      $best = @{ S=$s; P=$props; St=$st }
      $bestRank = $rank
    }
  } catch {}
}
if ($null -eq $best) {
  $cur = $mgr.GetCurrentSession()
  if ($null -ne $cur) {
    try {
      $props = Await-Op ($cur.TryGetMediaPropertiesAsync()) $TProps 3000
      if ($null -ne $props) {
        $best = @{ S=$cur; P=$props; St=$cur.GetPlaybackInfo().PlaybackStatus.ToString() }
      }
    } catch {}
  }
}
if ($null -eq $best) { Write-Output 'NONE|||'; exit }
$src = if ($best.S.SourceAppUserModelId) { $best.S.SourceAppUserModelId } else { '' }
$title = if ($best.P.Title) { $best.P.Title } else { '' }
$artist = if ($best.P.Artist) { $best.P.Artist } else { '' }
$info = $best.S.GetPlaybackInfo()
$c = $info.Controls
$caps = "$($c.IsNextEnabled)/$($c.IsPreviousEnabled)/$($c.IsShuffleEnabled)/$($c.IsRepeatEnabled)"
$shuf = "$($info.IsShuffleActive)"
$rep = -1
try { if ($null -ne $info.AutoRepeatMode -and $null -ne $info.AutoRepeatMode.Value) { $rep = [int]$info.AutoRepeatMode.Value } } catch {}
Write-Output "$title|$artist|$($best.St)|$src|$caps|$shuf|$rep"
`.trim();

/**
 * Solo lo que la sesion **admite**, sin pedir la pista.
 *
 * Respaldo para cuando el nativo no trae `controls` (sin nucleo, o un `.node`
 * anterior a los controles nativos): se pregunta aparte, y **una vez por
 * cancion**, no en cada tick: medido en 239 ms, que es asumible una vez por
 * pista y no lo seria cuatro veces por segundo.
 *
 * No usa `TryGetMediaPropertiesAsync`: esa es la llamada que puede no volver
 * nunca si hay una sesion a medio cerrar. `GetPlaybackInfo()` es sincrona.
 */
export const CAPS_SCRIPT = `
${PREAMBLE}
if ($null -eq $mgr) { Write-Output 'ERR'; exit }
$s = $mgr.GetCurrentSession()
if ($null -eq $s) { Write-Output 'NONE'; exit }
$c = $s.GetPlaybackInfo().Controls
Write-Output "$($c.IsNextEnabled)/$($c.IsPreviousEnabled)/$($c.IsShuffleEnabled)/$($c.IsRepeatEnabled)"
`.trim();

export const THUMB_SCRIPT = `
${PREAMBLE}
if ($null -eq $mgr) { Write-Output ''; exit }
$sessions = $mgr.GetSessions()
$pick = $null
foreach ($s in $sessions) {
  try {
    $props = Await-Op ($s.TryGetMediaPropertiesAsync()) $TProps 3000
    if ($null -ne $props -and $props.Title -and $props.Title.Length -gt 0) {
      $st = $s.GetPlaybackInfo().PlaybackStatus.ToString()
      if (-not $pick -or $st -eq 'Playing') { $pick = @{ P=$props } }
    }
  } catch {}
}
if (-not $pick) {
  $cur = $mgr.GetCurrentSession()
  if ($null -ne $cur) {
    try { $p = Await-Op ($cur.TryGetMediaPropertiesAsync()) $TProps 3000; if ($p) { $pick = @{ P=$p } } } catch {}
  }
}
if (-not $pick) { Write-Output ''; exit }
$dataUrl = ''
try {
  if ($null -ne $pick.P.Thumbnail) {
    $rawStream = Await-Op ($pick.P.Thumbnail.OpenReadAsync()) $TStream 3000 ([UInt64])
    if ($null -ne $rawStream -and $rawStream.Size -gt 0 -and $rawStream.Size -lt 2097152) {
      $mime = if ($rawStream.ContentType -and $rawStream.ContentType.Length -gt 0) { $rawStream.ContentType } else { 'image/jpeg' }
      $netStream = [System.IO.WindowsRuntimeStreamExtensions]::AsStreamForRead($rawStream)
      $ms = New-Object System.IO.MemoryStream
      $netStream.CopyTo($ms)
      $b64 = [Convert]::ToBase64String($ms.ToArray())
      if ($b64.Length -gt 0) { $dataUrl = "data:$mime;base64,$b64" }
      $ms.Dispose(); $netStream.Dispose()
    }
  }
} catch {}
Write-Output $dataUrl
`.trim();

// Control SMTC nativo — TrySkipNext / TrySkipPrevious / TryTogglePlayPause.
// Funciona en cualquier app que registre SMTC (Spotify, YouTube web, YouTube Music,
// Edge/Chrome con la flag por defecto). Mucho más confiable que SendKeys [char]176.
export function controlScript(cmd: MediaCommand): string {
  const op = cmd === 'play-pause' ? 'TryTogglePlayPauseAsync'
           : cmd === 'next'       ? 'TrySkipNextAsync'
           : cmd === 'prev'       ? 'TrySkipPreviousAsync'
           : 'TryStopAsync';
  return `
${PREAMBLE}
if ($null -eq $mgr) { Write-Output 'NOMGR'; exit }
$session = $mgr.GetCurrentSession()
if ($null -eq $session) {
  $sessions = $mgr.GetSessions()
  $session = $sessions | Where-Object { $_.GetPlaybackInfo().PlaybackStatus -eq 'Playing' } | Select-Object -First 1
  if ($null -eq $session) { $session = $sessions | Select-Object -First 1 }
}
if ($null -eq $session) { Write-Output 'NOSESSION'; exit }
$result = Await-Op ($session.${op}()) ([bool]) 3000
if ($result) { Write-Output 'OK' } else { Write-Output 'FAIL' }
`.trim();
}

// Diagnóstico: corre el script con info verbose para que el usuario vea por qué no funciona.
export const DIAGNOSE_SCRIPT = `
${PREAMBLE}
if ($null -eq $mgr) {
  Write-Output 'STAGE|manager-null'
  Write-Output 'INFO|RequestAsync devolvió null. Posiblemente Windows.Media.Control no está disponible (Windows 10+ requerido).'
  exit
}
Write-Output 'STAGE|manager-ok'
$sessions = $mgr.GetSessions()
Write-Output "INFO|sessions-count=$($sessions.Count)"
$idx = 0
foreach ($s in $sessions) {
  $idx++
  try {
    $src = if ($s.SourceAppUserModelId) { $s.SourceAppUserModelId } else { '(sin source)' }
    $st = $s.GetPlaybackInfo().PlaybackStatus.ToString()
    Write-Output "INFO|session-$idx-source=$src"
    Write-Output "INFO|session-$idx-status=$st"
    $props = Await-Op ($s.TryGetMediaPropertiesAsync()) $TProps 3000
    if ($null -eq $props) {
      Write-Output "INFO|session-$idx-props=NULL"
    } else {
      $t = if ($props.Title) { $props.Title } else { '${tm('media.untitled')}' }
      $a = if ($props.Artist) { $props.Artist } else { '${tm('media.noArtist')}' }
      Write-Output "INFO|session-$idx-title=$t"
      Write-Output "INFO|session-$idx-artist=$a"
    }
  } catch {
    Write-Output "INFO|session-$idx-error=$_"
  }
}
$cur = $mgr.GetCurrentSession()
if ($null -eq $cur) {
  Write-Output 'INFO|GetCurrentSession=null'
} else {
  Write-Output "INFO|GetCurrentSession=$($cur.SourceAppUserModelId)"
}
`.trim();

export const WINDOW_FALLBACK = `
Add-Type -TypeDefinition @"
using System;
using System.Text;
using System.Runtime.InteropServices;
public class W {
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern int GetWindowText(IntPtr h, StringBuilder s, int n);
  [DllImport("user32.dll")] public static extern int GetWindowTextLength(IntPtr h);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
  public delegate bool EnumProc(IntPtr h, IntPtr p);
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumProc cb, IntPtr p);
}
"@ 2>$null
$results = New-Object System.Collections.ArrayList
$cb = [W+EnumProc]{
  param($h, $p)
  if ([W]::IsWindowVisible($h)) {
    $len = [W]::GetWindowTextLength($h)
    if ($len -gt 0) {
      $sb = New-Object System.Text.StringBuilder ($len + 1)
      [W]::GetWindowText($h, $sb, $sb.Capacity) | Out-Null
      $title = $sb.ToString()
      $procId = 0
      [W]::GetWindowThreadProcessId($h, [ref]$procId) | Out-Null
      $proc = ''
      try { $proc = (Get-Process -Id $procId -ErrorAction Stop).ProcessName } catch {}
      $null = $results.Add(@{ Title=$title; Proc=$proc })
    }
  }
  return $true
}
[W]::EnumWindows($cb, [IntPtr]::Zero) | Out-Null
foreach ($r in $results) {
  Write-Output "$($r.Proc)|||$($r.Title)"
}
`.trim();

// Shuffle toggle vía SMTC — invierte el estado actual de shuffle.
export const SHUFFLE_SCRIPT = `
${PREAMBLE}
if ($null -eq $mgr) { Write-Output 'NOMGR'; exit }
$session = $mgr.GetCurrentSession()
if ($null -eq $session) { Write-Output 'NOSESSION'; exit }
$info = $session.GetPlaybackInfo()
$newVal = -not $info.IsShuffleActive
$result = Await-Op ($session.TryChangeShuffleActiveAsync($newVal)) ([bool]) 3000
if ($result) { Write-Output 'OK' } else { Write-Output 'FAIL' }
`.trim();

// Repeat cycling vía SMTC — cicla entre ninguno → lista → pista → ninguno.
export const REPEAT_SCRIPT = `
${PREAMBLE}
if ($null -eq $mgr) { Write-Output 'NOMGR'; exit }
$session = $mgr.GetCurrentSession()
if ($null -eq $session) { Write-Output 'NOSESSION'; exit }
$info = $session.GetPlaybackInfo()
$cur = [int]$info.AutoRepeatMode.Value  # 0=None 1=Track 2=List
$next = ($cur + 1) % 3
$result = Await-Op ($session.TryChangeAutoRepeatModeAsync([Windows.Media.MediaPlaybackAutoRepeatMode]$next)) ([bool]) 3000
if ($result) { Write-Output 'OK' } else { Write-Output 'FAIL' }
`.trim();
