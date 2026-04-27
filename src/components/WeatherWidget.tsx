import React, { useEffect, useRef, useState } from 'react';
import { VD } from '../design';

interface WeatherData {
  temp: number;
  code: number;
  city: string;
  country: string;
}

// WMO weather interpretation codes → [emoji, short label]
const WX_CODES: Record<number, [string, string]> = {
  0:  ['☀', 'Despejado'],
  1:  ['🌤', 'Mayorm. desp.'],
  2:  ['⛅', 'Parcial. nub.'],
  3:  ['☁', 'Cubierto'],
  45: ['🌫', 'Niebla'],
  48: ['🌫', 'Niebla c/escar.'],
  51: ['🌦', 'Llovizna leve'],
  53: ['🌦', 'Llovizna mod.'],
  55: ['🌧', 'Llovizna fuerte'],
  61: ['🌧', 'Lluvia leve'],
  63: ['🌧', 'Lluvia moderada'],
  65: ['🌧', 'Lluvia fuerte'],
  71: ['❄', 'Nieve leve'],
  73: ['❄', 'Nieve moderada'],
  75: ['❄', 'Nieve fuerte'],
  77: ['❄', 'Granizo fino'],
  80: ['🌦', 'Chubascos lev.'],
  81: ['🌧', 'Chubascos mod.'],
  82: ['🌧', 'Chubascos fuer.'],
  85: ['❄', 'Nieve chubascos'],
  95: ['⛈', 'Tormenta'],
  96: ['⛈', 'Tormenta/granizo'],
  99: ['⛈', 'Tormenta fuerte'],
};

export function wxInfo(code: number): [string, string] {
  // Round down to nearest known code bucket
  const found = WX_CODES[code];
  if (found) return found;
  // Fallback: try floor to decade
  const decade = Math.floor(code / 10) * 10;
  return WX_CODES[decade] ?? ['🌡', 'Desconocido'];
}

export function WeatherWidget() {
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

  const [emoji, desc] = weather ? wxInfo(weather.code) : ['🌡', ''];

  return (
    <div
      title={weather ? `${weather.city}, ${weather.country} — ${desc}` : 'Cargando clima...'}
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
          <div style={{ fontFamily: VD.mono, fontSize: 9, color: VD.textMuted }}>Cargando clima...</div>
        ) : error ? (
          <div style={{ fontFamily: VD.mono, fontSize: 9, color: VD.textMuted }}>Sin datos de clima</div>
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
