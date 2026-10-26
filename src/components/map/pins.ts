import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { PLACE_CATS } from '@/lib/categories';
import type { PlaceCategory } from '@/types';

const iconCache = new Map<string, string>();
function iconMarkup(cat: PlaceCategory) {
  if (!iconCache.has(cat)) {
    const svg = renderToStaticMarkup(createElement(PLACE_CATS[cat].icon, { size: 16, strokeWidth: 2.25 }));
    // lucide renders stroke="currentColor"; pins need explicit white.
    iconCache.set(cat, svg.replace(/currentColor/g, '#fff').replace('<svg', '<svg x="8" y="7"'));
  }
  return iconCache.get(cat)!;
}

/** Teardrop pin in the category color; selected pins are larger. */
export function pinSvg(cat: PlaceCategory, selected = false) {
  const color = PLACE_CATS[cat].color;
  const ring = '#FFFFFF';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="38" viewBox="0 0 32 38"><path d="M16 1.5C8.3 1.5 2.5 7.2 2.5 14.6 2.5 24.2 16 36.5 16 36.5s13.5-12.3 13.5-21.9C29.5 7.2 23.7 1.5 16 1.5z" fill="${color}" stroke="${ring}" stroke-width="${selected ? 3 : 2}"/>${iconMarkup(cat)}</svg>`;
}

export const pinDataUrl = (cat: PlaceCategory, selected = false) => `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(pinSvg(cat, selected))}`;

export function clusterSvg(count: number, _dark: boolean) {
  const size = count < 10 ? 34 : count < 100 ? 40 : 48;
  const bg = '#1A73E8';
  const fg = '#FFFFFF';
  return {
    size,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 2}" fill="${bg}" stroke="#FFFFFF" stroke-width="3"/><text x="50%" y="50%" dy=".35em" text-anchor="middle" font-family="Arial, sans-serif" font-weight="700" font-size="${size < 40 ? 14 : 16}" fill="${fg}">${count > 999 ? `${Math.round(count / 100) / 10}k` : count}</text></svg>`,
  };
}
