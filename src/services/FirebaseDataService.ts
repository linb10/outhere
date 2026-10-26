import { initializeApp } from 'firebase/app';
import {
  createUserWithEmailAndPassword, deleteUser, getAuth, GoogleAuthProvider, onAuthStateChanged, sendEmailVerification,
  sendPasswordResetEmail, signInWithEmailAndPassword, signInWithPopup, signOut, type User,
} from 'firebase/auth';
import {
  addDoc, arrayUnion, collection, deleteDoc, doc, getCountFromServer, getDoc, getDocs, increment, initializeFirestore,
  limit, onSnapshot, persistentLocalCache, query, runTransaction, serverTimestamp, setDoc, updateDoc, where, writeBatch,
  type Firestore,
} from 'firebase/firestore';
import { geohashForLocation } from 'geofire-common';
import { firebaseConfig } from '@/lib/env';
import { isMinor } from '@/lib/utils';
import { AUTO_HIDE_REPORTS } from '@/lib/recommend';
import type { Activity, ActivityLog, EventInput, Favorite, OrgRequest, OutEvent, Report, Rsvp, RsvpStatus, UserProfile } from '@/types';
import { AppError, CHECKIN_TTL, USERNAME_RE, type AdminStats, type DataService, type SignUpInput } from './DataService';

const DEFAULT_PREFS: UserProfile['prefs'] = { borough: 'Queens', maxDistance: 5, interests: [], times: [], accessibility: [] };

const friendly = (e: unknown): Error => {
  const code = (e as { code?: string })?.code ?? '';
  const map: Record<string, string> = {
    'auth/invalid-credential': 'Wrong username/email or password',
    'auth/wrong-password': 'Wrong username/email or password',
    'auth/user-not-found': 'Wrong username/email or password',
    'auth/email-already-in-use': 'Email already in use',
    'auth/weak-password': 'Password too weak',
    'auth/too-many-requests': 'Too many tries. Wait a minute.',
    'auth/popup-closed-by-user': 'Sign-in cancelled',
    'auth/requires-recent-login': 'Sign in again, then retry',
    'permission-denied': 'Not allowed',
  };
  return new AppError(map[code] ?? (e as Error)?.message ?? 'Something went wrong');
};

export class FirebaseDataService implements DataService {
  readonly mode = 'firebase' as const;
  private app = initializeApp(firebaseConfig);
  private auth = getAuth(this.app);
  private db: Firestore = initializeFirestore(this.app, { localCache: persistentLocalCache() });
  private profile: UserProfile | null = null;

  private get uid() {
    const u = this.auth.currentUser;
    if (!u) throw new AppError('Sign in first');
    return u.uid;
  }
  private need() {
    if (!this.profile) throw new AppError('Sign in first');
    if (this.profile.suspended) throw new AppError('Account suspended');
    return this.profile;
  }

  onAuth(cb: (u: UserProfile | null, needsProfile: boolean) => void) {
    let unsubDoc: (() => void) | null = null;
    const unsub = onAuthStateChanged(this.auth, (user: User | null) => {
      unsubDoc?.();
      unsubDoc = null;
      if (!user) {
        this.profile = null;
        cb(null, false);
        return;
      }
      unsubDoc = onSnapshot(doc(this.db, 'users', user.uid), (snap) => {
        this.profile = snap.exists() ? ({ ...(snap.data() as UserProfile), uid: user.uid }) : null;
        cb(this.profile, !snap.exists());
      }, () => cb(null, false));
    });
    return () => { unsub(); unsubDoc?.(); };
  }

  async usernameAvailable(username: string) {
    const s = await getDoc(doc(this.db, 'usernames', username.toLowerCase()));
    return !s.exists();
  }

