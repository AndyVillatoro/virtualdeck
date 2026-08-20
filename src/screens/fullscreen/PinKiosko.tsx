import React, { useState } from 'react';
import { useTheme } from '../../utils/theme';
import { useT } from '../../utils/i18n';
import { DotLabel } from '../../components/DotLabel';

/**
 * El PIN del modo kiosko.
 *
 * Kiosko sirve para dejar el deck en una pantalla y que nadie toque nada mas:
 * se esconde la interfaz y **ESC deja de salir**. El PIN es lo unico que
 * devuelve el control, asi que sin el no se sale.
 *
 * Aqui vive su estado y su comprobacion, que estaban sueltos en `FullscreenB`
 * entre la rejilla y el reloj sin tener que ver con ninguno de los dos.
 */

/** Cuatro digitos: suficiente para que no lo toque quien pasa, corto para teclear. */
const LARGO_PIN = 4;
/** Lo que dura el temblor del cuadro cuando el PIN no vale. */
const MS_TEMBLOR = 350;

export type ModoPin = null | 'set' | 'exit';

interface Props {
  modo: ModoPin;
  setModo: (m: ModoPin) => void;
  /** El PIN guardado en la configuracion, para comparar al salir. */
  pinGuardado: string;
  accent: string;
  /** Guardar un PIN nuevo (solo al activar kiosko). */
  onGuardarPin: (pin: string) => void;
  /** Entrar o salir de kiosko cuando el PIN es correcto. */
  setKioskActive: (v: boolean) => void;
}

export function PinKiosko({ modo, setModo, pinGuardado, accent, onGuardarPin, setKioskActive }: Props) {
  const VD = useTheme();
  const t = useT();
  const [pinInput, setPinInput] = useState('');
  const [pinShake, setPinShake] = useState(false);

  const temblar = () => {
    setPinShake(true);
    setTimeout(() => setPinShake(false), MS_TEMBLOR);
  };

  const submitPin = () => {
    if (pinInput.length !== LARGO_PIN || !/^\d{4}$/.test(pinInput)) { temblar(); return; }
    if (modo === 'set') {
      onGuardarPin(pinInput);
      setKioskActive(true);
      setModo(null);
      setPinInput('');
      return;
    }
    if (modo === 'exit') {
      if (pinInput === pinGuardado) {
        setKioskActive(false);
        setModo(null);
        setPinInput('');
      } else {
        // No se dice "PIN incorrecto": el temblor ya lo dice, y un mensaje
        // ayuda a quien esta probando numeros.
        temblar();
        setPinInput('');
      }
    }
  };

  if (!modo) return null;

  return (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 200,
          background: 'rgba(0,0,0,0.85)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            background: VD.surface, border: `1px solid ${VD.borderStrong}`,
            borderRadius: VD.radius.lg, padding: 28, width: 340,
            boxShadow: VD.shadow.modal,
            display: 'flex', flexDirection: 'column', gap: 14,
            transform: pinShake ? 'translateX(-6px)' : 'none',
            transition: 'transform 60ms',
            animation: pinShake ? 'vd-pin-shake 0.32s' : undefined,
          }}>
            <DotLabel size={10} color={VD.text} spacing={2}>
              {modo === 'set' ? 'ESTABLECER PIN DE 4 DÍGITOS' : 'INGRESA PIN PARA SALIR'}
            </DotLabel>
            <div style={{ fontFamily: VD.mono, fontSize: 9, color: VD.textMuted, letterSpacing: 1 }}>
              {modo === 'set'
                ? 'Necesario una vez para activar el modo kiosko. Lo guardamos en tu config.'
                : 'Modo kiosko activo. ESC desactiva con PIN.'}
            </div>
            <input
              autoFocus
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={4}
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submitPin();
                if (e.key === 'Escape') { e.preventDefault(); setModo(null); setPinInput(''); }
              }}
              placeholder="••••"
              style={{
                fontFamily: VD.mono, fontSize: 22, letterSpacing: 12,
                textAlign: 'center', padding: '12px 14px',
                background: VD.elevated, border: `1px solid ${VD.borderStrong}`,
                color: VD.text, outline: 'none', borderRadius: VD.radius.md,
              }}
            />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                onClick={() => { setModo(null); setPinInput(''); }}
                style={{
                  padding: '8px 14px', background: 'transparent', border: `1px solid ${VD.border}`,
                  color: VD.textDim, fontFamily: VD.mono, fontSize: 9, letterSpacing: 1,
                  cursor: 'pointer', borderRadius: VD.radius.sm,
                }}
              >{t('ui.cancel')}</button>
              <button
                onClick={submitPin}
                style={{
                  padding: '8px 14px', background: VD.accentBg, border: `1px solid ${accent}`,
                  color: accent, fontFamily: VD.mono, fontSize: 9, letterSpacing: 1,
                  cursor: 'pointer', borderRadius: VD.radius.sm,
                }}
              >{modo === 'set' ? 'GUARDAR' : 'CONFIRMAR'}</button>
            </div>
          </div>
        </div>
  );
}
