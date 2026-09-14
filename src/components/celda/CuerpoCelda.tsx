import React from 'react';
import { Subdivision2x2 } from './Subdivision2x2';
import { DotContinuousSlider } from '../dot480/DotContinuousSlider';
import { DotRotaryDial } from '../dot480/DotRotaryDial';
import { ContenidoCentral } from './ContenidoCentral';
import { RotuloCelda } from './RotuloCelda';
import type { VDIconProps } from '../VDIcon';
import type { ButtonConfig, SoundProfileId } from '../../types';

export interface CuerpoCeldaProps {
  button: ButtonConfig;
  accent: string;
  toggled: boolean;
  subToggled?: boolean[];
  hasSubButtons: boolean;
  soundEnabled: boolean;
  soundProfile: SoundProfileId;
  deckState?: Record<string, string>;
  onStateUpdate?: (k: string, v: string) => void;
  onExecute: (target?: ButtonConfig) => void;
  onLongPress?: (target?: ButtonConfig) => void;
  onContextMenu: (e: React.MouseEvent) => void;
  isEmpty: boolean;
  iconColor: string;
  ActionIcon: React.ComponentType<VDIconProps>;
  widgetData?: { line1: string; line2?: string; tone?: 'warn' | 'crit' };
  displayLabel?: string;
  rotaryStep: number;
  lastRotaryDir: 1 | -1;
  lastRotaryTime: number;
  hovered: boolean;
}

/**
 * Despacha el contenido interno de una celda:
 * - Subdivisión 2×2
 * - Control deslizante continuo (slider táctil)
 * - Dial rotativo (encoder de ajuste) o contenido central estándar
 * - Rótulo inferior
 */
export function CuerpoCelda({
  button,
  accent,
  toggled,
  subToggled,
  hasSubButtons,
  soundEnabled,
  soundProfile,
  deckState,
  onStateUpdate,
  onExecute,
  onLongPress,
  onContextMenu,
  isEmpty,
  iconColor,
  ActionIcon,
  widgetData,
  displayLabel,
  rotaryStep,
  lastRotaryDir,
  lastRotaryTime,
  hovered,
}: CuerpoCeldaProps) {
  if (hasSubButtons && button.subButtons) {
    return (
      <Subdivision2x2
        subButtons={button.subButtons}
        parentButton={button}
        accent={accent}
        subToggled={subToggled}
        soundEnabled={soundEnabled}
        soundProfile={soundProfile}
        onExecute={onExecute}
        onLongPress={onLongPress}
        onContextMenu={onContextMenu}
      />
    );
  }

  if (button.widget === 'slider') {
    return (
      <DotContinuousSlider
        button={button}
        sliderConfig={button.sliderWidget}
        accent={accent}
        deckState={deckState}
        onStateUpdate={onStateUpdate}
        soundEnabled={soundEnabled}
        soundProfile={soundProfile}
        toggled={toggled}
      />
    );
  }

  const isAdjust = button.action.type === 'adjust';
  const contenido = (
    <ContenidoCentral
      button={button}
      isEmpty={isEmpty}
      iconColor={iconColor}
      ActionIcon={ActionIcon}
      widgetData={widgetData}
    />
  );

  return (
    <>
      <div
        style={{
          position: 'relative',
          textAlign: 'center',
          padding: '6px 4px',
          paddingBottom: displayLabel ? 22 : 6,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {isAdjust ? (
          <DotRotaryDial
            step={rotaryStep}
            lastDir={lastRotaryDir}
            lastActiveTime={lastRotaryTime}
            accent={accent}
            hovered={hovered}
            delta={button.action.adjustDelta ?? 5}
          >
            {contenido}
          </DotRotaryDial>
        ) : (
          contenido
        )}
      </div>

      {displayLabel && (
        <RotuloCelda texto={displayLabel} button={button} accent={accent} toggled={toggled} />
      )}
    </>
  );
}