  /** Claims usernames/{lower} atomically and creates the private + public profile docs. */
  private async claim(user: User, username: string, birthYear: number) {
    if (!USERNAME_RE.test(username)) throw new AppError('Invalid username');
    const lower = username.toLowerCase();
    await runTransaction(this.db, async (tx) => {
      const ref = doc(this.db, 'usernames', lower);
      if ((await tx.get(ref)).exists()) throw new AppError('Username taken');
      const now = Date.now();
      tx.set(ref, { uid: user.uid, email: user.email });
      tx.set(doc(this.db, 'users', user.uid), {
        uid: user.uid, username, email: user.email ?? '', birthYear, role: 'user', prefs: DEFAULT_PREFS,
        onboarded: false, safetyAck: false, blocked: [], createdAt: now,
      } satisfies UserProfile);
      tx.set(doc(this.db, 'profiles', user.uid), { username, minor: isMinor(birthYear), createdAt: now });
    });
  }

  async signUp({ email, password, username, birthYear }: SignUpInput) {
    if (!(await this.usernameAvailable(username))) throw new AppError('Username taken');
    let cred;
    try {
      cred = await createUserWithEmailAndPassword(this.auth, email, password);
    } catch (e) { throw friendly(e); }
    try {
      await this.claim(cred.user, username, birthYear);
      sendEmailVerification(cred.user).catch(() => {});
    } catch (e) {
      await deleteUser(cred.user).catch(() => {});
      throw friendly(e);
    }
  }

  async signIn(identifier: string, password: string) {
    let email = identifier.trim();
    if (!email.includes('@')) {
      const s = await getDoc(doc(this.db, 'usernames', email.toLowerCase()));
      if (!s.exists()) throw new AppError('Wrong username/email or password');
      email = s.data().email;
    }
    try { await signInWithEmailAndPassword(this.auth, email, password); } catch (e) { throw friendly(e); }
  }

  async signInGoogle() {
    try { await signInWithPopup(this.auth, new GoogleAuthProvider()); } catch (e) { throw friendly(e); }
  }
  async completeProfile(username: string, birthYear: number) {
    const u = this.auth.currentUser;
    if (!u) throw new AppError('Sign in first');
    try { await this.claim(u, username, birthYear); } catch (e) { throw friendly(e); }
  }
  async signOut() { await signOut(this.auth); }
  async resetPassword(email: string) {
    try { await sendPasswordResetEmail(this.auth, email); } catch (e) { throw friendly(e); }
  }
  async sendVerification() {
    if (this.auth.currentUser) await sendEmailVerification(this.auth.currentUser);
  }
  emailVerified() {
    const u = this.auth.currentUser;
    return !u || u.emailVerified || u.providerData.some((p) => p.providerId === 'google.com');
  }

  async deleteAccount() {
    const user = this.auth.currentUser;
    if (!user) return;
    const uid = user.uid;
    const p = this.profile;
    const batch = writeBatch(this.db);
    for (const sub of ['favorites', 'logs']) {
      (await getDocs(collection(this.db, 'users', uid, sub))).forEach((d) => batch.delete(d.ref));
    }
    (await getDocs(query(collection(this.db, 'rsvps'), where('uid', '==', uid)))).forEach((d) => batch.delete(d.ref));
    (await getDocs(query(collection(this.db, 'events'), where('hostId', '==', uid)))).forEach((d) => {
      batch.delete(d.ref);
      batch.delete(doc(this.db, 'eventImages', d.id));
    });
    batch.delete(doc(this.db, 'checkins', uid));
    batch.delete(doc(this.db, 'profiles', uid));
    if (p) batch.delete(doc(this.db, 'usernames', p.username.toLowerCase()));
    batch.delete(doc(this.db, 'users', uid));
    await batch.commit();
    try { await deleteUser(user); } catch (e) { throw friendly(e); }
  }

  async updateProfile(patch: Partial<UserProfile>) {
    const { role: _r, verifiedOrg: _v, uid: _u, username: _n, suspended: _s, ...safe } = patch;
    await updateDoc(doc(this.db, 'users', this.uid), safe);
  }

