import React from 'react';
import type { VDTokens } from '../../../design';
import { useTheme } from '../../../utils/theme';
import { estiloCampo } from '../../../components/ui/estilos';
import { useT, useFieldText } from '../../../utils/i18n';
import { DotGlyphIcon } from '../../../components/dot480/DotGlyphIcon';
import { BotonIcono } from '../../../components/ui/BotonIcono';
import { ACTION_TYPES } from '../actionData';
import type { ButtonAction } from '../../../types';

export interface PropsFilaAccionExtra {
  action: ButtonAction;
  stepIndex?: number;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onChange: (a: ButtonAction) => void;
  onRemove: () => void;
}

interface PropsCampoExtra {
  action: ButtonAction;
  onChange: (a: ButtonAction) => void;
  accent: string;
}

function estiloEntradaMini(VD: VDTokens): React.CSSProperties {
  return { ...estiloCampo(VD, 'compacto'), width: undefined, flex: 1 };
}

/**
 * Los tres modificadores de un paso de la secuencia: cuánto esperar antes,
 * cuántas veces repetirlo y si depende de que el paso anterior fuera bien.
 *
 * `runActionSequence` leía `delayMs`, `repeat` y `onlyIfPrevOk` desde el
 * principio —el motor de 1.3 estaba entero— pero **el editor no ofrecía
 * ninguna forma de ponerlos**: los tres campos existían en `ButtonAction`, se
 * guardaban si alguien editaba el JSON a mano, y por la interfaz eran
 * inalcanzables. Un motor sin mando no es una función, es código muerto que
 * pasa las comprobaciones.
 */
function ModificadoresPaso({ action, onChange }: { action: ButtonAction; onChange: (a: ButtonAction) => void }) {
  const VD = useTheme();
  const t = useT();
  const num: React.CSSProperties = {
    width: 52, background: VD.bg, border: `1px solid ${VD.border}`,
    padding: '2px 5px', color: VD.text, fontFamily: VD.mono, fontSize: 9,
    outline: 'none', borderRadius: VD.radius.sm,
  };
  const rotulo: React.CSSProperties = { fontFamily: VD.mono, fontSize: 8, color: VD.textMuted, letterSpacing: 1 };
  const soloSiOk = !!action.onlyIfPrevOk;
  const soloSiFalla = !!action.onlyIfPrevFailed;
  const continua = !!action.continueOnError;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', paddingLeft: 22 }}>
      <span style={rotulo}>{t('ed.seq.delay')}</span>
      <input
        type="number" min={0} step={50}
        value={action.delayMs ?? ''}
        placeholder="150"
        title={t('ed.seq.delayTitle')}
        onChange={(e) => onChange({ ...action, delayMs: e.target.value === '' ? undefined : Math.max(0, parseInt(e.target.value, 10) || 0) })}
        style={num}
      />
      <span style={rotulo}>{t('ed.seq.repeat')}</span>
      <input
        type="number" min={1} max={99}
        value={action.repeat ?? ''}
        placeholder="1"
        title={t('ed.seq.repeatTitle')}
        onChange={(e) => onChange({ ...action, repeat: e.target.value === '' ? undefined : Math.min(99, Math.max(1, parseInt(e.target.value, 10) || 1)) })}
        style={num}
      />
      {/* Selector tri-estado de condición */}
      <div style={{ display: 'inline-flex', border: `1px solid ${VD.border}`, borderRadius: VD.radius.sm, overflow: 'hidden' }}>
        <button
          type="button"
          onClick={() => onChange({ ...action, onlyIfPrevOk: undefined, onlyIfPrevFailed: undefined })}
          style={{
            padding: '2px 6px',
            background: (!soloSiOk && !soloSiFalla) ? VD.accentBg : 'transparent',
            border: 'none',
            borderRight: `1px solid ${VD.border}`,
            color: (!soloSiOk && !soloSiFalla) ? VD.accent : VD.textMuted,
            fontFamily: VD.mono, fontSize: 8, letterSpacing: 0.5, cursor: 'pointer',
          }}
        >{t('ed.seq.always')}</button>
        <button
          type="button"
          onClick={() => onChange({ ...action, onlyIfPrevOk: true, onlyIfPrevFailed: undefined })}
          title={t('ed.seq.onlyIfOkTitle')}
          style={{
            padding: '2px 6px',
            background: soloSiOk ? VD.accentBg : 'transparent',
            border: 'none',
            borderRight: `1px solid ${VD.border}`,
            color: soloSiOk ? VD.accent : VD.textMuted,
            fontFamily: VD.mono, fontSize: 8, letterSpacing: 0.5, cursor: 'pointer',
          }}
        >{t('ed.seq.onlyIfOk')}</button>
        <button
          type="button"
          onClick={() => onChange({ ...action, onlyIfPrevOk: undefined, onlyIfPrevFailed: true })}
          title={t('ed.seq.onlyIfFailedTitle')}
          style={{
            padding: '2px 6px',
            background: soloSiFalla ? (VD.danger + '22') : 'transparent',
            border: 'none',
            color: soloSiFalla ? VD.danger : VD.textMuted,
            fontFamily: VD.mono, fontSize: 8, letterSpacing: 0.5, cursor: 'pointer',
          }}
        >{t('ed.seq.onlyIfFailed')}</button>
      </div>
      {/* Continuar si falla */}
      <button
        type="button"
        onClick={() => onChange({ ...action, continueOnError: continua ? undefined : true })}
        title={t('ed.seq.continueOnErrorTitle')}
        style={{
          padding: '2px 8px',
          background: continua ? VD.surface : 'transparent',
          border: `1px solid ${continua ? VD.accent : VD.border}`,
          color: continua ? VD.text : VD.textMuted,
          fontFamily: VD.mono, fontSize: 8, letterSpacing: 0.5,
          cursor: 'pointer', borderRadius: VD.radius.sm,
        }}
      >{t('ed.seq.continueOnError')}</button>
    </div>
  );
}

