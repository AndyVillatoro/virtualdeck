import React, { lazy, Suspense, useMemo } from 'react';
import { EditorPuntos } from '../../components/dot480/EditorPuntos';
import { iconoDeCatalogo, useCatalogoMarcas } from '../../utils/catalogoMarcas';

const BrandIconPicker = lazy(() => import('../../components/BrandIconPicker').then(m => ({ default: m.BrandIconPicker })));

interface ModalesIconosEditorProps {
  showBrandPicker: boolean;
  onCloseBrandPicker: () => void;
  brandIcon?: string;
  accent: string;
  onSelectBrandIcon: (key: string) => void;

  showGlyphEditor: boolean;
  onCloseGlyphEditor: () => void;
  customGlyph57?: number[];
  onSaveGlyph57: (rows?: number[]) => void;

  showBrandEditor: boolean;
  onCloseBrandEditor: () => void;
  brandIconCustomBitmap?: string[];
  brandIconCustomColor?: string;
  brandIconCustomPalette?: Record<string, string>;
  onSaveBrandEditor: (bitmap: string[], color: string, palette: Record<string, string>) => void;
}

export function ModalesIconosEditor({
  showBrandPicker,
  onCloseBrandPicker,
  brandIcon,
  accent,
  onSelectBrandIcon,
  showGlyphEditor,
  onCloseGlyphEditor,
  customGlyph57,
  onSaveGlyph57,
  showBrandEditor,
  onCloseBrandEditor,
  brandIconCustomBitmap,
  brandIconCustomColor,
  brandIconCustomPalette,
  onSaveBrandEditor,
}: ModalesIconosEditorProps) {
  // La base del icono (catálogo diferido) para la pestaña 17×17.
  const catalogo = useCatalogoMarcas();
  const base = brandIcon ? iconoDeCatalogo(catalogo, brandIcon) : undefined;

  const marcaCustom = useMemo(
    () => ({
      bitmap: brandIconCustomBitmap,
      color: brandIconCustomColor,
      palette: brandIconCustomPalette,
    }),
    [brandIconCustomBitmap, brandIconCustomColor, brandIconCustomPalette],
  );
  const marcaBase = useMemo(
    () =>
      base
        ? { bitmap: base.bitmap, color: base.color, palette: base.palette }
        : undefined,
    [base],
  );

  // Un solo editor de puntos en vez de los dos modales originales. La interfaz
  // de este componente no cambia: quien lo monta sigue pasando las mismas props.
  const verPuntos = showGlyphEditor || (showBrandEditor && !!brandIcon);

  function cerrarPuntos() {
    onCloseGlyphEditor();
    onCloseBrandEditor();
  }

  return (
    <>
      {showBrandPicker && (
        <Suspense fallback={null}>
          <BrandIconPicker
            current={brandIcon}
            accent={accent}
            onSelect={onSelectBrandIcon}
            onClose={onCloseBrandPicker}
          />
        </Suspense>
      )}

      {verPuntos && (
        <EditorPuntos
          accent={accent}
          pestanaInicial={showBrandEditor && brandIcon ? 'marca' : 'glifo'}
          iconKey={brandIcon ?? ''}
          etiquetaMarca={base?.label ?? brandIcon ?? ''}
          glifoInicial={customGlyph57}
          marcaCustom={marcaCustom}
          marcaBase={marcaBase}
          alGuardarGlifo={(rows) => {
            if (!rows || rows.every((r) => r === 0)) onSaveGlyph57(undefined);
            else onSaveGlyph57(rows);
          }}
          alGuardarMarca={(bmp, col, pal) => onSaveBrandEditor(bmp, col, pal)}
          onClose={cerrarPuntos}
        />
      )}
    </>
  );
}
