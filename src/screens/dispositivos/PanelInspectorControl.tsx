import React, { useMemo } from 'react';
import { useTheme } from '../../utils/theme';
import { useT } from '../../utils/i18n';
import { DotGlyphIcon } from '../../components/dot480/DotGlyphIcon';
import { resolveDotGlyph } from '../../components/dot480/resolveDotGlyph';
import { CatalogoPluginsArrastrable } from '../../components/plugins/CatalogoPluginsArrastrable';
import { BotonConfigurarPlugin } from '../editor/formularios/plugins';
import { SelectorPresetsControl } from './SelectorPresetsControl';
import { LimiteErrorInspector } from './LimiteErrorInspector';
import { PanelPerfilesPagina } from './PanelPerfilesPagina';
import { PanelVacio } from './PanelInspectorVacio';
import { MiniPreview, AvisoControlSinLcd } from './PreviaInspector';
import { BotonEditar, FilaAccion, SeccionModos } from './PiezasInspector';
import { ListaHermanosPerilla } from './ListaHermanosPerilla';
import { obtenerNombreYTipoControl, textoAccionSeleccionada } from './textoPanelInspector';
import { contextoDeBoton } from '../../utils/plugins/ref';
import { construirHuecosSoltarPlugin, type CargaArrastrePlugin } from '../../utils/plugins/arrastrePlugin';
import { useListaPlugins } from '../../utils/plugins/listaPlugins';
import { useAppearPluginPreview } from '../../utils/plugins/useAppearPluginPreview';
import type { BotonConCatalogo } from './TeclaLcdHardware';
import type { PanelInspectorControlProps } from './tiposPanelInspector';
import type { ButtonConfig, PluginRef } from '../../types';
import type { PresetHueco } from '../../data/presetsDock';
import type { PerfilDock } from '../../data/perfilesDock';

export type { HermanoPerilla, PanelInspectorControlProps } from './tiposPanelInspector';

/** Los botones del control en orden de hueco y cuál está elegido, para soltar o asignar un plugin. */
function huecosParaPlugin(
  props: Pick<PanelInspectorControlProps, 'controlMeta' | 'boton' | 'perilla' | 'hermanosPerilla'>,
): { botones: (ButtonConfig | undefined)[]; seleccionado: number } | null {
  const { controlMeta, boton } = props;
  if (!controlMeta || !boton) return null;
  if (controlMeta.control === 'knob') return huecosDePerilla(props);
  if (controlMeta.control === 'swipe') return huecosDeTira(props);
  return { botones: [boton], seleccionado: 0 };
}

function huecosDePerilla(
  props: Pick<PanelInspectorControlProps, 'controlMeta' | 'perilla'>,
): { botones: (ButtonConfig | undefined)[]; seleccionado: number } | null {
  const { controlMeta, perilla } = props;
  if (!perilla) return null;
  const gesto = controlMeta?.gesto ?? 'pulsar';
  return {
    botones: [perilla.izq, perilla.pulsar, perilla.der],
    seleccionado: gesto === 'izq' ? 0 : gesto === 'der' ? 2 : 1,
  };
}

function huecosDeTira(
  props: Pick<PanelInspectorControlProps, 'controlMeta' | 'boton' | 'hermanosPerilla'>,
): { botones: (ButtonConfig | undefined)[]; seleccionado: number } | null {
  const { controlMeta, boton, hermanosPerilla } = props;
  if (!boton) return null;
  const hermano = hermanosPerilla?.find((h) => h.gesto !== controlMeta?.gesto)?.boton;
  if (controlMeta?.gesto === 'der') return { botones: [hermano, boton], seleccionado: 1 };
  return { botones: [boton, hermano], seleccionado: 0 };
}

function filtrarPresetSinLcd(entrada: PresetHueco[]): PresetHueco[] {
  return entrada.map((h) => ({
    ...h,
    icon: '',
    bgColor: undefined,
    fgColor: undefined,
    iconoCatalogo: undefined,
  }));
}

