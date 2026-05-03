import { exec } from 'child_process';
import { writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

export interface NowPlaying {
  title: string;
  artist: string;
  status: 'Playing' | 'Paused' | 'Stopped' | 'Unknown';
  source: string;
  thumbnail?: string;
}

export type MediaCommand = 'play-pause' | 'next' | 'prev' | 'stop';

export interface MediaDiagnostic {
  ok: boolean;
  stage: string;
  stdout: string;
  stderr: string;
  parsed?: { title: string; artist: string; status: string; source: string };
  sessionsCount?: number;
}

function runPS(script: string): Promise<{ stdout: string; stderr: string; ok: boolean }> {
  return new Promise((resolve) => {
    const tmp = join(tmpdir(), `vd_media_${Date.now()}_${Math.random().toString(36).slice(2)}.ps1`);
    // BOM + UTF-8 header so PowerShell preserves accents/ñ/diéresis in stdout.
    const header = '﻿[Console]::OutputEncoding=[System.Text.Encoding]::UTF8\n';
    writeFileSync(tmp, header + script, 'utf-8');
    exec(
      `powershell -NoProfile -ExecutionPolicy Bypass -NonInteractive -File "${tmp}"`,
      { timeout: 10000, maxBuffer: 5 * 1024 * 1024, encoding: 'utf8' },
      (err, stdout, stderr) => {
        try { unlinkSync(tmp); } catch {}
        resolve({
          stdout: (stdout ?? '').trim(),
          stderr: (stderr ?? '').trim(),
          ok: !err,
        });
      }
    );
  });
}

// Wait-AsyncOp por polling del campo Status. Mucho más robusto que el truco
// reflection de AsTask: no depende de System.Runtime.WindowsRuntime ni de
// versiones específicas de .NET Framework. Funciona en PowerShell 5.1 stock.
const PREAMBLE = `
$ErrorActionPreference = 'Continue'
function Await-Op {
  param($op, [int]$timeoutMs = 5000)
  $sw = [System.Diagnostics.Stopwatch]::StartNew()
  # AsyncStatus: 0=Started, 1=Completed, 2=Canceled, 3=Error
  while ($op.Status -eq 0 -and $sw.ElapsedMilliseconds -lt $timeoutMs) {
    [System.Threading.Thread]::Sleep(15)
  }
  if ($op.Status -eq 1) { return $op.GetResults() }
  return $null
}
$smtcType = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager,Windows.Media.Control,ContentType=WindowsRuntime]
$mgr = Await-Op($smtcType::RequestAsync()) 5000
`.trim();

const QUICK_SCRIPT = `
${PREAMBLE}
if ($null -eq $mgr) { Write-Output 'ERR|||no manager'; exit }
$sessions = $mgr.GetSessions()
$best = $null
$bestRank = -1
foreach ($s in $sessions) {
  try {
    $props = Await-Op($s.TryGetMediaPropertiesAsync()) 3000
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
      $props = Await-Op($cur.TryGetMediaPropertiesAsync()) 3000
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
Write-Output "$title|$artist|$($best.St)|$src"
`.trim();

const THUMB_SCRIPT = `
${PREAMBLE}
if ($null -eq $mgr) { Write-Output ''; exit }
$sessions = $mgr.GetSessions()
$pick = $null
foreach ($s in $sessions) {
  try {
    $props = Await-Op($s.TryGetMediaPropertiesAsync()) 3000
    if ($null -ne $props -and $props.Title -and $props.Title.Length -gt 0) {
      $st = $s.GetPlaybackInfo().PlaybackStatus.ToString()
      if (-not $pick -or $st -eq 'Playing') { $pick = @{ P=$props } }
    }
  } catch {}
}
if (-not $pick) {
  $cur = $mgr.GetCurrentSession()
  if ($null -ne $cur) {
    try { $p = Await-Op($cur.TryGetMediaPropertiesAsync()) 3000; if ($p) { $pick = @{ P=$p } } } catch {}
  }
}
if (-not $pick) { Write-Output ''; exit }
$dataUrl = ''
try {
  if ($null -ne $pick.P.Thumbnail) {
    $rawStream = Await-Op($pick.P.Thumbnail.OpenReadAsync()) 3000
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
function controlScript(cmd: MediaCommand): string {
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
$result = Await-Op($session.${op}()) 3000
if ($result) { Write-Output 'OK' } else { Write-Output 'FAIL' }
`.trim();
}

