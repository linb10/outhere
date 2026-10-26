// Pulls NYC Open Data (no key) and writes a compact, normalized src/data/places.json.
// Runtime never hits NYC Open Data; this file is committed.
import { mkdirSync, writeFileSync } from 'node:fs';
import { geohashForLocation } from 'geofire-common';

type Cat = 'park' | 'trail' | 'basketball' | 'tennis' | 'handball' | 'field' | 'playground' | 'landmark' | 'waterfront' | 'library' | 'restroom' | 'fountain';
interface Place { id: string; name: string; category: Cat; lat: number; lng: number; borough: string; amenities: string[]; accessibility: Record<string, boolean>; geohash: string }

const BASE = 'https://data.cityofnewyork.us/resource';
const BORO: Record<string, string> = { M: 'Manhattan', B: 'Brooklyn', X: 'Bronx', Q: 'Queens', R: 'Staten Island' };
const r5 = (n: number) => Math.round(n * 1e5) / 1e5;
const bool = (v: unknown) => v === true || v === 'true' || v === 'True';

async function get(id: string, query = ''): Promise<any[] | null> {
  try {
    const res = await fetch(`${BASE}/${id}.json?$limit=50000${query}`);
    const data = await res.json();
    if (!Array.isArray(data)) throw new Error(data?.message ?? 'bad response');
    console.log(`ok ${id}: ${data.length} rows`);
    return data;
  } catch (e) {
    console.warn(`SKIPPED ${id}: ${(e as Error).message}`);
    return null;
  }
}

// Rough centroid: mean of all vertices. Good enough for a pin.
function centroid(geom: any): [number, number] | null {
  if (!geom?.coordinates) return null;
  const pts: number[][] = [];
  const walk = (c: any) => (typeof c[0] === 'number' ? pts.push(c) : c.forEach(walk));
  walk(geom.coordinates);
  if (!pts.length) return null;
  return [pts.reduce((s, p) => s + p[1], 0) / pts.length, pts.reduce((s, p) => s + p[0], 0) / pts.length];
}
const mean = (pts: [number, number][]): [number, number] => [pts.reduce((s, p) => s + p[0], 0) / pts.length, pts.reduce((s, p) => s + p[1], 0) / pts.length];

const places = new Map<string, Place>();
const parkExtras = new Map<string, Set<string>>();

function add(p: Omit<Place, 'geohash'>) {
  if (!p.name || !isFinite(p.lat) || !isFinite(p.lng)) return;
  if (p.lat < 40.49 || p.lat > 40.92 || p.lng < -74.27 || p.lng > -73.68) return;
  const key = `${p.category}:${p.name.toLowerCase()}:${p.lat.toFixed(3)}:${p.lng.toFixed(3)}`;
  if (places.has(key)) return;
  places.set(key, { ...p, lat: r5(p.lat), lng: r5(p.lng), geohash: geohashForLocation([p.lat, p.lng], 9) });
}
const extra = (prop: string | undefined, a: string) => {
  if (!prop) return;
  if (!parkExtras.has(prop)) parkExtras.set(prop, new Set());
  parkExtras.get(prop)!.add(a);
};

