
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, FirebaseStorage, connectStorageEmulator } from 'firebase/storage';
import { getAuth, Auth, connectAuthEmulator } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ⚙️ Configuración base del proyecto
const firebaseConfig = {
  apiKey: 'AIzaSyAqa8z6tto8-kpOlw0HEvbv7nB08dWe1jE',
  authDomain: 'embarcadero-ba3cc.firebaseapp.com',
  projectId: 'embarcadero-ba3cc',
  storageBucket: 'embarcadero-ba3cc.firebasestorage.app',
  messagingSenderId: '873074781210',
  appId: '1:873074781210:web:63c4944a70a9671a6e35a3',
};

// 🧠 Inicializa la app solo una vez
const app: FirebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// 🔐 Auth con persistencia nativa (evita el error “auth not registered yet”)
let auth: Auth;
try {
  const { initializeAuth, getReactNativePersistence } = require('firebase/auth/react-native');
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch {
  auth = getAuth(app);
}

// 💾 Firestore y Storage
export const db: Firestore = getFirestore(app);
export const storage: FirebaseStorage = getStorage(app);
export { app, auth };

// 🧩 Conectar SIEMPRE a los emuladores cuando esté en modo desarrollo
if (__DEV__) {
  try {
    connectFirestoreEmulator(db, 'localhost', 8080);
    connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
    connectStorageEmulator(storage, 'localhost', 9199);
    console.log('✅ Conectado a los emuladores de Firebase (modo DEV)');
  } catch (e) {
    console.warn('⚠️ No se pudo conectar a los emuladores:', e);
  }
}

