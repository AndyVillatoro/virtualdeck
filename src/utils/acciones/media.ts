import { OK, fail, type Manejador } from './base';

/** Transporte del reproductor activo, vía SMTC con respaldo en SendKeys. */
export const MEDIA: Record<string, Manejador> = {
  'media-shuffle': async ({ api, t }) => {
    const ok = await api.media.shuffle();
    return ok ? OK : fail(t('act.err.shuffle'));
  },

  'media-repeat': async ({ api, t }) => {
    const ok = await api.media.repeat();
    return ok ? OK : fail(t('act.err.repeat'));
  },
};

const TRANSPORTE: Record<string, 'play-pause' | 'next' | 'prev'> = {
  'media-play-pause': 'play-pause',
  'media-next': 'next',
  'media-prev': 'prev',
};

for (const [tipo, cmd] of Object.entries(TRANSPORTE)) {
  MEDIA[tipo] = async ({ api, t }) => {
    const ok = await api.media.control(cmd);
    return ok ? OK : fail(t('act.err.media', { cmd }));
  };
}
