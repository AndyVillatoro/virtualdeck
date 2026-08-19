import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ButtonCell } from '../components/ButtonCell';
import { ThemeProvider, useTheme } from '../utils/theme';
import { LanguageProvider, useT } from '../utils/i18n';
import { executeAction } from '../utils/actions';
import type { ButtonConfig, DeckConfig, FloatingBarSettings } from '../types';

/**
 * Contenido de la ventana de la barra flotante (`index.html#barra`).
 *
 * Se dibuja sobre una ventana transparente: aquí **no se pinta ningún fondo**.
 * Lo único opaco son los tiles, así que sobre el escritorio se ven flotando.
 * Cualquier `background` que se añada al contenedor rompe justo eso.
 */

export const BARRA_POR_DEFECTO: FloatingBarSettings = {
  enabled: false,
  slots: [null, null, null, null],
  opacity: 0.9,
  side: 'right',
  y: null,
  tileSize: 64,
};

const SEPARACION = 8;
const MARGEN = 12;

function Contenido({ config, onGuardar }: { config: DeckConfig; onGuardar: (c: DeckConfig) => void }) {
  const VD = useTheme();
  const t = useT();
  const api = window.electronAPI;
  const barra = config.floatingBar ?? BARRA_POR_DEFECTO;
  const tile = barra.tileSize ?? 64;
  const [hover, setHover] = useState(false);
  const [ejecutando, setEjecutando] = useState<Set<string>>(new Set());

  const porId = new Map(config.buttons.map((b) => [b.id, b]));

  const ejecutar = useCallback(async (btn: ButtonConfig) => {
    if (!api) return;
    setEjecutando((prev) => new Set(prev).add(btn.id));
    try {
      await executeAction(btn.action, api, config.state ?? {}, config.rgb?.profiles ?? []);
    } finally {
      setEjecutando((prev) => { const s = new Set(prev); s.delete(btn.id); return s; });
    }
  }, [api, config.state, config.rgb]);

  const cerrar = () => {
    // Se apaga en la configuración, no solo se cierra la ventana: si no,
    // volvería a salir al siguiente arranque y la × parecería no servir.
    onGuardar({ ...config, floatingBar: { ...barra, enabled: false } });
    api?.bar.close();
  };

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        // Sin `background`: la ventana es transparente a propósito.
        width: '100vw', height: '100vh',
        padding: MARGEN, boxSizing: 'border-box',
        // Ancla del boton de cerrar, que va posicionado sobre esta caja.
        position: 'relative',
        display: 'flex', flexDirection: 'column', gap: SEPARACION,
        // Los huecos entre tiles mueven la ventana; los tiles no (más abajo).
        WebkitAppRegion: 'drag',
      } as React.CSSProperties}
    >
      {barra.slots.map((id, i) => {
        const btn = id ? porId.get(id) : undefined;
        return (
          <div
            key={`${i}-${id ?? 'vacio'}`}
            style={{
              width: tile, height: tile, position: 'relative', flexShrink: 0,
              opacity: barra.opacity ?? 0.9,
              WebkitAppRegion: 'no-drag',
            } as React.CSSProperties}
          >
            {btn ? (
              <ButtonCell
                button={btn}
                accent={config.accent ?? VD.accent}
                isRunning={ejecutando.has(btn.id)}
                soundEnabled={config.soundOnPress ?? false}
                soundProfile={config.soundProfile ?? 'click'}
                showContextMenu={false}
                onEdit={() => { /* la barra no edita: para eso está el deck */ }}
                onExecute={() => ejecutar(btn)}
              />
            ) : (
              // Hueco: solo un contorno tenue, y solo mientras el cursor está
              // encima. Si se viera siempre, la barra dejaría de parecer tiles
              // flotando y volvería a parecer un panel.
              <div style={{
                width: '100%', height: '100%',
                border: `1px dashed ${VD.border}`,
                borderRadius: VD.radius.lg,
                opacity: hover ? 0.5 : 0,
                transition: 'opacity 120ms',
              }} />
            )}
          </div>
        );
      })}

      {/* Cerrar: arriba a la derecha de la columna, solo al pasar el cursor. */}
      <button
        onClick={cerrar}
        title={t('bar.close')}
        style={{
          position: 'absolute', top: 2, right: 2,
          width: 18, height: 18, lineHeight: 1, padding: 0,
          border: `1px solid ${VD.borderStrong}`, borderRadius: '50%',
          background: VD.surface, color: VD.textDim,
          fontSize: 11, cursor: 'pointer',
          opacity: hover ? 1 : 0,
          pointerEvents: hover ? 'auto' : 'none',
          transition: 'opacity 120ms',
          WebkitAppRegion: 'no-drag',
        } as React.CSSProperties}
      >&times;</button>
    </div>
  );
}

export function FloatingBarB() {
  const api = window.electronAPI;
  const [config, setConfig] = useState<DeckConfig | null>(null);
  // La config más reciente, para guardar sin volver a leer del disco.
  const configRef = useRef<DeckConfig | null>(null);
  configRef.current = config;

  useEffect(() => {
    if (!api) return;
    api.config.load().then((c) => setConfig(c as DeckConfig)).catch(() => {});
    // La ventana principal es la que edita; aquí solo se escucha.
    const quitarConfig = api.bar.onConfigChanged((data) => setConfig(data as DeckConfig));
    // La posición se guarda desde aquí y no desde el proceso principal, para que
    // toda la configuración se escriba por un único camino.
    const quitarMovida = api.bar.onMoved((y) => {
      const actual = configRef.current;
      if (!actual) return;
      const barraActual = actual.floatingBar ?? BARRA_POR_DEFECTO;
      if (barraActual.y === y) return;
      const siguiente = { ...actual, floatingBar: { ...barraActual, y } };
      configRef.current = siguiente;
      setConfig(siguiente);
      api.config.save(siguiente).catch(() => {});
    });
    return () => { quitarConfig(); quitarMovida(); };
  }, [api]);

  const guardar = useCallback((c: DeckConfig) => {
    setConfig(c);
    api?.config.save(c).catch(() => {});
  }, [api]);

  if (!config) return null;

  return (
    <LanguageProvider pref={config.language}>
      <ThemeProvider theme={config.theme ?? 'dark'} accent={config.accent}>
        <Contenido config={config} onGuardar={guardar} />
      </ThemeProvider>
    </LanguageProvider>
  );
}
