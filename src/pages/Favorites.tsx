import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogIn, Star } from 'lucide-react';
import { useApp } from '@/store/app';
import { useAsync } from '@/lib/hooks';
import { usePlaces } from '@/lib/places';
import { PLACE_CATS } from '@/lib/categories';
import { fmtMiles, miles } from '@/lib/utils';
import { Button, EmptyState, PageTitle, Segmented, Skeleton } from '@/components/ui';
import { EventCard } from '@/components/EventCard';

export default function Favorites() {
  const { user, favorites, ds, origin, toggleFav } = useApp();
  const nav = useNavigate();
  const places = usePlaces();
  const [tab, setTab] = useState<'places' | 'events'>('places');
  const evIds = favorites.filter((f) => f.type === 'event').map((f) => f.refId);
  const { data: events, loading } = useAsync(() => Promise.all(evIds.map((id) => ds.getEvent(id))), [ds, evIds.join()]);

  if (!user) return (
    <div><PageTitle>Saved</PageTitle><EmptyState icon={Star} text="Sign in to save places and events" action={<Button size="sm" icon={LogIn} onClick={() => nav('/login')}>Sign in</Button>} /></div>
  );

  const savedPlaces = favorites.filter((f) => f.type === 'place').map((f) => places?.byId.get(f.refId)).filter(Boolean);
  const savedEvents = (events ?? []).filter((e) => e && !e.cancelled) as NonNullable<NonNullable<typeof events>[number]>[];

  return (
    <div>
      <PageTitle>Saved</PageTitle>
      <div className="mb-5 max-w-sm"><Segmented label="Type" value={tab} onChange={setTab} options={[{ value: 'places', label: `Places · ${savedPlaces.length}` }, { value: 'events', label: `Events · ${evIds.length}` }]} /></div>
      {tab === 'places' ? (
        !places ? <Skeleton className="h-40" /> : savedPlaces.length ? (
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {savedPlaces.map((p) => {
              const c = PLACE_CATS[p!.category];
              return (
                <li key={p!.id} className="card flex items-center gap-3 p-3">
                  <Link to={`/explore?place=${p!.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white" style={{ background: c.color }}><c.icon size={20} /></span>
                    <span className="min-w-0"><span className="block truncate font-semibold">{p!.name}</span><span className="text-xs text-muted">{c.label} · {fmtMiles(miles(origin, p!))}</span></span>
                  </Link>
                  <button onClick={() => toggleFav('place', p!.id)} aria-label="Remove" className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-elev"><Star size={18} className="fill-accent text-fg" /></button>
                </li>
              );
            })}
          </ul>
        ) : <EmptyState icon={Star} text="No saved places" action={<Button size="sm" onClick={() => nav('/explore')}>Explore</Button>} />
      ) : loading && !events ? <Skeleton className="h-40" /> : savedEvents.length ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{savedEvents.map((e) => <EventCard key={e.id} e={e} />)}</div>
      ) : <EmptyState icon={Star} text="No saved events" action={<Button size="sm" onClick={() => nav('/discover')}>Discover</Button>} />}
    </div>
  );
}
