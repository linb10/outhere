import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BadgeCheck, MapPin, Star } from 'lucide-react';
import type { OutEvent } from '@/types';
import { cn, fmtMiles, fmtWhen, miles } from '@/lib/utils';
import { useApp } from '@/store/app';
import type { HourWeather } from '@/lib/weather';
import { Badge } from './ui';
import { CategoryCover, GoingCount, WeatherChip } from './bits';

const coverCache = new Map<string, Promise<string | undefined>>();
export function useCover(e: Pick<OutEvent, 'id' | 'imageCount'>) {
  const { ds } = useApp();
  const [src, setSrc] = useState<string>();
  useEffect(() => {
    if (!e.imageCount) return setSrc(undefined);
    if (!coverCache.has(e.id)) coverCache.set(e.id, ds.getEventImages(e.id).then((i) => i[0]));
    let alive = true;
    coverCache.get(e.id)!.then((s) => alive && setSrc(s));
    return () => { alive = false; };
  }, [e.id, e.imageCount, ds]);
  return src;
}
export const clearCover = (id: string) => coverCache.delete(id);

export function EventCard({ e, reason, weather, compact }: { e: OutEvent; reason?: string; weather?: HourWeather; compact?: boolean }) {
  const { origin, isFav, toggleFav } = useApp();
  const cover = useCover(e);
  const fav = isFav('event', e.id);
  return (
    <article className={cn('card group relative flex overflow-hidden transition-colors hover:shadow-float', compact ? 'w-[280px] shrink-0 flex-col' : 'flex-col')}>
      <div className="relative">
        {cover ? (
          <img src={cover} alt="" className="aspect-[16/9] w-full object-cover" loading="lazy" />
        ) : (
          <CategoryCover category={e.category} className="aspect-[16/9] w-full" />
        )}
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          {e.hostVerified && <Badge tone="solid"><BadgeCheck size={12} /> Verified</Badge>}
          {e.familyFriendly && <Badge tone="accent">Family</Badge>}
          {e.cancelled && <Badge tone="danger">Cancelled</Badge>}
        </div>
        <button
          onClick={() => toggleFav('event', e.id)}
          aria-label={fav ? 'Remove from saved' : 'Save event'}
          aria-pressed={fav}
          className="absolute right-2 top-2 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-card text-fg shadow-float"
        >
          <Star size={18} className={fav ? 'fill-[#FBBC04] text-[#FBBC04]' : ''} />
        </button>
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <p className="text-xs font-medium text-accent-ink">{fmtWhen(e.start)}</p>
        <h3 className="text-base font-bold leading-snug">
          <Link to={`/events/${e.id}`} className="after:absolute after:inset-0 focus:outline-none">{e.title}</Link>
        </h3>
        <p className="flex items-center gap-1 truncate text-sm text-muted"><MapPin size={14} className="shrink-0" /> <span className="truncate">{e.placeName}</span></p>
        <div className="mt-auto flex flex-wrap items-center gap-2 pt-2">
          <span className="text-xs font-semibold">{fmtMiles(miles(origin, e))}</span>
          {!e.indoor && <WeatherChip h={weather} />}
          {e.ageMin > 13 || e.ageMax < 99 ? <Badge>{e.ageMax < 99 ? `${e.ageMin}–${e.ageMax}` : `${e.ageMin}+`}</Badge> : null}
          <span className="ml-auto"><GoingCount n={e.goingCount} /></span>
        </div>
        {reason && <p className="mt-1 border-t border-line pt-2 text-xs font-semibold text-muted">{reason}</p>}
      </div>
    </article>
  );
}

export function EventCardSkeleton({ compact }: { compact?: boolean }) {
  return (
    <div className={cn('card overflow-hidden', compact && 'w-[280px] shrink-0')}>
      <div className="skeleton aspect-[16/9] rounded-none" />
      <div className="space-y-2 p-4"><div className="skeleton h-3 w-24" /><div className="skeleton h-5 w-3/4" /><div className="skeleton h-3 w-1/2" /></div>
    </div>
  );
}
