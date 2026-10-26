import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { useApp } from '@/store/app';
import { Button } from '@/components/ui';
import { QUESTIONS } from '@/components/PrefsQuestions';
import type { Prefs } from '@/types';

export default function Onboarding() {
  const { user, prefs: initial, ds, setGuestPrefs } = useApp();
  const nav = useNavigate();
  const [i, setI] = useState(0);
  const [prefs, setPrefs] = useState<Prefs>(initial);
  const q = QUESTIONS[i];
  const last = i === QUESTIONS.length - 1;

  const finish = async (p: Prefs) => {
    if (user) await ds.updateProfile({ prefs: p, onboarded: true });
    else setGuestPrefs(p);
    nav('/', { replace: true });
  };

  return (
    <div className="mx-auto flex min-h-[70dvh] max-w-md flex-col py-2">
      <div className="mb-6 flex items-center gap-3">
        <button onClick={() => setI(Math.max(0, i - 1))} disabled={i === 0} aria-label="Back" className="flex h-11 w-11 items-center justify-center rounded-xl border border-line disabled:opacity-30"><ArrowLeft size={20} /></button>
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-elev" role="progressbar" aria-valuenow={i + 1} aria-valuemin={1} aria-valuemax={QUESTIONS.length} aria-label="Progress">
          <motion.div className="h-full rounded-full bg-accent" animate={{ width: `${((i + 1) / QUESTIONS.length) * 100}%` }} transition={{ duration: 0.2 }} />
        </div>
        <button onClick={() => finish(prefs)} className="h-11 px-2 text-sm font-bold text-muted hover:text-fg">Skip</button>
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={q.key} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.18 }} className="flex-1">
          <p className="label mb-1">{i + 1} / {QUESTIONS.length}</p>
          <h1 className="mb-6 text-3xl">{q.title}</h1>
          <q.C prefs={prefs} set={(p) => setPrefs((x) => ({ ...x, ...p }))} />
        </motion.div>
      </AnimatePresence>
      <Button size="lg" className="mt-8 w-full" onClick={() => (last ? finish(prefs) : setI(i + 1))}>{last ? 'Done' : 'Next'}</Button>
    </div>
  );
}
