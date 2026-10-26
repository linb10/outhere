import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CalendarX, Plus, SlidersHorizontal } from 'lucide-react';
import { endOfDay, endOfWeek, isWeekend, nextSaturday, startOfDay } from 'date-fns';
import type { Interest, OutEvent } from '@/types';
import { INTERESTS, INTEREST_KEYS } from '@/lib/categories';
import { useApp } from '@/store/app';
import { useAsync, useForecasts } from '@/lib/hooks';
import { hourAt } from '@/lib/weather';
import { ageEligible, isHidden, recommendEvents } from '@/lib/recommend';
import { miles } from '@/lib/utils';
import { Button, Chip, EmptyState, ErrorState, IconButton, PageTitle, Segmented, Sheet, Toggle } from '@/components/ui';
import { EventCard, EventCardSkeleton } from '@/components/EventCard';

type Sort = 'foryou' | 'soonest' | 'distance';
type Age = 'all' | 'teen' | 'adult';
type Host = 'all' | 'personal' | 'verified';
type When = 'any' | 'today' | 'week' | 'weekend' | 'month';
interface F { cats: Interest[]; family: boolean; age: Age; host: Host; when: When }
const DEF: F = { cats: [], family: false, age: 'all', host: 'all', when: 'any' };

function inWindow(e: OutEvent, w: When) {
  const now = new Date();
  if (w === 'any') return true;
  if (w === 'today') return e.start <= endOfDay(now).getTime();
  if (w === 'week') return e.start <= endOfWeek(now, { weekStartsOn: 1 }).getTime();
  if (w === 'month') return e.start <= now.getTime() + 30 * 864e5;
  const sat = isWeekend(now) ? startOfDay(now) : nextSaturday(now);
  return isWeekend(new Date(e.start)) && e.start >= startOfDay(sat).getTime() && e.start <= sat.getTime() + 2 * 864e5;
}

