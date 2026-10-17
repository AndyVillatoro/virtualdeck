import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTheme } from '../../utils/theme';
import { useT } from '../../utils/i18n';
import { useFormatoPantalla } from '../../utils/useFormatoPantalla';
import type {
  EntradaGaleria,
  InstaladoTienda,
  OrigenInstalacion,
  PedidoTienda,
  PluginInfo,
  ResumenRiesgo,
  ResultadoTienda,
} from '../../types';
import { BarraTienda } from './BarraTienda';
import { ListaTienda } from './ListaTienda';
import { FichaTienda } from './FichaTienda';
import { EstadoPluginsTienda } from './EstadoPluginsTienda';
import {
  FILTROS_VACIOS,
  appsDeEntradas,
  construirRiesgoPlugin,
  contarPorTipo,
  deduplicarEntradas,
  elegirDestacados,
  estadoGeneralDeEntrada,
  filtrarEntradas,
  tagsDeEntradas,
  traducirErrorPlugin,
  type EstadoEntrada,
  type FiltrosTienda,
} from './tiendaUtils';
import { GALERIA_OFICIAL, versionMayor } from '../../utils/galeriaComun';
import { deduplicarPlugins } from '../../utils/plugins/deduplicar';
import { AvisosTienda, CabeceraTienda } from './CabeceraTienda';

interface Elegido {
  entrada: EntradaGaleria;
  perfil: unknown;
  riesgo: ResumenRiesgo;
  estado: EstadoEntrada;
  versionInstalada?: string;
  readme: { texto?: string; error?: string; cargando: boolean } | null;
}

/**
 * El cuerpo de la tienda: manifiesto, navegación por pestañas (PERFILES /
 * PÁGINAS / PLUGINS), destacados arriba, rejilla con iconos grandes DOT y ficha
 * detallada con instalación de plugins en un clic.
 */
