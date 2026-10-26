// Open-Meteo hourly forecast (free, no key). Cached 30 min per ~3 mi grid cell.
export interface HourWeather { time: number; tempF: number; rainPct: number; code: number }
export interface Forecast { hours: HourWeather[]; fetchedAt: number }

const TTL = 30 * 60 * 1000;
const mem = new Map<string, Promise<Forecast | null>>();
const cellKey = (lat: number, lng: number) => `${(Math.round(lat * 20) / 20).toFixed(2)},${(Math.round(lng * 20) / 20).toFixed(2)}`;

export function getForecast(lat: number, lng: number): Promise<Forecast | null> {
  const key = cellKey(lat, lng);
  const storeKey = `wx:${key}`;
  try {
    const cached = JSON.parse(localStorage.getItem(storeKey) ?? 'null') as Forecast | null;
    if (cached && Date.now() - cached.fetchedAt < TTL) return Promise.resolve(cached);
  } catch { /* storage unavailable */ }
  const hit = mem.get(key);
  if (hit) return hit;
  const [la, ln] = key.split(',');
  const p = fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${la}&longitude=${ln}&hourly=temperature_2m,precipitation_probability,weather_code&temperature_unit=fahrenheit&timezone=America%2FNew_York&forecast_days=14&timeformat=unixtime`,
  )
    .then((r) => (r.ok ? r.json() : Promise.reject()))
    .then((d) => {
      const h = d.hourly;
      const f: Forecast = {
        fetchedAt: Date.now(),
        hours: h.time.map((t: number, i: number) => ({ time: t * 1000, tempF: Math.round(h.temperature_2m[i]), rainPct: h.precipitation_probability[i] ?? 0, code: h.weather_code[i] })),
      };
      try { localStorage.setItem(storeKey, JSON.stringify(f)); } catch { /* quota */ }
      return f;
    })
    .catch(() => null); // fail silently; UI hides weather
  mem.set(key, p);
  setTimeout(() => mem.delete(key), TTL);
  return p;
}

export function hourAt(f: Forecast | null | undefined, time: number): HourWeather | undefined {
  if (!f?.hours.length) return undefined;
  if (time < f.hours[0].time - 3600e3 || time > f.hours[f.hours.length - 1].time + 3600e3) return undefined;
  let best = f.hours[0];
  for (const h of f.hours) if (Math.abs(h.time - time) < Math.abs(best.time - time)) best = h;
  return best;
}

export type Condition = 'clear' | 'cloudy' | 'fog' | 'rain' | 'snow' | 'storm';
export function condition(code: number): Condition {
  if (code >= 95) return 'storm';
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow';
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return 'rain';
  if (code === 45 || code === 48) return 'fog';
  if (code >= 2) return 'cloudy';
  return 'clear';
}
export const CONDITION_LABEL: Record<Condition, string> = { clear: 'Sunny', cloudy: 'Cloudy', fog: 'Foggy', rain: 'Rain', snow: 'Snow', storm: 'Storms' };

/** Warning for outdoor events, or null when conditions are fine. */
export function weatherWarning(h?: HourWeather): string | null {
  if (!h) return null;
  if (condition(h.code) === 'storm') return 'Thunderstorms forecast';
  if (h.rainPct >= 60) return `${h.rainPct}% chance of rain`;
  if (h.tempF >= 90) return `Extreme heat · ${h.tempF}°F`;
  if (h.tempF <= 32) return `Freezing · ${h.tempF}°F`;
  return null;
}