async function main() {
  const parksRaw = await get('enfh-gkve', '&retired=false');
  const parkBy = new Map<string, any>();
  parksRaw?.forEach((p) => parkBy.set(p.gispropnum, p));

  // Courts & fields: thousands of single courts, so group to one pin per park + sport.
  const SPORT: Record<string, Cat> = { BKB: 'basketball', TNS: 'tennis', PKB: 'tennis', HDB: 'handball', SCR: 'field', BSB: 'field', SFB: 'field', FTB: 'field', CRK: 'field', TRK: 'field' };
  const LABEL: Record<string, string> = { basketball: 'Basketball', tennis: 'Tennis', handball: 'Handball', field: 'Fields' };
  const fac = await get('qnem-b8re', '&featurestatus=Active');
  if (fac) {
    const groups = new Map<string, { cat: Cat; prop: string; boro: string; pts: [number, number][]; acc: boolean; lit: boolean }>();
    for (const f of fac) {
      const cat = SPORT[f.primary_sport];
      const c = centroid(f.multipolygon);
      if (!cat || !c) continue;
      const k = `${f.gispropnum}:${cat}`;
      const g = groups.get(k) ?? { cat, prop: f.gispropnum, boro: f.borough, pts: [] as [number, number][], acc: false, lit: false };
      g.pts.push(c);
      g.acc ||= bool(f.accessible);
      g.lit ||= bool(f.field_lighted);
      groups.set(k, g);
      extra(f.gispropnum, cat);
    }
    for (const [k, g] of groups) {
      const park = parkBy.get(g.prop);
      if (!park) continue;
      const [lat, lng] = mean(g.pts);
      const n = g.pts.length;
      add({ id: `f-${k}`, name: `${park.signname} ${LABEL[g.cat]}`, category: g.cat, lat, lng, borough: BORO[g.boro] ?? '', amenities: [`${n} ${g.cat === 'field' ? (n > 1 ? 'fields' : 'field') : n > 1 ? 'courts' : 'court'}`, ...(g.lit ? ['Lights'] : [])], accessibility: { wheelchair: g.acc } });
    }
  }

  const rest = await get('i7jb-7jku');
  rest?.forEach((r, i) => {
    if (/not/i.test(r.status ?? '')) return;
    add({ id: `rr-${i}`, name: r.facility_name, category: 'restroom', lat: +r.latitude, lng: +r.longitude, borough: '', amenities: r.changing_stations === 'Yes' ? ['Changing station'] : [], accessibility: { wheelchair: /yes|fully/i.test(r.accessibility ?? ''), restrooms: true } });
  });

  // Fountains: one pin per park keeps the bundle small; also flags a park amenity.
  const fount = await get('qnv7-p7a2', '&featuresta=Active');
  const seenF = new Set<string>();
  fount?.forEach((f) => {
    extra(f.gispropnum, 'fountain');
    if (seenF.has(f.gispropnum)) return;
    seenF.add(f.gispropnum);
    const c = centroid(f.the_geom);
    if (c) add({ id: `df-${f.gispropnum}`, name: `${f.propertyna} Fountain`, category: 'fountain', lat: c[0], lng: c[1], borough: BORO[f.borough] ?? '', amenities: [], accessibility: {} });
  });

  const trails = await get('vjbm-hsyr');
  if (trails) {
    const tg = new Map<string, { name: string; pts: [number, number][]; prop: string }>();
    for (const t of trails) {
      const c = centroid(t.shape);
      if (!c) continue;
      const k = `${t.parkid}:${t.trail_name}`;
      const g = tg.get(k) ?? { name: `${t.park_name} · ${t.trail_name ?? 'Trail'}`, pts: [] as [number, number][], prop: t.parkid ?? '' };
      g.pts.push(c);
      tg.set(k, g);
      extra(t.parkid, 'trail');
    }
    for (const [k, g] of tg) {
      const [lat, lng] = mean(g.pts);
      add({ id: `tr-${k}`, name: g.name, category: 'trail', lat, lng, borough: BORO[g.prop[0]] ?? '', amenities: [], accessibility: {} });
    }
  }

  const PARK_TYPES: Record<string, Cat> = {
    'Flagship Park': 'park', 'Community Park': 'park', 'Neighborhood Park': 'park', 'Nature Area': 'park',
    'Recreational Field/Courts': 'park', 'Waterfront Facility': 'waterfront', 'Historic House Park': 'landmark',
    Playground: 'playground', 'Jointly Operated Playground': 'playground',
  };
  const AMEN: Record<string, string> = { basketball: 'Basketball', tennis: 'Tennis', handball: 'Handball', field: 'Fields', fountain: 'Fountains', trail: 'Trails' };
  parksRaw?.forEach((p) => {
    let cat = PARK_TYPES[p.typecategory];
    if (!cat || !p.signname) return;
    if (/beach|boardwalk|pier|esplanade/i.test(p.signname)) cat = 'waterfront';
    const c = centroid(p.multipolygon);
    if (!c) return;
    const amen = [...(parkExtras.get(p.gispropnum) ?? [])].map((a) => AMEN[a] ?? a);
    if (+p.acres >= 1) amen.unshift(`${Math.round(+p.acres)} acres`);
    add({ id: `pk-${p.gispropnum}`, name: p.signname, category: cat, lat: c[0], lng: c[1], borough: BORO[p.borough] ?? '', amenities: amen, accessibility: { shade: +p.acres > 5 || p.typecategory === 'Nature Area', seating: true } });
  });

  const qpl = await get('kh3d-xhq7');
  qpl?.forEach((l) => add({ id: `qpl-${l.name}`, name: `Queens Library · ${l.name}`, category: 'library', lat: +l.latitude, lng: +l.longitude, borough: 'Queens', amenities: ['Restrooms', 'Wi-Fi'], accessibility: { wheelchair: true, restrooms: true, seating: true } }));

  // LPC landmark polygons use state-plane coords; a curated list of public outdoor landmarks is simpler.
  const LANDMARKS: [string, number, number, string][] = [
    ['Unisphere', 40.74633, -73.84468, 'Queens'], ['New York State Pavilion', 40.7437, -73.8472, 'Queens'],
    ['Fort Totten Battery', 40.7927, -73.7765, 'Queens'], ['Louis Armstrong House', 40.7547, -73.8612, 'Queens'],
    ['Queens County Farm Museum', 40.7472, -73.7233, 'Queens'], ['Socrates Sculpture Park', 40.7686, -73.9367, 'Queens'],
    ['Brooklyn Bridge', 40.7061, -73.9969, 'Manhattan'], ['Bethesda Terrace', 40.774, -73.9708, 'Manhattan'],
    ['Grand Army Plaza', 40.674, -73.97, 'Brooklyn'], ['Coney Island Boardwalk', 40.5736, -73.9788, 'Brooklyn'],
    ['Wave Hill', 40.8987, -73.9118, 'Bronx'], ['Snug Harbor', 40.6437, -74.1027, 'Staten Island'],
    ['Fort Wadsworth', 40.6013, -74.0594, 'Staten Island'], ['Little Red Lighthouse', 40.8501, -73.9469, 'Manhattan'],
  ];
  LANDMARKS.forEach(([name, lat, lng, b]) => add({ id: `lm-${name}`, name, category: 'landmark', lat, lng, borough: b, amenities: [], accessibility: {} }));

  // Stable ids so seeded events can reference places across re-fetches.
  const used = new Set<string>();
  const out = [...places.values()].map((p) => {
    const base = p.id.replace(/[^\w-]/g, '').slice(0, 32);
    let id = base;
    for (let n = 2; used.has(id); n++) id = `${base}-${n}`;
    used.add(id);
    return { ...p, id };
  });
  mkdirSync('src/data', { recursive: true });
  writeFileSync('src/data/places.json', JSON.stringify(out));
  const counts: Record<string, number> = {};
  out.forEach((p) => (counts[p.category] = (counts[p.category] ?? 0) + 1));
  console.log(`Wrote ${out.length} places`, counts);
}
main();
