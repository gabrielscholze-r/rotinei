import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeAuth, getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: 'AIzaSyBu7oCNTgXvHr971kxfpvtIXaGJy7cyXxM',
  authDomain: 'rotinei.firebaseapp.com',
  projectId: 'rotinei',
  storageBucket: 'rotinei.firebasestorage.app',
  messagingSenderId: '163495532256',
  appId: '1:163495532256:web:1ebc4c6637f48a69d32285',
};

// Custom AsyncStorage-backed persistence for React Native
// Firebase v12 removed getReactNativePersistence from public API
class RnAsyncStoragePersistence {
  readonly type = 'LOCAL' as const;
  async _isAvailable() { return true; }
  async _set(key: string, value: unknown) {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  }
  async _get(key: string) {
    const raw = await AsyncStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  }
  async _remove(key: string) { await AsyncStorage.removeItem(key); }
  _addListener(_k: string, _l: unknown) {}
  _removeListener(_k: string, _l: unknown) {}
}

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _auth: ReturnType<typeof getAuth>;
try {
  _auth = initializeAuth(app, {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    persistence: new RnAsyncStoragePersistence() as any,
  });
} catch {
  _auth = getAuth(app);
}

export const auth = _auth;
export const db = getFirestore(app);
