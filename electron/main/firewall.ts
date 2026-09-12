import { execFile, spawn } from 'node:child_process';
import { tm } from './idioma';

/**
 * Diagnóstico y configuración del Firewall de Windows para el servidor local (1.4 y 1.1).
 *
 * En Windows, abrir un puerto (0.0.0.0:8787) para la red local puede quedar bloqueado
 * silenciosamente por el Firewall de Windows si no existe una regla de entrada.
 * Esto comprueba si la regla existe y permite crearla en un clic con elevación UAC estándar.
 */

export interface EstadoFirewall {
  soportado: boolean;
  existe: boolean;
  permitido: boolean;
  error?: string;
}

/**
 * Comprueba si existe una regla activa en el Firewall de Windows para VirtualDeck.
 * No requiere permisos de administrador (solo lectura).
 */
export async function comprobarReglaFirewall(_puerto: number): Promise<EstadoFirewall> {
  if (process.platform !== 'win32') {
    return { soportado: false, existe: true, permitido: true };
  }

  const psCmd = `(Get-NetFirewallRule -DisplayName 'VirtualDeck' -ErrorAction SilentlyContinue).Enabled`;

  return await new Promise((resolve) => {
    execFile(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-Command', psCmd],
      { windowsHide: true, timeout: 5000 },
      (err, stdout) => {
        if (err) {
          // Si PowerShell falla o no está disponible, no bloqueamos la app
          return resolve({ soportado: true, existe: false, permitido: false, error: err.message });
        }
        const salida = stdout.trim();
        if (salida.toLowerCase().includes('true')) {
          return resolve({ soportado: true, existe: true, permitido: true });
        }
        if (salida.toLowerCase().includes('false')) {
          return resolve({ soportado: true, existe: true, permitido: false });
        }
        // No se encontró la regla específica de VirtualDeck
        return resolve({ soportado: true, existe: false, permitido: false });
      },
    );
  });
}

/**
 * Crea o actualiza la regla de entrada en el Firewall de Windows para el puerto especificado.
 * Dispara el diálogo de elevación UAC estándar de Windows.
 */
export async function abrirReglaFirewall(puerto: number): Promise<{ ok: boolean; error?: string }> {
  if (process.platform !== 'win32') {
    return { ok: true };
  }

  const portNum = puerto > 0 && puerto < 65536 ? puerto : 8787;

  // PowerShell + Start-Process -Verb RunAs para UAC, igual que en sensors.ts (registerUrlAcl).
  const psScript =
    `$ErrorActionPreference='SilentlyContinue';` +
    `Remove-NetFirewallRule -DisplayName 'VirtualDeck' -ErrorAction SilentlyContinue;` +
    `$ErrorActionPreference='Stop';` +
    `New-NetFirewallRule -DisplayName 'VirtualDeck' -Description 'VirtualDeck Local Remote Server' -Direction Inbound -LocalPort ${portNum} -Protocol TCP -Action Allow -Profile Any;` +
    `exit $LASTEXITCODE`;

  const launcherCmd =
    `$p=Start-Process -FilePath powershell.exe -ArgumentList '-NoProfile','-NonInteractive','-Command',"${psScript.replace(/"/g, '`"')}" -Verb RunAs -WindowStyle Hidden -Wait -PassThru;` +
    `exit $p.ExitCode`;

  return await new Promise((resolve) => {
    const ps = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', launcherCmd], {
      stdio: 'ignore',
      windowsHide: true,
    });

    ps.on('error', (err) => resolve({ ok: false, error: err.message }));
    ps.on('exit', (code) => {
      if (code === 0) resolve({ ok: true });
      // Código 1223 = el usuario canceló la elevación UAC en Windows
      else if (code === 1223) resolve({ ok: false, error: tm('sensors.uacCancelled') });
      else resolve({ ok: false, error: `${tm('sensors.netshCode')} ${code}` });
    });
  });
}

