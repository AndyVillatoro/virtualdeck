import React from 'react';
import { useTheme } from '../../../utils/theme';
import { useT } from '../../../utils/i18n';
import {
  GRUPO_GLIFOS,
  GRUPO_RECIENTES,
  GRUPO_SIMPLE,
  GRUPO_TABLER,
  GRUPO_TODAS,
  grupoAccionCategoria,
  grupoMarcaDestacada,
} from './grupos';
import type { IndiceDot } from '../../../data/iconosDot/tipos';

interface Fila {
  id: string;
  etiqueta: string;
  recuento: number;
}

interface Bloque {
  /** Si trae id, el título es la fila elegible (un solo grupo). */
  id?: string;
  titulo: string;
  filas: Fila[];
}

export interface BarraGruposProps {
  indice: IndiceDot | null;
  recuentos: Map<string, number>;
  buscando: boolean;
  grupoActivo: string;
  onElegir: (grupo: string) => void;
  plegada: boolean;
  accent: string;
}

function construirBloques(
  indice: IndiceDot | null,
  recuentos: Map<string, number>,
  buscando: boolean,
  t: (clave: string) => string,
): Bloque[] {
  const cuenta = (id: string) => recuentos.get(id) ?? 0;
  const fila = (id: string, etiqueta: string): Fila => ({ id, etiqueta, recuento: cuenta(id) });
  const bloques: Bloque[] = [];
  if (buscando) {
    bloques.push({ id: GRUPO_TODAS, titulo: t('cat.todas'), filas: [] });
  }
  if (!buscando || cuenta(GRUPO_RECIENTES) > 0) {
    bloques.push({ id: GRUPO_RECIENTES, titulo: t('cat.recientes'), filas: [] });
  }
  bloques.push({ id: GRUPO_GLIFOS, titulo: t('cat.glifos'), filas: [] });
  bloques.push({
    titulo: t('cat.acciones'),
    filas: [
      fila(GRUPO_TABLER, t('cat.tablerTodas')),
      ...(indice?.categorias ?? []).map((c) => fila(grupoAccionCategoria(c.titulo), c.titulo)),
    ].filter((f) => !buscando || f.recuento > 0),
  });
  bloques.push({
    titulo: t('cat.marcasDestacadas'),
    filas: (indice?.destacadas ?? [])
      .map((g) => fila(grupoMarcaDestacada(g.titulo), g.titulo))
      .filter((f) => !buscando || f.recuento > 0),
  });
  bloques.push({ id: GRUPO_SIMPLE, titulo: t('cat.marcasAz'), filas: [] });
  return bloques;
}

export function BarraGrupos({
  indice,
  recuentos,
  buscando,
  grupoActivo,
  onElegir,
  plegada,
  accent,
}: BarraGruposProps) {
  const VD = useTheme();
  const t = useT();
  const bloques = construirBloques(indice, recuentos, buscando, t);
  const numero = (id: string) => recuentos.get(id) ?? 0;

  if (plegada) {
    return (
      <div
        style={{
          padding: '8px 12px',
          borderBottom: `1px solid ${VD.border}`,
          background: VD.elevated,
          flexShrink: 0,
        }}
      >
        <select
          value={grupoActivo}
          onChange={(e) => onElegir(e.target.value)}
          style={{
            width: '100%',
            height: 32,
            background: VD.surface,
            color: VD.text,
            border: `1px solid ${VD.borderStrong}`,
            borderRadius: VD.radius.sm,
            fontFamily: VD.mono,
            fontSize: 10,
            letterSpacing: 0.5,
            padding: '0 8px',
          }}
        >
          {bloques.map((bloque) =>
            bloque.id ? (
              <option key={bloque.id} value={bloque.id}>
                {bloque.titulo} ({numero(bloque.id)})
              </option>
            ) : (
              <optgroup key={bloque.titulo} label={bloque.titulo}>
                {bloque.filas.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.etiqueta} ({f.recuento})
                  </option>
                ))}
              </optgroup>
            ),
          )}
        </select>
      </div>
    );
  }

  return (
    <div
      className="vd-scroll"
      style={{
        width: 210,
        flexShrink: 0,
        overflowY: 'auto',
        borderRight: `1px solid ${VD.border}`,
        padding: '6px 0',
        background: VD.surface,
      }}
    >
      {bloques.map((bloque) => (
        <div key={bloque.id ?? bloque.titulo} style={{ marginBottom: 4 }}>
          {bloque.id ? (
            <FilaGrupo
              etiqueta={bloque.titulo}
              recuento={numero(bloque.id)}
              activa={grupoActivo === bloque.id}
              accent={accent}
              onElegir={() => onElegir(bloque.id!)}
            />
          ) : (
            <>
              <div
                style={{
                  padding: '6px 12px 2px',
                  fontFamily: VD.mono,
                  fontSize: 8,
                  color: VD.textMuted,
                  letterSpacing: 1,
                }}
              >
                {bloque.titulo}
              </div>
              {bloque.filas.map((f) => (
                <FilaGrupo
                  key={f.id}
                  etiqueta={f.etiqueta}
                  recuento={f.recuento}
                  activa={grupoActivo === f.id}
                  accent={accent}
                  sangrada
                  onElegir={() => onElegir(f.id)}
                />
              ))}
            </>
          )}
        </div>
      ))}
    </div>
  );
}

function FilaGrupo({
  etiqueta,
  recuento,
  activa,
  accent,
  sangrada = false,
  onElegir,
}: {
  etiqueta: string;
  recuento: number;
  activa: boolean;
  accent: string;
  sangrada?: boolean;
  onElegir: () => void;
}) {
  const VD = useTheme();
  return (
    <button
      type="button"
      onClick={onElegir}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: `6px 12px 6px ${sangrada ? 20 : 12}px`,
        background: activa ? VD.accentBg : 'transparent',
        border: 'none',
        borderLeft: `2px solid ${activa ? accent : 'transparent'}`,
        cursor: 'pointer',
        textAlign: 'left',
      }}
    >
      <span
        style={{
          flex: 1,
          minWidth: 0,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          fontFamily: VD.mono,
          fontSize: 10,
          fontWeight: activa ? 'bold' : 'normal',
          letterSpacing: 0.4,
          color: activa ? accent : VD.textDim,
        }}
      >
        {etiqueta}
      </span>
      <span style={{ fontFamily: VD.mono, fontSize: 8, color: VD.textMuted }}>{recuento}</span>
    </button>
  );
}
