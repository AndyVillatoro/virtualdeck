import React from 'react';
import { useTheme } from '../../utils/theme';
import { DotGlyphIcon } from '../../components/dot480/DotGlyphIcon';
import type { PageConfig } from '../../types';
import { BarraPaginaSuperficie, InsigniaApp } from './BarraPaginaSuperficie';

export function BotonDesplegablePagina({
  abierto,
  onClick,
  targetApp,
  t,
  vd,
}: {
  abierto: boolean;
  onClick: () => void;
  targetApp?: string;
  t: (k: string) => string;
  vd: ReturnType<typeof useTheme>;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={t('disp.desplegablePagina')}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        background: abierto ? `${vd.accent}22` : vd.elevated,
        border: `1px solid ${abierto ? vd.accent : vd.border}`,
        color: abierto ? vd.accent : vd.text,
        padding: '2px 6px',
        borderRadius: vd.radius.sm,
        fontFamily: vd.mono,
        fontSize: 8,
        letterSpacing: 1,
        cursor: 'pointer',
        flexShrink: 0,
        userSelect: 'none',
        marginLeft: 4,
        transition: 'all 0.15s ease',
      }}
    >
      <DotGlyphIcon
        glyph={abierto ? 'ARROW_UP' : 'ARROW_DOWN'}
        size={8}
        color={abierto ? vd.accent : vd.textDim}
      />
      <span>{t('disp.desplegablePagina')}</span>
      {targetApp && <InsigniaApp app={targetApp} />}
    </button>
  );
}

export function OverlayDesplegablePagina({
  abierto,
  onCerrar,
  pagina,
  esUltima,
  onRenombrarPagina,
  onBorrarPagina,
  onFijarApp,
  onCrearDesdePlantilla,
  vd,
}: {
  abierto: boolean;
  onCerrar: () => void;
  pagina: PageConfig;
  esUltima: boolean;
  onRenombrarPagina: (id: string, nombre: string) => void;
  onBorrarPagina: (id: string) => void;
  onFijarApp: (id: string, app: string, iconoApp?: string) => void;
  onCrearDesdePlantilla?: (plantillaId: string, app: string) => void;
  vd: ReturnType<typeof useTheme>;
}) {
  if (!abierto) return null;
  return (
    <>
      <div
        onClick={onCerrar}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 24,
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          marginTop: 4,
          zIndex: 25,
          boxShadow: vd.shadow.modal,
          background: vd.surface,
          border: `1px solid ${vd.borderStrong}`,
          borderRadius: vd.radius.md,
          padding: vd.space.xs,
          maxWidth: 680,
        }}
      >
        <BarraPaginaSuperficie
          key={pagina.id}
          pagina={pagina}
          esUltima={esUltima}
          onRenombrarPagina={onRenombrarPagina}
          onBorrarPagina={onBorrarPagina}
          onFijarApp={onFijarApp}
          onCrearDesdePlantilla={onCrearDesdePlantilla}
        />
      </div>
    </>
  );
}
