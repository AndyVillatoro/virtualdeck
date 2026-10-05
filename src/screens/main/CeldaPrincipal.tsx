import React from 'react';
import { ButtonCell } from '../../components/ButtonCell';
import { useT } from '../../utils/i18n';
import { interpolate } from '../../utils/actions';
import { botonActivo, botonVisible, type useEstadoSistema } from '../../utils/estadoSistema';
import type { useSensors } from '../../utils/sensors';
import type { useDatosWidget } from '../../components/celda/useDatosWidget';
import type { ButtonConfig, SoundProfileId } from '../../types';

interface CeldaPrincipalProps {
  btn: ButtonConfig;
  /** T-HW-12 — el botón es fijo y se ve desde otra página de su grupo. */
  esFija?: boolean;
  nombrePaginaOriginal?: string;
  onQuitarFijo?: () => void;
  onIrAPagina?: () => void;
  accent: string;
  toggledIds: Set<string>;
  selectedIds: Set<string>;
  estadoSistema: ReturnType<typeof useEstadoSistema>;
  sensorList: ReturnType<typeof useSensors>['sensors'];
  widgetDataMap: ReturnType<typeof useDatosWidget>;
  runningButtons: Set<string>;
  soundOnPress: boolean;
  soundProfile: SoundProfileId;
  deckState: Record<string, string>;
  canPasteButton?: boolean;
  onEditButton: (id: string) => void;
  executeButton: (btn: ButtonConfig) => void;
  executeLongPressButton: (btn: ButtonConfig) => void;
  onStateUpdate: (update: Record<string, string>) => void;
  onDuplicateButton: (id: string) => void;
  onCopyButton?: (id: string) => void;
  onPasteButton?: (id: string) => void;
  onClearButton: (id: string) => void;
  onUpdateButton?: (btn: ButtonConfig) => void;
  onTogglePin: (id: string) => void;
  onConmutarSeleccion: (id: string) => void;
  onArrastrar: (id: string | null) => void;
  onSwapButtons: (idA: string, idB: string) => void;
  showToast: (texto: string) => void;
}

/** Una celda de la rejilla principal, con todo su cableado. */
export function CeldaPrincipal(props: CeldaPrincipalProps) {
  const {
    btn, esFija, nombrePaginaOriginal, onQuitarFijo, onIrAPagina, accent, toggledIds, selectedIds, estadoSistema, sensorList, widgetDataMap,
    runningButtons, soundOnPress, soundProfile, deckState, canPasteButton,
    onEditButton, executeButton, executeLongPressButton, onStateUpdate,
    onDuplicateButton, onCopyButton, onPasteButton, onClearButton, onUpdateButton,
    onTogglePin, onConmutarSeleccion, onArrastrar, onSwapButtons, showToast,
  } = props;
  const t = useT();

  const handleAvisoFijo = () => {
    showToast(t('cell.fijoAviso', { pagina: nombrePaginaOriginal || t('page.defaultName', { n: btn.page + 1 }) }));
  };

  return (
    <ButtonCell
      key={btn.id}
      button={btn}
      accent={accent}
      toggled={toggledIds.has(btn.id)}
      subToggled={btn.subButtons?.map((s) => toggledIds.has(s.id))}
      isSelected={!esFija && selectedIds.has(btn.id)}
      esFija={esFija}
      nombrePaginaOriginal={nombrePaginaOriginal}
      onQuitarFijo={onQuitarFijo}
      onIrAPagina={onIrAPagina}
      onAvisoFijo={handleAvisoFijo}
      isActive={botonActivo(btn, estadoSistema)}
      isHidden={!botonVisible(btn, estadoSistema, sensorList)}
      isRunning={runningButtons.has(btn.id)}
      widgetData={widgetDataMap[btn.id]}
      soundEnabled={soundOnPress}
      soundProfile={soundProfile}
      deckState={deckState}
      onStateUpdate={(k, v) => onStateUpdate({ [k]: v })}
      resolvedLabel={btn.label.includes('{') ? interpolate(btn.label, deckState) : undefined}
      onEdit={() => onEditButton(btn.id)}
      onExecute={(target) => executeButton(target ?? btn)}
      onAdjustWheel={(signo) => executeButton({ ...btn, action: {
        ...btn.action, adjustDelta: Math.abs(btn.action.adjustDelta ?? 10) * signo,
      } })}
      onLongPress={(target) => {
        const b = target ?? btn;
        if (b.longPressAction && b.longPressAction.type !== 'none') executeLongPressButton(b);
      }}
      onSelect={() => {
        if (!esFija) onConmutarSeleccion(btn.id);
      }}
      onDuplicate={esFija ? undefined : () => onDuplicateButton(btn.id)}
      onCopy={esFija ? undefined : () => {
        onCopyButton?.(btn.id);
        showToast(t('cell.copied'));
      }}
      onPaste={esFija ? undefined : () => {
        onPasteButton?.(btn.id);
        showToast(t('cell.pasted'));
      }}
      canPaste={!esFija && canPasteButton}
      onClear={esFija ? undefined : () => onClearButton(btn.id)}
      onQuickSlider={esFija ? undefined : (target) => {
        const isVol = target === 'volume';
        onUpdateButton?.({
          ...btn,
          label: isVol ? 'VOLUMEN' : 'BRILLO',
          icon: isVol ? 'SPEAKER' : 'WEATHER_SUN',
          action: { type: 'adjust', adjustTarget: target, adjustDelta: 0 },
          widget: 'slider',
          sliderWidget: {
            target,
            min: 0,
            max: 100,
            step: isVol ? 2 : 5,
            orientation: 'horizontal',
            showValue: true,
          },
        });
      }}
      onTogglePin={esFija ? undefined : () => onTogglePin(btn.id)}
      onDragStart={() => {
        if (esFija) {
          handleAvisoFijo();
          return;
        }
        onArrastrar(btn.id);
      }}
      onDragEnd={() => onArrastrar(null)}
      onDrop={(sourceId) => {
        if (esFija) {
          handleAvisoFijo();
          onArrastrar(null);
          return;
        }
        if (sourceId && sourceId !== btn.id) onSwapButtons(sourceId, btn.id);
        onArrastrar(null);
      }}
    />
  );
}
