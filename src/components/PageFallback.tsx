import { Skeleton } from './ui';

export function PageFallback() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-10 w-48" />
      <Skeleton className="h-32" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><Skeleton className="h-44" /><Skeleton className="h-44" /></div>
    </div>
  );
}

export function Splash() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-bg">
      <svg width="56" height="56" viewBox="0 0 32 32" aria-label="Loading OutHere" className="animate-pulse">
        <rect width="32" height="32" rx="8" fill="#1A73E8" />
        <path d="M16 5.5c-4.7 0-8.2 3.6-8.2 8.2 0 5.9 8.2 13 8.2 13s8.2-7.1 8.2-13c0-4.6-3.5-8.2-8.2-8.2z" fill="#FFFFFF" />
        <circle cx="16" cy="13.6" r="3.2" fill="#1A73E8" />
      </svg>
    </div>
  );
}
