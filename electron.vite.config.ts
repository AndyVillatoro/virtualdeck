import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import react from '@vitejs/plugin-react';
import type { Plugin } from 'vite';
import { resolve } from 'path';

/**
 * Permite scripts en línea **solo** en el servidor de desarrollo.
 *
 * `index.html` lleva una Content-Security-Policy con `script-src 'self'`, que es
 * lo correcto para la aplicación empaquetada: sin `'unsafe-inline'`, un fallo de
 * inyección no puede ejecutar código.
 *
 * Pero en desarrollo Vite inyecta un `<script type="module">` **en línea** con
 * el preámbulo del refresco de React. Esa política lo bloquea, el módulo de la
 * aplicación no llega a ejecutarse, y como la ventana no tiene marco lo que se
 * ve es un rectángulo oscuro vacío: sin botones, sin error y sin nada que
 * indique qué pasó.
 *
 * Este plugin añade `'unsafe-inline'` únicamente cuando se sirve en desarrollo.
 * El HTML que se empaqueta no se toca.
 */
function cspDeDesarrollo(): Plugin {
  return {
    name: 'vd-csp-desarrollo',
    apply: 'serve',
    transformIndexHtml(html) {
      return html.replace(
        /(<meta http-equiv="Content-Security-Policy"[^>]*content=")([^"]*)(")/,
        (_todo, antes, politica, despues) =>
          `${antes}${politica.replace(
            "script-src 'self'",
            "script-src 'self' 'unsafe-inline'",
          )}${despues}`,
      );
    },
  };
}

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      lib: { entry: resolve(__dirname, 'electron/main/index.ts') },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      lib: { entry: resolve(__dirname, 'electron/preload/index.ts') },
    },
  },
  renderer: {
    root: resolve(__dirname),
    build: {
      rollupOptions: {
        input: { index: resolve(__dirname, 'index.html') },
      },
    },
    plugins: [react(), cspDeDesarrollo()],
  },
});
