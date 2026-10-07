import React, { useState } from 'react';
import { useTheme } from '../../utils/theme';
import { useT } from '../../utils/i18n';
import { DotGlyphIcon } from '../../components/dot480/DotGlyphIcon';
import { IconoPuntos } from '../../components/dot480/IconoPuntos';
import { SelectorApp } from '../../components/SelectorApp';
import { normalizarApp } from '../../utils/apps';
import { useFormatoPantalla } from '../../utils/useFormatoPantalla';
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
  esBarra?: boolean;
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
              title={`${pagina.name} · ${t('disp.renombrarPagina')}`}
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

function BotonDesplegablePagina({
  abierto,
  onClick,
  targetApp,
  t,
  vd,
}: {
  abierto: boolean;
  onClick: () => void;
  targetApp?: string;
  t: (k: string) => string;
  vd: ReturnType<typeof useTheme>;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={t('disp.desplegablePagina')}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        background: abierto ? `${vd.accent}22` : vd.elevated,
        border: `1px solid ${abierto ? vd.accent : vd.border}`,
        color: abierto ? vd.accent : vd.text,
        padding: '2px 6px',
        borderRadius: vd.radius.sm,
        fontFamily: vd.mono,
        fontSize: 8,
        letterSpacing: 1,
        cursor: 'pointer',
        flexShrink: 0,
        userSelect: 'none',
        marginLeft: 4,
        transition: 'all 0.15s ease',
      }}
    >
      <DotGlyphIcon
        glyph={abierto ? 'ARROW_UP' : 'ARROW_DOWN'}
        size={8}
        color={abierto ? vd.accent : vd.textDim}
      />
      <span>{t('disp.desplegablePagina')}</span>
      {targetApp && <InsigniaApp app={targetApp} />}
    </button>
  );
}

function OverlayDesplegablePagina({
  abierto,
  onCerrar,
  pagina,
  esUltima,
  onRenombrarPagina,
  onBorrarPagina,
  onFijarApp,
  onCrearDesdePlantilla,
  vd,
}: {
  abierto: boolean;
  onCerrar: () => void;
  pagina: PageConfig;
  esUltima: boolean;
  onRenombrarPagina: (id: string, nombre: string) => void;
  onBorrarPagina: (id: string) => void;
  onFijarApp: (id: string, app: string, iconoApp?: string) => void;
  onCrearDesdePlantilla?: (plantillaId: string, app: string) => void;
  vd: ReturnType<typeof useTheme>;
}) {
  if (!abierto) return null;
  return (
    <>
      <div
        onClick={onCerrar}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 24,
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          marginTop: 4,
          zIndex: 25,
          boxShadow: vd.shadow.modal,
          background: vd.surface,
          border: `1px solid ${vd.borderStrong}`,
          borderRadius: vd.radius.md,
          padding: vd.space.xs,
          maxWidth: 680,
        }}
      >
        <BarraPaginaSuperficie
          key={pagina.id}
          pagina={pagina}
          esUltima={esUltima}
          onRenombrarPagina={onRenombrarPagina}
          onBorrarPagina={onBorrarPagina}
          onFijarApp={onFijarApp}
          onCrearDesdePlantilla={onCrearDesdePlantilla}
        />
      </div>
    </>
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
