import { cn } from '@/lib/utils';

export function LogoMark({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" className={className} aria-hidden>
      <rect width="32" height="32" rx="9" fill="#1A73E8" />
      <path d="M16 5.5c-4.7 0-8.2 3.6-8.2 8.2 0 5.9 8.2 13 8.2 13s8.2-7.1 8.2-13c0-4.6-3.5-8.2-8.2-8.2z" fill="#fff" />
      <circle cx="16" cy="13.6" r="3.2" fill="#1A73E8" />
      <path d="M6 26.5h20" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <LogoMark />
      <span className="text-2xl font-bold leading-none">
        OutHere
      </span>
    </span>
  );
}
