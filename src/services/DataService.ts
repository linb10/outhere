import type {
  Activity, ActivityLog, EventInput, Favorite, OrgRequest, OutEvent, PublicProfile, Report, Rsvp, RsvpStatus, UserProfile,
} from '@/types';

export interface SignUpInput { email: string; password: string; username: string; birthYear: number }

export interface AdminStats { users: number; events: number; openReports: number; pendingOrgs: number; checkInsToday: number }

/** One interface, two backends: Firestore (env configured) or in-browser demo data. */
export interface DataService {
  readonly mode: 'demo' | 'firebase';

  // Auth
  onAuth(cb: (user: UserProfile | null, needsProfile: boolean) => void): () => void;
  signUp(input: SignUpInput): Promise<void>;
  signIn(identifier: string, password: string): Promise<void>;
  signInGoogle(): Promise<void>;
  completeProfile(username: string, birthYear: number): Promise<void>;
  signOut(): Promise<void>;
  resetPassword(email: string): Promise<void>;
  sendVerification(): Promise<void>;
  emailVerified(): boolean;
  deleteAccount(): Promise<void>;
  updateProfile(patch: Partial<UserProfile>): Promise<void>;
  usernameAvailable(username: string): Promise<boolean>;

  // Events
  listEvents(): Promise<OutEvent[]>;
  getEvent(id: string): Promise<OutEvent | null>;
  createEvent(input: EventInput, images: string[]): Promise<string>;
  updateEvent(id: string, input: Partial<EventInput>, images?: string[]): Promise<void>;
  cancelEvent(id: string): Promise<void>;
  getEventImages(id: string): Promise<string[]>;
  myEventsToday(): Promise<number>;

  // RSVPs
  myRsvps(): Promise<Rsvp[]>;
  setRsvp(event: OutEvent, status: RsvpStatus | null): Promise<void>;
  attendees(eventId: string): Promise<Rsvp[]>;
  markRsvpPrompted(eventId: string): Promise<void>;

  // Favorites
  listFavorites(): Promise<Favorite[]>;
  toggleFavorite(type: Favorite['type'], refId: string): Promise<boolean>;

  // Check-ins
  checkIn(placeId: string): Promise<void>;
  activity(): Promise<Record<string, Activity>>;
  myActiveCheckIn(): Promise<string | null>;

  // Activity logs
  listLogs(): Promise<ActivityLog[]>;
  addLog(log: Omit<ActivityLog, 'id' | 'createdAt'>): Promise<void>;
  deleteLog(id: string): Promise<void>;

  // Reports & moderation
  report(r: Omit<Report, 'id' | 'reporterId' | 'createdAt' | 'status'>): Promise<void>;
  listReports(): Promise<Report[]>;
  resolveReport(id: string, action: 'dismiss' | 'hide' | 'delete' | 'suspend'): Promise<void>;
  blockUser(uid: string): Promise<void>;
  unblockUser(uid: string): Promise<void>;
  getPublicProfile(uid: string): Promise<PublicProfile | null>;

  // Verified orgs
  requestOrg(r: Omit<OrgRequest, 'id' | 'uid' | 'username' | 'status' | 'createdAt'>): Promise<void>;
  myOrgRequest(): Promise<OrgRequest | null>;
  listOrgRequests(): Promise<OrgRequest[]>;
  resolveOrgRequest(id: string, approve: boolean): Promise<void>;

  adminStats(): Promise<AdminStats>;
}

export const CHECKIN_TTL = 90 * 60 * 1000;
export const CHECKIN_RADIUS_M = 300;
export const USERNAME_RE = /^[A-Za-z0-9_]{3,20}$/;

export class AppError extends Error {}
