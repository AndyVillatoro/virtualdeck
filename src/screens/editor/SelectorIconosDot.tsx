import React from 'react';
import { useTheme } from '../../utils/theme';
import { useFieldText } from '../../utils/i18n';
import { IconoPuntos } from '../../components/dot480/IconoPuntos';
import { DotGlyphIcon } from '../../components/dot480/DotGlyphIcon';
import { Btn, estiloEntrada } from './comunes';
import { useSelectorIconosDot } from './useSelectorIconosDot';
import { CAT_ACCIONES, CAT_MARCAS } from './constantesCatalogo';
import type { NombreCatalogo, EntradaIndice } from '../../data/iconosDot/tipos';

export interface SelectorIconosDotProps {
  catalogoInicial?: NombreCatalogo;
  currentOrigen?: string;
  accent: string;
  onSelect: (icono: { bits: string; origen: string }) => void;
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
  const tf = useFieldText();
  const estado = useSelectorIconosDot(catalogoInicial);

  const {
    catalogoActivo,
    cambiarCatalogo,
    cargando,
    busqueda,
    setBusqueda,
    pagina,
    setPagina,
    totalPaginas,
    totalResultados,
    itemsPagina,
    mapaBits,
    hovered,
    setHovered,
  } = estado;

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
        <BarraPestanas
          catalogoActivo={catalogoActivo}
          onCambiarCatalogo={cambiarCatalogo}
          onClose={onClose}
          accent={accent}
        />

        <BarraBusqueda
          busqueda={busqueda}
          setBusqueda={setBusqueda}
          hovered={hovered}
          currentOrigen={currentOrigen}
          catalogoActivo={catalogoActivo}
          totalResultados={totalResultados}
          mapaBits={mapaBits}
          accent={accent}
        />

        <RejillaIconos
          cargando={cargando}
          itemsPagina={itemsPagina}
          mapaBits={mapaBits}
          catalogoActivo={catalogoActivo}
          currentOrigen={currentOrigen}
          accent={accent}
          onHover={setHovered}
          onSelect={(id, bits) => onSelect({ bits, origen: `${catalogoActivo}:${id}` })}
        />

        <BarraPaginacion
          pagina={pagina}
          totalPaginas={totalPaginas}
          onCambiarPagina={setPagina}
          accent={accent}
        />

        <PieLicencia onClose={onClose} tf={tf} />
      </div>
    </div>
  );
}

function BarraPestanas({
  catalogoActivo,
  onCambiarCatalogo,
  onClose,
  accent,
}: {
  catalogoActivo: NombreCatalogo;
  onCambiarCatalogo: (cat: NombreCatalogo) => void;
  onClose: () => void;
  accent: string;
}) {
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

      <div style={{ display: 'flex', gap: 6, marginLeft: 16 }}>
        <BotonPestana
          activa={catalogoActivo === CAT_ACCIONES}
          onClick={() => onCambiarCatalogo(CAT_ACCIONES)}
          accent={accent}
          texto={tf('ACCIONES (TABLER)')}
        />
        <BotonPestana
          activa={catalogoActivo === CAT_MARCAS}
          onClick={() => onCambiarCatalogo(CAT_MARCAS)}
          accent={accent}
          texto={tf('MARCAS (SIMPLE ICONS)')}
        />
      </div>

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

function BotonPestana({
  activa,
  onClick,
  accent,
  texto,
}: {
  activa: boolean;
  onClick: () => void;
  accent: string;
  texto: string;
}) {
  const VD = useTheme();
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '6px 12px',
        fontFamily: VD.mono,
        fontSize: 10,
        fontWeight: activa ? 'bold' : 'normal',
        letterSpacing: 0.6,
        borderRadius: VD.radius.sm,
        cursor: 'pointer',
        background: activa ? VD.accentBg : 'transparent',
        border: `1px solid ${activa ? accent : VD.border}`,
        color: activa ? accent : VD.textDim,
        transition: 'background 0.15s, border-color 0.15s',
      }}
    >
      {texto}
    </button>
  );
}

