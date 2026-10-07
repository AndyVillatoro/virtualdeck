import React, { useMemo, useState } from 'react';
import { useTheme } from '../../utils/theme';
import { useT, useFieldText } from '../../utils/i18n';
import { DotLabel } from '../../components/DotLabel';
import { ButtonCell } from '../../components/ButtonCell';
import { interpolate } from '../../comun/interpolar';
import type {
  ButtonAction,
  SubButtonConfig,
} from '../../types';
import {
  armarBotonParaVista,
  AlternadorToggle,
  AlternadorCuadrantes2x2,
  SeccionHardwareDock,
  InfoAccionesExtra,
  ejecutarClickPreview,
  useConfigVivo,
  useLiveWidgetData,
  useDockInfoVista,
} from './VistaPreviaPiezas';
import type { VistaCampos } from './VistaPreviaPiezas';

export type { VistaCampos };

export function VistaPrevia({
  id,
  page,
  accent,
  action,
  extraActions,
  isToggle,
  campos,
  subButtons,
  is2x2Mode,
  previewToggled = false,
  onTogglePreview,
}: {
  id: string;
  page: number;
  accent: string;
  action: ButtonAction;
  extraActions: ButtonAction[];
  isToggle: boolean;
  subButtons?: SubButtonConfig[];
  is2x2Mode?: boolean;
  previewToggled?: boolean;
  onTogglePreview?: () => void;
  campos: VistaCampos;
}) {
  const VD = useTheme();
  const t = useT();
  const tf = useFieldText();
  const api = window.electronAPI;

  const deckConfig = useConfigVivo(api);
  const deckState = useMemo(() => deckConfig?.state ?? {}, [deckConfig?.state]);
  const botonOriginal = useMemo(
    () => deckConfig?.buttons?.find((b) => b.id === id),
    [deckConfig?.buttons, id],
  );

  const isEncendido = Boolean(isToggle && previewToggled);
  const boton = useMemo(() => armarBotonParaVista({
    id,
    page,
    action,
    extraActions,
    isToggle,
    campos,
    subButtons,
    is2x2Mode,
    isEncendido,
    deckState,
    botonOriginal,
  }), [id, page, action, extraActions, isToggle, campos, subButtons, is2x2Mode, isEncendido, deckState, botonOriginal]);

  const resolvedLabel = useMemo(() => interpolate(campos.label, deckState), [campos.label, deckState]);
  const widgetData = useLiveWidgetData(boton, deckState, api);

  const [subToggled, setSubToggled] = useState<boolean[]>([false, false, false, false]);

  const dockInfo = useDockInfoVista(boton, deckConfig?.pages, isEncendido, widgetData);
  const tituloHardware = useMemo(() => {
    const num = dockInfo.indice;
    return `${t('disp.paginaEnAparato').toUpperCase()} · ${t('disp.tecla', { n: num }).toUpperCase()}`;
  }, [dockInfo.indice, t]);

  const esModo2x2Activo = Boolean(is2x2Mode && subButtons && subButtons.length === 4);
  const textoAccionesExtra = extraActions.length > 1 ? tf('acciones adicionales') : tf('acción adicional');

  return (
    <div
      style={{
        width: 200,
        borderRight: `1px solid ${VD.border}`,
        padding: '20px 16px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        background: VD.bg,
        flexShrink: 0,
        gap: 12,
        overflowY: 'auto',
      }}
    >
      <DotLabel size={9} color={VD.textMuted} spacing={2}>
        {t('ed.preview')}
      </DotLabel>
      <div style={{ width: 120, height: 120, display: 'grid', userSelect: 'none' }}>
        <ButtonCell
          button={boton}
          accent={accent}
          toggled={isEncendido}
          subToggled={subToggled}
          soundEnabled={false}
          widgetData={widgetData}
          deckState={deckState}
          resolvedLabel={resolvedLabel}
          onEdit={() => {}}
          onExecute={(target) => {
            ejecutarClickPreview(esModo2x2Activo, target?.id, subButtons, setSubToggled, isToggle, onTogglePreview);
          }}
        />
      </div>

      {isToggle && !esModo2x2Activo && (
        <AlternadorToggle
          isEncendido={isEncendido}
          onTogglePreview={onTogglePreview}
          accent={accent}
          vdElevated={VD.elevated}
          vdBorder={VD.border}
          vdRadiusSm={VD.radius.sm}
          vdTextDim={VD.textDim}
          vdMono={VD.mono}
          labelApagado={tf('APAGADO')}
          labelEncendido={tf('ENCENDIDO')}
          labelModo={t('ed.toggleMode')}
        />
      )}

      {esModo2x2Activo && subButtons && (
        <AlternadorCuadrantes2x2
          subButtons={subButtons}
          subToggled={subToggled}
          onToggleCuadrante={(idx) => {
            setSubToggled((prev) => {
              const next = [...prev];
              next[idx] = !next[idx];
              return next;
            });
          }}
          accent={accent}
          vdElevated={VD.elevated}
          vdBorder={VD.border}
          vdRadiusSm={VD.radius.sm}
          vdTextDim={VD.textDim}
          vdMono={VD.mono}
          labelModo={`2×2 · ${t('ed.split.toggle')}`}
        />
      )}

      <SeccionHardwareDock
        esDock={dockInfo.esDock}
        conPantalla={dockInfo.conPantalla}
        lcdDataUrl={dockInfo.lcdDataUrl}
        titulo={tituloHardware}
        vdBorder={VD.border}
        vdRadiusSm={VD.radius.sm}
        vdMono={VD.mono}
        vdTextDim={VD.textDim}
        avisoSinPantalla={tf('Este control no tiene pantalla: solo la etiqueta se ve en la vista del deck.')}
      />

      <InfoAccionesExtra
        count={extraActions.length}
        vdMono={VD.mono}
        vdTextMuted={VD.textMuted}
        label={textoAccionesExtra}
      />

      <div style={{ fontFamily: VD.mono, fontSize: 9, color: VD.textMuted, textAlign: 'center', lineHeight: 1.6 }}>
        {t('editor.previewHint')}<br />{t('editor.previewHint2')}
      </div>
    </div>
  );
}

