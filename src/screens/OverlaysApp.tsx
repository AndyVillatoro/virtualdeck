import React from 'react';
import type { ButtonConfig, DeckConfig } from '../types';
import { SearchOverlay } from '../components/SearchOverlay';
import { DotGlyphIcon } from '../components/dot480/DotGlyphIcon';
import { BotonIcono } from '../components/ui/BotonIcono';
import { useTheme } from '../utils/theme';
import { useT } from '../utils/i18n';

const EditorB = React.lazy(() => import('./EditorB').then((m) => ({ default: m.EditorB })));
const Onboarding = React.lazy(() => import('../components/Onboarding').then((m) => ({ default: m.Onboarding })));

function AvisoDeshacer({ texto, onUndo }: { texto: string; onUndo?: () => void }) {
  const VD = useTheme();
  const t = useT();
  const esDeshecho = texto.toLowerCase().includes('deshecho') || texto.toLowerCase().includes('undone');
  return (
    <div style={{
      position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
      zIndex: 300,
      background: VD.surface, border: `1px solid ${VD.borderStrong}`,
      borderRadius: VD.radius.md, padding: '8px 14px',
      fontFamily: VD.mono, fontSize: 10, color: VD.text, letterSpacing: 0.5,
      boxShadow: VD.shadow.menu,
      display: 'inline-flex', alignItems: 'center', gap: 12,
    }}>
      <span>{texto}</span>
      {onUndo && !esDeshecho && (
        <button
          type="button"
          onClick={onUndo}
          style={{
            background: `${VD.accent}22`,
            border: `1px solid ${VD.accent}`,
            borderRadius: VD.radius.sm,
            padding: '3px 8px',
            color: VD.accent,
            fontFamily: VD.mono,
            fontSize: 9,
            letterSpacing: 1,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
          }}
        >
          <DotGlyphIcon glyph="UNDO" size={8} color={VD.accent} />
          <span>{t('undo.action')}</span>
        </button>
      )}
    </div>
  );
}

function AvisoError({ texto, onCerrar }: { texto: string; onCerrar: () => void }) {
  const VD = useTheme();
  const t = useT();
  return (
    <div style={{
      position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
      zIndex: 310,
      background: VD.surface, border: `1px solid ${VD.danger}`,
      borderRadius: VD.radius.md, padding: '10px 16px',
      fontFamily: VD.mono, fontSize: 11, color: VD.text,
      maxWidth: 'min(560px, 80%)', boxShadow: VD.shadow.menu,
      display: 'flex', gap: 10, alignItems: 'flex-start',
    }}>
      <div style={{ flexShrink: 0, marginTop: 2 }}>
        <DotGlyphIcon glyph="WARN" size={9} color={VD.danger} />
      </div>
      <span style={{ flex: 1, lineHeight: 1.5 }}>{texto}</span>
      <BotonIcono glifo="CLOSE" title={t('comun.cerrar')} onClick={onCerrar} tamano={16} tamanoGlifo={8} color={VD.textMuted} />
    </div>
  );
}

function UpdateBanner({ version, onRestart, onLater }: { version: string; onRestart: () => void; onLater: () => void }) {
  const VD = useTheme();
  const t = useT();
  return (
    <div style={{
      position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
      zIndex: 320,
      background: VD.surface, border: `1px solid ${VD.accent}`,
      borderRadius: VD.radius.md, padding: '10px 16px',
      fontFamily: VD.mono, fontSize: 11, color: VD.text,
      boxShadow: VD.shadow.menu, display: 'flex', gap: 12, alignItems: 'center',
    }}>
      <span>{t('update.ready', { version })}</span>
      <button
        type="button"
        onClick={onRestart}
        style={{ padding: '5px 12px', background: VD.accent, border: 'none', color: VD.onAccent, fontFamily: VD.mono, fontSize: 10, cursor: 'pointer', borderRadius: VD.radius.sm, letterSpacing: 1 }}
      >{t('update.restart')}</button>
      <button
        type="button"
        onClick={onLater}
        style={{ padding: '5px 8px', background: 'none', border: `1px solid ${VD.border}`, color: VD.textMuted, fontFamily: VD.mono, fontSize: 10, cursor: 'pointer', borderRadius: VD.radius.sm }}
      >{t('update.later')}</button>
    </div>
  );
}

export interface OverlaysAppProps {
  editingButton: ButtonConfig | null;
  config: DeckConfig;
  setEditingId: (id: string | null) => void;
  updateButton: (btn: ButtonConfig) => void;
  clearButton: (id: string) => void;
  showOnboarding: boolean;
  setLanguage: (lang: 'system' | 'es' | 'en') => void;
  setTheme: (theme: 'dark' | 'light') => void;
  saveConfig: (config: DeckConfig) => void;
  handleConfigExport: () => void;
  handleConfigImport: () => void;
  finishOnboarding: () => void;
  searchOpen: boolean;
  setSearchOpen: (open: boolean) => void;
  view: string;
  setActivePage: (idx: number) => void;
  undoToast: string | null;
  undo: () => void;
  updateReady: string | null;
  setUpdateReady: (v: string | null) => void;
  api: typeof window.electronAPI;
  importError: string | null;
  setImportError: (err: string | null) => void;
}

export function OverlaysApp({
  editingButton,
  config,
  setEditingId,
  updateButton,
  clearButton,
  showOnboarding,
  setLanguage,
  setTheme,
  saveConfig,
  handleConfigExport,
  handleConfigImport,
  finishOnboarding,
  searchOpen,
  setSearchOpen,
  view,
  setActivePage,
  undoToast,
  undo,
  updateReady,
  setUpdateReady,
  api,
  importError,
  setImportError,
}: OverlaysAppProps) {
  return (
    <>
      {editingButton && (
        <EditorB
          button={editingButton}
          rgbProfiles={config.rgb?.profiles ?? []}
          deckState={config.state ?? {}}
          pages={config.pages}
          onClose={() => setEditingId(null)}
          onSave={(updated) => { updateButton(updated); setEditingId(null); }}
          onClear={(id) => { clearButton(id); setEditingId(null); }}
        />
      )}

      {showOnboarding && (
        <Onboarding
          accent={config.accent}
          language={config.language ?? 'system'}
          theme={config.theme ?? 'dark'}
          onLanguageChange={setLanguage}
          onThemeChange={setTheme}
          onAccentChange={(accent) => saveConfig({ ...config, accent })}
          onExport={handleConfigExport}
          onImport={handleConfigImport}
          onClose={finishOnboarding}
        />
      )}

      {searchOpen && view === 'main' && (
        <SearchOverlay
          config={config}
          accent={config.accent}
          onClose={() => setSearchOpen(false)}
          onPick={(btn) => {
            setActivePage(btn.page);
            setSearchOpen(false);
            setEditingId(btn.id);
          }}
        />
      )}

      {undoToast && <AvisoDeshacer texto={undoToast} onUndo={undo} />}

      {updateReady !== null && (
        <UpdateBanner
          version={updateReady}
          onRestart={() => api?.update.quitAndInstall()}
          onLater={() => setUpdateReady(null)}
        />
      )}

      {importError && (
        <AvisoError texto={importError} onCerrar={() => setImportError(null)} />
      )}
    </>
  );
}
