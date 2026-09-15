import React from 'react';
import { useTheme } from '../../utils/theme';
import { useT } from '../../utils/i18n';
import type { EntradaGaleria, ResumenRiesgo } from '../../types';
import { FichaRiesgoGaleria } from '../../components/settings/FichaRiesgoGaleria';
import type { EstadoEntrada } from './tiendaUtils';

/**
 * La ficha de la tienda: aviso de update si lo hay, nota del autor (README
 * en línea o traído por `readmeUrl`) y la ficha de riesgo de siempre con sus
 * botones de instalar. El riesgo no se recorta aquí tampoco.
 */
export function FichaTienda({ entrada, riesgo, estado, versionInstalada, readme, puedeAgregarPagina, onInstalarPerfil, onInstalarPagina, onCerrar }: {
  entrada: EntradaGaleria;
  riesgo: ResumenRiesgo;
  estado: EstadoEntrada;
  versionInstalada?: string;
  readme: { texto?: string; error?: string; cargando: boolean } | null;
  puedeAgregarPagina: boolean;
  onInstalarPerfil: (agregarAlDeck: boolean) => void;
  onInstalarPagina: () => void;
  onCerrar: () => void;
}) {
  const VD = useTheme();
  const t = useT();
  const menudo: React.CSSProperties = { fontFamily: VD.mono, fontSize: 8, color: VD.textMuted, lineHeight: 1.6 };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {estado === 'update' && (
        <div style={{
          ...menudo, color: VD.warning, border: `1px solid ${VD.warning}`,
          borderRadius: VD.radius.md, padding: '5px 9px',
        }}>
          {t('tienda.update', { version: entrada.version ?? '?' })}
          {versionInstalada ? ` (v${versionInstalada})` : ''}
        </div>
      )}
      {readme && (readme.texto || readme.error || readme.cargando) && (
        <div style={{
          background: VD.elevated, border: `1px solid ${VD.border}`,
          borderRadius: VD.radius.md, padding: '7px 10px',
        }}>
          <div style={{ ...menudo, color: VD.textDim }}>{t('tienda.readmeBy')}</div>
          <div style={{ ...menudo, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {readme.cargando ? t('gal.loading') : readme.error
              ? t('tienda.readmeFailed', { error: readme.error })
              : readme.texto}
          </div>
        </div>
      )}
      <FichaRiesgoGaleria
        entrada={entrada}
        riesgo={riesgo}
        puedeAgregarPagina={puedeAgregarPagina}
        onImportar={onInstalarPerfil}
        onImportarPagina={onInstalarPagina}
        onCerrar={onCerrar}
      />
    </div>
  );
}
