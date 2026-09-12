import React, { useState } from 'react';
import { useTheme } from '../../utils/theme';
import { useT } from '../../utils/i18n';
import { DotGlyphIcon } from '../dot480/DotGlyphIcon';

/**
 * Menu de clic derecho de una celda.
 *
 * Se posiciona en coordenadas de pantalla (`fixed`) y no dentro de la celda:
 * la grilla recorta lo que se sale, y un menu anclado a la celda de la ultima
 * fila quedaria medio cortado.
 */

interface Props {
  x: number;
  y: number;
  isEmpty: boolean;
  onEdit: () => void;
  onDuplicate?: () => void;
  onClear?: () => void;
  onCerrar: () => void;
}

export function MenuContextual({ x, y, isEmpty, onEdit, onDuplicate, onClear, onCerrar }: Props) {
  const VD = useTheme();
  const t = useT();
  return (
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        position: 'fixed', left: x, top: y, zIndex: 9999,
        background: VD.surface, border: `1px solid ${VD.borderStrong}`,
        borderRadius: VD.radius.lg, overflow: 'hidden',
        boxShadow: VD.shadow.menu, minWidth: 150,
      }}
    >
      <Item label={t('cell.editShort')} glyph="EDIT" onClick={() => { onCerrar(); onEdit(); }} />
      {!isEmpty && onDuplicate && (
        <Item label={t('cell.duplicate')} glyph="ADD" onClick={() => { onCerrar(); onDuplicate(); }} />
      )}
      {!isEmpty && onClear && (
        <Item label={t('cell.clear')} glyph="CLOSE" onClick={() => { onCerrar(); onClear(); }} danger />
      )}
    </div>
  );
}

function Item({ label, glyph, onClick, danger }: { label: string; glyph: string; onClick: () => void; danger?: boolean }) {
  const VD = useTheme();
  const [hov, setHov] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '9px 14px',
        background: hov ? VD.elevated : 'transparent',
        cursor: 'pointer',
        fontFamily: VD.mono, fontSize: 11,
        color: danger ? VD.danger : VD.text,
        letterSpacing: 0.5,
        transition: 'background 0.1s',
        borderBottom: `1px solid ${VD.border}`,
      }}
    >
      <DotGlyphIcon
        glyph={glyph}
        size={11}
        color={danger ? VD.danger : VD.textDim}
        showRecessed
      />
      {label}
    </div>
  );
}
