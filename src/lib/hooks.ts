import { useCallback, useEffect, useState } from 'react';
import { getForecast, type Forecast } from './weather';

export function useAsync<T>(fn: () => Promise<T>, deps: unknown[]) {
  const [state, setState] = useState<{ data?: T; error?: unknown; loading: boolean }>({ loading: true });
  const [n, setN] = useState(0);
  useEffect(() => {
    let alive = true;
    setState((s) => ({ ...s, loading: true, error: undefined }));
    fn().then(
      (data) => alive && setState({ data, loading: false }),
      (error) => alive && setState({ error, loading: false }),
    );
    return () => { alive = false; };
  }, [...deps, n]); // eslint-disable-line react-hooks/exhaustive-deps
  const reload = useCallback(() => setN((x) => x + 1), []);
  return { ...state, reload };
}

export function useForecast(lat?: number, lng?: number) {
  const [f, setF] = useState<Forecast | null>(null);
  useEffect(() => {
    if (lat == null || lng == null) return;
    let alive = true;
    getForecast(lat, lng).then((x) => alive && setF(x));
    return () => { alive = false; };
  }, [lat, lng]);
  return f;
}

/** Forecasts for many points, deduped by grid cell inside getForecast. */
export function useForecasts(points: { lat: number; lng: number }[]) {
  const key = points.map((p) => `${p.lat.toFixed(2)},${p.lng.toFixed(2)}`).sort().filter((v, i, a) => a.indexOf(v) === i).join('|');
  const [map, setMap] = useState<Record<string, Forecast | null>>({});
  useEffect(() => {
    let alive = true;
    const pts = key ? key.split('|').map((s) => s.split(',').map(Number)) : [];
    Promise.all(pts.map(([la, ln]) => getForecast(la, ln).then((f) => [`${la.toFixed(2)},${ln.toFixed(2)}`, f] as const))).then((r) => {
      if (alive) setMap(Object.fromEntries(r));
    });
    return () => { alive = false; };
  }, [key]);
  return (lat: number, lng: number) => map[`${lat.toFixed(2)},${lng.toFixed(2)}`] ?? null;
}

export function useMediaQuery(q: string) {
  const [m, setM] = useState(() => typeof window !== 'undefined' && window.matchMedia(q).matches);
  useEffect(() => {
    const mq = window.matchMedia(q);
    const on = () => setM(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [q]);
  return m;
}
