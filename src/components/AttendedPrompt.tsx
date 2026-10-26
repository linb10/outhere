import { useEffect, useState } from 'react';
import { useApp } from '@/store/app';
import type { OutEvent } from '@/types';
import { VOLUNTEER_CATS } from '@/lib/categories';
import { Button, Sheet } from './ui';

/** After a "going" event ends, ask once whether the user attended and pre-fill a log. */
export function AttendedPrompt() {
  const { ds, rsvps, refreshRsvps, toast } = useApp();
  const [ev, setEv] = useState<OutEvent | null>(null);

  useEffect(() => {
    const pending = rsvps.filter((r) => r.status === 'going' && !r.promptHandled);
    let alive = true;
    (async () => {
      for (const r of pending) {
        const e = await ds.getEvent(r.eventId);
        if (e && e.end < Date.now() && !e.cancelled) {
          if (alive) setEv(e);
          return;
        }
      }
    })();
    return () => { alive = false; };
  }, [rsvps, ds]);

  if (!ev) return null;
  const close = async (attended: boolean) => {
    if (attended) {
      await ds.addLog({ date: ev.start, category: ev.category, placeName: ev.placeName, minutes: Math.round((ev.end - ev.start) / 60000), note: ev.title, volunteer: VOLUNTEER_CATS.includes(ev.category), eventId: ev.id });
      toast('Logged');
    }
    await ds.markRsvpPrompted(ev.id);
    setEv(null);
    refreshRsvps();
  };
  return (
    <Sheet open onClose={() => close(false)} title="Attended?">
      <p className="mb-5 font-semibold">{ev.title}</p>
      <div className="grid grid-cols-2 gap-3">
        <Button variant="outline" onClick={() => close(false)}>No</Button>
        <Button onClick={() => close(true)}>Yes, log it</Button>
      </div>
    </Sheet>
  );
}
