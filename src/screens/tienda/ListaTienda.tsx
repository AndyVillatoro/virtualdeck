import React from 'react';
import { useTheme } from '../../utils/theme';
import { useT } from '../../utils/i18n';
import type { EntradaGaleria, InstaladoTienda } from '../../types';
import { estadoDeEntrada } from './tiendaUtils';
import { TarjetaTienda } from './TarjetaTienda';

/**
 * Rejilla de tarjetas compactas de la tienda (estilo Raycast / VS Code).
 * Muestra las entradas con icono DOT, portada opcional, tipo y estado.
 */
export function ListaTienda({
  lista,
  instalados,
  manifestUrl,
  elegidoId,
  onMirar,
}: {
  lista: EntradaGaleria[];
  instalados: InstaladoTienda[];
  manifestUrl: string;
  elegidoId: string | null;
  onMirar: (e: EntradaGaleria) => void;
}) {
  const VD = useTheme();
  const t = useT();

  if (lista.length === 0) {
    return (
      <div style={{
        fontFamily: VD.mono,
        fontSize: 9,
        color: VD.textMuted,
        padding: '24px 8px',
        textAlign: 'center',
        background: VD.surface,
        border: `1px solid ${VD.border}`,
        borderRadius: VD.radius.md,
      }}>
        {t('tienda.noResults')}
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
        gap: 12,
      }}
    >
      {lista.map((e) => {
        const { estado, instalado } = estadoDeEntrada(e, instalados, manifestUrl);
        return (
          <div
            key={e.id}
            style={elegidoId === e.id ? { outline: `2px solid ${VD.accent}`, borderRadius: VD.radius.md } : undefined}
          >
            <TarjetaTienda
              entrada={e}
              estado={estado}
              versionInstalada={instalado?.version}
              onMirar={onMirar}
            />
          </div>
        );
      })}
    </div>
  );
}
