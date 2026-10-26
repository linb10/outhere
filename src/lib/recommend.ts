/**
 * Recommendation engine — pure functions, no I/O.
 *
 * Event score (0–100):
 *   35 * interestMatch   exact interest = 1, related interest = 0.5, else 0
 * + 25 * distanceScore   linear: 1 at 0 mi → 0 at the user's max distance (beyond max = excluded)
 * + 15 * timeFit         1 if the start time falls in a preferred slot, 0 if not, 0.5 if no preference
 * + 10 * weatherScore    indoor = 1; outdoor: good = 1, so-so = 0.5, rain/storm/extreme = 0, unknown = 0.5
 * + 10 * popularity      log-scaled "going" count, saturating at ~50 RSVPs
 * +  5 * trustBonus      1 if hosted by a verified organization
 *
 * Hard exclusions (never shown): past, cancelled, hidden or auto-hidden (≥3 reports),
 * blocked hosts, age-ineligible for the signed-in user, beyond max distance.
 *
 * Places reuse the same factors, swapping RSVPs/trust for live check-in activity
 * and an accessibility match.
 */
import type { Activity, Interest, OutEvent, Place, Prefs, TimeSlot } from '@/types';
import { INTERESTS, INTEREST_PLACES, RELATED } from './categories';
import { CONDITION_LABEL, condition, type HourWeather } from './weather';

/** All weights in one place. Each group sums to 100. */
export const WEIGHTS = {
  event: { interest: 35, distance: 25, time: 15, weather: 10, popularity: 10, trust: 5 },
  place: { interest: 35, distance: 25, activity: 15, weather: 10, access: 15 },
};

/** "10+" miles in the survey means "no limit"; we still need a scale for scoring. */
export const NO_LIMIT_SCALE = 25;
export const AUTO_HIDE_REPORTS = 3;

