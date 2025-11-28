import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getDatabase, ref, set, get, Database } from "firebase/database";

// Firebase configuration (shared with tic-tac-toe)
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBPRHYwXxfzl2hN3jIzRnvM1VqFX0TdEkw",
  authDomain: "playloop-studios.firebaseapp.com",
  databaseURL: "https://playloop-studios-default-rtdb.firebaseio.com",
  projectId: "playloop-studios",
  storageBucket: "playloop-studios.firebasestorage.app",
  messagingSenderId: "106333169704",
  appId: "1:106333169704:web:6d996e5017e1555e216d1d"
};

let app: FirebaseApp;
let db: Database;

try {
  if (!getApps().length) {
    app = initializeApp(FIREBASE_CONFIG);
  } else {
    app = getApps()[0];
  }
  db = getDatabase(app);
} catch (error) {
  console.error("Firebase Initialization Error. Counters will not work.", error);
}

// Visitor Counter Functions
export const incrementVisitorCount = async (): Promise<void> => {
  if (!db) throw new Error("Database not initialized");
  const visitorRef = ref(db, 'snake_visitorCount');
  const snapshot = await get(visitorRef);
  const currentCount = snapshot.exists() ? snapshot.val() : 0;
  await set(visitorRef, currentCount + 1);
};

export const getVisitorCount = async (): Promise<number> => {
  if (!db) throw new Error("Database not initialized");
  const visitorRef = ref(db, 'snake_visitorCount');
  const snapshot = await get(visitorRef);
  return snapshot.exists() ? snapshot.val() : 0;
};

export const incrementGamesPlayed = async (): Promise<void> => {
  if (!db) throw new Error("Database not initialized");
  const gamesRef = ref(db, 'snake_gamesPlayed');
  const snapshot = await get(gamesRef);
  const currentCount = snapshot.exists() ? snapshot.val() : 0;
  await set(gamesRef, currentCount + 1);
};

export const getGamesPlayed = async (): Promise<number> => {
  if (!db) throw new Error("Database not initialized");
  const gamesRef = ref(db, 'snake_gamesPlayed');
  const snapshot = await get(gamesRef);
  return snapshot.exists() ? snapshot.val() : 0;
};