// Diagnóstico: corre el script con info verbose para que el usuario vea por qué no funciona.
const DIAGNOSE_SCRIPT = `
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
    $props = Await-Op($s.TryGetMediaPropertiesAsync()) 3000
    if ($null -eq $props) {
      Write-Output "INFO|session-$idx-props=NULL"
    } else {
      $t = if ($props.Title) { $props.Title } else { '(sin título)' }
      $a = if ($props.Artist) { $props.Artist } else { '(sin artista)' }
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

const WINDOW_FALLBACK = `
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

let _cache: { data: NowPlaying | null; ts: number; lastValid: NowPlaying | null } = {
  data: null, ts: 0, lastValid: null,
};
let _thumbTrack = '';
let _thumbData = '';
let _fetchingThumb = false;
let _lastErrorLogged = '';

function logErrorOnce(stage: string, error: string) {
  const key = `${stage}:${error.slice(0, 200)}`;
  if (key === _lastErrorLogged) return;
  _lastErrorLogged = key;
  console.warn(`[media:${stage}] ${error}`);
}

interface Parsed {
  title: string;
  artist: string;
  source: string;
  status: NowPlaying['status'];
}

function parseWindowTitle(proc: string, raw: string): Parsed | null {
  const procLower = proc.toLowerCase();
  let title = raw;
  title = title.replace(/\s+(?:—|-|and \d+ more pages?)\s+(?:Mozilla Firefox|Google Chrome|Microsoft.+Edge|Brave|Opera|Vivaldi).*$/i, '');
  title = title.replace(/\s+(?:—|-)\s+(?:Mozilla Firefox|Google Chrome|Microsoft.+Edge|Brave|Opera|Vivaldi).*$/i, '');

  let m = title.match(/^(.+?)\s+-\s+YouTube Music$/);
  if (m) {
    const left = m[1];
    const dashIdx = left.lastIndexOf(' - ');
    if (dashIdx > 0) {
      return { title: left.slice(0, dashIdx).trim(), artist: left.slice(dashIdx + 3).trim(), source: 'YouTube Music', status: 'Playing' };
    }
    return { title: left.trim(), artist: '', source: 'YouTube Music', status: 'Playing' };
  }
  m = title.match(/^(.+?)\s+-\s+YouTube$/);
  if (m) return { title: m[1].trim(), artist: '', source: 'YouTube', status: 'Playing' };

  m = title.match(/^Spotify\s+[-·–]\s+(.+?)\s+[·•]\s+(.+)$/);
  if (m) return { title: m[1].trim(), artist: m[2].trim(), source: 'Spotify', status: 'Playing' };
  m = title.match(/^(.+?)\s+[•·]\s+(.+?)\s+[-—–]\s+Spotify$/);
  if (m) return { title: m[1].trim(), artist: m[2].trim(), source: 'Spotify', status: 'Playing' };
  if (procLower === 'spotify' && title && title !== 'Spotify' && title !== 'Spotify Premium' && title !== 'Spotify Free') {
    const dashIdx = title.lastIndexOf(' - ');
    if (dashIdx > 0) {
      return { title: title.slice(0, dashIdx).trim(), artist: title.slice(dashIdx + 3).trim(), source: 'Spotify', status: 'Playing' };
    }
    return { title, artist: '', source: 'Spotify', status: 'Playing' };
  }

  m = title.match(/^(.+?)\s+-\s+(.+?)\s+on SoundCloud/i);
  if (m) return { title: m[2].trim(), artist: m[1].trim(), source: 'SoundCloud', status: 'Playing' };

  m = title.match(/^(.+?)\s+-\s+VLC media player$/i);
  if (m) return { title: m[1].trim(), artist: '', source: 'VLC', status: 'Playing' };

  return null;
}

