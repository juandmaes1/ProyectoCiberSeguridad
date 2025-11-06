import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore, connectFirestoreEmulator, doc, setDoc } from 'firebase/firestore';
import { getStorage, FirebaseStorage, connectStorageEmulator } from 'firebase/storage';
import { getAuth, Auth, connectAuthEmulator } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const firebaseConfig = {
  apiKey: 'AIzaSyAqa8z6tto8-kpOlw0HEvbv7nB08dWe1jE',
  authDomain: 'embarcadero-ba3cc.firebaseapp.com',
  projectId: 'embarcadero-ba3cc',
  storageBucket: 'embarcadero-ba3cc.firebasestorage.app',
  messagingSenderId: '873074781210',
  appId: '1:873074781210:web:63c4944a70a9671a6e35a3',
};

const app: FirebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

let auth: Auth;
try {
  const { initializeAuth, getReactNativePersistence } = require('firebase/auth/react-native');
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch {
  auth = getAuth(app);
}

export const db: Firestore = getFirestore(app);
export const storage: FirebaseStorage = getStorage(app);
export { app, auth };

const getEmulatorHost = (): string => {
  const envHost =
    typeof process !== 'undefined' && process.env
      ? process.env.EXPO_PUBLIC_FIREBASE_EMULATOR_HOST
      : undefined;

  if (envHost && envHost.length > 0) {
    return envHost;
  }

  if (Platform.OS === 'android') {
    return '10.0.2.2';
  }

  if (Platform.OS === 'ios') {
    return '127.0.0.1';
  }

  return 'localhost';
};

const ensureDefaultAdmin = async (host: string): Promise<void> => {
  const adminEmail =
    (typeof process !== 'undefined' &&
      process.env &&
      process.env.EXPO_PUBLIC_DEFAULT_ADMIN_EMAIL) ||
    'admin@admin.com';

  const adminPassword =
    (typeof process !== 'undefined' &&
      process.env &&
      process.env.EXPO_PUBLIC_DEFAULT_ADMIN_PASSWORD) ||
    '081305028';

  const baseUrl = `http://${host}:9099/identitytoolkit.googleapis.com/v1`;

  try {
    const signUpResponse = await fetch(`${baseUrl}/accounts:signUp?key=demo-key`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: adminEmail,
        password: adminPassword,
        returnSecureToken: true,
      }),
    });

    let localId: string | undefined;

    if (signUpResponse.ok) {
      const signUpData = await signUpResponse.json();
      localId = signUpData.localId;
    } else {
      const errorData = await signUpResponse.json();
      const errorMessage = errorData?.error?.message;

      if (errorMessage === 'EMAIL_EXISTS') {
        const signInResponse = await fetch(`${baseUrl}/accounts:signInWithPassword?key=demo-key`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: adminEmail,
            password: adminPassword,
            returnSecureToken: true,
          }),
        });

        if (signInResponse.ok) {
          const signInData = await signInResponse.json();
          localId = signInData.localId;
        } else {
          console.warn(
            'No se pudo iniciar sesion con el admin predeterminado:',
            await signInResponse.json(),
          );
        }
      } else {
        console.warn('No se pudo crear el admin predeterminado:', errorData);
      }
    }

    if (!localId) {
      return;
    }

    await setDoc(
      doc(db, 'Users', localId),
      {
        firstname: 'Admin',
        lastname: '',
        email: adminEmail,
        role: 'admin',
        approved: true,
      },
      { merge: true },
    );
  } catch (error) {
    console.warn('No se pudo garantizar el admin predeterminado:', error);
  }
};

if (__DEV__) {
  const emulatorHost = getEmulatorHost();

  try {
    connectFirestoreEmulator(db, emulatorHost, 8080);
    connectAuthEmulator(auth, `http://${emulatorHost}:9099`, { disableWarnings: true });
    connectStorageEmulator(storage, emulatorHost, 9199);
    console.log('Conectado a los emuladores de Firebase (modo DEV)', emulatorHost);
    void ensureDefaultAdmin(emulatorHost);
  } catch (error) {
    console.warn('No se pudo conectar a los emuladores:', error);
  }
}
