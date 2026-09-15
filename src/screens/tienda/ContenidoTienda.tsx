import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTheme } from '../../utils/theme';
import { useT } from '../../utils/i18n';
import type {
  EntradaGaleria, ResumenRiesgo, InstaladoTienda, OrigenInstalacion, PedidoTienda, ResultadoTienda,
} from '../../types';
import { estiloEntradaAjustes, estiloBotonMiniAjustes } from '../../components/settings/settingHelpers';
import { BarraTienda } from './BarraTienda';
import { ListaTienda } from './ListaTienda';
import { FichaTienda } from './FichaTienda';
import {
  FILTROS_VACIOS, estadoDeEntrada, filtrarEntradas,
  appsDeEntradas, tagsDeEntradas, type FiltrosTienda,
} from './tiendaUtils';
import { GALERIA_OFICIAL, versionMayor } from '../../utils/galeriaComun';

interface Elegido {
  entrada: EntradaGaleria;
  perfil: unknown;
  riesgo: ResumenRiesgo;
  estado: 'nuevo' | 'instalado' | 'update';
  versionInstalada?: string;
  readme: { texto?: string; error?: string; cargando: boolean } | null;
}

/**
 * El cuerpo de la tienda: manifiesto, filtros, lista con estados y ficha.
 *
 * La tienda lee y pide, no aplica: el pedido de instalar viaja a la ventana
 * principal (`tienda:importar`), que valida con sus funciones y responde
 * (`tienda:hecho`). La respuesta tarda lo que tarde el usuario... no, tarda
 * lo que tarde el IPC: si en 10 s no hay respuesta, se dice.
 */
