import { intentarNativo } from '../sistema/native';
import { runPS, runPSBool, runCmd, injectUtf8Prefix } from './ps-helpers';

/**
 * El preambulo UTF-8, antes de decidir por que camino va el script.
 *
 * El nucleo nativo lanza `powershell -Command <script>` y lee la salida con
 * `from_utf8_lossy`, pero **no inyecta el preambulo**: PowerShell escribe en la
 * pagina de codigos de la consola, esos bytes no son UTF-8 validos y cada
 * acento volvia como el caracter de reemplazo. Medido con la accion «script»
 * que guarda la salida en una variable:
 *
 *   esperado       Hola ¿qué? Añadí más música
 *   sin preambulo  Hola ?qu?? A?ad? m?s m?sica
 *   con preambulo  Hola ¿qué? Añadí más música
 *
 * El arreglo de raiz ya esta en `crates/vd-core`; inyectarlo aqui cubre un
 * `.node` anterior y no le hace nada al camino de respaldo porque
 * `injectUtf8Prefix` es idempotente.
 *
 * Solo para PowerShell: en `cmd` esas tres lineas no son sintaxis valida.
 */
function conUtf8(script: string, shell_: string): string {
  return shell_ === 'powershell' ? injectUtf8Prefix(script) : script;
}

export async function runScript(script: string, shell_: string = 'powershell'): Promise<boolean> {
  const listo = conUtf8(script, shell_);
  // Nativo asíncrono (Promise): el hijo puede tardar hasta el límite sin
  // congelar el proceso principal. Si la Promise se rechaza, se cae al
  // respaldo de siempre en vez de reventar al llamador.
  const promesa = intentarNativo('runScript', (n) => n.runScript(listo, shell_));
  if (promesa !== undefined) {
    try {
      return (await promesa).success;
    } catch (e) {
      console.error('[nativo] runScript falló:', (e as Error).message);
    }
  }

  // Los dos van por su ayudante, que escribe un archivo temporal. El comentario
  // que habia aqui decia que los de `cmd` son «one-liners del usuario»; el
  // editor ofrece un area de texto de varias lineas, y de esas solo corria la
  // primera.
  if (shell_ === 'powershell') return runPSBool(listo, { timeoutMs: 30000 });
  return (await runCmd(listo, { timeoutMs: 30000 })).ok;
}

export async function runScriptCapture(script: string, shell_: string = 'powershell'): Promise<{ success: boolean; output: string }> {
  const listo = conUtf8(script, shell_);
  const promesa = intentarNativo('runScriptCapture', (n) => n.runScript(listo, shell_));
  if (promesa !== undefined) {
    try {
      return await promesa;
    } catch (e) {
      console.error('[nativo] runScriptCapture falló:', (e as Error).message);
    }
  }

  if (shell_ === 'powershell') {
    const r = await runPS(listo, { timeoutMs: 30000 });
    return { success: r.ok, output: (r.stdout || r.stderr || '').trim() };
  }
  // `cmd` va por `runCmd`, que escribe un `.bat` de verdad. Con `exec(script)`
  // —que le pasa la cadena entera a `cmd /c`— de un script de varias lineas
  // **solo corria la primera**, y los acentos volvian rotos.
  const r2 = await runCmd(listo, { timeoutMs: 30000 });
  return { success: r2.ok, output: (r2.stdout || r2.stderr || '').trim() };
}

/**
 * Lee un texto en voz alta (SAPI).
 *
 * Camino nativo: síntesis en proceso y llamada asíncrona — no congela el
 * proceso principal ni siquiera con frases largas. Antes se armaba un script
 * de `System.Speech` con `.Speak()` síncrono y se mandaba por `runScript`
 * nativo, que esperaba al hijo: **toda la frase con el IPC parado**.
 *
 * Sin núcleo, el script de siempre (corre en otro proceso, así que tampoco
 * bloquea; solo tarda más en arrancar).
 */
export async function speakText(text: string): Promise<boolean> {
  const promesa = intentarNativo('speakText', (n) => n.speakText(text));
  if (promesa !== undefined) {
    try {
      return await promesa;
    } catch (e) {
      console.error('[nativo] speakText falló:', (e as Error).message);
    }
  }

  // Comilla simple duplicada: es como PowerShell escapa dentro de '...'.
  const escaped = text.replace(/'/g, "''");
  const ps = `Add-Type -AssemblyName System.Speech; (New-Object System.Speech.Synthesis.SpeechSynthesizer).Speak('${escaped}')`;
  return runScript(ps, 'powershell');
}

export async function copyToClipboard(text: string): Promise<boolean> {
  const r = intentarNativo('copyToClipboard', (n) => n.copyToClipboard(text));
  if (r !== undefined) return r;

  // $Text arrives via param() — never interpolated, so PS string-escape rules
  // and `$()` subshell expansion don't apply.
  const script = `param([string]$Text)
Set-Clipboard -Value $Text`;
  return runPSBool(script, { timeoutMs: 10000, args: [text] });
}

export async function typeTextKeys(text: string): Promise<boolean> {
  const r = intentarNativo('typeTextKeys', (n) => n.typeText(text));
  if (r !== undefined) return r;

  // SendKeys metachars (+ ^ % ~ ( ) { } [ ]) must be wrapped — that's a
  // SendKeys-level concern, not a shell-level injection issue.
  const escaped = text.replace(/[+^%~(){}[\]]/g, (c) => `{${c}}`);
  const script = `param([string]$Keys)
Add-Type -AssemblyName System.Windows.Forms
[System.Windows.Forms.SendKeys]::SendWait($Keys)`;
  return runPSBool(script, { timeoutMs: 10000, args: [escaped] });
}
