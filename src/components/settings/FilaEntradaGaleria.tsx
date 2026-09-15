import React from 'react';
import { useTheme } from '../../utils/theme';
import { useT } from '../../utils/i18n';
import type { EntradaGaleria } from '../../types';

/**
 * Una fila de la lista de la galería: nombre, versión, tipo, app y requisitos.
 * `marca` es la insignia de la tienda (instalado / update); la galería
 * empotrada no la usa y no cambia nada para ella.
 */
export function FilaEntradaGaleria({ entrada, marca, onMirar }: {
  entrada: EntradaGaleria;
  marca?: { texto: string; color: string } | null;
  onMirar: (e: EntradaGaleria) => void;
}) {
  const VD = useTheme();
  const t = useT();
  const menudo: React.CSSProperties = { fontFamily: VD.mono, fontSize: 8, color: VD.textMuted, lineHeight: 1.6 };
  const insignia: React.CSSProperties = { ...menudo, border: `1px solid ${VD.border}`, borderRadius: VD.radius.sm, padding: '0 5px' };
  return (
    <div
      onClick={() => onMirar(entrada)}
      style={{
        background: VD.elevated, border: `1px solid ${VD.border}`, borderRadius: VD.radius.md,
        padding: '6px 9px', cursor: 'pointer',
      }}
    >
      <div style={{ fontFamily: VD.mono, fontSize: 9, color: VD.text }}>
        {entrada.label}{entrada.author ? ` · ${entrada.author}` : ''}
        {entrada.version ? <span style={{ color: VD.textMuted }}> · v{entrada.version}</span> : null}
        {marca ? <span style={{ ...insignia, color: marca.color, borderColor: marca.color, marginLeft: 6 }}>{marca.texto}</span> : null}
      </div>
      <div style={{ display: 'flex', gap: 4, marginTop: 3, flexWrap: 'wrap' }}>
        <span style={insignia}>
          {t(entrada.kind === 'page' ? 'gal.kind.page' : 'gal.kind.profile')}
        </span>
        {entrada.targetApp ? <span style={insignia}>{entrada.targetApp}</span> : null}
      </div>
      {entrada.description && <div style={{ ...menudo, marginTop: 3 }}>{entrada.description}</div>}
      {entrada.requires && entrada.requires.length > 0 && (
        <div style={menudo}>{t('gal.requires')}{entrada.requires.join(' · ')}</div>
      )}
    </div>
  );
}
