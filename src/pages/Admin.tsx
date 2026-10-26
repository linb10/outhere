import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { BadgeCheck, Check, EyeOff, Flag, Inbox, Trash2, UserX, X } from 'lucide-react';
import { useApp } from '@/store/app';
import { useAsync } from '@/lib/hooks';
import { ago, cn } from '@/lib/utils';
import { Badge, Button, Card, EmptyState, ErrorState, PageTitle, Segmented, Skeleton } from '@/components/ui';

export default function Admin() {
  const { user, ds, toast } = useApp();
  const [tab, setTab] = useState<'reports' | 'orgs'>('reports');
  const stats = useAsync(() => ds.adminStats(), [ds]);
  const reports = useAsync(() => ds.listReports(), [ds]);
  const orgs = useAsync(() => ds.listOrgRequests(), [ds]);
  if (!user || user.role !== 'admin') return <Navigate to="/" replace />;

  const act = async (fn: () => Promise<void>, msg: string) => {
    try {
      await fn();
      toast(msg);
      reports.reload(); orgs.reload(); stats.reload();
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  };

  const open = (reports.data ?? []).filter((r) => r.status === 'open');
  const pending = (orgs.data ?? []).filter((o) => o.status === 'pending');

  return (
    <div>
      <PageTitle>Admin</PageTitle>
      <div className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-5">
        {stats.data ? ([
          ['Users', stats.data.users], ['Upcoming', stats.data.events], ['Reports', stats.data.openReports],
          ['Pending orgs', stats.data.pendingOrgs], ['Here now', stats.data.checkInsToday],
        ] as const).map(([l, n]) => (
          <Card key={l} className="p-4"><p className="label">{l}</p><p className="text-4xl font-bold leading-none">{n}</p></Card>
        )) : Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-20" />)}
      </div>

      <div className="mb-5 max-w-sm"><Segmented label="Queue" value={tab} onChange={setTab} options={[{ value: 'reports', label: `Reports · ${open.length}` }, { value: 'orgs', label: `Orgs · ${pending.length}` }]} /></div>

      {tab === 'reports' ? (
        reports.error ? <ErrorState onRetry={reports.reload} /> : !reports.data ? <Skeleton className="h-40" /> : reports.data.length ? (
          <ul className="grid grid-cols-1 gap-3">
            {reports.data.map((r) => (
              <li key={r.id} className={cn('card p-4', r.status !== 'open' && 'opacity-60')}>
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <Badge tone="danger"><Flag size={12} /> {r.reason}</Badge>
                  <Badge>{r.targetType}</Badge>
                  {r.status !== 'open' && <Badge tone="solid">{r.status}</Badge>}
                  <span className="ml-auto text-xs text-muted">{ago(r.createdAt)}</span>
                </div>
                <p className="font-semibold">
                  {r.targetType === 'user' ? <Link className="underline" to={`/u/${r.targetId}`}>{r.targetLabel}</Link> : <Link className="underline" to={`/events/${r.targetId}`}>{r.targetLabel}</Link>}
                </p>
                {r.note && <p className="mt-1 text-sm text-muted">“{r.note}”</p>}
                {r.status === 'open' && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" icon={X} onClick={() => act(() => ds.resolveReport(r.id, 'dismiss'), 'Dismissed')}>Dismiss</Button>
                    {r.targetType !== 'user' && <Button size="sm" variant="outline" icon={EyeOff} onClick={() => act(() => ds.resolveReport(r.id, 'hide'), 'Hidden')}>Hide</Button>}
                    {r.targetType !== 'user' && <Button size="sm" variant="outline" icon={Trash2} onClick={() => confirm('Delete permanently?') && act(() => ds.resolveReport(r.id, 'delete'), 'Deleted')}>Delete</Button>}
                    <Button size="sm" variant="danger" icon={UserX} onClick={() => confirm('Suspend this user?') && act(() => ds.resolveReport(r.id, 'suspend'), 'Suspended')}>Suspend</Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        ) : <EmptyState icon={Inbox} text="No reports" />
      ) : orgs.error ? <ErrorState onRetry={orgs.reload} /> : !orgs.data ? <Skeleton className="h-40" /> : orgs.data.length ? (
        <ul className="grid grid-cols-1 gap-3">
          {orgs.data.map((o) => (
            <li key={o.id} className={cn('card p-4', o.status !== 'pending' && 'opacity-60')}>
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <span className="text-xl font-bold">{o.orgName}</span>
                <Badge>{o.type}</Badge>
                {o.status !== 'pending' && <Badge tone={o.status === 'approved' ? 'accent' : 'solid'}>{o.status}</Badge>}
              </div>
              <p className="text-sm text-muted">@{o.username} · {o.role} · {o.email}</p>
              <a href={o.website} target="_blank" rel="noreferrer noopener" className="text-sm font-semibold underline">{o.website}</a>
              {o.status === 'pending' && (
                <div className="mt-3 flex gap-2">
                  <Button size="sm" icon={Check} onClick={() => act(() => ds.resolveOrgRequest(o.id, true), 'Approved')}>Approve</Button>
                  <Button size="sm" variant="outline" icon={X} onClick={() => act(() => ds.resolveOrgRequest(o.id, false), 'Rejected')}>Reject</Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      ) : <EmptyState icon={BadgeCheck} text="No requests" />}
    </div>
  );
}
