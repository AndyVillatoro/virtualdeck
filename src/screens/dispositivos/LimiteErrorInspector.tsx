import React from 'react';
import { useTheme } from '../../utils/theme';
import { useT } from '../../utils/i18n';
import { DotGlyphIcon } from '../../components/dot480/DotGlyphIcon';

/**
 * El inspector del dock no puede dejar la pantalla en negro.
 *
 * Un error de React sin límite desmonta el árbol entero (la ventana queda
 * vacía); este límite lo contiene en el panel lateral y enseña un mensaje DOT.
 */

function AvisoInspectorRoto({ ancho, onCerrar }: { ancho: number; onCerrar?: () => void }) {
  const VD = useTheme();
  const t = useT();
  return (
    <aside
      style={{
        width: ancho,
        minWidth: ancho,
        maxWidth: ancho,
        background: VD.surface,
        borderLeft: `1px solid ${VD.border}`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: VD.space.sm,
        padding: VD.space.lg,
        textAlign: 'center',
        flexShrink: 0,
        height: '100%',
        overflow: 'hidden',
      }}
    >
      <DotGlyphIcon glyph="WARN" size={18} color={VD.danger} />
      <span style={{ fontSize: 9.5, color: VD.text, fontFamily: VD.mono, lineHeight: 1.6 }}>
        {t('disp.inspector.error')}
      </span>
      {onCerrar && (
        <button
          type="button"
          onClick={onCerrar}
          style={{
            background: 'none',
            border: `1px solid ${VD.border}`,
            borderRadius: VD.radius.sm,
            color: VD.textMuted,
            fontFamily: VD.mono,
            fontSize: 9,
            padding: '4px 10px',
            cursor: 'pointer',
          }}
        >
          {t('disp.cerrar')}
        </button>
      )}
    </aside>
  );
}

interface Props {
  ancho: number;
  onCerrar?: () => void;
  children: React.ReactNode;
}

interface Estado {
  roto: boolean;
}

export class LimiteErrorInspector extends React.Component<Props, Estado> {
  constructor(props: Props) {
    super(props);
    this.state = { roto: false };
  }

  static getDerivedStateFromError(): Estado {
    return { roto: true };
  }

  render() {
    if (this.state.roto) {
      return <AvisoInspectorRoto ancho={this.props.ancho} onCerrar={this.props.onCerrar} />;
    }
    return this.props.children;
  }
}
