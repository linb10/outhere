import { useEffect, useState, type ComponentType } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, CalendarPlus, Check, Clock, MapPin, MapPinned, Navigation, Share2, Star, Users } from 'lucide-react';
import type { Activity, OutEvent, Place } from '@/types';
import { PLACE_CATS } from '@/lib/categories';
import { useApp } from '@/store/app';
import { useForecast } from '@/lib/hooks';
import { hourAt } from '@/lib/weather';
import { cn, directionsUrl, fmtMiles, fmtWhen, miles } from '@/lib/utils';
import { CHECKIN_RADIUS_M } from '@/services/DataService';
import { isHidden } from '@/lib/recommend';
import { Sheet } from './ui';
import { ActivityBadge, WeatherChip } from './bits';

interface Props { place: Place; activity?: Activity; onClose: () => void; onCheckedIn: () => void; events: OutEvent[] }

function Action({ icon: Icon, label, onClick, href, primary, active, disabled }: { icon: ComponentType<{ size?: number | string }>; label: string; onClick?: () => void; href?: string; primary?: boolean; active?: boolean; disabled?: boolean }) {
  const circle = cn('flex h-10 w-10 items-center justify-center rounded-full border transition-colors',
    primary ? 'border-accent bg-accent text-accent-fg' : active ? 'border-transparent bg-accent/15 text-accent-ink' : 'border-line text-accent-ink group-hover:bg-accent/5');
  const inner = (<><span className={circle}><Icon size={18} /></span><span className="text-xs font-medium text-accent-ink">{label}</span></>);
  const cls = 'group flex min-w-[64px] flex-col items-center gap-1.5 disabled:opacity-50';
  return href
    ? <a href={href} target="_blank" rel="noreferrer" className={cls}>{inner}</a>
    : <button type="button" onClick={onClick} disabled={disabled} className={cls} aria-pressed={active}>{inner}</button>;
}

/** Place details in a Google Maps layout: header, round action buttons, info rows. */
export function PlaceDetails({ place, activity, onClose, onCheckedIn, events, inline }: Props & { inline?: boolean }) {
  const { origin, isFav, toggleFav, ds, requireAuth, locate, toast, user } = useApp();
  const fc = useForecast(place.lat, place.lng);
  const [busy, setBusy] = useState(false);
  const [mine, setMine] = useState<string | null>(null);
  useEffect(() => { if (user) ds.myActiveCheckIn().then(setMine); }, [ds, user, place.id]);

  const cat = PLACE_CATS[place.category];
  const Icon = cat.icon;
  const now = hourAt(fc, Date.now());
  const fav = isFav('place', place.id);
  const here = events
    .filter((e) => !e.cancelled && !isHidden(e) && e.end > Date.now() && (e.placeId === place.id || miles(e, place) < 0.15))
    .sort((a, b) => a.start - b.start)
    .slice(0, 5);
  const checkedInHere = mine === place.id;
  const access = Object.entries(place.accessibility).filter(([, v]) => v).map(([k]) => k);

  const checkIn = async () => {
    if (!requireAuth()) return;
    setBusy(true);
    const pos = await locate();
    if (!pos) { toast('Turn on location to check in', 'error'); setBusy(false); return; }
    const meters = miles(pos, place) * 1609.34;
    if (meters > CHECKIN_RADIUS_M) { toast(`You’re ${fmtMiles(meters / 1609.34)} away. Get closer.`, 'error'); setBusy(false); return; }
    try {
      await ds.checkIn(place.id);
      setMine(place.id);
      toast('Checked in for 90 min');
      onCheckedIn();
    } catch (e) {
      toast((e as Error).message, 'error');
    }
    setBusy(false);
  };
  const share = async () => {
    const url = `${location.origin}/explore?place=${place.id}`;
    try {
      if (navigator.share) await navigator.share({ title: place.name, url });
      else { await navigator.clipboard.writeText(url); toast('Link copied'); }
    } catch { /* cancelled */ }
  };

  return (
    <div>
      {inline && <button onClick={onClose} className="mb-2 flex h-10 items-center gap-2 text-sm font-medium text-muted hover:text-fg"><ArrowLeft size={18} /> Results</button>}
      {inline && <h2 className="text-[22px] font-bold leading-tight">{place.name}</h2>}
      <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
        <span className="inline-flex items-center gap-1 font-medium" style={{ color: cat.color }}><Icon size={15} /> {cat.label}</span>
        {place.borough && <span>· {place.borough}</span>}
        <span>· {fmtMiles(miles(origin, place))}</span>
        <WeatherChip h={now} />
      </p>

      <div className="no-scrollbar -mx-1 my-4 flex gap-1 overflow-x-auto border-b border-line px-1 pb-4">
        <Action icon={Navigation} label="Directions" href={directionsUrl(place.lat, place.lng)} primary />
        <Action icon={Star} label={fav ? 'Saved' : 'Save'} onClick={() => toggleFav('place', place.id)} active={fav} />
        <Action icon={checkedInHere ? Check : MapPinned} label={checkedInHere ? 'Here' : 'Check in'} onClick={checkIn} active={checkedInHere} disabled={busy || checkedInHere} />
        <Action icon={Share2} label="Share" onClick={share} />
        <Link to={`/events/new?place=${place.id}`} className="group flex min-w-[64px] flex-col items-center gap-1.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-full border border-line text-accent-ink group-hover:bg-accent/5"><CalendarPlus size={18} /></span>
          <span className="text-xs font-medium text-accent-ink">Host</span>
        </Link>
      </div>

      <ul className="divide-y divide-line border-b border-line">
        <li className="flex items-center gap-4 py-3">
          <Users size={20} className="shrink-0 text-accent-ink" />
          <div className="flex-1"><ActivityBadge a={activity} showTime /><p className="text-xs text-muted">Live check-ins · counts only</p></div>
        </li>
        <li className="flex items-center gap-4 py-3">
          <MapPin size={20} className="shrink-0 text-accent-ink" />
          <span className="text-sm">{place.borough ? `${place.borough}, NY` : 'New York, NY'}</span>
        </li>
        {(place.amenities.length > 0 || access.length > 0) && (
          <li className="flex items-start gap-4 py-3">
            <Check size={20} className="mt-0.5 shrink-0 text-accent-ink" />
            <div className="flex flex-wrap gap-1.5">
              {place.amenities.map((a) => <span key={a} className="rounded-full border border-line px-2.5 py-1 text-xs">{a}</span>)}
              {access.map((a) => <span key={a} className="rounded-full bg-accent/10 px-2.5 py-1 text-xs capitalize text-accent-ink">{a}</span>)}
            </div>
          </li>
        )}
      </ul>

      <h3 className="mb-1 mt-5 text-base font-bold">Upcoming events</h3>
      {here.length ? (
        <ul className="divide-y divide-line">
          {here.map((e) => (
            <li key={e.id}>
              <Link to={`/events/${e.id}`} className="flex items-center gap-3 py-3 hover:bg-elev/60">
                <Clock size={18} className="shrink-0 text-muted" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold">{e.title}</span>
                  <span className="text-xs text-muted">{fmtWhen(e.start)}</span>
                </span>
                <span className="shrink-0 text-xs text-muted">{e.goingCount} going</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="py-2 text-sm text-muted">Nothing scheduled. <Link className="font-medium text-accent-ink" to={`/events/new?place=${place.id}`}>Host one</Link></p>
      )}
    </div>
  );
}

export function PlaceSheet(props: Props) {
  return (
    <Sheet open onClose={props.onClose} title={props.place.name}>
      <PlaceDetails {...props} />
    </Sheet>
  );
}
