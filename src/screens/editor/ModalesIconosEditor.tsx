import React, { lazy, Suspense } from 'react';
import { Glyph57Editor } from '../../components/Glyph57Editor';

const BrandIconPicker = lazy(() => import('../../components/BrandIconPicker').then(m => ({ default: m.BrandIconPicker })));
const BrandIconEditor = lazy(() => import('../../components/BrandIconEditor').then(m => ({ default: m.BrandIconEditor })));

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

      {showGlyphEditor && (
        <Glyph57Editor
          initial={customGlyph57}
          accent={accent}
          onSave={(rows) => {
            if (rows.every((r) => r === 0)) onSaveGlyph57(undefined);
            else onSaveGlyph57(rows);
          }}
          onClose={onCloseGlyphEditor}
        />
      )}

      {showBrandEditor && brandIcon && (
        <Suspense fallback={null}>
          <BrandIconEditor
            iconKey={brandIcon}
            customBitmap={brandIconCustomBitmap}
            customColor={brandIconCustomColor}
            customPalette={brandIconCustomPalette}
            accent={accent}
            onSave={onSaveBrandEditor}
            onClose={onCloseBrandEditor}
          />
        </Suspense>
      )}
    </>
  );
}

