import React, { useMemo, useState } from 'react';
import { useTheme } from '../../utils/theme';
import { useT } from '../../utils/i18n';
import { DotGlyphIcon } from '../../components/dot480/DotGlyphIcon';
import type { PageConfig } from '../../types';

interface ModalVincularAppProps {
  page: PageConfig;
  accent: string;
  runningProcesses: Set<string>;
  onSave: (targetApp: string) => void;
  onClose: () => void;
}

export function ModalVincularApp({
  page,
  accent,
  runningProcesses,
  onSave,
  onClose,
}: ModalVincularAppProps) {
  const VD = useTheme();
  const t = useT();
  const [customBindingApp, setCustomBindingApp] = useState(page.targetApp ?? '');

  const runningList = useMemo(() => {
    return Array.from(runningProcesses)
      .filter((proc) => proc !== 'virtualdeck' && proc !== 'electron')
      .sort();
  }, [runningProcesses]);

  const saveBinding = (app: string) => {
    const cleaned = app.trim().replace(/\.exe$/i, '').toLowerCase();
    onSave(cleaned);
  };

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

        {/* Input manual */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ fontFamily: VD.mono, fontSize: 8, color: VD.textDim, letterSpacing: 1 }}>
            {t('page.targetApp')}
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              autoFocus
              value={customBindingApp}
              onChange={(e) => setCustomBindingApp(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveBinding(customBindingApp);
                if (e.key === 'Escape') onClose();
              }}
              placeholder={t('page.customAppPlaceholder')}
              style={{
                flex: 1,
                background: VD.elevated,
                border: `1px solid ${VD.border}`,
                borderRadius: VD.radius.sm,
                padding: '7px 10px',
                color: VD.text,
                fontFamily: VD.mono,
                fontSize: 10,
                outline: 'none',
              }}
            />
            {page.targetApp && (
              <button
                onClick={() => saveBinding('')}
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
                }}
              >
                {t('page.unbindApp')}
              </button>
            )}
          </div>
        </div>

        {/* Apps en ejecución */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ fontFamily: VD.mono, fontSize: 8, color: VD.textDim, letterSpacing: 1 }}>
            {t('page.runningApps')} ({runningList.length})
          </span>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 6,
              maxHeight: 140,
              overflowY: 'auto',
              padding: 8,
              background: VD.elevated,
              borderRadius: VD.radius.sm,
              border: `1px solid ${VD.border}`,
            }}
          >
            {runningList.length === 0 ? (
              <span style={{ fontFamily: VD.mono, fontSize: 8, color: VD.textMuted }}>-</span>
            ) : (
              runningList.map((proc) => {
                const isSelected = customBindingApp.toLowerCase().trim() === proc.toLowerCase();
                return (
                  <button
                    key={proc}
                    onClick={() => {
                      setCustomBindingApp(proc);
                    }}
                    style={{
                      padding: '3px 7px',
                      background: isSelected ? `${accent}24` : VD.surface,
                      border: `1px solid ${isSelected ? accent : VD.border}`,
                      borderRadius: VD.radius.sm,
                      color: isSelected ? accent : VD.textDim,
                      fontFamily: VD.mono,
                      fontSize: 8,
                      cursor: 'pointer',
                      letterSpacing: 0.5,
                      textTransform: 'lowercase',
                    }}
                  >
                    {proc}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Botones de acción */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 6 }}>
          <button
            onClick={onClose}
            style={{
              padding: '7px 14px',
              background: 'transparent',
              border: `1px solid ${VD.border}`,
              color: VD.textDim,
              fontFamily: VD.mono,
              fontSize: 9,
              letterSpacing: 1,
              cursor: 'pointer',
              borderRadius: VD.radius.sm,
            }}
          >
            {t('ui.cancel')}
          </button>
          <button
            onClick={() => saveBinding(customBindingApp)}
            style={{
              padding: '7px 18px',
              background: accent,
              border: 'none',
              color: '#fff',
              fontFamily: VD.mono,
              fontSize: 9,
              letterSpacing: 1,
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
  );
}

