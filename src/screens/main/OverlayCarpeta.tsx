import React, { useEffect, useState } from 'react';
import { useTheme } from '../../utils/theme';
import { useT } from '../../utils/i18n';
import { playSound } from '../../utils/sound';
import { executeAction } from '../../utils/actions';
import type { ButtonConfig, FolderButton, RGBProfile, SoundProfileId } from '../../types';

/**
 * La ventana emergente de un boton de tipo carpeta: una rejilla pequeña con
 * los botones que lleva dentro.
 *
 * Sus botones **no** son botones del deck: viven dentro de la accion del boton
 * padre y no tienen id propio, por eso no se pueden arrastrar ni editar desde
 * aqui. Se configuran en el editor del boton que los contiene.
 */

export function FolderOverlay({ btn, accent, soundEnabled, soundProfile, state, rgbProfiles, onClose, onActionError, onStateUpdate }: {
  btn: ButtonConfig;
  accent: string;
  soundEnabled: boolean;
  soundProfile: SoundProfileId;
  state?: Record<string, string>;
  rgbProfiles?: RGBProfile[];
  onClose: () => void;
  onActionError: (msg: string) => void;
  onStateUpdate: (update: Record<string, string>) => void;
}) {
  const t = useT();
  const VD = useTheme();
  const api = window.electronAPI;
  const [flash, setFlash] = useState<number | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function runFolderAction(fb: FolderButton, idx: number) {
    if (!api) return;
    setFlash(idx);
    setTimeout(() => setFlash(null), 300);
    if (soundEnabled) playSound(soundProfile);
    // Pass state + RGB profiles so folder actions can interpolate {var} and
    // resolve RGB profile references (same context the parent grid uses).
    const r = await executeAction(fb.action, api, state, rgbProfiles);
    if (r.stateUpdate) onStateUpdate(r.stateUpdate as Record<string, string>);
    if (!r.ok && r.error) onActionError(r.error);
    onClose();
  }

  const buttons: FolderButton[] = btn.action.folderButtons ?? [];

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 60,
        background: 'rgba(0,0,0,0.82)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div onClick={(e) => e.stopPropagation()} style={{
        background: VD.surface, border: `1px solid ${VD.borderStrong}`,
        borderRadius: VD.radius.lg, padding: 20, boxShadow: VD.shadow.modal,
        minWidth: 340,
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          {btn.icon && <span style={{ fontSize: 18, color: btn.fgColor || VD.text }}>{btn.icon}</span>}
          <span style={{ fontFamily: VD.mono, fontSize: 11, letterSpacing: 2, color: VD.text }}>
            {btn.label || 'CARPETA'}
          </span>
          <div style={{ flex: 1 }} />
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: VD.textDim, cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>×</button>
        </div>

        {/* Sub-button grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          {buttons.map((fb, i) => (
            <div
              key={i}
              onClick={() => runFolderAction(fb, i)}
              style={{
                height: 72, borderRadius: VD.radius.lg, cursor: 'pointer',
                background: flash === i ? (fb.bgColor ? fb.bgColor : VD.accentBg) : (fb.bgColor || VD.elevated),
                border: `1px solid ${flash === i ? accent : VD.border}`,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: 5,
                transition: 'background 0.1s, border-color 0.1s',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = accent; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = flash === i ? accent : VD.border; }}
            >
              {fb.icon && <div style={{ fontSize: 18, color: fb.fgColor || VD.text, lineHeight: 1 }}>{fb.icon}</div>}
              <div style={{ fontFamily: VD.mono, fontSize: 8, letterSpacing: 1, color: fb.fgColor || VD.textDim, textAlign: 'center', maxWidth: 72, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textTransform: 'uppercase' }}>
                {fb.label}
              </div>
              {fb.action.hotkey && (
                <div style={{ fontFamily: VD.mono, fontSize: 7, color: VD.textMuted, opacity: 0.7 }}>{fb.action.hotkey}</div>
              )}
            </div>
          ))}
          {buttons.length === 0 && (
            <div style={{ gridColumn: '1 / -1', padding: 20, textAlign: 'center', fontFamily: VD.mono, fontSize: 10, color: VD.textMuted }}>
              {t('folder.empty')}
            </div>
          )}
        </div>

        <div style={{ marginTop: 12, fontFamily: VD.mono, fontSize: 8, color: VD.textMuted, textAlign: 'center' }}>
          {t('folder.esc')}
        </div>
      </div>
    </div>
  );
}

// ── Helper components ─────────────────────────────────────────────────────
export function PageCtxItem({ label, onClick, danger }: { label: string; onClick: () => void; danger?: boolean }) {
  const VD = useTheme();
  const [hov, setHov] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        padding: '9px 14px', background: hov ? VD.elevated : 'transparent',
        cursor: 'pointer', fontFamily: VD.mono, fontSize: 11,
        color: danger ? VD.danger : VD.text, letterSpacing: 0.5,
        transition: 'background 0.1s', borderBottom: `1px solid ${VD.border}`,
      }}
    >
      {label}
    </div>
  );
}