  // Events
  async listEvents() {
    const since = Date.now() - 864e5;
    const snap = await getDocs(query(collection(this.db, 'events'), where('end', '>', since), where('hidden', '==', false), limit(500)));
    return snap.docs.map((d) => ({ ...(d.data() as OutEvent), id: d.id }));
  }
  async getEvent(id: string) {
    const s = await getDoc(doc(this.db, 'events', id)).catch(() => null);
    return s?.exists() ? ({ ...(s.data() as OutEvent), id: s.id }) : null;
  }
  async createEvent(input: EventInput, images: string[]) {
    const u = this.need();
    if ((await this.myEventsToday()) >= 5) throw new AppError('Limit: 5 events per day');
    const data: Omit<OutEvent, 'id'> = {
      ...input, geohash: geohashForLocation([input.lat, input.lng]), hostId: u.uid, hostName: u.username,
      hostVerified: Boolean(u.verifiedOrg), orgName: u.verifiedOrg ?? null, goingCount: 0, interestedCount: 0,
      reporters: [], hidden: false, cancelled: false, imageCount: images.length, createdAt: Date.now(),
    };
    try {
      const ref = await addDoc(collection(this.db, 'events'), data);
      if (images.length) await setDoc(doc(this.db, 'eventImages', ref.id), { hostId: u.uid, images });
      return ref.id;
    } catch (e) { throw friendly(e); }
  }
  async updateEvent(id: string, input: Partial<EventInput>, images?: string[]) {
    const patch: Record<string, unknown> = { ...input };
    if (input.lat != null && input.lng != null) patch.geohash = geohashForLocation([input.lat, input.lng]);
    if (images) patch.imageCount = images.length;
    try {
      await updateDoc(doc(this.db, 'events', id), patch);
      if (images) {
        const ev = await this.getEvent(id);
        if (images.length) await setDoc(doc(this.db, 'eventImages', id), { hostId: ev?.hostId ?? this.uid, images });
        else await deleteDoc(doc(this.db, 'eventImages', id));
      }
    } catch (e) { throw friendly(e); }
  }
  async cancelEvent(id: string) {
    await updateDoc(doc(this.db, 'events', id), { cancelled: true }).catch((e) => { throw friendly(e); });
  }
  async getEventImages(id: string) {
    const s = await getDoc(doc(this.db, 'eventImages', id)).catch(() => null);
    return (s?.data()?.images as string[]) ?? [];
  }
  async myEventsToday() {
    if (!this.auth.currentUser) return 0;
    const q = query(collection(this.db, 'events'), where('hostId', '==', this.uid), where('createdAt', '>', Date.now() - 864e5));
    return (await getCountFromServer(q)).data().count;
  }

  // RSVPs — doc id `${eventId}_${uid}` so each user has at most one per event.
  async myRsvps() {
    if (!this.auth.currentUser) return [];
    const snap = await getDocs(query(collection(this.db, 'rsvps'), where('uid', '==', this.uid)));
    return snap.docs.map((d) => d.data() as Rsvp);
  }
  async setRsvp(event: OutEvent, status: RsvpStatus | null) {
    const u = this.need();
    const ref = doc(this.db, 'rsvps', `${event.id}_${u.uid}`);
    const evRef = doc(this.db, 'events', event.id);
    try {
      await runTransaction(this.db, async (tx) => {
        const prev = await tx.get(ref);
        const ev = await tx.get(evRef);
        if (!ev.exists()) throw new AppError('Event not found');
        const counts: Record<string, unknown> = {};
        const prevStatus = prev.exists() ? (prev.data().status as RsvpStatus) : null;
        if (prevStatus === status) return;
        if (prevStatus) counts[prevStatus === 'going' ? 'goingCount' : 'interestedCount'] = increment(-1);
        if (status) {
          const cap = ev.data().capacity;
          if (status === 'going' && cap && ev.data().goingCount >= cap) throw new AppError('Event is full');
          counts[status === 'going' ? 'goingCount' : 'interestedCount'] = increment(1);
          tx.set(ref, { eventId: event.id, uid: u.uid, username: u.username, minor: isMinor(u.birthYear), status, createdAt: Date.now() } satisfies Rsvp);
        } else tx.delete(ref);
        tx.update(evRef, counts);
      });
    } catch (e) { throw friendly(e); }
  }
  async attendees(eventId: string) {
    // Minors are never returned (rules also block reading their RSVPs).
    const snap = await getDocs(query(collection(this.db, 'rsvps'), where('eventId', '==', eventId), where('minor', '==', false), where('status', '==', 'going'), limit(50))).catch(() => null);
    return snap?.docs.map((d) => d.data() as Rsvp) ?? [];
  }
  async markRsvpPrompted(eventId: string) {
    await updateDoc(doc(this.db, 'rsvps', `${eventId}_${this.uid}`), { promptHandled: true }).catch(() => {});
  }

