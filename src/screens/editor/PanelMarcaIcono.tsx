import React from 'react';
import { useTheme } from '../../utils/theme';
import { useFieldText } from '../../utils/i18n';
import { SubseccionGlifoEncima } from './SubseccionGlifoEncima';

export interface PanelMarcaIconoProps {
  brandIcon: string;
  brandIconAlwaysAnimate: boolean;
  setBrandIconAlwaysAnimate: React.Dispatch<React.SetStateAction<boolean>>;
  glifoEncima: string;
  setGlifoEncima: (g: string) => void;
  accent: string;
  tienePuntosMarca: boolean;
}

/**
 * Opciones de una marca ya elegida (no la vista ni el cambio: eso vive en
 * `PanelCatalogoIcono`): animación siempre activa y glifo encima.
 */
export function PanelMarcaIcono({
  brandIcon,
  brandIconAlwaysAnimate,
  setBrandIconAlwaysAnimate,
  glifoEncima,
  setGlifoEncima,
  accent,
  tienePuntosMarca,
}: PanelMarcaIconoProps) {
  const VD = useTheme();
  const tf = useFieldText();

  if (!brandIcon && !tienePuntosMarca) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {brandIcon && (
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={brandIconAlwaysAnimate}
            onChange={(e) => setBrandIconAlwaysAnimate(e.target.checked)}
            style={{ accentColor: accent }}
          />
          <span style={{ fontFamily: VD.mono, fontSize: 9, letterSpacing: 0.5, color: VD.textDim }}>
            {tf('ANIMACIÓN SIEMPRE ACTIVA — si está desactivado, anima solo cuando el botón está encendido (toggle ON)')}
          </span>
        </label>
      )}

      <SubseccionGlifoEncima
        glifoEncima={glifoEncima}
        setGlifoEncima={setGlifoEncima}
        accent={accent}
      />
    </div>
  );
}
