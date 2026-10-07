import React from 'react';
import { useTheme } from '../../../utils/theme';
import { useFieldText } from '../../../utils/i18n';
import { DotGlyphIcon } from '../../../components/dot480/DotGlyphIcon';
import { IconoPuntos } from '../../../components/dot480/IconoPuntos';
import type { ItemCatalogo } from './grupos';

export interface RejillaIconosProps {
  cargando: boolean;
  items: ItemCatalogo[];
  mapaBits: Map<string, string>;
  currentOrigen?: string;
  accent: string;
  onHover: (item: ItemCatalogo | null) => void;
  onElegir: (item: ItemCatalogo) => void;
}

export function RejillaIconos({
  cargando,
  items,
  mapaBits,
  currentOrigen,
  accent,
  onHover,
  onElegir,
}: RejillaIconosProps) {
  const VD = useTheme();
  const tf = useFieldText();

  if (cargando) {
    return <Mensaje texto={tf('Cargando catálogo...')} />;
  }
  if (items.length === 0) {
    return <Mensaje texto={tf('Sin resultados')} />;
  }

  return (
    <div
      className="vd-scroll"
      style={{
        flex: 1,
        minHeight: 0,
        overflowY: 'auto',
        padding: 12,
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(44px, 1fr))',
        gap: 4,
        alignContent: 'start',
      }}
      onMouseLeave={() => onHover(null)}
    >
      {items.map((item) => {
        const bits = item.origen ? mapaBits.get(item.origen) : undefined;
        const seleccionado =
          item.clase === 'glifo8'
            ? false
            : Boolean(item.origen && currentOrigen && item.origen === currentOrigen);
        const color = seleccionado ? accent : VD.text;
        return (
          <button
            key={item.clave}
            type="button"
            onClick={() => onElegir(item)}
            onMouseEnter={() => onHover(item)}
            onMouseLeave={() => onHover(null)}
            title={`${item.nombre} (${item.id})`}
            style={{
              minWidth: 40,
              minHeight: 40,
              height: 44,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: seleccionado ? VD.accentBg : VD.surface,
              border: `1px solid ${seleccionado ? accent : VD.border}`,
              borderRadius: VD.radius.sm,
              cursor: 'pointer',
              padding: 0,
              transition: 'background 0.1s, border-color 0.1s',
            }}
          >
            {item.clase === 'glifo8' ? (
              <DotGlyphIcon glyph={item.id} size={22} color={color} showRecessed />
            ) : bits ? (
              <IconoPuntos bits={bits} size={24} color={color} />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

function Mensaje({ texto }: { texto: string }) {
  const VD = useTheme();
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: VD.mono,
        fontSize: 12,
        color: VD.textDim,
      }}
    >
      {texto}
    </div>
  );
}
