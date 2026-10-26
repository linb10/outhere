// Shared seed used by DemoDataService (in-browser) and scripts/seedFirestore.ts.
// Dates are relative to "now" so the demo always looks current.
import { geohashForLocation } from 'geofire-common';
import type { Interest, OutEvent, UserProfile } from '@/types';
import placesJson from './places.json';
import type { Place } from '@/types';

const places = placesJson as Place[];
const byId = new Map(places.map((p) => [p.id, p]));

export const DEMO_ACCOUNTS = {
  user: { email: 'demo@outhere.nyc', username: 'demo_user', password: 'OutHere-Demo-2026' },
  admin: { email: 'admin@outhere.nyc', username: 'demo_admin', password: 'OutHere-Admin-2026' },
};

const basePrefs = { borough: 'Queens' as const, maxDistance: 5, interests: [] as Interest[], times: [], accessibility: [] };

export const SEED_USERS: (Omit<UserProfile, 'createdAt'> & { password: string })[] = [
  { uid: 'demo-user', username: DEMO_ACCOUNTS.user.username, email: DEMO_ACCOUNTS.user.email, password: DEMO_ACCOUNTS.user.password, birthYear: 2005, role: 'user', prefs: { ...basePrefs, interests: ['basketball', 'hiking', 'volunteering', 'cleanups'], times: ['weekdayPM', 'weekend'] }, onboarded: true, safetyAck: true, blocked: [], isDemo: true },
  { uid: 'demo-admin', username: DEMO_ACCOUNTS.admin.username, email: DEMO_ACCOUNTS.admin.email, password: DEMO_ACCOUNTS.admin.password, birthYear: 1990, role: 'admin', prefs: { ...basePrefs, interests: ['parks', 'meetups'] }, onboarded: true, safetyAck: true, blocked: [], isDemo: true },
  { uid: 'org-hoops', username: 'flushing_hoops', email: 'hoops@demo.outhere.nyc', password: 'OutHere-Org-2026', birthYear: 1988, role: 'user', verifiedOrg: 'Flushing Youth Hoops', prefs: basePrefs, onboarded: true, safetyAck: true, blocked: [], isDemo: true },
  { uid: 'org-trails', username: 'alleypond_crew', email: 'trails@demo.outhere.nyc', password: 'OutHere-Org-2026', birthYear: 1985, role: 'user', verifiedOrg: 'Alley Pond Trail Crew', prefs: basePrefs, onboarded: true, safetyAck: true, blocked: [], isDemo: true },
  { uid: 'org-green', username: 'queens_green', email: 'green@demo.outhere.nyc', password: 'OutHere-Org-2026', birthYear: 1979, role: 'user', verifiedOrg: 'Queens Green Corps', prefs: basePrefs, onboarded: true, safetyAck: true, blocked: [], isDemo: true },
  { uid: 'org-teens', username: 'flushing_teens', email: 'teens@demo.outhere.nyc', password: 'OutHere-Org-2026', birthYear: 1992, role: 'user', verifiedOrg: 'Flushing Teen Council', prefs: basePrefs, onboarded: true, safetyAck: true, blocked: [], isDemo: true },
  { uid: 'user-maya', username: 'maya_runs', email: 'maya@demo.outhere.nyc', password: 'OutHere-Demo-2026', birthYear: 1998, role: 'user', prefs: basePrefs, onboarded: true, safetyAck: true, blocked: [], isDemo: true },
  { uid: 'user-dev', username: 'dev_tennis', email: 'dev@demo.outhere.nyc', password: 'OutHere-Demo-2026', birthYear: 2001, role: 'user', prefs: basePrefs, onboarded: true, safetyAck: true, blocked: [], isDemo: true },
];

type Row = [title: string, cat: Interest, placeId: string, day: number, hour: number, hours: number, host: string, desc: string, who: string, opts?: Partial<OutEvent>];

