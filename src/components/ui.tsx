import { forwardRef, useEffect, useRef, type ButtonHTMLAttributes, type ComponentType, type ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { AlertTriangle, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
const VARIANTS: Record<Variant, string> = {
  primary: 'bg-accent text-accent-fg hover:shadow-float active:brightness-95',
  secondary: 'bg-accent/10 text-accent-ink hover:bg-accent/15',
  outline: 'border border-line text-accent-ink hover:bg-accent/5 bg-card',
  ghost: 'text-fg hover:bg-elev',
  danger: 'bg-danger text-white hover:opacity-90',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: ComponentType<{ size?: number | string; className?: string }>;
}
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading, icon: Icon, className, children, disabled, ...p }, ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-full font-bold transition-[filter,opacity,background-color,border-color,box-shadow] disabled:opacity-50 disabled:pointer-events-none select-none',
        size === 'sm' && 'h-10 px-3.5 text-sm',
        size === 'md' && 'h-11 px-5 text-[15px]',
        size === 'lg' && 'h-12 px-6 text-base',
        VARIANTS[variant],
        className,
      )}
      {...p}
    >
      {loading ? <Loader2 size={18} className="animate-spin" /> : Icon && <Icon size={18} />}
      {children}
    </button>
  );
});

export function IconButton({ label, icon: Icon, className, active, ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; icon: ComponentType<{ size?: number | string; className?: string }>; active?: boolean }) {
  return (
    <button aria-label={label} title={label} className={cn('inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-line bg-card text-muted transition-colors hover:bg-elev hover:text-fg', active && 'bg-accent/10 text-accent-ink', className)} {...p}>
      <Icon size={20} />
    </button>
  );
}

export function Chip({ active, children, icon: Icon, className, ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean; icon?: ComponentType<{ size?: number | string; className?: string }> }) {
  return (
    <button
      aria-pressed={active}
      className={cn(
        'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition-colors',
        active ? 'border-transparent bg-accent/15 text-accent-ink' : 'border-line bg-card text-fg hover:bg-elev',
        className,
      )}
      {...p}
    >
      {Icon && <Icon size={16} />}
      {children}
    </button>
  );
}

export function Badge({ children, tone = 'default', className }: { children: ReactNode; tone?: 'default' | 'accent' | 'warn' | 'danger' | 'solid'; className?: string }) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium',
      tone === 'default' && 'bg-elev text-muted',
      tone === 'accent' && 'bg-accent/15 text-accent-ink',
      tone === 'solid' && 'bg-card text-fg border border-line',
      tone === 'warn' && 'bg-warn/15 text-warn',
      tone === 'danger' && 'bg-danger/15 text-danger',
      className,
    )}>{children}</span>
  );
}

export const Card = ({ className, children, ...p }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('card', className)} {...p}>{children}</div>
);

export const Skeleton = ({ className }: { className?: string }) => <div className={cn('skeleton', className)} aria-hidden />;

export function SectionLabel({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="label">{children}</h2>
      {action}
    </div>
  );
}

export function EmptyState({ icon: Icon, text, action }: { icon: ComponentType<{ size?: number | string; className?: string }>; text: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-line px-6 py-10 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-elev"><Icon size={22} className="text-muted" /></span>
      <p className="font-semibold">{text}</p>
      {action}
    </div>
  );
}

export function ErrorState({ onRetry, text = 'Couldn’t load' }: { onRetry: () => void; text?: string }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-line px-6 py-10 text-center">
      <AlertTriangle className="text-warn" />
      <p className="font-semibold">{text}</p>
      <Button variant="outline" size="sm" onClick={onRetry}>Retry</Button>
    </div>
  );
}

export function PageTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-5 flex items-end justify-between gap-3">
      <h1 className="text-2xl font-bold md:text-3xl">{children}</h1>
      {right}
    </div>
  );
}

/** Bottom sheet on phones, right side panel on desktop. */
export function Sheet({ open, onClose, children, title, wide }: { open: boolean; onClose: () => void; children: ReactNode; title?: string; wide?: boolean }) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => { window.removeEventListener('keydown', k); prev?.focus?.(); };
  }, [open, onClose]);
  const isDesk = typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches;
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div className="fixed inset-0 z-40 bg-black/50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} onClick={onClose} />
          <motion.div
            ref={ref}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className={cn(
              'fixed z-50 flex flex-col bg-card outline-none',
              'inset-x-0 bottom-0 max-h-[88dvh] rounded-t-2xl border-t border-line pb-safe',
              'md:inset-y-0 md:left-auto md:right-0 md:max-h-none md:w-[420px] md:rounded-none md:border-l md:border-t-0',
              wide && 'md:w-[520px]',
            )}
            initial={reduce ? { opacity: 0 } : isDesk ? { x: 40, opacity: 0 } : { y: '100%' }}
            animate={reduce ? { opacity: 1 } : isDesk ? { x: 0, opacity: 1 } : { y: 0 }}
            exit={reduce ? { opacity: 0 } : isDesk ? { x: 40, opacity: 0 } : { y: '100%' }}
            transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
          >
            <div className="flex items-center justify-between gap-2 px-5 pb-2 pt-3">
              <div className="mx-auto h-1 w-10 rounded-full bg-line md:hidden" />
            </div>
            <div className="flex items-start justify-between gap-3 px-5">
              {title && <h2 className="text-2xl leading-tight">{title}</h2>}
              <button onClick={onClose} aria-label="Close" className="-mr-2 ml-auto flex h-11 w-11 shrink-0 items-center justify-center rounded-xl hover:bg-elev"><X size={20} /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 pb-6 pt-2">{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export function Segmented<T extends string | number>({ value, options, onChange, label }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex rounded-full bg-elev p-1">
      {options.map((o) => (
        <button
          key={String(o.value)}
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn('h-9 flex-1 rounded-full px-2 text-sm font-medium transition-colors', value === o.value ? 'bg-card text-accent-ink shadow-float' : 'text-muted hover:text-fg')}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex min-h-[44px] cursor-pointer items-center justify-between gap-3">
      <span className="font-medium">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={cn('relative h-7 w-12 shrink-0 rounded-full border-2 transition-colors', checked ? 'border-accent bg-accent' : 'border-line bg-elev')}
      >
        <span className={cn('absolute top-0.5 h-5 w-5 rounded-full transition-transform', checked ? 'translate-x-[22px] bg-white' : 'translate-x-0.5 bg-muted')} />
      </button>
    </label>
  );
}

export function FormField({ label, error, children, hint }: { label: string; error?: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="label mb-1.5 block">{label}</span>
      {children}
      {error ? <span role="alert" className="mt-1 block text-sm font-medium text-danger">{error}</span> : hint && <span className="mt-1 block text-sm text-muted">{hint}</span>}
    </label>
  );
}
