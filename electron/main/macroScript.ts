/**
 * El camino de respaldo de las macros: acotar los numéricos de un paso y
 * generar el script de PowerShell que los reproduce.
 *
 * Vive aparte de `macro.ts` por dos razones.
 *
 * Una: es lo único que **interpreta** algo. Todo lo que de aquí sale acaba en un
 * `powershell -Command`, y un paso de macro puede venir de un perfil importado
 * de la galería, o sea de un desconocido. El camino nativo no comparte este
 * riesgo —en Rust los campos son `Option<i64>` y serde falla si les llega otra
 * cosa—, pero el mismo paso puede tomar cualquiera de los dos según esté
 * compilado el `.node`, así que este es el que tiene que estar cerrado.
 *
 * Dos: se puede **probar sin lanzar nada**. `buildPlaybackScript` solo devuelve
 * una cadena, así que un test puede passarle pasos con payloads y mirar el
 * texto que sale. Con el generador dentro de `macro.ts` la única forma de
 * probarlo era ejecutando la macro —moviendo el ratón y escribiendo en el
 * escritorio de quien lo prueba—.
 */

import type { MacroStep } from '../../src/types';

// ---------------------------------------------------------------------------
// Acotado de los numéricos
// ---------------------------------------------------------------------------

/**
 * Los campos numéricos de un paso se interpolan crudos en el script de
 * PowerShell, y un paso puede venir de un perfil importado de la galería, o sea
 * de un desconocido. `MacroStep` es un tipo de TypeScript, que no valida nada en
 * runtime: `{"type":"key","value":"a","delayMs":"1; Start-Process calc.exe"}`
 * llega intacto desde el JSON y el guardián `(delayMs ?? 0) > 0` lo acepta
 * porque en JS `"1; …" > 0` es `true` por coacción. Lo que sale de ahí es un
 * script que ejecuta lo que traiga el payload.
 *
 * Lo que hace `paraPS` no alcanza aquí: ese escapado es para **cadenas**, y un
 * número no es una cadena.
 *
 * Los topes salen de lo que Windows aguanta de verdad: ±32768 en coordenadas
 * (muy por encima de cualquier monitor), 10 minutos de espera y ±2000 muescas
 * de rueda. El grabador queda dentro de esos topes: unos cientos de
 * milisegundos entre teclas es lo normal.
 */


/** Espera máxima entre pasos: 10 min. */
const MAX_DELAY_MS = 600_000;
/** Coordenada máxima absoluta. */
const MAX_COORD = 32_768;
/** Desplazamiento máximo, en muescas de rueda. */
const MAX_SCROLL = 2_000;
/** Repeticiones máximas de una macro. */
export const MAX_REPETICIONES = 1_000;

/**
 * Un número acotado y redondeado, o el valor por defecto.
 *
 * **Solo acepta `number`.** Un `"5"` en cadena no se coacciona: se descarta.
 * Podría hacerse (`Number(v)`), pero entonces `""` valdría 0 y `"0x10"` valdría
 * 16, y un campo que el tipo declara numérico no tiene por qué llegar como
 * cadena salvo para intentar algo. Fuera lo que no sea número, sin mirar de qué
 * viene.
 */
export function entero(v: unknown, min: number, max: number, porDefecto: number): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) return porDefecto;
  return Math.min(max, Math.max(min, Math.round(v)));
}

/**
 * El mismo paso con los numéricos acotados.
 *
 * Se llama una vez por paso en `playMacro`, antes de los dos caminos. Además de
 * acotar, **borra** el campo numérico que el tipo de paso no usa: un `key` con
 * `x: "lo que sea"` no lo lee nadie, pero viaja en el JSON que ve Rust, y ahí
 * `x` es `Option<i64>`, así que serde rechaza el paso entero y la macro no se
 * reproduce. O sea que un campo de sobra no es que no hagan falta: rompen.
 */
export function pasoSeguro(p: MacroStep): MacroStep {
  const paso: MacroStep = { ...p, delayMs: entero(p.delayMs, 0, MAX_DELAY_MS, 0) };
  if (paso.type === 'click' || paso.type === 'move') {
    paso.x = entero(p.x, -MAX_COORD, MAX_COORD, 0);
    paso.y = entero(p.y, -MAX_COORD, MAX_COORD, 0);
  } else {
    delete paso.x;
    delete paso.y;
  }
  if (paso.type === 'scroll') {
    // 1 muesca por defecto, que es lo que significaba `?? 1` en el original.
    paso.scrollY = entero(p.scrollY, -MAX_SCROLL, MAX_SCROLL, 1);
  } else {
    delete paso.scrollY;
  }
  return paso;
}

// ---------------------------------------------------------------------------
// Script builder
// ---------------------------------------------------------------------------

