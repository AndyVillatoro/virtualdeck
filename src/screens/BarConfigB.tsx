import React, { useCallback, useEffect, useState } from 'react';
import { ButtonCell } from '../components/ButtonCell';
import { DotLabel } from '../components/DotLabel';
import { DotGlyphIcon } from '../components/dot480/DotGlyphIcon';
import { BotonIcono } from '../components/ui/BotonIcono';
import { Segmentado } from '../components/ui/Chip';
import { useTheme } from '../utils/theme';
import { useT } from '../utils/i18n';
import type { DeckConfig, FloatingBarSettings } from '../types';
import { BARRA_POR_DEFECTO } from '../types';

/**
 * Pantalla para armar la barra flotante: cuántos huecos tiene y qué botón va en
 * cada uno. Los botones se arrastran desde la grilla de la derecha.
 *
 * La barra guarda **ids**, no copias: editar el botón en el deck cambia también
 * lo que se ve en la barra, que es lo que espera cualquiera que lo intente.
 */

interface BarConfigBProps {
  config: DeckConfig;
  onConfigChange: (next: DeckConfig) => void;
  onBack: () => void;
}

const MIN_HUECOS = 1;
/** Tope duro. El de verdad lo pone la pantalla y se pregunta al proceso principal. */
const MAX_HUECOS = 24;

