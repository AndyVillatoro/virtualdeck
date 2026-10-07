import React from 'react';
import { useTheme } from '../../utils/theme';
import { Chip } from '../../components/ui/Chip';
import { useT } from '../../utils/i18n';

interface AvisoBarraProps {
  enBarra: boolean;
  gridSize: number;
  gridRows: number;
  hintsDismissed?: string[];
  onDismissHint?: (id: string) => void;
  onCrearPagina: () => void;
  accent: string;
}

const HINT_ID = 'barra-page-suggestion';

export function AvisoBarra({
  enBarra,
  gridSize,
  gridRows,
  hintsDismissed = [],
  onDismissHint,
  onCrearPagina,
  accent,
}: AvisoBarraProps) {
  const VD = useTheme();
  const t = useT();

  if (!enBarra) return null;
  if (!onDismissHint) return null;

  const esCuadrada = gridSize === gridRows;
  const esCuatroPorCuatro = gridSize === 4 && gridRows === 4;
  if (!esCuadrada && !esCuatroPorCuatro) return null;

  if (hintsDismissed.includes(HINT_ID)) return null;

  return (
    <div
      style={{
        position: 'absolute',
        zIndex: 180,
        top: 12,
        left: '50%',
        transform: 'translateX(-50%)',
        maxWidth: 320,
        background: VD.surface,
        border: `1px solid ${accent}`,
        borderRadius: VD.radius.md,
        boxShadow: VD.shadow.menu,
        padding: '12px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        fontFamily: VD.font,
      }}
    >
      <span style={{ fontFamily: VD.mono, fontSize: 11, lineHeight: 1.5, color: VD.text, letterSpacing: 0.2 }}>
        {t('hint.barraPageSuggestion')}
      </span>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <Chip activo={false} accent={accent} onClick={() => onDismissHint(HINT_ID)}>
          {t('hint.barraDismiss')}
        </Chip>
        <Chip activo accent={accent} onClick={() => { onCrearPagina(); onDismissHint(HINT_ID); }}>
          {t('hint.barraCreate')}
        </Chip>
      </div>
    </div>
  );
}