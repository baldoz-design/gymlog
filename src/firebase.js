import { initializeApp }                            from 'firebase/app';
import { getAuth, GoogleAuthProvider }               from 'firebase/auth';
import { initializeFirestore, persistentLocalCache } from 'firebase/firestore';

const config = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(config);

export const auth           = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Offline persistence: i dati vengono cachati in IndexedDB locale
// e sincronizzati quando torna la connessione.
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache(),
});
