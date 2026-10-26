import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, BadgeCheck, CalendarX, Check, Clock, MapPin, Pencil, Share2, Star, Users, XCircle } from 'lucide-react';
import { useApp } from '@/store/app';
import { useAsync, useForecast } from '@/lib/hooks';
import { hourAt, weatherWarning } from '@/lib/weather';
import { INTERESTS } from '@/lib/categories';
import { directionsUrl, fmtMiles, fmtRange, isMinor, miles } from '@/lib/utils';
import { hasMaps } from '@/lib/env';
import { isHidden } from '@/lib/recommend';
import type { Rsvp, RsvpStatus } from '@/types';
import { Badge, Button, EmptyState, ErrorState, Skeleton } from '@/components/ui';
import { CategoryCover, ReportButton, SafetyCard, WeatherChip } from '@/components/bits';
import { clearCover } from '@/components/EventCard';

const MapView = lazy(() => import('@/components/map/MapView'));

export default function EventDetail() {
  const { id = '' } = useParams();
  const { ds, user, origin, rsvps, refreshRsvps, requireAuth, toast, isFav, toggleFav, theme } = useApp();
  const nav = useNavigate();
  const { data: ev, error, loading, reload } = useAsync(() => ds.getEvent(id), [ds, id]);
  const { data: images } = useAsync(() => (ev?.imageCount ? ds.getEventImages(id) : Promise.resolve([])), [ev?.imageCount, id]);
  const [attendees, setAttendees] = useState<Rsvp[]>([]);
  const [busy, setBusy] = useState<RsvpStatus | 'cancel' | null>(null);
  const fc = useForecast(ev?.lat, ev?.lng);
  const evCenter = useMemo(() => (ev ? { lat: ev.lat, lng: ev.lng } : null), [ev?.lat, ev?.lng]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (ev) ds.attendees(ev.id).then(setAttendees).catch(() => {}); }, [ds, ev]);

  if (loading && !ev) return <div className="space-y-4"><Skeleton className="aspect-[3/1] w-full" /><Skeleton className="h-10 w-2/3" /><Skeleton className="h-32" /></div>;
  if (error) return <ErrorState onRetry={reload} />;
  if (!ev || (isHidden(ev) && user?.role !== 'admin' && user?.uid !== ev.hostId)) {
    return <EmptyState icon={CalendarX} text="Event not available" action={<Button variant="outline" size="sm" onClick={() => nav('/discover')}>Browse events</Button>} />;
  }

  const mine = rsvps.find((r) => r.eventId === ev.id)?.status ?? null;
  const owner = user?.uid === ev.hostId;
  const past = ev.end < Date.now();
  const wx = hourAt(fc, ev.start);
  const warn = ev.indoor ? null : weatherWarning(wx);
  const full = Boolean(ev.capacity && ev.goingCount >= ev.capacity);
  const minor = user ? isMinor(user.birthYear) : false;
  const fav = isFav('event', ev.id);
  const cat = INTERESTS[ev.category];

  const rsvp = async (s: RsvpStatus) => {
    if (!requireAuth()) return;
    setBusy(s);
    try {
      await ds.setRsvp(ev, mine === s ? null : s);
      await refreshRsvps();
      reload();
      toast(mine === s ? 'RSVP removed' : s === 'going' ? 'You’re going' : 'Marked interested');
    } catch (e) {
      toast((e as Error).message, 'error');
    }
    setBusy(null);
  };

  const share = async () => {
    const url = `${location.origin}/events/${ev.id}`;
    try {
      if (navigator.share) await navigator.share({ title: ev.title, url });
      else {
        await navigator.clipboard.writeText(url);
        toast('Link copied');
      }
    } catch { /* user cancelled */ }
  };

  const cancel = async () => {
    if (!confirm('Cancel this event?')) return;
    setBusy('cancel');
    await ds.cancelEvent(ev.id).catch((e) => toast(e.message, 'error'));
    clearCover(ev.id);
    reload();
    setBusy(null);
  };

  return (
    <article className="mx-auto max-w-4xl">
      <button onClick={() => (history.length > 1 ? nav(-1) : nav('/discover'))} className="mb-4 inline-flex h-10 items-center gap-1 text-sm font-bold text-muted hover:text-fg"><ArrowLeft size={18} /> Back</button>

      <div className="relative mb-5 overflow-hidden rounded-xl border border-line">
        {images?.[0] ? <img src={images[0]} alt={`${ev.title} photo`} className="aspect-[3/1] w-full object-cover" /> : <CategoryCover category={ev.category} className="aspect-[3/1] w-full" iconSize={64} />}
        {images && images.length > 1 && <img src={images[1]} alt={`${ev.title} second photo`} className="absolute bottom-3 right-3 h-20 w-28 rounded-xl border-2 border-white object-cover" />}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap gap-1.5">
            <Badge tone="solid"><cat.icon size={12} /> {cat.label}</Badge>
            {ev.hostVerified && <Badge tone="accent"><BadgeCheck size={12} /> Verified</Badge>}
            {ev.familyFriendly && <Badge>Family-friendly</Badge>}
            <Badge>{ev.ageMax < 99 ? `Ages ${ev.ageMin}–${ev.ageMax}` : `Ages ${ev.ageMin}+`}</Badge>
            <Badge>{ev.indoor ? 'Indoor' : 'Outdoor'}</Badge>
            {ev.cancelled && <Badge tone="danger">Cancelled</Badge>}
            {isHidden(ev) && <Badge tone="danger">Hidden</Badge>}
          </div>
          <h1 className="mb-3 text-2xl font-bold leading-tight md:text-[28px]">{ev.title}</h1>

          <ul className="mb-5 grid gap-2 text-[15px]">
            <li className="flex items-start gap-2"><Clock size={18} className="mt-0.5 shrink-0 text-muted" /> {fmtRange(ev.start, ev.end)}</li>
            <li className="flex items-start gap-2"><MapPin size={18} className="mt-0.5 shrink-0 text-muted" />
              <span><Link to={`/explore?place=${ev.placeId}`} className="font-semibold underline underline-offset-2">{ev.placeName}</Link> <span className="text-muted">· {fmtMiles(miles(origin, ev))}</span></span>
            </li>
            <li className="flex items-center gap-2"><Users size={18} className="shrink-0 text-muted" /> {ev.goingCount} going · {ev.interestedCount} interested{ev.capacity ? ` · ${ev.capacity} max` : ''}</li>
          </ul>

          {warn && <div role="alert" className="mb-5 flex items-center gap-2 rounded-xl border border-warn/40 bg-warn/10 px-4 py-3 font-semibold text-warn"><AlertTriangle size={18} /> {warn}</div>}
          {minor && !ev.hostVerified && <div className="mb-5 flex items-center gap-2 rounded-xl border border-line bg-elev px-4 py-3 text-sm font-semibold"><Users size={18} /> Personal event. Bring a trusted adult.</div>}

          {!past && !ev.cancelled && (
            <div className="mb-6 grid grid-cols-2 gap-3">
              <Button size="lg" variant={mine === 'going' ? 'secondary' : 'primary'} icon={mine === 'going' ? Check : undefined} loading={busy === 'going'} disabled={full && mine !== 'going'} onClick={() => rsvp('going')}>
                {full && mine !== 'going' ? 'Full' : mine === 'going' ? 'Going' : 'Going'}
              </Button>
              <Button size="lg" variant={mine === 'interested' ? 'secondary' : 'outline'} icon={mine === 'interested' ? Check : undefined} loading={busy === 'interested'} onClick={() => rsvp('interested')}>Interested</Button>
            </div>
          )}

          <section className="mb-6">
            <h2 className="label mb-2">About</h2>
            <p className="whitespace-pre-line text-[15px] leading-relaxed">{ev.description}</p>
          </section>
          {ev.whoShouldJoin && (
            <section className="mb-6">
              <h2 className="label mb-2">Who should join</h2>
              <p className="text-[15px]">{ev.whoShouldJoin}</p>
            </section>
          )}

          <section className="mb-6">
            <h2 className="label mb-2">Host</h2>
            <Link to={`/u/${ev.hostId}`} className="card inline-flex items-center gap-3 p-3 pr-5 hover:shadow-float">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-lg font-bold text-accent-fg">{ev.hostName[0]}</span>
              <span>
                <span className="block font-semibold">{ev.orgName ?? `@${ev.hostName}`}</span>
                <span className="text-xs text-muted">{ev.hostVerified ? <span className="inline-flex items-center gap-1"><BadgeCheck size={12} /> Verified org</span> : 'Personal host'}</span>
              </span>
            </Link>
          </section>

          {attendees.length > 0 && (
            <section className="mb-6">
              <h2 className="label mb-2">Going</h2>
              <div className="flex flex-wrap gap-1.5">
                {attendees.filter((a) => !a.minor).slice(0, 20).map((a) => <Badge key={a.uid}>@{a.username}</Badge>)}
                {ev.goingCount > attendees.filter((a) => !a.minor).length && <Badge>+{ev.goingCount - attendees.filter((a) => !a.minor).length}</Badge>}
              </div>
            </section>
          )}

          <div className="flex flex-wrap gap-2 border-t border-line pt-4">
            <Button variant="ghost" size="sm" icon={Share2} onClick={share}>Share</Button>
            <Button variant="ghost" size="sm" icon={Star} onClick={() => toggleFav('event', ev.id)} aria-pressed={fav}>{fav ? 'Saved' : 'Save'}</Button>
            {owner && !ev.cancelled && <Button variant="ghost" size="sm" icon={Pencil} onClick={() => nav(`/events/${ev.id}/edit`)}>Edit</Button>}
            {(owner || user?.role === 'admin') && !ev.cancelled && <Button variant="ghost" size="sm" icon={XCircle} loading={busy === 'cancel'} onClick={cancel} className="text-danger">Cancel event</Button>}
            {!owner && <ReportButton targetType="event" targetId={ev.id} targetLabel={ev.title} />}
            {!owner && ev.imageCount > 0 && <ReportButton targetType="image" targetId={ev.id} targetLabel={`Photo: ${ev.title}`} label="Report photo" />}
          </div>
        </div>

        <aside className="space-y-4">
          <div className="card overflow-hidden">
            {hasMaps ? (
              <Suspense fallback={<Skeleton className="h-48 rounded-none" />}>
                <MapView className="h-48 w-full" places={[{ id: ev.placeId, name: ev.placeName, category: 'park', lat: ev.lat, lng: ev.lng, borough: ev.borough, amenities: [], accessibility: {}, geohash: ev.geohash }]} onSelect={() => {}} dark={theme === 'dark'} center={evCenter} zoom={15} />
              </Suspense>
            ) : null}
            <div className="flex items-center justify-between gap-2 p-3">
              <span className="truncate text-sm font-semibold">{ev.placeName}</span>
              <a href={directionsUrl(ev.lat, ev.lng)} target="_blank" rel="noreferrer" className="shrink-0 text-sm font-bold text-accent-ink">Directions</a>
            </div>
          </div>
          {wx && !ev.indoor && (
            <div className="card flex items-center justify-between p-4">
              <span className="label">Forecast</span>
              <WeatherChip h={wx} className="text-sm" />
            </div>
          )}
          <SafetyCard compact />
        </aside>
      </div>
    </article>
  );
}
