// Temporary shims to satisfy TypeScript in RN/Expo until deps are installed.

declare module 'firebase/auth/react-native' {
  import type { FirebaseApp } from 'firebase/app';
  import type { Auth } from 'firebase/auth';

  export function initializeAuth(
    app: FirebaseApp,
    deps: { persistence: any }
  ): Auth;

  export function getReactNativePersistence(storage: any): any;
}

declare module '@react-native-async-storage/async-storage' {
  const AsyncStorage: {
    getItem(key: string): Promise<string | null>;
    setItem(key: string, value: string): Promise<void>;
    removeItem(key: string): Promise<void>;
    clear?(): Promise<void>;
  };
  export default AsyncStorage;
}

