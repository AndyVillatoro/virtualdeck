import React, { useState } from 'react';
import { useTheme } from '../../utils/theme';
import { useT } from '../../utils/i18n';
import type { EntradaGaleria, ResumenRiesgo, Profile, PageConfig, ButtonConfig, OrigenInstalacion } from '../../types';
import { SettingLabel, estiloEntradaAjustes, estiloBotonMiniAjustes } from './settingHelpers';
import { FilaEntradaGaleria } from './FilaEntradaGaleria';
import { FichaRiesgoGaleria } from './FichaRiesgoGaleria';
import { tiposDesconocidos } from '../../utils/configMigration';

/** Compara semver simple: "1.2.0" > "0.12.0". Las partes no numéricas valen 0. */
function versionMayor(a: string, b: string): boolean {
  const pa = a.split('.').map((x) => parseInt(x, 10) || 0);
  const pb = b.split('.').map((x) => parseInt(x, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pa[i] ?? 0) > (pb[i] ?? 0);
  }
  return false;
}

/**
 * La galería de perfiles (6.1): traerse el deck de otra persona.
 *
 * Lo importante de esta pantalla no es la lista: es el paso de en medio.
 * **Un perfil no son datos, es código que se ejecutará cuando pulses un
 * botón** — programas que lanza, scripts de PowerShell, atajos globales que
 * registra en todo el sistema. Antes de importar se enseña esa lista entera,
 * sin recortar: si el perfil trae treinta scripts, se ven los treinta.
 *
 * Se importa **como perfil**, no como configuración: el deck que ya tienes no
 * se toca, y para probarlo hay que cargarlo a mano desde la lista de perfiles.
 */
/**
 * La galería que mantiene el proyecto. Se lee igual que cualquier otra: por
 * `manifest.json`, y pasando por el mismo aviso de lo que el perfil ejecuta.
 * Tener una por defecto no la convierte en de fiar — solo ahorra teclearla.
 *
 * Va por `raw.githubusercontent.com` y no por Pages: el repo no tiene Pages
 * activado, y el archivo crudo se sirve igual sin depender de eso.
 */
const GALERIA_OFICIAL =
  'https://raw.githubusercontent.com/AndyVillatoro/virtualdeck-gallery/main/manifest.json';

