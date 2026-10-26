import { Link, useNavigate } from 'react-router-dom';
import { BadgeCheck, CalendarDays, ChevronRight, FileText, LogIn, LogOut, Settings, Shield, ShieldCheck, Star, Users } from 'lucide-react';
import { useApp } from '@/store/app';
import { useAsync } from '@/lib/hooks';
import { fmtWhen, isMinor } from '@/lib/utils';
import { Badge, Button, Card, EmptyState, PageTitle, SectionLabel } from '@/components/ui';
import { INTERESTS } from '@/lib/categories';

export default function Profile() {
  const { user, ds, rsvps } = useApp();
  const nav = useNavigate();
  const { data: events } = useAsync(() => ds.listEvents(), [ds]);
  const { data: orgReq } = useAsync(() => ds.myOrgRequest(), [ds, user?.uid]);

  if (!user) return (
    <div>
      <PageTitle>Profile</PageTitle>
      <EmptyState icon={Users} text="Sign in to save, RSVP and host" action={<Button size="sm" icon={LogIn} onClick={() => nav('/login')}>Sign in</Button>} />
      <Links />
    </div>
  );

  const going = (events ?? []).filter((e) => rsvps.some((r) => r.eventId === e.id) && e.end > Date.now()).sort((a, b) => a.start - b.start);
  const hosting = (events ?? []).filter((e) => e.hostId === user.uid && e.end > Date.now());

  return (
    <div>
      <PageTitle>Profile</PageTitle>
      <Card className="mb-6 flex items-center gap-4 p-5">
        <span className="flex h-16 w-16 items-center justify-center rounded-xl bg-accent text-3xl font-bold text-accent-fg">{user.username[0]}</span>
        <div className="min-w-0">
          <p className="truncate text-3xl font-bold leading-none">@{user.username}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {user.verifiedOrg && <Badge tone="accent"><BadgeCheck size={12} /> {user.verifiedOrg}</Badge>}
            {user.role === 'admin' && <Badge tone="solid">Admin</Badge>}
            {isMinor(user.birthYear) && <Badge>Private profile</Badge>}
            <Badge>{user.prefs.borough}</Badge>
          </div>
        </div>
      </Card>

      {!ds.emailVerified() && (
        <Card className="mb-6 flex items-center justify-between gap-3 p-4">
          <span className="font-semibold">Verify your email</span>
          <Button size="sm" variant="outline" onClick={() => ds.sendVerification()}>Resend</Button>
        </Card>
      )}

      {user.prefs.interests.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-1.5">
          {user.prefs.interests.map((i) => <Badge key={i}>{INTERESTS[i].label}</Badge>)}
        </div>
      )}

      <div className="mb-8 grid gap-6 md:grid-cols-2">
        <section>
          <SectionLabel>Going</SectionLabel>
          {going.length ? <EventList list={going} /> : <p className="text-sm text-muted">No RSVPs yet.</p>}
        </section>
        <section>
          <SectionLabel>Hosting</SectionLabel>
          {hosting.length ? <EventList list={hosting} /> : <p className="text-sm text-muted">Not hosting anything.</p>}
        </section>
      </div>

      <nav className="card mb-6 divide-y divide-line overflow-hidden">
        <Row to="/favorites" icon={Star} label="Saved" />
        <Row to="/settings" icon={Settings} label="Settings" />
        {!user.verifiedOrg && <Row to="/verify-org" icon={BadgeCheck} label={orgReq?.status === 'pending' ? 'Verification pending' : 'Get verified'} />}
        {user.role === 'admin' && <Row to="/admin" icon={Shield} label="Admin" />}
      </nav>
      <Links />
      <Button variant="outline" icon={LogOut} className="mt-6 w-full" onClick={async () => { await ds.signOut(); nav('/'); }}>Sign out</Button>
    </div>
  );
}

function EventList({ list }: { list: { id: string; title: string; start: number }[] }) {
  return (
    <ul className="grid grid-cols-1 gap-2">
      {list.slice(0, 5).map((e) => (
        <li key={e.id}>
          <Link to={`/events/${e.id}`} className="card flex items-center gap-3 p-3 hover:shadow-float">
            <CalendarDays size={18} className="shrink-0 text-muted" />
            <span className="min-w-0 flex-1"><span className="block truncate font-semibold">{e.title}</span><span className="text-xs text-muted">{fmtWhen(e.start)}</span></span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function Row({ to, icon: Icon, label }: { to: string; icon: typeof Star; label: string }) {
  return (
    <Link to={to} className="flex min-h-[56px] items-center gap-3 px-4 font-semibold hover:bg-elev">
      <Icon size={20} className="text-muted" /> {label} <ChevronRight size={18} className="ml-auto text-muted" />
    </Link>
  );
}

function Links() {
  return (
    <nav className="card divide-y divide-line overflow-hidden" aria-label="Help">
      <Row to="/safety" icon={ShieldCheck} label="Safety Center" />
      <Row to="/guidelines" icon={Users} label="Community Guidelines" />
      <Row to="/privacy" icon={FileText} label="Privacy" />
    </nav>
  );
}
