import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { DataService } from '@/services/DataService';
import { loadDataService } from '@/services';
import type { Favorite, Prefs, Rsvp, UserProfile } from '@/types';
import { BOROUGH_CENTERS, ageOf } from '@/lib/utils';

type Theme = 'light' | 'dark';
interface Toast { id: number; text: string; tone?: 'error' | 'ok' }

interface AppState {
  ds: DataService;
  user: UserProfile | null;
  needsProfile: boolean;
  authReady: boolean;
  prefs: Prefs;
  setGuestPrefs: (p: Prefs) => void;
  userAge: number | null;
  origin: { lat: number; lng: number };
  located: boolean;
  locate: () => Promise<{ lat: number; lng: number } | null>;
  favorites: Favorite[];
  isFav: (type: Favorite['type'], id: string) => boolean;
  toggleFav: (type: Favorite['type'], id: string) => Promise<void>;
  rsvps: Rsvp[];
  refreshRsvps: () => Promise<void>;
  theme: Theme;
  toggleTheme: () => void;
  toast: (text: string, tone?: Toast['tone']) => void;
  toasts: Toast[];
  requireAuth: () => boolean;
  authPrompt: boolean;
  setAuthPrompt: (v: boolean) => void;
}

const Ctx = createContext<AppState | null>(null);
export const useApp = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error('useApp outside provider');
  return c;
};

const DEFAULT_PREFS: Prefs = { borough: 'Queens', maxDistance: 5, interests: [], times: [], accessibility: [] };
const readLS = <T,>(k: string, d: T): T => {
  try { return JSON.parse(localStorage.getItem(k) ?? 'null') ?? d; } catch { return d; }
};

export function AppProvider({ children, fallback }: { children: ReactNode; fallback: ReactNode }) {
  const [ds, setDs] = useState<DataService | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [needsProfile, setNeedsProfile] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [guestPrefs, setGuestPrefsState] = useState<Prefs>(() => readLS('guestPrefs', DEFAULT_PREFS));
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(() => readLS('lastPos', null));
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [rsvps, setRsvps] = useState<Rsvp[]>([]);
  const [theme, setTheme] = useState<Theme>(() => (document.documentElement.classList.contains('dark') ? 'dark' : 'light'));
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [authPrompt, setAuthPrompt] = useState(false);

  useEffect(() => { loadDataService().then(setDs); }, []);

  useEffect(() => {
    if (!ds) return;
    return ds.onAuth((u, np) => {
      setUser(u);
      setNeedsProfile(np);
      setAuthReady(true);
    });
  }, [ds]);

  useEffect(() => {
    if (!ds) return;
    if (!user) { setFavorites([]); setRsvps([]); return; }
    ds.listFavorites().then(setFavorites).catch(() => {});
    ds.myRsvps().then(setRsvps).catch(() => {});
  }, [ds, user?.uid]); // eslint-disable-line react-hooks/exhaustive-deps

  // Follow system theme until the user picks one.
  useEffect(() => {
    const mq = matchMedia('(prefers-color-scheme: dark)');
    const on = () => { if (!localStorage.getItem('theme')) setTheme(mq.matches ? 'dark' : 'light'); };
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#202124' : '#FFFFFF');
  }, [theme]);
  const toggleTheme = useCallback(() => {
    setTheme((t) => {
      const n = t === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem('theme', n); } catch { /* ignore */ }
      return n;
    });
  }, []);

  const toast = useCallback((text: string, tone?: Toast['tone']) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, text, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);

  const prefs = user?.prefs ?? guestPrefs;
  const setGuestPrefs = (p: Prefs) => {
    setGuestPrefsState(p);
    try { localStorage.setItem('guestPrefs', JSON.stringify(p)); } catch { /* ignore */ }
  };

  const locate = useCallback(
    () =>
      new Promise<{ lat: number; lng: number } | null>((resolve) => {
        if (!navigator.geolocation) return resolve(null);
        navigator.geolocation.getCurrentPosition(
          (p) => {
            const v = { lat: p.coords.latitude, lng: p.coords.longitude };
            setPos(v);
            try { localStorage.setItem('lastPos', JSON.stringify(v)); } catch { /* ignore */ }
            resolve(v);
          },
          () => resolve(null),
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
        );
      }),
    [],
  );

  const value = useMemo<AppState | null>(() => {
    if (!ds) return null;
    // Only use device location if it's inside NYC-ish; otherwise the borough center.
    const nyc = pos && pos.lat > 40.4 && pos.lat < 41 && pos.lng > -74.4 && pos.lng < -73.6;
    return {
      ds, user, needsProfile, authReady, prefs, setGuestPrefs,
      userAge: user ? ageOf(user.birthYear) : null,
      origin: nyc ? pos! : BOROUGH_CENTERS[prefs.borough] ?? BOROUGH_CENTERS.Queens,
      located: Boolean(nyc),
      locate,
      favorites,
      isFav: (type, id) => favorites.some((f) => f.type === type && f.refId === id),
      toggleFav: async (type, id) => {
        if (!user) { setAuthPrompt(true); return; }
        const added = await ds.toggleFavorite(type, id);
        setFavorites(await ds.listFavorites());
        toast(added ? 'Saved' : 'Removed');
      },
      rsvps,
      refreshRsvps: async () => setRsvps(await ds.myRsvps()),
      theme, toggleTheme, toast, toasts,
      requireAuth: () => {
        if (user) return true;
        setAuthPrompt(true);
        return false;
      },
      authPrompt, setAuthPrompt,
    };
  }, [ds, user, needsProfile, authReady, prefs, pos, favorites, rsvps, theme, toasts, authPrompt, locate, toast, toggleTheme]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!value || !authReady) return <>{fallback}</>;
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
