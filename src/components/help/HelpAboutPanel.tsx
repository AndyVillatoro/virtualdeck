import React, { useEffect, useState } from 'react';
import { useTheme } from '../../utils/theme';
import { SettingLabel } from '../settings/settingHelpers';
import { LINKS, DONATION_LINKS } from '../../data/links';
import { CREDITS } from './credits';
import { buildIssueUrl } from '../../utils/bugReport';
import type { PlatformInfo } from '../../types';

export function HelpAboutPanel({
  accent,
  onReplayOnboarding,
}: {
  accent: string;
  onReplayOnboarding?: () => void;
}) {
  const VD = useTheme();
  const api = window.electronAPI;
  const [expanded, setExpanded] = useState(false);
  const [version, setVersion] = useState('');
  const [platformInfo, setPlatformInfo] = useState<PlatformInfo | null>(null);
  const [showDonate, setShowDonate] = useState(false);
  const [showCredits, setShowCredits] = useState(false);
  const [updateMsg, setUpdateMsg] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (!expanded || !api) return;
    api.app.getVersion().then(setVersion).catch(() => {});
    api.app.platformInfo().then((p) => setPlatformInfo(p as PlatformInfo)).catch(() => {});
  }, [expanded, api]);

  // Escuchar eventos de update (descargado / error) para feedback.
  useEffect(() => {
    if (!api?.update?.onStatus) return;
    return api.update.onStatus((s: any) => {
      if (s.status === 'downloaded') setUpdateMsg(`Actualización ${s.version ?? ''} lista — reiniciá para aplicar.`);
      else if (s.status === 'available') setUpdateMsg(`Descargando actualización ${s.version ?? ''}…`);
      else if (s.status === 'error') setUpdateMsg('No se pudo buscar actualizaciones.');
    });
  }, [api]);

  const open = (url: string) => api?.launch.url(url);

  const checkUpdates = async () => {
    if (!api?.update) return;
    setChecking(true); setUpdateMsg(null);
    try {
      const r: any = await api.update.check();
      if (r.status === 'disabled') setUpdateMsg('Auto-update no disponible en este build (modo desarrollo).');
      else if (r.status === 'error') setUpdateMsg('Error al buscar actualizaciones.');
      else setUpdateMsg('Buscando actualizaciones…');
    } finally { setChecking(false); }
  };

  const reportBug = async () => {
    let recentLog = '';
    try { recentLog = (await api?.log.readRecent(2500)) ?? ''; } catch {}
    open(buildIssueUrl({ platformInfo, recentLog }));
  };

  const linkBtn: React.CSSProperties = {
    padding: '5px 8px', background: VD.elevated, border: `1px solid ${VD.border}`,
    color: VD.textDim, fontFamily: VD.mono, fontSize: 8, letterSpacing: 0.5,
    cursor: 'pointer', borderRadius: VD.radius.sm, textAlign: 'center',
  };

  return (
    <div>
      <div
        onClick={() => setExpanded((v) => !v)}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
      >
        <SettingLabel>AYUDA Y ACERCA DE</SettingLabel>
        <span style={{ fontFamily: VD.mono, fontSize: 9, color: VD.textMuted }}>{expanded ? '▲' : '▼'}</span>
      </div>

      {expanded && (
        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {/* Versión */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: accent }} />
            <span style={{ fontFamily: VD.mono, fontSize: 10, color: VD.text, letterSpacing: 1 }}>VirtualDeck</span>
            <span style={{ fontFamily: VD.mono, fontSize: 9, color: VD.textMuted }}>v{version || '…'}</span>
          </div>

          {/* Acciones rápidas */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
            <button style={linkBtn} onClick={() => open(LINKS.docs)}>📖 DOCUMENTACIÓN</button>
            <button style={linkBtn} onClick={reportBug}>🐞 REPORTAR ERROR</button>
            <button style={linkBtn} onClick={checkUpdates} disabled={checking}>
              {checking ? 'BUSCANDO…' : '⟳ BUSCAR UPDATE'}
            </button>
            <button style={{ ...linkBtn, borderColor: accent, color: accent }} onClick={() => setShowDonate((v) => !v)}>
              ♥ APOYAR
            </button>
          </div>

          {updateMsg && (
            <div style={{ fontFamily: VD.mono, fontSize: 8, color: VD.textDim, lineHeight: 1.4 }}>{updateMsg}</div>
          )}

          {/* Popover de donaciones */}
          {showDonate && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: 8, background: VD.elevated, borderRadius: VD.radius.sm, border: `1px solid ${VD.border}` }}>
              <div style={{ fontFamily: VD.mono, fontSize: 8, color: VD.textMuted, lineHeight: 1.4 }}>
                VirtualDeck es gratis. Si te sirve, podés apoyar su desarrollo:
              </div>
              {DONATION_LINKS.map((d) => (
                <button key={d.id} style={{ ...linkBtn, textAlign: 'left' }} onClick={() => open(d.url)}>
                  ♥ {d.label}
                </button>
              ))}
            </div>
          )}

          {/* Log */}
          <div style={{ display: 'flex', gap: 4 }}>
            <button style={{ ...linkBtn, flex: 1 }} onClick={() => api?.log.open()}>ABRIR REGISTRO</button>
            <button style={{ ...linkBtn, flex: 1 }} onClick={() => api?.log.export()}>EXPORTAR REGISTRO</button>
          </div>

          {/* Repetir tutorial */}
          {onReplayOnboarding && (
            <button style={linkBtn} onClick={onReplayOnboarding}>🎓 REPETIR TUTORIAL</button>
          )}

          {/* Créditos / licencias */}
          <div>
            <div
              onClick={() => setShowCredits((v) => !v)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
            >
              <span style={{ fontFamily: VD.mono, fontSize: 8, color: VD.textMuted, letterSpacing: 1 }}>CRÉDITOS Y LICENCIAS</span>
              <span style={{ fontFamily: VD.mono, fontSize: 8, color: VD.textMuted }}>{showCredits ? '▲' : '▼'}</span>
            </div>
            {showCredits && (
              <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 3 }}>
                {CREDITS.map((c) => (
                  <div key={c.name} onClick={() => open(c.url)} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                    <span style={{ fontFamily: VD.mono, fontSize: 8, color: VD.textDim, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.name}{c.bundled ? ' (incluido)' : ''}
                    </span>
                    <span style={{ fontFamily: VD.mono, fontSize: 7, color: VD.textMuted }}>{c.license}</span>
                  </div>
                ))}
                {platformInfo && (
                  <div style={{ marginTop: 4, fontFamily: VD.mono, fontSize: 7, color: VD.textMuted, lineHeight: 1.5 }}>
                    {platformInfo.os} · Electron {platformInfo.electron}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
