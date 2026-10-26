import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { ImagePlus, MapPin, Search, X } from 'lucide-react';
import type { EventInput, Interest, Place } from '@/types';
import { INTERESTS, INTEREST_KEYS, PLACE_CATS } from '@/lib/categories';
import { useApp } from '@/store/app';
import { usePlaces } from '@/lib/places';
import { hasMaps } from '@/lib/env';
import { checkText } from '@/lib/moderation';
import { compressImage } from '@/lib/image';
import { fmtMiles, inNYC, isMinor, miles } from '@/lib/utils';
import { Button, Chip, FormField, PageTitle, Skeleton, Toggle } from '@/components/ui';
import { SafetyCard } from '@/components/bits';
import { clearCover } from '@/components/EventCard';
import type { PickedPlace } from '@/components/map/PlacesAutocomplete';

const MapView = lazy(() => import('@/components/map/MapView'));
const PlacesAutocomplete = lazy(() => import('@/components/map/PlacesAutocomplete'));

const schema = z.object({
  title: z.string().trim().min(3, 'Too short').max(80).refine((s) => !checkText(s), (s) => ({ message: checkText(s) ?? '' })),
  category: z.string(),
  description: z.string().trim().min(10, 'Add a bit more').max(1000).refine((s) => !checkText(s), (s) => ({ message: checkText(s) ?? '' })),
  whoShouldJoin: z.string().trim().max(120).refine((s) => !checkText(s), (s) => ({ message: checkText(s) ?? '' })),
  start: z.string().min(1, 'Required'),
  end: z.string().min(1, 'Required'),
  ageMin: z.coerce.number().int().min(13, '13+').max(99),
  ageMax: z.coerce.number().int().min(13).max(99),
  familyFriendly: z.boolean(),
  indoor: z.boolean(),
  capacity: z.union([z.literal(''), z.coerce.number().int().min(2, 'Min 2').max(1000)]).optional(),
}).superRefine((v, ctx) => {
  const s = new Date(v.start).getTime();
  const e = new Date(v.end).getTime();
  if (s <= Date.now()) ctx.addIssue({ path: ['start'], code: 'custom', message: 'Must be in the future' });
  if (e <= s) ctx.addIssue({ path: ['end'], code: 'custom', message: 'Must end after start' });
  else if (e - s > 24 * 3600e3) ctx.addIssue({ path: ['end'], code: 'custom', message: 'Max 24 hours' });
  if (v.ageMax < v.ageMin) ctx.addIssue({ path: ['ageMax'], code: 'custom', message: 'Below min age' });
});
type V = z.infer<typeof schema>;

const local = (t: number) => format(t, "yyyy-MM-dd'T'HH:mm");
const UTILITY = new Set(['restroom', 'fountain']);

