import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, CalendarX, ShieldCheck, SlidersHorizontal } from 'lucide-react';
import { format } from 'date-fns';
import type { Activity, Interest } from '@/types';
import { useApp } from '@/store/app';
import { useAsync, useForecast, useForecasts } from '@/lib/hooks';
import { usePlaces } from '@/lib/places';
import { condition, CONDITION_LABEL, hourAt } from '@/lib/weather';
import { recommendEvents, recommendPlaces } from '@/lib/recommend';
import { INTERESTS, PLACE_CATS } from '@/lib/categories';
import { fmtMiles, miles } from '@/lib/utils';
import { Button, EmptyState, ErrorState, SectionLabel, Skeleton } from '@/components/ui';
import { EventCard, EventCardSkeleton } from '@/components/EventCard';
import { ActivityBadge, WeatherChip } from '@/components/bits';

const SHORTCUTS: Interest[] = ['basketball', 'hiking', 'running', 'tennis', 'soccer', 'volunteering', 'cleanups', 'family'];
const TIPS = ['Tell someone where you’re going.', 'Meet in public places only.', 'Bring water. Hydrate early.', 'Never share your home address.', 'See something off? Report it.'];

export default function Home() {
  const { ds, user, prefs, origin, userAge, located, locate } = useApp();
  const nav = useNavigate();
  const places = usePlaces();
  const { data: events, error, reload } = useAsync(() => ds.listEvents(), [ds]);
  const [activity, setActivity] = useState<Record<string, Activity>>({});
  useEffect(() => { ds.activity().then(setActivity).catch(() => {}); }, [ds]);
  useEffect(() => { if (!located) locate(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const here = useForecast(origin.lat, origin.lng);
  const wx = useForecasts(events ?? []);

  const ctx = useMemo(() => ({
    prefs, origin, now: Date.now(), userAge, blocked: user?.blocked ?? [], distance: miles,
    weatherAt: (la: number, ln: number, t: number) => hourAt(wx(la, ln), t),
  }), [prefs, origin, userAge, user, wx]);
  const forYou = useMemo(() => (events ? recommendEvents(events, ctx).slice(0, 10) : null), [events, ctx]);
  const nearPlaces = useMemo(() => (places ? recommendPlaces(places.list, ctx, activity, 8) : null), [places, ctx, activity]);

  const h = new Date().getHours();
  const greet = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  const nowWx = hourAt(here, Date.now());
  const next = here?.hours.filter((x) => x.time > Date.now()).filter((_, i) => i % 2 === 0).slice(0, 6) ?? [];
  const tip = TIPS[new Date().getDate() % TIPS.length];

  return (
    <div className="space-y-9">
      <section>
        <p className="label mb-1">{format(new Date(), 'EEEE, MMM d')}</p>
        <h1 className="text-3xl font-bold leading-tight md:text-4xl">
          {greet}{user ? <>,<br /><span className="text-accent-ink">{user.username}</span></> : '.'}
        </h1>
        {!user?.onboarded && (
          <Button variant="outline" size="sm" icon={SlidersHorizontal} className="mt-4" onClick={() => nav('/onboarding')}>Personalize</Button>
        )}
      </section>

      {nowWx && (
        <section aria-label="Weather" className="card flex items-center gap-4 overflow-hidden p-4">
          <div className="shrink-0">
            <p className="text-5xl font-bold leading-none">{nowWx.tempF}°</p>
            <p className="text-sm font-semibold text-muted">{CONDITION_LABEL[condition(nowWx.code)]} · {prefs.borough}</p>
          </div>
          <div className="no-scrollbar flex flex-1 gap-2 overflow-x-auto border-l border-line pl-4">
            {next.map((x) => (
              <div key={x.time} className="flex shrink-0 flex-col items-center gap-1">
                <span className="text-xs font-semibold text-muted">{format(x.time, 'ha')}</span>
                <WeatherChip h={x} />
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <SectionLabel action={<Link to="/discover" className="inline-flex items-center gap-1 text-sm font-bold text-accent-ink">All <ArrowRight size={16} /></Link>}>For you</SectionLabel>
        {error ? <ErrorState onRetry={reload} /> : !forYou ? (
          <div className="no-scrollbar -mx-4 flex gap-4 overflow-x-auto px-4">{[0, 1, 2].map((i) => <EventCardSkeleton key={i} compact />)}</div>
        ) : forYou.length ? (
          <div className="no-scrollbar -mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-2 md:mx-0 md:px-0">
            {forYou.map((s) => <div key={s.item.id} className="snap-start"><EventCard e={s.item} reason={s.reason} weather={hourAt(wx(s.item.lat, s.item.lng), s.item.start)} compact /></div>)}
          </div>
        ) : (
          <EmptyState icon={CalendarX} text="Nothing in range yet" action={<Button size="sm" onClick={() => nav('/events/new')}>Host one</Button>} />
        )}
      </section>

      <section>
        <SectionLabel>Jump in</SectionLabel>
        <div className="grid grid-cols-4 gap-2 lg:grid-cols-8">
          {SHORTCUTS.map((k) => {
            const { label, icon: Icon } = INTERESTS[k];
            return (
              <Link key={k} to={`/discover?cat=${k}`} className="card flex aspect-square flex-col items-center justify-center gap-1.5 p-2 text-center transition-colors hover:shadow-float">
                <Icon size={24} />
                <span className="text-[11px] font-bold leading-tight">{label}</span>
              </Link>
            );
          })}
        </div>
      </section>

      <section>
        <SectionLabel action={<Link to="/explore" className="inline-flex items-center gap-1 text-sm font-bold text-accent-ink">Map <ArrowRight size={16} /></Link>}>Near you</SectionLabel>
        {!nearPlaces ? (
          <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[72px]" />)}</div>
        ) : (
          <ul className="grid grid-cols-1 gap-2 lg:grid-cols-2">
            {nearPlaces.map(({ item: p, distance }) => {
              const c = PLACE_CATS[p.category];
              return (
                <li key={p.id}>
                  <Link to={`/explore?place=${p.id}`} className="card flex items-center gap-3 p-3 transition-colors hover:shadow-float">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-white" style={{ background: c.color }}><c.icon size={22} /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{p.name}</span>
                      <span className="text-xs text-muted">{c.label} · {fmtMiles(distance)}</span>
                    </span>
                    <ActivityBadge a={activity[p.id]} />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <Link to="/safety" className="flex items-center gap-3 rounded-xl border border-line bg-elev p-4">
        <ShieldCheck size={22} className="shrink-0 text-accent-ink" />
        <span className="font-semibold">{tip}</span>
        <ArrowRight size={18} className="ml-auto shrink-0" />
      </Link>
    </div>
  );
}
