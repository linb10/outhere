import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { distanceBetween } from 'geofire-common';
import { format, isToday, isTomorrow, formatDistanceToNowStrict } from 'date-fns';

export const cn = (...v: ClassValue[]) => twMerge(clsx(v));

export const QUEENS_CENTER = { lat: 40.73, lng: -73.83 };

export const BOROUGH_CENTERS: Record<string, { lat: number; lng: number }> = {
  Queens: QUEENS_CENTER,
  Brooklyn: { lat: 40.65, lng: -73.95 },
  Manhattan: { lat: 40.78, lng: -73.97 },
  Bronx: { lat: 40.85, lng: -73.88 },
  'Staten Island': { lat: 40.58, lng: -74.15 },
};

/** Miles between two points. */
export function miles(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  return distanceBetween([a.lat, a.lng], [b.lat, b.lng]) * 0.621371;
}

export const fmtMiles = (m: number) => (m < 0.1 ? '<0.1 mi' : `${m < 10 ? m.toFixed(1) : Math.round(m)} mi`);

// Coarse NYC bounding check; good enough to reject locations far outside the 5 boroughs.
export const inNYC = (lat: number, lng: number) => lat > 40.49 && lat < 40.92 && lng > -74.27 && lng < -73.68;

export function fmtWhen(start: number) {
  const d = new Date(start);
  const day = isToday(d) ? 'Today' : isTomorrow(d) ? 'Tomorrow' : format(d, 'EEE, MMM d');
  return `${day} · ${format(d, 'h:mm a')}`;
}
export const fmtRange = (s: number, e: number) => `${format(s, 'EEE, MMM d · h:mm a')} – ${format(e, 'h:mm a')}`;
export const ago = (t: number) => (Date.now() - t < 60e3 ? 'just now' : formatDistanceToNowStrict(t, { addSuffix: true }));

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

export const isMinor = (birthYear: number) => new Date().getFullYear() - birthYear < 18;
export const ageOf = (birthYear: number) => new Date().getFullYear() - birthYear;

export function downloadFile(name: string, content: string, type = 'text/csv') {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const directionsUrl = (lat: number, lng: number) => `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
