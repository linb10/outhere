// In-browser backend for demo mode: localStorage for records, IndexedDB for images.
// Lets the app run fully with no Firebase project. Data is per-browser, not shared.
import { get as idbGet, set as idbSet, del as idbDel } from 'idb-keyval';
import { geohashForLocation } from 'geofire-common';
import type { Activity, ActivityLog, EventInput, Favorite, OrgRequest, OutEvent, Report, Rsvp, RsvpStatus, UserProfile } from '@/types';
import { buildSeedEvents, SEED_USERS } from '@/data/seed';
import { uid as newId, isMinor } from '@/lib/utils';
import { AUTO_HIDE_REPORTS } from '@/lib/recommend';
import { AppError, CHECKIN_TTL, USERNAME_RE, type AdminStats, type DataService, type SignUpInput } from './DataService';

type DemoUser = UserProfile & { password: string };
interface CheckInRec { placeId: string; uid: string; createdAt: number }
interface State {
  v: number;
  users: DemoUser[];
  session: string | null;
  events: OutEvent[];
  rsvps: Rsvp[];
  favorites: Record<string, Favorite[]>;
  checkins: CheckInRec[];
  logs: Record<string, ActivityLog[]>;
  reports: Report[];
  orgs: OrgRequest[];
}

const KEY = 'outhere-demo';
const VERSION = 3;
const DEFAULT_PREFS: UserProfile['prefs'] = { borough: 'Queens', maxDistance: 5, interests: [], times: [], accessibility: [] };
const HOT_PLACES = ['f-Q024basketball', 'f-Q099basketball', 'f-Q021basketball', 'f-Q024tennis', 'pk-Q099', 'pk-Q024', 'pk-Q001', 'f-Q099field', 'pk-Q458', 'lm-Unisphere', 'f-Q102basketball', 'pk-Q006', 'pk-Q004', 'f-Q004basketball'];

function seed(): State {
  const now = Date.now();
  const users: DemoUser[] = SEED_USERS.map((u) => ({ ...u, createdAt: now - 60 * 864e5 }));
  const events = buildSeedEvents(now);
  // One reported event so the admin queue isn't empty.
  events[3].reporters = ['user-maya'];
  const day = 864e5;
  const demoLogs: ActivityLog[] = [
    { id: 'l1', date: now - 2 * day, category: 'basketball', placeName: 'Kissena Park Basketball', minutes: 90, note: '', volunteer: false, createdAt: now },
    { id: 'l2', date: now - 4 * day, category: 'cleanups', placeName: 'Kissena Park', minutes: 180, note: 'Lake loop', volunteer: true, createdAt: now },
    { id: 'l3', date: now - 6 * day, category: 'hiking', placeName: 'Alley Pond Park', minutes: 120, note: '', volunteer: false, createdAt: now },
    { id: 'l4', date: now - 9 * day, category: 'volunteering', placeName: 'Queens Library · Flushing', minutes: 120, note: 'Garden beds', volunteer: true, createdAt: now },
    { id: 'l5', date: now - 13 * day, category: 'running', placeName: 'Forest Park', minutes: 60, note: '', volunteer: false, createdAt: now },
    { id: 'l6', date: now - 20 * day, category: 'volunteering', placeName: 'Flushing Meadows Corona Park', minutes: 240, note: 'Tree care', volunteer: true, createdAt: now },
    { id: 'l7', date: now - 1 * day, category: 'basketball', placeName: 'Cunningham Park Basketball', minutes: 75, note: '', volunteer: false, createdAt: now },
  ];
  return {
    v: VERSION, users, session: null, events,
    rsvps: [{ eventId: events[0].id, uid: 'demo-user', username: 'demo_user', minor: false, status: 'going', createdAt: now }],
    favorites: { 'demo-user': [{ id: 'f1', type: 'place', refId: 'f-Q024basketball', createdAt: now }, { id: 'f2', type: 'place', refId: 'pk-Q001', createdAt: now }] },
    checkins: [],
    logs: { 'demo-user': demoLogs },
    reports: [{ id: 'r1', targetType: 'event', targetId: events[3].id, targetLabel: events[3].title, reason: 'spam', note: 'Posted twice', reporterId: 'user-maya', createdAt: now - 3600e3, status: 'open' }],
    orgs: [{ id: 'o1', uid: 'user-dev', username: 'dev_tennis', orgName: 'Kissena Tennis Club', type: 'Nonprofit', website: 'https://example.org', email: 'club@example.org', role: 'Organizer', status: 'pending', createdAt: now - 864e5 }],
  };
}

