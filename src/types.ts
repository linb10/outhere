export type PlaceCategory =
  | 'park' | 'trail' | 'basketball' | 'tennis' | 'handball' | 'field' | 'playground'
  | 'landmark' | 'waterfront' | 'library' | 'restroom' | 'fountain';

export interface Place {
  id: string;
  name: string;
  category: PlaceCategory;
  lat: number;
  lng: number;
  borough: string;
  amenities: string[];
  accessibility: Partial<Record<AccessNeed, boolean>>;
  geohash: string;
}

export type Interest =
  | 'hiking' | 'basketball' | 'tennis' | 'soccer' | 'baseball' | 'running' | 'biking' | 'parks'
  | 'landmarks' | 'waterfront' | 'volunteering' | 'cleanups' | 'fundraisers' | 'meetups' | 'family' | 'fitness';

export type AccessNeed = 'wheelchair' | 'restrooms' | 'shade' | 'seating';
export type TimeSlot = 'weekdayAM' | 'weekdayPM' | 'weekend';
export type GroupSize = 'solo' | 'small' | 'large';
export type Borough = 'Queens' | 'Brooklyn' | 'Manhattan' | 'Bronx' | 'Staten Island';

export interface Prefs {
  borough: Borough;
  zip?: string;
  maxDistance: number; // miles
  interests: Interest[];
  times: TimeSlot[];
  groupSize?: GroupSize;
  accessibility: AccessNeed[];
}

export interface UserProfile {
  uid: string;
  username: string;
  email: string;
  birthYear: number;
  role: 'user' | 'admin';
  verifiedOrg?: string;
  prefs: Prefs;
  onboarded: boolean;
  safetyAck: boolean;
  blocked: string[];
  suspended?: boolean;
  createdAt: number;
  isDemo?: boolean;
}

export interface OutEvent {
  id: string;
  title: string;
  category: Interest;
  description: string;
  whoShouldJoin: string;
  start: number; // epoch ms
  end: number;
  ageMin: number;
  ageMax: number; // 99 = no max
  familyFriendly: boolean;
  indoor: boolean;
  capacity?: number | null;
  placeId: string;
  placeName: string;
  lat: number;
  lng: number;
  borough: string;
  geohash: string;
  hostId: string;
  hostName: string;
  hostVerified: boolean;
  orgName?: string | null;
  goingCount: number;
  interestedCount: number;
  reporters: string[];
  hidden: boolean;
  cancelled: boolean;
  imageCount: number;
  createdAt: number;
  isDemo?: boolean;
}

export type EventInput = Omit<OutEvent, 'id' | 'hostId' | 'hostName' | 'hostVerified' | 'orgName' | 'goingCount' | 'interestedCount' | 'reporters' | 'hidden' | 'cancelled' | 'createdAt' | 'geohash' | 'imageCount'>;

export type RsvpStatus = 'going' | 'interested';
export interface Rsvp { eventId: string; uid: string; username: string; minor: boolean; status: RsvpStatus; createdAt: number; promptHandled?: boolean }

export interface Favorite { id: string; type: 'place' | 'event'; refId: string; createdAt: number }

export interface CheckIn { id: string; placeId: string; uid: string; createdAt: number; expiresAt: number }
export interface Activity { count: number; last: number }

export interface ActivityLog {
  id: string;
  date: number;
  category: Interest;
  placeName: string;
  minutes: number;
  note: string;
  volunteer: boolean;
  eventId?: string;
  createdAt: number;
}

export type ReportReason = 'spam' | 'inappropriate' | 'unsafe' | 'private address' | 'scam' | 'harassment' | 'other';
export interface Report {
  id: string;
  targetType: 'event' | 'user' | 'image';
  targetId: string;
  targetLabel: string;
  reason: ReportReason;
  note: string;
  reporterId: string;
  createdAt: number;
  status: 'open' | 'dismissed' | 'actioned';
}

export type OrgType = 'School' | 'Library' | 'Government/Official' | 'Nonprofit' | 'Parks' | 'Community Board' | 'Other';
export interface OrgRequest {
  id: string;
  uid: string;
  username: string;
  orgName: string;
  type: OrgType;
  website: string;
  email: string;
  role: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: number;
}

export interface PublicProfile { uid: string; username: string; verifiedOrg?: string; minor: boolean; createdAt: number }
