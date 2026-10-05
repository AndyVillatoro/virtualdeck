import type { ButtonConfig } from '../../types';

export type TipoIcono = 'auto' | 'glifo' | 'dibujo' | 'marca' | 'imagen';

export interface InfoIconoInicial {
  tipo: TipoIcono;
  habiaVarios: boolean;
  glifoEncima: string;
}

export interface CamposIconoEntrada {
  icon: string;
  imageData: string;
  brandIcon: string;
  brandIconAlwaysAnimate: boolean;
  brandIconCustomBitmap?: string[];
  brandIconCustomColor?: string;
  brandIconCustomPalette?: Record<string, string>;
  customGlyph57?: number[];
  glifoEncima?: string;
}

export interface CamposIconoLimpios {
  icon: string;
  imageData: string;
  brandIcon: string;
  brandIconAlwaysAnimate: boolean;
  brandIconCustomBitmap: string[] | undefined;
  brandIconCustomColor: string | undefined;
  brandIconCustomPalette: Record<string, string> | undefined;
  customGlyph57: number[] | undefined;
}

function tieneDibujoPropio(button: Partial<ButtonConfig>, tieneMarca: boolean): boolean {
  if (button.customGlyph57?.length === 7 && button.customGlyph57.some((r) => r > 0)) {
    return true;
  }
  return Boolean(button.brandIconCustomBitmap?.length && !tieneMarca);
}

/**
 * Deduce el tipo activo inicial y si existían múltiples fuentes configuradas a la vez.
 * Precedencia real de pintado: Imagen -> Marca (+ glifo encima) -> Dibujo 5×7 -> Glifo -> Auto.
 */
export function resolverIconoInicial(button: Partial<ButtonConfig>): InfoIconoInicial {
  const tieneImagen = Boolean(button.imageData && button.imageData.trim());
  const tieneMarca = Boolean(button.brandIcon && button.brandIcon.trim());
  const tieneDibujo = tieneDibujoPropio(button, tieneMarca);
  const tieneGlifo = Boolean(button.icon && button.icon.trim());
  const glifoEncima = tieneGlifo ? (button.icon ?? '') : '';

  if (tieneImagen) {
    const habiaVarios = tieneMarca || tieneDibujo || tieneGlifo;
    return { tipo: 'imagen', habiaVarios, glifoEncima };
  }
  if (tieneMarca) {
    return { tipo: 'marca', habiaVarios: tieneDibujo, glifoEncima };
  }
  if (tieneDibujo) {
    return { tipo: 'dibujo', habiaVarios: tieneGlifo, glifoEncima: '' };
  }
  if (tieneGlifo) {
    return { tipo: 'glifo', habiaVarios: false, glifoEncima: '' };
  }
  return { tipo: 'auto', habiaVarios: false, glifoEncima: '' };
}

/**
 * Limpia los campos de los otros tipos según el selector excluyente.
 */
export function limpiarCamposIcono(tipo: TipoIcono, c: CamposIconoEntrada): CamposIconoLimpios {
  const encima = (c.glifoEncima ?? '').trim();
  if (tipo === 'auto') {
    return {
      icon: '',
      imageData: '',
      brandIcon: '',
      brandIconAlwaysAnimate: false,
      brandIconCustomBitmap: undefined,
      brandIconCustomColor: undefined,
      brandIconCustomPalette: undefined,
      customGlyph57: undefined,
    };
  }
  if (tipo === 'glifo') {
    return {
      icon: c.icon,
      imageData: '',
      brandIcon: '',
      brandIconAlwaysAnimate: false,
      brandIconCustomBitmap: undefined,
      brandIconCustomColor: undefined,
      brandIconCustomPalette: undefined,
      customGlyph57: undefined,
    };
  }
  if (tipo === 'dibujo') {
    const es17 = Boolean(c.brandIconCustomBitmap?.length);
    return {
      icon: '',
      imageData: '',
      brandIcon: es17 ? (c.brandIcon || 'blender') : '',
      brandIconAlwaysAnimate: false,
      brandIconCustomBitmap: c.brandIconCustomBitmap,
      brandIconCustomColor: c.brandIconCustomColor,
      brandIconCustomPalette: c.brandIconCustomPalette,
      customGlyph57: es17 ? undefined : c.customGlyph57,
    };
  }
  if (tipo === 'marca') {
    return {
      icon: encima,
      imageData: '',
      brandIcon: c.brandIcon,
      brandIconAlwaysAnimate: c.brandIconAlwaysAnimate,
      brandIconCustomBitmap: c.brandIconCustomBitmap,
      brandIconCustomColor: c.brandIconCustomColor,
      brandIconCustomPalette: c.brandIconCustomPalette,
      customGlyph57: undefined,
    };
  }
  return {
    icon: encima,
    imageData: c.imageData,
    brandIcon: '',
    brandIconAlwaysAnimate: false,
    brandIconCustomBitmap: undefined,
    brandIconCustomColor: undefined,
    brandIconCustomPalette: undefined,
    customGlyph57: undefined,
  };
}
