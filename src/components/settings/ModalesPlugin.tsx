import React from 'react';
import { useTheme } from '../../utils/theme';
import { useT } from '../../utils/i18n';
import type { PluginInfo } from '../../types';
import { DotGlyphIcon } from '../dot480/DotGlyphIcon';
import { Modal } from '../ui/Modal';
import { textoSobre } from '../../comun/contraste';

export function ModalAvisoRiesgo({
  datos, accent, onConfirmar, onCerrar,
}: {
  datos: { ruta?: string; nombre?: string }; accent: string;
  onConfirmar: () => void; onCerrar: () => void;
}) {
  const VD = useTheme();
  const t = useT();

  return (
    <Modal onClose={onCerrar} zIndex={300} ancho="min(380px, 92vw)">
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <DotGlyphIcon glyph="WARN" size={16} color={VD.warning} />
          <span style={{ fontFamily: VD.mono, fontSize: 11, fontWeight: 700, color: VD.text }}>
            {t('plugins.installModalTitle')}
          </span>
        </div>

        {datos.nombre && (
          <div style={{
            background: VD.elevated, border: `1px solid ${VD.border}`,
            borderRadius: VD.radius.sm, padding: '6px 8px',
            fontFamily: VD.mono, fontSize: 8, color: VD.text, wordBreak: 'break-all',
          }}>
            {t('plugins.fileToInstall', { name: datos.nombre })}
          </div>
        )}

        <div style={{
          fontFamily: VD.mono, fontSize: 9, color: VD.textDim, lineHeight: 1.5,
          background: VD.elevated, border: `1px solid ${VD.borderStrong}`,
          borderRadius: VD.radius.sm, padding: '8px 10px',
        }}>
          {t('plugins.riskNotice')}
        </div>

        <div style={{ fontFamily: VD.mono, fontSize: 8, color: VD.textMuted, lineHeight: 1.4 }}>
          {t('plugins.marketplaceWarning')}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
          <button
            type="button"
            onClick={onCerrar}
            title={t('plugins.cancel')}
            style={{
              padding: '6px 12px', background: 'transparent', border: `1px solid ${VD.border}`,
              color: VD.textDim, fontFamily: VD.mono, fontSize: 8, cursor: 'pointer',
              borderRadius: VD.radius.sm, letterSpacing: 1,
            }}
          >
            {t('plugins.cancel')}
          </button>
          <button
            type="button"
            onClick={onConfirmar}
            title={datos.ruta ? t('plugins.acceptAndInstall') : t('plugins.acceptAndChoose')}
            style={{
              padding: '6px 12px', background: accent, border: `1px solid ${accent}`,
              color: VD.onAccent, fontFamily: VD.mono, fontSize: 8, fontWeight: 700,
              cursor: 'pointer', borderRadius: VD.radius.sm, letterSpacing: 1,
            }}
          >
            {datos.ruta ? t('plugins.acceptAndInstall') : t('plugins.acceptAndChoose')}
          </button>
        </div>
      </div>
    </Modal>
  );
}

export function ModalConfirmarDesinstalacion({
  plugin, onConfirmar, onCerrar,
}: {
  plugin: PluginInfo; onConfirmar: () => void; onCerrar: () => void;
}) {
  const VD = useTheme();
  const t = useT();

  return (
    <Modal onClose={onCerrar} zIndex={300} ancho="min(360px, 92vw)">
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <DotGlyphIcon glyph="TRASH" size={16} color={VD.danger} />
          <span style={{ fontFamily: VD.mono, fontSize: 11, fontWeight: 700, color: VD.text }}>
            {t('plugins.uninstallModalTitle')}
          </span>
        </div>

        <div style={{ fontFamily: VD.mono, fontSize: 9, color: VD.textDim, lineHeight: 1.5 }}>
          {t('plugins.uninstallConfirm', { name: plugin.nombre })}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
          <button
            type="button"
            onClick={onCerrar}
            title={t('plugins.cancel')}
            style={{
              padding: '6px 12px', background: 'transparent', border: `1px solid ${VD.border}`,
              color: VD.textDim, fontFamily: VD.mono, fontSize: 8, cursor: 'pointer',
              borderRadius: VD.radius.sm, letterSpacing: 1,
            }}
          >
            {t('plugins.cancel')}
          </button>
          <button
            type="button"
            onClick={onConfirmar}
            title={t('plugins.uninstall')}
            style={{
              padding: '6px 12px', background: VD.danger, border: `1px solid ${VD.danger}`,
              color: textoSobre(VD.danger), fontFamily: VD.mono, fontSize: 8, fontWeight: 700,
              cursor: 'pointer', borderRadius: VD.radius.sm, letterSpacing: 1,
            }}
          >
            {t('plugins.uninstall')}
          </button>
        </div>
      </div>
    </Modal>
  );
}