export interface RecContext {
  prefs: Pick<Prefs, 'interests' | 'maxDistance' | 'times' | 'accessibility'>;
  origin: { lat: number; lng: number };
  now: number;
  /** Signed-in user's age; null for guests (age filter skipped). */
  userAge: number | null;
  blocked: string[];
  /** Forecast lookup for a place + time. Missing → neutral weather score. */
  weatherAt?: (lat: number, lng: number, time: number) => HourWeather | undefined;
  /** Miles between two points; injected so this module stays dependency-free and testable. */
  distance: (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => number;
}

export interface Scored<T> { item: T; score: number; distance: number; reason: string }

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

export function interestMatch(cat: Interest, interests: Interest[]): number {
  if (!interests.length) return 0.5; // no survey answers: neutral, don't punish
  if (interests.includes(cat)) return 1;
  if (interests.some((i) => RELATED[i]?.includes(cat) || RELATED[cat]?.includes(i))) return 0.5;
  return 0;
}

/** 1 at 0 mi, falling linearly to 0 at max. Returns null when beyond max (exclude). */
export function distanceScore(mi: number, maxDistance: number): number | null {
  const max = maxDistance >= 10 ? NO_LIMIT_SCALE : maxDistance;
  if (maxDistance < 10 && mi > max) return null;
  return clamp01(1 - mi / max);
}

export function timeSlot(t: number): TimeSlot {
  const d = new Date(t);
  const day = d.getDay();
  if (day === 0 || day === 6) return 'weekend';
  return d.getHours() < 12 ? 'weekdayAM' : 'weekdayPM';
}

export function timeFit(start: number, times: TimeSlot[]): number {
  if (!times.length) return 0.5;
  return times.includes(timeSlot(start)) ? 1 : 0;
}

export function weatherScore(indoor: boolean, h?: HourWeather): number {
  if (indoor) return 1;
  if (!h) return 0.5;
  const c = condition(h.code);
  if (c === 'storm' || c === 'snow' || h.rainPct >= 60 || h.tempF >= 90 || h.tempF <= 32) return 0;
  if (c === 'rain' || h.rainPct >= 30 || h.tempF < 50 || h.tempF > 85) return 0.5;
  return 1;
}

/** log10(1 + n) / log10(51): 0 → 0, 5 → 0.46, 50+ → 1. */
export function popularity(going: number): number {
  return clamp01(Math.log10(1 + Math.max(0, going)) / Math.log10(51));
}

export function isHidden(e: Pick<OutEvent, 'hidden' | 'reporters'>) {
  return e.hidden || (e.reporters?.length ?? 0) >= AUTO_HIDE_REPORTS;
}

export function ageEligible(e: Pick<OutEvent, 'ageMin' | 'ageMax'>, age: number | null) {
  if (age == null) return true;
  return age >= e.ageMin && age <= (e.ageMax || 99);
}

const weatherLabel = (h?: HourWeather) => (h ? `${CONDITION_LABEL[condition(h.code)]} ${h.tempF}°` : '');
const fmtMi = (m: number) => (m < 0.1 ? '<0.1 mi' : `${m < 10 ? m.toFixed(1) : Math.round(m)} mi`);

export function scoreEvent(e: OutEvent, ctx: RecContext): Scored<OutEvent> | null {
  if (e.end < ctx.now || e.cancelled || isHidden(e)) return null;
  if (ctx.blocked.includes(e.hostId)) return null;
  if (!ageEligible(e, ctx.userAge)) return null;

  const mi = ctx.distance(ctx.origin, e);
  const dist = distanceScore(mi, ctx.prefs.maxDistance);
  if (dist == null) return null;

  const w = WEIGHTS.event;
  const wx = ctx.weatherAt?.(e.lat, e.lng, e.start);
  const score =
    w.interest * interestMatch(e.category, ctx.prefs.interests) +
    w.distance * dist +
    w.time * timeFit(e.start, ctx.prefs.times) +
    w.weather * weatherScore(e.indoor, wx) +
    w.popularity * popularity(e.goingCount) +
    w.trust * (e.hostVerified ? 1 : 0);

  const reason = [INTERESTS[e.category].label, fmtMi(mi), e.indoor ? '' : weatherLabel(wx)].filter(Boolean).join(' · ');
  return { item: e, score: Math.round(score), distance: mi, reason };
}

export function recommendEvents(events: OutEvent[], ctx: RecContext): Scored<OutEvent>[] {
  return events
    .map((e) => scoreEvent(e, ctx))
    .filter((s): s is Scored<OutEvent> => s !== null)
    .sort((a, b) => b.score - a.score || a.item.start - b.item.start);
}

/** Best interest match for a place: does any chosen interest map to this place category? */
export function placeInterestMatch(p: Place, interests: Interest[]): number {
  if (!interests.length) return 0.5;
  if (interests.some((i) => INTEREST_PLACES[i]?.includes(p.category))) return 1;
  const related = interests.flatMap((i) => RELATED[i] ?? []);
  return related.some((i) => INTEREST_PLACES[i]?.includes(p.category)) ? 0.5 : 0;
}

/** Some activity is good (others are out), but "Busy" is slightly less appealing than "Active". */
export function activityScore(a?: Activity): number {
  const n = a?.count ?? 0;
  if (n === 0) return 0.3;
  if (n <= 5) return 1;
  return 0.7;
}

export function accessScore(p: Place, needs: Prefs['accessibility']): number {
  if (!needs.length) return 1;
  return needs.filter((n) => p.accessibility[n]).length / needs.length;
}

export function scorePlace(p: Place, ctx: RecContext, activity?: Activity): Scored<Place> | null {
  // Utility pins aren't destinations.
  if (p.category === 'restroom' || p.category === 'fountain') return null;
  const mi = ctx.distance(ctx.origin, p);
  const dist = distanceScore(mi, ctx.prefs.maxDistance);
  if (dist == null) return null;
  const w = WEIGHTS.place;
  const wx = ctx.weatherAt?.(p.lat, p.lng, ctx.now);
  const indoor = p.category === 'library';
  const score =
    w.interest * placeInterestMatch(p, ctx.prefs.interests) +
    w.distance * dist +
    w.activity * activityScore(activity) +
    w.weather * weatherScore(indoor, wx) +
    w.access * accessScore(p, ctx.prefs.accessibility);
  const reason = [fmtMi(mi), activity?.count ? `${activity.count} here now` : ''].filter(Boolean).join(' · ');
  return { item: p, score: Math.round(score), distance: mi, reason };
}

export function recommendPlaces(places: Place[], ctx: RecContext, activity: Record<string, Activity> = {}, limit = 12): Scored<Place>[] {
  return places
    .map((p) => scorePlace(p, ctx, activity[p.id]))
    .filter((s): s is Scored<Place> => s !== null)
    .sort((a, b) => b.score - a.score || a.distance - b.distance)
    .slice(0, limit);
}
