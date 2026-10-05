import React, { useState, useEffect } from 'react';
import { useTheme } from '../../utils/theme';
import { useT } from '../../utils/i18n';
import { DotGlyphIcon } from '../../components/dot480/DotGlyphIcon';

interface PieEditorBProps {
  accent: string;
  isConfigured: boolean;
  buttonId: string;
  onSave: () => void;
  onClose: () => void;
  onClear?: (id: string) => void;
  step?: number;
  totalSteps?: number;
  is2x2Mode?: boolean;
  onBack?: () => void;
  onNext?: () => void;
}

export function PieEditorB({
  accent,
  isConfigured,
  buttonId,
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
        height: 52,
        borderTop: `1px solid ${VD.border}`,
        display: 'flex',
        alignItems: 'center',
        padding: '0 20px',
        gap: 10,
        flexShrink: 0,
      }}
    >
      {/* Botón vaciar / confirmar vaciar */}
      {onClear && isConfigured && (
        confirmClear ? (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
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
              type="button"
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
                color: VD.bg,
                cursor: 'pointer',
                borderRadius: VD.radius.sm,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <DotGlyphIcon glyph="CHECK" size={8} color={VD.bg} />
              <span>{t('ed.confirmClear')}</span>
            </button>
            <button
              type="button"
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
            type="button"
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

      {/* Botón Cancelar */}
      <button
        type="button"
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
          borderRadius: VD.radius.sm,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <DotGlyphIcon glyph="CLOSE" size={8} color={VD.textDim} />
        <span>{t('ed.cancel')}</span>
      </button>

      {/* Botón Guardar */}
      <button
        type="button"
        onClick={onSave}
        style={{
          padding: '8px 20px',
          background: accent,
          border: 'none',
          fontFamily: VD.mono,
          fontSize: 10,
          letterSpacing: 2,
          color: VD.bg,
          cursor: 'pointer',
          borderRadius: VD.radius.sm,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          fontWeight: 600,
        }}
      >
        <span>{t('ed.save')}</span>
        <DotGlyphIcon glyph="CHECK" size={8} color={VD.bg} />
      </button>
    </div>
  );
}
