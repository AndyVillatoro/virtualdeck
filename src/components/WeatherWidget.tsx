import React, { useEffect, useRef, useState } from 'react';
import { useTheme } from '../utils/theme';
import { useT } from '../utils/i18n';
import { DotGlyphIcon } from './dot480/DotGlyphIcon';

interface WeatherData {
  temp: number;
  code: number;
  city: string;
  country: string;
}

const WX_GLYPH: Record<number, string> = {
  0: 'WEATHER_SUN', 1: 'WEATHER_SUN_CLOUD', 2: 'WEATHER_SUN_CLOUD', 3: 'WEATHER_CLOUD',
  45: 'WEATHER_FOG', 48: 'WEATHER_FOG',
  51: 'WEATHER_RAIN', 53: 'WEATHER_RAIN', 55: 'WEATHER_RAIN',
  61: 'WEATHER_RAIN', 63: 'WEATHER_RAIN', 65: 'WEATHER_RAIN',
  71: 'WEATHER_SNOW', 73: 'WEATHER_SNOW', 75: 'WEATHER_SNOW', 77: 'WEATHER_SNOW',
  80: 'WEATHER_RAIN', 81: 'WEATHER_RAIN', 82: 'WEATHER_RAIN', 85: 'WEATHER_SNOW',
  95: 'WEATHER_THUNDER', 96: 'WEATHER_THUNDER', 99: 'WEATHER_THUNDER',
};

/** El codigo exacto, o el de su decena; si tampoco, ninguno. */
function codigoConocido(code: number): number | null {
  if (WX_GLYPH[code] !== undefined) return code;
  const decena = Math.floor(code / 10) * 10;
  return WX_GLYPH[decena] !== undefined ? decena : null;
}

export function wxDotGlyph(code: number): string {
  const c = codigoConocido(code);
  return c === null ? 'WEATHER_THERMO' : (WX_GLYPH[c] ?? 'WEATHER_SUN');
}

export function wxEmoji(code: number): string {
  return wxDotGlyph(code);
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
      <div style={{ width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {loading ? (
          <DotGlyphIcon glyph="DOTS" size={14} color={VD.textMuted} />
        ) : error ? (
          <DotGlyphIcon glyph="MINIMIZE" size={12} color={VD.textMuted} />
        ) : (
          <DotGlyphIcon glyph={wxDotGlyph(weather.code)} size={18} color={VD.accent} showRecessed />
        )}
      </div>
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
          style={{ cursor: 'pointer', flexShrink: 0, padding: 2, display: 'flex', alignItems: 'center' }}
        >
          <DotGlyphIcon glyph="DOTS" size={9} color={VD.textMuted} />
        </div>
      )}
    </div>
  );
}
