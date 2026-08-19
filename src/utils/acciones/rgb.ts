import { OK, fail, type Manejador } from './base';

/** Iluminación vía OpenRGB. `-1` como id significa "todos los dispositivos". */
export const RGB: Record<string, Manejador> = {
  'rgb-color': async ({ action, api, t }) => {
    if (!action.rgbColor) return fail(t('act.err.noRgbColor'));
    const id = action.rgbDeviceId ?? -1;
    // `true` = duradero. Un botón de color quiere decir "deja las luces así",
    // no "así mientras VirtualDeck esté abierto": ver `setDeviceColor` en
    // electron/main/rgb.ts.
    const ok = await api.rgb.setDeviceColor(id, action.rgbColor, true);
    return ok ? OK : fail(t('act.err.rgbColor'));
  },

  'rgb-mode': async ({ action, api, t }) => {
    if (!action.rgbMode) return fail(t('act.err.noRgbMode'));
    const id = action.rgbDeviceId ?? -1;
    const ok = await api.rgb.setMode(id, action.rgbMode, action.rgbColor, action.rgbBrightness);
    return ok ? OK : fail(t('act.err.rgbMode', { modo: action.rgbMode ?? '' }));
  },

  'rgb-profile': async ({ action, api, rgbProfiles, t }) => {
    if (!action.rgbProfileName) return fail(t('act.err.noRgbProfile'));
    const prof = rgbProfiles?.find((p) => p.name === action.rgbProfileName);
    if (!prof) return fail(t('act.err.rgbProfileMissing', { name: action.rgbProfileName ?? '' }));
    const ok = await api.rgb.applyProfile(prof);
    return ok ? OK : fail(t('act.err.rgbProfile'));
  },

  'rgb-preset': async ({ action, api, t }) => {
    if (!action.rgbPresetId) return fail(t('act.err.noRgbPreset'));
    const ok = await api.rgb.smartPreset(action.rgbPresetId);
    return ok ? OK : fail(t('act.err.rgbPreset', { id: action.rgbPresetId ?? '' }));
  },
};