// Simulated live check-ins so activity levels look real in demo mode.
function simulatedCheckins(): CheckInRec[] {
  const now = Date.now();
  const bucket = Math.floor(now / (15 * 60e3)); // reshuffle every 15 min
  return HOT_PLACES.flatMap((placeId, i) => {
    const n = (bucket * 7 + i * 13) % 9;
    return Array.from({ length: n }, (_, k) => ({ placeId, uid: `sim-${i}-${k}`, createdAt: now - (((k * 11 + i * 3) % 78) + 2) * 60e3 }));
  });
}

const strip = ({ password: _p, ...u }: DemoUser): UserProfile => u;

export class DemoDataService implements DataService {
  readonly mode = 'demo' as const;
  private s: State;
  private listeners = new Set<(u: UserProfile | null, needsProfile: boolean) => void>();

  constructor() {
    let s: State | null = null;
    try { s = JSON.parse(localStorage.getItem(KEY) ?? 'null'); } catch { /* fresh */ }
    if (!s || s.v !== VERSION) s = seed();
    this.s = s;
    this.save();
  }

  private save() {
    try { localStorage.setItem(KEY, JSON.stringify(this.s)); } catch { /* quota */ }
  }
  private me(): DemoUser | null {
    return this.s.users.find((u) => u.uid === this.s.session) ?? null;
  }
  private need(): DemoUser {
    const u = this.me();
    if (!u) throw new AppError('Sign in first');
    if (u.suspended) throw new AppError('Account suspended');
    return u;
  }
  private emit() {
    const u = this.me();
    this.listeners.forEach((l) => l(u ? strip(u) : null, false));
  }
  private delay<T>(v: T): Promise<T> {
    return new Promise((r) => setTimeout(() => r(v), 120));
  }

  onAuth(cb: (u: UserProfile | null, needsProfile: boolean) => void) {
    this.listeners.add(cb);
    const u = this.me();
    cb(u ? strip(u) : null, false);
    return () => { this.listeners.delete(cb); };
  }

  async usernameAvailable(username: string) {
    return !this.s.users.some((u) => u.username.toLowerCase() === username.toLowerCase());
  }

  async signUp({ email, password, username, birthYear }: SignUpInput) {
    if (!USERNAME_RE.test(username)) throw new AppError('Invalid username');
    if (!(await this.usernameAvailable(username))) throw new AppError('Username taken');
    if (this.s.users.some((u) => u.email.toLowerCase() === email.toLowerCase())) throw new AppError('Email already in use');
    const u: DemoUser = { uid: newId(), username, email, password, birthYear, role: 'user', prefs: DEFAULT_PREFS, onboarded: false, safetyAck: false, blocked: [], createdAt: Date.now() };
    this.s.users.push(u);
    this.s.session = u.uid;
    this.save();
    this.emit();
  }

  async signIn(identifier: string, password: string) {
    const id = identifier.trim().toLowerCase();
    const u = this.s.users.find((x) => x.email.toLowerCase() === id || x.username.toLowerCase() === id);
    if (!u || u.password !== password) throw new AppError('Wrong username/email or password');
    this.s.session = u.uid;
    this.save();
    this.emit();
    await this.delay(null);
  }

  async signInGoogle() {
    throw new AppError('Google sign-in needs Firebase. Use a demo account.');
  }
  async completeProfile() { /* not used in demo */ }

  async signOut() {
    this.s.session = null;
    this.save();
    this.emit();
  }
  async resetPassword() { /* demo: pretend we sent it */ }
  async sendVerification() { /* demo */ }
  emailVerified() { return true; }

  async deleteAccount() {
    const u = this.need();
    this.s.users = this.s.users.filter((x) => x.uid !== u.uid);
    this.s.rsvps = this.s.rsvps.filter((r) => r.uid !== u.uid);
    this.s.events = this.s.events.filter((e) => e.hostId !== u.uid);
    delete this.s.favorites[u.uid];
    delete this.s.logs[u.uid];
    this.s.session = null;
    this.save();
    this.emit();
  }

  async updateProfile(patch: Partial<UserProfile>) {
    const u = this.need();
    const { role: _r, verifiedOrg: _v, uid: _u, ...safe } = patch;
    Object.assign(u, safe);
    this.save();
    this.emit();
  }

