import React from 'react';
import { Subdivision2x2 } from './Subdivision2x2';
import { DotContinuousSlider } from '../dot480/DotContinuousSlider';
import { DotRotaryDial } from '../dot480/DotRotaryDial';
import { ContenidoCentral } from './ContenidoCentral';
import { RotuloCelda } from './RotuloCelda';
import { useAspectoAudio } from './useAspectoAudio';
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
  actionGlyph: string;
  widgetData?: { line1: string; line2?: string; tone?: 'warn' | 'crit' };
  displayLabel?: string;
  rotaryStep: number;
  lastRotaryDir: 1 | -1;
  lastRotaryTime: number;
  hovered: boolean;
  /** El botón es `isToggle` y está encendido: se pinta su `aspectoEncendido`. */
  encendido: boolean;
  /** Crece en cada pulsación (destello de `usePulsacionRaton`). */
  pulsoId: number;
  /**
   * Lo que el plugin de este botón está pintando (roadmap 83). Su imagen va a
   * sangre en `CapasDeFondo` y su título sustituye al nombre del botón: es lo
   * que el plugin quiere que se lea en la tecla, no lo que escribió el autor
   * del perfil hace seis meses.
   */
  plugin?: { imagen?: string; titulo?: string };
}

/**
 * Despacha el contenido interno de una celda:
 * - Subdivisión 2×2
 * - Control deslizante continuo (slider táctil)
 * - Dial rotativo (encoder de ajuste) o contenido central estándar
 * - Rótulo inferior
 */
export function CuerpoCelda(props: CuerpoCeldaProps) {
  // Fase 2 del switch de audio: solo las celdas de audio resuelven el aspecto
  // reactivo (icono y sublabel de la salida activa); el resto va por el camino
  // de siempre, sin suscribirse ni pedir nada.
  if (props.button.action.type === 'audio-device') return <CuerpoAudio {...props} />;
  return <CuerpoEstatico {...props} />;
}

/** Celda de audio con el icono y sublabel de la salida que manda ahora. */
function CuerpoAudio(props: CuerpoCeldaProps) {
  const botonVivo = useAspectoAudio(props.button);
  return <CuerpoEstatico {...props} button={botonVivo} />;
}

function CuerpoEstatico({
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
  actionGlyph,
  widgetData,
  displayLabel,
  rotaryStep,
  lastRotaryDir,
  lastRotaryTime,
  hovered,
  encendido,
  pulsoId,
  plugin,
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
      actionGlyph={actionGlyph}
      widgetData={widgetData}
      encendido={encendido}
      pulsoId={pulsoId}
      imagenAjena={!!plugin?.imagen}
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

      {(plugin?.titulo || displayLabel) && (
        <RotuloCelda
          texto={plugin?.titulo || displayLabel}
          button={button}
          accent={accent}
          toggled={toggled}
          sobreImagenPropia={plugin?.imagen ? true : undefined}
        />
      )}
    </>
  );
}

