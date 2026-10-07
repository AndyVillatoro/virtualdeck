import React, { useEffect, useState } from 'react';
import { useTheme } from '../../utils/theme';
import { resolverIconoCatalogo } from '../../data/iconosDot';
import { DotGlyphIcon, resolveDotGlyph } from '../../components/dot480/DotGlyphIcon';
import { IconoPuntos } from '../../components/dot480/IconoPuntos';
import type { TipoEntradaGaleria } from '../../types';

export interface IconoTiendaProps {
  icono?: string;
  kind?: TipoEntradaGaleria;
  size?: number;
  color?: string;
  showRecessed?: boolean;
  style?: React.CSSProperties;
}

/**
 * Resuelve y renderiza el icono DOT de una entrada de la tienda.
 * Soporta glifos 8×8, iconos del catálogo 16×16 o glifo por defecto según `kind`.
 */
export function IconoTienda({
  icono,
  kind,
  size = 24,
  color,
  showRecessed = false,
  style,
}: IconoTiendaProps) {
  const VD = useTheme();
  const c = color ?? VD.text;
  const fallbackGlyph = kind === 'page' ? 'DOTS' : 'FOLDER';

  const glyph8x8 = icono ? resolveDotGlyph(icono) : null;
  const [bits16, setBits16] = useState<string | null>(null);

  useEffect(() => {
    if (!icono || glyph8x8) {
      setBits16(null);
      return;
    }
    let vivo = true;

    const resolver = async () => {
      try {
        if (icono.includes(':')) {
          const res = await resolverIconoCatalogo(icono);
          if (vivo && res) setBits16(res.bits);
          return;
        }
        const prefijoMarcas = 'marcas:';
        const prefijoAcciones = 'acciones:';
        const porMarca = await resolverIconoCatalogo(prefijoMarcas + icono);
        if (vivo && porMarca) {
          setBits16(porMarca.bits);
          return;
        }
        const porAccion = await resolverIconoCatalogo(prefijoAcciones + icono);
        if (vivo && porAccion) {
          setBits16(porAccion.bits);
          return;
        }
        if (vivo) setBits16(null);
      } catch {
        if (vivo) setBits16(null);
      }
    };

    resolver();
    return () => { vivo = false; };
  }, [icono, glyph8x8]);

  if (glyph8x8) {
    return <DotGlyphIcon glyph={glyph8x8} size={size} color={c} showRecessed={showRecessed} style={style} />;
  }

  if (bits16) {
    return <IconoPuntos bits={bits16} size={size} color={c} showRecessed={showRecessed} style={style} />;
  }

  return <DotGlyphIcon glyph={fallbackGlyph} size={size} color={c} showRecessed={showRecessed} style={style} />;
}
