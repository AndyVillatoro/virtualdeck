import React, { useState, useEffect } from 'react';
import { useTheme } from '../../utils/theme';
import { useT } from '../../utils/i18n';
import { DotGlyphIcon } from '../../components/dot480/DotGlyphIcon';

interface PieEditorBProps {
  step: number;
  totalSteps: number;
  is2x2Mode: boolean;
  accent: string;
  isConfigured: boolean;
  buttonId: string;
  onBack: () => void;
  onNext: () => void;
  onSave: () => void;
  onClose: () => void;
  onClear?: (id: string) => void;
}

export function PieEditorB({
  step,
  totalSteps,
  is2x2Mode,
  accent,
  isConfigured,
  buttonId,
  onBack,
  onNext,
  onSave,
  onClose,
  onClear,
}: PieEditorBProps) {
  const VD = useTheme();
  const t = useT();
  const [confirmClear, setConfirmClear] = useState(false);

  // Si confirmClear está activo, Escape cancela la confirmación antes de cerrar el modal
  useEffect(() => {
    if (!confirmClear) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        e.preventDefault();
        setConfirmClear(false);
      }
    };
    window.addEventListener('keydown', onKey, { capture: true });
    return () => window.removeEventListener('keydown', onKey, { capture: true });
  }, [confirmClear]);

  return (
    <div
      style={{
        height: 54,
        borderTop: `1px solid ${VD.border}`,
        display: 'flex',
        alignItems: 'center',
        padding: '0 20px',
        gap: 10,
        flexShrink: 0,
      }}
    >
      <button
        onClick={onBack}
        disabled={is2x2Mode || step === 0}
        style={{
          padding: '8px 14px',
          border: `1px solid ${VD.border}`,
          background: 'transparent',
          fontFamily: VD.mono,
          fontSize: 10,
          letterSpacing: 2,
          color: is2x2Mode || step === 0 ? VD.textMuted : VD.textDim,
          cursor: is2x2Mode || step === 0 ? 'default' : 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <DotGlyphIcon glyph="ARROW_LEFT" size={8} color={is2x2Mode || step === 0 ? VD.textMuted : VD.textDim} />
        <span>{t('ed.back')}</span>
      </button>

      {onClear && isConfigured && (
        confirmClear ? (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              marginLeft: 6,
              padding: '3px 8px',
              background: `${VD.danger}14`,
              border: `1px solid ${VD.danger}66`,
              borderRadius: VD.radius.sm,
            }}
          >
            <span style={{ fontFamily: VD.mono, fontSize: 9, color: VD.danger, letterSpacing: 1, fontWeight: 600 }}>
              {t('ed.clearConfirm')}
            </span>
            <button
              onClick={() => {
                onClear(buttonId);
                onClose();
              }}
              title={t('ed.confirmClear')}
              style={{
                padding: '5px 10px',
                background: VD.danger,
                border: 'none',
                fontFamily: VD.mono,
                fontSize: 9,
                letterSpacing: 1,
                color: '#fff',
                cursor: 'pointer',
                borderRadius: VD.radius.sm,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <DotGlyphIcon glyph="CHECK" size={8} color="#fff" />
              <span>{t('ed.confirmClear')}</span>
            </button>
            <button
              onClick={() => setConfirmClear(false)}
              title={t('ed.cancel')}
              style={{
                padding: '5px 8px',
                background: 'transparent',
                border: `1px solid ${VD.border}`,
                fontFamily: VD.mono,
                fontSize: 9,
                color: VD.textDim,
                cursor: 'pointer',
                borderRadius: VD.radius.sm,
                display: 'inline-flex',
                alignItems: 'center',
              }}
            >
              <DotGlyphIcon glyph="CLOSE" size={8} color={VD.textDim} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmClear(true)}
            title={t('ed.clear')}
            style={{
              padding: '8px 12px',
              border: `1px solid ${VD.danger}44`,
              background: 'transparent',
              fontFamily: VD.mono,
              fontSize: 10,
              letterSpacing: 1,
              color: VD.danger,
              cursor: 'pointer',
              borderRadius: VD.radius.sm,
              marginLeft: 6,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              transition: 'border-color 0.15s ease, background 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = VD.danger;
              e.currentTarget.style.background = `${VD.danger}12`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = `${VD.danger}44`;
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <DotGlyphIcon glyph="TRASH" size={8} color={VD.danger} />
            <span>{t('ed.clear')}</span>
          </button>
        )
      )}

      <div style={{ flex: 1 }} />
      {!is2x2Mode && (
        <span style={{ fontFamily: VD.mono, fontSize: 10, color: VD.textMuted, letterSpacing: 1 }}>
          {t('ed.stepN', { n: step + 1, total: totalSteps })}
        </span>
      )}
      <button
        onClick={onClose}
        style={{
          padding: '8px 14px',
          border: `1px solid ${VD.border}`,
          background: 'transparent',
          fontFamily: VD.mono,
          fontSize: 10,
          letterSpacing: 2,
          color: VD.textDim,
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <DotGlyphIcon glyph="CLOSE" size={8} color={VD.textDim} />
        <span>{t('ed.cancel')}</span>
      </button>
      <button
        onClick={() => {
          if (!is2x2Mode && step < totalSteps - 1) onNext();
          else onSave();
        }}
        style={{
          padding: '8px 20px',
          background: accent,
          border: 'none',
          fontFamily: VD.mono,
          fontSize: 10,
          letterSpacing: 2,
          color: '#fff',
          cursor: 'pointer',
          borderRadius: VD.radius.sm,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <span>{is2x2Mode || step >= totalSteps - 1 ? t('ed.save') : t('ed.next')}</span>
        <DotGlyphIcon glyph={!is2x2Mode && step < totalSteps - 1 ? 'ARROW_RIGHT' : 'CHECK'} size={8} color="#fff" />
      </button>
    </div>
  );
}
