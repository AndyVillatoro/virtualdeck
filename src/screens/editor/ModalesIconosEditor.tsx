import React, { lazy, Suspense, useMemo } from 'react';
import { EditorPuntos } from '../../components/dot480/EditorPuntos';
import { iconoDeCatalogo, useCatalogoMarcas } from '../../utils/catalogoMarcas';
import { CAT_MARCAS, PREFIJO_MARCAS } from './constantesCatalogo';
import type { IconoElegido, SeccionCatalogo } from './constantesCatalogo';

const SelectorIconosDot = lazy(() =>
  import('./SelectorIconosDot').then((m) => ({ default: m.SelectorIconosDot }))
);

interface ModalesIconosEditorProps {
  showBrandPicker?: boolean;
  onCloseBrandPicker?: () => void;
  brandIcon?: string;
  accent: string;
  onSelectBrandIcon?: (key: string) => void;

  catalogoDotAbierto?: SeccionCatalogo | null;
  onCloseCatalogoDot?: () => void;
  onSelectIconoDot?: (icono: IconoElegido) => void;
  currentOrigen?: string;

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
  catalogoDotAbierto,
  onCloseCatalogoDot,
  onSelectIconoDot,
  currentOrigen,
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

  // Un solo editor de puntos en vez de los dos modales originales.
  const verPuntos = showGlyphEditor || showBrandEditor;

  function cerrarPuntos() {
    onCloseGlyphEditor();
    onCloseBrandEditor();
  }

  const verCatalogoDot = Boolean(catalogoDotAbierto || showBrandPicker);
  // Un icono de marca viejo (sin mapa de puntos) también cuenta como origen
  // actual: el catálogo abre en el subgrupo destacado que lo contiene.
  const origenActual =
    currentOrigen ?? (brandIcon ? `${PREFIJO_MARCAS}${brandIcon}` : undefined);

  return (
    <>
      {verCatalogoDot && (
        <Suspense fallback={null}>
          <SelectorIconosDot
            catalogoInicial={catalogoDotAbierto ?? CAT_MARCAS}
            accent={accent}
            currentOrigen={origenActual}
            onSelect={(icono) => {
              if (onSelectIconoDot) {
                onSelectIconoDot(icono);
              } else if (icono.tipo === 'puntos' && onSelectBrandIcon) {
                const clave = icono.origen.startsWith(PREFIJO_MARCAS)
                  ? icono.origen.slice(PREFIJO_MARCAS.length)
                  : icono.origen;
                onSelectBrandIcon(clave);
              }
              onCloseCatalogoDot?.();
              onCloseBrandPicker?.();
            }}
            onClose={() => {
              onCloseCatalogoDot?.();
              onCloseBrandPicker?.();
            }}
          />
        </Suspense>
      )}

      {verPuntos && (
        <EditorPuntos
          accent={accent}
          pestanaInicial={showBrandEditor ? 'marca' : 'glifo'}
          iconKey={brandIcon || (showBrandEditor ? 'blender' : '')}
          etiquetaMarca={base?.label ?? (brandIcon ? brandIcon : '')}
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
