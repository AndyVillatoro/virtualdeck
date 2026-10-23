/**
 * Interruptores y rótulos pequeños de la vista previa (roadmap 121b).
 *
 * Salieron tal cual de `previa/VistaPreviaPiezas.tsx`. Son componentes tontos:
 * todo el estilo viene por props (los tokens `vd*` los pasa quien los usa con
 * `useTheme()`), así no se congelan los colores del tema.
 */
import type { SubButtonConfig } from '../../../../types';

export function AlternadorToggle({
  isEncendido,
  onTogglePreview,
  accent,
  vdElevated,
  vdBorder,
  vdRadiusSm,
  vdTextDim,
  vdMono,
  labelApagado,
  labelEncendido,
  labelModo,
}: {
  isEncendido: boolean;
  onTogglePreview?: () => void;
  accent: string;
  vdElevated: string;
  vdBorder: string;
  vdRadiusSm: number | string;
  vdTextDim: string;
  vdMono: string;
  labelApagado: string;
  labelEncendido: string;
  labelModo: string;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <div style={{ fontFamily: vdMono, fontSize: 9, color: accent, textAlign: 'center' }}>
        {labelModo}
      </div>
      <div style={{ display: 'flex', gap: 4 }}>
        <button
          type="button"
          onClick={() => {
            if (isEncendido && onTogglePreview) onTogglePreview();
          }}
          style={{
            height: 24,
            padding: '0 8px',
            background: !isEncendido ? `${accent}24` : vdElevated,
            border: `1px solid ${!isEncendido ? accent : vdBorder}`,
            borderRadius: vdRadiusSm,
            color: !isEncendido ? accent : vdTextDim,
            fontFamily: vdMono,
            fontSize: 8.5,
            fontWeight: !isEncendido ? 600 : 400,
            cursor: 'pointer',
          }}
        >
          {labelApagado}
        </button>
        <button
          type="button"
          onClick={() => {
            if (!isEncendido && onTogglePreview) onTogglePreview();
          }}
          style={{
            height: 24,
            padding: '0 8px',
            background: isEncendido ? `${accent}24` : vdElevated,
            border: `1px solid ${isEncendido ? accent : vdBorder}`,
            borderRadius: vdRadiusSm,
            color: isEncendido ? accent : vdTextDim,
            fontFamily: vdMono,
            fontSize: 8.5,
            fontWeight: isEncendido ? 600 : 400,
            cursor: 'pointer',
          }}
        >
          {labelEncendido}
        </button>
      </div>
    </div>
  );
}

export function AlternadorCuadrantes2x2({
  subButtons,
  subToggled,
  onToggleCuadrante,
  accent,
  vdElevated,
  vdBorder,
  vdRadiusSm,
  vdTextDim,
  vdMono,
  labelModo,
}: {
  subButtons: SubButtonConfig[];
  subToggled: boolean[];
  onToggleCuadrante: (idx: number) => void;
  accent: string;
  vdElevated: string;
  vdBorder: string;
  vdRadiusSm: number | string;
  vdTextDim: string;
  vdMono: string;
  labelModo: string;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <div style={{ fontFamily: vdMono, fontSize: 8.5, color: accent, textAlign: 'center' }}>
        {labelModo}
      </div>
      <div style={{ display: 'flex', gap: 4 }}>
        {subButtons.map((sb, idx) => {
          const enc = Boolean(subToggled[idx]);
          const nombre = sb.label || `Q${idx + 1}`;
          return (
            <button
              key={sb.id || idx}
              type="button"
              onClick={() => onToggleCuadrante(idx)}
              title={nombre}
              style={{
                height: 22,
                padding: '0 6px',
                background: enc ? `${accent}24` : vdElevated,
                border: `1px solid ${enc ? accent : vdBorder}`,
                borderRadius: vdRadiusSm,
                color: enc ? accent : vdTextDim,
                fontFamily: vdMono,
                fontSize: 8,
                fontWeight: enc ? 600 : 400,
                cursor: 'pointer',
                maxWidth: 40,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {`Q${idx + 1}`}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function InfoAccionesExtra({
  count,
  vdMono,
  vdTextMuted,
  label,
}: {
  count: number;
  vdMono: string;
  vdTextMuted: string;
  label: string;
}) {
  if (count <= 0) return null;
  return (
    <div style={{ fontFamily: vdMono, fontSize: 9, color: vdTextMuted, textAlign: 'center' }}>
      + {count} {label}
    </div>
  );
}
