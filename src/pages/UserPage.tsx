import { useParams } from 'react-router-dom';
import { BadgeCheck, Ban, Lock, UserRound } from 'lucide-react';
import { useApp } from '@/store/app';
import { useAsync } from '@/lib/hooks';
import { format } from 'date-fns';
import { Badge, Button, Card, EmptyState, Skeleton } from '@/components/ui';
import { ReportButton } from '@/components/bits';
import { EventCard } from '@/components/EventCard';
import { isHidden } from '@/lib/recommend';

export default function UserPage() {
  const { uid = '' } = useParams();
  const { ds, user, requireAuth, toast } = useApp();
  const { data: p, loading } = useAsync(() => ds.getPublicProfile(uid), [ds, uid]);
  const { data: events } = useAsync(() => ds.listEvents(), [ds]);
  if (loading) return <Skeleton className="h-40" />;
  if (!p) return <EmptyState icon={UserRound} text="User not found" />;
  const blocked = user?.blocked.includes(uid);
  const theirs = (events ?? []).filter((e) => e.hostId === uid && e.end > Date.now() && !e.cancelled && !isHidden(e));

  return (
    <div className="mx-auto max-w-3xl">
      <Card className="mb-6 flex flex-wrap items-center gap-4 p-5">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-accent text-3xl font-bold text-accent-fg">{p.username[0]}</span>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-3xl">@{p.username}</h1>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {p.verifiedOrg && <Badge tone="accent"><BadgeCheck size={12} /> {p.verifiedOrg}</Badge>}
            {!p.minor && <Badge>Since {format(p.createdAt, 'MMM yyyy')}</Badge>}
          </div>
        </div>
        {user?.uid !== uid && (
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" icon={Ban} onClick={async () => {
              if (!requireAuth()) return;
              if (blocked) await ds.unblockUser(uid); else await ds.blockUser(uid);
              toast(blocked ? 'Unblocked' : 'Blocked');
            }}>{blocked ? 'Unblock' : 'Block'}</Button>
            <ReportButton targetType="user" targetId={uid} targetLabel={`@${p.username}`} />
          </div>
        )}
      </Card>
      {p.minor ? (
        <EmptyState icon={Lock} text="Private profile" />
      ) : blocked ? (
        <EmptyState icon={Ban} text="You blocked this user" />
      ) : theirs.length ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{theirs.map((e) => <EventCard key={e.id} e={e} />)}</div>
      ) : <p className="text-muted">No upcoming events.</p>}
    </div>
  );
}