export function ExtraActionRow({
  action,
  stepIndex,
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
  onChange,
  onRemove,
}: PropsFilaAccionExtra) {
  const VD = useTheme();
  const tr = useT();
  const meta = ACTION_TYPES.find(a => a.type === action.type);
  const glyph = meta?.glyph ?? 'DOTS';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, background: VD.elevated, border: `1px solid ${VD.border}`, borderRadius: VD.radius.md, padding: '6px 10px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {stepIndex !== undefined && (
          <span style={{
            fontFamily: VD.mono, fontSize: 8, color: VD.accent,
            background: VD.accentBg, padding: '1px 5px', borderRadius: VD.radius.sm,
            letterSpacing: 1, border: `1px solid ${VD.accent}33`,
          }}>
            {String(stepIndex + 2).padStart(2, '0')}
          </span>
        )}
        <DotGlyphIcon glyph={glyph} size={14} color={VD.textDim} showRecessed />
        <span style={{ fontFamily: VD.mono, fontSize: 9, color: VD.textMuted, minWidth: 64 }}>{meta ? tr(meta.label) : ''}</span>
        <CampoExtraSegunTipo action={action} onChange={onChange} accent={VD.accent} />
        <div style={{ flex: 1 }} />
        <BotonesMoverExtra
          canMoveUp={canMoveUp}
          canMoveDown={canMoveDown}
          onMoveUp={onMoveUp}
          onMoveDown={onMoveDown}
          onRemove={onRemove}
        />
      </div>
      <ModificadoresPaso action={action} onChange={onChange} />
    </div>
  );
}

const CAMPOS_EXTRA: Record<string, React.ComponentType<PropsCampoExtra>> = {
  app: CampoAppExtra,
  web: CampoWebExtra,
  script: CampoScriptExtra,
  hotkey: CampoHotkeyExtra,
  shortcut: CampoAccesoExtra,
  clipboard: CampoPortapapelesExtra,
  'type-text': CampoEscribirExtra,
  'kill-process': CampoProcesoExtra,
  brightness: CampoBrilloExtra,
  'volume-set': CampoVolumenExtra,
};

function CampoExtraSegunTipo({ action, onChange, accent }: PropsCampoExtra) {
  const C = CAMPOS_EXTRA[action.type];
  if (!C) return null;
  return <C action={action} onChange={onChange} accent={accent} />;
}

function CampoAppExtra({ action, onChange }: PropsCampoExtra) {
  const VD = useTheme();
  const miniInputStyle = estiloEntradaMini(VD);
  const tf = useFieldText();
  return (
    <input value={action.appPath || ''} onChange={e => onChange({ ...action, appPath: e.target.value })} placeholder={tf("ruta o comando")} style={miniInputStyle} />
  );
}

function CampoWebExtra({ action, onChange }: PropsCampoExtra) {
  const VD = useTheme();
  const miniInputStyle = estiloEntradaMini(VD);
  return (
    <input value={action.url || ''} onChange={e => onChange({ ...action, url: e.target.value })} placeholder={"https://..."} style={miniInputStyle} />
  );
}

function CampoScriptExtra({ action, onChange }: PropsCampoExtra) {
  const VD = useTheme();
  const miniInputStyle = estiloEntradaMini(VD);
  return (
    <input value={action.script || ''} onChange={e => onChange({ ...action, script: e.target.value })} placeholder={"script"} style={miniInputStyle} />
  );
}

