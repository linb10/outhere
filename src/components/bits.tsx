import { useState } from 'react';
import { Cloud, CloudFog, CloudLightning, CloudRain, CloudSnow, Flag, Phone, ShieldCheck, Sun, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Activity, Interest, ReportReason } from '@/types';
import { INTERESTS } from '@/lib/categories';
import { condition, type HourWeather } from '@/lib/weather';
import { ago, cn } from '@/lib/utils';
import { useApp } from '@/store/app';
import { Button, Chip, Sheet } from './ui';

const WX_ICON = { clear: Sun, cloudy: Cloud, fog: CloudFog, rain: CloudRain, snow: CloudSnow, storm: CloudLightning };

export function WeatherChip({ h, className }: { h?: HourWeather; className?: string }) {
  if (!h) return null;
  const Icon = WX_ICON[condition(h.code)];
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-md bg-elev px-1.5 py-0.5 text-xs font-semibold', className)} aria-label={`${h.tempF} degrees, ${h.rainPct}% rain`}>
      <Icon size={14} /> {h.tempF}°{h.rainPct >= 20 && <span className="text-muted">· {h.rainPct}%</span>}
    </span>
  );
}

export type Level = 'Quiet' | 'Active' | 'Busy';
export const levelOf = (a?: Activity): Level => (!a?.count ? 'Quiet' : a.count <= 5 ? 'Active' : 'Busy');

export function ActivityBadge({ a, showTime }: { a?: Activity; showTime?: boolean }) {
  const l = levelOf(a);
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-bold">
      <span className={cn('h-2 w-2 rounded-full', l === 'Quiet' && 'bg-muted', l === 'Active' && 'bg-[#1E8E3E]', l === 'Busy' && 'bg-[#E37400]')} />
      {l}
      {a?.count ? <span className="text-muted tracking-normal">· {a.count}{showTime && ` · ${ago(a.last)}`}</span> : null}
    </span>
  );
}

/** Category gradient + icon, used when an event has no photo. */
export function CategoryCover({ category, className, iconSize = 40 }: { category: Interest; className?: string; iconSize?: number }) {
  const c = INTERESTS[category];
  const Icon = c.icon;
  const color = c.gradient[1];
  return (
    <div className={cn('flex items-center justify-center', className)} style={{ background: `${color}1F` }}>
      <span className="flex items-center justify-center rounded-full bg-card shadow-float" style={{ width: iconSize * 1.7, height: iconSize * 1.7, color }}>
        <Icon size={iconSize} strokeWidth={1.75} />
      </span>
    </div>
  );
}

export function SafetyCard({ compact }: { compact?: boolean }) {
  return (
    <div className="rounded-xl border border-line bg-elev/60 p-4">
      <div className="mb-2 flex items-center gap-2"><ShieldCheck size={18} className="text-accent-ink" /><span className="label !text-fg">Stay safe</span></div>
      <ul className={cn('grid gap-1 text-sm text-muted', !compact && 'sm:grid-cols-2')}>
        <li>Meet in public places</li>
        <li>Tell someone your plans</li>
        <li>Bring a friend</li>
        <li className="flex items-center gap-1"><Phone size={13} /> Emergency: 911</li>
      </ul>
      <Link to="/safety" className="mt-2 inline-block text-sm font-semibold underline underline-offset-2">Safety Center</Link>
    </div>
  );
}

export function GoingCount({ n }: { n: number }) {
  return <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted"><Users size={14} /> {n} going</span>;
}

const REASONS: ReportReason[] = ['spam', 'inappropriate', 'unsafe', 'private address', 'scam', 'harassment', 'other'];

export function ReportButton({ targetType, targetId, targetLabel, label = 'Report' }: { targetType: 'event' | 'user' | 'image'; targetId: string; targetLabel: string; label?: string }) {
  const { ds, requireAuth, toast } = useApp();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!reason) return;
    setBusy(true);
    try {
      await ds.report({ targetType, targetId, targetLabel, reason, note: note.slice(0, 300) });
      toast('Reported. Thanks.');
      setOpen(false);
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <Button variant="ghost" size="sm" icon={Flag} onClick={() => requireAuth() && setOpen(true)}>{label}</Button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Report">
        <p className="label mb-2">Reason</p>
        <div className="mb-4 flex flex-wrap gap-2">
          {REASONS.map((r) => <Chip key={r} active={reason === r} onClick={() => setReason(r)} className="capitalize">{r}</Chip>)}
        </div>
        <textarea className="field h-24 py-3" maxLength={300} placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} aria-label="Note" />
        <Button className="mt-4 w-full" disabled={!reason} loading={busy} onClick={submit}>Send report</Button>
        <p className="mt-3 text-center text-sm text-muted">In danger? Call 911.</p>
      </Sheet>
    </>
  );
}
