import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Shield, User as UserIcon } from 'lucide-react';
import { useApp } from '@/store/app';
import { Button, FormField } from '@/components/ui';
import { LogoMark } from '@/components/Logo';
import { DEMO_ACCOUNTS } from '@/data/seed';
import { USERNAME_RE } from '@/services/DataService';

type Mode = 'login' | 'signup' | 'reset' | 'complete';
const YEAR = new Date().getFullYear();

const username = z.string().regex(USERNAME_RE, '3–20 letters, numbers or _');
const birthYear = z.coerce.number({ invalid_type_error: 'Enter a year' }).int().min(YEAR - 110, 'Check year').max(YEAR, 'Check year')
  .refine((y) => YEAR - y >= 13, 'You must be 13 or older');
const schemas = {
  login: z.object({ identifier: z.string().min(3, 'Required'), password: z.string().min(1, 'Required') }),
  signup: z.object({ username, email: z.string().email('Invalid email'), password: z.string().min(8, '8+ characters'), birthYear }),
  reset: z.object({ email: z.string().email('Invalid email') }),
  complete: z.object({ username, birthYear }),
};
type Values = { identifier?: string; password?: string; username?: string; email?: string; birthYear?: number };

const TITLES: Record<Mode, string> = { login: 'Sign in', signup: 'Join', reset: 'Reset password', complete: 'Finish profile' };

export default function Auth({ mode }: { mode: Mode }) {
  const { ds, toast } = useApp();
  const nav = useNavigate();
  const loc = useLocation();
  const from = (loc.state as { from?: string } | null)?.from ?? '/';
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<Values>({ resolver: zodResolver(schemas[mode] as z.ZodType<Values>) });

  const run = async (key: string, fn: () => Promise<void>, to = from) => {
    setBusy(key);
    setError(null);
    try {
      await fn();
      nav(to, { replace: true });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const onSubmit = (v: Values) => {
    if (mode === 'login') return run('form', () => ds.signIn(v.identifier!, v.password!));
    if (mode === 'signup') return run('form', async () => { await ds.signUp({ username: v.username!, email: v.email!, password: v.password!, birthYear: v.birthYear! }); toast('Check your email to verify'); }, '/safety-ack');
    if (mode === 'complete') return run('form', () => ds.completeProfile(v.username!, v.birthYear!), '/safety-ack');
    return (async () => {
      setBusy('form');
      await ds.resetPassword(v.email!).catch(() => {}); // same response either way; don't leak which emails exist
      setSent(true);
      setBusy(null);
    })();
  };

  const demo = (k: 'user' | 'admin') => run(k, () => ds.signIn(DEMO_ACCOUNTS[k].email, DEMO_ACCOUNTS[k].password), k === 'admin' ? '/admin' : '/');

  return (
    <div className="mx-auto max-w-sm py-4">
      <LogoMark size={44} className="mb-5" />
      <h1 className="mb-6 text-3xl">{TITLES[mode]}</h1>

      {mode === 'reset' && sent ? (
        <p className="card p-4 font-semibold">If that email has an account, a reset link is on its way.</p>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-4" noValidate>
          {mode === 'login' && (
            <>
              <FormField label="Username or email" error={errors.identifier?.message}>
                <input className="field" autoComplete="username" autoCapitalize="none" {...register('identifier')} />
              </FormField>
              <FormField label="Password" error={errors.password?.message}>
                <input className="field" type="password" autoComplete="current-password" {...register('password')} />
              </FormField>
            </>
          )}
          {(mode === 'signup' || mode === 'complete') && (
            <FormField label="Username" error={errors.username?.message} hint="Public. No real names needed.">
              <input className="field" autoComplete="username" autoCapitalize="none" {...register('username')} />
            </FormField>
          )}
          {(mode === 'signup' || mode === 'reset') && (
            <FormField label="Email" error={errors.email?.message}>
              <input className="field" type="email" autoComplete="email" {...register('email')} />
            </FormField>
          )}
          {mode === 'signup' && (
            <FormField label="Password" error={errors.password?.message}>
              <input className="field" type="password" autoComplete="new-password" {...register('password')} />
            </FormField>
          )}
          {(mode === 'signup' || mode === 'complete') && (
            <FormField label="Birth year" error={errors.birthYear?.message} hint="13+ only. Never shown.">
              <input className="field" inputMode="numeric" placeholder="YYYY" maxLength={4} {...register('birthYear')} />
            </FormField>
          )}
          {error && <p role="alert" className="rounded-xl bg-danger/10 px-3 py-2.5 text-sm font-semibold text-danger">{error}</p>}
          <Button type="submit" size="lg" loading={busy === 'form'}>
            {mode === 'login' ? 'Sign in' : mode === 'reset' ? 'Send link' : mode === 'complete' ? 'Continue' : 'Create account'}
          </Button>
        </form>
      )}

      {(mode === 'login' || mode === 'signup') && (
        <>
          <div className="my-5 flex items-center gap-3 text-xs font-bold text-muted"><span className="h-px flex-1 bg-line" />or<span className="h-px flex-1 bg-line" /></div>
          <Button variant="outline" className="w-full" loading={busy === 'google'} onClick={() => run('google', () => ds.signInGoogle())}>
            <GoogleG /> Continue with Google
          </Button>
        </>
      )}

      {mode === 'login' && (
        <div className="mt-6 rounded-xl border border-dashed border-line p-4">
          <p className="label mb-3">For judges</p>
          <div className="grid grid-cols-2 gap-3">
            <Button variant="secondary" size="sm" icon={UserIcon} loading={busy === 'user'} onClick={() => demo('user')}>Demo User</Button>
            <Button variant="secondary" size="sm" icon={Shield} loading={busy === 'admin'} onClick={() => demo('admin')}>Demo Admin</Button>
          </div>
        </div>
      )}

      <div className="mt-6 flex flex-wrap justify-between gap-2 text-sm font-semibold">
        {mode === 'login' && <><Link to="/signup" className="underline underline-offset-2">Create account</Link><Link to="/reset" className="text-muted underline underline-offset-2">Forgot password?</Link></>}
        {mode === 'signup' && <Link to="/login" className="underline underline-offset-2">Have an account? Sign in</Link>}
        {mode === 'reset' && <Link to="/login" className="underline underline-offset-2">Back to sign in</Link>}
        {mode === 'complete' && <button onClick={() => ds.signOut()} className="text-muted underline underline-offset-2">Cancel</button>}
      </div>
      {mode === 'signup' && <p className="mt-4 text-xs text-muted">By joining you agree to the <Link to="/guidelines" className="underline">Guidelines</Link> and <Link to="/privacy" className="underline">Privacy</Link>.</p>}
    </div>
  );
}

const GoogleG = () => (
  <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
    <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
  </svg>
);
