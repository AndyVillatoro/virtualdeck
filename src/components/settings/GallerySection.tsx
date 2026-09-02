import React, { useState } from 'react';
import { useTheme } from '../../utils/theme';
import { useT } from '../../utils/i18n';
import type { EntradaGaleria, ResumenRiesgo, Profile } from '../../types';
import { SettingLabel, estiloEntradaAjustes, estiloBotonMiniAjustes } from './settingHelpers';

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
export function GallerySection({
  accent, onImportar,
}: {
  accent: string;
  onImportar: (p: Profile) => void;
}) {
  const VD = useTheme();
  const t = useT();
  const inputStyleSettings = estiloEntradaAjustes(VD);
  const miniBtn = (c: string) => estiloBotonMiniAjustes(VD, c);
  const api = window.electronAPI;

  const [url, setUrl] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lista, setLista] = useState<EntradaGaleria[] | null>(null);
  const [elegido, setElegido] = useState<{ entrada: EntradaGaleria; perfil: unknown; riesgo: ResumenRiesgo } | null>(null);

  const cargar = async () => {
    if (!api?.gallery || !url.trim()) return;
    setCargando(true); setError(null); setLista(null); setElegido(null);
    const r = await api.gallery.manifest(url.trim());
    setCargando(false);
    if (!r.ok || !r.profiles) { setError(t('gal.failed', { error: r.error ?? '?' })); return; }
    if (r.profiles.length === 0) { setError(t('gal.empty')); return; }
    setLista(r.profiles);
  };

  const mirar = async (e: EntradaGaleria) => {
    if (!api?.gallery) return;
    setCargando(true); setError(null);
    const r = await api.gallery.profile(e.url);
    setCargando(false);
    if (!r.ok || !r.riesgo) { setError(t('gal.failed', { error: r.error ?? '?' })); return; }
    setElegido({ entrada: e, perfil: r.perfil, riesgo: r.riesgo });
  };

  const importar = () => {
    if (!elegido) return;
    const p = elegido.perfil as { pages?: unknown; buttons?: unknown; accent?: string; wallpaper?: unknown };
    if (!Array.isArray(p.pages) || !Array.isArray(p.buttons)) { setError(t('gal.notADeck')); return; }
    onImportar({
      id: `gal_${elegido.entrada.id}_${Date.now()}`,
      name: elegido.entrada.label,
      pages: p.pages as Profile['pages'],
      buttons: p.buttons as Profile['buttons'],
      accent: p.accent ?? accent,
      wallpaper: p.wallpaper as Profile['wallpaper'],
    });
    setElegido(null);
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
          <button onClick={cargar} disabled={cargando || !url.trim()} style={miniBtn(accent)}>
            {t(cargando ? 'gal.loading' : 'gal.load')}
          </button>
        </div>
        <div style={menudo}>{t('gal.hint')}</div>
        {error && <div style={{ ...menudo, color: VD.danger }}>{error}</div>}

        {lista && !elegido && lista.map((e) => (
          <div
            key={e.id}
            onClick={() => mirar(e)}
            style={{
              background: VD.elevated, border: `1px solid ${VD.border}`, borderRadius: VD.radius.md,
              padding: '6px 9px', cursor: 'pointer',
            }}
          >
            <div style={{ fontFamily: VD.mono, fontSize: 9, color: VD.text }}>
              {e.label}{e.author ? ` · ${e.author}` : ''}
            </div>
            {e.description && <div style={menudo}>{e.description}</div>}
          </div>
        ))}

        {elegido && (
          <div style={{
            background: VD.elevated, border: `1px solid ${VD.warning}`,
            borderRadius: VD.radius.md, padding: '9px 10px',
            display: 'flex', flexDirection: 'column', gap: 6,
          }}>
            <div style={{ fontFamily: VD.mono, fontSize: 9, color: VD.text, letterSpacing: 0.5 }}>
              {elegido.entrada.label}
            </div>
            <div style={{ ...menudo, color: VD.warning }}>{t('gal.warn')}</div>
            <div style={menudo}>{t('gal.counts', { n: elegido.riesgo.botones })}</div>
            {elegido.riesgo.programas.length > 0 && (
              <div style={menudo}>
                {t('gal.launches')}
                {elegido.riesgo.programas.map((p, i) => <div key={i} style={{ color: VD.textDim }}>· {p}</div>)}
              </div>
            )}
            {elegido.riesgo.scripts.length > 0 && (
              <div style={menudo}>
                {t('gal.runs')}
                {elegido.riesgo.scripts.map((s, i) => (
                  <div key={i} style={{ color: VD.danger, wordBreak: 'break-all' }}>· {s}</div>
                ))}
              </div>
            )}
            {elegido.riesgo.atajosGlobales.length > 0 && (
              <div style={menudo}>{t('gal.hotkeys', { list: elegido.riesgo.atajosGlobales.join(', ') })}</div>
            )}
            {elegido.riesgo.scripts.length === 0 && elegido.riesgo.programas.length === 0 && (
              <div style={menudo}>{t('gal.nothingRisky')}</div>
            )}
            <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
              <button onClick={importar} style={miniBtn(accent)}>{t('gal.import')}</button>
              <button onClick={() => setElegido(null)} style={miniBtn(VD.textMuted)}>{t('ui.cancel')}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
