import { Phone } from 'lucide-react';
import { PageTitle, SectionLabel } from '@/components/ui';
import { SAFETY_RULES } from './SafetyAck';

const LINES = [
  { n: '911', label: 'Emergency' },
  { n: '311', label: 'City services' },
  { n: '988', label: 'Crisis line' },
];

const List = ({ items }: { items: string[] }) => (
  <ul className="grid grid-cols-1 gap-2">{items.map((t) => <li key={t} className="card p-4 font-medium">{t}</li>)}</ul>
);

export default function Info({ page }: { page: 'safety' | 'guidelines' | 'privacy' }) {
  if (page === 'safety') return (
    <div className="mx-auto max-w-2xl space-y-8">
      <PageTitle>Safety</PageTitle>
      <section className="grid grid-cols-3 gap-2">
        {LINES.map((l) => (
          <a key={l.n} href={`tel:${l.n}`} className="flex flex-col items-center gap-1 rounded-xl border border-line bg-card p-4 text-fg hover:shadow-float">
            <Phone size={18} className="text-danger" />
            <span className="text-4xl font-bold leading-none">{l.n}</span>
            <span className="text-xs font-bold text-muted">{l.label}</span>
          </a>
        ))}
      </section>
      <section>
        <SectionLabel>Basics</SectionLabel>
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {SAFETY_RULES.map(({ icon: Icon, text }) => <li key={text} className="card flex items-center gap-3 p-4 font-semibold"><Icon size={18} className="text-accent-ink" /> {text}</li>)}
        </ul>
      </section>
      <section>
        <SectionLabel>Under 18</SectionLabel>
        <List items={['Your profile is private', 'You’re hidden from attendee lists', 'Bring a trusted adult to personal events', 'Verified org events are a safer start']} />
      </section>
      <section>
        <SectionLabel>How reporting works</SectionLabel>
        <List items={['Tap Report on any event, photo or profile', '3 reports hide it automatically', 'Admins review every report', 'Repeat offenders are suspended', 'Block anyone from your view']} />
      </section>
      <p className="text-sm text-muted">No direct messages. Plans stay in public events.</p>
    </div>
  );
  if (page === 'guidelines') return (
    <div className="mx-auto max-w-2xl space-y-8">
      <PageTitle>Guidelines</PageTitle>
      <section><SectionLabel>Do</SectionLabel><List items={['Host in public places', 'Describe events honestly', 'Welcome all skill levels', 'Leave places cleaner than you found them']} /></section>
      <section><SectionLabel>Don’t</SectionLabel><List items={['Share addresses, phone numbers or emails', 'Harass, threaten or bully', 'Post spam, scams or ads', 'Post photos of others without consent', 'Host age-restricted activities for minors']} /></section>
      <p className="text-sm text-muted">Breaking these can get content removed or accounts suspended.</p>
    </div>
  );
  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <PageTitle>Privacy</PageTitle>
      <section><SectionLabel>We store</SectionLabel><List items={['Username, email, birth year', 'Your preferences (borough, ZIP, interests)', 'Events, RSVPs, saved items, activity logs', 'Check-ins for 90 minutes']} /></section>
      <section><SectionLabel>We never</SectionLabel><List items={['Sell your data', 'Show your exact location', 'Show who checked in', 'Show your birth year or email']} /></section>
      <section><SectionLabel>You can</SectionLabel><List items={['Edit preferences anytime', 'Export volunteer hours', 'Delete your account and data in Settings']} /></section>
      <p className="text-sm text-muted">Location is used on your device only, to sort by distance and verify check-ins.</p>
    </div>
  );
}
