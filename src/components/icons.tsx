import type { SVGProps } from 'react';

// Sport icons lucide lacks, drawn in the same 24px / 2px-stroke style.
type P = SVGProps<SVGSVGElement> & { size?: number | string };
const base = ({ size = 24, ...p }: P) => ({
  width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
  strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true, ...p,
});

export const Basketball = (p: P) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3v18M5.6 5.6c3 3 3 9.8 0 12.8M18.4 5.6c-3 3-3 9.8 0 12.8" /></svg>
);
export const Tennis = (p: P) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="9" /><path d="M5.6 5.6a9 9 0 0 1 0 12.8M18.4 5.6a9 9 0 0 0 0 12.8" /></svg>
);
export const Soccer = (p: P) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="9" /><path d="m12 7 4 3-1.5 4.5h-5L8 10z" /><path d="M12 7V3.5M16 10l3.5-1M14.5 14.5l2 3.5M9.5 14.5l-2 3.5M8 10 4.5 9" /></svg>
);
export const Baseball = (p: P) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="9" /><path d="M7 4.5c1.8 2 2.6 4.6 2.6 7.5S8.8 17.5 7 19.5M17 4.5c-1.8 2-2.6 4.6-2.6 7.5s.8 5.5 2.6 7.5" /></svg>
);
export const Handball = (p: P) => (
  <svg {...base(p)}><rect x="3" y="3" width="18" height="15" rx="1.5" /><circle cx="15" cy="9" r="2.5" /><path d="M3 21h18" /></svg>
);
export const Field = (p: P) => (
  <svg {...base(p)}><rect x="2.5" y="5" width="19" height="14" rx="1.5" /><path d="M12 5v14" /><circle cx="12" cy="12" r="2.5" /><path d="M2.5 9.5h3v5h-3M21.5 9.5h-3v5h3" /></svg>
);
