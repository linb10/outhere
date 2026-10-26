import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2, UserX } from 'lucide-react';
import type { Prefs, PublicProfile } from '@/types';
import { useApp } from '@/store/app';
import { QUESTIONS } from '@/components/PrefsQuestions';
import { Button, Card, PageTitle, SectionLabel, Toggle } from '@/components/ui';

export default function Settings() {
  const { user, prefs: initial, ds, setGuestPrefs, theme, toggleTheme, toast } = useApp();
  const nav = useNavigate();
  const [prefs, setPrefs] = useState<Prefs>(initial);
  const [busy, setBusy] = useState(false);
  const [blocked, setBlocked] = useState<PublicProfile[]>([]);

  useEffect(() => {
    if (!user?.blocked.length) return setBlocked([]);
    Promise.all(user.blocked.map((id) => ds.getPublicProfile(id))).then((r) => setBlocked(r.filter(Boolean) as PublicProfile[]));
  }, [user?.blocked, ds]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = async () => {
    setBusy(true);
    if (user) await ds.updateProfile({ prefs, onboarded: true });
    else setGuestPrefs(prefs);
    setBusy(false);
    toast('Saved');
  };

  const del = async () => {
    if (!confirm('Delete your account and all your data? This can’t be undone.')) return;
    try {
      await ds.deleteAccount();
      toast('Account deleted');
      nav('/');
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <PageTitle>Settings</PageTitle>
      <Card className="mb-8 px-4">
        <Toggle label="Dark mode" checked={theme === 'dark'} onChange={toggleTheme} />
      </Card>

      <div className="space-y-8">
        {QUESTIONS.map(({ key, title, C }) => (
          <section key={key}>
            <SectionLabel>{title.replace('?', '')}</SectionLabel>
            <C prefs={prefs} set={(p) => setPrefs((x) => ({ ...x, ...p }))} />
          </section>
        ))}
      </div>
      <div className="sticky bottom-20 z-10 mt-8 md:bottom-4"><Button size="lg" className="w-full" loading={busy} onClick={save}>Save preferences</Button></div>

      {user && (
        <>
          <section className="mt-10">
            <SectionLabel>Blocked</SectionLabel>
            {blocked.length ? (
              <ul className="grid grid-cols-1 gap-2">
                {blocked.map((b) => (
                  <li key={b.uid} className="card flex items-center justify-between p-3">
                    <span className="font-semibold">@{b.username}</span>
                    <Button size="sm" variant="outline" icon={UserX} onClick={() => ds.unblockUser(b.uid)}>Unblock</Button>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-muted">No one blocked.</p>}
          </section>
          <section className="mt-10 border-t border-line pt-6">
            <SectionLabel>Account</SectionLabel>
            <p className="mb-3 text-sm text-muted">{user.email}</p>
            <Button variant="danger" icon={Trash2} onClick={del}>Delete account</Button>
          </section>
        </>
      )}
    </div>
  );
}