export function GallerySection({
  accent, onImportar, onAppendPage,
}: {
  accent: string;
  onImportar: (p: Profile, agregarAlDeck?: boolean) => void;
  /** Tienda (T-P4): agrega una página suelta; devuelve atajos limpiados por choque. */
  onAppendPage?: (page: PageConfig, buttons: ButtonConfig[], origen?: OrigenInstalacion) => number;
}) {
  const VD = useTheme();
  const t = useT();
  const inputStyleSettings = estiloEntradaAjustes(VD);
  const miniBtn = (c: string) => estiloBotonMiniAjustes(VD, c);
  const api = window.electronAPI;

  const [url, setUrl] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [lista, setLista] = useState<EntradaGaleria[] | null>(null);
  const [versionApp, setVersionApp] = useState<string | null>(null);
  const [elegido, setElegido] = useState<{ entrada: EntradaGaleria; perfil: unknown; riesgo: ResumenRiesgo } | null>(null);

  const cargar = async (dir?: string) => {
    const donde = (dir ?? url).trim();
    if (!api?.gallery || !donde) return;
    if (dir) setUrl(dir);
    setCargando(true); setError(null); setAviso(null); setLista(null); setElegido(null);
    const [r, v] = await Promise.all([
      api.gallery.manifest(donde),
      versionApp ?? api.app.getVersion().catch(() => ''),
    ]);
    if (typeof v === 'string' && v) setVersionApp(v);
    setCargando(false);
    if (!r.ok || !r.profiles) { setError(t('gal.failed', { error: r.error ?? '?' })); return; }
    if (r.profiles.length === 0) { setError(t('gal.empty')); return; }
    setLista(r.profiles);
  };

  const mirar = async (e: EntradaGaleria) => {
    if (!api?.gallery) return;
    // Una entrada que pide una app más nueva se avisa antes de descargar.
    const v = versionApp ?? await api.app.getVersion().catch(() => '');
    if (v) setVersionApp(v);
    if (e.minAppVersion && v && versionMayor(e.minAppVersion, v)) {
      setError(t('gal.needsUpdate', { version: e.minAppVersion }));
      return;
    }
    setCargando(true); setError(null); setAviso(null);
    const r = await api.gallery.profile(e.url);
    setCargando(false);
    if (!r.ok || !r.riesgo) { setError(t('gal.failed', { error: r.error ?? '?' })); return; }
    setElegido({ entrada: e, perfil: r.perfil, riesgo: r.riesgo });
  };

  const origenDe = (e: EntradaGaleria): OrigenInstalacion => ({
    manifestUrl: url || undefined, entryId: e.id, version: e.version,
  });

  const importar = (agregarAlDeck: boolean = false) => {
    if (!elegido) return;
    const p = elegido.perfil as { pages?: unknown; buttons?: unknown; accent?: string; wallpaper?: unknown };
    if (!Array.isArray(p.pages) || !Array.isArray(p.buttons)) { setError(t('gal.notADeck')); return; }
    // Que tenga la forma de un deck no basta: un tipo de accion que esta
    // aplicacion no conoce entra igual y falla al pulsar el boton, uno por uno.
    const malos = tiposDesconocidos(p.buttons);
    if (malos.length > 0) { setError(t('gal.unknownTypes', { tipos: malos.join(', ') })); return; }
    onImportar({
      id: `gal_${elegido.entrada.id}_${Date.now()}`,
      name: elegido.entrada.label,
      pages: p.pages as Profile['pages'],
      buttons: p.buttons as Profile['buttons'],
      accent: p.accent ?? accent,
      wallpaper: p.wallpaper as Profile['wallpaper'],
      origen: origenDe(elegido.entrada),
    }, agregarAlDeck);
    setElegido(null);
  };

  /** Tienda (T-P4): una entrada kind 'page' trae {page, buttons} y se agrega como página nueva. */
  const importarPagina = () => {
    if (!elegido || !onAppendPage) return;
    const p = elegido.perfil as { page?: unknown; buttons?: unknown };
    if (!p.page || typeof p.page !== 'object' || !Array.isArray(p.buttons)) { setError(t('gal.notAPage')); return; }
    const malos = tiposDesconocidos(p.buttons);
    if (malos.length > 0) { setError(t('gal.unknownTypes', { tipos: malos.join(', ') })); return; }
    const limpiados = onAppendPage(
      p.page as PageConfig, p.buttons as ButtonConfig[], origenDe(elegido.entrada),
    );
    setElegido(null);
    setAviso(limpiados > 0 ? t('gal.hotkeysStripped', { n: limpiados }) : null);
  };

  const menudo: React.CSSProperties = { fontFamily: VD.mono, fontSize: 8, color: VD.textMuted, lineHeight: 1.6 };

  return (
    <div>
      <SettingLabel>{t('set.gallery')}</SettingLabel>
      <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') cargar(); }}
            placeholder="https://…/manifest.json"
            style={{ ...inputStyleSettings, flex: 1 }}
          />
          <button onClick={() => cargar()} disabled={cargando || !url.trim()} style={miniBtn(accent)}>
            {t(cargando ? 'gal.loading' : 'gal.load')}
          </button>
        </div>
        <button onClick={() => cargar(GALERIA_OFICIAL)} disabled={cargando} style={{ ...miniBtn(accent), alignSelf: 'flex-start' }}>
          {t('gal.official')}
        </button>
        <div style={menudo}>{t('gal.hint')}</div>
        {error && <div style={{ ...menudo, color: VD.danger }}>{error}</div>}
        {aviso && <div style={menudo}>{aviso}</div>}

        {lista && !elegido && lista.map((e) => (
          <FilaEntradaGaleria key={e.id} entrada={e} onMirar={mirar} />
        ))}

        {elegido && (
          <FichaRiesgoGaleria
            entrada={elegido.entrada}
            riesgo={elegido.riesgo}
            puedeAgregarPagina={!!onAppendPage}
            onImportar={importar}
            onImportarPagina={importarPagina}
            onCerrar={() => setElegido(null)}
          />
        )}
      </div>
    </div>
  );
}