async function fallbackFromWindows(): Promise<NowPlaying | null> {
  const r = await runPS(WINDOW_FALLBACK);
  if (!r.ok && !r.stdout) {
    if (r.stderr) logErrorOnce('window-fallback', r.stderr);
    return null;
  }
  const lines = r.stdout.split(/\r?\n/);
  const priority = ['Spotify', 'YouTube Music', 'YouTube', 'SoundCloud', 'VLC'];
  let best: { p: Parsed; pr: number } | null = null;
  for (const line of lines) {
    const sep = line.indexOf('|||');
    if (sep < 0) continue;
    const proc = line.slice(0, sep);
    const t = line.slice(sep + 3);
    const parsed = parseWindowTitle(proc, t);
    if (!parsed) continue;
    const pr = priority.indexOf(parsed.source);
    const score = pr >= 0 ? priority.length - pr : 0;
    if (!best || score > best.pr) best = { p: parsed, pr: score };
  }
  if (!best) return null;
  return {
    title: best.p.title,
    artist: best.p.artist,
    status: best.p.status,
    source: best.p.source,
  };
}

export async function getNowPlaying(): Promise<NowPlaying | null> {
  if (Date.now() - _cache.ts < 4000) return _cache.data;
  _cache.ts = Date.now();

  let smtc: NowPlaying | null = null;
  let smtcWorked = false;
  try {
    const r = await runPS(QUICK_SCRIPT);
    if (!r.ok) {
      if (r.stderr) logErrorOnce('smtc-quick', r.stderr);
    } else if (r.stdout && !r.stdout.startsWith('NONE') && !r.stdout.startsWith('ERR')) {
      const [title, artist, status, source] = r.stdout.split('|');
      const titleStr = title?.trim() ?? '';
      const artistStr = artist?.trim() ?? '';
      if (titleStr || artistStr) {
        smtcWorked = true;
        const trackKey = `${titleStr}|${artistStr}`;
        if (trackKey !== _thumbTrack) {
          _thumbTrack = trackKey;
          _thumbData = '';
          if (!_fetchingThumb) {
            _fetchingThumb = true;
            runPS(THUMB_SCRIPT).then((tr) => {
              if (tr.ok && tr.stdout && tr.stdout.startsWith('data:')) {
                _thumbData = tr.stdout;
                if (_cache.data && `${_cache.data.title}|${_cache.data.artist}` === trackKey) {
                  _cache.data = { ..._cache.data, thumbnail: tr.stdout };
                }
              }
            }).finally(() => { _fetchingThumb = false; });
          }
        }
        smtc = {
          title: titleStr,
          artist: artistStr,
          status: (['Playing','Paused','Stopped','Unknown'].includes(status?.trim() ?? '')
            ? status.trim() : 'Unknown') as NowPlaying['status'],
          source: source?.trim() ?? '',
          thumbnail: _thumbData || undefined,
        };
      }
    } else if (r.stdout.startsWith('NONE')) {
      smtcWorked = true;
    } else if (r.stdout.startsWith('ERR')) {
      logErrorOnce('smtc-quick', `script error: ${r.stdout}${r.stderr ? ' / stderr: ' + r.stderr : ''}`);
    }
  } catch (e) {
    logErrorOnce('smtc-exception', String(e));
  }

  if (smtc) {
    _cache.data = smtc;
    _cache.lastValid = smtc;
    return smtc;
  }

  if (smtcWorked) {
    const fb = await fallbackFromWindows();
    if (fb) {
      _cache.data = fb;
      _cache.lastValid = fb;
      return fb;
    }
    _cache.data = null;
    return null;
  }

  if (_cache.lastValid) {
    _cache.data = _cache.lastValid;
    return _cache.lastValid;
  }

  const fb = await fallbackFromWindows();
  _cache.data = fb;
  if (fb) _cache.lastValid = fb;
  return fb;
}

// Control de medios — usa SMTC nativo cuando hay sesión, sino cae a SendKeys.
// El fallback SendKeys lo hace el caller (electron/main/index.ts) si esto devuelve false.
export async function controlMedia(cmd: MediaCommand): Promise<boolean> {
  const r = await runPS(controlScript(cmd));
  if (!r.ok) {
    if (r.stderr) logErrorOnce(`smtc-control-${cmd}`, r.stderr);
    return false;
  }
  return r.stdout === 'OK';
}

// Diagnóstico — devuelve raw output para que el usuario entienda el estado.
export async function diagnose(): Promise<MediaDiagnostic> {
  const r = await runPS(DIAGNOSE_SCRIPT);
  return {
    ok: r.ok,
    stage: r.stdout.split(/\r?\n/).find((l) => l.startsWith('STAGE|'))?.slice(6) ?? 'unknown',
    stdout: r.stdout,
    stderr: r.stderr,
  };
}
