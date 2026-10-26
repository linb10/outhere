import { useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { differenceInCalendarDays, format, startOfDay, startOfMonth, startOfWeek, startOfYear } from 'date-fns';
import { Download, Flame, HandHeart, LogIn, Medal, Play, Plus, Printer, Square, Timer, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { ActivityLog, Interest } from '@/types';
import { INTERESTS, INTEREST_KEYS, VOLUNTEER_CATS } from '@/lib/categories';
import { useApp } from '@/store/app';
import { useAsync } from '@/lib/hooks';
import { cn, downloadFile } from '@/lib/utils';
import { Badge, Button, Card, EmptyState, ErrorState, FormField, PageTitle, SectionLabel, Segmented, Sheet, Skeleton, Toggle } from '@/components/ui';

type Period = 'week' | 'month' | 'year';
const MILESTONES = [10, 25, 50, 100];
const TIMER_KEY = 'activityTimer';
interface TimerState { start: number; category: Interest; placeName: string }

const periodStart = (p: Period) => (p === 'week' ? startOfWeek(new Date(), { weekStartsOn: 1 }) : p === 'month' ? startOfMonth(new Date()) : startOfYear(new Date())).getTime();
const hrs = (min: number) => Math.round((min / 60) * 10) / 10;

function streak(logs: ActivityLog[]) {
  const days = new Set(logs.map((l) => startOfDay(l.date).getTime()));
  let d = startOfDay(new Date());
  if (!days.has(d.getTime())) d = new Date(d.getTime() - 864e5); // today not logged yet doesn't break it
  let n = 0;
  while (days.has(d.getTime())) { n++; d = new Date(d.getTime() - 864e5); }
  return n;
}

export default function ActivityPage() {
  const { ds, user, toast } = useApp();
  const nav = useNavigate();
  const { data: logs, error, loading, reload } = useAsync(() => ds.listLogs(), [ds, user?.uid]);
  const [period, setPeriod] = useState<Period>('month');
  const [form, setForm] = useState<Partial<ActivityLog> | null>(null);
  const [timer, setTimer] = useState<TimerState | null>(() => { try { return JSON.parse(localStorage.getItem(TIMER_KEY) ?? 'null'); } catch { return null; } });
  const [tick, setTick] = useState(Date.now());

  useEffect(() => {
    if (!timer) return;
    const t = setInterval(() => setTick(Date.now()), 1000);
    return () => clearInterval(t);
  }, [timer]);

  const stats = useMemo(() => {
    const all = logs ?? [];
    const since = periodStart(period);
    const inP = all.filter((l) => l.date >= since);
    const byCat: Record<string, number> = {};
    inP.forEach((l) => (byCat[l.category] = (byCat[l.category] ?? 0) + l.minutes));
    const chart = Object.entries(byCat).map(([k, m]) => ({ name: INTERESTS[k as Interest]?.label ?? k, hours: hrs(m) })).sort((a, b) => b.hours - a.hours);
    const total = inP.reduce((s, l) => s + l.minutes, 0);
    const vol = inP.filter((l) => l.volunteer).reduce((s, l) => s + l.minutes, 0);
    const lifetime = all.reduce((s, l) => s + l.minutes, 0);
    const volLifetime = all.filter((l) => l.volunteer).reduce((s, l) => s + l.minutes, 0);
    return { chart, total, vol, lifetime, volLifetime, streak: streak(all) };
  }, [logs, period]);

  if (!user) return (
    <div>
      <PageTitle>Activity</PageTitle>
      <EmptyState icon={Timer} text="Sign in to track your hours" action={<Button size="sm" icon={LogIn} onClick={() => nav('/login', { state: { from: '/activity' } })}>Sign in</Button>} />
    </div>
  );

  const startTimer = () => {
    const t: TimerState = { start: Date.now(), category: user.prefs.interests[0] ?? 'fitness', placeName: '' };
    localStorage.setItem(TIMER_KEY, JSON.stringify(t));
    setTimer(t);
  };
  const stopTimer = () => {
    if (!timer) return;
    const minutes = Math.max(1, Math.round((Date.now() - timer.start) / 60000));
    localStorage.removeItem(TIMER_KEY);
    setTimer(null);
    setForm({ date: timer.start, category: timer.category, minutes, placeName: timer.placeName, volunteer: VOLUNTEER_CATS.includes(timer.category) });
  };
  const elapsed = timer ? Math.floor((tick - timer.start) / 1000) : 0;
  const clock = `${Math.floor(elapsed / 3600)}:${String(Math.floor((elapsed % 3600) / 60)).padStart(2, '0')}:${String(elapsed % 60).padStart(2, '0')}`;

  const volunteerLogs = (logs ?? []).filter((l) => l.volunteer);
  const exportCsv = () => {
    const rows = [['Date', 'Category', 'Place', 'Hours', 'Note'], ...volunteerLogs.map((l) => [format(l.date, 'yyyy-MM-dd'), INTERESTS[l.category]?.label ?? l.category, l.placeName, String(hrs(l.minutes)), l.note])];
    const csv = rows.map((r) => r.map((c) => `"${(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n') + `\n"Self-reported hours. Total: ${hrs(stats.volLifetime)}"`;
    downloadFile(`volunteer-hours-${user.username}.csv`, csv);
  };

  return (
    <div>
      <PageTitle right={<Button size="sm" icon={Plus} onClick={() => setForm({ date: Date.now(), category: user.prefs.interests[0] ?? 'fitness', minutes: 60, volunteer: false })}>Log</Button>}>Activity</PageTitle>

      <div className="mb-6 hidden print:block">
        <p className="text-2xl font-bold">Volunteer Hours Summary · OutHere</p>
        <p>@{user.username} · Printed {format(Date.now(), 'MMM d, yyyy')} · Self-reported</p>
        <table className="mt-4 w-full text-left text-sm">
          <thead><tr><th>Date</th><th>Category</th><th>Place</th><th>Hours</th></tr></thead>
          <tbody>{volunteerLogs.map((l) => <tr key={l.id}><td>{format(l.date, 'yyyy-MM-dd')}</td><td>{INTERESTS[l.category]?.label}</td><td>{l.placeName}</td><td>{hrs(l.minutes)}</td></tr>)}</tbody>
        </table>
        <p className="mt-2 font-bold">Total: {hrs(stats.volLifetime)} hours</p>
      </div>
      <div className="print:hidden">
      {/* Timer */}
      <Card className={cn('no-print mb-5 flex items-center gap-4 p-4', timer && 'border-accent ring-1 ring-accent')}>
        <span className={cn('flex h-12 w-12 items-center justify-center rounded-xl', timer ? 'bg-accent text-accent-fg' : 'bg-elev')}><Timer size={22} /></span>
        <div className="min-w-0 flex-1">
          <p className="label">Timer</p>
          <p className="text-3xl font-bold tabular-nums leading-none">{timer ? clock : '0:00:00'}</p>
        </div>
        {timer ? <Button variant="secondary" icon={Square} onClick={stopTimer}>Stop</Button> : <Button icon={Play} onClick={startTimer}>Start</Button>}
      </Card>

      {error ? <ErrorState onRetry={reload} /> : loading && !logs ? <Skeleton className="h-64" /> : (
        <>
          <div className="mb-5 grid gap-3 sm:grid-cols-3">
            <Card className="border-transparent bg-accent p-5 text-accent-fg sm:col-span-2">
              <div className="mb-1 flex items-center gap-2"><HandHeart size={18} /><span className="text-sm font-semibold opacity-80">Volunteer hours</span></div>
              <p className="text-5xl font-bold leading-none">{hrs(stats.volLifetime)}</p>
              <p className="mt-1 text-sm opacity-70">{hrs(stats.vol)} this {period} · self-reported</p>
              <div className="no-print mt-4 flex flex-wrap gap-2">
                <button onClick={exportCsv} disabled={!volunteerLogs.length} className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-black/10 px-3 text-sm font-bold disabled:opacity-40"><Download size={16} /> CSV</button>
                <button onClick={() => window.print()} className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-black/10 px-3 text-sm font-bold"><Printer size={16} /> Print</button>
              </div>
            </Card>
            <Card className="flex flex-col justify-between p-5">
              <div className="flex items-center gap-2"><Flame size={18} className="text-warn" /><span className="label">Streak</span></div>
              <p className="text-5xl font-bold leading-none">{stats.streak}<span className="ml-1 text-xl text-muted">days</span></p>
            </Card>
          </div>

          <div className="no-print mb-4"><Segmented label="Period" value={period} onChange={setPeriod} options={[{ value: 'week', label: 'Week' }, { value: 'month', label: 'Month' }, { value: 'year', label: 'Year' }]} /></div>

          <Card className="no-print mb-5 p-5">
            <div className="mb-3 flex items-baseline justify-between">
              <span className="label">By category</span>
              <span className="text-3xl font-bold">{hrs(stats.total)}<span className="ml-1 text-base text-muted">h</span></span>
            </div>
            {stats.chart.length ? (
              <div className="h-56" role="img" aria-label={`Hours by category: ${stats.chart.map((c) => `${c.name} ${c.hours}`).join(', ')}`}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.chart} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
                    <XAxis dataKey="name" tick={{ fill: 'rgb(var(--muted))', fontSize: 11 }} axisLine={false} tickLine={false} interval={0} />
                    <YAxis tick={{ fill: 'rgb(var(--muted))', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip cursor={{ fill: 'rgb(var(--elev))' }} contentStyle={{ background: 'rgb(var(--card))', border: '1px solid rgb(var(--line))', borderRadius: 12, color: 'rgb(var(--fg))' }} formatter={(v: number) => [`${v} h`, 'Hours']} />
                    <Bar dataKey="hours" fill="rgb(var(--accent))" stroke="rgb(var(--fg))" strokeWidth={1} radius={[6, 6, 0, 0]} maxBarSize={44} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : <p className="py-8 text-center text-sm text-muted">No hours this {period}.</p>}
          </Card>

          <section className="mb-6">
            <SectionLabel>Milestones</SectionLabel>
            <div className="grid grid-cols-4 gap-2">
              {MILESTONES.map((m) => {
                const got = stats.lifetime / 60 >= m;
                return (
                  <div key={m} className={cn('flex flex-col items-center gap-1 rounded-xl border p-3', got ? 'border-fg bg-accent text-accent-fg' : 'border-dashed border-line text-muted')}>
                    <Medal size={22} />
                    <span className="text-2xl font-bold leading-none">{m}h</span>
                  </div>
                );
              })}
            </div>
          </section>

          <section>
            <SectionLabel>Log</SectionLabel>
            {logs?.length ? (
              <ul className="grid grid-cols-1 gap-2">
                {logs.map((l) => {
                  const c = INTERESTS[l.category];
                  return (
                    <li key={l.id} className="card flex items-center gap-3 p-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-elev"><c.icon size={18} /></span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2 font-semibold">{c.label}{l.volunteer && <Badge tone="accent">Volunteer</Badge>}</span>
                        <span className="block truncate text-xs text-muted">{format(l.date, 'MMM d')}{l.placeName && ` · ${l.placeName}`}{l.note && ` · ${l.note}`}</span>
                      </span>
                      <span className="text-xl font-bold">{hrs(l.minutes)}h</span>
                      <button aria-label="Delete log" onClick={async () => { await ds.deleteLog(l.id); reload(); }} className="no-print flex h-10 w-10 items-center justify-center rounded-lg text-muted hover:bg-elev hover:text-danger"><Trash2 size={16} /></button>
                    </li>
                  );
                })}
              </ul>
            ) : <EmptyState icon={Timer} text="No activity yet" />}
          </section>
          <p className="mt-6 text-xs text-muted">All hours are self-reported.</p>
        </>
      )}
      </div>

      <LogSheet value={form} onClose={() => setForm(null)} onSave={async (l) => { await ds.addLog(l); setForm(null); reload(); toast('Logged'); }} />
    </div>
  );
}

function LogSheet({ value, onClose, onSave }: { value: Partial<ActivityLog> | null; onClose: () => void; onSave: (l: Omit<ActivityLog, 'id' | 'createdAt'>) => Promise<void> }) {
  const [v, setV] = useState<Partial<ActivityLog>>({});
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (value) setV(value); }, [value]);
  const set = (p: Partial<ActivityLog>) => setV((x) => ({ ...x, ...p }));
  const h = Math.floor((v.minutes ?? 0) / 60);
  const m = (v.minutes ?? 0) % 60;
  const valid = (v.minutes ?? 0) > 0 && (v.minutes ?? 0) <= 24 * 60 && v.date && v.date <= Date.now() + 864e5 && differenceInCalendarDays(Date.now(), v.date) < 400;
  return (
    <Sheet open={!!value} onClose={onClose} title="Log activity">
      <div className="grid grid-cols-1 gap-4">
        <FormField label="Date"><input type="date" className="field" value={v.date ? format(v.date, 'yyyy-MM-dd') : ''} max={format(Date.now(), 'yyyy-MM-dd')} onChange={(e) => set({ date: new Date(`${e.target.value}T12:00`).getTime() })} /></FormField>
        <FormField label="Category">
          <select className="field" value={v.category} onChange={(e) => { const c = e.target.value as Interest; set({ category: c, volunteer: VOLUNTEER_CATS.includes(c) || v.volunteer }); }}>
            {INTEREST_KEYS.map((k) => <option key={k} value={k}>{INTERESTS[k].label}</option>)}
          </select>
        </FormField>
        <FormField label="Place"><input className="field" maxLength={80} value={v.placeName ?? ''} onChange={(e) => set({ placeName: e.target.value })} placeholder="Kissena Park" /></FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Hours"><input className="field" inputMode="numeric" value={h} onChange={(e) => set({ minutes: Math.min(24, Number(e.target.value.replace(/\D/g, '')) || 0) * 60 + m })} /></FormField>
          <FormField label="Minutes"><input className="field" inputMode="numeric" value={m} onChange={(e) => set({ minutes: h * 60 + Math.min(59, Number(e.target.value.replace(/\D/g, '')) || 0) })} /></FormField>
        </div>
        <FormField label="Note"><input className="field" maxLength={140} value={v.note ?? ''} onChange={(e) => set({ note: e.target.value })} /></FormField>
        <Toggle label="Volunteer hours" checked={!!v.volunteer} onChange={(volunteer) => set({ volunteer })} />
        <Button loading={busy} disabled={!valid} onClick={async () => {
          setBusy(true);
          await onSave({ date: v.date!, category: v.category ?? 'fitness', placeName: v.placeName ?? '', minutes: v.minutes!, note: v.note ?? '', volunteer: !!v.volunteer, ...(v.eventId ? { eventId: v.eventId } : {}) });
          setBusy(false);
        }}>Save</Button>
      </div>
    </Sheet>
  );
}
