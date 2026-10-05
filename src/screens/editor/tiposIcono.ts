import type { ButtonConfig } from '../../types';
import { PREFIJO_ACCIONES, PREFIJO_MARCAS } from './constantesCatalogo';

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
  iconoPuntos?: { bits: string; origen: string };
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
  iconoPuntos: { bits: string; origen: string } | undefined;
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
  const tienePuntosMarca = Boolean(button.iconoPuntos?.origen.startsWith(PREFIJO_MARCAS));
  const tienePuntosAccion = Boolean(button.iconoPuntos?.origen.startsWith(PREFIJO_ACCIONES));
  const tieneMarca = Boolean((button.brandIcon && button.brandIcon.trim()) || tienePuntosMarca);
  const tieneDibujo = tieneDibujoPropio(button, tieneMarca);
  const tieneGlifo = Boolean((button.icon && button.icon.trim()) || tienePuntosAccion);
  const glifoEncima = (button.icon && button.icon.trim()) ? (button.icon ?? '') : '';

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

function limpiarAuto(): CamposIconoLimpios {
  return {
    icon: '',
    imageData: '',
    brandIcon: '',
    brandIconAlwaysAnimate: false,
    brandIconCustomBitmap: undefined,
    brandIconCustomColor: undefined,
    brandIconCustomPalette: undefined,
    customGlyph57: undefined,
    iconoPuntos: undefined,
  };
}

function limpiarGlifo(c: CamposIconoEntrada): CamposIconoLimpios {
  const tieneAccion = Boolean(c.iconoPuntos?.origen.startsWith(PREFIJO_ACCIONES));
  return {
    icon: tieneAccion ? '' : c.icon,
    imageData: '',
    brandIcon: '',
    brandIconAlwaysAnimate: false,
    brandIconCustomBitmap: undefined,
    brandIconCustomColor: undefined,
    brandIconCustomPalette: undefined,
    customGlyph57: undefined,
    iconoPuntos: tieneAccion ? c.iconoPuntos : undefined,
  };
}

function limpiarDibujo(c: CamposIconoEntrada): CamposIconoLimpios {
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
    iconoPuntos: undefined,
  };
}

function limpiarMarca(c: CamposIconoEntrada, encima: string): CamposIconoLimpios {
  const tieneMarca = Boolean(c.iconoPuntos?.origen.startsWith(PREFIJO_MARCAS));
  return {
    icon: encima,
    imageData: '',
    brandIcon: tieneMarca ? '' : c.brandIcon,
    brandIconAlwaysAnimate: c.brandIconAlwaysAnimate,
    brandIconCustomBitmap: tieneMarca ? undefined : c.brandIconCustomBitmap,
    brandIconCustomColor: tieneMarca ? undefined : c.brandIconCustomColor,
    brandIconCustomPalette: tieneMarca ? undefined : c.brandIconCustomPalette,
    customGlyph57: undefined,
    iconoPuntos: tieneMarca ? c.iconoPuntos : undefined,
  };
}

function limpiarImagen(c: CamposIconoEntrada, encima: string): CamposIconoLimpios {
  return {
    icon: encima,
    imageData: c.imageData,
    brandIcon: '',
    brandIconAlwaysAnimate: false,
    brandIconCustomBitmap: undefined,
    brandIconCustomColor: undefined,
    brandIconCustomPalette: undefined,
    customGlyph57: undefined,
    iconoPuntos: undefined,
  };
}

/**
 * Limpia los campos de los otros tipos según el selector excluyente.
 */
export function limpiarCamposIcono(tipo: TipoIcono, c: CamposIconoEntrada): CamposIconoLimpios {
  const encima = (c.glifoEncima ?? '').trim();
  switch (tipo) {
    case 'auto':
      return limpiarAuto();
    case 'glifo':
      return limpiarGlifo(c);
    case 'dibujo':
      return limpiarDibujo(c);
    case 'marca':
      return limpiarMarca(c, encima);
    case 'imagen':
      return limpiarImagen(c, encima);
  }
}
