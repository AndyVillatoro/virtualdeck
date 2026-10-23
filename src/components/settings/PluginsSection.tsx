import React, { useCallback, useEffect, useState } from 'react';
import { useTheme } from '../../utils/theme';
import { useT } from '../../utils/i18n';
import type { CodigoInstalacion, PluginInfo } from '../../types';
import { DotGlyphIcon } from '../dot480/DotGlyphIcon';
import { estiloBotonMiniAjustes, SettingLabel } from './settingHelpers';
import { TarjetaPlugin } from './TarjetaPlugin';
import { ModalAvisoRiesgo, ModalConfirmarDesinstalacion } from './ModalesPlugin';

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
