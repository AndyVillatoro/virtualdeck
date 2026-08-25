import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ButtonCell } from '../components/ButtonCell';
import { ThemeProvider, useTheme } from '../utils/theme';
import { LanguageProvider, useT } from '../utils/i18n';
import { interpolate } from '../utils/actions';
import { pulsarBoton, pulsacionLarga, type EntornoPulsacion } from '../utils/pulsarBoton';
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
  // Los interruptores salen de la configuracion, igual que en el deck: es lo
  // unico que ven las dos ventanas. Antes la barra tenia los suyos y un boton
  // encendido aqui salia apagado alli, y al reves.
  const encendidos = useMemo(() => new Set(config.toggledIds ?? []), [config.toggledIds]);
  /** Un aviso corto: un error de accion o la salida de un script. */
  const [aviso, setAviso] = useState<string | null>(null);

  // Por referencia y no por cierre, por lo mismo que en el deck: la celda
  // conserva el manejador de su primer render (ver `pulsarBoton`).
  const configRef = useRef(config);
  configRef.current = config;
  const encendidosRef = useRef(encendidos);
  encendidosRef.current = encendidos;

  const porId = new Map(config.buttons.map((b) => [b.id, b]));

  // Medirse y pedir ese tamaño exacto.
  //
  // El proceso principal calcula el alto a partir de la configuración, pero esa
  // cuenta no sabe del zoom, de la fuente ni de la densidad de la pantalla. Con
  // la interfaz al 150 % la ventana se quedaba corta y solo se veían tres tiles
  // de cuatro, sin manera de llegar al resto. Medir después de dibujar es lo
  // único que no se puede equivocar.
  const cajaRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const caja = cajaRef.current;
    if (!caja || !api) return;
    const medir = () => {
      // scroll*, no getBoundingClientRect: la caja mide lo que le dio la
      // ventana, y lo que hace falta saber es lo que **pide el contenido**.
      // Quien decide donde queda es el proceso principal: es el unico que
      // sabe de que monitor hablamos. Aqui solo se dice cuanto ocupa.
      api.bar.fit(Math.ceil(caja.scrollWidth), Math.ceil(caja.scrollHeight)).catch(() => {});
    };
    medir();
    const obs = new ResizeObserver(medir);
    obs.observe(caja);
    return () => obs.disconnect();
  }, [api, barra.slots.length, tile, barra.y]);

  /**
   * El mismo botón hace exactamente lo mismo aquí que en el deck.
   *
   * Esta era la **cuarta** copia del gesto de pulsar, y la más delgada: sin
   * grupo radio, sin tope para una acción colgada, sin el gancho de scripts
   * —y por tanto sin «guardar la salida en una variable» ni «mostrar la
   * salida»—, sin avisar de los errores y, sobre todo, **tirando el cambio de
   * estado**: un botón contador pulsado desde la barra no contaba nada.
   * Medido: tres pulsaciones desde la barra dejaban la variable en 0, y las
   * mismas desde el deck la subían a 1 y 2.
   *
   * El encendido se guarda aquí, en la ventana de la barra. No se sincroniza
   * con el deck —son dos ventanas y dos procesos de React— así que un botón
   * pulsado en la barra no sale encendido en el deck ni al revés. Compartirlo
   * pide llevar ese estado a la configuración, que es otra decisión.
   */
  /**
   * Guarda un trozo de la configuración, sin perder el trozo anterior.
   *
   * Una sola pulsación puede cambiar dos cosas —el interruptor y una
   * variable— y las dos leerían `configRef` antes de que React redibuje. Sin
   * adelantar la referencia aquí, la segunda escritura borraría la primera.
   */
  const guardarParcial = useCallback((parche: Partial<DeckConfig>) => {
    const siguiente = { ...configRef.current, ...parche };
    configRef.current = siguiente;
    onGuardar(siguiente);
  }, [onGuardar]);

  const entorno = useCallback((): EntornoPulsacion => ({
    api: api!,
    config: configRef.current,
    toggledIds: () => encendidosRef.current,
    // Se lee de la referencia y no del cierre, para que el grupo radio -que
    // llama a esto varias veces seguidas- no pise sus propios cambios.
    onToggle: (id) => {
      const s = new Set(encendidosRef.current);
      if (s.has(id)) s.delete(id); else s.add(id);
      encendidosRef.current = s;
      guardarParcial({ toggledIds: [...s] });
    },
    // La barra sí puede guardar: es el mismo camino por el que ya guarda su
    // posición vertical. El proceso principal reparte el cambio al deck.
    onStateUpdate: (cambio) => guardarParcial({
      state: { ...(configRef.current.state ?? {}), ...cambio },
    }),
    avisar: setAviso,
    t,
  }), [api, guardarParcial, t]);

  const ejecutar = useCallback(async (btn: ButtonConfig) => {
    if (!api) return;
    setEjecutando((prev) => new Set(prev).add(btn.id));
    try {
      await pulsarBoton(btn, entorno());
    } finally {
      setEjecutando((prev) => { const s = new Set(prev); s.delete(btn.id); return s; });
    }
  }, [api, entorno]);

  const pulsacionLargaBoton = useCallback(async (btn: ButtonConfig) => {
    if (!api) return;
    await pulsacionLarga(btn, entorno());
  }, [api, entorno]);

  const cerrar = () => {
    // Se apaga en la configuración, no solo se cierra la ventana: si no,
    // volvería a salir al siguiente arranque y la × parecería no servir.
    onGuardar({ ...config, floatingBar: { ...barra, enabled: false } });
    api?.bar.close();
  };

  return (
    <div
      ref={cajaRef}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        // Sin `background`: la ventana es transparente a propósito.
        // Alto por contenido, no 100vh: la ventana se ajusta a la columna, no
        // al reves. Si fuera al reves volveria a recortarse.
        width: '100vw', minHeight: '100vh',
        padding: MARGEN, boxSizing: 'border-box',
        // Ancla del boton de cerrar, que va posicionado sobre esta caja.
        position: 'relative',
        display: 'flex', flexDirection: 'column', gap: SEPARACION,
        // Los huecos entre tiles mueven la ventana; los tiles no (más abajo).
        WebkitAppRegion: 'drag',
      } as React.CSSProperties}
    >
      {aviso && (
        <div
          onClick={() => setAviso(null)}
          title={aviso}
          style={{
            // Sobre los tiles y sin empujarlos: la ventana mide su contenido y
            // un aviso en el flujo la haria crecer y saltar de sitio.
            position: 'absolute', right: MARGEN, top: MARGEN, maxWidth: 220, zIndex: 10,
            background: VD.surface, border: `1px solid ${VD.danger}`, color: VD.text,
            fontFamily: VD.mono, fontSize: 8, lineHeight: 1.4, padding: '5px 7px',
            borderRadius: VD.radius.sm, cursor: 'pointer',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            WebkitAppRegion: 'no-drag',
          } as React.CSSProperties}
        >{aviso}</div>
      )}
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
                toggled={encendidos.has(btn.id)}
                isRunning={ejecutando.has(btn.id)}
                resolvedLabel={btn.label.includes('{')
                  ? interpolate(btn.label, config.state ?? {}) : undefined}
                soundEnabled={config.soundOnPress ?? false}
                soundProfile={config.soundProfile ?? 'click'}
                showContextMenu={false}
                onEdit={() => { /* la barra no edita: para eso está el deck */ }}
                onExecute={() => ejecutar(btn)}
                onAdjustWheel={(signo) => ejecutar({ ...btn, action: {
                  ...btn.action, adjustDelta: Math.abs(btn.action.adjustDelta ?? 10) * signo,
                } })}
                onLongPress={btn.longPressAction && btn.longPressAction.type !== 'none'
                  ? () => pulsacionLargaBoton(btn) : undefined}
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
