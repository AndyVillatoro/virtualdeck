// Geo + clima desde el proceso main para evitar CORS y centralizar cache.
// El renderer no tiene CORS-relax para servicios públicos (ipapi.co, etc),
// así que hacemos las llamadas acá y le pasamos el resultado por IPC.

export interface WeatherData {
  temp: number;
  code: number;
  city: string;
  country: string;
}

interface GeoResult {
  latitude: number;
  longitude: number;
  city: string;
  country: string;
}

const CACHE_TTL_MS = 15 * 60 * 1000; // 15 min — suficiente para no quemar quota
const FAILURE_BACKOFF_MS = 10 * 60 * 1000; // si falla, esperamos 10 min antes de reintentar

let cache: { data: WeatherData; ts: number } | null = null;
let lastFailureAt = 0;
let inflight: Promise<WeatherData | null> | null = null;
let lastGeo: { data: GeoResult; ts: number } | null = null;

const TIMEOUT_GEO_MS = 5000;
const TIMEOUT_WX_MS = 8000;

function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  return fetch(url, {
    signal: ctrl.signal,
    headers: { 'User-Agent': 'VirtualDeck/0.2 (+local)' },
  }).finally(() => clearTimeout(t));
}

// Probamos varios proveedores de geo-IP. Cualquiera que responda gana.
// ipapi.co tiene 30k/mes pero rate-limit por minuto bajo; ip-api.com permite
// 45 req/min sin key; ipwho.is sin key. Si todos fallan, el clima queda mudo.
const GEO_PROVIDERS: Array<(r: any) => GeoResult | null> = [
  (r) => r && typeof r.latitude === 'number' && typeof r.longitude === 'number'
    ? { latitude: r.latitude, longitude: r.longitude, city: r.city ?? '', country: r.country_name ?? r.country ?? '' }
    : null,
  // ip-api.com usa "lat", "lon", "city", "country"
  (r) => r && typeof r.lat === 'number' && typeof r.lon === 'number'
    ? { latitude: r.lat, longitude: r.lon, city: r.city ?? '', country: r.country ?? '' }
    : null,
  // ipwho.is usa "latitude", "longitude", "city", "country"
  (r) => r && r.success !== false && typeof r.latitude === 'number'
    ? { latitude: r.latitude, longitude: r.longitude, city: r.city ?? '', country: r.country ?? '' }
    : null,
];

const GEO_URLS = [
  'https://ipapi.co/json/',
  'http://ip-api.com/json/?fields=status,country,city,lat,lon',
  'https://ipwho.is/',
];

async function getGeo(): Promise<GeoResult | null> {
  if (lastGeo && Date.now() - lastGeo.ts < CACHE_TTL_MS) return lastGeo.data;
  for (let i = 0; i < GEO_URLS.length; i++) {
    try {
      const res = await fetchWithTimeout(GEO_URLS[i], TIMEOUT_GEO_MS);
      if (!res.ok) continue;
      const json = await res.json();
      for (const parse of GEO_PROVIDERS) {
        const g = parse(json);
        if (g) { lastGeo = { data: g, ts: Date.now() }; return g; }
      }
    } catch {}
  }
  return null;
}

async function fetchWeatherUncached(): Promise<WeatherData | null> {
  const geo = await getGeo();
  if (!geo) return null;
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${geo.latitude}&longitude=${geo.longitude}&current=temperature_2m,weather_code&timezone=auto`;
  try {
    const res = await fetchWithTimeout(url, TIMEOUT_WX_MS);
    if (!res.ok) return null;
    const wx = await res.json();
    if (!wx?.current) return null;
    return {
      temp: Math.round(wx.current.temperature_2m),
      code: wx.current.weather_code,
      city: geo.city,
      country: geo.country,
    };
  } catch {
    return null;
  }
}

export async function getWeather(force = false): Promise<WeatherData | null> {
  // Cache válido
  if (!force && cache && Date.now() - cache.ts < CACHE_TTL_MS) return cache.data;
  // Backoff tras fallo reciente — no reintentamos antes de 10 min, salvo `force`
  if (!force && lastFailureAt && Date.now() - lastFailureAt < FAILURE_BACKOFF_MS) {
    return cache?.data ?? null;
  }
  // Coalesce — solo una request en vuelo a la vez
  if (inflight) return inflight;
  inflight = fetchWeatherUncached().then((data) => {
    if (data) {
      cache = { data, ts: Date.now() };
      lastFailureAt = 0;
    } else {
      lastFailureAt = Date.now();
    }
    return data;
  }).finally(() => { inflight = null; });
  return inflight;
}
