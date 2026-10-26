import { useEffect, useRef, useState } from 'react';
import { APIProvider, useMapsLibrary } from '@vis.gl/react-google-maps';
import { Search } from 'lucide-react';
import { mapsKey } from '@/lib/env';
import { inNYC } from '@/lib/utils';

export interface PickedPlace { id: string; name: string; lat: number; lng: number }

// Public place types only; no street addresses.
const TYPES = ['park', 'library', 'tourist_attraction', 'playground', 'hiking_area', 'beach', 'athletic_field', 'sports_complex', 'stadium', 'community_center', 'museum', 'plaza', 'marina', 'historical_landmark', 'dog_park', 'botanical_garden', 'cultural_center', 'tennis_court', 'skateboard_park', 'cycling_park'];
const NYC = { north: 40.92, south: 40.49, east: -73.68, west: -74.27 };

function Inner({ onPick }: { onPick: (p: PickedPlace) => void }) {
  const lib = useMapsLibrary('places');
  const [q, setQ] = useState('');
  const [items, setItems] = useState<google.maps.places.AutocompleteSuggestion[]>([]);
  const token = useRef<google.maps.places.AutocompleteSessionToken | null>(null);

  useEffect(() => {
    if (!lib || q.trim().length < 3) { setItems([]); return; }
    token.current ??= new lib.AutocompleteSessionToken();
    const t = setTimeout(() => {
      lib.AutocompleteSuggestion.fetchAutocompleteSuggestions({ input: q, includedPrimaryTypes: TYPES.slice(0, 5), locationRestriction: NYC, sessionToken: token.current! })
        .then(async (r) => {
          // API caps includedPrimaryTypes at 5; run a second pass for the rest and merge.
          const more = await lib.AutocompleteSuggestion.fetchAutocompleteSuggestions({ input: q, includedPrimaryTypes: TYPES.slice(5, 10), locationRestriction: NYC, sessionToken: token.current! }).catch(() => ({ suggestions: [] }));
          setItems([...r.suggestions, ...more.suggestions].filter((s) => s.placePrediction).slice(0, 6));
        })
        .catch(() => setItems([]));
    }, 250);
    return () => clearTimeout(t);
  }, [lib, q]);

  const pick = async (s: google.maps.places.AutocompleteSuggestion) => {
    const place = s.placePrediction!.toPlace();
    await place.fetchFields({ fields: ['displayName', 'location'] });
    token.current = null;
    const loc = place.location;
    if (!loc || !inNYC(loc.lat(), loc.lng())) return;
    onPick({ id: `g-${place.id}`, name: place.displayName ?? s.placePrediction!.mainText?.text ?? 'Place', lat: loc.lat(), lng: loc.lng() });
    setQ('');
    setItems([]);
  };

  return (
    <div className="relative">
      <Search size={18} className="absolute left-3.5 top-3.5 text-muted" />
      <input className="field pl-10" placeholder="Google: park, library, landmark…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search Google places" />
      {items.length > 0 && (
        <ul className="absolute inset-x-0 top-14 z-20 overflow-hidden rounded-xl border border-line bg-card shadow-xl">
          {items.map((s) => (
            <li key={s.placePrediction!.placeId}>
              <button type="button" onClick={() => pick(s)} className="flex min-h-[48px] w-full flex-col justify-center px-3 py-2 text-left hover:bg-elev">
                <span className="font-medium">{s.placePrediction!.mainText?.text}</span>
                <span className="truncate text-xs text-muted">{s.placePrediction!.secondaryText?.text}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function PlacesAutocomplete({ onPick }: { onPick: (p: PickedPlace) => void }) {
  return (
    <APIProvider apiKey={mapsKey}>
      <Inner onPick={onPick} />
    </APIProvider>
  );
}
