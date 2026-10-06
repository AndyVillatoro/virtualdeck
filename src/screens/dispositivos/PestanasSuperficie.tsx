import React, { useState } from 'react';
import { useTheme } from '../../utils/theme';
import { useT } from '../../utils/i18n';
import { DotGlyphIcon } from '../../components/dot480/DotGlyphIcon';
import { IconoPuntos } from '../../components/dot480/IconoPuntos';
import { SelectorApp } from '../../components/SelectorApp';
import { normalizarApp } from '../../utils/apps';
import type { PageConfig } from '../../types';
import type { DisposicionSuperficie } from '../../types/superficies';

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
}

function InsigniaApp({ app }: { app: string }) {
  const VD = useTheme();
  const t = useT();
  return (
    <span
      title={`${t('page.boundApp')}: ${app}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 3,
        padding: '1px 4px',
        borderRadius: VD.radius.sm,
        background: `${VD.accent}1c`,
        border: `1px solid ${VD.accent}55`,
        color: VD.accent,
        fontSize: 7,
        letterSpacing: 0.5,
        textTransform: 'uppercase',
      }}
    >
      <DotGlyphIcon glyph="APP_WINDOW" size={6} color={VD.accent} />
      <span>{app}</span>
    </span>
  );
}

/**
 * Lo que se puede hacer con la página elegida: renombrarla, vincularle una
 * app (o quitársela) y borrarla. La última página del dispositivo no se puede
 * borrar —la operación también lo impide—, aquí el botón sale desactivado.
 */
function BarraPaginaSuperficie({
  pagina,
  esUltima,
  onRenombrarPagina,
  onBorrarPagina,
  onFijarApp,
  onCrearDesdePlantilla,
}: {
  pagina: PageConfig;
  esUltima: boolean;
  onRenombrarPagina: (id: string, nombre: string) => void;
  onBorrarPagina: (id: string) => void;
  onFijarApp: (id: string, app: string, iconoApp?: string) => void;
  onCrearDesdePlantilla?: (plantillaId: string, app: string) => void;
}) {
  const VD = useTheme();
  const t = useT();
  // Con `key` por página, cada fila estrena su propio estado al cambiar de
  // pestaña: no hace falta sincronizar nada por efecto.
  const [renombrando, setRenombrando] = useState(false);
  const [nombre, setNombre] = useState(pagina.name);
  const [app, setApp] = useState(pagina.targetApp ?? '');

  const guardarApp = async (nuevaApp: string) => {
    const limpia = normalizarApp(nuevaApp);
    if (!limpia) {
      setApp('');
      onFijarApp(pagina.id, '', undefined);
      return;
    }
    let icono: string | null = null;
    if (window.electronAPI?.launch?.iconoApp) {
      try {
        icono = await window.electronAPI.launch.iconoApp(limpia);
      } catch {
        icono = null;
      }
    }
    const iconoFinal = icono ?? (limpia === pagina.targetApp ? pagina.iconoApp : undefined);
    onFijarApp(pagina.id, limpia, iconoFinal);
  };

  const confirmarNombre = () => {
    setRenombrando(false);
    const limpio = nombre.trim();
    if (limpio && limpio !== pagina.name) onRenombrarPagina(pagina.id, limpio);
    else setNombre(pagina.name);
  };

  const estiloBoton = (peligro: boolean, desactivado: boolean): React.CSSProperties => ({
    padding: '5px 10px',
    background: 'transparent',
    border: `1px solid ${peligro ? `${VD.danger}66` : VD.border}`,
    color: peligro ? VD.danger : VD.textDim,
    fontFamily: VD.mono,
    fontSize: 8.5,
    letterSpacing: 1,
    textTransform: 'uppercase',
    cursor: desactivado ? 'default' : 'pointer',
    borderRadius: VD.radius.sm,
    opacity: desactivado ? 0.4 : 1,
  });

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: VD.space.sm,
        background: VD.elevated,
        border: `1px solid ${VD.border}`,
        borderRadius: VD.radius.md,
        padding: `${VD.space.sm}px ${VD.space.md}px`,
        minWidth: 0,
        maxWidth: '100%',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: VD.space.sm,
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          minWidth: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: VD.space.sm, minWidth: 0 }}>
          {pagina.iconoApp && (
            <IconoPuntos bits={pagina.iconoApp} size={16} color={VD.accent} />
          )}
          {renombrando ? (
            <input
              autoFocus
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              onBlur={confirmarNombre}
              onKeyDown={(e) => {
                if (e.key === 'Enter') confirmarNombre();
                if (e.key === 'Escape') { setNombre(pagina.name); setRenombrando(false); }
                e.stopPropagation();
              }}
              style={{
                background: VD.surface,
                border: `1px solid ${VD.accent}`,
                borderRadius: VD.radius.sm,
                padding: '4px 8px',
                color: VD.text,
                fontFamily: VD.mono,
                fontSize: 10,
                outline: 'none',
                maxWidth: '100%',
                width: Math.max(100, nombre.length * 9),
              }}
            />
          ) : (
            <button
              type="button"
              title={t('disp.renombrarPagina')}
              onDoubleClick={() => { setNombre(pagina.name); setRenombrando(true); }}
              onClick={() => { setNombre(pagina.name); setRenombrando(true); }}
              style={{
                background: 'none',
                border: 'none',
                color: VD.text,
                fontFamily: VD.mono,
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: 1,
                cursor: 'text',
                padding: 0,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {pagina.name}
            </button>
          )}

          {pagina.targetApp && <InsigniaApp app={pagina.targetApp} />}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: VD.space.sm, flexWrap: 'wrap' }}>
          <button
            type="button"
            title={t('page.bindApp')}
            onClick={() => void guardarApp(app)}
            style={estiloBoton(false, false)}
          >
            {t('ui.saveShort')}
          </button>
          {pagina.targetApp && (
            <button
              type="button"
              title={t('page.unbindApp')}
              onClick={() => void guardarApp('')}
              style={estiloBoton(false, false)}
            >
              {t('page.unbindApp')}
            </button>
          )}
          <button
            type="button"
            title={esUltima ? t('disp.borrarUltima') : t('disp.borrarPagina')}
            disabled={esUltima}
            onClick={() => { if (!esUltima) onBorrarPagina(pagina.id); }}
            style={estiloBoton(true, esUltima)}
          >
            {t('disp.borrarPagina')}
          </button>
        </div>
      </div>

      <SelectorApp
        valor={app}
        onElegir={(elegida) => setApp(elegida)}
        onCrearDesdePlantilla={onCrearDesdePlantilla}
        onEnter={() => void guardarApp(app)}
      />
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
}: PestanasSuperficieProps) {
  const VD = useTheme();
  const t = useT();

  // Sin páginas no hay pestañas: el aviso lo pone el padre. Sin distribución
  // tampoco se puede añadir (no se sabrían los huecos).
  if (paginas.length === 0 || !disposicion) return null;

  const editada = paginas.find((p) => p.id === paginaEditadaId) ?? null;

  const handleAgregar = () => {
    if (editada) onAgregarPagina(editada.id, disposicion);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: VD.space.sm, minWidth: 0, width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: VD.space.sm, minWidth: 0, width: '100%' }}>
        <span
          style={{
            fontSize: 9,
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
          {paginas.map((p) => {
            const activa = p.id === paginaActivaId;
            const editando = p.id === paginaEditadaId;
            return (
              <div
                key={p.id}
                onClick={() => onElegirPagina(p.id)}
                title={activa ? t('disp.paginaEnAparato') : p.name}
                style={{
                  padding: '6px 12px',
                  fontFamily: VD.mono,
                  fontSize: 9.5,
                  letterSpacing: 1,
                  color: editando ? VD.text : VD.textDim,
                  borderBottom: editando ? `2px solid ${VD.accent}` : '2px solid transparent',
                  cursor: 'pointer',
                  userSelect: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  flexShrink: 0,
                  whiteSpace: 'nowrap',
                }}
              >
                {p.iconoApp && (
                  <IconoPuntos
                    bits={p.iconoApp}
                    size={14}
                    color={editando ? VD.text : VD.textDim}
                  />
                )}
                <span style={{ fontWeight: editando ? 600 : 400 }}>{p.name}</span>
                {p.id === paginaPredeterminadaId && (
                  <span style={{ fontSize: 7, color: VD.textDim, letterSpacing: 0.5, textTransform: 'uppercase' }}>
                    {t('disp.paginaPredeterminada')}
                  </span>
                )}
                {activa && <span style={{ width: 6, height: 6, borderRadius: '50%', background: VD.success, flexShrink: 0 }} />}
                {p.targetApp && <InsigniaApp app={p.targetApp} />}
              </div>
            );
          })}
          {puedeAgregar && (
            <div
              onClick={handleAgregar}
              title={t('disp.paginaNueva')}
              style={{
                padding: '6px 8px',
                cursor: 'pointer',
                userSelect: 'none',
                display: 'flex',
                alignItems: 'center',
                flexShrink: 0,
              }}
            >
              <DotGlyphIcon glyph="ADD" size={10} color={VD.textMuted} />
            </div>
          )}
        </div>
      </div>

      {editada && (
        <BarraPaginaSuperficie
          key={editada.id}
          pagina={editada}
          esUltima={paginas.length <= 1}
          onRenombrarPagina={onRenombrarPagina}
          onBorrarPagina={onBorrarPagina}
          onFijarApp={onFijarApp}
          onCrearDesdePlantilla={onCrearDesdePlantilla}
        />
      )}
    </div>
  );
}
