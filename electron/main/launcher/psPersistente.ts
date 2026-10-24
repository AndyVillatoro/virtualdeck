import { ChildProcessWithoutNullStreams, spawn, exec } from 'child_process';
import { writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import type { PSResult } from './ps-helpers';

/**
 * PowerShell persistente para el camino sin nucleo nativo.
 *
 * Un unico proceso `powershell.exe` lee ordenes por stdin (una a la vez,
 * encoladas) y responde por stdout con un marcador de fin por orden.
 * Si una orden supera los 5 s se mata el proceso; la siguiente orden lo
 * vuelve a lanzar.
 */

const FIN_PREFIX = '__VD_FIN_';
/** El error va por stdout antes del fin: stderr llega por otro tubo y sin orden. */
const ERROR_MARCA = '__VD_ERROR__';
const FIN_SUFFIX = '__';
const ORDEN_PREFIX = '__VD_ORDEN_';
const ORDEN_SUFFIX = '__';
const TIMEOUT_MS = 5000;

interface EntradaPendiente {
  id: number;
  script: string;
  resolve: (result: PSResult) => void;
}

let proceso: ChildProcessWithoutNullStreams | null = null;
let siguienteId = 1;
let activa: (EntradaPendiente & { stdout: string; stderr: string }) | null = null;
const cola: EntradaPendiente[] = [];
let bufferStdout = '';
let cerrado = false;

// Prefijo UTF-8 para la salida del proceso; el .ps1 lleva BOM por aparte.
const PS_UTF8_PREFIX =
  'chcp 65001 > $null\r\n' +
  '$OutputEncoding = [System.Text.Encoding]::UTF8\r\n' +
  '[Console]::OutputEncoding = [System.Text.Encoding]::UTF8\r\n';

/** Script que corre en el proceso persistente y atiende ordenes por stdin. */
const SCRIPT_BUCLE_PS = `
${PS_UTF8_PREFIX}
$ErrorActionPreference = 'Stop'

$ordenPrefijo = '${ORDEN_PREFIX}'
$ordenSufijo = '${ORDEN_SUFFIX}'
$finPrefijo = '${FIN_PREFIX}'
$finSufijo = '${FIN_SUFFIX}'

function Procesar-Orden($id, $scriptBase64) {
    try {
        $bytes = [Convert]::FromBase64String($scriptBase64)
        $codigo = [System.Text.Encoding]::UTF8.GetString($bytes)
        $sb = [scriptblock]::Create($codigo)
        & $sb
    } catch {
        Write-Output "${ERROR_MARCA} $_"
    }
    Write-Output "$finPrefijo$id$finSufijo"
}

while ($true) {
    $linea = [Console]::In.ReadLine()
    if ($null -eq $linea) { break }
    if ($linea.StartsWith($ordenPrefijo)) {
        $resto = $linea.Substring($ordenPrefijo.Length)
        $finId = $resto.IndexOf($ordenSufijo + ' ')
        if ($finId -lt 0) { continue }
        $id = $resto.Substring(0, $finId)
        $base64 = $resto.Substring($finId + $ordenSufijo.Length + 1)
        Procesar-Orden $id $base64
    }
}
`;

function escribirScriptBucle(): string {
  const tmp = join(tmpdir(), `vd_ps_bucle_${Date.now()}_${Math.random().toString(36).slice(2)}.ps1`);
  const BOM = '\ufeff';
  writeFileSync(tmp, BOM + SCRIPT_BUCLE_PS.replace(/\n/g, '\r\n'), 'utf-8');
  return tmp;
}

function crearProceso(): void {
  if (proceso || cerrado) return;

  let ruta: string;
  try {
    ruta = escribirScriptBucle();
  } catch {
    return;
  }

  const p = spawn(
    'powershell',
    ['-NoProfile', '-NonInteractive', '-File', ruta],
    { windowsHide: true }
  );
  proceso = p;
  bufferStdout = '';

  p.stdout.setEncoding('utf-8');
  p.stderr.setEncoding('utf-8');

  // Todo lo que llegue de un proceso ya sustituido se ignora: si no, su
  // `close` tardío daba por fallida la orden del nuevo y lo dejaba huérfano.
  p.stdout.on('data', (d: string) => {
    if (proceso !== p) return;
    bufferStdout += d;
    procesarBuffer();
  });

  p.stderr.on('data', (d: string) => {
    if (proceso === p && activa) activa.stderr += d;
  });

  // Escribir en un proceso que acaba de morir da EPIPE; sin esto tumba el main.
  p.stdin.on('error', () => {});

  const alTerminar = (): void => {
    try { unlinkSync(ruta); } catch {}
    if (proceso !== p) return;
    proceso = null;
    if (activa) {
      activa.resolve({ stdout: activa.stdout, stderr: activa.stderr, ok: false });
      activa = null;
    }
    if (!cerrado && cola.length > 0) {
      crearProceso();
      procesarCola();
    }
  };
  p.on('close', alTerminar);
  p.on('error', alTerminar);
}

function procesarBuffer(): void {
  if (!activa) return;
  const marcador = `${FIN_PREFIX}${activa.id}${FIN_SUFFIX}`;
  const idx = bufferStdout.indexOf(marcador);
  if (idx < 0) return;

  const salida = bufferStdout.substring(0, idx).trim();
  const posError = salida.indexOf(ERROR_MARCA);
  const ok = posError < 0;
  const stdout = ok ? salida : salida.substring(0, posError).trim();
  const stderr = ok ? activa.stderr.trim() : salida.substring(posError + ERROR_MARCA.length).trim();
  activa.resolve({ stdout, stderr, ok });
  bufferStdout = bufferStdout.substring(idx + marcador.length);
  activa = null;
  procesarCola();
}

function matarProceso(): void {
  const p = proceso;
  if (!p) return;
  proceso = null;
  try {
    p.kill();
  } catch {}
  // Si el proceso se queda zombie (PowerShell suele dejar hijos), taskkill /T.
  if (p.pid) {
    setTimeout(() => {
      exec(`taskkill /T /F /PID ${p.pid} 2>nul`, { windowsHide: true }, () => {});
    }, 100);
  }
}

function procesarCola(): void {
  if (activa || !proceso || cola.length === 0) return;
  const entrada = cola.shift()!;
  activa = { ...entrada, stdout: '', stderr: '' };
  const payload = Buffer.from(entrada.script, 'utf-8').toString('base64');
  const linea = `${ORDEN_PREFIX}${entrada.id}${ORDEN_SUFFIX} ${payload}\n`;
  proceso.stdin.write(linea, 'utf-8');

  setTimeout(() => {
    if (activa && activa.id === entrada.id) {
      const timeoutMsg = 'timeout (5s) en PowerShell persistente';
      activa.resolve({ stdout: activa.stdout, stderr: activa.stderr || timeoutMsg, ok: false });
      activa = null;
      matarProceso();
      // El `close` del proceso matado ya no es «el actual» y no relanza: se hace aquí.
      if (cola.length > 0) crearProceso();
      procesarCola();
    }
  }, TIMEOUT_MS);
}

/** Asegura que el proceso persistente este vivo. */
function iniciarPSPersistente(): void {
  if (cerrado) return;
  crearProceso();
}

/** Ejecuta un script en el PowerShell persistente. */
export function ejecutarPSPersistente(script: string): Promise<PSResult> {
  if (cerrado) {
    return Promise.resolve({ stdout: '', stderr: 'PowerShell persistente cerrado', ok: false });
  }
  return new Promise((resolve) => {
    const id = siguienteId++;
    cola.push({ id, script, resolve });
    iniciarPSPersistente();
    procesarCola();
  });
}

/** Cierra el proceso persistente. */
export function cerrarPSPersistente(): void {
  cerrado = true;
  // Resolver ordenes pendientes como fallidas.
  for (const p of cola) {
    p.resolve({ stdout: '', stderr: 'PowerShell persistente cerrado', ok: false });
  }
  cola.length = 0;
  if (activa) {
    activa.resolve({ stdout: '', stderr: 'PowerShell persistente cerrado', ok: false });
    activa = null;
  }
  matarProceso();
}
