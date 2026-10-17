import React, { useCallback, useEffect, useState } from 'react';
import { useTheme } from '../../utils/theme';
import { useT } from '../../utils/i18n';
import type { CodigoInstalacion, EstadoPlugin, PluginInfo } from '../../types';
import { DotGlyphIcon } from '../dot480/DotGlyphIcon';
import { BotonIcono } from '../ui/BotonIcono';
import { Modal } from '../ui/Modal';
import { estiloBotonMiniAjustes, SettingLabel } from './settingHelpers';
import { textoSobre } from '../../comun/contraste';

function colorDeEstado(estado: EstadoPlugin, VD: ReturnType<typeof useTheme>): string {
  switch (estado) {
    case 'running': return VD.success;
    case 'starting': return VD.warning;
    case 'error': return VD.danger;
    case 'stopped':
    default: return VD.textMuted;
  }
}

function textoDeEstado(estado: EstadoPlugin, t: (k: string) => string): string {
  switch (estado) {
    case 'running': return t('plugins.statusRunning');
    case 'starting': return t('plugins.statusStarting');
    case 'error': return t('plugins.statusError');
    case 'stopped':
    default: return t('plugins.statusStopped');
  }
}

function mensajeErrorInstalacion(
  codigo: CodigoInstalacion,
  detalle: string | undefined,
  t: (k: string, vars?: Record<string, string | number>) => string,
): string {
  switch (codigo) {
    case 'zip': return t('plugins.errZip');
    case 'tamano': return t('plugins.errSize');
    case 'cifrado': return t('plugins.errEncrypted');
    case 'invalido': return detalle ? `${t('plugins.errInvalid')} (${detalle})` : t('plugins.errInvalid');
    case 'os': return t('plugins.errOs');
    case 'exe': return t('plugins.errExe');
    case 'duplicado': return t('plugins.errDuplicate');
    case 'cancelado': return '';
    default: return t('plugins.errGeneric');
  }
}

function ConmutadorMini({ valor, accent, title, onClick }: { valor: boolean; accent: string; title: string; onClick: () => void }) {
  const VD = useTheme();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={valor}
      title={title}
      onClick={onClick}
      style={{
        width: 28, height: 16, borderRadius: 8, cursor: 'pointer',
        background: valor ? accent : VD.elevated, border: `1px solid ${valor ? accent : VD.border}`,
        position: 'relative', transition: 'background 0.2s, border-color 0.2s', flexShrink: 0, padding: 0,
      }}
    >
      <span style={{
        position: 'absolute', top: 1, left: valor ? 13 : 1, width: 12, height: 12,
        borderRadius: '50%', background: valor ? VD.onAccent : VD.textDim,
        transition: 'left 0.2s', display: 'block',
      }} />
    </button>
  );
}

function FilaEstadoPlugin({ plugin }: { plugin: PluginInfo }) {
  const VD = useTheme();
  const t = useT();
  const color = colorDeEstado(plugin.estado, VD);
  const texto = textoDeEstado(plugin.estado, t);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }} />
      <span style={{ fontFamily: VD.mono, fontSize: 8, color, letterSpacing: 0.5 }}>{texto}</span>
      {plugin.error && (
        <span
          title={plugin.error}
          style={{
            fontFamily: VD.mono, fontSize: 8, color: VD.danger,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140,
          }}
        >
          ({plugin.error})
        </span>
      )}
    </div>
  );
}

