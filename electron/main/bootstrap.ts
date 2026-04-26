/**
 * Bootstrap: se ejecuta ANTES del proceso principal.
 * Corrige la resolución del módulo 'electron' cuando node_modules/electron
 * sombrea el módulo built-in de Electron.
 */
'use strict';

// Solo aplicar el fix dentro del runtime de Electron
if (process.versions && process.versions.electron && (process.type as any) === 'browser') {
  const Module = require('module') as typeof import('module') & {
    _resolveFilename: (...args: any[]) => string;
    _load: (...args: any[]) => any;
    _cache: Record<string, any>;
  };

  const _originalResolve = Module._resolveFilename;
  const _originalLoad = Module._load;

  // Interceptar resolución: devolver 'electron' como id interno
  Module._resolveFilename = function (request: string, ...rest: any[]) {
    if (request === 'electron') return 'electron';
    return _originalResolve.call(this, request, ...rest);
  };

  // Interceptar carga: cuando id === 'electron', usar el módulo nativo de Electron
  Module._load = function (request: string, parent: any, isMain: boolean) {
    if (request === 'electron') {
      // Restaurar temporalmente para evitar recursión, cargar el built-in real
      Module._resolveFilename = _originalResolve;
      Module._load = _originalLoad;

      // Acceder al módulo interno de Electron via la API de Node
      let electronModule: any;
      try {
        // Electron registra su módulo como built-in usando el proceso nativo
        // Usamos process._linkedBinding o process.binding según la versión
        const nodeInternal = (process as any).binding?.('builtins') || null;
        if (nodeInternal) {
          electronModule = nodeInternal.electron;
        }
      } catch (_e) {}

      if (!electronModule) {
        // Fallback: cargar usando la resolución original saltando node_modules
        const origPaths = (parent as any)?.paths;
        if (parent) (parent as any).paths = [];
        try {
          electronModule = _originalLoad.call(this, 'electron', parent, isMain);
        } catch (_e2) {
          electronModule = {};
        } finally {
          if (parent) (parent as any).paths = origPaths;
        }
      }

      // Restaurar nuestros overrides para futuras llamadas
      Module._resolveFilename = function (req: string, ...r: any[]) {
        if (req === 'electron') return 'electron';
        return _originalResolve.call(this, req, ...r);
      };
      Module._load = Module._load; // already restored below

      // Cachear para evitar re-carga
      Module._cache['electron'] = {
        id: 'electron',
        filename: 'electron',
        loaded: true,
        exports: electronModule,
        parent: null,
        children: [],
        paths: [],
      };

      return electronModule;
    }
    return _originalLoad.call(this, request, parent, isMain);
  };
}

// Ahora cargar el proceso principal real
require('./index');