export function ContenidoTienda({ instalados, accent }: {
  instalados: InstaladoTienda[];
  accent: string;
}) {
  const VD = useTheme();
  const t = useT();
  const api = window.electronAPI;
  const inputStyle = estiloEntradaAjustes(VD);
  const miniBtn = (c: string) => estiloBotonMiniAjustes(VD, c);

  const [url, setUrl] = useState('');
  const [manifestUrl, setManifestUrl] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [lista, setLista] = useState<EntradaGaleria[] | null>(null);
  const [versionApp, setVersionApp] = useState<string | null>(null);
  const [filtros, setFiltros] = useState<FiltrosTienda>(FILTROS_VACIOS);
  const [elegido, setElegido] = useState<Elegido | null>(null);

  // Quien espera la respuesta de la principal a un pedido de instalar.
  const esperaRef = useRef<((r: ResultadoTienda) => void) | null>(null);
  useEffect(() => {
    if (!api?.tienda) return;
    return api.tienda.onHecho((r) => {
      esperaRef.current?.(r);
      esperaRef.current = null;
    });
  }, [api]);

  const pedir = (pedido: PedidoTienda): Promise<ResultadoTienda> => new Promise((resolve) => {
    esperaRef.current = resolve;
    api?.tienda.importar(pedido).catch(() => {
      esperaRef.current = null;
      resolve({ ok: false, error: t('tienda.timeout') });
    });
    window.setTimeout(() => {
      if (!esperaRef.current) return;
      esperaRef.current = null;
      resolve({ ok: false, error: t('tienda.timeout') });
    }, 10000);
  });

  const cargar = async (dir?: string) => {
    const donde = (dir ?? url).trim();
    if (!api?.gallery || !donde) return;
    if (dir) setUrl(dir);
    setCargando(true); setError(null); setAviso(null); setLista(null); setElegido(null);
    setFiltros(FILTROS_VACIOS);
    const [r, v] = await Promise.all([
      api.gallery.manifest(donde),
      versionApp ?? api.app.getVersion().catch(() => ''),
    ]);
    if (typeof v === 'string' && v) setVersionApp(v);
    setCargando(false);
    if (!r.ok || !r.profiles) { setError(t('gal.failed', { error: r.error ?? '?' })); return; }
    if (r.profiles.length === 0) { setError(t('gal.empty')); return; }
    setManifestUrl(donde);
    setLista(r.profiles);
  };

  const mirar = async (e: EntradaGaleria) => {
    if (!api?.gallery) return;
    const v = versionApp ?? await api.app.getVersion().catch(() => '');
    if (v) setVersionApp(v);
    if (e.minAppVersion && v && versionMayor(e.minAppVersion, v)) {
      setError(t('gal.needsUpdate', { version: e.minAppVersion }));
      return;
    }
    setCargando(true); setError(null); setAviso(null);
    const r = await api.gallery.profile(e.url);
    if (!r.ok || !r.riesgo) {
      setCargando(false);
      setError(t('gal.failed', { error: r.error ?? '?' }));
      return;
    }
    const { estado, instalado } = estadoDeEntrada(e, instalados, manifestUrl);
    setElegido({
      entrada: e, perfil: r.perfil, riesgo: r.riesgo, estado,
      versionInstalada: instalado?.version,
      readme: e.readme ? { texto: e.readme, cargando: false } : e.readmeUrl ? { cargando: true } : null,
    });
    setCargando(false);
    if (!e.readme && e.readmeUrl) {
      const rr = await api.gallery.readme(e.readmeUrl);
      setElegido((prev) => {
        if (!prev || prev.entrada.id !== e.id) return prev;
        return {
          ...prev,
          readme: rr.ok ? { texto: rr.texto ?? '', cargando: false } : { error: rr.error ?? '?', cargando: false },
        };
      });
    }
  };

  const origenDe = (e: EntradaGaleria): OrigenInstalacion => ({
    manifestUrl: manifestUrl || undefined, entryId: e.id, version: e.version,
  });

  const instalarPerfil = async (agregarAlDeck: boolean) => {
    if (!elegido) return;
    const r = await pedir({
      kind: 'profile', profile: elegido.perfil, label: elegido.entrada.label,
      origen: origenDe(elegido.entrada), agregarAlDeck,
    });
    if (!r.ok) { setError(r.error ?? '?'); return; }
    setElegido(null);
    setAviso(t('tienda.doneProfile'));
  };

  const instalarPagina = async () => {
    if (!elegido) return;
    const traido = elegido.perfil as { page?: unknown; buttons?: unknown };
    const r = await pedir({
      kind: 'page', page: traido?.page,
      buttons: traido?.buttons,
      origen: origenDe(elegido.entrada),
    });
    if (!r.ok) { setError(r.error ?? '?'); return; }
    setElegido(null);
    setAviso((r.limpiados ?? 0) > 0
      ? t('gal.hotkeysStripped', { n: r.limpiados ?? 0 })
      : t('tienda.donePage'));
  };

  const filtrada = useMemo(
    () => (lista ? filtrarEntradas(lista, filtros) : []),
    [lista, filtros],
  );
  const updates = useMemo(
    () => (lista ?? []).filter((e) => estadoDeEntrada(e, instalados, manifestUrl).estado === 'update').length,
    [lista, instalados, manifestUrl],
  );
  const menudo: React.CSSProperties = { fontFamily: VD.mono, fontSize: 8, color: VD.textMuted, lineHeight: 1.6 };

  return (
    <div style={{ maxWidth: 920, margin: '0 auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ fontFamily: VD.mono, fontSize: 12, color: VD.text, letterSpacing: 2 }}>
          {t('tienda.title')}
        </div>
        {updates > 0 && (
          <div style={{ ...menudo, color: VD.warning, border: `1px solid ${VD.warning}`, borderRadius: VD.radius.sm, padding: '1px 7px' }}>
            {t('tienda.updates', { n: updates })}
          </div>
        )}
        <div style={{ flex: 1 }} />
        <button onClick={() => api?.tienda.close()} style={miniBtn(VD.textMuted)}>
          {t('tienda.close')}
        </button>
      </div>

      <div style={{ display: 'flex', gap: 6 }}>
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') cargar(); }}
          placeholder="https://…/manifest.json"
          style={{ ...inputStyle, flex: 1 }}
        />
        <button onClick={() => cargar()} disabled={cargando || !url.trim()} style={miniBtn(accent)}>
          {t(cargando ? 'gal.loading' : 'gal.load')}
        </button>
        <button onClick={() => cargar(GALERIA_OFICIAL)} disabled={cargando} style={miniBtn(accent)}>
          {t('gal.official')}
        </button>
      </div>
      <div style={menudo}>{t('tienda.hint')}</div>
      {error && <div style={{ ...menudo, color: VD.danger }}>{error}</div>}
      {aviso && <div style={menudo}>{aviso}</div>}

      {lista && !elegido && (
        <>
          <BarraTienda
            filtros={filtros}
            apps={appsDeEntradas(lista)}
            tags={tagsDeEntradas(lista)}
            total={filtrada.length}
            onFiltros={setFiltros}
            onLimpiar={() => setFiltros(FILTROS_VACIOS)}
          />
          <ListaTienda
            lista={filtrada}
            instalados={instalados}
            manifestUrl={manifestUrl}
            elegidoId={null}
            onMirar={mirar}
          />
        </>
      )}

      {elegido && (
        <FichaTienda
          entrada={elegido.entrada}
          riesgo={elegido.riesgo}
          estado={elegido.estado}
          versionInstalada={elegido.versionInstalada}
          readme={elegido.readme}
          puedeAgregarPagina
          onInstalarPerfil={instalarPerfil}
          onInstalarPagina={instalarPagina}
          onCerrar={() => setElegido(null)}
        />
      )}
    </div>
  );
}
