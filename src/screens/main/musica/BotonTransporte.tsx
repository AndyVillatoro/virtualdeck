import React from 'react';
import { useTheme } from '../../../utils/theme';
import { DotGlyphIcon } from '../../../components/dot480/DotGlyphIcon';

/**
 * Botón de transporte de medios (anterior / reproducir / siguiente).
 *
 * Compartido por el panel vertical y el horizontal de formato barra: el mismo
 * gesto con el mismo tamaño mínimo en los dos. El principal va con acento y
 * los otros dos algo menores, pero ninguno baja de 32 px de lado — por debajo
 * de eso, en una tableta se falla el botón la mitad de las veces.
 *
 * Si la fuente dice que no admite la orden (`activo === false`), el botón se
 * atenúa y no dispara: un vídeo suelto de YouTube declara anterior/siguiente
 * como no admitidos y pulsarlos no hacía nada ni lo decía.
 *
 * Los botones laterales de aleatorio/repetir lo reusan con `activo` (resaltado
 * con acento sin ser el principal), `insignia` («1» de repetir-una) y
 * `ariaPressed`: el mismo gesto y tamaño mínimo que el resto del transporte.
 */
export function BotonTransporte({ glyph, titulo, lado, principal, enabled, accent, onPulsar, activo, insignia, ariaPressed }: {
  glyph: string;
  titulo: string;
  /** Lado del área pulsable en px. Nunca por debajo de 32. */
  lado: number;
  principal: boolean;
  enabled: boolean;
  accent: string;
  onPulsar: () => void;
  /** Resaltado con acento sin ser el botón principal. */
  activo?: boolean;
  /** Insignia pequeña en la esquina del botón. */
  insignia?: string;
  ariaPressed?: boolean;
}) {
  const VD = useTheme();
  const ladoSeguro = Math.max(32, lado);
  const resaltado = principal || activo === true;
  return (
    <button
      type="button"
      title={titulo}
      aria-label={titulo}
      aria-pressed={ariaPressed}
      disabled={!enabled}
      onClick={() => { if (enabled) onPulsar(); }}
      style={{
        width: ladoSeguro, height: ladoSeguro, flexShrink: 0,
        position: 'relative',
        opacity: enabled ? 1 : 0.35,
        cursor: enabled ? 'pointer' : 'not-allowed',
        background: resaltado ? VD.accentBg : VD.elevated,
        border: `1px solid ${resaltado ? accent : VD.border}`,
        borderRadius: VD.radius.lg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        // Sin esto, mantener el dedo sobre el botón selecciona el icono y
        // Windows saca el menú de copiar en mitad de la canción.
        userSelect: 'none', WebkitUserSelect: 'none', touchAction: 'manipulation',
        transition: 'transform 0.08s, border-color 0.12s',
      }}
      onPointerDown={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.94)'; }}
      onPointerUp={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = 'none'; }}
      onPointerLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = 'none'; }}
    >
      <DotGlyphIcon
        glyph={glyph}
        size={ladoSeguro >= 52 ? (principal ? 28 : 20) : (principal ? 22 : 16)}
        color={resaltado ? accent : VD.textDim}
        showRecessed
      />
      {insignia !== undefined && insignia !== '' && (
        <span style={{
          position: 'absolute', top: 2, right: 2,
          minWidth: 12, height: 12, borderRadius: 6,
          border: `1px solid ${accent}`, color: accent,
          fontFamily: VD.mono, fontSize: 8, lineHeight: '10px', padding: '0 2px',
        }}>{insignia}</span>
      )}
    </button>
  );
}
