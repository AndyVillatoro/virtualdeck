import React, { useState } from 'react';
import { useTheme } from '../../utils/theme';
import { useT } from '../../utils/i18n';
import { Modal } from '../../components/ui/Modal';
import { BotonIcono } from '../../components/ui/BotonIcono';

export interface TiraCapturasProps {
  capturas?: string[];
}

/**
 * Tira horizontal de capturas de pantalla con ampliación en Modal.
 * Si una imagen falla (`onError`), se oculta limpiamente sin huecos rotos.
 */
export function TiraCapturas({ capturas }: TiraCapturasProps) {
  const VD = useTheme();
  const t = useT();
  const [rotas, setRotas] = useState<Record<number, boolean>>({});
  const [activa, setActiva] = useState<string | null>(null);

  if (!capturas || capturas.length === 0) return null;

  const validas = capturas.filter((_, idx) => !rotas[idx]);
  if (validas.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{
        fontFamily: VD.mono,
        fontSize: 8,
        color: VD.textDim,
        letterSpacing: 1,
      }}>
        {t('tienda.screenshots')}
      </div>
      <div
        className="vd-scroll"
        style={{
          display: 'flex',
          gap: 8,
          overflowX: 'auto',
          paddingBottom: 4,
        }}
      >
        {capturas.map((url, idx) => {
          if (rotas[idx]) return null;
          return (
            <button
              key={url + idx}
              type="button"
              onClick={() => setActiva(url)}
              title={t('tienda.screenshotZoom')}
              style={{
                height: 96,
                width: 156,
                flexShrink: 0,
                padding: 0,
                background: VD.surface,
                border: `1px solid ${VD.border}`,
                borderRadius: VD.radius.sm,
                overflow: 'hidden',
                cursor: 'pointer',
                display: 'block',
              }}
            >
              <img
                src={url}
                alt=""
                onError={() => setRotas((prev) => ({ ...prev, [idx]: true }))}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: 'block',
                }}
              />
            </button>
          );
        })}
      </div>

      {activa && (
        <Modal
          onClose={() => setActiva(null)}
          ancho="min(920px, 94vw)"
          etiqueta={t('tienda.screenshotZoom')}
        >
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 12px',
            borderBottom: `1px solid ${VD.border}`,
          }}>
            <span style={{ fontFamily: VD.mono, fontSize: 9, color: VD.textDim, letterSpacing: 0.5 }}>
              {t('tienda.screenshotZoom')}
            </span>
            <BotonIcono
              glifo="CLOSE"
              title={t('tienda.close')}
              onClick={() => setActiva(null)}
              tamano={20}
              tamanoGlifo={8}
            />
          </div>
          <div style={{ padding: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img
              src={activa}
              alt=""
              style={{
                maxWidth: '100%',
                maxHeight: '76vh',
                objectFit: 'contain',
                borderRadius: VD.radius.sm,
                display: 'block',
              }}
            />
          </div>
        </Modal>
      )}
    </div>
  );
}
