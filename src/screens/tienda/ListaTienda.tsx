import React from 'react';
import { useTheme } from '../../utils/theme';
import { useT } from '../../utils/i18n';
import type { EntradaGaleria, InstaladoTienda } from '../../types';
import { FilaEntradaGaleria } from '../../components/settings/FilaEntradaGaleria';
import { estadoDeEntrada } from './tiendaUtils';

/**
 * La lista de la tienda: las filas de la galería con su insignia de estado.
 * Lo ya instalado sale marcado y lo que trajo versión nueva avisa UPDATE —
 * ese aviso es la mitad de la Fase 2.
 */
export function ListaTienda({ lista, instalados, manifestUrl, elegidoId, onMirar }: {
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
      <div style={{ fontFamily: VD.mono, fontSize: 8, color: VD.textMuted, padding: '12px 4px' }}>
        {t('tienda.noResults')}
      </div>
    );
  }
  return (
    <>
      {lista.map((e) => {
        const { estado } = estadoDeEntrada(e, instalados, manifestUrl);
        const marca = estado === 'nuevo' ? null : estado === 'update'
          ? { texto: t('tienda.update', { version: e.version ?? '?' }), color: VD.warning }
          : { texto: t('tienda.installed'), color: VD.textMuted };
        return (
          <div key={e.id} style={elegidoId === e.id ? { outline: `1px solid ${VD.accent}`, borderRadius: VD.radius.md } : undefined}>
            <FilaEntradaGaleria entrada={e} marca={marca} onMirar={onMirar} />
          </div>
        );
      })}
    </>
  );
}