  // Events
  async listEvents() {
    return this.delay(this.s.events.filter((e) => e.end > Date.now() - 864e5 && !e.hidden));
  }
  async getEvent(id: string) {
    return this.delay(this.s.events.find((e) => e.id === id) ?? null);
  }
  async createEvent(input: EventInput, images: string[]) {
    const u = this.need();
    if ((await this.myEventsToday()) >= 5) throw new AppError('Limit: 5 events per day');
    const e: OutEvent = {
      ...input, id: newId(), geohash: geohashForLocation([input.lat, input.lng]), hostId: u.uid, hostName: u.username,
      hostVerified: Boolean(u.verifiedOrg), orgName: u.verifiedOrg ?? null, goingCount: 0, interestedCount: 0, reporters: [],
      hidden: false, cancelled: false, imageCount: images.length, createdAt: Date.now(),
    };
    this.s.events.push(e);
    if (images.length) await idbSet(`img:${e.id}`, images);
    this.save();
    return e.id;
  }
  async updateEvent(id: string, input: Partial<EventInput>, images?: string[]) {
    const u = this.need();
    const e = this.s.events.find((x) => x.id === id);
    if (!e || (e.hostId !== u.uid && u.role !== 'admin')) throw new AppError('Not allowed');
    Object.assign(e, input);
    if (input.lat != null && input.lng != null) e.geohash = geohashForLocation([input.lat, input.lng]);
    if (images) {
      e.imageCount = images.length;
      await (images.length ? idbSet(`img:${id}`, images) : idbDel(`img:${id}`));
    }
    this.save();
  }
  async cancelEvent(id: string) {
    await this.updateEvent(id, {});
    this.s.events.find((x) => x.id === id)!.cancelled = true;
    this.save();
  }
  async getEventImages(id: string) {
    return ((await idbGet(`img:${id}`)) as string[] | undefined) ?? [];
  }
  async myEventsToday() {
    const u = this.me();
    const since = Date.now() - 864e5;
    return this.s.events.filter((e) => e.hostId === u?.uid && e.createdAt > since).length;
  }

  // RSVPs
  async myRsvps() {
    const u = this.me();
    return this.s.rsvps.filter((r) => r.uid === u?.uid);
  }
  async setRsvp(event: OutEvent, status: RsvpStatus | null) {
    const u = this.need();
    const e = this.s.events.find((x) => x.id === event.id);
    if (!e) return;
    const prev = this.s.rsvps.find((r) => r.uid === u.uid && r.eventId === e.id);
    if (prev) {
      if (prev.status === 'going') e.goingCount--;
      else e.interestedCount--;
      this.s.rsvps = this.s.rsvps.filter((r) => r !== prev);
    }
    if (status) {
      if (status === 'going' && e.capacity && e.goingCount >= e.capacity) throw new AppError('Event is full');
      this.s.rsvps.push({ eventId: e.id, uid: u.uid, username: u.username, minor: isMinor(u.birthYear), status, createdAt: Date.now() });
      if (status === 'going') e.goingCount++;
      else e.interestedCount++;
    }
    this.save();
  }
  async attendees(eventId: string) {
    return this.s.rsvps.filter((r) => r.eventId === eventId && r.status === 'going');
  }
  async markRsvpPrompted(eventId: string) {
    const u = this.me();
    const r = this.s.rsvps.find((x) => x.uid === u?.uid && x.eventId === eventId);
    if (r) r.promptHandled = true;
    this.save();
  }

  // Favorites
  async listFavorites() {
    const u = this.me();
    return u ? this.s.favorites[u.uid] ?? [] : [];
  }
  async toggleFavorite(type: Favorite['type'], refId: string) {
    const u = this.need();
    const list = (this.s.favorites[u.uid] ??= []);
    const i = list.findIndex((f) => f.type === type && f.refId === refId);
    if (i >= 0) list.splice(i, 1);
    else list.push({ id: newId(), type, refId, createdAt: Date.now() });
    this.save();
    return i < 0;
  }

  // Check-ins
  async checkIn(placeId: string) {
    const u = this.need();
    const now = Date.now();
    this.s.checkins = this.s.checkins.filter((c) => c.uid !== u.uid && now - c.createdAt < CHECKIN_TTL);
    this.s.checkins.push({ placeId, uid: u.uid, createdAt: now });
    this.save();
  }
  async activity() {
    const now = Date.now();
    const out: Record<string, Activity> = {};
    for (const c of [...this.s.checkins, ...simulatedCheckins()]) {
      if (now - c.createdAt > CHECKIN_TTL) continue;
      const a = (out[c.placeId] ??= { count: 0, last: 0 });
      a.count++;
      a.last = Math.max(a.last, c.createdAt);
    }
    return out;
  }
  async myActiveCheckIn() {
    const u = this.me();
    const c = this.s.checkins.find((x) => x.uid === u?.uid && Date.now() - x.createdAt < CHECKIN_TTL);
    return c?.placeId ?? null;
  }

