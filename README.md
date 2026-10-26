# OutHere

Find courts, trails, parks and outdoor events across the five boroughs. Built for the Congressional App Challenge 2026, NY-06 (Queens).

**Stack:** React 18 · TypeScript · Vite · Tailwind · Firebase (Spark, free) · Google Maps · Open-Meteo · NYC Open Data · PWA

## Run

```bash
npm install
npm run dev
```

No config? It runs in **demo mode** (seeded data in your browser, list instead of map). Add `.env` to go live.

| Command | Does |
| --- | --- |
| `npm run dev` | Dev server at http://localhost:5173 |
| `npm run build` | Type-check + production build |
| `npm test` | Recommendation + moderation tests |
| `npm run fetch:places` | Rebuild `src/data/places.json` from NYC Open Data |
| `npm run seed` | Seed Firestore (`-- --clear` to reset) |
| `npm run make-admin -- <username>` | Grant admin |
| `npm run deploy` | Build + deploy to Firebase Hosting |

**Judges:** Sign in → tap **Demo User** or **Demo Admin**.

## Setup (all free)

### 1. Firebase project
1. [console.firebase.google.com](https://console.firebase.google.com) → **Add project** (keep the free Spark plan).
2. **Project settings → Your apps → Web (`</>`)** → register. Copy the config.
3. `cp .env.example .env` and fill the `VITE_FIREBASE_*` values.

### 2. Auth + Firestore
1. **Build → Authentication → Get started** → enable **Email/Password** and **Google**.
2. **Authentication → Settings → Authorized domains**: `localhost` is there; `<project-id>.web.app` is added on deploy.
3. **Build → Firestore Database → Create** → **Production mode** → region **us-east1**.

### 3. Google Maps (separate Cloud project)
Maps keys need a billing account. Adding billing to the Firebase project's Cloud project would move Firebase to Blaze, so use a **separate** Cloud project for Maps.
1. [console.cloud.google.com](https://console.cloud.google.com) → **New project** (`outhere-maps`) → link a billing account to it only.
2. **APIs & Services → Library**: enable **Maps JavaScript API** and **Places API (New)**.
3. **Credentials → Create credentials → API key**. Then **Edit**:
   - Application restriction: **Websites** → `http://localhost:5173/*`, `https://<project-id>.web.app/*`, `https://<project-id>.firebaseapp.com/*`
   - API restriction: Maps JavaScript API, Places API (New)
4. **APIs & Services → Maps JavaScript API → Quotas**: set **Map loads per day** to `300`. **Places API (New) → Quotas**: set **Autocomplete requests per day** to `100`. This stays inside the monthly free usage.
5. **Google Maps Platform → Map management → Create Map ID** (JavaScript, Vector) twice: `outhere-light`, `outhere-dark`. Optionally attach a muted style to each in **Map styles**.
6. Put the key and both Map IDs in `.env`.

> With the quotas above you stay inside the free monthly usage ($0). Also set a **Budget alert** at $1 (Billing → Budgets). Prefer no billing at all? Skip this step: the app works without a key (list view + bundled places).

### 4. Deploy
```bash
npm i -g firebase-tools
firebase login
firebase use <project-id>
firebase deploy --only firestore
```
Seed data: **Project settings → Service accounts → Generate new private key** → save as `serviceAccount.json` in the repo root (git-ignored).
```bash
npm run seed
npm run deploy
```
Live at `https://<project-id>.web.app`. Installable on iOS (Share → Add to Home Screen) and Android.

## Structure

```
src/
  pages/            routes (lazy-loaded)
  components/       UI kit, layout, map, cards
  services/         DataService + Firebase / Demo implementations
  lib/recommend.ts  scoring engine (tested)
  lib/weather.ts    Open-Meteo + caching
  data/places.json  NYC Open Data, normalized
  data/seed.ts      demo users + 45 events
firestore.rules     all security (no Cloud Functions)
```

## Data sources
- NYC Parks Properties, Athletic Facilities, Hiking Trails, Drinking Fountains, Public Restrooms, Queens Library branches (NYC Open Data)
- Weather: Open-Meteo

See `DECISIONS.md` for trade-offs and `DEMO_SCRIPT.md` for the video flow.
