import React, { useState } from 'react';
import { VD } from '../design';
import { DotLabel } from '../components/DotLabel';
import { Wallpaper } from '../components/Wallpaper';

interface EditorBProps {
  buttonIndex: number;
  onClose: () => void;
  accent: string;
}

const STEPS = ['01 · ACTION', '02 · CONFIG', '03 · STYLE'];

const OPTIONS = [
  { l: 'RUN IN BACKGROUND', on: true },
  { l: 'SHOW NOTIFICATION', on: false },
  { l: 'CONFIRM BEFORE RUN', on: false },
];

export function EditorB({ buttonIndex, onClose, accent }: EditorBProps) {
  const [step, setStep] = useState(1);
  const [options, setOptions] = useState(OPTIONS.map((o) => o.on));

  const toggleOption = (i: number) => {
    setOptions((prev) => prev.map((v, idx) => (idx === i ? !v : v)));
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Background */}
      <div style={{ position: 'absolute', inset: 0 }}>
        <Wallpaper kind="scanlines" />
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)' }} />
      </div>

      {/* Backdrop click to close */}
      <div
        style={{ position: 'absolute', inset: 0, cursor: 'pointer' }}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          width: 'min(880px, 95vw)',
          height: 'min(560px, 90vh)',
          background: VD.surface,
          border: `1px solid ${VD.borderStrong}`,
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 40px 100px rgba(0,0,0,0.8)',
          zIndex: 1,
        }}
      >
        {/* Header */}
        <div
          style={{
            height: 42,
            borderBottom: `1px solid ${VD.border}`,
            display: 'flex',
            alignItems: 'center',
            padding: '0 16px',
            gap: 12,
            flexShrink: 0,
          }}
        >
          <div style={{ width: 6, height: 6, borderRadius: 3, background: '#ff3d3d' }} />
          <DotLabel size={11} color="#fff" spacing={2}>
            CONFIGURE BUTTON
          </DotLabel>
          <span style={{ fontFamily: VD.mono, fontSize: 10, color: VD.textMuted }}>
            · PAGE MAIN / POSITION {String(buttonIndex + 1).padStart(2, '0')}
          </span>
          <div style={{ flex: 1 }} />
          <button
            onClick={onClose}
            style={{
              color: VD.textDim,
              fontSize: 18,
              background: 'transparent',
              border: 'none',
              lineHeight: 1,
              cursor: 'pointer',
            }}
          >
            ×
          </button>
        </div>

        {/* Wizard steps */}
        <div
          style={{
            display: 'flex',
            padding: '20px 28px',
            gap: 4,
            borderBottom: `1px solid ${VD.border}`,
            flexShrink: 0,
          }}
        >
          {STEPS.map((s, i) => (
            <div
              key={s}
              style={{ flex: 1, cursor: 'pointer' }}
              onClick={() => setStep(i)}
            >
              <div
                style={{
                  height: 2,
                  background: i <= step ? '#ff3d3d' : VD.border,
                  transition: 'background 0.2s',
                }}
              />
              <div
                style={{
                  marginTop: 10,
                  fontFamily: VD.mono,
                  fontSize: 10,
                  letterSpacing: 2,
                  color: i === step ? '#fff' : i < step ? VD.textDim : VD.textMuted,
                }}
              >
                {s}
              </div>
            </div>
          ))}
        </div>

        {/* Body */}
        <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
          {/* Live preview */}
          <div
            style={{
              width: 280,
              borderRight: `1px solid ${VD.border}`,
              padding: 28,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(0,0,0,0.2)',
              flexShrink: 0,
            }}
          >
            <DotLabel size={10} color={VD.textMuted} spacing={2} style={{ marginBottom: 16 }}>
              LIVE PREVIEW
            </DotLabel>
            <div
              style={{
                width: 160,
                height: 160,
                borderRadius: 6,
                background: 'rgba(255,61,61,0.08)',
                border: '1px solid #ff3d3d',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 18,
                boxShadow: '0 0 60px rgba(255,61,61,0.2)',
              }}
            >
              <div
                style={{
                  width: 50,
                  height: 50,
                  borderRadius: 6,
                  background: '#ff3d3d',
                  opacity: 0.9,
                }}
              />
              <DotLabel size={14} color="#fff" spacing={2}>
                OBS REC
              </DotLabel>
            </div>
            <div
              style={{
                marginTop: 24,
                fontFamily: VD.mono,
                fontSize: 10,
                color: VD.textDim,
                textAlign: 'center',
              }}
            >
              TAP TO TEST
            </div>
            <div
              style={{
                marginTop: 4,
                fontFamily: VD.mono,
                fontSize: 10,
                color: VD.textMuted,
                textAlign: 'center',
              }}
            >
              → obs-cli record toggle
            </div>
          </div>

          {/* Form */}
          <div
            style={{
              flex: 1,
              padding: 28,
              display: 'flex',
              flexDirection: 'column',
              gap: 20,
              overflowY: 'auto',
            }}
          >
            <div>
              <DotLabel size={9} color={VD.textMuted} spacing={2} style={{ display: 'block', marginBottom: 8 }}>
                COMMAND
              </DotLabel>
              <div
                style={{
                  background: VD.bg,
                  border: `1px solid ${VD.borderStrong}`,
                  padding: '12px 14px',
                  color: '#fff',
                  fontFamily: VD.mono,
                  fontSize: 12,
                }}
              >
                <span style={{ color: VD.textMuted }}>$</span> obs-cli record toggle
                <span style={{ color: '#ff3d3d', marginLeft: 4 }}>▋</span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <DotLabel size={9} color={VD.textMuted} spacing={2} style={{ display: 'block', marginBottom: 8 }}>
                  WORKING DIR
                </DotLabel>
                <div
                  style={{
                    background: VD.bg,
                    border: `1px solid ${VD.border}`,
                    padding: '10px 12px',
                    color: VD.textDim,
                    fontFamily: VD.mono,
                    fontSize: 11,
                  }}
                >
                  ~/Documents
                </div>
              </div>
              <div>
                <DotLabel size={9} color={VD.textMuted} spacing={2} style={{ display: 'block', marginBottom: 8 }}>
                  SHELL
                </DotLabel>
                <div
                  style={{
                    background: VD.bg,
                    border: `1px solid ${VD.border}`,
                    padding: '10px 12px',
                    color: '#fff',
                    fontFamily: VD.mono,
                    fontSize: 11,
                  }}
                >
                  powershell ▾
                </div>
              </div>
            </div>

            <div>
              <DotLabel size={9} color={VD.textMuted} spacing={2} style={{ display: 'block', marginBottom: 10 }}>
                OPTIONS
              </DotLabel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {OPTIONS.map((o, i) => (
                  <div
                    key={o.l}
                    style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
                    onClick={() => toggleOption(i)}
                  >
                    {/* Toggle */}
                    <div
                      style={{
                        width: 32,
                        height: 18,
                        background: options[i] ? '#ff3d3d' : VD.border,
                        borderRadius: 9,
                        padding: 2,
                        position: 'relative',
                        transition: 'background 0.2s',
                        flexShrink: 0,
                      }}
                    >
                      <div
                        style={{
                          width: 14,
                          height: 14,
                          borderRadius: 7,
                          background: '#fff',
                          position: 'absolute',
                          right: options[i] ? 2 : undefined,
                          left: options[i] ? undefined : 2,
                          top: 2,
                          transition: 'left 0.2s, right 0.2s',
                        }}
                      />
                    </div>
                    <span
                      style={{
                        fontFamily: VD.mono,
                        fontSize: 11,
                        color: options[i] ? '#fff' : VD.textDim,
                        letterSpacing: 1,
                      }}
                    >
                      {o.l}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <DotLabel size={9} color={VD.textMuted} spacing={2} style={{ display: 'block', marginBottom: 8 }}>
                HOTKEY (OPTIONAL)
              </DotLabel>
              <div style={{ display: 'flex', gap: 6 }}>
                {['CTRL', 'SHIFT', 'F9'].map((k) => (
                  <div
                    key={k}
                    style={{
                      padding: '8px 12px',
                      background: VD.bg,
                      border: `1px solid ${VD.border}`,
                      fontFamily: VD.mono,
                      fontSize: 11,
                      color: '#fff',
                      letterSpacing: 1,
                    }}
                  >
                    {k}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            height: 56,
            borderTop: `1px solid ${VD.border}`,
            display: 'flex',
            alignItems: 'center',
            padding: '0 20px',
            gap: 10,
            flexShrink: 0,
          }}
        >
          <button
            onClick={() => setStep(Math.max(0, step - 1))}
            style={{
              padding: '10px 16px',
              border: `1px solid ${VD.border}`,
              fontFamily: VD.mono,
              fontSize: 10,
              letterSpacing: 2,
              color: VD.textDim,
              background: 'transparent',
            }}
          >
            ← BACK
          </button>
          <div style={{ flex: 1 }} />
          <span style={{ fontFamily: VD.mono, fontSize: 10, color: VD.textMuted, letterSpacing: 1 }}>
            STEP {String(step + 1).padStart(2, '0')} OF {String(STEPS.length).padStart(2, '0')}
          </span>
          <button
            onClick={onClose}
            style={{
              padding: '10px 16px',
              border: `1px solid ${VD.border}`,
              fontFamily: VD.mono,
              fontSize: 10,
              letterSpacing: 2,
              color: VD.textDim,
              background: 'transparent',
            }}
          >
            CANCEL
          </button>
          <button
            onClick={() => {
              if (step < STEPS.length - 1) setStep(step + 1);
              else onClose();
            }}
            style={{
              padding: '10px 22px',
              background: '#ff3d3d',
              border: 'none',
              fontFamily: VD.mono,
              fontSize: 10,
              letterSpacing: 2,
              color: '#fff',
              cursor: 'pointer',
            }}
          >
            {step < STEPS.length - 1 ? 'NEXT →' : 'SAVE ✓'}
          </button>
        </div>
      </div>
    </div>
  );
}