function CampoHotkeyExtra({ action, onChange }: PropsCampoExtra) {
  const VD = useTheme();
  const miniInputStyle = estiloEntradaMini(VD);
  return (
    <input value={action.hotkey || ''} onChange={e => onChange({ ...action, hotkey: e.target.value })} placeholder={"Ctrl+Shift+F9"} style={miniInputStyle} />
  );
}

function CampoAccesoExtra({ action, onChange }: PropsCampoExtra) {
  const VD = useTheme();
  const miniInputStyle = estiloEntradaMini(VD);
  const tf = useFieldText();
  return (
    <input value={action.shortcutPath || ''} onChange={e => onChange({ ...action, shortcutPath: e.target.value })} placeholder={tf("ruta")} style={miniInputStyle} />
  );
}

function CampoPortapapelesExtra({ action, onChange }: PropsCampoExtra) {
  const VD = useTheme();
  const miniInputStyle = estiloEntradaMini(VD);
  const tf = useFieldText();
  return (
    <input value={action.clipboardText || ''} onChange={e => onChange({ ...action, clipboardText: e.target.value })} placeholder={tf("texto al portapapeles")} style={miniInputStyle} />
  );
}

function CampoEscribirExtra({ action, onChange }: PropsCampoExtra) {
  const VD = useTheme();
  const miniInputStyle = estiloEntradaMini(VD);
  const tf = useFieldText();
  return (
    <input value={action.typeText || ''} onChange={e => onChange({ ...action, typeText: e.target.value })} placeholder={tf("texto a escribir")} style={miniInputStyle} />
  );
}

function CampoProcesoExtra({ action, onChange }: PropsCampoExtra) {
  const VD = useTheme();
  const miniInputStyle = estiloEntradaMini(VD);
  const tf = useFieldText();
  return (
    <input value={action.processName || ''} onChange={e => onChange({ ...action, processName: e.target.value })} placeholder={tf("proceso.exe")} style={miniInputStyle} />
  );
}

function CampoBrilloExtra({ action, onChange, accent }: PropsCampoExtra) {
  const VD = useTheme();
  return (
    <>
      <input type="range" min={0} max={100} step={5} value={action.brightnessLevel ?? 70} onChange={e => onChange({ ...action, brightnessLevel: parseInt(e.target.value) })} style={{ flex: 1, accentColor: accent }} />
      <span style={{ fontFamily: VD.mono, fontSize: 9, color: VD.text, minWidth: 28 }}>{action.brightnessLevel ?? 70}%</span>
    </>
  );
}

function CampoVolumenExtra({ action, onChange, accent }: PropsCampoExtra) {
  const VD = useTheme();
  return (
    <>
      <input type="range" min={0} max={100} step={5} value={action.volumePercent ?? 50} onChange={e => onChange({ ...action, volumePercent: parseInt(e.target.value) })} style={{ flex: 1, accentColor: accent }} />
      <span style={{ fontFamily: VD.mono, fontSize: 9, color: VD.text, minWidth: 28 }}>{action.volumePercent ?? 50}%</span>
    </>
  );
}

function BotonesMoverExtra({ canMoveUp, canMoveDown, onMoveUp, onMoveDown, onRemove }: {
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onRemove: () => void;
}) {
  const VD = useTheme();
  const tr = useT();
  return (
    <>
      {onMoveUp && (
        <button
          type="button"
          disabled={!canMoveUp}
          onClick={onMoveUp}
          title={tr('ed.seq.moveUp')}
          style={{
            background: 'none', border: 'none',
            color: canMoveUp ? VD.textDim : VD.border,
            cursor: canMoveUp ? 'pointer' : 'default',
            padding: '0 3px', display: 'flex', alignItems: 'center',
          }}
        >
          <DotGlyphIcon glyph="ARROW_UP" size={8} color={canMoveUp ? VD.textDim : VD.border} />
        </button>
      )}
      {onMoveDown && (
        <button
          type="button"
          disabled={!canMoveDown}
          onClick={onMoveDown}
          title={tr('ed.seq.moveDown')}
          style={{
            background: 'none', border: 'none',
            color: canMoveDown ? VD.textDim : VD.border,
            cursor: canMoveDown ? 'pointer' : 'default',
            padding: '0 3px', display: 'flex', alignItems: 'center',
          }}
        >
          <DotGlyphIcon glyph="ARROW_DOWN" size={8} color={canMoveDown ? VD.textDim : VD.border} />
        </button>
      )}
      <BotonIcono glifo="CLOSE" title={tr('comun.eliminar')} onClick={onRemove} peligro tamano={18} tamanoGlifo={8} />
    </>
  );
}
