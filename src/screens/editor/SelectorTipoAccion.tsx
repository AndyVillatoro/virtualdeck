import React, { useMemo, useState } from 'react';
import { useTheme } from '../../utils/theme';
import { useT } from '../../utils/i18n';
import { DotGlyphIcon } from '../../components/dot480/DotGlyphIcon';
import { Chip } from '../../components/ui/Chip';
import { estiloCampo } from '../../components/ui/estilos';
import {
  ACTION_TYPES,
  FAMILIAS_ACCION,
  type ActionTypeInfo,
  type FamiliaAccion,
} from './actionData';
import type { ActionType } from '../../types';

export interface SelectorTipoAccionProps {
  seleccionado?: ActionType;
  onElegir: (type: ActionType) => void;
  accent: string;
  excluir?: ActionType[];
  compacto?: boolean;
}

function normalizar(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function resolverFamiliaInicial(seleccionado?: ActionType): FamiliaAccion | 'todas' {
  if (!seleccionado) return 'todas';
  const match = ACTION_TYPES.find((at) => at.type === seleccionado);
  return match?.familia ?? 'todas';
}

function filtrarAcciones(
  disponibles: ActionTypeInfo[],
  queryLimpia: string,
  familiaActiva: FamiliaAccion | 'todas',
  t: (clave: string) => string,
): ActionTypeInfo[] {
  if (queryLimpia.length > 0) {
    return disponibles.filter((at) => {
      const etq = normalizar(t(at.label));
      const desc = normalizar(t(at.desc));
      return etq.includes(queryLimpia) || desc.includes(queryLimpia);
    });
  }
  if (familiaActiva === 'todas') {
    return disponibles;
  }
  return disponibles.filter((at) => at.type === 'none' || at.familia === familiaActiva);
}

export function SelectorTipoAccion({
  seleccionado,
  onElegir,
  accent,
  excluir,
  compacto = false,
}: SelectorTipoAccionProps) {
  const VD = useTheme();
  const t = useT();

  const [busqueda, setBusqueda] = useState('');
  const [familiaActiva, setFamiliaActiva] = useState<FamiliaAccion | 'todas'>(() =>
    resolverFamiliaInicial(seleccionado),
  );

  const queryLimpia = normalizar(busqueda.trim());

  const disponibles = useMemo(() => {
    if (!excluir || excluir.length === 0) return ACTION_TYPES;
    const setExcluir = new Set(excluir);
    return ACTION_TYPES.filter((at) => !setExcluir.has(at.type));
  }, [excluir]);

  const filtrados = useMemo(
    () => filtrarAcciones(disponibles, queryLimpia, familiaActiva, t),
    [disponibles, queryLimpia, familiaActiva, t],
  );

  const etiquetasFamilia: Record<FamiliaAccion, string> = {
    apps: t('fam.apps'),
    audio: t('fam.audio'),
    musica: t('fam.musica'),
    teclado: t('fam.teclado'),
    logica: t('fam.logica'),
    sistema: t('fam.sistema'),
    rgb: t('fam.rgb'),
    integraciones: t('fam.integraciones'),
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* Buscador + Fichas de familia */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <input
          type="text"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setBusqueda('');
          }}
          placeholder={t('act.search.placeholder')}
          style={{ ...estiloCampo(VD, 'compacto'), width: 160, flex: '0 1 160px' }}
        />

        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center', minWidth: 0 }}>
          {(['todas', ...FAMILIAS_ACCION] as const).map((fam) => (
            <Chip
              key={fam}
              accent={accent}
              activo={familiaActiva === fam && !queryLimpia}
              onClick={() => {
                setFamiliaActiva(fam);
                if (busqueda) setBusqueda('');
              }}
            >
              {fam === 'todas' ? t('fam.todas') : etiquetasFamilia[fam]}
            </Chip>
          ))}
        </div>
      </div>

      {/* Rejilla de tarjetas o estado vacío */}
      {filtrados.length === 0 ? (
        <div
          style={{
            padding: '24px 16px',
            textAlign: 'center',
            fontFamily: VD.mono,
            fontSize: 9,
            color: VD.textMuted,
            letterSpacing: 1,
            background: VD.elevated,
            borderRadius: VD.radius.md,
            border: `1px solid ${VD.border}`,
            boxSizing: 'border-box',
          }}
        >
          {t('act.search.empty')}
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
            gap: 8,
          }}
        >
          {filtrados.map((at) => {
            const active = seleccionado === at.type;
            return (
              <button
                key={at.type}
                type="button"
                onClick={() => onElegir(at.type)}
                title={t(at.desc)}
                style={{
                  background: active ? VD.accentBg : VD.elevated,
                  border: `1px solid ${active ? accent : VD.border}`,
                  borderRadius: VD.radius.lg,
                  padding: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  minWidth: 0,
                  width: '100%',
                  textAlign: 'left',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.12s, background 0.12s',
                }}
                onMouseEnter={(e) => {
                  if (!active) e.currentTarget.style.borderColor = accent;
                }}
                onMouseLeave={(e) => {
                  if (!active) e.currentTarget.style.borderColor = VD.border;
                }}
              >
                <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                  <DotGlyphIcon
                    glyph={at.glyph}
                    size={compacto ? 12 : 16}
                    color={active ? accent : VD.textMuted}
                    showRecessed
                  />
                </div>
                <div style={{ overflow: 'hidden', minWidth: 0, flex: 1 }}>
                  <div
                    style={{
                      fontFamily: VD.mono,
                      fontSize: 9,
                      color: active ? VD.text : VD.textDim,
                      letterSpacing: 0.5,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      fontWeight: active ? 600 : 500,
                    }}
                  >
                    {t(at.label)}
                  </div>
                  {!compacto && (
                    <div
                      style={{
                        fontFamily: VD.mono,
                        fontSize: 8,
                        color: VD.textMuted,
                        marginTop: 4,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        lineHeight: '1.25',
                      }}
                    >
                      {t(at.desc)}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