export default function EventForm() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const { ds, user, toast, origin, theme } = useApp();
  const nav = useNavigate();
  const places = usePlaces();
  const [loc, setLoc] = useState<PickedPlace & { borough?: string } | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [imagesTouched, setImagesTouched] = useState(false);
  const [placeQ, setPlaceQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(!id);
  const [locError, setLocError] = useState<string | null>(null);

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(10, 0, 0, 0);
  const { register, handleSubmit, control, reset, watch, formState: { errors } } = useForm<V>({
    resolver: zodResolver(schema),
    defaultValues: { title: '', category: 'basketball', description: '', whoShouldJoin: '', start: local(tomorrow.getTime()), end: local(tomorrow.getTime() + 2 * 3600e3), ageMin: 13, ageMax: 99, familyFriendly: false, indoor: false, capacity: '' },
  });

  // Edit mode: load and check ownership.
  useEffect(() => {
    if (!id) return;
    ds.getEvent(id).then(async (e) => {
      if (!e || (e.hostId !== user?.uid && user?.role !== 'admin')) { nav('/discover', { replace: true }); return; }
      reset({ title: e.title, category: e.category, description: e.description, whoShouldJoin: e.whoShouldJoin, start: local(e.start), end: local(e.end), ageMin: e.ageMin, ageMax: e.ageMax, familyFriendly: e.familyFriendly, indoor: e.indoor, capacity: e.capacity ?? '' });
      setLoc({ id: e.placeId, name: e.placeName, lat: e.lat, lng: e.lng, borough: e.borough });
      if (e.imageCount) setImages(await ds.getEventImages(e.id));
      setLoaded(true);
    });
  }, [id, ds, user, reset, nav]);

  // Prefill from /events/new?place=<id>
  useEffect(() => {
    const pid = params.get('place');
    const p = pid && places?.byId.get(pid);
    if (p && !id) pickPlace(p);
  }, [params, places, id]); // eslint-disable-line react-hooks/exhaustive-deps

  const pickable = useMemo(() => places?.list.filter((p) => !UTILITY.has(p.category)) ?? [], [places]);
  const matches = useMemo(() => {
    const t = placeQ.trim().toLowerCase();
    if (t.length < 2) return [];
    return pickable.filter((p) => p.name.toLowerCase().includes(t)).sort((a, b) => miles(origin, a) - miles(origin, b)).slice(0, 6);
  }, [placeQ, pickable, origin]);

  const pickPlace = (p: Place) => { setLoc({ id: p.id, name: p.name, lat: p.lat, lng: p.lng, borough: p.borough }); setPlaceQ(''); setLocError(null); };
  const onMapClick = (lat: number, lng: number) => {
    // Snap a tap to the nearest public place; free-form points aren't allowed.
    let best: Place | null = null;
    let bd = Infinity;
    for (const p of pickable) {
      const d = miles({ lat, lng }, p);
      if (d < bd) { bd = d; best = p; }
    }
    if (best && bd < 0.2) pickPlace(best);
    else toast('Tap closer to a park or public place', 'error');
  };

  const addImages = async (files: FileList | null) => {
    if (!files) return;
    setImagesTouched(true);
    for (const f of Array.from(files).slice(0, 2 - images.length)) {
      try {
        const url = await compressImage(f);
        setImages((x) => [...x, url].slice(0, 2));
      } catch {
        toast('Couldn’t use that image', 'error');
      }
    }
  };

  if (!user) return <Navigate to="/login" replace state={{ from: '/events/new' }} />;
  if (user.suspended) return <p className="card p-6 font-semibold">Your account is suspended.</p>;

  const onSubmit = async (v: V) => {
    if (!loc) { setLocError('Pick a place'); return; }
    if (!inNYC(loc.lat, loc.lng)) { setLocError('Must be in NYC'); return; }
    setBusy(true);
    const input: EventInput = {
      title: v.title, category: v.category as Interest, description: v.description, whoShouldJoin: v.whoShouldJoin,
      start: new Date(v.start).getTime(), end: new Date(v.end).getTime(), ageMin: v.ageMin, ageMax: v.ageMax,
      familyFriendly: v.familyFriendly, indoor: v.indoor, capacity: v.capacity === '' || v.capacity == null ? null : Number(v.capacity),
      placeId: loc.id, placeName: loc.name, lat: loc.lat, lng: loc.lng, borough: loc.borough || 'NYC',
    };
    try {
      if (id) {
        await ds.updateEvent(id, input, imagesTouched ? images : undefined);
        clearCover(id);
        toast('Saved');
        nav(`/events/${id}`, { replace: true });
      } else {
        const newId = await ds.createEvent(input, images);
        toast('Event posted');
        nav(`/events/${newId}`, { replace: true });
      }
    } catch (e) {
      toast((e as Error).message, 'error');
    }
    setBusy(false);
  };

  if (!loaded) return <div className="space-y-4"><Skeleton className="h-12 w-64" /><Skeleton className="h-96" /></div>;
  const cat = watch('category');

  return (
    <div className="mx-auto max-w-3xl">
      <PageTitle>{id ? 'Edit event' : 'New event'}</PageTitle>
      <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-6" noValidate>
        <FormField label="Title" error={errors.title?.message}><input className="field" maxLength={80} {...register('title')} placeholder="Saturday pickup run" /></FormField>

        <div>
          <span className="label mb-2 block">Category</span>
          <Controller control={control} name="category" render={({ field }) => (
            <div className="flex flex-wrap gap-2">
              {INTEREST_KEYS.map((k) => <Chip type="button" key={k} icon={INTERESTS[k].icon} active={field.value === k} onClick={() => field.onChange(k)}>{INTERESTS[k].label}</Chip>)}
            </div>
          )} />
        </div>

        {/* Location: places list, map tap or Google Places. Never free-text addresses. */}
        <div>
          <span className="label mb-2 block">Place</span>
          {loc ? (
            <div className="card mb-3 flex items-center gap-3 border-accent ring-1 ring-accent p-3">
              <MapPin size={20} className="shrink-0" />
              <span className="min-w-0 flex-1"><span className="block truncate font-semibold">{loc.name}</span><span className="text-xs text-muted">{fmtMiles(miles(origin, loc))} away</span></span>
              <button type="button" onClick={() => setLoc(null)} aria-label="Change place" className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-elev"><X size={18} /></button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              <div className="relative">
                <Search size={18} className="absolute left-3.5 top-3.5 text-muted" />
                <input className="field pl-10" placeholder="Search NYC parks, courts, libraries" value={placeQ} onChange={(e) => setPlaceQ(e.target.value)} aria-label="Search places" />
                {matches.length > 0 && (
                  <ul className="absolute inset-x-0 top-14 z-20 overflow-hidden rounded-xl border border-line bg-card shadow-xl">
                    {matches.map((p) => {
                      const Icon = PLACE_CATS[p.category].icon;
                      return (
                        <li key={p.id}><button type="button" onClick={() => pickPlace(p)} className="flex min-h-[48px] w-full items-center gap-3 px-3 py-2 text-left hover:bg-elev"><Icon size={18} className="text-muted" /><span className="flex-1 truncate">{p.name}</span><span className="text-xs text-muted">{fmtMiles(miles(origin, p))}</span></button></li>
                      );
                    })}
                  </ul>
                )}
              </div>
              {hasMaps && (
                <>
                  <Suspense fallback={<Skeleton className="h-12" />}><PlacesAutocomplete onPick={(p) => { setLoc(p); setLocError(null); }} /></Suspense>
                  <div className="overflow-hidden rounded-xl border border-line">
                    <Suspense fallback={<Skeleton className="h-64 rounded-none" />}>
                      <MapView className="h-64 w-full" places={pickable} onSelect={pickPlace} onMapClick={onMapClick} dark={theme === 'dark'} center={null} zoom={12} />
                    </Suspense>
                  </div>
                  <p className="text-sm text-muted">Or tap a pin on the map.</p>
                </>
              )}
            </div>
          )}
          {locError && <p role="alert" className="mt-1 text-sm font-medium text-danger">{locError}</p>}
        </div>

        <FormField label="Description" error={errors.description?.message}><textarea className="field h-28 py-3" maxLength={1000} {...register('description')} placeholder="What to expect, what to bring." /></FormField>
        <FormField label="Who should join" error={errors.whoShouldJoin?.message}><input className="field" maxLength={120} {...register('whoShouldJoin')} placeholder="All skill levels" /></FormField>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Starts" error={errors.start?.message}><input type="datetime-local" className="field" {...register('start')} /></FormField>
          <FormField label="Ends" error={errors.end?.message}><input type="datetime-local" className="field" {...register('end')} /></FormField>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <FormField label="Min age" error={errors.ageMin?.message}><input className="field" inputMode="numeric" {...register('ageMin')} /></FormField>
          <FormField label="Max age" error={errors.ageMax?.message} hint="99 = none"><input className="field" inputMode="numeric" {...register('ageMax')} /></FormField>
          <FormField label="Capacity" error={errors.capacity?.message} hint="Optional"><input className="field" inputMode="numeric" {...register('capacity')} /></FormField>
        </div>
        <div className="card divide-y divide-line px-4">
          <Controller control={control} name="familyFriendly" render={({ field }) => <Toggle label="Family-friendly" checked={field.value} onChange={field.onChange} />} />
          <Controller control={control} name="indoor" render={({ field }) => <Toggle label="Indoor" checked={field.value} onChange={field.onChange} />} />
        </div>

        <div>
          <span className="label mb-2 block">Photos · up to 2</span>
          <div className="flex gap-3">
            {images.map((src, i) => (
              <div key={i} className="relative">
                <img src={src} alt={`Upload ${i + 1}`} className="h-24 w-32 rounded-xl border border-line object-cover" />
                <button type="button" aria-label="Remove photo" onClick={() => { setImages((x) => x.filter((_, j) => j !== i)); setImagesTouched(true); }} className="absolute -right-2 -top-2 flex h-8 w-8 items-center justify-center rounded-full bg-fg text-bg"><X size={16} /></button>
              </div>
            ))}
            {images.length < 2 && (
              <label className="flex h-24 w-32 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-line text-muted hover:shadow-float hover:text-fg">
                <ImagePlus size={22} /><span className="text-xs font-bold">Add</span>
                <input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => addImages(e.target.files)} />
              </label>
            )}
          </div>
          <p className="mt-1 text-sm text-muted">No faces of kids or private homes.</p>
        </div>

        {isMinor(user.birthYear) && <p className="rounded-xl bg-elev px-4 py-3 text-sm font-semibold">Under 18: bring a trusted adult.</p>}
        <SafetyCard />
        <div className="sticky bottom-20 z-10 md:bottom-4">
          <Button type="submit" size="lg" className="w-full" loading={busy}>{id ? 'Save changes' : `Post ${INTERESTS[cat as Interest]?.label ?? ''} event`}</Button>
        </div>
      </form>
    </div>
  );
}