  // Favorites
  async listFavorites() {
    if (!this.auth.currentUser) return [];
    const snap = await getDocs(collection(this.db, 'users', this.uid, 'favorites'));
    return snap.docs.map((d) => ({ ...(d.data() as Favorite), id: d.id }));
  }
  async toggleFavorite(type: Favorite['type'], refId: string) {
    const ref = doc(this.db, 'users', this.uid, 'favorites', `${type}_${refId}`);
    if ((await getDoc(ref)).exists()) {
      await deleteDoc(ref);
      return false;
    }
    await setDoc(ref, { type, refId, createdAt: Date.now() });
    return true;
  }

  // Check-ins: one doc per user (checkins/{uid}); a new check-in replaces the old one.
  async checkIn(placeId: string) {
    this.need();
    const now = Date.now();
    await setDoc(doc(this.db, 'checkins', this.uid), { placeId, uid: this.uid, createdAt: now, expiresAt: now + CHECKIN_TTL }).catch((e) => { throw friendly(e); });
  }
  async activity() {
    const snap = await getDocs(query(collection(this.db, 'checkins'), where('expiresAt', '>', Date.now()))).catch(() => null);
    const out: Record<string, Activity> = {};
    snap?.forEach((d) => {
      const c = d.data();
      const a = (out[c.placeId] ??= { count: 0, last: 0 });
      a.count++;
      a.last = Math.max(a.last, c.createdAt);
    });
    return out;
  }
  async myActiveCheckIn() {
    if (!this.auth.currentUser) return null;
    const s = await getDoc(doc(this.db, 'checkins', this.uid)).catch(() => null);
    return s?.exists() && s.data().expiresAt > Date.now() ? (s.data().placeId as string) : null;
  }

  // Logs
  async listLogs() {
    if (!this.auth.currentUser) return [];
    const snap = await getDocs(collection(this.db, 'users', this.uid, 'logs'));
    return snap.docs.map((d) => ({ ...(d.data() as ActivityLog), id: d.id })).sort((a, b) => b.date - a.date);
  }
  async addLog(log: Omit<ActivityLog, 'id' | 'createdAt'>) {
    const clean = Object.fromEntries(Object.entries(log).filter(([, v]) => v !== undefined));
    await addDoc(collection(this.db, 'users', this.uid, 'logs'), { ...clean, createdAt: Date.now() });
  }
  async deleteLog(id: string) {
    await deleteDoc(doc(this.db, 'users', this.uid, 'logs', id));
  }

