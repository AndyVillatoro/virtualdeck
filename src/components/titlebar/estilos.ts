import type React from 'react';
import type { VDTokens } from '../../design';

export function estilo_btnStyle(VD: VDTokens, compact = false): React.CSSProperties {
  return {
    height: compact ? 20 : 22,
    padding: compact ? '0 6px' : '0 8px',
    display: 'flex',
    alignItems: 'center',
    fontSize: compact ? 8 : 9,
    letterSpacing: 1,
    color: VD.textDim,
    background: 'transparent',
    border: `1px solid ${VD.border}`,
    borderRadius: VD.radius.sm,
    cursor: 'pointer',
  };
}

export function estilo_iconBtnStyle(VD: VDTokens, compact = false): React.CSSProperties {
  return {
    width: compact ? 20 : 22,
    height: compact ? 20 : 22,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: compact ? 12 : 14,
    color: VD.textDim,
    background: 'transparent',
    border: 'none',
    borderRadius: VD.radius.sm,
    cursor: 'pointer',
  };
}
