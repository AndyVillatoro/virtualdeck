import React, { useEffect, useState } from 'react';
import { VD } from '../design';
import { DotText } from './DotText';
import { DotLabel } from './DotLabel';
import { useT } from '../utils/i18n';

interface OnboardingProps {
  accent: string;
  /** Se llama al terminar o saltar. El caller persiste onboardingCompleted: true. */
  onClose: () => void;
}

// Tutorial inicial (6.x del roadmap). Se muestra en la primera ejecución
// (instalación virgen, sin onboardingCompleted en config) y se puede repetir
// desde Ayuda → Acerca de → "Repetir tutorial". Los textos vienen de i18n.
const STEP_COUNT = 5;

export function Onboarding({ accent, onClose }: OnboardingProps) {
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

  const next = () => (isLast ? onClose() : setStep((i) => i + 1));
  const prev = () => setStep((i) => Math.max(0, i - 1));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key === 'ArrowRight' || e.key === 'Enter') { e.preventDefault(); next(); }
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
          <DotText text={s.title} dotSize={isFirst ? 5 : 4} gap={1.5} color={accent} />
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