  // Reports — doc id `${targetId}_${uid}` makes reports unique per user.
  async report(r: Omit<Report, 'id' | 'reporterId' | 'createdAt' | 'status'>) {
    this.need();
    const ref = doc(this.db, 'reports', `${r.targetId}_${this.uid}`);
    try {
      await setDoc(ref, { ...r, reporterId: this.uid, createdAt: Date.now(), status: 'open', ts: serverTimestamp() });
    } catch {
      throw new AppError('Already reported');
    }
    if (r.targetType !== 'user') {
      await updateDoc(doc(this.db, 'events', r.targetId), { reporters: arrayUnion(this.uid) }).catch(() => {});
    }
  }
  async listReports() {
    const snap = await getDocs(query(collection(this.db, 'reports'), limit(200)));
    return snap.docs.map((d) => ({ ...(d.data() as Report), id: d.id })).sort((a, b) => b.createdAt - a.createdAt);
  }
  async resolveReport(id: string, action: 'dismiss' | 'hide' | 'delete' | 'suspend') {
    const rRef = doc(this.db, 'reports', id);
    const r = (await getDoc(rRef)).data() as Report | undefined;
    if (!r) return;
    const ev = r.targetType !== 'user' ? await this.getEvent(r.targetId) : null;
    const batch = writeBatch(this.db);
    batch.update(rRef, { status: action === 'dismiss' ? 'dismissed' : 'actioned' });
    if (action === 'dismiss' && ev && ev.reporters.length >= AUTO_HIDE_REPORTS) batch.update(doc(this.db, 'events', ev.id), { reporters: [] });
    if (action === 'hide' && ev) batch.update(doc(this.db, 'events', ev.id), { hidden: true });
    if (action === 'delete') {
      if (r.targetType === 'image') batch.delete(doc(this.db, 'eventImages', r.targetId));
      else if (ev) {
        batch.delete(doc(this.db, 'events', ev.id));
        batch.delete(doc(this.db, 'eventImages', ev.id));
      }
    }
    if (action === 'suspend') batch.update(doc(this.db, 'users', ev?.hostId ?? r.targetId), { suspended: true });
    await batch.commit().catch((e) => { throw friendly(e); });
  }
  async blockUser(uid: string) {
    await updateDoc(doc(this.db, 'users', this.uid), { blocked: arrayUnion(uid) });
  }
  async unblockUser(uid: string) {
    const p = this.need();
    await updateDoc(doc(this.db, 'users', this.uid), { blocked: p.blocked.filter((b) => b !== uid) });
  }
  async getPublicProfile(uid: string) {
    const s = await getDoc(doc(this.db, 'profiles', uid)).catch(() => null);
    return s?.exists() ? ({ uid, ...(s.data() as Omit<import('@/types').PublicProfile, 'uid'>) }) : null;
  }

  // Orgs
  async requestOrg(r: Omit<OrgRequest, 'id' | 'uid' | 'username' | 'status' | 'createdAt'>) {
    const u = this.need();
    await addDoc(collection(this.db, 'orgRequests'), { ...r, uid: u.uid, username: u.username, status: 'pending', createdAt: Date.now() }).catch((e) => { throw friendly(e); });
  }
  async myOrgRequest() {
    if (!this.auth.currentUser) return null;
    const snap = await getDocs(query(collection(this.db, 'orgRequests'), where('uid', '==', this.uid))).catch(() => null);
    const list = snap?.docs.map((d) => ({ ...(d.data() as OrgRequest), id: d.id })) ?? [];
    return list.sort((a, b) => b.createdAt - a.createdAt)[0] ?? null;
  }
  async listOrgRequests() {
    const snap = await getDocs(query(collection(this.db, 'orgRequests'), limit(200)));
    return snap.docs.map((d) => ({ ...(d.data() as OrgRequest), id: d.id })).sort((a, b) => b.createdAt - a.createdAt);
  }
  async resolveOrgRequest(id: string, approve: boolean) {
    const ref = doc(this.db, 'orgRequests', id);
    const o = (await getDoc(ref)).data() as OrgRequest | undefined;
    if (!o) return;
    const batch = writeBatch(this.db);
    batch.update(ref, { status: approve ? 'approved' : 'rejected' });
    if (approve) {
      batch.update(doc(this.db, 'users', o.uid), { verifiedOrg: o.orgName });
      batch.update(doc(this.db, 'profiles', o.uid), { verifiedOrg: o.orgName });
      (await getDocs(query(collection(this.db, 'events'), where('hostId', '==', o.uid)))).forEach((d) =>
        batch.update(d.ref, { hostVerified: true, orgName: o.orgName }),
      );
    }
    await batch.commit().catch((e) => { throw friendly(e); });
  }

  async adminStats(): Promise<AdminStats> {
    const c = async (q: Parameters<typeof getCountFromServer>[0]) => (await getCountFromServer(q).catch(() => null))?.data().count ?? 0;
    const [users, events, openReports, pendingOrgs, checkIns] = await Promise.all([
      c(collection(this.db, 'profiles')),
      c(query(collection(this.db, 'events'), where('end', '>', Date.now()))),
      c(query(collection(this.db, 'reports'), where('status', '==', 'open'))),
      c(query(collection(this.db, 'orgRequests'), where('status', '==', 'pending'))),
      c(query(collection(this.db, 'checkins'), where('expiresAt', '>', Date.now()))),
    ]);
    return { users, events, openReports, pendingOrgs, checkInsToday: checkIns };
  }
}
