import React, { useState } from 'react';
import { useTheme } from '../../utils/theme';
import { useT } from '../../utils/i18n';
import { DotGlyphIcon } from '../../components/dot480/DotGlyphIcon';
import { IconoPuntos } from '../../components/dot480/IconoPuntos';
import { useFormatoPantalla } from '../../utils/useFormatoPantalla';
import type { PageConfig } from '../../types';
import type { DisposicionSuperficie } from '../../types/superficies';
import { BarraPaginaSuperficie, InsigniaApp } from './BarraPaginaSuperficie';
import { BotonDesplegablePagina, OverlayDesplegablePagina } from './DesplegablePaginaSuperficie';

export interface PestanasSuperficieProps {
  /** Las páginas de este serial, en el orden de la config. */
  paginas: PageConfig[];
  /** La que enseña el aparato ahora mismo (resuelta por `useSuperficies`). */
  paginaActivaId: string | null;
  /** La que se está editando (la pestaña elegida). */
  paginaEditadaId: string | null;
  /** Id de la predeterminada (primera sin `targetApp`), para marcarla. */
  paginaPredeterminadaId: string | null;
  /** La distribución del dispositivo, para crear los huecos de la página nueva. */
  disposicion: DisposicionSuperficie | null;
  /** `false` cuando el deck ya llegó al tope de 8 páginas. */
  puedeAgregar: boolean;
  /** Elegir una pestaña la edita **y** la pone activa en el aparato. */
  onElegirPagina: (id: string) => void;
  /** El `+`: otra página del mismo dispositivo (copia marca y huecos). */
  onAgregarPagina: (origenId: string, disposicion: DisposicionSuperficie) => void;
  onRenombrarPagina: (id: string, nombre: string) => void;
  onBorrarPagina: (id: string) => void;
  /** `''` desvincula la app. La limpieza va en la operación. */
  onFijarApp: (id: string, app: string, iconoApp?: string) => void;
  /** Crear página preconfigurada desde plantilla (roadmap 75). */
  onCrearDesdePlantilla?: (plantillaId: string, app: string) => void;
  esBarra?: boolean;
}

function FichaPestana({
  pagina,
  activa,
  editando,
  esPredeterminada,
  esBarra,
  onElegir,
  vd,
  t,
}: {
  pagina: PageConfig;
  activa: boolean;
  editando: boolean;
  esPredeterminada: boolean;
  esBarra: boolean;
  onElegir: (id: string) => void;
  vd: ReturnType<typeof useTheme>;
  t: (k: string, p?: Record<string, string | number>) => string;
}) {
  return (
    <div
      onClick={() => onElegir(pagina.id)}
      title={activa ? `${pagina.name} · ${t('disp.paginaEnAparato')}` : pagina.name}
      style={{
        padding: esBarra ? '3px 8px' : '6px 12px',
        fontFamily: vd.mono,
        fontSize: esBarra ? 9 : 9.5,
        letterSpacing: 1,
        color: editando ? vd.text : vd.textDim,
        borderBottom: editando ? `2px solid ${vd.accent}` : '2px solid transparent',
        cursor: 'pointer',
        userSelect: 'none',
        display: 'flex',
        alignItems: 'center',
        gap: esBarra ? 4 : 6,
        flexShrink: 0,
        whiteSpace: 'nowrap',
      }}
    >
      {pagina.iconoApp && (
        <IconoPuntos bits={pagina.iconoApp} size={esBarra ? 12 : 14} color={editando ? vd.text : vd.textDim} />
      )}
      <span style={{ fontWeight: editando ? 600 : 400 }}>{pagina.name}</span>
      {esPredeterminada && (
        <span style={{ fontSize: 7, color: vd.textDim, letterSpacing: 0.5, textTransform: 'uppercase' }}>
          {t('disp.paginaPredeterminada')}
        </span>
      )}
      {activa && <span style={{ width: 5, height: 5, borderRadius: '50%', background: vd.success, flexShrink: 0 }} />}
      {pagina.targetApp && <InsigniaApp app={pagina.targetApp} />}
    </div>
  );
}