function useBotonVistaInspector(boton: BotonConCatalogo | undefined, serial?: string | null) {
  const { lista } = useListaPlugins();

  const contexto = useMemo(() => {
    if (!boton) return null;
    return serial ? `${serial}:${boton.id}` : contextoDeBoton(boton.id);
  }, [serial, boton]);

  const refPlugin = useMemo<PluginRef | null>(() => {
    if (!contexto || !boton || boton.action.type !== 'plugin' || !boton.action.plugin) return null;
    return {
      pluginUuid: boton.action.plugin.pluginUuid,
      accionUuid: boton.action.plugin.accionUuid,
      contexto,
      ...(boton.action.plugin.settings ? { settings: boton.action.plugin.settings } : {}),
    };
  }, [contexto, boton]);

  useAppearPluginPreview(refPlugin, Boolean(refPlugin));

  const tienePI = useMemo(() => {
    if (!refPlugin) return false;
    const pl = lista.find((p) => p.uuid === refPlugin.pluginUuid);
    const acc = pl?.acciones.find((a) => a.uuid === refPlugin.accionUuid);
    return Boolean(acc?.tienePI);
  }, [lista, refPlugin]);

  const glifo = resolveDotGlyph(boton?.icon);

  return { botonParaVista: boton, glifo, contexto, refPlugin, tienePI };
}

function obtenerSeleccionPlugin(boton: ButtonConfig | undefined): { pluginUuid: string; accionUuid: string } | null {
  if (boton?.action.type === 'plugin' && boton.action.plugin) {
    return { pluginUuid: boton.action.plugin.pluginUuid, accionUuid: boton.action.plugin.accionUuid };
  }
  return null;
}

