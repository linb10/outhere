import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { List, LocateFixed, MapIcon, Search, SlidersHorizontal, X } from 'lucide-react';
import type { AccessNeed, Activity, OutEvent, Place, PlaceCategory } from '@/types';
import { PLACE_CATS, PLACE_CAT_KEYS } from '@/lib/categories';
import { usePlaces } from '@/lib/places';
import { useApp } from '@/store/app';
import { hasMaps } from '@/lib/env';
import { cn, fmtMiles, miles } from '@/lib/utils';
import { Button, Chip, IconButton, Segmented, Sheet, Skeleton, Toggle } from '@/components/ui';
import { PlaceDetails, PlaceSheet } from '@/components/PlaceSheet';
import { useMediaQuery } from '@/lib/hooks';
import { ActivityBadge, levelOf } from '@/components/bits';

const MapView = lazy(() => import('@/components/map/MapView'));

interface Filters { cats: PlaceCategory[]; distance: number; access: AccessNeed[]; quiet: boolean }
const DEFAULT: Filters = { cats: [], distance: 0, access: [], quiet: false };
const QUICK: PlaceCategory[] = ['basketball', 'park', 'trail', 'tennis', 'field', 'playground', 'waterfront', 'landmark'];

export default function Explore() {
  const { origin, located, locate, theme, ds, toast } = useApp();
  const places = usePlaces();
  const [params, setParams] = useSearchParams();
  const [filters, setFilters] = useState<Filters>(DEFAULT);
  const [filterOpen, setFilterOpen] = useState(false);
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState<Place | null>(null);
  const [center, setCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [activity, setActivity] = useState<Record<string, Activity>>({});
  const [events, setEvents] = useState<OutEvent[]>([]);
  const [listView, setListView] = useState(!hasMaps);
  const desktop = useMediaQuery('(min-width: 768px)');
  const [me, setMe] = useState<{ lat: number; lng: number } | null>(located ? origin : null);

  const loadActivity = useCallback(() => ds.activity().then(setActivity).catch(() => {}), [ds]);
  useEffect(() => {
    loadActivity();
    const t = setInterval(loadActivity, 60_000);
    ds.listEvents().then(setEvents).catch(() => {});
    return () => clearInterval(t);
  }, [ds, loadActivity]);

  // Deep link: /explore?place=<id>
  useEffect(() => {
    const id = params.get('place');
    if (!id || !places) return;
    const p = places.byId.get(id);
    if (p) { setSelected(p); setCenter({ lat: p.lat, lng: p.lng }); }
  }, [params, places]);

  const filtered = useMemo(() => {
    if (!places) return [];
    return places.list.filter((p) => {
      if (filters.cats.length && !filters.cats.includes(p.category)) return false;
      if (filters.access.some((a) => !p.accessibility[a])) return false;
      if (filters.quiet && levelOf(activity[p.id]) !== 'Quiet') return false;
      if (filters.distance && miles(origin, p) > filters.distance) return false;
      return true;
    });
  }, [places, filters, activity, origin]);

  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (term.length < 2) return [];
    return filtered.filter((p) => p.name.toLowerCase().includes(term)).sort((a, b) => miles(origin, a) - miles(origin, b)).slice(0, 8);
  }, [q, filtered, origin]);

  const nearest = useMemo(() => (listView || desktop ? [...filtered].sort((a, b) => miles(origin, a) - miles(origin, b)).slice(0, 60) : []), [listView, desktop, filtered, origin]);

  const select = (p: Place) => {
    setSelected(p);
    setCenter({ lat: p.lat, lng: p.lng });
    setQ('');
    setParams({ place: p.id }, { replace: true });
  };
  const close = () => { setSelected(null); setParams({}, { replace: true }); };
  const toggleCat = (c: PlaceCategory) => setFilters((f) => ({ ...f, cats: f.cats.includes(c) ? f.cats.filter((x) => x !== c) : [...f.cats, c] }));
  const nFilters = filters.cats.length + filters.access.length + (filters.distance ? 1 : 0) + (filters.quiet ? 1 : 0);

  const onLocate = async () => {
    const p = await locate();
    if (!p) return toast('Location unavailable', 'error');
    setMe(p);
    setCenter({ ...p });
  };

  const filterSheet = (
    <>
      <Sheet open={filterOpen} onClose={() => setFilterOpen(false)} title="Filters">
        <p className="label mb-2">Category</p>
        <div className="mb-5 flex flex-wrap gap-2">
          {PLACE_CAT_KEYS.map((c) => <Chip key={c} active={filters.cats.includes(c)} icon={PLACE_CATS[c].icon} onClick={() => toggleCat(c)}>{PLACE_CATS[c].label}</Chip>)}
        </div>
        <p className="label mb-2">Distance</p>
        <div className="mb-5">
          <Segmented label="Distance" value={filters.distance} onChange={(d) => setFilters((f) => ({ ...f, distance: d }))}
            options={[{ value: 0, label: 'Any' }, { value: 0.5, label: '½ mi' }, { value: 1, label: '1 mi' }, { value: 3, label: '3 mi' }, { value: 5, label: '5 mi' }]} />
        </div>
        <p className="label mb-1">Accessibility</p>
        <div className="mb-3 divide-y divide-line">
          {(['wheelchair', 'restrooms', 'shade', 'seating'] as AccessNeed[]).map((a) => (
            <Toggle key={a} label={a[0].toUpperCase() + a.slice(1)} checked={filters.access.includes(a)}
              onChange={(v) => setFilters((f) => ({ ...f, access: v ? [...f.access, a] : f.access.filter((x) => x !== a) }))} />
          ))}
          <Toggle label="Quiet now" checked={filters.quiet} onChange={(v) => setFilters((f) => ({ ...f, quiet: v }))} />
        </div>
        <div className="grid grid-cols-2 gap-3 pt-2">
          <Button variant="outline" onClick={() => setFilters(DEFAULT)}>Clear</Button>
          <Button onClick={() => setFilterOpen(false)}>Show {filtered.length}</Button>
        </div>
      </Sheet>
    </>
  );

  const searchBox = (
    <div className="relative">
      <div className="flex h-12 items-center rounded-full bg-card shadow-float">
        <Search size={18} className="ml-4 shrink-0 text-muted" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search parks, courts, trails" aria-label="Search places"
          className="h-full min-w-0 flex-1 bg-transparent px-3 outline-none" />
        {q && <button onClick={() => setQ('')} aria-label="Clear search" className="flex h-10 w-10 items-center justify-center text-muted"><X size={18} /></button>}
        <span className="h-6 w-px bg-line" />
        <button onClick={() => setFilterOpen(true)} aria-label="Filters" className="relative mr-1 flex h-10 w-10 items-center justify-center rounded-full text-accent-ink hover:bg-elev">
          <SlidersHorizontal size={18} />
          {nFilters > 0 && <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-accent-fg">{nFilters}</span>}
        </button>
      </div>
      {results.length > 0 && (
        <ul className="absolute inset-x-0 top-14 z-20 overflow-hidden rounded-xl bg-card py-1 shadow-float">
          {results.map((p) => {
            const Icon = PLACE_CATS[p.category].icon;
            return (
              <li key={p.id}>
                <button onClick={() => select(p)} className="flex min-h-[48px] w-full items-center gap-3 px-4 py-2 text-left hover:bg-elev">
                  <Icon size={18} className="shrink-0 text-muted" />
                  <span className="min-w-0 flex-1 truncate">{p.name}</span>
                  <span className="text-xs text-muted">{fmtMiles(miles(origin, p))}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
  const chips = (
    <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
      <Chip active={filters.quiet} onClick={() => setFilters((f) => ({ ...f, quiet: !f.quiet }))} className="border-transparent shadow-float">Quiet now</Chip>
      {QUICK.map((c) => <Chip key={c} active={filters.cats.includes(c)} icon={PLACE_CATS[c].icon} onClick={() => toggleCat(c)} className="border-transparent shadow-float">{PLACE_CATS[c].label}</Chip>)}
    </div>
  );
  const resultList = !places ? (
    <div className="grid grid-cols-1 gap-2 p-4">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-16" />)}</div>
  ) : nearest.length ? (
    <ul className="divide-y divide-line">
      {nearest.map((p) => <PlaceRow key={p.id} p={p} a={activity[p.id]} d={miles(origin, p)} onClick={() => select(p)} />)}
    </ul>
  ) : (
    <p className="px-4 py-10 text-center text-sm">No places match. <button className="font-medium text-accent-ink" onClick={() => setFilters(DEFAULT)}>Clear filters</button></p>
  );
  const mapArea = hasMaps && (desktop || !listView) ? (
    <Suspense fallback={<Skeleton className="h-full w-full rounded-none" />}>
      <MapView className="h-full w-full" places={filtered} selectedId={selected?.id} onSelect={select} center={center} dark={theme === 'dark'} me={me} />
    </Suspense>
  ) : desktop ? (
    <div className="flex h-full items-center justify-center bg-elev" style={{ backgroundImage: 'linear-gradient(rgb(var(--line)) 1px, transparent 1px), linear-gradient(90deg, rgb(var(--line)) 1px, transparent 1px)', backgroundSize: '48px 48px' }}>
      <div className="flex items-center gap-2 rounded-full bg-card px-4 py-2.5 text-sm text-muted shadow-float"><MapIcon size={16} /> Add a Google Maps key to show the map</div>
    </div>
  ) : null;

  if (desktop) return (
    <div className="flex h-dvh overflow-hidden">
      <section className="relative z-10 flex w-[408px] shrink-0 flex-col border-r border-line bg-card" aria-label="Places">
        <div className="space-y-3 p-4 pb-2">{searchBox}{chips}</div>
        <div className="flex-1 overflow-y-auto">
          {selected ? (
            <div className="px-5 pb-8"><PlaceDetails inline place={selected} activity={activity[selected.id]} onClose={close} onCheckedIn={loadActivity} events={events} /></div>
          ) : (
            <>
              <p className="px-4 pb-1 pt-2 text-xs font-medium text-muted">{filtered.length.toLocaleString()} places · nearest first</p>
              {resultList}
            </>
          )}
        </div>
      </section>
      <div className="relative flex-1">
        {mapArea}
        <div className="absolute bottom-6 right-6 z-10"><IconButton label="Locate me" icon={LocateFixed} onClick={onLocate} className="h-12 w-12 border-transparent shadow-float" /></div>
      </div>
      {filterSheet}
    </div>
  );

  return (
    <div className="relative h-[calc(100dvh-4rem-env(safe-area-inset-bottom))] overflow-hidden">
      <div className="absolute inset-0">
        {mapArea ?? (
          <div className="h-full overflow-y-auto bg-bg pb-8 pt-[8.5rem]">
            {!hasMaps && <p className="mx-4 mb-2 flex items-center gap-2 text-xs text-muted"><MapIcon size={14} /> Map needs a Google Maps key. Showing list.</p>}
            {resultList}
          </div>
        )}
      </div>
      <div className="pt-safe pointer-events-none absolute inset-x-0 top-0 z-10">
        <div className="pointer-events-auto space-y-2 px-3 pt-3">{searchBox}{chips}</div>
      </div>
      <div className="absolute bottom-4 right-3 z-10 flex flex-col gap-2">
        {hasMaps && <IconButton label={listView ? 'Map view' : 'List view'} icon={listView ? MapIcon : List} onClick={() => setListView(!listView)} className="h-12 w-12 border-transparent shadow-float" />}
        <IconButton label="Locate me" icon={LocateFixed} onClick={onLocate} className="h-12 w-12 border-transparent shadow-float" />
      </div>
      <p className="sr-only" aria-live="polite">{filtered.length} places shown</p>
      {filterSheet}
      {selected && <PlaceSheet place={selected} activity={activity[selected.id]} onClose={close} onCheckedIn={loadActivity} events={events} />}
    </div>
  );
}

function PlaceRow({ p, a, d, onClick }: { p: Place; a?: Activity; d: number; onClick: () => void }) {
  const c = PLACE_CATS[p.category];
  const Icon = c.icon;
  return (
    <li>
      <button onClick={onClick} className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-elev">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full" style={{ background: `${c.color}1F`, color: c.color }}><Icon size={20} /></span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-bold">{p.name}</span>
          <span className={cn('flex items-center gap-2 text-xs text-muted')}>{c.label} · {fmtMiles(d)}</span>
        </span>
        <ActivityBadge a={a} />
      </button>
    </li>
  );
}