export function BarConfigB({ config, onConfigChange, onBack }: BarConfigBProps) {
  const VD = useTheme();
  const t = useT();
  const api = window.electronAPI;
  const barra: FloatingBarSettings = config.floatingBar ?? BARRA_POR_DEFECTO;
  const [arrastrando, setArrastrando] = useState<string | null>(null);
  // Cuantos caben de alto en el monitor principal. Lo calcula el proceso
  // principal: el deck puede estar en otro monitor, asi que `window.screen`
  // daria el numero equivocado.
  const [maximo, setMaximo] = useState(MAX_HUECOS);

  useEffect(() => {
    if (!api) return;
    api.bar.maxSlots(barra.tileSize ?? BARRA_POR_DEFECTO.tileSize)
      .then((n) => setMaximo(Math.max(MIN_HUECOS, Math.min(MAX_HUECOS, n))))
      .catch(() => {});
  }, [api, barra.tileSize]);

  const guardar = useCallback((next: Partial<FloatingBarSettings>) => {
    onConfigChange({ ...config, floatingBar: { ...barra, ...next } });
  }, [config, barra, onConfigChange]);

  // La ventana de la barra sigue a la configuración: abrir/cerrar y regeometrar
  // en cuanto cambia, para que se vea el efecto sin tener que salir y volver.
  useEffect(() => {
    if (!api) return;
    const g = {
      huecos: barra.slots.length,
      lado: barra.side ?? BARRA_POR_DEFECTO.side,
      tile: barra.tileSize ?? BARRA_POR_DEFECTO.tileSize,
      y: barra.y ?? null,
    };
    if (barra.enabled) api.bar.open(g).catch(() => {});
    else api.bar.close().catch(() => {});
  }, [api, barra.enabled, barra.slots.length, barra.side, barra.tileSize, barra.y]);

  const cambiarHuecos = (n: number) => {
    const total = Math.max(MIN_HUECOS, Math.min(maximo, n));
    const slots = barra.slots.slice(0, total);
    while (slots.length < total) slots.push(null);
    guardar({ slots });
  };

  const soltarEn = (i: number, botonId: string) => {
    if (!botonId) return;
    const slots = [...barra.slots];
    // Un mismo botón dos veces en la columna solo confunde: si ya estaba en
    // otro hueco, se mueve en vez de duplicarse.
    const anterior = slots.indexOf(botonId);
    if (anterior >= 0) slots[anterior] = null;
    slots[i] = botonId;
    guardar({ slots });
  };

  const vaciar = (i: number) => {
    const slots = [...barra.slots];
    slots[i] = null;
    guardar({ slots });
  };

  const porId = new Map(config.buttons.map((b) => [b.id, b]));
  const configurados = config.buttons.filter(
    (b) => b.action.type !== 'none' || b.label || b.icon || b.imageData || b.brandIcon || b.widget === 'slider' || !!b.sliderWidget || (b.subButtons && b.subButtons.length === 4),
  );

  return (
    <div style={{ width: '100vw', height: '100vh', background: VD.bg, display: 'flex', flexDirection: 'column' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 18px', borderBottom: `1px solid ${VD.border}`,
        WebkitAppRegion: 'drag',
      } as React.CSSProperties}>
        <button onClick={onBack} style={{
          background: 'none', border: `1px solid ${VD.border}`, borderRadius: VD.radius.sm,
          color: VD.textDim, fontFamily: VD.mono, fontSize: 9, letterSpacing: 1,
          padding: '5px 10px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6,
          WebkitAppRegion: 'no-drag',
        } as React.CSSProperties}><DotGlyphIcon glyph="ARROW_LEFT" size={8} color={VD.textDim} /> {t('bar.back')}</button>
        <div style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          <DotLabel size={11} color={VD.text} spacing={2}>{t('bar.title')}</DotLabel>
        </div>
        <div style={{ flex: 1 }} />
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          <input
            type="checkbox"
            checked={barra.enabled}
            onChange={(e) => guardar({ enabled: e.target.checked })}
            style={{ accentColor: config.accent ?? VD.accent }}
          />
          <span style={{ fontFamily: VD.mono, fontSize: 9, letterSpacing: 1, color: VD.textDim }}>
            {t('bar.enabled')}
          </span>
        </label>
      </div>

      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        {/* Columna: los huecos, en el mismo orden que se verán en pantalla */}
        <div style={{
          width: 200, borderRight: `1px solid ${VD.border}`, background: VD.surface,
          padding: 14, overflowY: 'auto',
        }}>
          <DotLabel size={9} color={VD.textMuted} spacing={2} style={{ display: 'block', marginBottom: 4 }}>
            {t('bar.column')}
          </DotLabel>
          <div style={{ fontFamily: VD.mono, fontSize: 8, color: VD.textMuted, lineHeight: 1.5, marginBottom: 10 }}>
            {t('bar.dragHint')}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
            {barra.slots.map((id, i) => {
              const btn = id ? porId.get(id) : undefined;
              return (
                <div
                  key={i}
                  onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
                  onDrop={(e) => { e.preventDefault(); soltarEn(i, e.dataTransfer.getData('text/plain')); }}
                  style={{
                    width: 64, height: 64, position: 'relative', flexShrink: 0,
                    border: btn ? 'none' : `1px dashed ${arrastrando ? (config.accent ?? VD.accent) : VD.border}`,
                    borderRadius: VD.radius.lg,
                  }}
                >
                  {btn ? (
                    <>
                      <ButtonCell
                        button={btn}
                        accent={config.accent ?? VD.accent}
                        showContextMenu={false}
                        onEdit={() => { /* se edita en el deck */ }}
                        onExecute={() => { /* aquí solo se coloca */ }}
                      />
                      <BotonIcono
                        glifo="CLOSE"
                        title={t('bar.remove')}
                        onClick={() => vaciar(i)}
                        tamano={24}
                        tamanoGlifo={8}
                        peligro
                        conMarco
                        style={{ position: 'absolute', top: -8, right: -8, borderRadius: '50%' }}
                      />
                    </>
                  ) : (
                    <div style={{
                      width: '100%', height: '100%', display: 'flex',
                      alignItems: 'center', justifyContent: 'center',
                      fontFamily: VD.mono, fontSize: 9, color: VD.textMuted,
                    }}>{i + 1}</div>
                  )}
                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', gap: 6, justifyContent: 'center', alignItems: 'center', marginTop: 12 }}>
            <BotonIcono
              glifo="SUBTRACT"
              title={t('bar.menosHuecos')}
              onClick={() => cambiarHuecos(barra.slots.length - 1)}
              disabled={barra.slots.length <= MIN_HUECOS}
              tamano={26}
              tamanoGlifo={9}
              conMarco
            />
            <span style={{ fontFamily: VD.mono, fontSize: 10, color: VD.text, minWidth: 24, textAlign: 'center' }}>
              {barra.slots.length}
            </span>
            <BotonIcono
              glifo="ADD"
              title={t('bar.masHuecos')}
              onClick={() => cambiarHuecos(barra.slots.length + 1)}
              disabled={barra.slots.length >= maximo}
              tamano={26}
              tamanoGlifo={9}
              conMarco
            />
          </div>
          <div style={{ fontFamily: VD.mono, fontSize: 8, color: VD.textMuted, textAlign: 'center', marginTop: 6 }}>
            {t('bar.max', { n: maximo })}
          </div>
        </div>

        {/* Ajustes + botones disponibles */}
        <div style={{ flex: 1, padding: 16, overflowY: 'auto' }}>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginBottom: 18 }}>
            <div>
              <DotLabel size={9} color={VD.textMuted} spacing={2} style={{ display: 'block', marginBottom: 6 }}>
                {t('bar.side')}
              </DotLabel>
              <Segmentado
                accent={config.accent ?? VD.accent}
                valor={barra.side ?? BARRA_POR_DEFECTO.side}
                onChange={(lado) => guardar({ side: lado })}
                opciones={[
                  { valor: 'left', etiqueta: t('bar.side.left') },
                  { valor: 'right', etiqueta: t('bar.side.right') },
                ]}
              />
            </div>

            <div>
              <DotLabel size={9} color={VD.textMuted} spacing={2} style={{ display: 'block', marginBottom: 6 }}>
                {t('bar.opacity', { n: Math.round((barra.opacity ?? BARRA_POR_DEFECTO.opacity) * 100) })}
              </DotLabel>
              <input type="range" min={30} max={100} value={Math.round((barra.opacity ?? BARRA_POR_DEFECTO.opacity) * 100)}
                onChange={(e) => guardar({ opacity: parseInt(e.target.value, 10) / 100 })}
                style={{ width: 160, accentColor: config.accent ?? VD.accent }} />
            </div>

            <div>
              <DotLabel size={9} color={VD.textMuted} spacing={2} style={{ display: 'block', marginBottom: 6 }}>
                {t('bar.tileSize', { n: barra.tileSize ?? BARRA_POR_DEFECTO.tileSize })}
              </DotLabel>
              <input type="range" min={40} max={120} step={4} value={barra.tileSize ?? BARRA_POR_DEFECTO.tileSize}
                onChange={(e) => guardar({ tileSize: parseInt(e.target.value, 10) })}
                style={{ width: 160, accentColor: config.accent ?? VD.accent }} />
            </div>

            <div>
              <DotLabel size={9} color={VD.textMuted} spacing={2} style={{ display: 'block', marginBottom: 6 }}>
                {t('bar.position')}
              </DotLabel>
              <button onClick={() => guardar({ y: null })} style={estiloMini(VD)}>{t('bar.center')}</button>
            </div>
          </div>

          <DotLabel size={9} color={VD.textMuted} spacing={2} style={{ display: 'block', marginBottom: 8 }}>
            {t('bar.available')}
          </DotLabel>
          {configurados.length === 0 ? (
            <div style={{ fontFamily: VD.mono, fontSize: 10, color: VD.textMuted }}>{t('bar.noButtons')}</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, 64px)', gap: 8 }}>
              {configurados.map((btn) => (
                <div
                  key={btn.id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.effectAllowed = 'move';
                    e.dataTransfer.setData('text/plain', btn.id);
                    setArrastrando(btn.id);
                  }}
                  onDragEnd={() => setArrastrando(null)}
                  style={{ width: 64, height: 64, cursor: 'grab', opacity: barra.slots.includes(btn.id) ? 0.35 : 1 }}
                  title={btn.label || btn.action.type}
                >
                  <ButtonCell
                    button={btn}
                    accent={config.accent ?? VD.accent}
                    showContextMenu={false}
                    onEdit={() => { /* se edita en el deck */ }}
                    onExecute={() => { /* aquí solo se arrastra */ }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function estiloMini(VD: ReturnType<typeof useTheme>): React.CSSProperties {
  return {
    padding: '5px 10px', background: VD.elevated, border: `1px solid ${VD.border}`,
    color: VD.textDim, fontFamily: VD.mono, fontSize: 9, letterSpacing: 1,
    borderRadius: VD.radius.sm, cursor: 'pointer',
  };
}