export function ContenidoTienda({ instalados, accent }: {
  instalados: InstaladoTienda[];
  accent: string;
}) {
  const VD = useTheme();
  const t = useT();
  const api = window.electronAPI;
  const { formato } = useFormatoPantalla();

  const esBarra = formato === 'barra';
  const paddingContenedor = esBarra ? 12 : 20;
  const maxAncho = esBarra ? 1240 : 1120;

  const [url, setUrl] = useState(GALERIA_OFICIAL);
  const [manifestUrl, setManifestUrl] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [lista, setLista] = useState<EntradaGaleria[] | null>(null);
  const [versionApp, setVersionApp] = useState<string | null>(null);
  const [filtros, setFiltros] = useState<FiltrosTienda>(FILTROS_VACIOS);
  const [elegido, setElegido] = useState<Elegido | null>(null);

  const [pluginsInstalados, setPluginsInstalados] = useState<PluginInfo[]>([]);
  const [instalandoPlugin, setInstalandoPlugin] = useState(false);
  const [errorPlugin, setErrorPlugin] = useState<string | null>(null);

  const esperaRef = useRef<((r: ResultadoTienda) => void) | null>(null);
  const cargandoUrlRef = useRef<string | null>(null);
  const iniciadoRef = useRef(false);

  useEffect(() => {
    if (!api?.tienda) return undefined;
    return api.tienda.onHecho((r) => {
      esperaRef.current?.(r);
      esperaRef.current = null;
    });
  }, [api]);

  useEffect(() => {
    const apiPlugins = api?.plugins;
    if (!apiPlugins) return undefined;
    const poner = (p: PluginInfo[]) => setPluginsInstalados(deduplicarPlugins(p));
    apiPlugins.list().then(poner).catch(() => {});
    return apiPlugins.onChanged(poner);
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

  const cargar = useCallback(async (dir?: string) => {
    const donde = (dir ?? url).trim();
    if (!api?.gallery || !donde) return;
    if (dir) setUrl(dir);
    if (cargandoUrlRef.current === donde) return;
    cargandoUrlRef.current = donde;
    setCargando(true);
    setError(null);
    setAviso(null);
    setElegido(null);
    if (donde !== manifestUrl) setFiltros(FILTROS_VACIOS);
    const [r, v] = await Promise.all([
      api.gallery.manifest(donde),
      versionApp ?? api.app.getVersion().catch(() => ''),
    ]);
    cargandoUrlRef.current = null;
    if (typeof v === 'string' && v) setVersionApp(v);
    setCargando(false);
    if (!r.ok || !r.profiles) { setError(t('gal.failed', { error: r.error ?? '?' })); return; }
    if (r.profiles.length === 0) { setError(t('gal.empty')); return; }
    setManifestUrl(donde);
    setLista(deduplicarEntradas(r.profiles));
  }, [api, url, manifestUrl, versionApp, t]);

  useEffect(() => {
    if (iniciadoRef.current) return;
    iniciadoRef.current = true;
    cargar(GALERIA_OFICIAL);
  }, [cargar]);

  const cargarReadmeOpcional = async (e: EntradaGaleria) => {
    if (e.readme || !e.readmeUrl || !api?.gallery) return;
    const rr = await api.gallery.readme(e.readmeUrl);
    setElegido((prev) => {
      if (!prev || prev.entrada.id !== e.id) return prev;
      return {
        ...prev,
        readme: rr.ok ? { texto: rr.texto ?? '', cargando: false } : { error: rr.error ?? '?', cargando: false },
      };
    });
  };

  const mirar = async (e: EntradaGaleria) => {
    if (!api?.gallery) return;
    const v = versionApp ?? await api.app.getVersion().catch(() => '');
    if (v) setVersionApp(v);
    if (e.minAppVersion && v && versionMayor(e.minAppVersion, v)) {
      setError(t('gal.needsUpdate', { version: e.minAppVersion }));
      return;
    }
    setError(null);
    setAviso(null);
    setErrorPlugin(null);

    const estadoInicial = e. readme
      ? { texto: e.readme, cargando: false }
      : e.readmeUrl
        ? { cargando: true }
        : null;

    if (e.kind === 'plugin') {
      const { estado, versionInstalada } = estadoGeneralDeEntrada(e, instalados, pluginsInstalados, manifestUrl);
      setElegido({
        entrada: e,
        perfil: null,
        riesgo: construirRiesgoPlugin(e, t),
        estado,
        versionInstalada,
        readme: estadoInicial,
      });
      await cargarReadmeOpcional(e);
      return;
    }

    setCargando(true);
    const r = await api.gallery.profile(e.url);
    if (!r.ok || !r.riesgo) {
      setCargando(false);
      setError(t('gal.failed', { error: r.error ?? '?' }));
      return;
    }
    const { estado, versionInstalada } = estadoGeneralDeEntrada(e, instalados, pluginsInstalados, manifestUrl);
    setElegido({
      entrada: e,
      perfil: r.perfil,
      riesgo: r.riesgo,
      estado,
      versionInstalada,
      readme: estadoInicial,
    });
    setCargando(false);
    await cargarReadmeOpcional(e);
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

  const instalarPluginElegido = async () => {
    if (!elegido || elegido.entrada.kind !== 'plugin' || !api?.plugins) return;
    const { entrada } = elegido;
    if (!entrada.url || !entrada.sha256 || !entrada.uuid) {
      setErrorPlugin(t('tienda.errInvalido'));
      return;
    }
    setInstalandoPlugin(true);
    setErrorPlugin(null);
    try {
      const actual = estadoGeneralDeEntrada(entrada, instalados, pluginsInstalados, manifestUrl);
      if (actual.estadoPlugin === 'actualizable') {
        await api.plugins.uninstall(entrada.uuid).catch(() => false);
      }
      const res = await api.plugins.installFromUrl({
        url: entrada.url,
        sha256: entrada.sha256,
        uuid: entrada.uuid,
      });
      if (res.ok === false) {
        if (res.codigo !== 'cancelado') {
          setErrorPlugin(traducirErrorPlugin(res.codigo, res.detalle, t));
        }
      } else {
        const nuevos = await api.plugins.list().catch(() => pluginsInstalados);
        setPluginsInstalados(deduplicarPlugins(nuevos));
        setAviso(t('tienda.donePlugin', { name: entrada.label }));
      }
    } catch {
      setErrorPlugin(t('tienda.errGenerico'));
    } finally {
      setInstalandoPlugin(false);
    }
  };

  const desinstalarPlugin = async (uuid: string, etiqueta: string) => {
    if (!api?.plugins || !uuid) return;
    try {
      const ok = await api.plugins.uninstall(uuid);
      if (ok) {
        const nuevos = await api.plugins.list().catch(() => []);
        setPluginsInstalados(deduplicarPlugins(nuevos));
        setAviso(t('tienda.donePluginUninstalled', { name: etiqueta }));
      }
    } catch {
      /* fallo silencioso o manejado por main */
    }
  };

  const conteos = useMemo(() => contarPorTipo(lista ?? []), [lista]);
  const filtrada = useMemo(
    () => (lista ? filtrarEntradas(lista, filtros) : []),
    [lista, filtros],
  );
  const destacados = useMemo(
    () => elegirDestacados(filtrada),
    [filtrada],
  );
  const updates = useMemo(
    () => (lista ?? []).filter((e) => (
      estadoGeneralDeEntrada(e, instalados, pluginsInstalados, manifestUrl).estado === 'update'
    )).length,
    [lista, instalados, pluginsInstalados, manifestUrl],
  );

  return (
    <div className="vd-scroll" style={{ height: '100%', overflowY: 'auto', background: VD.bg }}>
      <div
        style={{
          maxWidth: maxAncho,
          margin: '0 auto',
          padding: paddingContenedor,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <CabeceraTienda
          url={url}
          accent={accent}
          cargando={cargando}
          updates={updates}
          onUrlChange={setUrl}
          onCargar={() => cargar()}
          onCargarOficial={() => cargar(GALERIA_OFICIAL)}
          onCerrar={() => api?.tienda.close()}
        />

        <AvisosTienda
          error={error}
          aviso={aviso}
          cargandoInicial={Boolean(cargando && !lista && !elegido)}
          onReintentar={() => cargar(url || GALERIA_OFICIAL)}
        />

        <CuerpoPrincipalTienda
          lista={lista}
          filtrada={filtrada}
          destacados={destacados}
          conteos={conteos}
          filtros={filtros}
          instalados={instalados}
          pluginsInstalados={pluginsInstalados}
          manifestUrl={manifestUrl}
          cargando={cargando}
          hayError={Boolean(error)}
          elegido={elegido}
          instalandoPlugin={instalandoPlugin}
          errorPlugin={errorPlugin}
          onFiltros={setFiltros}
          onLimpiarFiltros={() => setFiltros(FILTROS_VACIOS)}
          onRecargar={() => cargar(url || GALERIA_OFICIAL)}
          onMirar={mirar}
          onInstalarPerfil={instalarPerfil}
          onInstalarPagina={instalarPagina}
          onInstalarPlugin={instalarPluginElegido}
          onDesinstalarPlugin={desinstalarPlugin}
          onCerrarFicha={() => { setElegido(null); setErrorPlugin(null); }}
        />
      </div>
    </div>
  );
}


function CuerpoPrincipalTienda({
  lista,
  filtrada,
  destacados,
  conteos,
  filtros,
  instalados,
  pluginsInstalados,
  manifestUrl,
  cargando,
  hayError,
  elegido,
  instalandoPlugin,
  errorPlugin,
  onFiltros,
  onLimpiarFiltros,
  onRecargar,
  onMirar,
  onInstalarPerfil,
  onInstalarPagina,
  onInstalarPlugin,
  onDesinstalarPlugin,
  onCerrarFicha,
}: {
  lista: EntradaGaleria[] | null;
  filtrada: EntradaGaleria[];
  destacados: EntradaGaleria[];
  conteos: Record<'all' | 'profile' | 'page' | 'plugin', number>;
  filtros: FiltrosTienda;
  instalados: InstaladoTienda[];
  pluginsInstalados: PluginInfo[];
  manifestUrl: string;
  cargando: boolean;
  hayError: boolean;
  elegido: Elegido | null;
  instalandoPlugin: boolean;
  errorPlugin: string | null;
  onFiltros: (f: FiltrosTienda) => void;
  onLimpiarFiltros: () => void;
  onRecargar: () => void;
  onMirar: (e: EntradaGaleria) => void;
  onInstalarPerfil: (agregarAlDeck: boolean) => void;
  onInstalarPagina: () => void;
  onInstalarPlugin: () => void;
  onDesinstalarPlugin: (uuid: string, etiqueta: string) => void;
  onCerrarFicha: () => void;
}) {
  if (elegido) {
    const estadoElegido = estadoGeneralDeEntrada(
      elegido.entrada, instalados, pluginsInstalados, manifestUrl,
    );
    const uuidPlugin = elegido.entrada.uuid;
    return (
      <FichaTienda
        entrada={elegido.entrada}
        riesgo={elegido.riesgo}
        estado={estadoElegido.estado}
        estadoPlugin={estadoElegido.estadoPlugin}
        versionInstalada={estadoElegido.versionInstalada}
        readme={elegido.readme}
        puedeAgregarPagina
        instalandoPlugin={instalandoPlugin}
        errorPlugin={errorPlugin}
        onInstalarPerfil={onInstalarPerfil}
        onInstalarPagina={onInstalarPagina}
        onInstalarPlugin={onInstalarPlugin}
        onDesinstalarPlugin={
          uuidPlugin ? () => onDesinstalarPlugin(uuidPlugin, elegido.entrada.label) : undefined
        }
        onCerrar={onCerrarFicha}
      />
    );
  }

  const sinFiltrosSecundarios = filtros.texto.trim() === '' && filtros.app === '' && filtros.tag === '';
  const mostrarEstadoPlugins = filtros.kind === 'plugin' && conteos.plugin === 0 && !cargando;
  const mostrarCatalogo = Boolean(lista && (filtros.kind !== 'plugin' || conteos.plugin > 0));

  return (
    <>
      <BarraTienda
        filtros={filtros}
        conteos={conteos}
        apps={appsDeEntradas(lista ?? [])}
        tags={tagsDeEntradas(lista ?? [], filtros.kind)}
        total={filtrada.length}
        onFiltros={onFiltros}
        onLimpiar={onLimpiarFiltros}
      />

      {mostrarEstadoPlugins && (
        <EstadoPluginsTienda
          sinRed={!lista && hayError}
          pluginsInstalados={pluginsInstalados}
          onRecargar={onRecargar}
          onDesinstalarPlugin={(p) => onDesinstalarPlugin(p.uuid, p.nombre)}
          onVolver={() => onFiltros({ ...filtros, kind: 'all' })}
        />
      )}

      {mostrarCatalogo && (
        <ListaTienda
          lista={filtrada}
          destacados={destacados}
          instalados={instalados}
          pluginsInstalados={pluginsInstalados}
          manifestUrl={manifestUrl}
          elegidoId={null}
          mostrarDestacados={sinFiltrosSecundarios}
          onMirar={onMirar}
          onLimpiarFiltros={onLimpiarFiltros}
        />
      )}
    </>
  );
}
