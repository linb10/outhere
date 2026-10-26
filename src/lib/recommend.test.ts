import { describe, expect, it } from 'vitest';
import type { OutEvent, Place } from '@/types';
import {
  distanceScore, interestMatch, popularity, recommendEvents, recommendPlaces, scoreEvent, timeFit,
  weatherScore, WEIGHTS, type RecContext,
} from './recommend';

const NOW = new Date('2026-10-26T09:00:00').getTime(); // Monday
const SAT_10AM = new Date('2026-10-31T10:00:00').getTime();
const MON_6PM = new Date('2026-10-26T18:00:00').getTime();

// Flat distance: 1 unit of lat = 69 mi; fine for tests.
const distance = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => Math.hypot(a.lat - b.lat, a.lng - b.lng) * 69;

const ctx = (over: Partial<RecContext> = {}): RecContext => ({
  prefs: { interests: ['basketball'], maxDistance: 3, times: ['weekend'], accessibility: [] },
  origin: { lat: 40.73, lng: -73.83 },
  now: NOW,
  userAge: 20,
  blocked: [],
  distance,
  ...over,
});

const ev = (over: Partial<OutEvent> = {}): OutEvent => ({
  id: 'e1', title: 'Pickup', category: 'basketball', description: '', whoShouldJoin: '',
  start: SAT_10AM, end: SAT_10AM + 2 * 3600e3, ageMin: 13, ageMax: 99, familyFriendly: false, indoor: false,
  placeId: 'p', placeName: 'Court', lat: 40.73, lng: -73.83, borough: 'Queens', geohash: '',
  hostId: 'h', hostName: 'host', hostVerified: false, goingCount: 0, interestedCount: 0, reporters: [],
  hidden: false, cancelled: false, imageCount: 0, createdAt: NOW, ...over,
});

describe('factors', () => {
  it('interest match: exact, related, none', () => {
    expect(interestMatch('basketball', ['basketball'])).toBe(1);
    expect(interestMatch('fitness', ['basketball'])).toBe(0.5);
    expect(interestMatch('landmarks', ['basketball'])).toBe(0);
  });
  it('distance: linear and excluded beyond max', () => {
    expect(distanceScore(0, 3)).toBe(1);
    expect(distanceScore(1.5, 3)).toBeCloseTo(0.5);
    expect(distanceScore(4, 3)).toBeNull();
    expect(distanceScore(15, 10)).not.toBeNull(); // 10+ = no limit
  });
  it('time fit', () => {
    expect(timeFit(SAT_10AM, ['weekend'])).toBe(1);
    expect(timeFit(MON_6PM, ['weekend'])).toBe(0);
    expect(timeFit(MON_6PM, [])).toBe(0.5);
  });
  it('weather: indoor always 1, storms 0', () => {
    expect(weatherScore(true, { time: 0, tempF: 40, rainPct: 90, code: 95 })).toBe(1);
    expect(weatherScore(false, { time: 0, tempF: 70, rainPct: 80, code: 61 })).toBe(0);
    expect(weatherScore(false, { time: 0, tempF: 95, rainPct: 0, code: 0 })).toBe(0);
    expect(weatherScore(false, { time: 0, tempF: 68, rainPct: 5, code: 0 })).toBe(1);
    expect(weatherScore(false)).toBe(0.5);
  });
  it('popularity is log-scaled', () => {
    expect(popularity(0)).toBe(0);
    expect(popularity(50)).toBeCloseTo(1);
    expect(popularity(5)).toBeGreaterThan(0.4);
    expect(popularity(500)).toBe(1);
  });
  it('weights sum to 100', () => {
    for (const g of Object.values(WEIGHTS)) expect(Object.values(g).reduce((a, b) => a + b, 0)).toBe(100);
  });
});

describe('scoreEvent', () => {
  it('perfect event scores near the top', () => {
    const s = scoreEvent(ev({ goingCount: 50, hostVerified: true }), ctx({ weatherAt: () => ({ time: 0, tempF: 64, rainPct: 0, code: 0 }) }))!;
    expect(s.score).toBe(100);
    expect(s.reason).toBe('Basketball · <0.1 mi · Sunny 64°');
  });
  it('excludes past, hidden, auto-hidden, cancelled, blocked, age-ineligible, too far', () => {
    expect(scoreEvent(ev({ end: NOW - 1 }), ctx())).toBeNull();
    expect(scoreEvent(ev({ hidden: true }), ctx())).toBeNull();
    expect(scoreEvent(ev({ reporters: ['a', 'b', 'c'] }), ctx())).toBeNull();
    expect(scoreEvent(ev({ cancelled: true }), ctx())).toBeNull();
    expect(scoreEvent(ev(), ctx({ blocked: ['h'] }))).toBeNull();
    expect(scoreEvent(ev({ ageMin: 21 }), ctx({ userAge: 16 }))).toBeNull();
    expect(scoreEvent(ev({ lat: 40.9 }), ctx())).toBeNull();
  });
  it('guests skip the age filter', () => {
    expect(scoreEvent(ev({ ageMin: 21 }), ctx({ userAge: null }))).not.toBeNull();
  });
  it('ranks interest match above an unrelated event', () => {
    const list = recommendEvents([ev({ id: 'a', category: 'landmarks' }), ev({ id: 'b' })], ctx());
    expect(list.map((s) => s.item.id)).toEqual(['b', 'a']);
  });
});

describe('recommendPlaces', () => {
  const place = (over: Partial<Place>): Place => ({ id: 'p', name: 'P', category: 'basketball', lat: 40.73, lng: -73.83, borough: 'Queens', amenities: [], accessibility: {}, geohash: '', ...over });
  it('skips utility pins and prefers matching, active places', () => {
    const list = recommendPlaces(
      [place({ id: 'r', category: 'restroom' }), place({ id: 'lib', category: 'library' }), place({ id: 'bb' })],
      ctx(),
      { bb: { count: 3, last: NOW } },
    );
    expect(list.map((s) => s.item.id)).toEqual(['bb', 'lib']);
    expect(list[0].reason).toContain('3 here now');
  });
});
