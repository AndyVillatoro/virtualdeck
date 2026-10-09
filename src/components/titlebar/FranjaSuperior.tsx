import React from 'react';
import { useTheme } from '../../utils/theme';
import type { RGBStatus } from '../../types';
import { BotonesNavegacion } from './BotonesNavegacion';
import { BotonAjustesConHint } from './BotonAjustesConHint';
import { ControlesVentana } from './ControlesVentana';

interface FranjaSuperiorProps {
  compact?: boolean;
  effectiveAccent: string;
  pageName?: string;
  showControls?: boolean;
  showSettings: boolean;
  onToggleSettings: () => void;
  ruedaRef: React.RefObject<HTMLButtonElement | null>;
  onFloatingBar?: () => void;
  onWallpaper?: () => void;
  onRGB?: () => void;
  onDispositivos?: () => void;
  rgbStatus?: RGBStatus | null;
  hintsDismissed?: string[];
  onDismissHint?: (id: string) => void;
  onFullscreen?: () => void;
}

export function FranjaSuperior({
  compact = false,
  effectiveAccent,
  pageName,
  showControls = true,
  showSettings,
  onToggleSettings,
  ruedaRef,
  onFloatingBar,
  onWallpaper,
  onRGB,
  onDispositivos,
  rgbStatus,
  hintsDismissed,
  onDismissHint,
  onFullscreen,
}: FranjaSuperiorProps) {
  const VD = useTheme();

  return (
    <div
      style={{
        height: compact ? 26 : 36,
        display: 'flex',
        alignItems: 'center',
        padding: compact ? '0 8px' : '0 14px',
        gap: compact ? 6 : 10,
        borderBottom: `1px solid ${VD.border}`,
        fontFamily: VD.mono,
        fontSize: compact ? 10 : 11,
        color: VD.textDim,
        background: VD.surface,
        minWidth: 0,
        WebkitAppRegion: 'drag',
      } as React.CSSProperties}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: compact ? 4 : 6,
          flexShrink: 0,
          WebkitAppRegion: 'no-drag',
        } as React.CSSProperties}
      >
        <div style={{ width: compact ? 5 : 6, height: compact ? 5 : 6, borderRadius: '50%', background: effectiveAccent }} />
        <span style={{ color: VD.text, letterSpacing: compact ? 1 : 2, fontSize: compact ? 9 : 10 }}>VIRTUALDECK</span>
      </div>
      {pageName && (
        <>
          <div style={{ width: 1, height: compact ? 10 : 14, background: VD.border }} />
          <span style={{ fontSize: compact ? 9 : 10, letterSpacing: 1, color: VD.textMuted, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {pageName}
          </span>
        </>
      )}
      <div style={{ flex: 1 }} />

      {showControls && (
        <div style={{ display: 'flex', gap: compact ? 2 : 4, flexShrink: 0, WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          <BotonesNavegacion
            effectiveAccent={effectiveAccent}
            onFloatingBar={onFloatingBar}
            onWallpaper={onWallpaper}
            onRGB={onRGB}
            onDispositivos={onDispositivos}
            rgbStatus={rgbStatus}
            compact={compact}
          />
          <BotonAjustesConHint
            ruedaRef={ruedaRef}
            showSettings={showSettings}
            onToggle={onToggleSettings}
            effectiveAccent={effectiveAccent}
            hintsDismissed={hintsDismissed}
            onDismissHint={onDismissHint}
            compact={compact}
          />
          <ControlesVentana onFullscreen={onFullscreen} compact={compact} />
        </div>
      )}
    </div>
  );
}
