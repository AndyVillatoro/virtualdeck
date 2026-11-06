import React, { useState } from 'react';
import { useTheme } from '../../utils/theme';
import { useT } from '../../utils/i18n';
import { decodificarArrastrePlugin, type CargaArrastrePlugin } from '../../utils/plugins/arrastrePlugin';
import type { ButtonConfig } from '../../types';

interface BotonFisicoHardwareProps {
  indice: number; // 0..2 (botones físicos 1..3 del N3)
  boton?: ButtonConfig;
  seleccionado: boolean;
  disabled?: boolean;
  onSelect: () => void;
  onEditar: () => void;
  onDropPlugin?: (carga: CargaArrastrePlugin) => void;
}

export function BotonFisicoHardware({
  indice,
  boton,
  seleccionado,
  disabled = false,
  onSelect,
  onEditar,
  onDropPlugin,
}: BotonFisicoHardwareProps) {
  const VD = useTheme();
  const t = useT();
  const [dragOver, setDragOver] = useState(false);

  const etiqueta = boton?.label || t('disp.boton', { n: indice + 1 });
  const isResaltado = seleccionado || dragOver;

  return (
    <button
      type="button"
      onClick={disabled ? undefined : onSelect}
      onDoubleClick={disabled ? undefined : onEditar}
      onDragOver={(e) => {
        if (disabled || !onDropPlugin) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        setDragOver(false);
        if (disabled || !onDropPlugin) return;
        e.preventDefault();
        const carga = decodificarArrastrePlugin(e.dataTransfer.getData('text/plain'));
        if (carga) onDropPlugin(carga);
      }}
      title={boton?.label ? `B${indice + 1} · ${etiqueta}` : `B${indice + 1}`}
      style={{
        height: 34,
        width: '100%',
        background: isResaltado ? VD.accentBg : VD.elevated,
        border: `1px solid ${isResaltado ? VD.accent : VD.borderStrong}`,
        borderRadius: VD.radius.md,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: VD.space.xs,
        cursor: disabled ? 'default' : 'pointer',
        fontFamily: VD.mono,
        fontSize: 9,
        color: isResaltado ? VD.accent : VD.textDim,
        boxShadow: isResaltado
          ? `0 0 0 1px ${VD.accent}, 0 2px 4px rgba(0, 0, 0, 0.4)`
          : '0 2px 0 var(--vd-border-strong, rgba(0,0,0,0.3))',
        opacity: disabled ? 0.5 : 1,
        transition: 'all 0.15s ease',
        padding: `0 ${VD.space.sm}px`,
        overflow: 'hidden',
        minWidth: 0,
      }}
    >
      <span style={{ fontSize: 8, color: VD.textMuted, flexShrink: 0 }}>
        {`B${indice + 1}`}
      </span>
      <span
        style={{
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          maxWidth: 90,
          minWidth: 0,
          color: boton?.label ? VD.text : VD.textMuted,
        }}
      >
        {etiqueta}
      </span>
    </button>
  );
}
