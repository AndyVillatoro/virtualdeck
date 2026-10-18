import { spawn } from 'child_process';
import { disconnect } from './conexion';
import { estado } from './estado';
import { tm } from '../sistema/idioma';

export async function spawnServer(exePath?: string): Promise<{ ok: boolean; error?: string }> {
  if (estado.serverProc && !estado.serverProc.killed) return { ok: true };
  if (!exePath) return { ok: false, error: tm('rgb.sinRuta') };
  try {
    const args = ['--server', '--server-port', String(estado.port)];
    const child = spawn(exePath, args, { detached: false, stdio: 'ignore', windowsHide: true });
    child.on('exit', () => { if (estado.serverProc === child) estado.serverProc = null; });
    child.on('error', (err) => { estado.lastError = `OpenRGB spawn: ${err.message}`; });
    estado.serverProc = child;
    await new Promise((r) => setTimeout(r, 1200));
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function killServer(): Promise<void> {
  await disconnect();
  if (estado.serverProc && !estado.serverProc.killed) {
    try { estado.serverProc.kill(); } catch {}
  }
  estado.serverProc = null;
}