function BarraBusqueda({
  busqueda,
  setBusqueda,
  hovered,
  currentOrigen,
  catalogoActivo,
  totalResultados,
  mapaBits,
  accent,
}: {
  busqueda: string;
  setBusqueda: (s: string) => void;
  hovered: [string, string] | null;
  currentOrigen?: string;
  catalogoActivo: NombreCatalogo;
  totalResultados: number;
  mapaBits: Map<string, string>;
  accent: string;
}) {
  const VD = useTheme();
  const tf = useFieldText();
  const inputStyle = estiloEntrada(VD);

  const hoverBits = hovered ? mapaBits.get(hovered[0]) : undefined;
  const esActual = currentOrigen && currentOrigen.startsWith(`${catalogoActivo}:`);

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
            {hoverBits && <IconoPuntos bits={hoverBits} size={20} color={accent} showRecessed />}
            <span style={{ fontFamily: VD.mono, fontSize: 11, color: VD.text, fontWeight: 'bold' }}>
              {hovered[1].toUpperCase()}
            </span>
            <span style={{ fontFamily: VD.mono, fontSize: 9, color: VD.textDim }}>
              ({hovered[0]})
            </span>
          </>
        ) : esActual ? (
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

function RejillaIconos({
  cargando,
  itemsPagina,
  mapaBits,
  catalogoActivo,
  currentOrigen,
  accent,
  onHover,
  onSelect,
}: {
  cargando: boolean;
  itemsPagina: EntradaIndice[];
  mapaBits: Map<string, string>;
  catalogoActivo: NombreCatalogo;
  currentOrigen?: string;
  accent: string;
  onHover: (item: [string, string] | null) => void;
  onSelect: (id: string, bits: string) => void;
}) {
  const VD = useTheme();
  const tf = useFieldText();

  if (cargando) {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: VD.mono,
          fontSize: 12,
          color: VD.textDim,
        }}
      >
        {tf('Cargando catálogo...')}
      </div>
    );
  }

  if (itemsPagina.length === 0) {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: VD.mono,
          fontSize: 12,
          color: VD.textDim,
        }}
      >
        {tf('Sin resultados')}
      </div>
    );
  }

  return (
    <div
      className="vd-scroll"
      style={{
        flex: 1,
        minHeight: 0,
        overflowY: 'auto',
        padding: 12,
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(44px, 1fr))',
        gap: 4,
        alignContent: 'start',
      }}
    >
      {itemsPagina.map(([id, nombre]) => {
        const bits = mapaBits.get(id);
        const origen = `${catalogoActivo}:${id}`;
        const esSeleccionado = currentOrigen === origen;

        return (
          <button
            key={id}
            type="button"
            onClick={() => bits && onSelect(id, bits)}
            onMouseEnter={() => onHover([id, nombre])}
            onMouseLeave={() => onHover(null)}
            title={`${nombre} (${id})`}
            style={{
              minWidth: 40,
              minHeight: 40,
              height: 44,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: esSeleccionado ? VD.accentBg : VD.surface,
              border: `1px solid ${esSeleccionado ? accent : VD.border}`,
              borderRadius: VD.radius.sm,
              cursor: 'pointer',
              padding: 0,
              transition: 'background 0.1s, border-color 0.1s',
            }}
          >
            {bits ? (
              <IconoPuntos bits={bits} size={24} color={esSeleccionado ? accent : VD.text} />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

function BarraPaginacion({
  pagina,
  totalPaginas,
  onCambiarPagina,
  accent: _accent,
}: {
  pagina: number;
  totalPaginas: number;
  onCambiarPagina: (p: number) => void;
  accent: string;
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

function PieLicencia({
  onClose,
  tf,
}: {
  onClose: () => void;
  tf: (s: string) => string;
}) {
  const VD = useTheme();

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
