import React from 'react';
import { useTheme } from '../../utils/theme';
import { useT } from '../../utils/i18n';
import { useDisplays } from '../../utils/useDisplays';
import { DotGlyphIcon } from '../dot480/DotGlyphIcon';
import type { DisplayInfo } from '../../types';

interface DisplaysSectionProps {
  accent: string;
  targetDisplayId?: number;
  onTargetDisplayChange?: (displayId: number | undefined) => void;
}

export function DisplaysSection({ accent, targetDisplayId, onTargetDisplayChange }: DisplaysSectionProps) {
  const VD = useTheme();
  const t = useT();
  const { displays, moveToDisplay, refreshDisplays } = useDisplays();

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <DotGlyphIcon glyph="MONITOR" size={12} color={accent} />
          <span style={{ fontFamily: VD.mono, fontSize: 10, letterSpacing: 1.5, color: VD.textDim, textTransform: 'uppercase', fontWeight: 700 }}>
            {t('set.monitors')}
          </span>
        </div>
        <button
          onClick={refreshDisplays}
          title={t('set.monRefresh')}
          style={{
            background: 'none', border: 'none', padding: '2px 4px',
            color: VD.textMuted, cursor: 'pointer', fontFamily: VD.mono, fontSize: 8,
            letterSpacing: 0.5,
          }}
        >
          [{t('set.monRefreshShort')}]
        </button>
      </div>

      <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {displays.map((d: DisplayInfo, idx: number) => {
          const isTarget = targetDisplayId === d.id;
          return (
            <div
              key={d.id}
              style={{
                background: VD.elevated,
                border: `1px solid ${d.isCurrent ? accent : VD.border}`,
                borderRadius: VD.radius.md,
                padding: '8px 10px',
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
              }}
            >
              {/* Header row */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <DotGlyphIcon glyph="MONITOR" size={10} color={d.isCurrent ? accent : VD.textDim} />
                  <span style={{ fontFamily: VD.mono, fontSize: 9, fontWeight: 700, color: d.isCurrent ? VD.text : VD.textDim, letterSpacing: 0.5 }}>
                    {d.name ? d.name.toUpperCase() : `MONITOR ${idx + 1}`}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  {d.isPrimary && (
                    <span style={{
                      fontFamily: VD.mono, fontSize: 7, padding: '1px 4px',
                      background: 'rgba(255, 255, 255, 0.06)', borderRadius: VD.radius.sm,
                      color: VD.textMuted, letterSpacing: 0.5,
                    }}>
                      {t('set.monPrimary')}
                    </span>
                  )}
                  {d.isCurrent && (
                    <span style={{
                      fontFamily: VD.mono, fontSize: 7, padding: '1px 4px',
                      background: VD.accentBg, border: `1px solid ${accent}`, borderRadius: VD.radius.sm,
                      color: accent, letterSpacing: 0.5, fontWeight: 700,
                    }}>
                      {t('set.monCurrent')}
                    </span>
                  )}
                  {isTarget && (
                    <span style={{
                      fontFamily: VD.mono, fontSize: 7, padding: '1px 4px',
                      background: 'rgba(52, 199, 89, 0.15)', border: '1px solid #34c759', borderRadius: VD.radius.sm,
                      color: '#34c759', letterSpacing: 0.5, fontWeight: 700,
                    }}>
                      {t('set.monKioskTarget')}
                    </span>
                  )}
                </div>
              </div>

              {/* Specs row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: VD.mono, fontSize: 8, color: VD.textMuted }}>
                <span>{d.bounds.width}×{d.bounds.height}</span>
                <span>•</span>
                <span>{Math.round(d.scaleFactor * 100)}%</span>
                {d.frequency ? (
                  <>
                    <span>•</span>
                    <span>{d.frequency}HZ</span>
                  </>
                ) : null}
                {d.touchSupport === 'available' && (
                  <>
                    <span>•</span>
                    <span style={{ color: accent }}>{t('set.monTouch')}</span>
                  </>
                )}
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
                {!d.isCurrent && (
                  <button
                    onClick={() => moveToDisplay(d.id)}
                    style={{
                      flex: 1, padding: '4px 6px',
                      background: VD.accentBg, border: `1px solid ${accent}`,
                      color: accent, fontFamily: VD.mono, fontSize: 8, letterSpacing: 0.5,
                      cursor: 'pointer', borderRadius: VD.radius.sm,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                    }}
                  >
                    <DotGlyphIcon glyph="ARROW_RIGHT" size={7} color={accent} />
                    <span>{t('set.monMoveHere')}</span>
                  </button>
                )}
                <button
                  onClick={() => onTargetDisplayChange?.(isTarget ? undefined : d.id)}
                  style={{
                    flex: 1, padding: '4px 6px',
                    background: isTarget ? 'rgba(52, 199, 89, 0.12)' : 'transparent',
                    border: `1px solid ${isTarget ? '#34c759' : VD.border}`,
                    color: isTarget ? '#34c759' : VD.textMuted,
                    fontFamily: VD.mono, fontSize: 8, letterSpacing: 0.5,
                    cursor: 'pointer', borderRadius: VD.radius.sm,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                  }}
                >
                  <DotGlyphIcon glyph={isTarget ? 'CHECK' : 'FULLSCREEN'} size={7} color={isTarget ? '#34c759' : VD.textMuted} />
                  <span>{isTarget ? t('set.monIsKioskTarget') : t('set.monSetKiosk')}</span>
                </button>
              </div>
            </div>
          );
        })}

        {displays.length === 0 && (
          <div style={{ fontFamily: VD.mono, fontSize: 8, color: VD.textMuted }}>
            {t('set.monNoDisplays')}
          </div>
        )}

        <div style={{ fontFamily: VD.mono, fontSize: 8, color: VD.textMuted, lineHeight: 1.5 }}>
          {t('set.monitorsHint')}
        </div>
      </div>
    </div>
  );
}
