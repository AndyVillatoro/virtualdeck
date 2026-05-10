import React, { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { IconNone } from '../components/VDIcon';
import { ACTION_TYPES, PRESETS, FOLDER_PRESETS, PRESET_CATEGORIES, type ButtonPreset } from './editor/actionData';
import { MacroEditor } from './editor/MacroEditor';
import { VD } from '../design';
import { DotLabel } from '../components/DotLabel';
import { BrandIconDisplay } from '../components/BrandIconDisplay';
// 4.1 — picker y editor del catálogo de marcas se cargan a demanda. Evita
// arrastrar el bundle de marcas al árbol inicial cuando el usuario no abre el modal.
const BrandIconPicker = lazy(() => import('../components/BrandIconPicker').then(m => ({ default: m.BrandIconPicker })));
const BrandIconEditor = lazy(() => import('../components/BrandIconEditor').then(m => ({ default: m.BrandIconEditor })));
import { ButtonCell } from '../components/ButtonCell';
import { Glyph57Editor, Glyph57View as Glyph57Inline } from '../components/Glyph57Editor';
import { BRAND_ICONS_MAP } from '../data/brandIcons';
import type { ActionType, AudioDevice, ButtonAction, ButtonConfig, FolderButton, RGBDeviceInfo, RGBProfile } from '../types';

interface EditorBProps {
  button: ButtonConfig;
  rgbProfiles?: RGBProfile[];
  onClose: () => void;
  onSave: (updated: ButtonConfig) => void;
}

const STEPS = ['ACCIÓN', 'CONFIGURAR', 'ESTILO'];


export function EditorB({ button, rgbProfiles = [], onClose, onSave }: EditorBProps) {
  const api = window.electronAPI;
  const [step, setStep] = useState(0);
  const [action, setAction] = useState<ButtonAction>({ ...button.action });
  const [extraActions, setExtraActions] = useState<ButtonAction[]>(
    button.actions && button.actions.length > 1 ? button.actions.slice(1) : []
  );
  const [showExtraPicker, setShowExtraPicker] = useState(false);
  const [isToggle, setIsToggle] = useState(button.isToggle ?? false);
  const [actionToggleOff, setActionToggleOff] = useState<ButtonAction>(
    button.actionToggleOff ?? { type: 'none' }
  );
  const [label, setLabel] = useState(button.label || '');
  const [sublabel, setSublabel] = useState(button.sublabel || '');
  const [icon, setIcon] = useState(button.icon || '');
  const [imageData, setImageData] = useState(button.imageData || '');
  const [brandIcon, setBrandIcon] = useState(button.brandIcon || '');
  const [brandIconAlwaysAnimate, setBrandIconAlwaysAnimate] = useState(button.brandIconAlwaysAnimate ?? false);
  const [brandIconCustomBitmap, setBrandIconCustomBitmap] = useState<string[] | undefined>(button.brandIconCustomBitmap);
  const [brandIconCustomColor, setBrandIconCustomColor] = useState<string | undefined>(button.brandIconCustomColor);
  const [brandIconCustomPalette, setBrandIconCustomPalette] = useState<Record<string, string> | undefined>(button.brandIconCustomPalette);
  const [showBrandPicker, setShowBrandPicker] = useState(false);
  const [showBrandEditor, setShowBrandEditor] = useState(false);
  const [bgColor, setBgColor] = useState(button.bgColor || '');
  const [fgColor, setFgColor] = useState(button.fgColor || '');
  // 1.4 — Disparadores externos
  const [globalHotkey, setGlobalHotkey] = useState(button.globalHotkey ?? '');
  const [inTrayMenu, setInTrayMenu] = useState(button.inTrayMenu ?? false);
  // 3.x — Long press + radio group
  const [longPressAction, setLongPressAction] = useState<import('../types').ButtonAction>(
    button.longPressAction ?? { type: 'none' }
  );
  const [radioGroup, setRadioGroup] = useState(button.radioGroup ?? '');
  // Widget / Visibility / Scheduled trigger
  const [widget, setWidget] = useState<'clock' | 'weather' | 'now-playing' | 'sensor' | undefined>(button.widget);
  const [sensorWidgetId, setSensorWidgetId] = useState(button.sensorWidget?.sensorId ?? '');
  const [sensorWidgetSuffix, setSensorWidgetSuffix] = useState(button.sensorWidget?.suffix ?? '');
  const [sensorWidgetWarn, setSensorWidgetWarn] = useState(button.sensorWidget?.warnAt?.toString() ?? '');
  const [sensorWidgetCrit, setSensorWidgetCrit] = useState(button.sensorWidget?.critAt?.toString() ?? '');
  const [visibleIfApp, setVisibleIfApp] = useState(button.visibleIf?.app ?? '');
  const [visibleIfSensorId, setVisibleIfSensorId] = useState(button.visibleIf?.sensor?.id ?? '');
  const [visibleIfSensorOp, setVisibleIfSensorOp] = useState<'>'|'<'|'>='|'<='|'=='>(button.visibleIf?.sensor?.op ?? '>');
  const [visibleIfSensorVal, setVisibleIfSensorVal] = useState(button.visibleIf?.sensor?.value?.toString() ?? '');
  const [timerTriggerAt, setTimerTriggerAt] = useState(button.timerTriggerAt ?? '');
  const [sensorTriggerId, setSensorTriggerId] = useState(button.sensorTrigger?.id ?? '');
  const [sensorTriggerOp, setSensorTriggerOp] = useState<'>'|'<'|'>='|'<='|'=='>(button.sensorTrigger?.op ?? '>');
  const [sensorTriggerVal, setSensorTriggerVal] = useState(button.sensorTrigger?.value?.toString() ?? '');
  const [sensorTriggerCooldown, setSensorTriggerCooldown] = useState(
    button.sensorTrigger?.cooldownMs !== undefined ? String(Math.round(button.sensorTrigger.cooldownMs / 1000)) : ''
  );
  // Sensor list shared by widget/visibility/trigger pickers.
  const [sensorList, setSensorList] = useState<import('../types').Sensor[]>([]);
  // 2.1 — Glifo 5×7 personalizado (7 enteros bitmask)
  const [customGlyph57, setCustomGlyph57] = useState<number[] | undefined>(button.customGlyph57);
  const [showGlyphEditor, setShowGlyphEditor] = useState(false);
  const [audioDevices, setAudioDevices] = useState<AudioDevice[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [rgbDevices, setRgbDevices] = useState<RGBDeviceInfo[]>([]);
  const [rgbConnected, setRgbConnected] = useState(false);
  const [presetCategory, setPresetCategory] = useState<ButtonPreset['category']>('APPS');
  const [presetSearch, setPresetSearch] = useState('');
  const [capturing, setCapturing] = useState(false);
  const [folderButtons, setFolderButtons] = useState<FolderButton[]>(
    button.action.folderButtons ?? []
  );
  const captureRef = useRef(false);

  const loadAudioDevices = () => {
    if (!api) return;
    setLoadingDevices(true);
    setAudioError(null);
    api.audio.list().then((devs) => {
      setAudioDevices(devs);
      setLoadingDevices(false);
    }).catch(() => {
      setAudioError('No se pudo obtener la lista. Verifica que el audio esté activo o reinicia la aplicación.');
      setLoadingDevices(false);
    });
  };

  useEffect(() => {
    if (action.type === 'audio-device' && audioDevices.length === 0 && api) {
      loadAudioDevices();
    }
    // Auto-clear conflicting widget so a previously-saved button doesn't keep
    // an incompatible widget after the user switches to Audio.
    if (action.type === 'audio-device' && widget === 'now-playing') {
      setWidget(undefined);
    }
  }, [action.type, step, widget]);

  // Cargar lista de devices RGB cuando el usuario configure una acción rgb-*.
  useEffect(() => {
    if (!api) return;
    if (action.type !== 'rgb-color' && action.type !== 'rgb-mode') return;
    api.rgb.status().then((s) => {
      setRgbConnected(s.connected);
      if (s.connected) api.rgb.listDevices().then((d) => setRgbDevices(d)).catch(() => {});
    }).catch(() => {});
  }, [action.type, step]);

  // Load LHM sensor catalog when the editor opens and refresh whenever the
  // user touches a sensor-driven control. Cheap (LHM cache in main is 1.5 s)
  // and ensures the picker is populated as soon as the user reaches step 2.
  useEffect(() => {
    if (!api?.sensors) return;
    api.sensors.list().then(setSensorList).catch(() => {});
  }, [widget, visibleIfSensorId, sensorTriggerId, step]);

  // Hotkey capture
  useEffect(() => {
    if (!capturing) return;
    captureRef.current = true;
    const onKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const parts: string[] = [];
      if (e.ctrlKey) parts.push('Ctrl');
      if (e.altKey) parts.push('Alt');
      if (e.shiftKey) parts.push('Shift');
      const main = e.key;
      if (!['Control', 'Alt', 'Shift', 'Meta'].includes(main)) {
        parts.push(main.length === 1 ? main.toUpperCase() : main);
      }
      if (parts.length > 0 && !['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) {
        setAction(a => ({ ...a, hotkey: parts.join('+') }));
        setCapturing(false);
        captureRef.current = false;
      }
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [capturing]);

  // Sync folderButtons into action when they change
  useEffect(() => {
    if (action.type === 'folder') {
      setAction(a => ({ ...a, folderButtons }));
    }
  }, [folderButtons]);

  const handleSave = () => {
    const allActions = extraActions.length > 0 ? [action, ...extraActions] : undefined;
    const updated: ButtonConfig = {
      ...button,
      label,
      sublabel,
      icon,
      imageData,
      brandIcon: brandIcon || undefined,
      brandIconAlwaysAnimate: brandIconAlwaysAnimate || undefined,
      brandIconCustomBitmap: brandIconCustomBitmap,
      brandIconCustomColor: brandIconCustomColor,
      brandIconCustomPalette: brandIconCustomPalette && Object.keys(brandIconCustomPalette).length > 0 ? brandIconCustomPalette : undefined,
      bgColor: bgColor || undefined,
      fgColor: fgColor || undefined,
      action: action.type === 'folder' ? { ...action, folderButtons } : action,
      actions: allActions,
      isToggle: isToggle || undefined,
      actionToggleOff: isToggle && actionToggleOff.type !== 'none' ? actionToggleOff : undefined,
      globalHotkey: globalHotkey.trim() || undefined,
      inTrayMenu: inTrayMenu || undefined,
      customGlyph57: customGlyph57 && customGlyph57.length === 7 ? customGlyph57 : undefined,
      longPressAction: longPressAction.type !== 'none' ? longPressAction : undefined,
      radioGroup: radioGroup.trim() || undefined,
      widget: widget || undefined,
      sensorWidget: widget === 'sensor' && sensorWidgetId
        ? {
            sensorId: sensorWidgetId,
            suffix: sensorWidgetSuffix.trim() || undefined,
            warnAt: sensorWidgetWarn.trim() ? parseFloat(sensorWidgetWarn) : undefined,
            critAt: sensorWidgetCrit.trim() ? parseFloat(sensorWidgetCrit) : undefined,
          }
        : undefined,
      visibleIf: (() => {
        const app = visibleIfApp.trim();
        const sensorVal = visibleIfSensorVal.trim();
        const hasSensor = !!visibleIfSensorId && sensorVal !== '' && !isNaN(parseFloat(sensorVal));
        if (!app && !hasSensor) return undefined;
        return {
          app: app || undefined,
          sensor: hasSensor
            ? { id: visibleIfSensorId, op: visibleIfSensorOp, value: parseFloat(sensorVal) }
            : undefined,
        };
      })(),
      timerTriggerAt: timerTriggerAt.trim() || undefined,
      sensorTrigger: (() => {
        const v = sensorTriggerVal.trim();
        if (!sensorTriggerId || v === '' || isNaN(parseFloat(v))) return undefined;
        const cd = sensorTriggerCooldown.trim();
        return {
          id: sensorTriggerId,
          op: sensorTriggerOp,
          value: parseFloat(v),
          cooldownMs: cd && !isNaN(parseFloat(cd)) ? parseFloat(cd) * 1000 : undefined,
        };
      })(),
    };
    onSave(updated);
  };

  const applyPreset = (preset: ButtonPreset) => {
    setAction(preset.action);
    setLabel(preset.label);
    setSublabel(preset.sublabel ?? '');
    setIcon(preset.icon ?? '');
    setBgColor(preset.bgColor ?? '');
    setFgColor(preset.fgColor ?? '');
    setStep(2);
  };

  const applyFolderPreset = (key: string) => {
    const fp = FOLDER_PRESETS[key];
    if (!fp) return;
    setFolderButtons(fp.buttons);
    setLabel(fp.label);
    setIcon(fp.icon);
    setBgColor(fp.bgColor);
    setFgColor(fp.fgColor);
  };

  const pickFile = async () => {
    if (!api) return;
    const path = await api.dialog.openFile({ properties: ['openFile'] });
    if (path) setAction((a) => ({ ...a, appPath: path }));
  };

  const pickShortcut = async () => {
    if (!api) return;
    const path = await api.dialog.openFile({ properties: ['openFile', 'openDirectory'] });
    if (path) setAction((a) => ({ ...a, shortcutPath: path }));
  };

  const pickImage = async () => {
    if (!api) return;
    const data = await api.dialog.openImage();
    if (data) setImageData(data);
  };

  // 2.4 — pegar imagen desde portapapeles. Listen at document level mientras el
  // editor está abierto. El handler ignora pastes en inputs de texto (editar
  // label/url) para no interferir con el paste textual.
  useEffect(() => {
    if (!api) return;
    const onPaste = async (e: ClipboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        if (it.type.startsWith('image/')) {
          e.preventDefault();
          const blob = it.getAsFile();
          if (!blob) return;
          const reader = new FileReader();
          reader.onload = async () => {
            const dataUrl = reader.result as string;
            const url = await api.dialog.saveClipboardImage(dataUrl);
            if (url) setImageData(url);
          };
          reader.readAsDataURL(blob);
          return;
        }
      }
    };
    document.addEventListener('paste', onPaste);
    return () => document.removeEventListener('paste', onPaste);
  }, [api]);

  const accent = VD.accent;
  const currentActionMeta = ACTION_TYPES.find((a) => a.type === action.type);
  const PreviewIcon = currentActionMeta?.Icon ?? IconNone;

  const filteredPresets = PRESETS.filter((p) => {
    if (presetSearch.trim()) {
      const q = presetSearch.toLowerCase();
      return p.label.toLowerCase().includes(q) || p.category.toLowerCase().includes(q);
    }
    return p.category === presetCategory;
  });

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.75)',
    }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0 }} />

      <div onClick={(e) => e.stopPropagation()} style={{
        position: 'relative',
        width: 'min(960px, 96vw)', height: 'min(640px, 92vh)',
        background: VD.surface, border: `1px solid ${VD.borderStrong}`,
        display: 'flex', flexDirection: 'column',
        boxShadow: VD.shadow.modal,
        borderRadius: VD.radius.sm,
      }}>
        {/* Header */}
        <div style={{
          height: 44, borderBottom: `1px solid ${VD.border}`,
          display: 'flex', alignItems: 'center', padding: '0 16px', gap: 10, flexShrink: 0,
        }}>
          <div style={{ width: 6, height: 6, borderRadius: VD.radius.md, background: accent }} />
          <DotLabel size={11} color={VD.text} spacing={2}>CONFIGURAR BOTÓN</DotLabel>
          <span style={{ fontFamily: VD.mono, fontSize: 10, color: VD.textMuted }}>· {button.id.toUpperCase()}</span>
          <div style={{ flex: 1 }} />
          <button onClick={onClose} style={{ color: VD.textDim, fontSize: 18, background: 'transparent', border: 'none', cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>

        {/* Steps */}
        <div style={{ display: 'flex', padding: '16px 24px', gap: 4, borderBottom: `1px solid ${VD.border}`, flexShrink: 0 }}>
          {STEPS.map((s, i) => (
            <div key={s} style={{ flex: 1, cursor: 'pointer' }} onClick={() => setStep(i)}>
              <div style={{ height: 2, background: i <= step ? accent : VD.border, transition: 'background 0.2s' }} />
              <div style={{ marginTop: 8, fontFamily: VD.mono, fontSize: 10, letterSpacing: 2, color: i === step ? VD.text : i < step ? VD.textDim : VD.textMuted }}>
                {String(i + 1).padStart(2, '0')} · {s}
              </div>
            </div>
          ))}
        </div>

        {/* Body */}
        <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
          {/* Preview */}
          <div style={{
            width: 200, borderRight: `1px solid ${VD.border}`, padding: 24,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            background: VD.bg, flexShrink: 0, gap: 14,
          }}>
            <DotLabel size={9} color={VD.textMuted} spacing={2}>VISTA PREVIA</DotLabel>
            {/* Celda viva — el mismo ButtonCell de la grilla, refleja cada cambio en tiempo real */}
            <div style={{
              width: 120, height: 120, display: 'grid',
              pointerEvents: 'none', userSelect: 'none',
            }}>
              <ButtonCell
                button={{
                  id: button.id, page: button.page,
                  label, sublabel, icon,
                  imageData: imageData || undefined,
                  brandIcon: brandIcon || undefined,
                  brandIconAlwaysAnimate,
                  brandIconCustomBitmap,
                  brandIconCustomColor,
                  brandIconCustomPalette,
                  customGlyph57,
                  bgColor: bgColor || undefined,
                  fgColor: fgColor || undefined,
                  action,
                  actions: extraActions.length > 0 ? [action, ...extraActions] : undefined,
                  isToggle,
                }}
                accent={accent}
                toggled={false}
                soundEnabled={false}
                onEdit={() => {}}
                onExecute={() => {}}
              />
            </div>
            {isToggle && (
              <div style={{ fontFamily: VD.mono, fontSize: 9, color: accent, textAlign: 'center' }}>
                MODO TOGGLE
              </div>
            )}
            {extraActions.length > 0 && (
              <div style={{ fontFamily: VD.mono, fontSize: 9, color: VD.textMuted, textAlign: 'center' }}>
                + {extraActions.length} acción{extraActions.length > 1 ? 'es' : ''} adicional{extraActions.length > 1 ? 'es' : ''}
              </div>
            )}
            <div style={{ fontFamily: VD.mono, fontSize: 9, color: VD.textMuted, textAlign: 'center', lineHeight: 1.6 }}>
              HOVER ✎ → EDITAR<br />CLIC → EJECUTAR
            </div>
          </div>

          {/* Form */}
          <div style={{ flex: 1, padding: 20, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* STEP 0: Action type + presets */}
            {step === 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Presets */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
                    <DotLabel size={9} color={VD.textMuted} spacing={2}>PRESETS RÁPIDOS</DotLabel>
                    <input
                      value={presetSearch}
                      onChange={(e) => setPresetSearch(e.target.value)}
                      placeholder="Buscar preset..."
                      style={{
                        background: VD.elevated, border: `1px solid ${VD.border}`,
                        padding: '3px 8px', color: VD.text, fontFamily: VD.mono, fontSize: 9,
                        outline: 'none', borderRadius: VD.radius.sm, width: 120,
                      }}
                    />
                    {!presetSearch && (
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {PRESET_CATEGORIES.map((cat) => (
                          <button key={cat} onClick={() => setPresetCategory(cat)} style={{
                            padding: '3px 8px', border: `1px solid ${presetCategory === cat ? accent : VD.border}`,
                            background: presetCategory === cat ? VD.accentBg : 'transparent',
                            fontFamily: VD.mono, fontSize: 8, letterSpacing: 1,
                            color: presetCategory === cat ? accent : VD.textMuted,
                            cursor: 'pointer', borderRadius: VD.radius.sm,
                          }}>
                            {cat}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {filteredPresets.map((preset, i) => {
                      const PresetIcon = ACTION_TYPES.find(at => at.type === preset.action.type)?.Icon;
                      return (
                        <div
                          key={i}
                          onClick={() => applyPreset(preset)}
                          title={`Aplicar preset: ${preset.label}`}
                          style={{
                            width: 70, height: 70, borderRadius: VD.radius.lg,
                            background: preset.bgColor || VD.elevated,
                            border: `1px solid ${VD.border}`,
                            display: 'flex', flexDirection: 'column',
                            alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', gap: 4,
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.borderColor = accent)}
                          onMouseLeave={(e) => (e.currentTarget.style.borderColor = VD.border)}
                        >
                          {preset.icon ? (
                            <div style={{ fontSize: 18, color: preset.fgColor || VD.text, lineHeight: 1 }}>
                              {preset.icon}
                            </div>
                          ) : PresetIcon ? (
                            <PresetIcon size={20} color={preset.fgColor || VD.text} />
                          ) : (
                            <div style={{ fontSize: 18, color: preset.fgColor || VD.text, lineHeight: 1 }}>○</div>
                          )}
                          <div style={{ fontFamily: VD.mono, fontSize: 8, color: preset.fgColor || VD.textDim, textAlign: 'center', maxWidth: 62, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {preset.label}
                          </div>
                        </div>
                      );
                    })}
                    {filteredPresets.length === 0 && (
                      <div style={{ fontFamily: VD.mono, fontSize: 10, color: VD.textMuted, padding: '8px 0' }}>Sin resultados</div>
                    )}
                  </div>
                </div>

                <div style={{ height: 1, background: VD.border }} />

                {/* Action types */}
                <div>
                  <DotLabel size={9} color={VD.textMuted} spacing={2} style={{ display: 'block', marginBottom: 10 }}>
                    TIPO DE ACCIÓN
                  </DotLabel>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                    {ACTION_TYPES.map((at) => {
                      const Icon = at.Icon;
                      const active = action.type === at.type;
                      return (
                        <div
                          key={at.type}
                          onClick={() => setAction({ type: at.type })}
                          style={{
                            background: active ? VD.accentBg : VD.elevated,
                            border: `1px solid ${active ? accent : VD.border}`,
                            borderRadius: VD.radius.lg, padding: '8px 10px',
                            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                          }}
                        >
                          <Icon size={16} color={active ? accent : VD.textMuted} strokeWidth={1.5} />
                          <div>
                            <div style={{ fontFamily: VD.mono, fontSize: 9, color: active ? VD.text : VD.textDim, letterSpacing: 0.5 }}>{at.label}</div>
                            <div style={{ fontFamily: VD.mono, fontSize: 8, color: VD.textMuted, marginTop: 1 }}>{at.desc}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Multi-action sequence */}
                {action.type !== 'none' && action.type !== 'folder' && (
                  <div>
                    <div style={{ height: 1, background: VD.border, marginBottom: 12 }} />
                    <DotLabel size={9} color={VD.textMuted} spacing={2} style={{ display: 'block', marginBottom: 8 }}>
                      SECUENCIA DE ACCIONES (OPCIONAL)
                    </DotLabel>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {extraActions.map((ea, idx) => (
                        <ExtraActionRow
                          key={idx}
                          action={ea}
                          onChange={(updated) => setExtraActions(prev => prev.map((a, i) => i === idx ? updated : a))}
                          onRemove={() => setExtraActions(prev => prev.filter((_, i) => i !== idx))}
                        />
                      ))}
                    </div>
                    {extraActions.length < 3 && !showExtraPicker && (
                      <button onClick={() => setShowExtraPicker(true)} style={{
                        marginTop: 6, padding: '5px 12px',
                        background: 'transparent', border: `1px dashed ${VD.border}`,
                        fontFamily: VD.mono, fontSize: 9, color: VD.textMuted, cursor: 'pointer',
                        borderRadius: VD.radius.sm, letterSpacing: 1,
                      }}>
                        + AÑADIR ACCIÓN ADICIONAL
                      </button>
                    )}
                    {showExtraPicker && (
                      <div style={{ marginTop: 8, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4 }}>
                        {ACTION_TYPES.filter(at => at.type !== 'none' && at.type !== 'folder').map(at => {
                          const Icon = at.Icon;
                          return (
                            <div key={at.type} onClick={() => {
                              setExtraActions(prev => [...prev, { type: at.type }]);
                              setShowExtraPicker(false);
                            }} style={{
                              background: VD.elevated, border: `1px solid ${VD.border}`,
                              borderRadius: VD.radius.md, padding: '5px 8px', cursor: 'pointer',
                              display: 'flex', alignItems: 'center', gap: 5,
                            }}
                              onMouseEnter={(e) => (e.currentTarget.style.borderColor = accent)}
                              onMouseLeave={(e) => (e.currentTarget.style.borderColor = VD.border)}
                            >
                              <Icon size={12} color={VD.textMuted} strokeWidth={1.5} />
                              <span style={{ fontFamily: VD.mono, fontSize: 8, color: VD.textDim }}>{at.label}</span>
                            </div>
                          );
                        })}
                        <div onClick={() => setShowExtraPicker(false)} style={{
                          background: VD.elevated, border: `1px solid ${VD.border}`,
                          borderRadius: VD.radius.md, padding: '5px 8px', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <span style={{ fontFamily: VD.mono, fontSize: 9, color: VD.danger }}>✕ cancelar</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* STEP 1: Configure action */}
            {step === 1 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {action.type === 'none' && (
                  <div style={{ color: VD.textMuted, fontFamily: VD.mono, fontSize: 11 }}>
                    Sin acción configurada.
                  </div>
                )}

                {action.type === 'app' && (
                  <>
                    <Field label="RUTA DE LA APLICACIÓN">
                      <div style={{ display: 'flex', gap: 8 }}>
                        <input value={action.appPath || ''} onChange={(e) => setAction((a) => ({ ...a, appPath: e.target.value }))} placeholder="C:\Program Files\App\app.exe" style={inputStyle} />
                        <Btn onClick={pickFile}>Buscar</Btn>
                      </div>
                    </Field>
                    <Field label="ARGUMENTOS (OPCIONAL)">
                      <input value={action.appArgs || ''} onChange={(e) => setAction((a) => ({ ...a, appArgs: e.target.value }))} placeholder="--flag valor" style={inputStyle} />
                    </Field>
                  </>
                )}

                {action.type === 'web' && (
                  <Field label="URL">
                    <input value={action.url || ''} onChange={(e) => setAction((a) => ({ ...a, url: e.target.value }))} placeholder="https://ejemplo.com" style={inputStyle} />
                  </Field>
                )}

                {action.type === 'shortcut' && (
                  <Field label="RUTA DEL ARCHIVO O CARPETA">
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input value={action.shortcutPath || ''} onChange={(e) => setAction((a) => ({ ...a, shortcutPath: e.target.value }))} placeholder="C:\Users\...\archivo.lnk" style={inputStyle} />
                      <Btn onClick={pickShortcut}>Buscar</Btn>
                    </div>
                  </Field>
                )}

                {action.type === 'script' && (
                  <>
                    <Field label="INTÉRPRETE">
                      <select value={action.scriptShell || 'powershell'} onChange={(e) => setAction((a) => ({ ...a, scriptShell: e.target.value as any }))} style={{ ...inputStyle, cursor: 'pointer' }}>
                        <option value="powershell">PowerShell</option>
                        <option value="cmd">CMD (Símbolo del sistema)</option>
                      </select>
                    </Field>
                    <Field label="SCRIPT">
                      <textarea value={action.script || ''} onChange={(e) => setAction((a) => ({ ...a, script: e.target.value }))} placeholder="Get-Process | Sort CPU -Descending" rows={5} style={{ ...inputStyle, resize: 'vertical', minHeight: 80 }} />
                    </Field>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={action.showOutput ?? false}
                        onChange={(e) => setAction(a => ({ ...a, showOutput: e.target.checked }))}
                        style={{ accentColor: accent }}
                      />
                      <span style={{ fontFamily: VD.mono, fontSize: 9, color: VD.textDim }}>MOSTRAR SALIDA DEL SCRIPT EN PANTALLA</span>
                    </label>
                    <Field label="GUARDAR SALIDA EN VARIABLE (opcional)">
                      <input
                        value={action.captureToVar ?? ''}
                        onChange={(e) => setAction(a => ({ ...a, captureToVar: e.target.value || undefined }))}
                        placeholder="ej: resultado_cpu"
                        style={inputStyle}
                      />
                      <div style={{ fontFamily: VD.mono, fontSize: 8, color: VD.textMuted, marginTop: 4 }}>
                        El stdout se guarda en la variable y se puede usar como {'{resultado_cpu}'} en otros pasos.
                      </div>
                    </Field>
                  </>
                )}

                {action.type === 'audio-device' && (
                  <Field label="DISPOSITIVO DE AUDIO">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      {action.deviceName && (
                        <span style={{ fontFamily: VD.mono, fontSize: 10, color: accent, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>
                          ✓ {action.deviceName}
                        </span>
                      )}
                      {!action.deviceName && <span />}
                      <Btn onClick={loadAudioDevices}>{loadingDevices ? '...' : '⟳ RECARGAR'}</Btn>
                    </div>
                    {loadingDevices && <div style={{ fontFamily: VD.mono, fontSize: 11, color: VD.textDim, padding: '4px 0 8px' }}>Cargando dispositivos...</div>}
                    {!loadingDevices && audioError && (
                      <div style={{ marginBottom: 10 }}>
                        <div style={{ fontFamily: VD.mono, fontSize: 10, color: VD.danger, marginBottom: 6 }}>
                          ⚠ {audioError}
                        </div>
                        <Btn onClick={loadAudioDevices} style={{ marginBottom: 8 }}>⟳ REINTENTAR</Btn>
                        <div style={{ fontFamily: VD.mono, fontSize: 9, color: VD.textMuted, marginBottom: 6 }}>
                          O ingresa el nombre exacto del dispositivo (como aparece en Configuración → Sonido):
                        </div>
                        <input
                          value={action.deviceName || ''}
                          onChange={(e) => setAction((a) => ({ ...a, deviceId: undefined, deviceName: e.target.value }))}
                          placeholder="Ej: Auriculares (Realtek HD Audio)"
                          style={inputStyle}
                        />
                      </div>
                    )}
                    {!loadingDevices && !audioError && audioDevices.length === 0 && (
                      <div style={{ marginBottom: 10 }}>
                        <div style={{ fontFamily: VD.mono, fontSize: 10, color: VD.danger, marginBottom: 8 }}>
                          No se detectaron dispositivos automáticamente.
                        </div>
                        <div style={{ fontFamily: VD.mono, fontSize: 9, color: VD.textMuted, marginBottom: 6 }}>
                          Ingresa el nombre exacto del dispositivo (como aparece en Configuración → Sonido):
                        </div>
                        <input
                          value={action.deviceName || ''}
                          onChange={(e) => setAction((a) => ({ ...a, deviceId: undefined, deviceName: e.target.value }))}
                          placeholder="Ej: Auriculares (Realtek HD Audio)"
                          style={inputStyle}
                        />
                      </div>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {audioDevices.map((dev) => (
                        <div
                          key={dev.id}
                          onClick={() => {
                            setAction((a) => ({ ...a, deviceId: dev.id, deviceName: dev.name }));
                            if (!label) setLabel(dev.name);
                          }}
                          style={{
                            background: action.deviceId === dev.id ? VD.accentBg : VD.elevated,
                            border: `1px solid ${action.deviceId === dev.id ? accent : VD.border}`,
                            borderRadius: VD.radius.md, padding: '10px 12px',
                            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          }}
                        >
                          <span style={{ fontFamily: VD.mono, fontSize: 11, color: VD.text }}>{dev.name}</span>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            {dev.isDefault && <span style={{ fontFamily: VD.mono, fontSize: 9, color: VD.success, letterSpacing: 1 }}>PREDETERMINADO</span>}
                            {action.deviceId === dev.id && <span style={{ fontFamily: VD.mono, fontSize: 9, color: accent, letterSpacing: 1 }}>✓ SELECCIONADO</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </Field>
                )}

                {action.type === 'hotkey' && (
                  <Field label="COMBINACIÓN DE TECLAS">
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input
                        value={action.hotkey || ''}
                        onChange={(e) => setAction((a) => ({ ...a, hotkey: e.target.value }))}
                        placeholder="Ctrl+Shift+F9"
                        readOnly={capturing}
                        style={{ ...inputStyle, flex: 1, outline: capturing ? `2px solid ${accent}` : undefined }}
                      />
                      <Btn onClick={() => setCapturing(c => !c)} style={{ background: capturing ? VD.accentBg : undefined, borderColor: capturing ? accent : undefined, color: capturing ? accent : undefined }}>
                        {capturing ? '● ESPERANDO...' : 'CAPTURAR'}
                      </Btn>
                    </div>
                    {capturing && (
                      <div style={{ fontFamily: VD.mono, fontSize: 9, color: accent, marginTop: 6 }}>
                        Presiona la combinación deseada...
                      </div>
                    )}
                    <div style={{ fontFamily: VD.mono, fontSize: 9, color: VD.textMuted, marginTop: 6 }}>
                      Ej: Ctrl+Alt+T · Ctrl+Shift+F9 · Ctrl+Z · V · Space
                    </div>
                  </Field>
                )}

                {action.type === 'clipboard' && (
                  <Field label="TEXTO A COPIAR AL PORTAPAPELES">
                    <textarea
                      value={action.clipboardText || ''}
                      onChange={(e) => setAction((a) => ({ ...a, clipboardText: e.target.value }))}
                      placeholder="Texto, URL, código, etc."
                      rows={4}
                      style={{ ...inputStyle, resize: 'vertical', minHeight: 80 }}
                    />
                  </Field>
                )}

                {action.type === 'type-text' && (
                  <>
                    <Field label="TEXTO A ESCRIBIR AUTOMÁTICAMENTE">
                      <textarea
                        value={action.typeText || ''}
                        onChange={(e) => setAction((a) => ({ ...a, typeText: e.target.value }))}
                        placeholder="Texto que se escribirá con SendKeys..."
                        rows={4}
                        style={{ ...inputStyle, resize: 'vertical', minHeight: 80 }}
                      />
                    </Field>
                    <div style={{ fontFamily: VD.mono, fontSize: 9, color: VD.textMuted }}>
                      El texto se escribe en la ventana activa. Caracteres especiales (+, ^, %, %, (, )) se escapan automáticamente.
                    </div>
                  </>
                )}

                {action.type === 'kill-process' && (
                  <>
                    <Field label="NOMBRE DEL PROCESO">
                      <input
                        value={action.processName || ''}
                        onChange={(e) => setAction((a) => ({ ...a, processName: e.target.value }))}
                        placeholder="spotify.exe · chrome.exe · notepad.exe"
                        style={inputStyle}
                      />
                    </Field>
                    <div style={{ fontFamily: VD.mono, fontSize: 9, color: VD.textMuted }}>
                      Usa el nombre exacto del ejecutable. Equivale a taskkill /IM nombre /F.
                    </div>
                  </>
                )}

                {action.type === 'volume-set' && (
                  <Field label="NIVEL DE VOLUMEN">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <input
                        type="range" min={0} max={100} step={5}
                        value={action.volumePercent ?? 50}
                        onChange={(e) => setAction((a) => ({ ...a, volumePercent: parseInt(e.target.value) }))}
                        style={{ flex: 1, accentColor: accent }}
                      />
                      <span style={{ fontFamily: VD.mono, fontSize: 14, color: VD.text, minWidth: 40, textAlign: 'right' }}>
                        {action.volumePercent ?? 50}%
                      </span>
                    </div>
                    <div style={{ fontFamily: VD.mono, fontSize: 9, color: VD.textMuted, marginTop: 6 }}>
                      Establece el volumen maestro del sistema al porcentaje indicado.
                    </div>
                  </Field>
                )}

                {action.type === 'brightness' && (
                  <Field label="NIVEL DE BRILLO">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <input type="range" min={0} max={100} step={5} value={action.brightnessLevel ?? 70} onChange={(e) => setAction((a) => ({ ...a, brightnessLevel: parseInt(e.target.value) }))} style={{ flex: 1, accentColor: accent }} />
                      <span style={{ fontFamily: VD.mono, fontSize: 14, color: VD.text, minWidth: 40, textAlign: 'right' }}>{action.brightnessLevel ?? 70}%</span>
                    </div>
                    <div style={{ fontFamily: VD.mono, fontSize: 9, color: VD.textMuted, marginTop: 6 }}>Controla el brillo del monitor principal via WMI.</div>
                  </Field>
                )}

                {action.type === 'notify' && (
                  <>
                    <Field label="TÍTULO">
                      <input
                        value={action.notifyTitle ?? ''}
                        onChange={(e) => setAction((a) => ({ ...a, notifyTitle: e.target.value }))}
                        placeholder="VirtualDeck"
                        style={inputStyle}
                      />
                    </Field>
                    <Field label="MENSAJE">
                      <textarea
                        value={action.notifyBody ?? ''}
                        onChange={(e) => setAction((a) => ({ ...a, notifyBody: e.target.value }))}
                        placeholder="Texto de la notificación..."
                        rows={3}
                        style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }}
                      />
                    </Field>
                  </>
                )}

                {action.type === 'set-var' && (
                  <>
                    <Field label="NOMBRE DE VARIABLE">
                      <input
                        value={action.varName ?? ''}
                        onChange={(e) => setAction((a) => ({ ...a, varName: e.target.value.replace(/[^a-zA-Z0-9_]/g, '') }))}
                        placeholder="contador, lastApp, etc."
                        style={inputStyle}
                      />
                    </Field>
                    <Field label="VALOR (acepta {otraVariable})">
                      <input
                        value={action.varValue ?? ''}
                        onChange={(e) => setAction((a) => ({ ...a, varValue: e.target.value }))}
                        placeholder="0, true, {lastApp}"
                        style={inputStyle}
                      />
                    </Field>
                  </>
                )}

                {action.type === 'incr-var' && (
                  <>
                    <Field label="NOMBRE DE VARIABLE">
                      <input
                        value={action.varName ?? ''}
                        onChange={(e) => setAction((a) => ({ ...a, varName: e.target.value.replace(/[^a-zA-Z0-9_]/g, '') }))}
                        placeholder="contador"
                        style={inputStyle}
                      />
                    </Field>
                    <Field label="DELTA (entero — usa negativo para restar)">
                      <input
                        type="number"
                        value={action.varDelta ?? 1}
                        onChange={(e) => setAction((a) => ({ ...a, varDelta: parseInt(e.target.value) || 0 }))}
                        style={inputStyle}
                      />
                    </Field>
                  </>
                )}

                {action.type === 'webhook' && (
                  <>
                    <Field label="URL">
                      <input
                        value={action.webhookUrl ?? ''}
                        onChange={(e) => setAction((a) => ({ ...a, webhookUrl: e.target.value }))}
                        placeholder="https://..."
                        style={inputStyle}
                      />
                    </Field>
                    <Field label="MÉTODO">
                      <select
                        value={action.webhookMethod ?? 'POST'}
                        onChange={(e) => setAction((a) => ({ ...a, webhookMethod: e.target.value as 'GET' | 'POST' | 'PUT' | 'DELETE' }))}
                        style={inputStyle}
                      >
                        <option value="GET">GET</option>
                        <option value="POST">POST</option>
                        <option value="PUT">PUT</option>
                        <option value="DELETE">DELETE</option>
                      </select>
                    </Field>
                    <Field label="HEADERS (JSON, opcional)">
                      <textarea
                        value={action.webhookHeaders ?? ''}
                        onChange={(e) => setAction((a) => ({ ...a, webhookHeaders: e.target.value }))}
                        placeholder='{"Authorization": "Bearer ..."}'
                        rows={2}
                        style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }}
                      />
                    </Field>
                    <Field label="BODY (acepta {variables})">
                      <textarea
                        value={action.webhookBody ?? ''}
                        onChange={(e) => setAction((a) => ({ ...a, webhookBody: e.target.value }))}
                        placeholder='{"event": "press", "count": "{counter}"}'
                        rows={3}
                        style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }}
                      />
                    </Field>
                  </>
                )}

                {action.type === 'tts' && (
                  <Field label="TEXTO A LEER (acepta {variables})">
                    <textarea
                      value={action.ttsText ?? ''}
                      onChange={(e) => setAction((a) => ({ ...a, ttsText: e.target.value }))}
                      placeholder="Hola, son las {hora}"
                      rows={3}
                      style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }}
                    />
                  </Field>
                )}

                {action.type === 'region-capture' && (
                  <div style={{ fontFamily: VD.mono, fontSize: 10, color: VD.textMuted, lineHeight: 1.6 }}>
                    Abre la herramienta nativa de captura de región de Windows (Win+Shift+S).
                    El recorte queda en el portapapeles.
                  </div>
                )}

                {(action.type === 'rgb-color' || action.type === 'rgb-mode') && (
                  <>
                    {!rgbConnected && (
                      <div style={{ fontFamily: VD.mono, fontSize: 10, color: VD.warning, padding: '6px 10px', background: 'rgba(212,162,52,0.08)', border: `1px solid ${VD.warning}`, borderRadius: VD.radius.sm }}>
                        OpenRGB no conectado. Conecta desde la pantalla RGB para listar dispositivos. La acción seguirá funcionando si OpenRGB está activo cuando se ejecute el botón.
                      </div>
                    )}
                    <Field label="DISPOSITIVO RGB">
                      <select
                        value={action.rgbDeviceId ?? -1}
                        onChange={(e) => setAction((a) => ({ ...a, rgbDeviceId: parseInt(e.target.value, 10) }))}
                        style={inputStyle}
                      >
                        <option value={-1}>Todos los dispositivos</option>
                        {rgbDevices.map((d) => (
                          <option key={d.id} value={d.id}>{d.name} ({d.typeLabel})</option>
                        ))}
                      </select>
                    </Field>
                  </>
                )}

                {action.type === 'rgb-color' && (
                  <Field label="COLOR (HEX)">
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input
                        type="color"
                        value={action.rgbColor ?? '#ffffff'}
                        onChange={(e) => setAction((a) => ({ ...a, rgbColor: e.target.value }))}
                        style={{ width: 36, height: 28, padding: 2, border: `1px solid ${VD.border}`, background: 'none', cursor: 'pointer', borderRadius: VD.radius.sm }}
                      />
                      <input
                        value={(action.rgbColor ?? '#ffffff').toUpperCase()}
                        onChange={(e) => {
                          const v = e.target.value.trim();
                          if (/^#?[0-9a-fA-F]{6}$/.test(v)) setAction((a) => ({ ...a, rgbColor: v.startsWith('#') ? v : `#${v}` }));
                        }}
                        style={{ ...inputStyle, flex: 1 }}
                      />
                    </div>
                  </Field>
                )}

                {action.type === 'rgb-mode' && (
                  <>
                    <Field label="MODO / EFECTO">
                      <input
                        value={action.rgbMode ?? ''}
                        onChange={(e) => setAction((a) => ({ ...a, rgbMode: e.target.value }))}
                        placeholder="Direct, Static, Breathing, Rainbow, Spectrum Cycle..."
                        list="rgb-modes-list"
                        style={inputStyle}
                      />
                      <datalist id="rgb-modes-list">
                        {(() => {
                          const seen = new Set<string>();
                          return rgbDevices.flatMap((d) => d.modes).filter((m) => {
                            if (seen.has(m.name.toLowerCase())) return false;
                            seen.add(m.name.toLowerCase()); return true;
                          }).map((m) => <option key={m.name} value={m.name} />);
                        })()}
                      </datalist>
                    </Field>
                    <Field label="COLOR (OPCIONAL — SOLO PARA MODOS QUE LO USAN)">
                      <input
                        type="color"
                        value={action.rgbColor ?? '#ffffff'}
                        onChange={(e) => setAction((a) => ({ ...a, rgbColor: e.target.value }))}
                        style={{ width: 60, height: 28, padding: 2, border: `1px solid ${VD.border}`, background: 'none', cursor: 'pointer', borderRadius: VD.radius.sm }}
                      />
                    </Field>
                    <Field label="BRILLO 0-100 (OPCIONAL)">
                      <input
                        type="number"
                        min={0} max={100}
                        value={action.rgbBrightness ?? ''}
                        onChange={(e) => setAction((a) => ({ ...a, rgbBrightness: e.target.value === '' ? undefined : parseInt(e.target.value, 10) }))}
                        style={inputStyle}
                      />
                    </Field>
                  </>
                )}

                {action.type === 'rgb-profile' && (
                  <Field label="PERFIL RGB">
                    {rgbProfiles.length === 0 ? (
                      <div style={{ fontFamily: VD.mono, fontSize: 10, color: VD.warning, lineHeight: 1.6 }}>
                        No hay perfiles RGB guardados. Abre la pantalla RGB y guarda un perfil con el estado actual de tus dispositivos.
                      </div>
                    ) : (
                      <select
                        value={action.rgbProfileName ?? ''}
                        onChange={(e) => setAction((a) => ({ ...a, rgbProfileName: e.target.value }))}
                        style={inputStyle}
                      >
                        <option value="">— Selecciona un perfil —</option>
                        {rgbProfiles.map((p) => (
                          <option key={p.id} value={p.name}>{p.name}</option>
                        ))}
                      </select>
                    )}
                  </Field>
                )}

                {action.type === 'folder' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <DotLabel size={9} color={VD.textMuted} spacing={2}>CARGAR PRESET ADOBE</DotLabel>
                      {Object.entries(FOLDER_PRESETS).map(([key, fp]) => (
                        <button
                          key={key}
                          onClick={() => applyFolderPreset(key)}
                          style={{
                            padding: '5px 12px',
                            background: VD.elevated, border: `1px solid ${VD.border}`,
                            fontFamily: VD.mono, fontSize: 9, color: fp.fgColor, cursor: 'pointer', borderRadius: VD.radius.sm,
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.borderColor = fp.fgColor)}
                          onMouseLeave={(e) => (e.currentTarget.style.borderColor = VD.border)}
                        >
                          {fp.icon} {fp.label}
                        </button>
                      ))}
                    </div>
                    <DotLabel size={9} color={VD.textMuted} spacing={2} style={{ display: 'block' }}>
                      BOTONES DE LA CARPETA ({folderButtons.length}/12)
                    </DotLabel>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                      {Array.from({ length: 12 }, (_, i) => {
                        const fb = folderButtons[i];
                        return (
                          <FolderButtonSlot
                            key={i}
                            button={fb}
                            accent={accent}
                            onChange={(updated) => {
                              const next = [...folderButtons];
                              if (updated) {
                                next[i] = updated;
                              } else {
                                next.splice(i, 1);
                              }
                              setFolderButtons(next.filter(Boolean));
                            }}
                          />
                        );
                      })}
                    </div>
                  </div>
                )}

                {['media-play-pause', 'media-next', 'media-prev', 'volume-up', 'volume-down', 'mute'].includes(action.type) && (
                  <div style={{ fontFamily: VD.mono, fontSize: 11, color: VD.textDim, padding: '8px 0' }}>
                    Esta acción no necesita configuración adicional.
                  </div>
                )}

                {action.type === 'window-snap' && (
                  <>
                    <Field label="POSICIÓN / TAMAÑO">
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                        {([
                          ['top-left','↖ Cuad. sup-izq'],['top-half','↑ Mitad superior'],['top-right','↗ Cuad. sup-der'],
                          ['left-half','← Mitad izq'],['center','⊞ Centro 50%'],['right-half','→ Mitad der'],
                          ['bottom-left','↙ Cuad. inf-izq'],['bottom-half','↓ Mitad inferior'],['bottom-right','↘ Cuad. inf-der'],
                          ['maximize','⛶ Maximizar'],['restore','⊡ Restaurar'],
                        ] as [string, string][]).map(([val, lbl]) => (
                          <div
                            key={val}
                            onClick={() => setAction((a) => ({ ...a, snapPosition: val as any }))}
                            style={{
                              padding: '6px 8px', borderRadius: VD.radius.sm, cursor: 'pointer',
                              background: action.snapPosition === val ? VD.accentBg : VD.elevated,
                              border: `1px solid ${action.snapPosition === val ? accent : VD.border}`,
                              fontFamily: VD.mono, fontSize: 8, color: action.snapPosition === val ? accent : VD.textDim,
                              textAlign: 'center',
                            }}
                          >{lbl}</div>
                        ))}
                      </div>
                    </Field>
                    <Field label="PROCESO A SNAPEAR (opcional — vacío = ventana activa)">
                      <input
                        value={action.snapProcessName ?? ''}
                        onChange={(e) => setAction((a) => ({ ...a, snapProcessName: e.target.value || undefined }))}
                        placeholder="chrome, notepad, code..."
                        style={inputStyle}
                      />
                      <div style={{ fontFamily: VD.mono, fontSize: 8, color: VD.textMuted, marginTop: 4 }}>
                        Sin nombre de proceso, snapea la ventana en foco al momento de ejecutar.
                        Funciona mejor con hotkeys globales (sin pasar por VirtualDeck).
                      </div>
                    </Field>
                  </>
                )}

                {action.type === 'branch' && (
                  <>
                    <Field label="CONDICIÓN: SI {variable}">
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <input
                          value={action.branchVar ?? ''}
                          onChange={(e) => setAction((a) => ({ ...a, branchVar: e.target.value.replace(/[^a-zA-Z0-9_]/g, '') }))}
                          placeholder="nombre_variable"
                          style={{ ...inputStyle, flex: 1 }}
                        />
                        <select
                          value={action.branchOp ?? '=='}
                          onChange={(e) => setAction((a) => ({ ...a, branchOp: e.target.value as any }))}
                          style={{ ...inputStyle, width: 120 }}
                        >
                          <option value="==">== igual a</option>
                          <option value="!=">!= distinto de</option>
                          <option value=">">{'>'} mayor que</option>
                          <option value="<">{'<'} menor que</option>
                          <option value=">=">{'>='} mayor o igual</option>
                          <option value="<=">{'<='} menor o igual</option>
                          <option value="contains">contiene</option>
                          <option value="empty">está vacío</option>
                          <option value="not-empty">no está vacío</option>
                        </select>
                        {!['empty','not-empty'].includes(action.branchOp ?? '==') && (
                          <input
                            value={action.branchValue ?? ''}
                            onChange={(e) => setAction((a) => ({ ...a, branchValue: e.target.value }))}
                            placeholder="valor o {variable}"
                            style={{ ...inputStyle, flex: 1 }}
                          />
                        )}
                      </div>
                    </Field>
                    <Field label="ENTONCES (acción si VERDADERO)">
                      <BranchActionRow
                        action={action.branchThen?.[0] ?? { type: 'none' }}
                        onChange={(a) => setAction((prev) => ({ ...prev, branchThen: a.type !== 'none' ? [a] : [] }))}
                        accent={accent}
                      />
                    </Field>
                    <Field label="SI NO (acción si FALSO — opcional)">
                      <BranchActionRow
                        action={action.branchElse?.[0] ?? { type: 'none' }}
                        onChange={(a) => setAction((prev) => ({ ...prev, branchElse: a.type !== 'none' ? [a] : [] }))}
                        accent={accent}
                      />
                    </Field>
                  </>
                )}

                {action.type === 'countdown' && (
                  <>
                    <Field label="TIEMPO DE ESPERA (milisegundos)">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <input
                          type="number"
                          min={100} max={60000} step={100}
                          value={action.timerDelay ?? 1000}
                          onChange={(e) => setAction((a) => ({ ...a, timerDelay: Math.max(100, parseInt(e.target.value) || 1000) }))}
                          style={inputStyle}
                        />
                        <span style={{ fontFamily: VD.mono, fontSize: 10, color: VD.textDim, flexShrink: 0 }}>
                          = {((action.timerDelay ?? 1000) / 1000).toFixed(1)}s
                        </span>
                      </div>
                      <div style={{ fontFamily: VD.mono, fontSize: 8, color: VD.textMuted, marginTop: 4 }}>
                        Pausa la secuencia este tiempo antes de continuar con la siguiente acción.
                      </div>
                    </Field>
                  </>
                )}

                {action.type === 'macro' && (
                  <Field label="PASOS DE LA MACRO">
                    <MacroEditor
                      steps={action.macroSteps ?? []}
                      repeat={action.macroRepeat ?? 1}
                      accent={accent}
                      onChange={(steps, repeat) => setAction((a) => ({ ...a, macroSteps: steps, macroRepeat: repeat }))}
                    />
                  </Field>
                )}

                {/* Toggle mode — for non-folder actions */}
                {action.type !== 'none' && action.type !== 'folder' && (
                  <div style={{ borderTop: `1px solid ${VD.border}`, paddingTop: 14 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: isToggle ? 12 : 0 }}>
                      <input
                        type="checkbox"
                        checked={isToggle}
                        onChange={(e) => setIsToggle(e.target.checked)}
                        style={{ accentColor: accent }}
                      />
                      <span style={{ fontFamily: VD.mono, fontSize: 9, letterSpacing: 1, color: VD.textDim }}>
                        MODO TOGGLE — el botón alterna entre activado / desactivado
                      </span>
                    </label>
                    {isToggle && (
                      <div style={{ marginLeft: 24 }}>
                        <DotLabel size={9} color={VD.textMuted} spacing={2} style={{ display: 'block', marginBottom: 8 }}>
                          ACCIÓN AL DESACTIVAR (opcional — si vacío, repite la misma acción)
                        </DotLabel>
                        <ToggleOffActionPicker
                          action={actionToggleOff}
                          onChange={setActionToggleOff}
                          accent={accent}
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* 3.x — Long press action */}
                {action.type !== 'none' && action.type !== 'folder' && (
                  <div style={{ borderTop: `1px solid ${VD.border}`, paddingTop: 14 }}>
                    <DotLabel size={9} color={VD.textMuted} spacing={2} style={{ display: 'block', marginBottom: 8 }}>
                      ACCIÓN AL MANTENER PRESIONADO (~500 MS)
                    </DotLabel>
                    <ToggleOffActionPicker
                      action={longPressAction}
                      onChange={setLongPressAction}
                      accent={accent}
                    />
                  </div>
                )}

                {/* 3.x — Radio group */}
                {action.type !== 'none' && action.type !== 'folder' && isToggle && (
                  <div style={{ borderTop: `1px solid ${VD.border}`, paddingTop: 14 }}>
                    <Field label="GRUPO RADIO (toggles mutuamente exclusivos)">
                      <input
                        value={radioGroup}
                        onChange={(e) => setRadioGroup(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ''))}
                        placeholder="ej: modo_audio, perfil_rgb..."
                        style={inputStyle}
                      />
                      <div style={{ fontFamily: VD.mono, fontSize: 8, color: VD.textMuted, marginTop: 4 }}>
                        Todos los toggles con el mismo grupo se desactivan cuando se activa este.
                      </div>
                    </Field>
                  </div>
                )}

                {/* 1.4 — Disparadores externos */}
                {action.type !== 'none' && action.type !== 'folder' && (
                  <div style={{ borderTop: `1px solid ${VD.border}`, paddingTop: 14 }}>
                    <DotLabel size={9} color={VD.textMuted} spacing={2} style={{ display: 'block', marginBottom: 10 }}>
                      DISPARADORES EXTERNOS
                    </DotLabel>
                    <Field label="HOTKEY GLOBAL DEL SO (ej. Ctrl+Alt+1)">
                      <input
                        value={globalHotkey}
                        onChange={(e) => setGlobalHotkey(e.target.value)}
                        placeholder="vacío = sin atajo global"
                        style={inputStyle}
                      />
                    </Field>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginTop: 10 }}>
                      <input
                        type="checkbox"
                        checked={inTrayMenu}
                        onChange={(e) => setInTrayMenu(e.target.checked)}
                        style={{ accentColor: accent }}
                      />
                      <span style={{ fontFamily: VD.mono, fontSize: 9, letterSpacing: 1, color: VD.textDim }}>
                        MOSTRAR EN MENÚ DEL TRAY (acción rápida)
                      </span>
                    </label>
                  </div>
                )}
              </div>
            )}

            {/* STEP 2: Style */}
            {step === 2 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <Field label="ETIQUETA DEL BOTÓN">
                  <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Mi Botón" maxLength={20} style={inputStyle} />
                </Field>
                <Field label="SUB-ETIQUETA (OPCIONAL)">
                  <input value={sublabel} onChange={(e) => setSublabel(e.target.value)} placeholder="Descripción corta" maxLength={30} style={inputStyle} />
                </Field>
                <Field label="ICONO (EMOJI O SÍMBOLO — VACÍO = ÍCONO DEL TIPO)">
                  <input value={icon} onChange={(e) => setIcon(e.target.value)} placeholder="▶ ◉ 🎵 💻 🌐 ★" maxLength={4} style={{ ...inputStyle, fontSize: 20 }} />
                </Field>
                <Field label="IMAGEN PERSONALIZADA (PNG / JPG / GIF)">
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <Btn onClick={pickImage}>Elegir imagen</Btn>
                    {imageData && (
                      <>
                        <img src={imageData} alt="" style={{ width: 32, height: 32, objectFit: 'cover', borderRadius: VD.radius.md, border: `1px solid ${VD.border}` }} />
                        <Btn onClick={() => setImageData('')} style={{ color: VD.danger }}>Quitar</Btn>
                      </>
                    )}
                  </div>
                </Field>

                <Field label="ICONO DE MARCA ANIMADO (DOT-MATRIX)">
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    {brandIcon ? (
                      <>
                        <div style={{ position: 'relative', width: 36, height: 36, borderRadius: VD.radius.lg, border: `1px solid ${VD.border}`, overflow: 'hidden', background: VD.elevated }}>
                          <BrandIconDisplay
                            iconKey={brandIcon}
                            customBitmap={brandIconCustomBitmap}
                            customColor={brandIconCustomColor}
                            customPalette={brandIconCustomPalette}
                            animated={false}
                            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
                          />
                        </div>
                        <span style={{ fontFamily: VD.mono, fontSize: 10, color: VD.text }}>
                          {BRAND_ICONS_MAP[brandIcon]?.label ?? brandIcon}
                          {brandIconCustomBitmap && <span style={{ color: accent, marginLeft: 6 }}>✎</span>}
                        </span>
                        <Btn onClick={() => setShowBrandPicker(true)}>Cambiar</Btn>
                        <Btn onClick={() => setShowBrandEditor(true)}>Editar puntos</Btn>
                        {brandIconCustomBitmap && (
                          <Btn onClick={() => { setBrandIconCustomBitmap(undefined); setBrandIconCustomColor(undefined); setBrandIconCustomPalette(undefined); }}>
                            Restaurar
                          </Btn>
                        )}
                        <Btn onClick={() => { setBrandIcon(''); setBrandIconCustomBitmap(undefined); setBrandIconCustomColor(undefined); setBrandIconCustomPalette(undefined); }} style={{ color: VD.danger }}>Quitar</Btn>
                      </>
                    ) : (
                      <Btn onClick={() => setShowBrandPicker(true)}>Elegir icono de marca</Btn>
                    )}
                  </div>
                  {brandIcon && (
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={brandIconAlwaysAnimate}
                        onChange={e => setBrandIconAlwaysAnimate(e.target.checked)}
                        style={{ accentColor: accent }}
                      />
                      <span style={{ fontFamily: VD.mono, fontSize: 9, letterSpacing: 1, color: VD.textDim }}>
                        ANIMACIÓN SIEMPRE ACTIVA — si está desactivado, anima solo cuando el botón está encendido (toggle ON)
                      </span>
                    </label>
                  )}
                  <div style={{ fontFamily: VD.mono, fontSize: 9, color: VD.textMuted, marginTop: 6 }}>
                    68 iconos · Fondo transparente · Superpone al color de fondo del botón
                  </div>
                </Field>

                {/* 2.1 — Glifo 5×7 personal del usuario */}
                <Field label="GLIFO PERSONAL 5×7 (DOT-MATRIX)">
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    {customGlyph57 && customGlyph57.length === 7 && customGlyph57.some((r) => r > 0) ? (
                      <>
                        <div style={{
                          width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          borderRadius: VD.radius.md, border: `1px solid ${VD.border}`, background: VD.elevated,
                        }}>
                          <Glyph57Inline rows={customGlyph57} color={fgColor || VD.text} />
                        </div>
                        <Btn onClick={() => setShowGlyphEditor(true)}>Editar</Btn>
                        <Btn onClick={() => setCustomGlyph57(undefined)} style={{ color: VD.danger }}>Quitar</Btn>
                      </>
                    ) : (
                      <Btn onClick={() => setShowGlyphEditor(true)}>Dibujar glifo</Btn>
                    )}
                  </div>
                  <div style={{ fontFamily: VD.mono, fontSize: 9, color: VD.textMuted, marginTop: 6 }}>
                    5×7 puntos hechos a mano. Coherente con la firma del producto.
                  </div>
                </Field>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <Field label="COLOR DE FONDO">
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input type="color" value={bgColor || '#222222'} onChange={(e) => setBgColor(e.target.value)} style={{ width: 36, height: 28, border: `1px solid ${VD.border}`, background: 'none', cursor: 'pointer', padding: 2 }} />
                      <input value={bgColor} onChange={(e) => setBgColor(e.target.value)} placeholder="#222222" style={{ ...inputStyle, flex: 1 }} />
                      {bgColor && <Btn onClick={() => setBgColor('')}>✕</Btn>}
                    </div>
                  </Field>
                  <Field label="COLOR DE TEXTO / ÍCONO">
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input type="color" value={fgColor || '#dcdcdc'} onChange={(e) => setFgColor(e.target.value)} style={{ width: 36, height: 28, border: `1px solid ${VD.border}`, background: 'none', cursor: 'pointer', padding: 2 }} />
                      <input value={fgColor} onChange={(e) => setFgColor(e.target.value)} placeholder="#dcdcdc" style={{ ...inputStyle, flex: 1 }} />
                      {fgColor && <Btn onClick={() => setFgColor('')}>✕</Btn>}
                    </div>
                  </Field>
                </div>

                <div style={{ height: 1, background: VD.border }} />

                {/* Widget — live data display on the button cell */}
                <Field label="WIDGET (MUESTRA DATOS EN EL BOTÓN)">
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {([undefined, 'clock', 'weather', 'now-playing', 'sensor'] as const).map((w) => {
                      // now-playing on an audio-device button hides the device
                      // name in favor of the playing track — useless combo, so
                      // we lock it out here instead of silently dropping the
                      // widget at render time (was the old behavior).
                      const conflicts = w === 'now-playing' && action.type === 'audio-device';
                      return (
                        <button
                          key={w ?? 'none'}
                          onClick={() => { if (!conflicts) setWidget(w); }}
                          disabled={conflicts}
                          title={conflicts ? 'Incompatible con acción de Audio: el widget oculta el nombre del dispositivo.' : undefined}
                          style={{
                            flex: '1 1 60px', padding: '5px 0', cursor: conflicts ? 'not-allowed' : 'pointer', borderRadius: VD.radius.sm,
                            background: widget === w ? VD.accentBg : VD.elevated,
                            border: `1px solid ${widget === w ? accent : VD.border}`,
                            fontFamily: VD.mono, fontSize: 8, letterSpacing: 0.5,
                            color: widget === w ? accent : VD.textDim,
                            opacity: conflicts ? 0.4 : 1,
                          }}
                        >
                          {w === undefined ? 'NINGUNO' : w === 'clock' ? 'RELOJ' : w === 'weather' ? 'CLIMA' : w === 'now-playing' ? 'MÚSICA' : 'SENSOR'}
                        </button>
                      );
                    })}
                  </div>
                  <div style={{ fontFamily: VD.mono, fontSize: 8, color: VD.textMuted, marginTop: 4 }}>
                    Sustituye el ícono/etiqueta con datos en vivo. El botón sigue siendo ejecutable.
                  </div>
                  {widget === 'sensor' && (
                    <div style={{ marginTop: 8, padding: 10, background: VD.elevated, border: `1px solid ${VD.border}`, borderRadius: VD.radius.md, display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <SensorPicker
                        sensors={sensorList}
                        value={sensorWidgetId}
                        onChange={setSensorWidgetId}
                        accent={accent}
                      />
                      <div style={{ display: 'flex', gap: 8 }}>
                        <input
                          value={sensorWidgetSuffix}
                          onChange={(e) => setSensorWidgetSuffix(e.target.value)}
                          placeholder="Etiqueta (ej. CPU)"
                          style={{ ...inputStyle, flex: 1 }}
                        />
                        <input
                          value={sensorWidgetWarn}
                          onChange={(e) => setSensorWidgetWarn(e.target.value)}
                          placeholder="Warn ≥"
                          style={{ ...inputStyle, width: 80 }}
                        />
                        <input
                          value={sensorWidgetCrit}
                          onChange={(e) => setSensorWidgetCrit(e.target.value)}
                          placeholder="Crit ≥"
                          style={{ ...inputStyle, width: 80 }}
                        />
                      </div>
                      <div style={{ fontFamily: VD.mono, fontSize: 7, color: VD.textMuted }}>
                        Warn pinta el valor en amarillo, Crit en rojo. Mismas unidades que el sensor.
                      </div>
                    </div>
                  )}
                </Field>

                {/* Visibility condition */}
                <Field label="VISIBLE SOLO SI ESTA APP ESTÁ ACTIVA (opcional)">
                  <input
                    value={visibleIfApp}
                    onChange={(e) => setVisibleIfApp(e.target.value)}
                    placeholder="spotify, chrome, obs64 ..."
                    style={inputStyle}
                  />
                  <div style={{ fontFamily: VD.mono, fontSize: 8, color: VD.textMuted, marginTop: 4 }}>
                    Nombre del proceso sin .exe. Vacío = siempre visible.
                  </div>
                </Field>

                {/* Scheduled trigger */}
                <Field label="DISPARAR AUTOMÁTICAMENTE A LA HORA (HH:MM)">
                  <input
                    value={timerTriggerAt}
                    onChange={(e) => setTimerTriggerAt(e.target.value)}
                    placeholder="08:00"
                    maxLength={5}
                    style={inputStyle}
                  />
                  <div style={{ fontFamily: VD.mono, fontSize: 8, color: VD.textMuted, marginTop: 4 }}>
                    Formato 24h. Solo se dispara cuando la página del botón está activa.
                  </div>
                </Field>

                {/* Visibility by sensor */}
                <Field label="VISIBLE SOLO SI SENSOR (opcional)">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <SensorPicker
                      sensors={sensorList}
                      value={visibleIfSensorId}
                      onChange={setVisibleIfSensorId}
                      accent={accent}
                      allowEmpty
                    />
                    {visibleIfSensorId && (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <select
                          value={visibleIfSensorOp}
                          onChange={(e) => setVisibleIfSensorOp(e.target.value as any)}
                          style={{ ...inputStyle, width: 70 }}
                        >
                          <option value=">">{'>'}</option>
                          <option value="<">{'<'}</option>
                          <option value=">=">{'≥'}</option>
                          <option value="<=">{'≤'}</option>
                          <option value="==">{'='}</option>
                        </select>
                        <input
                          value={visibleIfSensorVal}
                          onChange={(e) => setVisibleIfSensorVal(e.target.value)}
                          placeholder="Valor (ej. 80)"
                          style={{ ...inputStyle, flex: 1 }}
                        />
                      </div>
                    )}
                  </div>
                  <div style={{ fontFamily: VD.mono, fontSize: 8, color: VD.textMuted, marginTop: 4 }}>
                    Aparece cuando el sensor cumple la condición. Combinable con app de arriba.
                  </div>
                </Field>

                {/* Sensor-triggered automatic execution */}
                <Field label="DISPARAR CUANDO SENSOR (opcional)">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <SensorPicker
                      sensors={sensorList}
                      value={sensorTriggerId}
                      onChange={setSensorTriggerId}
                      accent={accent}
                      allowEmpty
                    />
                    {sensorTriggerId && (
                      <>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <select
                            value={sensorTriggerOp}
                            onChange={(e) => setSensorTriggerOp(e.target.value as any)}
                            style={{ ...inputStyle, width: 70 }}
                          >
                            <option value=">">{'>'}</option>
                            <option value="<">{'<'}</option>
                            <option value=">=">{'≥'}</option>
                            <option value="<=">{'≤'}</option>
                            <option value="==">{'='}</option>
                          </select>
                          <input
                            value={sensorTriggerVal}
                            onChange={(e) => setSensorTriggerVal(e.target.value)}
                            placeholder="Valor (ej. 85)"
                            style={{ ...inputStyle, flex: 1 }}
                          />
                          <input
                            value={sensorTriggerCooldown}
                            onChange={(e) => setSensorTriggerCooldown(e.target.value)}
                            placeholder="Cooldown s"
                            style={{ ...inputStyle, width: 100 }}
                          />
                        </div>
                      </>
                    )}
                  </div>
                  <div style={{ fontFamily: VD.mono, fontSize: 8, color: VD.textMuted, marginTop: 4 }}>
                    Ejecuta la acción cuando se cumple la condición. Cooldown evita que se redispare cada poll (default 60s).
                  </div>
                </Field>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ height: 54, borderTop: `1px solid ${VD.border}`, display: 'flex', alignItems: 'center', padding: '0 20px', gap: 10, flexShrink: 0 }}>
          <button onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0} style={{ padding: '8px 14px', border: `1px solid ${VD.border}`, background: 'transparent', fontFamily: VD.mono, fontSize: 10, letterSpacing: 2, color: step === 0 ? VD.textMuted : VD.textDim, cursor: step === 0 ? 'default' : 'pointer' }}>
            ← ATRÁS
          </button>
          <div style={{ flex: 1 }} />
          <span style={{ fontFamily: VD.mono, fontSize: 10, color: VD.textMuted, letterSpacing: 1 }}>PASO {step + 1} / {STEPS.length}</span>
          <button onClick={onClose} style={{ padding: '8px 14px', border: `1px solid ${VD.border}`, background: 'transparent', fontFamily: VD.mono, fontSize: 10, letterSpacing: 2, color: VD.textDim, cursor: 'pointer' }}>CANCELAR</button>
          <button onClick={() => { if (step < STEPS.length - 1) setStep(step + 1); else handleSave(); }} style={{ padding: '8px 20px', background: accent, border: 'none', fontFamily: VD.mono, fontSize: 10, letterSpacing: 2, color: '#fff', cursor: 'pointer', borderRadius: VD.radius.sm }}>
            {step < STEPS.length - 1 ? 'SIGUIENTE →' : 'GUARDAR ✓'}
          </button>
        </div>
      </div>

      {/* Brand icon picker modal — lazy */}
      {showBrandPicker && (
        <Suspense fallback={null}>
          <BrandIconPicker
            current={brandIcon}
            accent={accent}
            onSelect={(key) => { setBrandIcon(key); setBrandIconCustomBitmap(undefined); setBrandIconCustomColor(undefined); setBrandIconCustomPalette(undefined); }}
            onClose={() => setShowBrandPicker(false)}
          />
        </Suspense>
      )}

      {/* 2.1 — Editor de glifo 5×7 */}
      {showGlyphEditor && (
        <Glyph57Editor
          initial={customGlyph57}
          accent={accent}
          onSave={(rows) => {
            // Si todo está vacío, limpiar el campo
            if (rows.every((r) => r === 0)) setCustomGlyph57(undefined);
            else setCustomGlyph57(rows);
          }}
          onClose={() => setShowGlyphEditor(false)}
        />
      )}

      {/* Brand icon dot editor modal — lazy */}
      {showBrandEditor && brandIcon && (
        <Suspense fallback={null}>
          <BrandIconEditor
            iconKey={brandIcon}
            customBitmap={brandIconCustomBitmap}
            customColor={brandIconCustomColor}
            customPalette={brandIconCustomPalette}
            accent={accent}
            onSave={(bmp, col, pal) => { setBrandIconCustomBitmap(bmp); setBrandIconCustomColor(col); setBrandIconCustomPalette(pal); }}
            onClose={() => setShowBrandEditor(false)}
          />
        </Suspense>
      )}
    </div>
  );
}

// Compact slot editor for folder sub-buttons
function FolderButtonSlot({ button, accent, onChange }: {
  button?: FolderButton;
  accent: string;
  onChange: (b: FolderButton | null) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(button?.label ?? '');
  const [icon, setIcon] = useState(button?.icon ?? '');
  const [hotkey, setHotkey] = useState(button?.action?.hotkey ?? '');

  if (!button && !editing) {
    return (
      <div
        onClick={() => setEditing(true)}
        style={{
          height: 60, borderRadius: VD.radius.md, background: VD.elevated, border: `1px dashed ${VD.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          color: VD.textMuted, fontSize: 18,
        }}
        onMouseEnter={(e) => (e.currentTarget.style.borderColor = accent)}
        onMouseLeave={(e) => (e.currentTarget.style.borderColor = VD.border)}
      >
        +
      </div>
    );
  }

  if (editing) {
    return (
      <div style={{ background: VD.bg, border: `1px solid ${accent}`, borderRadius: VD.radius.md, padding: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ display: 'flex', gap: 4 }}>
          <input value={icon} onChange={e => setIcon(e.target.value)} placeholder="⌘" maxLength={2}
            style={{ width: 28, background: VD.elevated, border: `1px solid ${VD.border}`, padding: '2px 4px', color: VD.text, fontFamily: VD.mono, fontSize: 13, outline: 'none', borderRadius: VD.radius.sm, textAlign: 'center' }} />
          <input value={label} onChange={e => setLabel(e.target.value)} placeholder="Nombre" maxLength={12}
            style={{ flex: 1, background: VD.elevated, border: `1px solid ${VD.border}`, padding: '2px 6px', color: VD.text, fontFamily: VD.mono, fontSize: 9, outline: 'none', borderRadius: VD.radius.sm }} />
        </div>
        <input value={hotkey} onChange={e => setHotkey(e.target.value)} placeholder="Ctrl+Z"
          style={{ width: '100%', background: VD.elevated, border: `1px solid ${VD.border}`, padding: '2px 6px', color: VD.text, fontFamily: VD.mono, fontSize: 9, outline: 'none', borderRadius: VD.radius.sm, boxSizing: 'border-box' }} />
        <div style={{ display: 'flex', gap: 4 }}>
          <button onClick={() => {
            if (label.trim() || hotkey.trim()) {
              onChange({ label: label.trim() || hotkey, icon: icon || undefined, action: { type: 'hotkey', hotkey: hotkey.trim() } });
            }
            setEditing(false);
          }} style={{ flex: 1, padding: '3px 0', background: VD.accentBg, border: `1px solid ${accent}`, fontFamily: VD.mono, fontSize: 8, color: accent, cursor: 'pointer', borderRadius: VD.radius.sm }}>OK</button>
          <button onClick={() => { onChange(null); setEditing(false); }}
            style={{ padding: '3px 6px', background: 'transparent', border: `1px solid ${VD.border}`, fontFamily: VD.mono, fontSize: 8, color: VD.danger, cursor: 'pointer', borderRadius: VD.radius.sm }}>✕</button>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={() => { setLabel(button!.label); setIcon(button!.icon ?? ''); setHotkey(button!.action.hotkey ?? ''); setEditing(true); }}
      style={{
        height: 60, borderRadius: VD.radius.md, background: button?.bgColor || VD.elevated,
        border: `1px solid ${VD.border}`,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', gap: 2, position: 'relative',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = accent)}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = VD.border)}
    >
      {button?.icon && <div style={{ fontSize: 14, color: button.fgColor || VD.text, lineHeight: 1 }}>{button.icon}</div>}
      <div style={{ fontFamily: VD.mono, fontSize: 7, color: button?.fgColor || VD.textDim, textAlign: 'center', maxWidth: 60, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: 0.5 }}>
        {button?.label}
      </div>
      {button?.action.hotkey && (
        <div style={{ fontFamily: VD.mono, fontSize: 6, color: VD.textMuted, opacity: 0.7 }}>{button.action.hotkey}</div>
      )}
    </div>
  );
}

// Compact toggle-off action picker
function ToggleOffActionPicker({ action, onChange, accent }: { action: ButtonAction; onChange: (a: ButtonAction) => void; accent: string }) {
  const simpleTypes: ActionType[] = ['hotkey', 'script', 'app', 'media-play-pause', 'mute', 'kill-process', 'volume-set', 'brightness', 'none'];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <select
        value={action.type}
        onChange={(e) => onChange({ type: e.target.value as ActionType })}
        style={{ ...selectStyle }}
      >
        {simpleTypes.map(t => (
          <option key={t} value={t}>{ACTION_TYPES.find(at => at.type === t)?.label ?? t}</option>
        ))}
      </select>
      {action.type === 'hotkey' && (
        <input value={action.hotkey || ''} onChange={e => onChange({ ...action, hotkey: e.target.value })}
          placeholder="Ctrl+Shift+F9" style={{ ...inputStyle, fontSize: 11 }} />
      )}
      {action.type === 'script' && (
        <textarea value={action.script || ''} onChange={e => onChange({ ...action, script: e.target.value })}
          placeholder="Script de desactivación..." rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
      )}
      {action.type === 'app' && (
        <input value={action.appPath || ''} onChange={e => onChange({ ...action, appPath: e.target.value })}
          placeholder="ruta o comando" style={{ ...inputStyle, fontSize: 11 }} />
      )}
      {action.type === 'kill-process' && (
        <input value={action.processName || ''} onChange={e => onChange({ ...action, processName: e.target.value })}
          placeholder="proceso.exe" style={{ ...inputStyle, fontSize: 11 }} />
      )}
      {action.type === 'volume-set' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <input type="range" min={0} max={100} step={5} value={action.volumePercent ?? 50}
            onChange={e => onChange({ ...action, volumePercent: parseInt(e.target.value) })}
            style={{ flex: 1, accentColor: accent }} />
          <span style={{ fontFamily: VD.mono, fontSize: 11, color: VD.text, minWidth: 36 }}>{action.volumePercent ?? 50}%</span>
        </div>
      )}
      {action.type === 'brightness' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <input type="range" min={0} max={100} step={5} value={action.brightnessLevel ?? 70}
            onChange={e => onChange({ ...action, brightnessLevel: parseInt(e.target.value) })}
            style={{ flex: 1, accentColor: accent }} />
          <span style={{ fontFamily: VD.mono, fontSize: 11, color: VD.text, minWidth: 36 }}>{action.brightnessLevel ?? 70}%</span>
        </div>
      )}
    </div>
  );
}

// Compact action picker for branch then/else — reuses ToggleOffActionPicker with an extended type list
function BranchActionRow({ action, onChange, accent }: { action: ButtonAction; onChange: (a: ButtonAction) => void; accent: string }) {
  const simpleTypes: ActionType[] = ['none', 'set-var', 'incr-var', 'hotkey', 'script', 'notify', 'webhook', 'clipboard', 'type-text', 'volume-set', 'brightness', 'rgb-preset', 'window-snap'];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <select value={action.type} onChange={(e) => onChange({ type: e.target.value as ActionType })} style={{ ...selectStyle }}>
        {simpleTypes.map(t => (
          <option key={t} value={t}>{ACTION_TYPES.find(at => at.type === t)?.label ?? t}</option>
        ))}
      </select>
      {action.type === 'set-var' && (
        <div style={{ display: 'flex', gap: 6 }}>
          <input value={action.varName ?? ''} onChange={e => onChange({ ...action, varName: e.target.value.replace(/[^a-zA-Z0-9_]/g, '') })}
            placeholder="variable" style={{ ...inputStyle, flex: 1 }} />
          <input value={action.varValue ?? ''} onChange={e => onChange({ ...action, varValue: e.target.value })}
            placeholder="valor" style={{ ...inputStyle, flex: 1 }} />
        </div>
      )}
      {action.type === 'incr-var' && (
        <div style={{ display: 'flex', gap: 6 }}>
          <input value={action.varName ?? ''} onChange={e => onChange({ ...action, varName: e.target.value.replace(/[^a-zA-Z0-9_]/g, '') })}
            placeholder="variable" style={{ ...inputStyle, flex: 1 }} />
          <input type="number" value={action.varDelta ?? 1} onChange={e => onChange({ ...action, varDelta: parseInt(e.target.value) || 0 })}
            style={{ ...inputStyle, width: 80 }} />
        </div>
      )}
      {action.type === 'hotkey' && (
        <input value={action.hotkey || ''} onChange={e => onChange({ ...action, hotkey: e.target.value })}
          placeholder="Ctrl+Shift+F9" style={{ ...inputStyle, fontSize: 11 }} />
      )}
      {action.type === 'script' && (
        <textarea value={action.script || ''} onChange={e => onChange({ ...action, script: e.target.value })}
          placeholder="Script..." rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
      )}
      {action.type === 'notify' && (
        <div style={{ display: 'flex', gap: 6 }}>
          <input value={action.notifyTitle ?? ''} onChange={e => onChange({ ...action, notifyTitle: e.target.value })}
            placeholder="Título" style={{ ...inputStyle, flex: 1 }} />
          <input value={action.notifyBody ?? ''} onChange={e => onChange({ ...action, notifyBody: e.target.value })}
            placeholder="Mensaje" style={{ ...inputStyle, flex: 2 }} />
        </div>
      )}
      {action.type === 'webhook' && (
        <input value={action.webhookUrl ?? ''} onChange={e => onChange({ ...action, webhookUrl: e.target.value, webhookMethod: action.webhookMethod ?? 'POST' })}
          placeholder="https://..." style={inputStyle} />
      )}
      {action.type === 'clipboard' && (
        <input value={action.clipboardText || ''} onChange={e => onChange({ ...action, clipboardText: e.target.value })}
          placeholder="Texto al portapapeles" style={inputStyle} />
      )}
      {action.type === 'type-text' && (
        <input value={action.typeText || ''} onChange={e => onChange({ ...action, typeText: e.target.value })}
          placeholder="Texto a escribir" style={inputStyle} />
      )}
      {action.type === 'volume-set' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <input type="range" min={0} max={100} step={5} value={action.volumePercent ?? 50}
            onChange={e => onChange({ ...action, volumePercent: parseInt(e.target.value) })} style={{ flex: 1, accentColor: accent }} />
          <span style={{ fontFamily: VD.mono, fontSize: 11, color: VD.text, minWidth: 36 }}>{action.volumePercent ?? 50}%</span>
        </div>
      )}
      {action.type === 'brightness' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <input type="range" min={0} max={100} step={5} value={action.brightnessLevel ?? 70}
            onChange={e => onChange({ ...action, brightnessLevel: parseInt(e.target.value) })} style={{ flex: 1, accentColor: accent }} />
          <span style={{ fontFamily: VD.mono, fontSize: 11, color: VD.text, minWidth: 36 }}>{action.brightnessLevel ?? 70}%</span>
        </div>
      )}
      {action.type === 'rgb-preset' && (
        <select value={action.rgbPresetId ?? ''} onChange={e => onChange({ ...action, rgbPresetId: e.target.value })} style={{ ...selectStyle }}>
          {['off','gaming','cinema','work','rainbow','night-blue','alert-red'].map(p => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      )}
      {action.type === 'window-snap' && (
        <select value={action.snapPosition ?? 'left-half'} onChange={e => onChange({ ...action, snapPosition: e.target.value as any })} style={{ ...selectStyle }}>
          {['left-half','right-half','top-half','bottom-half','top-left','top-right','bottom-left','bottom-right','maximize','center','restore'].map(p => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      )}
    </div>
  );
}

function ExtraActionRow({ action, onChange, onRemove }: { action: ButtonAction; onChange: (a: ButtonAction) => void; onRemove: () => void }) {
  const meta = ACTION_TYPES.find(a => a.type === action.type);
  const Icon = meta?.Icon ?? IconNone;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: VD.elevated, border: `1px solid ${VD.border}`, borderRadius: VD.radius.md, padding: '6px 10px' }}>
      <Icon size={14} color={VD.textDim} strokeWidth={1.5} />
      <span style={{ fontFamily: VD.mono, fontSize: 9, color: VD.textMuted, minWidth: 64 }}>{meta?.label}</span>
      {action.type === 'app' && (
        <input value={action.appPath || ''} onChange={e => onChange({ ...action, appPath: e.target.value })} placeholder="ruta o comando" style={miniInputStyle} />
      )}
      {action.type === 'web' && (
        <input value={action.url || ''} onChange={e => onChange({ ...action, url: e.target.value })} placeholder="https://..." style={miniInputStyle} />
      )}
      {action.type === 'script' && (
        <input value={action.script || ''} onChange={e => onChange({ ...action, script: e.target.value })} placeholder="script" style={miniInputStyle} />
      )}
      {action.type === 'hotkey' && (
        <input value={action.hotkey || ''} onChange={e => onChange({ ...action, hotkey: e.target.value })} placeholder="Ctrl+Shift+F9" style={miniInputStyle} />
      )}
      {action.type === 'shortcut' && (
        <input value={action.shortcutPath || ''} onChange={e => onChange({ ...action, shortcutPath: e.target.value })} placeholder="ruta" style={miniInputStyle} />
      )}
      {action.type === 'clipboard' && (
        <input value={action.clipboardText || ''} onChange={e => onChange({ ...action, clipboardText: e.target.value })} placeholder="texto al portapapeles" style={miniInputStyle} />
      )}
      {action.type === 'type-text' && (
        <input value={action.typeText || ''} onChange={e => onChange({ ...action, typeText: e.target.value })} placeholder="texto a escribir" style={miniInputStyle} />
      )}
      {action.type === 'kill-process' && (
        <input value={action.processName || ''} onChange={e => onChange({ ...action, processName: e.target.value })} placeholder="proceso.exe" style={miniInputStyle} />
      )}
      {action.type === 'brightness' && (
        <>
          <input type="range" min={0} max={100} step={5} value={action.brightnessLevel ?? 70} onChange={e => onChange({ ...action, brightnessLevel: parseInt(e.target.value) })} style={{ flex: 1, accentColor: VD.accent }} />
          <span style={{ fontFamily: VD.mono, fontSize: 9, color: VD.text, minWidth: 28 }}>{action.brightnessLevel ?? 70}%</span>
        </>
      )}
      {action.type === 'volume-set' && (
        <>
          <input type="range" min={0} max={100} step={5} value={action.volumePercent ?? 50} onChange={e => onChange({ ...action, volumePercent: parseInt(e.target.value) })} style={{ flex: 1, accentColor: VD.accent }} />
          <span style={{ fontFamily: VD.mono, fontSize: 9, color: VD.text, minWidth: 28 }}>{action.volumePercent ?? 50}%</span>
        </>
      )}
      <div style={{ flex: 1 }} />
      <button onClick={onRemove} style={{ background: 'none', border: 'none', color: VD.danger, cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: '0 2px' }}>×</button>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  background: VD.bg, border: `1px solid ${VD.border}`,
  padding: '9px 12px', color: VD.text,
  fontFamily: VD.mono, fontSize: 11, outline: 'none', borderRadius: VD.radius.sm,
};

const miniInputStyle: React.CSSProperties = {
  flex: 1, background: VD.bg, border: `1px solid ${VD.border}`,
  padding: '4px 8px', color: VD.text, fontFamily: VD.mono, fontSize: 10,
  outline: 'none', borderRadius: VD.radius.sm,
};

const selectStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  background: VD.bg, border: `1px solid ${VD.border}`,
  padding: '8px 12px', color: VD.text,
  fontFamily: VD.mono, fontSize: 11, outline: 'none', borderRadius: VD.radius.sm, cursor: 'pointer',
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <DotLabel size={9} color={VD.textMuted} spacing={2} style={{ display: 'block', marginBottom: 8 }}>{label}</DotLabel>
      {children}
    </div>
  );
}

function Btn({ onClick, children, style }: { onClick: () => void; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <button onClick={onClick} style={{ padding: '8px 12px', border: `1px solid ${VD.border}`, background: VD.elevated, fontFamily: VD.mono, fontSize: 10, color: VD.textDim, cursor: 'pointer', borderRadius: VD.radius.sm, whiteSpace: 'nowrap', letterSpacing: 0.5, ...style }}>
      {children}
    </button>
  );
}

// Compact select for picking an LHM sensor by id. Groups by hardware so the
// dropdown stays scannable with 100+ sensors. Shows current value next to the
// name so the user can pick by what's actively reading.
function SensorPicker({
  sensors, value, onChange, accent: _accent, allowEmpty,
}: {
  sensors: import('../types').Sensor[];
  value: string;
  onChange: (id: string) => void;
  accent: string;
  allowEmpty?: boolean;
}) {
  const groups: Record<string, import('../types').Sensor[]> = {};
  for (const s of sensors) {
    const key = s.hardware || '—';
    (groups[key] ||= []).push(s);
  }
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={selectStyle}
    >
      {allowEmpty !== false && <option value="">— Selecciona un sensor —</option>}
      {sensors.length === 0 && (
        <option value="" disabled>(sin sensores: habilita LHM y conecta en TitleBar)</option>
      )}
      {Object.entries(groups).map(([hw, list]) => (
        <optgroup key={hw} label={hw}>
          {list.map((s) => (
            <option key={s.id} value={s.id}>
              [{s.kind.slice(0, 4)}] {s.name} — {Number.isFinite(s.value) ? s.value.toFixed(s.kind === 'Voltage' ? 2 : 0) : '—'} {s.unit}
            </option>
          ))}
        </optgroup>
      ))}
      {/* Fallback: keep a saved id selectable even if LHM hasn't returned data yet */}
      {value && !sensors.some((s) => s.id === value) && (
        <option value={value}>(saved) {value}</option>
      )}
    </select>
  );
}