// prettier-ignore
const ROWS: Row[] = [
  ['Saturday Pickup Run', 'basketball', 'f-Q024basketball', 5, 10, 2, 'org-hoops', 'Full-court 5v5, teams balanced on arrival. Winners stay on.', 'All skill levels', { goingCount: 18 }],
  ['Teen Hoops Clinic', 'basketball', 'f-Q099basketball', 2, 16, 2, 'org-hoops', 'Footwork, shooting form and a short scrimmage. Coaches on site.', 'Ages 13–17', { ageMin: 13, ageMax: 17, goingCount: 12 }],
  ['Evening 3v3', 'basketball', 'f-Q021basketball', 1, 18, 2, 'user-maya', 'Casual half-court 3v3. Bring water.', 'Anyone who can run', { goingCount: 7 }],
  ['Kissena Ladder Night', 'tennis', 'f-Q024tennis', 3, 18, 2, 'user-dev', 'Doubles ladder, rotate partners every set. Balls provided.', 'Intermediate players', { goingCount: 9 }],
  ['Beginner Tennis Hour', 'tennis', 'f-Q021tennis', 6, 9, 1, 'user-dev', 'Basics of grip, swing and scoring. Loaner rackets available.', 'Never played? Perfect', { familyFriendly: true, goingCount: 6 }],
  ['Alley Pond Tulip Tree Hike', 'hiking', 'tr-Q001TulipTreeTrail', 5, 9, 2, 'org-trails', 'Easy 3-mile loop to the Queens Giant, the oldest tree in NYC.', 'Families and new hikers', { familyFriendly: true, goingCount: 22 }],
  ['Forest Park Trail Run', 'running', 'tr-Q015BlueTrail', 6, 8, 1.5, 'user-maya', '5-mile trail run on the Blue Trail. Moderate pace, no one left behind.', 'Comfortable running 5 mi', { goingCount: 11 }],
  ['Cunningham Bird Walk', 'hiking', 'tr-Q021WhiteTrail', 7, 8, 2, 'org-trails', 'Slow walk for fall migrants. Binoculars to share.', 'Anyone curious about birds', { familyFriendly: true, goingCount: 8 }],
  ['Kissena Park Cleanup', 'cleanups', 'pk-Q024', 5, 10, 3, 'org-green', 'Litter pickup around the lake. Gloves, bags and grabbers provided.', 'Volunteers 13+', { goingCount: 26 }],
  ['Fort Totten Shoreline Cleanup', 'cleanups', 'pk-Q458', 12, 9, 3, 'org-green', 'Clear debris along the waterfront. Wear closed-toe shoes.', 'Volunteers 13+, under 16 with adult', { goingCount: 19 }],
  ['Flushing Meadows Tree Care', 'volunteering', 'pk-Q099', 8, 10, 3, 'org-green', 'Mulch and water young street trees near the Unisphere.', 'Volunteers of all ages', { familyFriendly: true, goingCount: 14 }],
  ['Library Garden Volunteer Day', 'volunteering', 'qpl-Flushing', 4, 15, 2, 'org-teens', 'Plant bulbs and clean planters outside the Flushing branch.', 'Teens earning service hours', { ageMin: 13, ageMax: 19, goingCount: 10 }],
  ['Teen Service Hours Fair', 'volunteering', 'qpl-Flushing', 9, 16, 2, 'org-teens', 'Meet local groups looking for teen volunteers.', 'High school students', { indoor: true, ageMin: 13, ageMax: 19, goingCount: 31 }],
  ['Fun Run for Food Pantry', 'fundraisers', 'pk-Q099', 13, 9, 2, 'org-green', '2-mile loop around Meadow Lake. Donations go to a local pantry.', 'Runners and walkers', { familyFriendly: true, goingCount: 40 }],
  ['Bake Sale for Court Repairs', 'fundraisers', 'pk-Q024', 10, 11, 4, 'org-hoops', 'Proceeds fund new nets and backboards.', 'Everyone', { familyFriendly: true, goingCount: 15 }],
  ['Queens Greenway Ride', 'biking', 'tr-Q024Greenway', 6, 10, 2.5, 'user-maya', '12-mile no-drop ride from Kissena to Alley Pond. Helmets required.', 'Riders comfortable in traffic', { goingCount: 13 }],
  ['Sunset Ride to Fort Totten', 'biking', 'pk-Q458', 3, 17, 2, 'user-maya', 'Easy waterfront ride, stop for photos at the bridge view.', 'Casual riders', { goingCount: 5 }],
  ['Sunday Soccer Pickup', 'soccer', 'f-Q099field', 7, 10, 2, 'user-dev', '7v7 small-sided games. Bring a light and dark shirt.', 'All levels', { goingCount: 20 }],
  ['Youth Soccer Skills', 'soccer', 'f-Q024field', 4, 16, 1.5, 'org-hoops', 'Dribbling and passing drills for new players.', 'Teens new to soccer', { ageMin: 13, ageMax: 17, goingCount: 9 }],
  ['Softball in the Park', 'baseball', 'f-Q021field', 12, 11, 2, 'user-dev', 'Co-ed slow-pitch softball. Gloves to share.', 'Anyone who can throw', { goingCount: 16 }],
  ['Batting Practice Meetup', 'baseball', 'f-Q005field', 2, 17, 2, 'user-dev', 'Bring your bat, we bring buckets of balls.', 'Players 16+', { ageMin: 16, goingCount: 4 }],
  ['Unisphere Photo Walk', 'landmarks', 'lm-Unisphere', 6, 15, 2, 'user-maya', 'Walk the 1964 World’s Fair grounds and shoot golden hour.', 'Any camera, even a phone', { goingCount: 12 }],
  ['Fort Totten History Walk', 'landmarks', 'lm-FortTottenBattery', 11, 13, 2, 'org-trails', 'Self-paced walk past the Civil War-era battery.', 'History fans', { familyFriendly: true, goingCount: 10 }],
  ['Socrates Sculpture Stroll', 'landmarks', 'lm-SocratesSculpturePark', 9, 14, 1.5, 'user-maya', 'See the fall exhibition, then walk the river path.', 'Art and city lovers', { goingCount: 6 }],
  ['Rockaway Boardwalk Walk', 'waterfront', 'pk-Q162', 13, 10, 2, 'user-maya', 'Easy 3-mile boardwalk walk. Ends at a coffee spot.', 'Walkers, any pace', { goingCount: 9 }],
  ['Astoria Park River Run', 'running', 'pk-Q004', 4, 7, 1, 'user-maya', '4 miles along the East River. Meet at the track.', 'Runners 10–12 min/mi', { goingCount: 14 }],
  ['Kissena Velodrome Laps', 'biking', 'pk-Q024', 8, 9, 1.5, 'user-maya', 'Steady laps on the historic track. Road bikes only.', 'Experienced riders', { goingCount: 3 }],
  ['Family Picnic Meetup', 'family', 'pk-Q006', 6, 12, 3, 'org-teens', 'Potluck picnic with lawn games for kids.', 'Families with kids', { familyFriendly: true, goingCount: 21 }],
  ['Playground Playdate', 'family', 'pk-Q308', 2, 10, 1.5, 'user-maya', 'Toddler meetup at the playground. Coffee for grown-ups.', 'Parents with little ones', { familyFriendly: true, goingCount: 7 }],
  ['Bootcamp in the Park', 'fitness', 'pk-Q099', 1, 7, 1, 'user-dev', 'Bodyweight circuits, all modifications shown.', 'All fitness levels', { goingCount: 17 }],
  ['Yoga on the Lawn', 'fitness', 'pk-Q006', 5, 9, 1, 'user-maya', 'Gentle flow on the lawn. Bring a mat or towel.', 'Beginners welcome', { familyFriendly: true, goingCount: 24 }],
  ['Stair & Hill Workout', 'fitness', 'pk-Q458', 10, 18, 1, 'user-dev', 'Hill repeats and core work. Headlamp recommended.', 'Intermediate', { goingCount: 6 }],
  ['Neighborhood Walk & Talk', 'meetups', 'pk-Q012', 3, 11, 1.5, 'user-maya', 'Easy walk to meet neighbors. Ends near the bay overlook.', 'New to the area? Join', { goingCount: 8 }],
  ['Board Games at the Library', 'meetups', 'qpl-Bayside', 7, 14, 2, 'org-teens', 'Chess, cards and strategy games for teens.', 'Teens 13–18', { indoor: true, ageMin: 13, ageMax: 18, goingCount: 11 }],
  ['Juniper Valley Pickup Run', 'basketball', 'f-Q102basketball', 9, 17, 2, 'user-dev', 'Fast 5v5 runs. Call next.', 'Experienced players 16+', { ageMin: 16, goingCount: 10 }],
  ['Handball Doubles Open', 'fitness', 'f-Q024handball', 11, 10, 3, 'user-dev', 'Friendly doubles bracket. Bring your own ball.', 'All levels', { goingCount: 8 }],
  ['Alley Pond Pond Loop', 'hiking', 'tr-Q001RedTrail', 14, 10, 2, 'org-trails', 'Kettle ponds loop. Muddy spots, wear boots.', 'Moderate hikers', { goingCount: 12 }],
  ['Forest Park Fall Foliage Hike', 'hiking', 'tr-Q015YellowTrail', 12, 10, 2.5, 'org-trails', 'Peak color on the Yellow Trail. Steady pace.', 'Hikers 13+', { goingCount: 27 }],
  ['Flushing Meadows Lake Cleanup', 'cleanups', 'pk-Q099', 15, 9, 3, 'org-green', 'Shoreline litter removal at Meadow Lake.', 'Volunteers 13+', { goingCount: 18 }],
  ['Cunningham Park Trail Repair', 'volunteering', 'pk-Q021', 16, 9, 4, 'org-trails', 'Fix erosion and clear brush on the White Trail. Tools provided.', 'Volunteers 16+', { ageMin: 16, goingCount: 9 }],
  ['Baisley Pond Fishing Meetup', 'waterfront', 'pk-Q005', 8, 8, 3, 'user-dev', 'Catch-and-release at the pond. Extra rods to share.', 'Beginners welcome', { familyFriendly: true, goingCount: 5 }],
  ['Kissena Lake Sunrise Walk', 'parks', 'pk-Q024', 2, 7, 1, 'user-maya', 'Quiet loop around the lake before work.', 'Early risers', { goingCount: 4 }],
  ['Fall Fest in the Park', 'parks', 'pk-Q099', 18, 12, 4, 'org-green', 'Lawn games, music and a leaf-art table for kids.', 'Everyone', { familyFriendly: true, goingCount: 48 }],
  ['Central Park Loop Ride', 'biking', 'pk-M010', 9, 8, 2, 'user-maya', 'Two laps of the park drive, café stop after.', 'Road riders', { goingCount: 8 }],
  ['Prospect Park Run Club', 'running', 'pk-B073', 7, 8, 1, 'user-maya', '3.3-mile loop at conversation pace.', 'All paces', { goingCount: 15 }],
];

export function buildSeedEvents(now = Date.now()): OutEvent[] {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const users = new Map(SEED_USERS.map((u) => [u.uid, u]));
  return ROWS.flatMap(([title, category, placeId, day, hour, hours, host, description, whoShouldJoin, opts], i) => {
    const p = byId.get(placeId);
    if (!p) return [];
    const h = users.get(host)!;
    const start = today.getTime() + day * 864e5 + hour * 36e5;
    return [{
      id: `demo-${i + 1}`, title, category, description, whoShouldJoin,
      start, end: start + hours * 36e5, ageMin: 13, ageMax: 99, familyFriendly: false, indoor: false, capacity: null,
      placeId, placeName: p.name, lat: p.lat, lng: p.lng, borough: p.borough || 'Queens',
      geohash: geohashForLocation([p.lat, p.lng]),
      hostId: host, hostName: h.username, hostVerified: Boolean(h.verifiedOrg), orgName: h.verifiedOrg ?? null,
      goingCount: 0, interestedCount: Math.round(((i * 7) % 11) + 2), reporters: [], hidden: false, cancelled: false,
      imageCount: 0, createdAt: now - (20 - (i % 20)) * 864e5, isDemo: true,
      ...opts,
    }];
  });
}
