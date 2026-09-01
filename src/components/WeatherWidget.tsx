import React, { useEffect, useRef, useState } from 'react';
import { useTheme } from '../utils/theme';
import { useT } from '../utils/i18n';

interface WeatherData {
  temp: number;
  code: number;
  city: string;
  country: string;
}

/**
 * Codigos WMO -> emoji. El **texto** de cada condicion ya no vive aqui: es una
 * clave de diccionario (`wx.<codigo>`), porque las veintitres estaban escritas
 * en espanol dentro del componente y con la aplicacion en ingles el tooltip
 * decia «Parcial. nub.». La comprobacion de i18n no las veia: son palabras
 * sueltas, sin acentos, dentro de un mapa de objeto.
 */
const WX_EMOJI: Record<number, string> = {
  0: '☀', 1: '🌤', 2: '⛅', 3: '☁',
  45: '🌫', 48: '🌫',
  51: '🌦', 53: '🌦', 55: '🌧',
  61: '🌧', 63: '🌧', 65: '🌧',
  71: '❄', 73: '❄', 75: '❄', 77: '❄',
  80: '🌦', 81: '🌧', 82: '🌧', 85: '❄',
  95: '⛈', 96: '⛈', 99: '⛈',
};

/** El codigo exacto, o el de su decena; si tampoco, ninguno. */
function codigoConocido(code: number): number | null {
  if (WX_EMOJI[code] !== undefined) return code;
  const decena = Math.floor(code / 10) * 10;
  return WX_EMOJI[decena] !== undefined ? decena : null;
}

export function wxEmoji(code: number): string {
  const c = codigoConocido(code);
  return c === null ? '🌡' : WX_EMOJI[c];
}

/** Clave de diccionario con el nombre de la condicion. */
export function wxClave(code: number): string {
  const c = codigoConocido(code);
  return c === null ? 'wx.unknown' : `wx.${c}`;
}

export function WeatherWidget() {
  // La paleta viene del contexto, no de la importacion: importarla fijaba
  // el tema oscuro y el modo claro no llegaba a esta pantalla.
  const VD = useTheme();
  const t = useT();
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const timerRef = useRef<number>();

  // Geo + clima viven en el proceso main para evitar CORS y centralizar cache (15 min).
  // Acá solo pedimos vía IPC; force=true rompe el cache si el usuario aprieta ↺.
  async function fetchWeather(force = false) {
    const api = window.electronAPI;
    try {
      const data = api ? await api.weather.get(force) : null;
      if (data) { setWeather(data); setError(false); }
      else { setError(true); }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchWeather();
    // Refresh cada 15 min — coincide con el TTL del cache del main process.
    timerRef.current = window.setInterval(() => fetchWeather(false), 15 * 60 * 1000);
    return () => window.clearInterval(timerRef.current);
  }, []);

  const emoji = weather ? wxEmoji(weather.code) : '🌡';
  const desc = weather ? t(wxClave(weather.code)) : '';

  return (
    <div
      title={weather ? `${weather.city}, ${weather.country} — ${desc}` : t('weather.loading')}
      style={{
        background: VD.elevated, border: `1px solid ${VD.border}`,
        borderRadius: VD.radius.md, padding: '8px 10px',
        display: 'flex', alignItems: 'center', gap: 8,
        cursor: 'default',
      }}
    >
      <span style={{ fontSize: 18, lineHeight: 1, flexShrink: 0 }}>{loading ? '⋯' : error ? '—' : emoji}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        {loading ? (
          <div style={{ fontFamily: VD.mono, fontSize: 9, color: VD.textMuted }}>{t('weather.loading')}</div>
        ) : error ? (
          <div style={{ fontFamily: VD.mono, fontSize: 9, color: VD.textMuted }}>{t('weather.none')}</div>
        ) : weather ? (
          <>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
              <span style={{ fontFamily: VD.mono, fontSize: 16, color: VD.text, lineHeight: 1 }}>
                {weather.temp}°
              </span>
              <span style={{ fontFamily: VD.mono, fontSize: 8, color: VD.textDim, letterSpacing: 0.5 }}>C</span>
            </div>
            <div style={{ fontFamily: VD.mono, fontSize: 8, color: VD.textMuted, marginTop: 1, letterSpacing: 0.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {weather.city}
            </div>
          </>
        ) : null}
      </div>
      {!loading && !error && weather && (
        <div
          onClick={() => fetchWeather(true)}
          title="Actualizar"
          style={{ fontSize: 10, color: VD.textMuted, cursor: 'pointer', flexShrink: 0, lineHeight: 1, padding: 2 }}
        >
          ↺
        </div>
      )}
    </div>
  );
}
