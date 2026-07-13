import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// ⚠️ IMPORTANTE: Reemplaza estos valores con los de tu proyecto de Firebase
// Andrés: ve a https://console.firebase.google.com, crea un proyecto nuevo,
// agrega una app web, y copia el firebaseConfig que te da.
// Por ahora uso valores placeholder — la app seguirá funcionando con LocalStorage
// hasta que pongas los datos reales.
const env = (import.meta as any).env || {};

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || "PLACEHOLDER",
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || "PLACEHOLDER",
  projectId: env.VITE_FIREBASE_PROJECT_ID || "PLACEHOLDER",
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || "PLACEHOLDER",
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || "PLACEHOLDER",
  appId: env.VITE_FIREBASE_APP_ID || "PLACEHOLDER",
};

const isFirebaseConfigured = firebaseConfig.apiKey !== "PLACEHOLDER";

let app: any = null;
let db: any = null;
let auth: any = null;
let googleProvider: any = null;

if (isFirebaseConfigured) {
  try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
    googleProvider = new GoogleAuthProvider();
  } catch (error) {
    console.warn("Firebase no se pudo inicializar. Usando LocalStorage.", error);
  }
}

export { db, auth, googleProvider, isFirebaseConfigured };
