import React from 'react';
import { useTheme } from '../../utils/theme';
import { useFieldText } from '../../utils/i18n';
import { IconoPuntos } from '../../components/dot480/IconoPuntos';
import { Btn } from './comunes';
import { FilaGlifosRapidos } from './catalogo/FilaGlifosRapidos';
import { PREFIJO_ACCIONES, PREFIJO_MARCAS } from './constantesCatalogo';

export interface SelectorIconoGlifoCatalogoProps {
  icon: string;
  setIcon: (val: string) => void;
  accent: string;
  iconoPuntos?: { bits: string; origen: string };
  setIconoPuntos?: (val?: { bits: string; origen: string }) => void;
  onAbrirCatalogoAcciones?: () => void;
  onAbrirCatalogoMarcas?: () => void;
}

export function SelectorIconoGlifoCatalogo({
  icon,
  setIcon,
  accent,
  iconoPuntos,
  setIconoPuntos,
  onAbrirCatalogoAcciones,
  onAbrirCatalogoMarcas,
}: SelectorIconoGlifoCatalogoProps) {
  const VD = useTheme();
  const tf = useFieldText();

  const nombreOrigen = iconoPuntos?.origen
    ? (iconoPuntos.origen.startsWith(PREFIJO_ACCIONES)
        ? iconoPuntos.origen.slice(PREFIJO_ACCIONES.length)
        : iconoPuntos.origen.startsWith(PREFIJO_MARCAS)
          ? iconoPuntos.origen.slice(PREFIJO_MARCAS.length)
          : iconoPuntos.origen
      ).replace(/-/g, ' ').toUpperCase()
    : '';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {iconoPuntos && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <div
            style={{
              width: 36,
              height: 36,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: VD.elevated,
              border: `1px solid ${VD.border}`,
              borderRadius: VD.radius.sm,
            }}
          >
            <IconoPuntos bits={iconoPuntos.bits} size={24} color={accent} showRecessed />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontFamily: VD.mono, fontSize: 10, color: VD.text, fontWeight: 'bold' }}>
              {nombreOrigen}
            </span>
            <span style={{ fontFamily: VD.mono, fontSize: 9, color: VD.textDim, letterSpacing: 0.5 }}>
              {iconoPuntos.origen}
            </span>
          </div>
          <Btn onClick={onAbrirCatalogoAcciones}>{tf('Cambiar')}</Btn>
          <Btn onClick={() => setIconoPuntos?.(undefined)} style={{ color: VD.danger }}>
            {tf('Quitar')}
          </Btn>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        {onAbrirCatalogoAcciones && (
          <Btn onClick={onAbrirCatalogoAcciones}>
            {tf('Catálogo de acciones')}
          </Btn>
        )}
        {onAbrirCatalogoMarcas && (
          <Btn onClick={onAbrirCatalogoMarcas}>
            {tf('Catálogo de marcas')}
          </Btn>
        )}
      </div>

      <FilaGlifosRapidos
        icon={icon}
        setIcon={setIcon}
        accent={accent}
        setIconoPuntos={setIconoPuntos}
      />
    </div>
  );
}
