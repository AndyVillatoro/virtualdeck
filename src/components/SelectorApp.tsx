import React, { useCallback, useEffect, useState } from 'react';
import { useTheme } from '../utils/theme';
import { useT } from '../utils/i18n';
import { DotGlyphIcon } from './dot480/DotGlyphIcon';
import { esAppPropia, normalizarApp } from '../utils/apps';
import { plantillaParaApp } from '../data/plantillasApp';

export interface SelectorAppProps {
  /** Valor actual del nombre de proceso vinculado. */
  valor: string;
  /** Se invoca al escribir o elegir una aplicación de la lista / ejecutable. */
  onElegir: (app: string) => void;
  /** Callback para crear una página preconfigurada a partir de la plantilla detectada. */
  onCrearDesdePlantilla?: (plantillaId: string, app: string) => void;
  /** Callback opcional al pulsar Enter en el campo de texto. */
  onEnter?: () => void;
  /** Si debe enfocar automáticamente el campo al montar. */
  autoFocus?: boolean;
}

interface FichaAppProps {
  proc: string;
  seleccionada: boolean;
  onElegir: (proc: string) => void;
  vd: ReturnType<typeof useTheme>;
}

function FichaApp({ proc, seleccionada, onElegir, vd }: FichaAppProps) {
  return (
    <button
      type="button"
      onClick={() => onElegir(proc)}
      style={{
        minHeight: 32,
        padding: '4px 10px',
        background: seleccionada ? `${vd.accent}24` : vd.surface,
        border: `1px solid ${seleccionada ? vd.accent : vd.border}`,
        borderRadius: vd.radius.sm,
        color: seleccionada ? vd.accent : vd.text,
        fontFamily: vd.mono,
        fontSize: 9,
        fontWeight: seleccionada ? 600 : 400,
        cursor: 'pointer',
        letterSpacing: 0.5,
        textTransform: 'lowercase',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        boxSizing: 'border-box',
      }}
    >
      {seleccionada && <DotGlyphIcon glyph="CHECK" size={8} color={vd.accent} />}
      <span>{proc}</span>
    </button>
  );
}

interface FranjaPlantillaProps {
  plantillaId: string;
  nombreClave: string;
  app: string;
  onCrearDesdePlantilla?: (plantillaId: string, app: string) => void;
  vd: ReturnType<typeof useTheme>;
  t: (k: string, p?: Record<string, string | number>) => string;
}

function FranjaPlantilla({
  plantillaId,
  nombreClave,
  app,
  onCrearDesdePlantilla,
  vd,
  t,
}: FranjaPlantillaProps) {
  const nombreVisible = t(nombreClave);
  return (
    <div
      style={{
        marginTop: 8,
        padding: '8px 12px',
        background: `${vd.accent}14`,
        border: `1px solid ${vd.accent}66`,
        borderRadius: vd.radius.sm,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
        flexWrap: 'wrap',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, flex: 1 }}>
        <DotGlyphIcon glyph="SPARKLE" size={10} color={vd.accent} />
        <span
          style={{
            fontFamily: vd.mono,
            fontSize: 8.5,
            fontWeight: 600,
            color: vd.accent,
            letterSpacing: 0.5,
            textTransform: 'uppercase',
            wordBreak: 'break-word',
          }}
        >
          {t('page.plantillaDisponible', { nombre: nombreVisible })}
        </span>
      </div>
      <button
        type="button"
        onClick={() => onCrearDesdePlantilla?.(plantillaId, app)}
        style={{
          minHeight: 32,
          padding: '6px 12px',
          background: vd.accentBg,
          border: `1px solid ${vd.accent}`,
          borderRadius: vd.radius.sm,
          color: vd.accent,
          fontFamily: vd.mono,
          fontSize: 8.5,
          fontWeight: 600,
          letterSpacing: 1,
          textTransform: 'uppercase',
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          whiteSpace: 'nowrap',
          flexShrink: 0,
          boxSizing: 'border-box',
        }}
      >
        <DotGlyphIcon glyph="ADD" size={9} color={vd.accent} />
        <span>{t('page.crearPagina')}</span>
      </button>
    </div>
  );
}

