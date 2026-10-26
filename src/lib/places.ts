import { useEffect, useState } from 'react';
import type { Place } from '@/types';

// places.json is ~1 MB raw (~170 KB gzip); load it as its own chunk, once.
let cache: Promise<{ list: Place[]; byId: Map<string, Place> }> | null = null;
export function loadPlaces() {
  cache ??= import('@/data/places.json').then((m) => {
    const list = m.default as Place[];
    return { list, byId: new Map(list.map((p) => [p.id, p])) };
  });
  return cache;
}

export function usePlaces() {
  const [d, setD] = useState<{ list: Place[]; byId: Map<string, Place> } | null>(null);
  useEffect(() => { loadPlaces().then(setD); }, []);
  return d;
}