function CabeceraPanelInspector({
  vd,
  titulo,
  cerrarTexto,
  onCerrar,
}: {
  vd: ReturnType<typeof useTheme>;
  titulo: string;
  cerrarTexto: string;
  onCerrar?: () => void;
}) {
  return (
    <div
      style={{
        padding: vd.space.md,
        borderBottom: `1px solid ${vd.border}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: vd.space.xs,
      }}
    >
      <span
        style={{
          fontSize: 9,
          color: vd.textMuted,
          letterSpacing: 1.5,
          fontFamily: vd.mono,
          textTransform: 'uppercase',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {titulo}
      </span>
      {onCerrar && (
        <button
          type="button"
          onClick={onCerrar}
          title={cerrarTexto}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '2px 4px',
            color: vd.textMuted,
            display: 'inline-flex',
            alignItems: 'center',
            flexShrink: 0,
          }}
        >
          <DotGlyphIcon glyph="CLOSE" size={10} color={vd.textMuted} />
        </button>
      )}
    </div>
  );
}

export function PanelInspectorControl({
  controlMeta,
  boton,
  disabled = false,
  onEditar,
  onAplicarPreset,
  onPrevisualizarPreset,
  ancho,
  onCerrar,
  hermanosPerilla,
  onSelectHueco,
  perilla,
  modoActivo,
  onFijarModos,
  serial,
}: PanelInspectorControlProps) {
  const VD = useTheme();
  const t = useT();
  const w = ancho ?? 290;

  const { botonParaVista, glifo, contexto, refPlugin, tienePI } = useBotonVistaInspector(boton, serial);

  if (!controlMeta) {
    return (
      <LimiteErrorInspector ancho={w} onCerrar={onCerrar}>
        {onAplicarPreset ? (
          <PanelPerfilesPagina
            ancho={w}
            disabled={disabled}
            onAplicar={onAplicarPreset}
            onPrevisualizar={onPrevisualizarPreset}
            onCerrar={onCerrar}
          />
        ) : (
          <PanelVacio vd={VD} texto={t('disp.inspector.ayuda')} ancho={w} onCerrar={onCerrar} t={t} />
        )}
      </LimiteErrorInspector>
    );
  }

  const { nombre, tipo } = obtenerNombreYTipoControl(controlMeta, t);
  const textoAccion = textoAccionSeleccionada(controlMeta, boton, t);
  const pluginHuecos = huecosParaPlugin({ controlMeta, boton, perilla, hermanosPerilla });
  const tieneLcd = Boolean(controlMeta.tieneLcd ?? (controlMeta.control === 'key'));

  const handleAplicarPreset = onAplicarPreset
    ? (entrada: PresetHueco[] | PerfilDock) => {
        onAplicarPreset(!Array.isArray(entrada) || tieneLcd ? entrada : filtrarPresetSinLcd(entrada));
      }
    : undefined;

  const handleElegirPluginDirecto = (carga: CargaArrastrePlugin) => {
    if (!handleAplicarPreset || !pluginHuecos) return;
    handleAplicarPreset(
      construirHuecosSoltarPlugin(pluginHuecos.botones, pluginHuecos.seleccionado, carga),
    );
  };

  const seleccionPluginActual = obtenerSeleccionPlugin(boton);

  return (
    <LimiteErrorInspector ancho={w} onCerrar={onCerrar}>
      <aside
        style={{
          width: w,
          minWidth: w,
          maxWidth: w,
          background: VD.surface,
          borderLeft: `1px solid ${VD.border}`,
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
          height: '100%',
          overflow: 'hidden',
        }}
      >
        <CabeceraPanelInspector
          vd={VD}
          titulo={t('disp.inspector.titulo')}
          cerrarTexto={t('disp.cerrar')}
          onCerrar={onCerrar}
        />

        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: VD.space.lg,
            display: 'flex',
            flexDirection: 'column',
            gap: VD.space.md,
          }}
        >
          {tieneLcd ? (
            <MiniPreview
              boton={botonParaVista}
              glifo={glifo}
              nombreControl={nombre}
              controlTipo={controlMeta.control}
              vd={VD}
              vacioTexto={t('disp.vacio')}
              contexto={contexto}
            />
          ) : (
            <AvisoControlSinLcd vd={VD} texto={t('disp.inspector.sinLcd')} />
          )}

          {/* Tipo de control */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 8.5, color: VD.textMuted, fontFamily: VD.mono, textTransform: 'uppercase', letterSpacing: 1 }}>
              {t('disp.inspector.tipo')}
            </label>
            <div
              style={{
                fontSize: 10,
                color: VD.text,
                fontFamily: VD.mono,
                background: VD.elevated,
                border: `1px solid ${VD.border}`,
                borderRadius: VD.radius.sm,
                padding: `${VD.space.xs}px ${VD.space.sm}px`,
              }}
            >
              {tipo}
            </div>
          </div>

          {/* Acción configurada */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 8.5, color: VD.textMuted, fontFamily: VD.mono, textTransform: 'uppercase', letterSpacing: 1 }}>
              {t('disp.inspector.accion')}
            </label>
            <FilaAccion
              boton={boton}
              vd={VD}
              textoAccion={textoAccion}
            />
            {refPlugin && tienePI && (
              <div style={{ marginTop: 4 }}>
                <BotonConfigurarPlugin pluginRef={refPlugin} puede={true} />
              </div>
            )}
          </div>

          {/* Perilla multimodo (T-HW-19): sus modos y cuál está activo. */}
          <SeccionModos
            controlMeta={controlMeta}
            perilla={perilla}
            modoActivo={modoActivo}
            disabled={disabled}
            onFijarModos={onFijarModos}
          />

          {/* Si el control es una perilla: los otros dos gestos hermanos */}
          {controlMeta.control === 'knob' && hermanosPerilla && hermanosPerilla.length > 0 && (
            <ListaHermanosPerilla
              hermanos={hermanosPerilla}
              onSelectHueco={onSelectHueco}
              vd={VD}
              t={t}
            />
          )}

          {/* Botón para editar acción en EditorB */}
          <div style={{ marginTop: onAplicarPreset ? 0 : 'auto', paddingTop: VD.space.md, borderTop: `1px solid ${VD.border}` }}>
            <BotonEditar
              disabled={disabled}
              onEditar={onEditar}
              vd={VD}
              texto={t('disp.editar')}
            />
          </div>

          {/* Selector de presets si viene la prop */}
          {handleAplicarPreset && (
            <div style={{ paddingTop: VD.space.md, borderTop: `1px solid ${VD.border}` }}>
              <SelectorPresetsControl
                control={controlMeta.control}
                onAplicar={handleAplicarPreset}
                onPrevisualizar={onPrevisualizarPreset}
                disabled={disabled}
              />
            </div>
          )}

          {/* Catálogo lateral arrastrable de plugins (estilo Stream Deck) */}
          {handleAplicarPreset && (
            <div style={{ paddingTop: VD.space.md, borderTop: `1px solid ${VD.border}` }}>
              <CatalogoPluginsArrastrable
                disabled={disabled}
                seleccionActual={seleccionPluginActual}
                onElegirAccion={handleElegirPluginDirecto}
              />
            </div>
          )}
        </div>
      </aside>
    </LimiteErrorInspector>
  );
}