export function buildPlaybackScript(steps: MacroStep[], repeat: number): string {
  const lines: string[] = [
    `Add-Type -AssemblyName System.Windows.Forms`,
    `Add-Type -TypeDefinition @"`,
    `using System; using System.Runtime.InteropServices;`,
    `public class VDMacroInput {`,
    `  [DllImport("user32.dll")] public static extern bool SetCursorPos(int x, int y);`,
    `  [DllImport("user32.dll")] public static extern void mouse_event(int f,int dx,int dy,int c,int ex);`,
    `}`,
    `"@ -IgnoreWarnings -ErrorAction SilentlyContinue`,
    ``,
  ];

  for (let i = 0; i < repeat; i++) {
    for (const step of steps) {
      // Todo lo que se interpola aquí pasa por `entero`, aunque `steps` ya
      // venga acotado de `playMacro`: el que construya el script no tiene por
      // qué acordarse de lo que hizo quien se lo pasó.
      const espera = entero(step.delayMs, 0, MAX_DELAY_MS, 0);
      if (espera > 0) {
        lines.push(`Start-Sleep -Milliseconds ${espera}`);
      }
      switch (step.type) {
        case 'delay':
          // Delay-only step — already handled above
          break;
        case 'key':
        case 'hotkey': {
          const k = escapeSendKeys(step.value ?? '');
          if (k) lines.push(`[System.Windows.Forms.SendKeys]::SendWait("${paraPS(k)}")`);
          break;
        }
        case 'text': {
          // SendWait with literal text — each char that needs escaping is wrapped
          const chunks = escapeSendKeysText(step.value ?? '');
          if (chunks) lines.push(`[System.Windows.Forms.SendKeys]::SendWait("${paraPS(chunks)}")`);
          break;
        }
        case 'click': {
          const x = entero(step.x, -MAX_COORD, MAX_COORD, 0);
          const y = entero(step.y, -MAX_COORD, MAX_COORD, 0);
          lines.push(`[VDMacroInput]::SetCursorPos(${x}, ${y})`);
          // LBUTTONDOWN=2 LBUTTONUP=4  RBUTTONDOWN=8 RBUTTONUP=16  MBUTTONDOWN=32 MBUTTONUP=64
          const [down, up] = step.button === 1 ? [8, 16] : step.button === 2 ? [32, 64] : [2, 4];
          lines.push(`[VDMacroInput]::mouse_event(${down}, 0, 0, 0, 0)`);
          lines.push(`[VDMacroInput]::mouse_event(${up}, 0, 0, 0, 0)`);
          break;
        }
        case 'move': {
          const x = entero(step.x, -MAX_COORD, MAX_COORD, 0);
          const y = entero(step.y, -MAX_COORD, MAX_COORD, 0);
          lines.push(`[VDMacroInput]::SetCursorPos(${x}, ${y})`);
          break;
        }
        case 'scroll': {
          const amount = entero(step.scrollY, -MAX_SCROLL, MAX_SCROLL, 1) * 120;
          if (amount !== 0) lines.push(`[VDMacroInput]::mouse_event(0x0800, 0, 0, ${amount}, 0)`);
          break;
        }
      }
    }
  }

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// SendKeys escaping helpers
// ---------------------------------------------------------------------------

/**
 * `Ctrl+C` → `^c`, `Enter` → `{ENTER}`, y lo que ya viene entre llaves se deja
 * en paz.
 *
 * Lo último es el arreglo: los reemplazos se aplicaban sobre la cadena entera,
 * así que un paso ya grabado como `{ENTER}` salía `{{ENTER}}` —y `{F5}` salía
 * `{{F5}}`—, que en SendKeys es una llave literal seguida de basura. O sea que
 * ninguna tecla con nombre se reproducía por este camino. Ahora la cadena se
 * parte por los tramos entre llaves y solo se traduce lo de fuera.
 */
function escapeSendKeys(value: string): string {
  return value
    .split(/(\{[^{}]*\})/)
    .map((tramo) => (tramo.startsWith('{') ? tramo : traducirNombres(tramo)))
    .join('');
}

function traducirNombres(t: string): string {
  return t
    .replace(/\bCtrl\+/gi, '^')
    .replace(/\bAlt\+/gi, '%')
    .replace(/\bShift\+/gi, '+')
    .replace(/\bWin\+/gi, '{LWIN}')
    .replace(/\bEnter\b/gi, '{ENTER}')
    .replace(/\bTab\b/gi, '{TAB}')
    .replace(/\bEsc\b/gi, '{ESC}')
    .replace(/\bDelete\b/gi, '{DELETE}')
    .replace(/\bBackspace\b/gi, '{BACKSPACE}')
    .replace(/\bSpace\b/gi, ' ')
    .replace(/\bF(\d{1,2})\b/gi, '{F$1}')
    .replace(/\bUp\b/gi, '{UP}')
    .replace(/\bDown\b/gi, '{DOWN}')
    .replace(/\bLeft\b/gi, '{LEFT}')
    .replace(/\bRight\b/gi, '{RIGHT}')
    .replace(/\bHome\b/gi, '{HOME}')
    .replace(/\bEnd\b/gi, '{END}')
    .replace(/\bPgUp\b/gi, '{PGUP}')
    .replace(/\bPgDn\b/gi, '{PGDN}');
}

/**
 * Lo escapado para SendKeys todavía tiene que **entrar en una cadena de
 * PowerShell entre comillas dobles**, y ahí mandan otros tres caracteres.
 * Sin este paso, medido generando el script y ejecutándolo:
 *
 *   precio $100 USD  →  «precio  USD»      `$1` se expande a nada
 *   dijo "hola"      →  error de sintaxis  la macro entera no se reproduce
 *   a`b              →  «ab»              la tilde es el escape de PS
 *   $env:USERNAME    →  «el nombre de tu cuenta»           se evalúa en vez de escribirse
 *
 * Lo último es lo grave: un paso de texto es datos, y por aquí `$(...)`
 * ejecuta — una macro importada de la galería dejaba de ser «teclea esto».
 * El camino nativo no tiene nada de esto: los pasos viajan como JSON.
 */
function paraPS(t: string): string {
  return t.replace(/`/g, '``').replace(/"/g, '`"').replace(/\$/g, '`$');
}

/** Escape literal text for SendWait (escapes {+^%~()} → wrapped in braces). */
function escapeSendKeysText(text: string): string {
  return text.replace(/[{}()+^%~]/g, (c) => `{${c}}`);
}

