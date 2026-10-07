import React from 'react';
import { useTheme } from '../../utils/theme';
import { useFieldText } from '../../utils/i18n';
import { IconoPuntos } from '../../components/dot480/IconoPuntos';
import { DotGlyphIcon } from '../../components/dot480/DotGlyphIcon';
import { Btn, estiloEntrada } from './comunes';
import { useSelectorIconosDot } from './useSelectorIconosDot';
import { BarraGrupos } from './catalogo/BarraGrupos';
import { RejillaIconos } from './catalogo/RejillaIconos';
import { useVentanaEstrecha } from './catalogo/useVentanaEstrecha';
import { CAT_ACCIONES } from './constantesCatalogo';
import type { ItemCatalogo } from './catalogo/grupos';
import type { IconoElegido, SeccionCatalogo } from './constantesCatalogo';

export interface SelectorIconosDotProps {
  catalogoInicial?: SeccionCatalogo;
  currentOrigen?: string;
  accent: string;
  onSelect: (icono: IconoElegido) => void;
  onClose: () => void;
}

export function SelectorIconosDot({
  catalogoInicial = CAT_ACCIONES,
  currentOrigen,
  accent,
  onSelect,
  onClose,
}: SelectorIconosDotProps) {
  const VD = useTheme();
  const estado = useSelectorIconosDot(catalogoInicial, currentOrigen);
  const estrecha = useVentanaEstrecha();

  const elegir = (item: ItemCatalogo) => {
    estado.registrarSeleccion(item);
    if (item.clase === 'glifo8') {
      onSelect({ tipo: 'glifo', icon: item.id });
      return;
    }
    const bits = item.origen ? estado.mapaBits.get(item.origen) : undefined;
    if (item.origen && bits) onSelect({ tipo: 'puntos', bits, origen: item.origen });
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.85)',
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(920px, 95vw)',
          height: 'min(640px, 92vh)',
          background: VD.surface,
          border: `1px solid ${VD.borderStrong}`,
          borderRadius: VD.radius.md,
          display: 'flex',
          flexDirection: 'column',
          boxShadow: VD.shadow.modal,
          overflow: 'hidden',
        }}
      >
        <Cabecera accent={accent} onClose={onClose} />

        <BarraBusqueda
          busqueda={estado.busqueda}
          setBusqueda={estado.setBusqueda}
          hovered={estado.hovered}
          currentOrigen={currentOrigen}
          totalResultados={estado.totalResultados}
          mapaBits={estado.mapaBits}
          accent={accent}
        />

        {estrecha && (
          <BarraGrupos
            indice={estado.indice}
            recuentos={estado.recuentos}
            buscando={estado.buscando}
            grupoActivo={estado.grupoActivo}
            onElegir={estado.elegirGrupo}
            plegada
            accent={accent}
          />
        )}

        <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
          {!estrecha && (
            <BarraGrupos
              indice={estado.indice}
              recuentos={estado.recuentos}
              buscando={estado.buscando}
              grupoActivo={estado.grupoActivo}
              onElegir={estado.elegirGrupo}
              plegada={false}
              accent={accent}
            />
          )}
          <RejillaIconos
            cargando={estado.cargando}
            items={estado.itemsPagina}
            mapaBits={estado.mapaBits}
            currentOrigen={currentOrigen}
            accent={accent}
            onHover={estado.setHovered}
            onElegir={elegir}
          />
        </div>

        <BarraPaginacion
          pagina={estado.pagina}
          totalPaginas={estado.totalPaginas}
          onCambiarPagina={estado.setPagina}
        />

        <PieLicencia onClose={onClose} />
      </div>
    </div>
  );
}

function Cabecera({ accent, onClose }: { accent: string; onClose: () => void }) {
  const VD = useTheme();
  const tf = useFieldText();

  return (
    <div
      style={{
        height: 48,
        borderBottom: `1px solid ${VD.border}`,
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        gap: 12,
        flexShrink: 0,
        background: VD.elevated,
      }}
    >
      <div style={{ width: 8, height: 8, borderRadius: VD.radius.sm, background: accent }} />
      <span
        style={{
          fontFamily: VD.mono,
          fontSize: 11,
          fontWeight: 'bold',
          color: VD.text,
          letterSpacing: 1,
        }}
      >
        {tf('CATÁLOGO DE ICONOS')}
      </span>
      <div style={{ flex: 1 }} />
      <button
        type="button"
        onClick={onClose}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: 8,
          color: VD.textDim,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <DotGlyphIcon glyph="CLOSE" size={12} color={VD.textDim} />
      </button>
    </div>
  );
}

