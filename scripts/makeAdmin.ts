// Grants admin role. Usage: npm run make-admin -- <username or email>
import { readFileSync, existsSync } from 'node:fs';
import { cert, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const who = process.argv[2];
const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS ?? 'serviceAccount.json';
if (!who || !existsSync(keyPath)) {
  console.error('Usage: npm run make-admin -- <username|email>  (needs serviceAccount.json)');
  process.exit(1);
}
initializeApp({ credential: cert(JSON.parse(readFileSync(keyPath, 'utf8'))) });
const db = getFirestore();

(async () => {
  let uid: string;
  if (who.includes('@')) uid = (await getAuth().getUserByEmail(who)).uid;
  else {
    const s = await db.doc(`usernames/${who.toLowerCase()}`).get();
    if (!s.exists) throw new Error('No such username');
    uid = s.data()!.uid;
  }
  await db.doc(`users/${uid}`).update({ role: 'admin' });
  console.log(`${who} is now an admin`);
  process.exit(0);
})();