export default function Discover() {
  const { ds, prefs, origin, userAge, user } = useApp();
  const nav = useNavigate();
  const { data, error, loading, reload } = useAsync(() => ds.listEvents(), [ds]);
  const [sort, setSort] = useState<Sort>('foryou');
  const [params] = useSearchParams();
  const [f, setF] = useState<F>(() => {
    const c = params.get('cat') as Interest | null;
    return c && c in INTERESTS ? { ...DEF, cats: [c] } : DEF;
  });
  const [open, setOpen] = useState(false);
  const wx = useForecasts(data ?? []);

  const list = useMemo(() => {
    if (!data) return [];
    const now = Date.now();
    const base = data.filter((e) =>
      e.end > now && !e.cancelled && !isHidden(e) && !user?.blocked.includes(e.hostId) && ageEligible(e, userAge) &&
      (!f.cats.length || f.cats.includes(e.category)) && (!f.family || e.familyFriendly) &&
      (f.host === 'all' || (f.host === 'verified') === e.hostVerified) && inWindow(e, f.when) &&
      (f.age === 'all' || (f.age === 'teen' ? e.ageMin < 18 : e.ageMax >= 18)),
    );
    if (sort === 'foryou') {
      // Ignore distance cap here so filters still show far events; Home uses the strict version.
      return recommendEvents(base, { prefs: { ...prefs, maxDistance: 10 }, origin, now, userAge, blocked: user?.blocked ?? [], distance: miles, weatherAt: (la, ln, t) => hourAt(wx(la, ln), t) })
        .map((s) => ({ e: s.item, reason: s.reason }));
    }
    const sorted = [...base].sort((a, b) => (sort === 'soonest' ? a.start - b.start : miles(origin, a) - miles(origin, b)));
    return sorted.map((e) => ({ e, reason: undefined }));
  }, [data, f, sort, prefs, origin, userAge, user, wx]);

  const nF = f.cats.length + (f.family ? 1 : 0) + (f.age !== 'all' ? 1 : 0) + (f.host !== 'all' ? 1 : 0) + (f.when !== 'any' ? 1 : 0);
  const toggleCat = (c: Interest) => setF((x) => ({ ...x, cats: x.cats.includes(c) ? x.cats.filter((y) => y !== c) : [...x.cats, c] }));

  return (
    <div>
      <PageTitle right={<Button size="sm" icon={Plus} onClick={() => nav('/events/new')} className="hidden sm:inline-flex">Create</Button>}>Discover</PageTitle>
      <div className="mb-3 flex items-center gap-2">
        <div className="flex-1"><Segmented label="Sort" value={sort} onChange={setSort} options={[{ value: 'foryou', label: 'For you' }, { value: 'soonest', label: 'Soonest' }, { value: 'distance', label: 'Nearest' }]} /></div>
        <div className="relative">
          <IconButton label="Filters" icon={SlidersHorizontal} onClick={() => setOpen(true)} className="h-12 w-12" />
          {nF > 0 && <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-[11px] font-bold text-accent-fg">{nF}</span>}
        </div>
      </div>
      <div className="no-scrollbar -mx-4 mb-5 flex gap-2 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:px-0">
        <Chip active={f.family} onClick={() => setF((x) => ({ ...x, family: !x.family }))}>Family</Chip>
        <Chip active={f.host === 'verified'} onClick={() => setF((x) => ({ ...x, host: x.host === 'verified' ? 'all' : 'verified' }))}>Verified</Chip>
        <Chip active={f.when === 'weekend'} onClick={() => setF((x) => ({ ...x, when: x.when === 'weekend' ? 'any' : 'weekend' }))}>This weekend</Chip>
        {INTEREST_KEYS.map((c) => <Chip key={c} icon={INTERESTS[c].icon} active={f.cats.includes(c)} onClick={() => toggleCat(c)}>{INTERESTS[c].label}</Chip>)}
      </div>

      {error ? <ErrorState onRetry={reload} /> : loading && !data ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }, (_, i) => <EventCardSkeleton key={i} />)}</div>
      ) : list.length ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map(({ e, reason }) => <EventCard key={e.id} e={e} reason={reason} weather={hourAt(wx(e.lat, e.lng), e.start)} />)}
        </div>
      ) : (
        <EmptyState icon={CalendarX} text="No events match" action={<Button variant="outline" size="sm" onClick={() => setF(DEF)}>Clear filters</Button>} />
      )}

      <Sheet open={open} onClose={() => setOpen(false)} title="Filters">
        <p className="label mb-2">When</p>
        <div className="mb-5 flex flex-wrap gap-2">
          {([['any', 'Any time'], ['today', 'Today'], ['week', 'This week'], ['weekend', 'Weekend'], ['month', '30 days']] as [When, string][]).map(([v, l]) => (
            <Chip key={v} active={f.when === v} onClick={() => setF((x) => ({ ...x, when: v }))}>{l}</Chip>
          ))}
        </div>
        <p className="label mb-2">Ages</p>
        <div className="mb-5"><Segmented label="Ages" value={f.age} onChange={(age) => setF((x) => ({ ...x, age }))} options={[{ value: 'all', label: 'All' }, { value: 'teen', label: 'Teens' }, { value: 'adult', label: '18+' }]} /></div>
        <p className="label mb-2">Host</p>
        <div className="mb-5"><Segmented label="Host" value={f.host} onChange={(host) => setF((x) => ({ ...x, host }))} options={[{ value: 'all', label: 'All' }, { value: 'personal', label: 'Personal' }, { value: 'verified', label: 'Verified org' }]} /></div>
        <Toggle label="Family-friendly" checked={f.family} onChange={(family) => setF((x) => ({ ...x, family }))} />
        <p className="label mb-2 mt-4">Category</p>
        <div className="mb-6 flex flex-wrap gap-2">
          {INTEREST_KEYS.map((c) => <Chip key={c} icon={INTERESTS[c].icon} active={f.cats.includes(c)} onClick={() => toggleCat(c)}>{INTERESTS[c].label}</Chip>)}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" onClick={() => setF(DEF)}>Clear</Button>
          <Button onClick={() => setOpen(false)}>Show {list.length}</Button>
        </div>
      </Sheet>
    </div>
  );
}
