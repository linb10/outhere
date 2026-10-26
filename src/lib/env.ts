const e = import.meta.env;

export const firebaseConfig = {
  apiKey: e.VITE_FIREBASE_API_KEY,
  authDomain: e.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: e.VITE_FIREBASE_PROJECT_ID,
  appId: e.VITE_FIREBASE_APP_ID,
  messagingSenderId: e.VITE_FIREBASE_MESSAGING_SENDER_ID,
};

export const hasFirebase = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId);
export const mapsKey: string = e.VITE_GOOGLE_MAPS_API_KEY ?? '';
export const mapIdLight: string = e.VITE_GOOGLE_MAPS_MAP_ID_LIGHT ?? '';
export const mapIdDark: string = e.VITE_GOOGLE_MAPS_MAP_ID_DARK ?? '';
export const hasMaps = Boolean(mapsKey);