export function SelectorApp({
  valor,
  onElegir,
  onCrearDesdePlantilla,
  onEnter,
  autoFocus = false,
}: SelectorAppProps) {
  const VD = useTheme();
  const t = useT();
  const [appsAbiertas, setAppsAbiertas] = useState<string[]>([]);
  const [cargando, setCargando] = useState(false);

  const refrescarApps = useCallback(async () => {
    if (!window.electronAPI?.launch?.openApps) return;
    setCargando(true);
    try {
      const lista = await window.electronAPI.launch.openApps();
      const filtradas = (lista ?? [])
        .map(normalizarApp)
        .filter((a) => Boolean(a) && !esAppPropia(a));
      const unicas = Array.from(new Set(filtradas)).sort();
      setAppsAbiertas(unicas);
    } catch {
      // Ignorar fallo de sondeo
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    refrescarApps();
  }, [refrescarApps]);

  const handleBuscarExe = async () => {
    if (!window.electronAPI?.dialog?.openFile) return;
    try {
      const ruta = await window.electronAPI.dialog.openFile({
        title: t('page.buscarExe'),
        filters: [{ name: t('page.buscarExe'), extensions: ['exe'] }],
        properties: ['openFile'],
      });
      if (!ruta) return;
      const nombreArchivo = ruta.split(/[/\\]/).pop() ?? '';
      const normalizada = normalizarApp(nombreArchivo);
      if (normalizada && !esAppPropia(normalizada)) {
        onElegir(normalizada);
      }
    } catch {
      // Ignorar error al cancelar diálogo
    }
  };

  const appNormalizada = normalizarApp(valor);
  const plantilla = appNormalizada ? plantillaParaApp(appNormalizada) : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%', boxSizing: 'border-box' }}>
      {/* Valor actual y etiqueta */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <span style={{ fontFamily: VD.mono, fontSize: 8, color: VD.textDim, letterSpacing: 1, textTransform: 'uppercase' }}>
          {t('page.targetApp')}
        </span>
        {appNormalizada ? (
          <span style={{ fontFamily: VD.mono, fontSize: 8, color: VD.accent, letterSpacing: 0.5, textTransform: 'lowercase' }}>
            {appNormalizada}
          </span>
        ) : null}
      </div>

      {/* Input de texto y botón buscar .exe */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          autoFocus={autoFocus}
          value={valor}
          onChange={(e) => onElegir(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onEnter?.();
          }}
          placeholder={t('page.customAppPlaceholder')}
          style={{
            flex: 1,
            minHeight: 32,
            background: VD.surface,
            border: `1px solid ${VD.border}`,
            borderRadius: VD.radius.sm,
            padding: '6px 10px',
            color: VD.text,
            fontFamily: VD.mono,
            fontSize: 10,
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
        <button
          type="button"
          onClick={handleBuscarExe}
          title={t('page.buscarExe')}
          style={{
            minHeight: 32,
            padding: '6px 12px',
            background: 'transparent',
            border: `1px solid ${VD.border}`,
            borderRadius: VD.radius.sm,
            color: VD.text,
            fontFamily: VD.mono,
            fontSize: 8.5,
            fontWeight: 600,
            letterSpacing: 1,
            textTransform: 'uppercase',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            whiteSpace: 'nowrap',
            flexShrink: 0,
            boxSizing: 'border-box',
          }}
        >
          <DotGlyphIcon glyph="FOLDER" size={10} color={VD.accent} />
          <span>{t('page.buscarExe')}</span>
        </button>
      </div>

      {/* Lista de apps abiertas */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <span style={{ fontFamily: VD.mono, fontSize: 8, color: VD.textDim, letterSpacing: 1, textTransform: 'uppercase' }}>
            {t('page.runningApps')} ({appsAbiertas.length})
          </span>
          <button
            type="button"
            onClick={refrescarApps}
            disabled={cargando}
            title={t('page.refrescarApps')}
            style={{
              background: 'transparent',
              border: `1px solid ${VD.border}`,
              borderRadius: VD.radius.sm,
              padding: '3px 7px',
              color: VD.textDim,
              cursor: cargando ? 'default' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              fontFamily: VD.mono,
              fontSize: 8,
              letterSpacing: 0.5,
              textTransform: 'uppercase',
              minHeight: 24,
              boxSizing: 'border-box',
            }}
          >
            <DotGlyphIcon glyph="ROTATE_CW" size={8} color={VD.textDim} />
            <span>{t('page.refrescarApps')}</span>
          </button>
        </div>

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 6,
            maxHeight: 140,
            overflowY: 'auto',
            padding: 8,
            background: VD.elevated,
            borderRadius: VD.radius.sm,
            border: `1px solid ${VD.border}`,
            boxSizing: 'border-box',
          }}
        >
          {appsAbiertas.length === 0 ? (
            <div
              style={{
                fontFamily: VD.mono,
                fontSize: 8.5,
                color: VD.textMuted,
                padding: '8px 4px',
                width: '100%',
                textAlign: 'center',
                textTransform: 'uppercase',
                letterSpacing: 0.5,
              }}
            >
              {t('page.sinAppsAbiertas')}
            </div>
          ) : (
            appsAbiertas.map((proc) => (
              <FichaApp
                key={proc}
                proc={proc}
                seleccionada={appNormalizada === proc}
                onElegir={onElegir}
                vd={VD}
              />
            ))
          )}
        </div>
      </div>

      {/* Franja de plantilla disponible */}
      {plantilla && (
        <FranjaPlantilla
          plantillaId={plantilla.id}
          nombreClave={plantilla.nombre}
          app={appNormalizada}
          onCrearDesdePlantilla={onCrearDesdePlantilla}
          vd={VD}
          t={t}
        />
      )}
    </div>
  );
}