export function PestanasSuperficie({
  paginas,
  paginaActivaId,
  paginaEditadaId,
  paginaPredeterminadaId,
  disposicion,
  puedeAgregar,
  onElegirPagina,
  onAgregarPagina,
  onRenombrarPagina,
  onBorrarPagina,
  onFijarApp,
  onCrearDesdePlantilla,
  esBarra: esBarraProp,
}: PestanasSuperficieProps) {
  const VD = useTheme();
  const t = useT();
  const { formato } = useFormatoPantalla();
  const esBarra = esBarraProp ?? (formato === 'barra');
  const [desplegableAbierto, setDesplegableAbierto] = useState(false);

  if (paginas.length === 0 || !disposicion) return null;

  const editada = paginas.find((p) => p.id === paginaEditadaId) ?? null;

  const handleAgregar = () => {
    if (editada) onAgregarPagina(editada.id, disposicion);
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: esBarra ? 2 : VD.space.sm,
        minWidth: 0,
        width: '100%',
        position: 'relative',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: esBarra ? 4 : VD.space.sm, minWidth: 0, width: '100%' }}>
        <span
          style={{
            fontSize: esBarra ? 8 : 9,
            color: VD.textMuted,
            letterSpacing: 1.5,
            fontFamily: VD.mono,
            textTransform: 'uppercase',
            flexShrink: 0,
          }}
        >
          {t('disp.paginas')}
        </span>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            flexWrap: 'nowrap',
            overflowX: 'auto',
            overflowY: 'hidden',
            minWidth: 0,
            flex: 1,
            scrollbarWidth: 'none',
          }}
        >
          {paginas.map((p) => (
            <FichaPestana
              key={p.id}
              pagina={p}
              activa={p.id === paginaActivaId}
              editando={p.id === paginaEditadaId}
              esPredeterminada={p.id === paginaPredeterminadaId}
              esBarra={esBarra}
              onElegir={onElegirPagina}
              vd={VD}
              t={t}
            />
          ))}
          {puedeAgregar && (
            <div
              onClick={handleAgregar}
              title={t('disp.paginaNueva')}
              style={{
                padding: esBarra ? '3px 6px' : '6px 8px',
                cursor: 'pointer',
                userSelect: 'none',
                display: 'flex',
                alignItems: 'center',
                flexShrink: 0,
              }}
            >
              <DotGlyphIcon glyph="ADD" size={esBarra ? 8 : 10} color={VD.textMuted} />
            </div>
          )}
          {esBarra && editada && (
            <BotonDesplegablePagina
              abierto={desplegableAbierto}
              onClick={() => setDesplegableAbierto((abierto) => !abierto)}
              targetApp={editada.targetApp}
              t={t}
              vd={VD}
            />
          )}
        </div>
      </div>

      {esBarra ? (
        editada && (
          <OverlayDesplegablePagina
            abierto={desplegableAbierto}
            onCerrar={() => setDesplegableAbierto(false)}
            pagina={editada}
            esUltima={paginas.length <= 1}
            onRenombrarPagina={onRenombrarPagina}
            onBorrarPagina={onBorrarPagina}
            onFijarApp={onFijarApp}
            onCrearDesdePlantilla={onCrearDesdePlantilla}
            vd={VD}
          />
        )
      ) : (
        editada && (
          <BarraPaginaSuperficie
            key={editada.id}
            pagina={editada}
            esUltima={paginas.length <= 1}
            onRenombrarPagina={onRenombrarPagina}
            onBorrarPagina={onBorrarPagina}
            onFijarApp={onFijarApp}
            onCrearDesdePlantilla={onCrearDesdePlantilla}
          />
        )
      )}
    </div>
  );
}
