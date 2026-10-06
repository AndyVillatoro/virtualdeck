import React, { useState } from 'react';
import { useTheme } from '../../utils/theme';
import { useT } from '../../utils/i18n';
import { DotGlyphIcon } from '../../components/dot480/DotGlyphIcon';
import { normalizarApp } from '../../utils/apps';
import { SelectorApp } from '../../components/SelectorApp';
import type { PageConfig } from '../../types';

interface ModalVincularAppProps {
  page: PageConfig;
  accent: string;
  runningProcesses?: Set<string>;
  onSave: (targetApp: string, iconoApp?: string) => void;
  onClose: () => void;
  onCrearDesdePlantilla?: (plantillaId: string, app: string) => void;
}

export function ModalVincularApp({
  page,
  accent,
  runningProcesses: _runningProcesses,
  onSave,
  onClose,
  onCrearDesdePlantilla,
}: ModalVincularAppProps) {
  const VD = useTheme();
  const t = useT();
  const [customBindingApp, setCustomBindingApp] = useState(page.targetApp ?? '');

  const saveBinding = async (app: string) => {
    const cleaned = normalizarApp(app);
    if (!cleaned) {
      onSave('', undefined);
      return;
    }
    let icono: string | null = null;
    if (window.electronAPI?.launch?.iconoApp) {
      try {
        icono = await window.electronAPI.launch.iconoApp(cleaned);
      } catch {
        icono = null;
      }
    }
    const iconoFinal = icono ?? (cleaned === page.targetApp ? page.iconoApp : undefined);
    onSave(cleaned, iconoFinal);
  };

  const handleCrearDesdePlantilla = onCrearDesdePlantilla
    ? (plantillaId: string, app: string) => {
        onCrearDesdePlantilla(plantillaId, app);
        onClose();
      }
    : undefined;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 10000,
        background: 'rgba(7, 8, 9, 0.85)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 440,
          background: VD.surface, border: `1px solid ${VD.borderStrong}`,
          borderRadius: VD.radius.lg,
          padding: 20, display: 'flex', flexDirection: 'column', gap: 14,
          boxShadow: VD.shadow.menu,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <DotGlyphIcon glyph="APP_WINDOW" size={12} color={accent} />
            <span style={{ fontFamily: VD.mono, fontSize: 11, letterSpacing: 1, color: VD.text, fontWeight: 600 }}>
              {t('page.bindTitle')}
            </span>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: VD.textDim, cursor: 'pointer', padding: 2 }}
          >
            <DotGlyphIcon glyph="CLOSE" size={10} color={VD.textDim} />
          </button>
        </div>

        <div style={{ fontFamily: VD.mono, fontSize: 9, color: VD.textMuted, lineHeight: 1.5 }}>
          {t('page.bindDesc')}
        </div>

        {/* Selector de aplicación */}
        <SelectorApp
          valor={customBindingApp}
          onElegir={setCustomBindingApp}
          onCrearDesdePlantilla={handleCrearDesdePlantilla}
          onEnter={() => void saveBinding(customBindingApp)}
          autoFocus
        />

        {/* Botones de acción */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
          <div>
            {page.targetApp && (
              <button
                type="button"
                onClick={() => void saveBinding('')}
                style={{
                  padding: '7px 12px',
                  background: 'transparent',
                  border: `1px solid ${VD.danger}66`,
                  color: VD.danger,
                  fontFamily: VD.mono,
                  fontSize: 9,
                  cursor: 'pointer',
                  borderRadius: VD.radius.sm,
                  letterSpacing: 1,
                  textTransform: 'uppercase',
                }}
              >
                {t('page.unbindApp')}
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '7px 14px',
                background: 'transparent',
                border: `1px solid ${VD.border}`,
                color: VD.textDim,
                fontFamily: VD.mono,
                fontSize: 9,
                letterSpacing: 1,
                textTransform: 'uppercase',
                cursor: 'pointer',
                borderRadius: VD.radius.sm,
              }}
            >
              {t('ui.cancel')}
            </button>
            <button
              type="button"
              onClick={() => void saveBinding(customBindingApp)}
              style={{
                padding: '7px 18px',
                background: VD.accentBg,
                border: `1px solid ${accent}`,
                color: accent,
                fontFamily: VD.mono,
                fontSize: 9,
                letterSpacing: 1,
                textTransform: 'uppercase',
                cursor: 'pointer',
                borderRadius: VD.radius.sm,
                fontWeight: 600,
              }}
            >
              {t('ui.saveShort')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