function BarraBusqueda({
  busqueda,
  setBusqueda,
  hovered,
  currentOrigen,
  totalResultados,
  mapaBits,
  accent,
}: {
  busqueda: string;
  setBusqueda: (s: string) => void;
  hovered: ItemCatalogo | null;
  currentOrigen?: string;
  totalResultados: number;
  mapaBits: Map<string, string>;
  accent: string;
}) {
  const VD = useTheme();
  const tf = useFieldText();
  const inputStyle = estiloEntrada(VD);
  const bitsHovered = hovered?.origen ? mapaBits.get(hovered.origen) : undefined;

  return (
    <div
      style={{
        padding: '10px 16px',
        borderBottom: `1px solid ${VD.border}`,
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        background: VD.surface,
        flexShrink: 0,
      }}
    >
      <div style={{ position: 'relative', width: 280 }}>
        <input
          autoFocus
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder={tf('Buscar por nombre o etiqueta...')}
          style={{
            ...inputStyle,
            fontFamily: VD.mono,
            fontSize: 11,
            paddingRight: busqueda ? 28 : 8,
          }}
        />
        {busqueda && (
          <button
            type="button"
            onClick={() => setBusqueda('')}
            style={{
              position: 'absolute',
              right: 6,
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: VD.textDim,
              padding: 2,
            }}
          >
            <DotGlyphIcon glyph="CLOSE" size={8} color={VD.textDim} />
          </button>
        )}
      </div>

      <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
        {hovered ? (
          <>
            {hovered.clase === 'glifo8' ? (
              <DotGlyphIcon glyph={hovered.id} size={20} color={accent} showRecessed />
            ) : bitsHovered ? (
              <IconoPuntos bits={bitsHovered} size={20} color={accent} showRecessed />
            ) : null}
            <span style={{ fontFamily: VD.mono, fontSize: 11, color: VD.text, fontWeight: 'bold' }}>
              {hovered.nombre.toUpperCase()}
            </span>
            <span style={{ fontFamily: VD.mono, fontSize: 9, color: VD.textDim }}>
              ({hovered.id})
            </span>
          </>
        ) : currentOrigen ? (
          <span style={{ fontFamily: VD.mono, fontSize: 10, color: accent }}>
            {currentOrigen}
          </span>
        ) : (
          <span style={{ fontFamily: VD.mono, fontSize: 10, color: VD.textDim }}>
            {tf('Pasa el cursor sobre un icono para ver su nombre')}
          </span>
        )}
      </div>

      <span
        style={{
          fontFamily: VD.mono,
          fontSize: 10,
          color: VD.textDim,
          letterSpacing: 0.5,
          flexShrink: 0,
        }}
      >
        {totalResultados} {busqueda.trim() ? tf('RESULTADOS') : tf('ICONOS')}
      </span>
    </div>
  );
}

function BarraPaginacion({
  pagina,
  totalPaginas,
  onCambiarPagina,
}: {
  pagina: number;
  totalPaginas: number;
  onCambiarPagina: (p: number) => void;
}) {
  const VD = useTheme();
  const tf = useFieldText();

  return (
    <div
      style={{
        height: 40,
        padding: '0 16px',
        borderTop: `1px solid ${VD.border}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: VD.surface,
        flexShrink: 0,
      }}
    >
      <div style={{ display: 'flex', gap: 6 }}>
        <BotonPaginacion onClick={() => onCambiarPagina(1)} disabled={pagina <= 1}>
          {tf('PRIMERA')}
        </BotonPaginacion>
        <BotonPaginacion onClick={() => onCambiarPagina(pagina - 1)} disabled={pagina <= 1}>
          {tf('ANTERIOR')}
        </BotonPaginacion>
      </div>

      <span
        style={{
          fontFamily: VD.mono,
          fontSize: 10,
          color: VD.textDim,
          letterSpacing: 0.8,
        }}
      >
        {tf('PÁGINA')} {pagina} / {totalPaginas}
      </span>

      <div style={{ display: 'flex', gap: 6 }}>
        <BotonPaginacion onClick={() => onCambiarPagina(pagina + 1)} disabled={pagina >= totalPaginas}>
          {tf('SIGUIENTE')}
        </BotonPaginacion>
        <BotonPaginacion onClick={() => onCambiarPagina(totalPaginas)} disabled={pagina >= totalPaginas}>
          {tf('ÚLTIMA')}
        </BotonPaginacion>
      </div>
    </div>
  );
}

function BotonPaginacion({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void;
  disabled: boolean;
  children: React.ReactNode;
}) {
  const VD = useTheme();
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '4px 10px',
        minHeight: 28,
        fontFamily: VD.mono,
        fontSize: 10,
        letterSpacing: 0.6,
        borderRadius: VD.radius.sm,
        cursor: disabled ? 'not-allowed' : 'pointer',
        background: disabled ? 'transparent' : VD.elevated,
        border: `1px solid ${disabled ? VD.border : VD.borderStrong}`,
        color: disabled ? VD.textMuted : VD.text,
        opacity: disabled ? 0.4 : 1,
        transition: 'opacity 0.15s, background 0.15s',
      }}
    >
      {children}
    </button>
  );
}

function PieLicencia({ onClose }: { onClose: () => void }) {
  const VD = useTheme();
  const tf = useFieldText();

  return (
    <div
      style={{
        height: 36,
        padding: '0 16px',
        borderTop: `1px solid ${VD.border}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: VD.elevated,
        flexShrink: 0,
      }}
    >
      <span
        style={{
          fontFamily: VD.mono,
          fontSize: 9,
          color: VD.textDim,
          letterSpacing: 0.4,
        }}
      >
        {tf('Simple Icons, CC0 · Tabler, MIT. Los logotipos son marcas de sus dueños.')}
      </span>

      <Btn onClick={onClose}>{tf('Cerrar')}</Btn>
    </div>
  );
}
