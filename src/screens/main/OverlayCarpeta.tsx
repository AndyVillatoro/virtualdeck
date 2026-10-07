import React, { useEffect, useState } from 'react';
import { useTheme } from '../../utils/theme';
import { useT } from '../../utils/i18n';
import { playSound } from '../../utils/sound';
import { ejecutarUna, type EntornoPulsacion } from '../../utils/pulsarBoton';
import { DotGlyphIcon, resolveDotGlyph } from '../../components/dot480/DotGlyphIcon';
import { Modal } from '../../components/ui/Modal';
import { BotonIcono } from '../../components/ui/BotonIcono';
import type { ButtonConfig, FolderButton, SoundProfileId } from '../../types';

/**
 * La ventana emergente de un boton de tipo carpeta: una rejilla pequeña con
 * los botones que lleva dentro.
 *
 * Sus botones **no** son botones del deck: viven dentro de la accion del boton
 * padre y no tienen id propio, por eso no se pueden arrastrar ni editar desde
 * aqui. Se configuran en el editor del boton que los contiene.
 */

export function FolderOverlay({ btn, accent, soundEnabled, soundProfile, entorno, onClose }: {
  btn: ButtonConfig;
  accent: string;
  soundEnabled: boolean;
  soundProfile: SoundProfileId;
  /** El mismo contexto que usa una celda del deck. Ver `pulsarBoton`. */
  entorno: () => EntornoPulsacion;
  onClose: () => void;
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
    // El mismo camino que una celda del deck: con el gancho de scripts, el
    // tope para una accion colgada y el aviso de error incluidos.
    await ejecutarUna(fb.action, entorno());
    onClose();
  }

  const buttons: FolderButton[] = btn.action.folderButtons ?? [];

  return (
    <Modal onClose={onClose} etiqueta={btn.label || t('folder.titulo')} zIndex={60} ancho="min(440px, 94vw)" style={{ padding: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexShrink: 0, minWidth: 0 }}>
        <DotGlyphIcon glyph={(btn.icon && resolveDotGlyph(btn.icon)) || 'FOLDER'} size={16} color={btn.fgColor || VD.text} showRecessed />
        <span style={{ fontFamily: VD.mono, fontSize: VD.tipo.md, letterSpacing: 2, color: VD.text, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {btn.label || t('folder.titulo')}
        </span>
        <div style={{ flex: 1 }} />
        <BotonIcono glifo="CLOSE" title={t('comun.cerrar')} onClick={onClose} tamano={32} tamanoGlifo={12} />
      </div>

      {/* Sub-button grid: con tope de alto y su propio scroll, para carpetas grandes */}
      <div
        className="vd-scroll"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(88px, 1fr))', gap: 8, overflowY: 'auto', minHeight: 0 }}
      >
        {buttons.map((fb, i) => (
          <button
            type="button"
            key={i}
            onClick={() => runFolderAction(fb, i)}
            title={fb.label || undefined}
            style={{
              height: 72, minWidth: 0, borderRadius: VD.radius.lg, cursor: 'pointer', padding: 4,
              background: flash === i ? (fb.bgColor ? fb.bgColor : VD.accentBg) : (fb.bgColor || VD.elevated),
              border: `1px solid ${flash === i ? accent : VD.border}`,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 4,
              transition: 'background 0.1s, border-color 0.1s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = accent; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = flash === i ? accent : VD.border; }}
          >
            {fb.icon && (
              <DotGlyphIcon glyph={resolveDotGlyph(fb.icon) ?? 'DOTS'} size={16} color={fb.fgColor || VD.text} showRecessed />
            )}
            <div style={{ fontFamily: VD.mono, fontSize: VD.tipo.xs, letterSpacing: 1, color: fb.fgColor || VD.textDim, textAlign: 'center', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textTransform: 'uppercase' }}>
              {fb.label}
            </div>
            {fb.action.hotkey && (
              <div style={{ fontFamily: VD.mono, fontSize: VD.tipo.xs, color: VD.textMuted, opacity: 0.7 }}>{fb.action.hotkey}</div>
            )}
          </button>
        ))}
        {buttons.length === 0 && (
          <div style={{ gridColumn: '1 / -1', padding: 20, textAlign: 'center', fontFamily: VD.mono, fontSize: VD.tipo.sm, color: VD.textMuted }}>
            {t('folder.empty')}
          </div>
        )}
      </div>

      <div style={{ marginTop: 12, fontFamily: VD.mono, fontSize: VD.tipo.xs, color: VD.textMuted, textAlign: 'center', flexShrink: 0 }}>
        {t('folder.esc')}
      </div>
    </Modal>
  );
}

// ── Helper components ─────────────────────────────────────────────────────
export function PageCtxItem({ label, onClick, danger, glyph }: { label: string; onClick: () => void; danger?: boolean; glyph?: string }) {
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
        display: 'flex', alignItems: 'center', gap: 8,
      }}
    >
      {glyph && <DotGlyphIcon glyph={glyph} size={10} color={danger ? VD.danger : VD.textDim} showRecessed />}
      <span>{label}</span>
    </div>
  );
}
