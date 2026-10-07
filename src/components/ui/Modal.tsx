import React from 'react';
import { useTheme } from '../../utils/theme';

export interface ModalProps {
  onClose: () => void;
  children: React.ReactNode;
  /** CSS de ancho del panel, p. ej. `'min(960px, 96vw)'`. */
  ancho?: string;
  /** CSS de alto del panel; sin él, se ajusta al contenido con tope del 92 % de la ventana. */
  alto?: string;
  /** Nombre del diálogo para lectores de pantalla. */
  etiqueta?: string;
  zIndex?: number;
  /** El panel lleva su propio scroll vertical (para contenido sin tope). */
  desplazable?: boolean;
  style?: React.CSSProperties;
}

/**
 * Velo + panel centrado. Un solo velo (`VD.backdrop`, que cambia con el tema)
 * en vez de las nueve opacidades que llevaba cada modal, y un tope de tamaño
 * para que ningún panel se salga de la ventana.
 */
export function Modal({ onClose, children, ancho = 'min(560px, 94vw)', alto, etiqueta, zIndex = 50, desplazable, style }: ModalProps) {
  const VD = useTheme();
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={etiqueta}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: VD.backdrop,
        padding: 8,
      }}
    >
      <div onClick={onClose} style={{ position: 'absolute', inset: 0 }} />
      <div
        onClick={(ev) => ev.stopPropagation()}
        className={desplazable ? 'vd-scroll' : undefined}
        style={{
          position: 'relative',
          width: ancho,
          height: alto,
          maxWidth: '100%',
          maxHeight: '92vh',
          overflowY: desplazable ? 'auto' : undefined,
          background: VD.surface,
          border: `1px solid ${VD.borderStrong}`,
          borderRadius: VD.radius.sm,
          boxShadow: VD.shadow.modal,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          ...style,
        }}
      >
        {children}
      </div>
    </div>
  );
}
