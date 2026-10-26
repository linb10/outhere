import { Accessibility, Armchair, Sun as SunIcon, Toilet, User, Users, UsersRound } from 'lucide-react';
import type { AccessNeed, Borough, GroupSize, Prefs, TimeSlot } from '@/types';
import { INTERESTS, INTEREST_KEYS } from '@/lib/categories';
import { cn } from '@/lib/utils';
import type { ComponentType } from 'react';

type Q = { prefs: Prefs; set: (p: Partial<Prefs>) => void };

const BOROUGHS: Borough[] = ['Queens', 'Brooklyn', 'Manhattan', 'Bronx', 'Staten Island'];
const DISTANCES = [0.5, 1, 3, 5, 10];
const TIMES: { v: TimeSlot; label: string }[] = [{ v: 'weekdayAM', label: 'Weekday AM' }, { v: 'weekdayPM', label: 'Weekday PM' }, { v: 'weekend', label: 'Weekends' }];
const GROUPS: { v: GroupSize; label: string; icon: ComponentType<{ size?: number | string }> }[] = [{ v: 'solo', label: 'Solo', icon: User }, { v: 'small', label: 'Small group', icon: Users }, { v: 'large', label: 'Big crowd', icon: UsersRound }];
const ACCESS: { v: AccessNeed; label: string; icon: ComponentType<{ size?: number | string }> }[] = [
  { v: 'wheelchair', label: 'Wheelchair', icon: Accessibility }, { v: 'restrooms', label: 'Restrooms', icon: Toilet },
  { v: 'shade', label: 'Shade', icon: SunIcon }, { v: 'seating', label: 'Seating', icon: Armchair },
];

const toggle = <T,>(arr: T[], v: T) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

function Tile({ active, onClick, children, className }: { active: boolean; onClick: () => void; children: React.ReactNode; className?: string }) {
  return (
    <button type="button" aria-pressed={active} onClick={onClick}
      className={cn('flex min-h-[56px] items-center gap-3 rounded-xl border px-4 text-left font-semibold transition-colors', active ? 'border-accent bg-accent/10 text-accent-ink' : 'border-line bg-card hover:bg-elev', className)}>
      {children}
    </button>
  );
}

export function QBorough({ prefs, set }: Q) {
  return (
    <div className="grid grid-cols-1 gap-3">
      <div className="grid grid-cols-2 gap-2">
        {BOROUGHS.map((b) => <Tile key={b} active={prefs.borough === b} onClick={() => set({ borough: b })} className={b === 'Staten Island' ? 'col-span-2' : ''}>{b}</Tile>)}
      </div>
      <label className="block">
        <span className="label mb-1.5 block">ZIP (optional)</span>
        <input className="field" inputMode="numeric" maxLength={5} placeholder="11355" value={prefs.zip ?? ''} onChange={(e) => set({ zip: e.target.value.replace(/\D/g, '').slice(0, 5) })} />
      </label>
    </div>
  );
}

export function QDistance({ prefs, set }: Q) {
  return (
    <div className="grid grid-cols-5 gap-2">
      {DISTANCES.map((d) => (
        <Tile key={d} active={prefs.maxDistance === d} onClick={() => set({ maxDistance: d })} className="justify-center px-1 text-xl font-medium">
          {d === 10 ? '10+' : d}
        </Tile>
      ))}
      <p className="col-span-5 text-center text-sm text-muted">miles</p>
    </div>
  );
}

export function QInterests({ prefs, set }: Q) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {INTEREST_KEYS.map((k) => {
        const { label, icon: Icon } = INTERESTS[k];
        return (
          <Tile key={k} active={prefs.interests.includes(k)} onClick={() => set({ interests: toggle(prefs.interests, k) })} className="min-h-[52px] px-3 text-sm">
            <Icon size={20} /> {label}
          </Tile>
        );
      })}
    </div>
  );
}

export function QTimes({ prefs, set }: Q) {
  return (
    <div className="grid grid-cols-1 gap-2">
      {TIMES.map((t) => <Tile key={t.v} active={prefs.times.includes(t.v)} onClick={() => set({ times: toggle(prefs.times, t.v) })}>{t.label}</Tile>)}
    </div>
  );
}

export function QGroup({ prefs, set }: Q) {
  return (
    <div className="grid grid-cols-1 gap-2">
      {GROUPS.map(({ v, label, icon: Icon }) => <Tile key={v} active={prefs.groupSize === v} onClick={() => set({ groupSize: v })}><Icon size={20} /> {label}</Tile>)}
    </div>
  );
}

export function QAccess({ prefs, set }: Q) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {ACCESS.map(({ v, label, icon: Icon }) => <Tile key={v} active={prefs.accessibility.includes(v)} onClick={() => set({ accessibility: toggle(prefs.accessibility, v) })}><Icon size={20} /> {label}</Tile>)}
    </div>
  );
}

export const QUESTIONS = [
  { key: 'borough', title: 'Your borough', C: QBorough },
  { key: 'distance', title: 'How far?', C: QDistance },
  { key: 'interests', title: 'What’s your thing?', C: QInterests },
  { key: 'times', title: 'When are you free?', C: QTimes },
  { key: 'group', title: 'Group size', C: QGroup },
  { key: 'access', title: 'Accessibility', C: QAccess },
] as const;
