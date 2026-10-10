import React, { useEffect, useRef, useState } from 'react';
import { useTheme } from '../utils/theme';
import { useT } from '../utils/i18n';
import { DotGlyphIcon } from './dot480/DotGlyphIcon';
// La tabla de códigos y el glifo viven en `src/comun/widgets` porque el mando
// móvil pinta el mismo icono; aquí solo se añade la clave de diccionario.
import { codigoConocido, wxDotGlyph } from '../comun/widgets';

interface WeatherData {
  temp: number;
  code: number;
  city: string;
  country: string;
}

/** Clave de diccionario con el nombre de la condicion. */
function wxClave(code: number): string {
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
        borderRadius: VD.radius.md, padding: '4px 8px',
        display: 'flex', alignItems: 'center', gap: 6,
        cursor: 'default', minHeight: 26, boxSizing: 'border-box',
      }}
    >
      <div style={{ width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {loading ? (
          <DotGlyphIcon glyph="DOTS" size={10} color={VD.textMuted} />
        ) : error ? (
          <DotGlyphIcon glyph="MINIMIZE" size={10} color={VD.textMuted} />
        ) : (
          <DotGlyphIcon glyph={wxDotGlyph(weather.code)} size={14} color={VD.accent} showRecessed />
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'baseline', gap: 4, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ fontFamily: VD.mono, fontSize: 8, color: VD.textMuted }}>{t('weather.loading')}</div>
        ) : error ? (
          <div style={{ fontFamily: VD.mono, fontSize: 8, color: VD.textMuted }}>{t('weather.none')}</div>
        ) : weather ? (
          <>
            <span style={{ fontFamily: VD.mono, fontSize: 13, color: VD.text, lineHeight: 1, fontWeight: 600 }}>
              {weather.temp}°
            </span>
            <span style={{ fontFamily: VD.mono, fontSize: 8, color: VD.textDim, letterSpacing: 0.5 }}>C</span>
            <span style={{ fontFamily: VD.mono, fontSize: 8, color: VD.textMuted, letterSpacing: 0.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginLeft: 2 }}>
              {weather.city}
            </span>
          </>
        ) : null}
      </div>
      {!loading && !error && weather && (
        <div
          onClick={() => fetchWeather(true)}
          title="Actualizar"
          style={{ cursor: 'pointer', flexShrink: 0, padding: 2, display: 'flex', alignItems: 'center' }}
        >
          <DotGlyphIcon glyph="DOTS" size={8} color={VD.textMuted} />
        </div>
      )}
    </div>
  );
}
