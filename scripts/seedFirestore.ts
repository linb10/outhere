// Seeds demo users, verified orgs and 40+ upcoming events into Firestore.
// Usage: npm run seed            (add/refresh demo data)
//        npm run seed -- --clear (remove all isDemo data first)
// Needs serviceAccount.json (Firebase console → Project settings → Service accounts → Generate key). Free on Spark.
import { readFileSync, existsSync } from 'node:fs';
import { cert, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { buildSeedEvents, SEED_USERS } from '../src/data/seed';

const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS ?? 'serviceAccount.json';
if (!existsSync(keyPath)) {
  console.error(`Missing ${keyPath}. Download a service account key (free) and save it here.`);
  process.exit(1);
}
initializeApp({ credential: cert(JSON.parse(readFileSync(keyPath, 'utf8'))) });
const auth = getAuth();
const db = getFirestore();

async function clear() {
  for (const col of ['events', 'eventImages', 'rsvps', 'reports', 'orgRequests', 'checkins']) {
    const snap = await db.collection(col).where('isDemo', '==', true).get();
    const batch = db.batch();
    snap.forEach((d) => batch.delete(d.ref));
    await batch.commit();
    console.log(`cleared ${snap.size} ${col}`);
  }
  for (const u of SEED_USERS) {
    await auth.deleteUser(u.uid).catch(() => {});
    await db.doc(`users/${u.uid}`).delete();
    await db.doc(`profiles/${u.uid}`).delete();
    await db.doc(`usernames/${u.username.toLowerCase()}`).delete();
  }
  console.log('cleared demo users');
}

async function seed() {
  const now = Date.now();
  for (const { password, ...u } of SEED_USERS) {
    try {
      await auth.createUser({ uid: u.uid, email: u.email, password, emailVerified: true, displayName: u.username });
    } catch (e) {
      if ((e as { code?: string }).code !== 'auth/uid-already-exists') throw e;
      await auth.updateUser(u.uid, { email: u.email, password, emailVerified: true });
    }
    const minor = new Date().getFullYear() - u.birthYear < 18;
    await db.doc(`users/${u.uid}`).set({ ...u, createdAt: now - 60 * 864e5 });
    await db.doc(`profiles/${u.uid}`).set({ username: u.username, minor, createdAt: now - 60 * 864e5, ...(u.verifiedOrg ? { verifiedOrg: u.verifiedOrg } : {}) });
    await db.doc(`usernames/${u.username.toLowerCase()}`).set({ uid: u.uid, email: u.email });
  }
  console.log(`seeded ${SEED_USERS.length} users`);

  const events = buildSeedEvents(now);
  const batch = db.batch();
  for (const { id, ...e } of events) batch.set(db.doc(`events/${id}`), e);
  // A pending org request so the admin queue has something.
  batch.set(db.doc('orgRequests/demo-org-1'), { uid: 'user-dev', username: 'dev_tennis', orgName: 'Kissena Tennis Club', type: 'Nonprofit', website: 'https://example.org', email: 'club@example.org', role: 'Organizer', status: 'pending', createdAt: now, isDemo: true });
  await batch.commit();
  console.log(`seeded ${events.length} events`);
}

(async () => {
  if (process.argv.includes('--clear')) await clear();
  await seed();
  console.log('done');
  process.exit(0);
})();
