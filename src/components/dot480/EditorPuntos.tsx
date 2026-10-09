import React, { useEffect, useRef, useState } from 'react';
import { useTheme } from '../../utils/theme';
import { textoSobre } from '../../design';
import { useT } from '../../utils/i18n';
import { BotonIcono } from '../ui/BotonIcono';
import { PestanaGlifo } from './PestanaGlifo';
import { PestanaMarca } from './PestanaMarca';
import type { ManejadorPestanaPuntos } from './useEditorPuntos';

interface MarcaCustomPuntos {
  bitmap?: string[];
  color?: string;
  palette?: Record<string, string>;
}

interface MarcaBasePuntos {
  bitmap: string[];
  color: string;
  palette?: Record<string, string>;
}

interface EditorPuntosProps {
  accent: string;
  /** Con qué pestaña se abre (la de marca solo si hay icono de marca). */
  pestanaInicial: 'glifo' | 'marca';
  /** Clave del icono de marca ('' si el botón no tiene). */
  iconKey: string;
  etiquetaMarca: string;
  glifoInicial?: number[];
  marcaCustom?: MarcaCustomPuntos;
  /** Base del catálogo; puede llegar tarde (carga diferida). */
  marcaBase?: MarcaBasePuntos;
  alGuardarGlifo: (rows?: number[]) => void;
  alGuardarMarca: (bitmap: string[], color: string, palette: Record<string, string>) => void;
  onClose: () => void;
}

type Pestana = 'glifo' | 'marca';

/**
 * Un solo editor de dibujo en puntos: glifo 5×7 monocromo o mapa 17×17 con
 * paleta, con el tamaño a elegir. Escribe en los mismos campos de siempre
 * (`customGlyph57` / `brandIconCustom*`): no cambia el formato guardado.
 */
export function EditorPuntos({
  accent,
  pestanaInicial,
  iconKey,
  etiquetaMarca,
  glifoInicial,
  marcaCustom,
  marcaBase,
  alGuardarGlifo,
  alGuardarMarca,
  onClose,
}: EditorPuntosProps) {
  const VD = useTheme();
  const t = useT();
  const conMarca = iconKey !== '';
  const [pestana, setPestana] = useState<Pestana>(
    pestanaInicial === 'marca' && conMarca ? 'marca' : 'glifo',
  );
  const refGlifo = useRef<ManejadorPestanaPuntos | null>(null);
  const refMarca = useRef<ManejadorPestanaPuntos | null>(null);

  useEffect(() => {
    function alTeclar(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', alTeclar);
    return () => document.removeEventListener('keydown', alTeclar);
  }, [onClose]);

  function guardar() {
    if (pestana === 'marca') refMarca.current?.guardar();
    else refGlifo.current?.guardar();
    onClose();
  }

  function botonSolapa(id: Pestana, texto: string) {
    const activa = pestana === id;
    return (
      <button
        type="button"
        onClick={() => setPestana(id)}
        style={{
          background: 'transparent',
          border: 'none',
          fontFamily: VD.mono,
          fontSize: 9,
          cursor: 'pointer',
          color: activa ? accent : VD.textMuted,
          fontWeight: activa ? 'bold' : 'normal',
          letterSpacing: 1,
        }}
      >
        {texto}
      </button>
    );
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 250,
        background: VD.backdrop,
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        onContextMenu={(e) => e.preventDefault()}
        style={{
          background: VD.surface,
          border: `1px solid ${VD.borderStrong}`,
          borderRadius: VD.radius.lg,
          boxShadow: VD.shadow.modal,
          display: 'flex',
          flexDirection: 'column',
          width: pestana === 'marca' ? 'min(840px, 96vw)' : 'min(460px, 94vw)',
          maxHeight: '94vh',
        }}
      >
        <div
          style={{
            minHeight: 44,
            borderBottom: `1px solid ${VD.border}`,
            display: 'flex',
            alignItems: 'center',
            padding: '0 16px',
            gap: 10,
            flexShrink: 0,
          }}
        >
          <div style={{ width: 6, height: 6, borderRadius: VD.radius.md, background: accent }} />
          <span style={{ fontFamily: VD.mono, fontSize: 10, letterSpacing: 2, color: VD.text }}>
            {t('puntos.titulo')}
          </span>
          {conMarca && (
            <div style={{ display: 'flex', gap: 8, marginLeft: 8 }}>
              {botonSolapa('glifo', t('puntos.glifo'))}
              {botonSolapa('marca', t('puntos.marca'))}
            </div>
          )}
          <div style={{ flex: 1 }} />
          <BotonIcono glifo="CLOSE" title={t('comun.cerrar')} onClick={onClose} />
        </div>

        <div style={{ overflowY: 'auto', padding: 16 }}>
          <div style={{ display: pestana === 'glifo' ? 'block' : 'none' }}>
            <PestanaGlifo
              ref={refGlifo}
              accent={accent}
              inicial={glifoInicial}
              activa={pestana === 'glifo'}
              alGuardar={alGuardarGlifo}
            />
          </div>
          {conMarca && (
            <div style={{ display: pestana === 'marca' ? 'block' : 'none' }}>
              <PestanaMarca
                ref={refMarca}
                accent={accent}
                etiqueta={etiquetaMarca}
                activa={pestana === 'marca'}
                custom={marcaCustom}
                base={marcaBase}
                alGuardar={alGuardarMarca}
              />
            </div>
          )}
        </div>

        <div
          style={{
            minHeight: 50,
            borderTop: `1px solid ${VD.border}`,
            display: 'flex',
            alignItems: 'center',
            padding: '0 16px',
            gap: 8,
            flexShrink: 0,
          }}
        >
          <div style={{ flex: 1 }} />
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '7px 14px',
              border: `1px solid ${VD.border}`,
              background: 'transparent',
              fontFamily: VD.mono,
              fontSize: 9,
              letterSpacing: 1,
              color: VD.textDim,
              cursor: 'pointer',
              borderRadius: VD.radius.sm,
            }}
          >
            {t('ui.cancel')}
          </button>
          <button
            type="button"
            onClick={guardar}
            style={{
              padding: '7px 20px',
              background: accent,
              border: 'none',
              fontFamily: VD.mono,
              fontSize: 9,
              letterSpacing: 1,
              color: textoSobre(accent),
              cursor: 'pointer',
              borderRadius: VD.radius.sm,
            }}
          >
            {t('ui.save')}
          </button>
        </div>
      </div>
    </div>
  );
}
