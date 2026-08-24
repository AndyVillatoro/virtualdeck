import React, { useEffect, useState } from 'react';
import { useTheme } from '../utils/theme';
import { DotText } from './DotText';
import { DotLabel } from './DotLabel';
import { useT } from '../utils/i18n';
import { PasoIdioma, PasoApariencia, PasoRespaldo, type Idioma, type Tema } from './onboarding/pasos';

interface OnboardingProps {
  accent: string;
  language: Idioma;
  theme: Tema;
  onLanguageChange: (v: Idioma) => void;
  onThemeChange: (v: Tema) => void;
  onAccentChange: (c: string) => void;
  onExport: () => void | Promise<void>;
  onImport: () => void | Promise<void>;
  /** Se llama al terminar o saltar. El caller persiste onboardingCompleted: true. */
  onClose: () => void;
}

/*
 * Tutorial inicial (6.x del roadmap). Se muestra en la primera ejecución
 * (instalación virgen, sin onboardingCompleted en config) y se puede repetir
 * desde Ayuda → Acerca de → "Repetir tutorial". Los textos vienen de i18n.
 *
 * Los tres pasos con controles —idioma, apariencia y respaldo— van primero y
 * último a propósito. El idioma abre porque **todo lo que viene después se lee
 * en él**: dejarlo para los ajustes significaba que quien tuviera Windows en
 * un idioma y quisiera el otro leyera el tutorial entero en el que no es suyo.
 * El respaldo cierra porque importar una configuración existente solo tiene
 * sentido antes de empezar a montar botones encima.
 */
const STEP_COUNT = 7;

export function Onboarding({
  accent, language, theme,
  onLanguageChange, onThemeChange, onAccentChange, onExport, onImport, onClose,
}: OnboardingProps) {
  // La paleta viene del contexto, no de la importacion: importarla fijaba
  // el tema oscuro y el modo claro no llegaba a esta pantalla.
  const VD = useTheme();
  const t = useT();
  const [step, setStep] = useState(0);
  const isFirst = step === 0;
  const isLast = step === STEP_COUNT - 1;
  const n = step + 1;
  const s = {
    badge: `0${n}`,
    title: t(`onb.${n}.title`),
    body: t(`onb.${n}.body`),
    hint: t(`onb.${n}.hint`),
  };

  // Lo interactivo de cada paso, si lo tiene. Un mapa y no una cadena de
  // condiciones, por lo mismo que los formularios del editor: añadir un paso
  // con controles es añadir una entrada.
  const CONTROLES: Record<number, React.ReactNode> = {
    1: <PasoIdioma valor={language} accent={accent} onChange={onLanguageChange} />,
    2: <PasoApariencia tema={theme} accent={accent} onTema={onThemeChange} onAccent={onAccentChange} />,
    7: <PasoRespaldo accent={accent} onExport={onExport} onImport={onImport} />,
  };

  const next = () => (isLast ? onClose() : setStep((i) => i + 1));
  const prev = () => setStep((i) => Math.max(0, i - 1));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return; }
      // Enter avanza, salvo cuando el foco está en un control del propio paso:
      // ahí ya lo consume el botón, y avanzar además se llevaba por delante la
      // elección que se acababa de hacer.
      const enUnBoton = (e.target as HTMLElement)?.tagName === 'BUTTON';
      if (e.key === 'ArrowRight' || (e.key === 'Enter' && !enUnBoton)) { e.preventDefault(); next(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); prev(); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [step]);

  const primaryBtn: React.CSSProperties = {
    padding: '9px 20px', background: accent, border: 'none', color: '#fff',
    fontFamily: VD.mono, fontSize: 11, letterSpacing: 1.5, cursor: 'pointer',
    borderRadius: VD.radius.sm, textTransform: 'uppercase',
  };
  const ghostBtn: React.CSSProperties = {
    padding: '9px 16px', background: 'transparent', border: `1px solid ${VD.border}`,
    color: VD.textMuted, fontFamily: VD.mono, fontSize: 11, letterSpacing: 1, cursor: 'pointer',
    borderRadius: VD.radius.sm, textTransform: 'uppercase',
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 400,
        background: 'rgba(0,0,0,0.82)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        style={{
          width: 'min(560px, 94vw)',
          // Con la escala de interfaz al maximo la ventana minima deja unos
          // 340 px utiles, y la tarjeta mide ~470: sin tope se sale por arriba
          // y por abajo a la vez, y centrada no hay forma de alcanzar el boton.
          maxHeight: 'calc(100vh - 40px)', overflowY: 'auto',
          background: VD.surface, border: `1px solid ${VD.borderStrong}`,
          borderRadius: VD.radius.lg, boxShadow: VD.shadow.modal,
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}
      >
        {/* Header con la firma dot-matrix */}
        <div style={{
          padding: '28px 28px 20px', borderBottom: `1px solid ${VD.border}`,
          display: 'flex', flexDirection: 'column', gap: 14,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: accent }} />
            <DotLabel size={9} color={VD.textMuted} spacing={2}>{t('onb.step', { n: s.badge, total: STEP_COUNT })}</DotLabel>
          </div>
          {/* 560 de tarjeta menos 28+28 de relleno. Sin este tope, un titulo
              largo se dibuja mas ancho que la tarjeta y se corta. */}
          <DotText text={s.title} dotSize={isFirst ? 5 : 4} gap={1.5} color={accent} maxWidth={504} />
        </div>

        {/* Cuerpo */}
        <div style={{ padding: '22px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <p style={{
            margin: 0, fontFamily: VD.mono, fontSize: 13, lineHeight: 1.65,
            color: VD.text, letterSpacing: 0.3,
          }}>
            {s.body}
          </p>
          {s.hint && (
            <div style={{
              display: 'flex', gap: 10, alignItems: 'flex-start',
              padding: '10px 12px', borderRadius: VD.radius.md,
              background: VD.elevated, border: `1px solid ${VD.border}`,
            }}>
              <span style={{ color: accent, fontSize: 12, lineHeight: 1.5 }}>›</span>
              <span style={{ fontFamily: VD.mono, fontSize: 11, lineHeight: 1.55, color: VD.textMuted, letterSpacing: 0.3 }}>
                {s.hint}
              </span>
            </div>
          )}
          {CONTROLES[n]}
        </div>

        {/* Indicadores de paso */}
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', padding: '4px 0 18px' }}>
          {Array.from({ length: STEP_COUNT }, (_, i) => (
            <div
              key={i}
              onClick={() => setStep(i)}
              style={{
                width: i === step ? 18 : 6, height: 6, borderRadius: 3, cursor: 'pointer',
                background: i === step ? accent : VD.border,
                transition: 'width 0.15s, background 0.15s',
              }}
            />
          ))}
        </div>

        {/* Footer / navegación */}
        <div style={{
          padding: '14px 28px 20px', borderTop: `1px solid ${VD.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <button style={ghostBtn} onClick={onClose}>{t('onb.skip')}</button>
          <div style={{ display: 'flex', gap: 10 }}>
            {!isFirst && <button style={ghostBtn} onClick={prev}>{t('onb.back')}</button>}
            <button style={primaryBtn} onClick={next}>{isLast ? t('onb.start') : t('onb.next')}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
