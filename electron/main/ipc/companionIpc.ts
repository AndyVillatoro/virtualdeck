import { app, ipcMain, shell } from 'electron';
import { cpSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import type { CompanionCommand } from '../../../src/types';
import {
  obtenerEstadoCompanion,
  nuevoCodigoEmparejamiento,
  regenerarToken,
  obtenerAjustesCompanion,
} from '../companion/estadoCompanion';
import {
  enviarComandoCompanion,
  cambiarPuertoCompanion,
  alternarServidorCompanion,
  notificarEstado,
} from '../companion/servidorCompanion';
import { guardarAjustesCompanion } from '../companion/ajustes';

export function registerCompanionIpc(): void {
  ipcMain.handle('companion:status', () => {
    return obtenerEstadoCompanion();
  });

  ipcMain.handle('companion:pairingCode', () => {
    return nuevoCodigoEmparejamiento();
  });

  ipcMain.handle('companion:command', (_e, cmd: CompanionCommand) => {
    return enviarComandoCompanion(cmd);
  });

  // Token, puerto y «encendido» se escriben aquí, no solo en memoria: si no,
  // cada arranque generaba un token nuevo y la extensión tenía que
  // emparejarse otra vez.
  ipcMain.handle('companion:regenerateToken', () => {
    const nuevo = regenerarToken();
    guardarAjustesCompanion(obtenerAjustesCompanion());
    notificarEstado();
    return nuevo;
  });

  ipcMain.handle('companion:setPort', (_e, puerto: number) => {
    return cambiarPuertoCompanion(puerto).then((ok) => {
      // Se guarda siempre: el puerto que el usuario eligió es el que se
      // recuerda, y si no se pudo escuchar, `fallo` lo dice en Ajustes.
      guardarAjustesCompanion(obtenerAjustesCompanion());
      return ok;
    });
  });

  ipcMain.handle('companion:setEnabled', (_e, enabled: boolean) => {
    return alternarServidorCompanion(!!enabled).then((ok) => {
      guardarAjustesCompanion(obtenerAjustesCompanion());
      return ok;
    });
  });

  ipcMain.handle('companion:openFolder', async () => {
    const enRecursos = join(process.resourcesPath, 'companion-extension');
    const enApp = join(app.getAppPath(), 'companion-extension');
    const origen = existsSync(enRecursos) ? enRecursos : enApp;
    if (!existsSync(origen)) return null;
    const destino = join(app.getPath('userData'), 'companion-extension');
    try {
      cpSync(origen, destino, { recursive: true, force: true });
      await shell.openPath(destino);
      return destino;
    } catch {
      await shell.openPath(origen);
      return origen;
    }
  });
}