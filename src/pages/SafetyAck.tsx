import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Eye, Flag, Home, MapPin, Phone, Users } from 'lucide-react';
import { useApp } from '@/store/app';
import { Button } from '@/components/ui';

export const SAFETY_RULES = [
  { icon: MapPin, text: 'Public places only' },
  { icon: Eye, text: 'Tell someone your plans' },
  { icon: Users, text: 'Bring a friend' },
  { icon: Home, text: 'Never share your address' },
  { icon: Flag, text: 'Report problems' },
  { icon: Phone, text: 'Emergency? Call 911' },
];

export default function SafetyAck() {
  const { user, ds } = useApp();
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);
  if (!user) return <Navigate to="/login" replace />;
  const ok = async () => {
    setBusy(true);
    await ds.updateProfile({ safetyAck: true });
    nav(user.onboarded ? '/' : '/onboarding', { replace: true });
  };
  return (
    <div className="mx-auto max-w-md py-4">
      <p className="label mb-2">Before you go</p>
      <h1 className="mb-6 text-3xl">Play safe</h1>
      <ul className="mb-8 grid gap-2">
        {SAFETY_RULES.map(({ icon: Icon, text }) => (
          <li key={text} className="card flex items-center gap-3 p-4 text-lg font-semibold">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-accent-fg"><Icon size={20} /></span>
            {text}
          </li>
        ))}
      </ul>
      <Button size="lg" className="w-full" loading={busy} onClick={ok}>I understand</Button>
    </div>
  );
}
