import { intentarNativo } from './native';
import { exec, spawn } from 'child_process';
import { shell } from 'electron';

/**
 * Lanza un programa. Camino de respaldo cuando no hay nucleo nativo.
 *
 * **Sin `shell: true`.** Lo tenia, y con eso la ruta pasaba por `cmd.exe`, que
 * la parte por los espacios. Medido con un ejecutable en
 * `...\carpeta con espacios\mi app.exe`:
 *
 *   shell: true   ->  «"C:\Users\..." no se reconoce como un comando»
 *   shell: false  ->  arranca
 *
 * O sea que **cualquier programa en `C:\Program Files\...`** —la mayoria— no se
 * abria por este camino. Y el `resolve(true)` era incondicional: el fallo pasa
 * en el proceso hijo, asi que el boton decia que habia ido bien y no pasaba
 * nada. Sin `shell`, Node entrecomilla los argumentos por su cuenta, y ademas
 * desaparece la puerta que abria: con `cmd` de por medio, un `&` o un `|` en la
 * ruta o en los argumentos —los trae quien escribio el perfil, que puede no ser
 * el usuario— se ejecutaban como ordenes.
 *
 * Los `.bat` y `.cmd` **si** necesitan interprete: Node ya no los lanza
 * directamente. Ahi se llama a `cmd.exe /c` con la ruta como argumento aparte,
 * que Node entrecomilla igualmente.
 */
export async function launchApp(appPath: string, args: string[] = []): Promise<boolean> {
  const r = intentarNativo('launchApp', (n) => n.launchApp(appPath, args));
  if (r !== undefined) return r;

  return new Promise((resolve) => {
    try {
      const esLote = /\.(bat|cmd)$/i.test(appPath.trim());
      const child = esLote
        ? spawn('cmd.exe', ['/c', appPath, ...args], { detached: true, stdio: 'ignore', windowsHide: true })
        : spawn(appPath, args, { detached: true, stdio: 'ignore' });
      // `spawn` no lanza al fallar: avisa por el evento. Sin esto, «no existe
      // ese programa» se contaba como exito.
      child.on('error', () => resolve(false));
      child.on('spawn', () => { child.unref(); resolve(true); });
    } catch {
      resolve(false);
    }
  });
}

export async function openShortcut(path: string): Promise<boolean> {
  const r = intentarNativo('openShortcut', (n) => n.openPath(path));
  if (r !== undefined) return r;

  try { await shell.openPath(path); return true; } catch { return false; }
}

/**
 * Abre «Configuración de la tableta» del Panel de control.
 *
 * Es la herramienta donde Windows pregunta **cuál de los monitores responde al
 * tacto**. Hace falta en cuanto hay más de una pantalla: sin ese mapeo, tocar
 * la tableta mueve el cursor en el monitor equivocado, y VirtualDeck en modo
 * kiosko sobre una pantalla táctil se vuelve inservible. No es algo que
 * VirtualDeck pueda arreglar por su cuenta: el mapeo lo guarda Windows.
 *
 * `control /name Microsoft.TabletPCSettings` es el nombre canónico; comprobado
 * en el registro, resuelve a
 * `rundll32 shell32.dll,Control_RunDLL tabletpc.cpl @1`. Ese es el respaldo por
 * si `control.exe` no acepta el nombre en alguna edición de Windows.
 *
 * Si el equipo no tiene digitalizador, la herramienta puede no existir; por eso
 * se devuelve si abrió o no, en vez de fallar en silencio.
 */
export async function abrirAjustesTactiles(): Promise<boolean> {
  const intentos: [string, string[]][] = [
    ['control.exe', ['/name', 'Microsoft.TabletPCSettings']],
    ['rundll32.exe', ['shell32.dll,Control_RunDLL', 'tabletpc.cpl', '@1']],
  ];
  for (const [cmd, args] of intentos) {
    const ok = await new Promise<boolean>((resolve) => {
      try {
        const hijo = spawn(cmd, args, { detached: true, stdio: 'ignore', windowsHide: false });
        hijo.on('error', () => resolve(false));
        // `control.exe` termina en cuanto delega en el panel, asi que no se
        // puede esperar a su codigo de salida: si no ha fallado al arrancar,
        // se da por bueno.
        setTimeout(() => resolve(true), 400);
      } catch { resolve(false); }
    });
    if (ok) return true;
  }
  return false;
}

export async function getRunningProcesses(): Promise<string[]> {
  const r = intentarNativo('getRunningProcesses', (n) => n.getRunningProcesses());
  if (r !== undefined && r.length > 0) return r;

  return new Promise((resolve) => {
    exec('tasklist /NH /FO CSV', { timeout: 5000 }, (err, stdout) => {
      if (err) { resolve([]); return; }
      const names: string[] = [];
      for (const line of stdout.split('\n')) {
        const m = /^"([^"]+)"/.exec(line.trim());
        if (m) names.push(m[1].replace(/\.exe$/i, '').toLowerCase());
      }
      resolve(names);
    });
  });
}

export async function killProcess(name: string): Promise<boolean> {
  const r = intentarNativo('killProcess', (n) => n.killProcess(name));
  if (r !== undefined) return r;

  const safe = name.replace(/['"&|<>]/g, '').trim();
  if (!safe) return false;
  return new Promise((resolve) => {
    exec(`taskkill /IM "${safe}" /F`, { timeout: 10000 }, (err) => resolve(!err));
  });
}

export async function isProcessRunning(name: string): Promise<boolean> {
  const r = intentarNativo('isProcessRunning', (n) => n.isProcessRunning(name));
  if (r !== undefined) return r;

  const names = await getRunningProcesses();
  return names.includes(name.replace(/\.exe$/i, '').toLowerCase().trim());
}
