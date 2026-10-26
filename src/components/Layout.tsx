import { Suspense, useEffect } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Activity, Compass, Home, LogIn, Map, Moon, Plus, Shield, Star, Sun, User } from 'lucide-react';
import { useApp } from '@/store/app';
import { cn } from '@/lib/utils';
import { LogoMark } from './Logo';
import { Button, IconButton, Sheet } from './ui';
import { PageFallback } from './PageFallback';
import { AttendedPrompt } from './AttendedPrompt';

const NAV = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/explore', label: 'Explore', icon: Map },
  { to: '/discover', label: 'Discover', icon: Compass },
  { to: '/activity', label: 'Activity', icon: Activity },
  { to: '/profile', label: 'Profile', icon: User },
];

const FLOW_PAGES = ['/complete-profile', '/safety-ack', '/onboarding', '/login', '/signup', '/reset'];

export function Layout() {
  const { user, needsProfile, ds, theme, toggleTheme, toasts, authPrompt, setAuthPrompt } = useApp();
  const loc = useLocation();
  const nav = useNavigate();
  const fullBleed = loc.pathname === '/explore';

  // Route new accounts through profile → safety → onboarding.
  useEffect(() => {
    if (FLOW_PAGES.includes(loc.pathname)) return;
    if (needsProfile) nav('/complete-profile', { replace: true });
    else if (user && !user.safetyAck) nav('/safety-ack', { replace: true });
    else if (user && !user.onboarded) nav('/onboarding', { replace: true });
  }, [user, needsProfile, loc.pathname, nav]);

  useEffect(() => { if (!fullBleed) window.scrollTo(0, 0); }, [loc.pathname, fullBleed]);

  const ThemeIcon = theme === 'dark' ? Sun : Moon;

  return (
    <div className="min-h-dvh md:pl-[76px] print:pl-0">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:rounded-lg focus:bg-accent focus:px-3 focus:py-2 focus:text-accent-fg">Skip to content</a>

      {/* Desktop icon rail (Google Maps style) */}
      <aside className="no-print fixed inset-y-0 left-0 z-30 hidden w-[76px] flex-col items-center border-r border-line bg-card py-3 md:flex">
        <Link to="/" className="mb-4" aria-label="OutHere home"><LogoMark size={36} /></Link>
        <button onClick={() => nav('/events/new')} aria-label="Create event" title="Create event" className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-accent-fg shadow-float"><Plus size={24} /></button>
        <nav className="flex flex-col gap-1" aria-label="Main">
          {[...NAV, { to: '/favorites', label: 'Saved', icon: Star, end: false }, ...(user?.role === 'admin' ? [{ to: '/admin', label: 'Admin', icon: Shield, end: false }] : [])].map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => cn('group flex w-[68px] flex-col items-center gap-1 py-1.5 text-[11px] font-medium', isActive ? 'text-accent-ink' : 'text-muted hover:text-fg')}>
              {({ isActive }) => (
                <>
                  <span className={cn('flex h-8 w-14 items-center justify-center rounded-full transition-colors', isActive ? 'bg-accent/15' : 'group-hover:bg-elev')}><Icon size={20} /></span>
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto flex flex-col items-center gap-2">
          {ds.mode === 'demo' && <span className="text-[10px] font-bold text-muted" title="No backend configured. Data stays in this browser.">DEMO</span>}
          <IconButton label={theme === 'dark' ? 'Light mode' : 'Dark mode'} icon={ThemeIcon} onClick={toggleTheme} />
          <Link to="/safety" className="text-[11px] font-medium text-muted hover:text-fg">Safety</Link>
        </div>
      </aside>

      {/* Mobile header */}
      {!fullBleed && (
        <header className="no-print pt-safe sticky top-0 z-30 border-b border-line bg-card md:hidden">
          <div className="flex h-14 items-center gap-2 px-4">
            <Link to="/" aria-label="OutHere home" className="flex items-center gap-2">
              <LogoMark size={28} />
              <span className="text-xl font-bold">OutHere</span>
            </Link>
            {ds.mode === 'demo' && <DemoPill />}
            <div className="ml-auto flex items-center gap-2">
              <IconButton label={theme === 'dark' ? 'Light mode' : 'Dark mode'} icon={ThemeIcon} onClick={toggleTheme} className="h-10 w-10" />
              {!user && <IconButton label="Sign in" icon={LogIn} onClick={() => nav('/login')} className="h-10 w-10" />}
            </div>
          </div>
        </header>
      )}

      <main id="main" className={cn(fullBleed ? '' : 'mx-auto max-w-6xl px-4 pb-28 pt-5 md:px-8 md:pb-12 md:pt-8')}>
        <Suspense fallback={<PageFallback />}>
          <Outlet />
        </Suspense>
      </main>

      {/* Mobile tab bar */}
      <nav aria-label="Main" className="no-print pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-line bg-card md:hidden">
        <div className="grid h-16 grid-cols-6 items-center">
          {NAV.slice(0, 2).map((n) => <Tab key={n.to} {...n} />)}
          <div className="flex justify-center">
            <Link to="/events/new" aria-label="Create event" className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-accent-fg shadow-float">
              <Plus size={24} />
            </Link>
          </div>
          {NAV.slice(2).map((n) => <Tab key={n.to} {...n} />)}
        </div>
      </nav>

      <Sheet open={authPrompt} onClose={() => setAuthPrompt(false)} title="Sign in first">
        <p className="mb-5 text-muted">Free account. Takes a minute.</p>
        <div className="grid grid-cols-1 gap-3">
          <Button onClick={() => { setAuthPrompt(false); nav('/login', { state: { from: loc.pathname } }); }}>Sign in</Button>
          <Button variant="outline" onClick={() => { setAuthPrompt(false); nav('/signup'); }}>Create account</Button>
        </div>
      </Sheet>

      {user && <AttendedPrompt />}

      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex flex-col items-center gap-2 px-4 md:bottom-6">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div key={t.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
              className={cn('rounded-xl px-4 py-3 text-sm font-semibold shadow-lg', t.tone === 'error' ? 'bg-danger text-white' : 'bg-[#323232] text-white')}>
              {t.text}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

function Tab({ to, label, icon: Icon, end }: (typeof NAV)[number]) {
  return (
    <NavLink to={to} end={end} className={({ isActive }) => cn('flex h-full flex-col items-center justify-center gap-0.5 text-[11px] font-medium', isActive ? 'text-accent-ink' : 'text-muted')}>
      {({ isActive }) => (
        <>
          <span className={cn('flex h-7 w-12 items-center justify-center rounded-full', isActive && 'bg-accent/15')}><Icon size={20} /></span>
          {label}
        </>
      )}
    </NavLink>
  );
}

function DemoPill() {
  return <span className="rounded-full border border-line px-2 py-0.5 text-[11px] font-bold text-muted" title="No backend configured. Data stays in this browser.">Demo mode</span>;
}