  // Logs
  async listLogs() {
    const u = this.me();
    return [...(u ? this.s.logs[u.uid] ?? [] : [])].sort((a, b) => b.date - a.date);
  }
  async addLog(log: Omit<ActivityLog, 'id' | 'createdAt'>) {
    const u = this.need();
    (this.s.logs[u.uid] ??= []).push({ ...log, id: newId(), createdAt: Date.now() });
    this.save();
  }
  async deleteLog(id: string) {
    const u = this.need();
    this.s.logs[u.uid] = (this.s.logs[u.uid] ?? []).filter((l) => l.id !== id);
    this.save();
  }

  // Reports
  async report(r: Omit<Report, 'id' | 'reporterId' | 'createdAt' | 'status'>) {
    const u = this.need();
    if (this.s.reports.some((x) => x.reporterId === u.uid && x.targetId === r.targetId && x.status === 'open')) throw new AppError('Already reported');
    this.s.reports.push({ ...r, id: newId(), reporterId: u.uid, createdAt: Date.now(), status: 'open' });
    if (r.targetType === 'event' || r.targetType === 'image') {
      const e = this.s.events.find((x) => x.id === r.targetId);
      if (e && !e.reporters.includes(u.uid)) e.reporters.push(u.uid);
    }
    this.save();
  }
  private admin() {
    const u = this.need();
    if (u.role !== 'admin') throw new AppError('Admins only');
    return u;
  }
  async listReports() {
    this.admin();
    return [...this.s.reports].sort((a, b) => b.createdAt - a.createdAt);
  }
  async resolveReport(id: string, action: 'dismiss' | 'hide' | 'delete' | 'suspend') {
    this.admin();
    const r = this.s.reports.find((x) => x.id === id);
    if (!r) return;
    r.status = action === 'dismiss' ? 'dismissed' : 'actioned';
    const e = this.s.events.find((x) => x.id === r.targetId);
    if (action === 'dismiss' && e && e.reporters.length >= AUTO_HIDE_REPORTS) e.reporters = []; // admin cleared it
    if (action === 'hide' && e) e.hidden = true;
    if (action === 'delete') {
      if (e) this.s.events = this.s.events.filter((x) => x !== e);
      if (r.targetType === 'image') await idbDel(`img:${r.targetId}`);
    }
    if (action === 'suspend') {
      const target = this.s.users.find((u) => u.uid === (e?.hostId ?? r.targetId));
      if (target) target.suspended = true;
    }
    this.save();
  }
  async blockUser(uid: string) {
    const u = this.need();
    if (!u.blocked.includes(uid)) u.blocked.push(uid);
    this.save();
    this.emit();
  }
  async unblockUser(uid: string) {
    const u = this.need();
    u.blocked = u.blocked.filter((x) => x !== uid);
    this.save();
    this.emit();
  }
  async getPublicProfile(uid: string) {
    const u = this.s.users.find((x) => x.uid === uid);
    return u ? { uid, username: u.username, verifiedOrg: u.verifiedOrg, minor: isMinor(u.birthYear), createdAt: u.createdAt } : null;
  }

  // Orgs
  async requestOrg(r: Omit<OrgRequest, 'id' | 'uid' | 'username' | 'status' | 'createdAt'>) {
    const u = this.need();
    this.s.orgs.push({ ...r, id: newId(), uid: u.uid, username: u.username, status: 'pending', createdAt: Date.now() });
    this.save();
  }
  async myOrgRequest() {
    const u = this.me();
    return [...this.s.orgs].reverse().find((o) => o.uid === u?.uid) ?? null;
  }
  async listOrgRequests() {
    this.admin();
    return [...this.s.orgs].sort((a, b) => b.createdAt - a.createdAt);
  }
  async resolveOrgRequest(id: string, approve: boolean) {
    this.admin();
    const o = this.s.orgs.find((x) => x.id === id);
    if (!o) return;
    o.status = approve ? 'approved' : 'rejected';
    const u = this.s.users.find((x) => x.uid === o.uid);
    if (approve && u) {
      u.verifiedOrg = o.orgName;
      this.s.events.filter((e) => e.hostId === u.uid).forEach((e) => { e.hostVerified = true; e.orgName = o.orgName; });
    }
    this.save();
    this.emit();
  }

  async adminStats(): Promise<AdminStats> {
    this.admin();
    const act = await this.activity();
    return {
      users: this.s.users.length,
      events: this.s.events.filter((e) => e.end > Date.now()).length,
      openReports: this.s.reports.filter((r) => r.status === 'open').length,
      pendingOrgs: this.s.orgs.filter((o) => o.status === 'pending').length,
      checkInsToday: Object.values(act).reduce((s, a) => s + a.count, 0),
    };
  }
}