function TarjetaPlugin({
  plugin, accent, onAlternar, onPedirDesinstalar,
}: {
  plugin: PluginInfo; accent: string;
  onAlternar: (p: PluginInfo) => void;
  onPedirDesinstalar: (p: PluginInfo) => void;
}) {
  const VD = useTheme();
  const t = useT();
  const numAcciones = plugin.acciones.length;
  const textoAcciones = numAcciones === 1 ? t('plugins.actionOne') : t('plugins.actionMany', { n: numAcciones });

  return (
    <div style={{
      background: VD.elevated, border: `1px solid ${VD.border}`,
      borderRadius: VD.radius.md, padding: '8px 10px',
      display: 'flex', flexDirection: 'column', gap: 6,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div
          title={plugin.nombre}
          style={{
            fontFamily: VD.mono, fontSize: 9, fontWeight: 700, color: VD.text,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
          }}
        >
          {plugin.nombre}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <ConmutadorMini
            valor={plugin.habilitado}
            accent={accent}
            title={plugin.habilitado ? t('plugins.disable') : t('plugins.enable')}
            onClick={() => onAlternar(plugin)}
          />
          <BotonIcono
            glifo="TRASH"
            title={t('plugins.uninstallHint')}
            peligro
            tamano={20}
            tamanoGlifo={10}
            onClick={() => onPedirDesinstalar(plugin)}
          />
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <span style={{ fontFamily: VD.mono, fontSize: 8, color: VD.textDim }}>v{plugin.version}</span>
        <span style={{
          padding: '1px 4px', borderRadius: VD.radius.sm, background: VD.overlay,
          border: `1px solid ${VD.borderStrong}`, color: VD.textDim, fontFamily: VD.mono, fontSize: 7, letterSpacing: 0.5,
        }}>
          {plugin.tipo.toUpperCase()}
        </span>
        <span style={{ fontFamily: VD.mono, fontSize: 8, color: VD.textMuted }}>·</span>
        <span style={{ fontFamily: VD.mono, fontSize: 8, color: VD.textDim }}>{textoAcciones}</span>
      </div>

      <FilaEstadoPlugin plugin={plugin} />
    </div>
  );
}

function ZonaArrastrePlugin({
  accent, cargando, arrastrando, onPedirInstalar, onDragOver, onDragLeave, onDrop,
}: {
  accent: string; cargando: boolean; arrastrando: boolean;
  onPedirInstalar: () => void;
  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragLeave: (e: React.DragEvent<HTMLDivElement>) => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
}) {
  const VD = useTheme();
  const t = useT();

  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={onPedirInstalar}
      title={t('plugins.dropZone')}
      style={{
        border: `1px dashed ${arrastrando ? accent : VD.borderStrong}`,
        background: arrastrando ? VD.accentBg : VD.elevated,
        borderRadius: VD.radius.md, padding: '12px 8px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 6, textAlign: 'center', cursor: cargando ? 'not-allowed' : 'pointer',
        transition: 'border-color 0.15s, background 0.15s', opacity: cargando ? 0.6 : 1,
      }}
    >
      <DotGlyphIcon glyph="IMPORT" size={16} color={arrastrando ? accent : VD.textDim} />
      <div style={{ fontFamily: VD.mono, fontSize: 8, color: arrastrando ? accent : VD.textDim, lineHeight: 1.4 }}>
        {arrastrando ? t('plugins.dropZoneActive') : t('plugins.dropZone')}
      </div>
    </div>
  );
}

function ModalAvisoRiesgo({
  datos, accent, onConfirmar, onCerrar,
}: {
  datos: { ruta?: string; nombre?: string }; accent: string;
  onConfirmar: () => void; onCerrar: () => void;
}) {
  const VD = useTheme();
  const t = useT();

  return (
    <Modal onClose={onCerrar} zIndex={300} ancho="min(380px, 92vw)">
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <DotGlyphIcon glyph="WARN" size={16} color={VD.warning} />
          <span style={{ fontFamily: VD.mono, fontSize: 11, fontWeight: 700, color: VD.text }}>
            {t('plugins.installModalTitle')}
          </span>
        </div>

        {datos.nombre && (
          <div style={{
            background: VD.elevated, border: `1px solid ${VD.border}`,
            borderRadius: VD.radius.sm, padding: '6px 8px',
            fontFamily: VD.mono, fontSize: 8, color: VD.text, wordBreak: 'break-all',
          }}>
            {t('plugins.fileToInstall', { name: datos.nombre })}
          </div>
        )}

        <div style={{
          fontFamily: VD.mono, fontSize: 9, color: VD.textDim, lineHeight: 1.5,
          background: VD.elevated, border: `1px solid ${VD.borderStrong}`,
          borderRadius: VD.radius.sm, padding: '8px 10px',
        }}>
          {t('plugins.riskNotice')}
        </div>

        <div style={{ fontFamily: VD.mono, fontSize: 8, color: VD.textMuted, lineHeight: 1.4 }}>
          {t('plugins.marketplaceWarning')}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
          <button
            type="button"
            onClick={onCerrar}
            title={t('plugins.cancel')}
            style={{
              padding: '6px 12px', background: 'transparent', border: `1px solid ${VD.border}`,
              color: VD.textDim, fontFamily: VD.mono, fontSize: 8, cursor: 'pointer',
              borderRadius: VD.radius.sm, letterSpacing: 1,
            }}
          >
            {t('plugins.cancel')}
          </button>
          <button
            type="button"
            onClick={onConfirmar}
            title={datos.ruta ? t('plugins.acceptAndInstall') : t('plugins.acceptAndChoose')}
            style={{
              padding: '6px 12px', background: accent, border: `1px solid ${accent}`,
              color: VD.onAccent, fontFamily: VD.mono, fontSize: 8, fontWeight: 700,
              cursor: 'pointer', borderRadius: VD.radius.sm, letterSpacing: 1,
            }}
          >
            {datos.ruta ? t('plugins.acceptAndInstall') : t('plugins.acceptAndChoose')}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function ModalConfirmarDesinstalacion({
  plugin, onConfirmar, onCerrar,
}: {
  plugin: PluginInfo; onConfirmar: () => void; onCerrar: () => void;
}) {
  const VD = useTheme();
  const t = useT();

  return (
    <Modal onClose={onCerrar} zIndex={300} ancho="min(360px, 92vw)">
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <DotGlyphIcon glyph="TRASH" size={16} color={VD.danger} />
          <span style={{ fontFamily: VD.mono, fontSize: 11, fontWeight: 700, color: VD.text }}>
            {t('plugins.uninstallModalTitle')}
          </span>
        </div>

        <div style={{ fontFamily: VD.mono, fontSize: 9, color: VD.textDim, lineHeight: 1.5 }}>
          {t('plugins.uninstallConfirm', { name: plugin.nombre })}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
          <button
            type="button"
            onClick={onCerrar}
            title={t('plugins.cancel')}
            style={{
              padding: '6px 12px', background: 'transparent', border: `1px solid ${VD.border}`,
              color: VD.textDim, fontFamily: VD.mono, fontSize: 8, cursor: 'pointer',
              borderRadius: VD.radius.sm, letterSpacing: 1,
            }}
          >
            {t('plugins.cancel')}
          </button>
          <button
            type="button"
            onClick={onConfirmar}
            title={t('plugins.uninstall')}
            style={{
              padding: '6px 12px', background: VD.danger, border: `1px solid ${VD.danger}`,
              color: textoSobre(VD.danger), fontFamily: VD.mono, fontSize: 8, fontWeight: 700,
              cursor: 'pointer', borderRadius: VD.radius.sm, letterSpacing: 1,
            }}
          >
            {t('plugins.uninstall')}
          </button>
        </div>
      </div>
    </Modal>
  );
}

export function PluginsSection({ accent }: { accent: string }) {
  const VD = useTheme();
  const t = useT();

  const [plugins, setPlugins] = useState<PluginInfo[]>([]);
  const [cargando, setCargando] = useState(false);
  const [errorInstalacion, setErrorInstalacion] = useState<string | null>(null);
  const [arrastrando, setArrastrando] = useState(false);
  const [modalInstalar, setModalInstalar] = useState<{ ruta?: string; nombre?: string } | null>(null);
  const [pluginADesinstalar, setPluginADesinstalar] = useState<PluginInfo | null>(null);

  useEffect(() => {
    const api = window.electronAPI?.plugins;
    if (!api) return undefined;
    api.list().then(setPlugins).catch(() => {});
    return api.onChanged(setPlugins);
  }, []);

  const pedirInstalar = useCallback(() => {
    setModalInstalar({});
  }, []);

  const alternarHabilitado = useCallback(async (p: PluginInfo) => {
    const api = window.electronAPI?.plugins;
    if (!api) return;
    try {
      await api.setEnabled(p.uuid, !p.habilitado);
      api.list().then(setPlugins).catch(() => {});
    } catch {}
  }, []);

  const confirmarInstalacion = useCallback(async () => {
    if (!modalInstalar) return;
    const ruta = modalInstalar.ruta;
    setModalInstalar(null);
    const api = window.electronAPI?.plugins;
    if (!api) return;

    setCargando(true);
    setErrorInstalacion(null);
    try {
      const res = await api.install(ruta);
      if ('codigo' in res) {
        if (res.codigo !== 'cancelado') {
          setErrorInstalacion(mensajeErrorInstalacion(res.codigo, res.detalle, t));
        }
      } else {
        setErrorInstalacion(null);
        api.list().then(setPlugins).catch(() => {});
      }
    } catch {
      setErrorInstalacion(t('plugins.errGeneric'));
    } finally {
      setCargando(false);
    }
  }, [modalInstalar, t]);

  const confirmarDesinstalacion = useCallback(async () => {
    if (!pluginADesinstalar) return;
    const api = window.electronAPI?.plugins;
    const uuid = pluginADesinstalar.uuid;
    setPluginADesinstalar(null);
    if (!api) return;
    try {
      await api.uninstall(uuid);
      api.list().then(setPlugins).catch(() => {});
    } catch {}
  }, [pluginADesinstalar]);

  const manejarDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
    setArrastrando(true);
  }, []);

  const manejarDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setArrastrando(false);
  }, []);

  const manejarDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setArrastrando(false);
    const archivo = e.dataTransfer.files[0] as File | undefined;
    if (!archivo) return;
    const ruta = ('path' in archivo && typeof archivo.path === 'string') ? archivo.path : '';
    setModalInstalar({ ruta: ruta || undefined, nombre: archivo.name || '' });
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <button
        type="button"
        onClick={pedirInstalar}
        disabled={cargando}
        title={t('plugins.installBtnHint')}
        style={{
          ...estiloBotonMiniAjustes(VD, accent),
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 6, padding: '6px 12px', opacity: cargando ? 0.6 : 1,
        }}
      >
        <DotGlyphIcon glyph="ADD" size={8} color={accent} />
        <span>{t('plugins.installBtn')}</span>
      </button>

      <ZonaArrastrePlugin
        accent={accent}
        cargando={cargando}
        arrastrando={arrastrando}
        onPedirInstalar={pedirInstalar}
        onDragOver={manejarDragOver}
        onDragLeave={manejarDragLeave}
        onDrop={manejarDrop}
      />

      {errorInstalacion && (
        <div style={{
          background: VD.elevated, border: `1px solid ${VD.danger}`,
          borderRadius: VD.radius.sm, padding: '6px 8px',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6,
        }}>
          <div style={{ fontFamily: VD.mono, fontSize: 8, color: VD.danger, lineHeight: 1.4, flex: 1 }}>
            {errorInstalacion}
          </div>
          <button
            type="button"
            onClick={() => setErrorInstalacion(null)}
            title={t('plugins.dismissError')}
            style={{
              background: 'transparent', border: 'none', color: VD.textDim,
              cursor: 'pointer', padding: 2, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <DotGlyphIcon glyph="CLOSE" size={8} color={VD.textDim} />
          </button>
        </div>
      )}

      <SettingLabel>{t('plugins.installedList')}</SettingLabel>

      {plugins.length === 0 ? (
        <div style={{
          fontFamily: VD.mono, fontSize: 8, color: VD.textMuted,
          textAlign: 'center', padding: '8px 0',
        }}>
          {t('plugins.empty')}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {plugins.map((p) => (
            <TarjetaPlugin
              key={p.uuid}
              plugin={p}
              accent={accent}
              onAlternar={alternarHabilitado}
              onPedirDesinstalar={setPluginADesinstalar}
            />
          ))}
        </div>
      )}

      {modalInstalar && (
        <ModalAvisoRiesgo
          datos={modalInstalar}
          accent={accent}
          onConfirmar={confirmarInstalacion}
          onCerrar={() => setModalInstalar(null)}
        />
      )}

      {pluginADesinstalar && (
        <ModalConfirmarDesinstalacion
          plugin={pluginADesinstalar}
          onConfirmar={confirmarDesinstalacion}
          onCerrar={() => setPluginADesinstalar(null)}
        />
      )}
    </div>
  );
}
