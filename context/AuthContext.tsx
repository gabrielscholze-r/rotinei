import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithCredential,
  signOut as fbSignOut,
  User,
} from 'firebase/auth';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { auth } from '../lib/firebase';
import { setFirestoreSyncFn } from '../lib/storage';
import { setFirestoreKey } from '../lib/firestore';
import { performSync, applyMerged, ConflictItem } from '../lib/sync';

WebBrowser.maybeCompleteAuthSession();

export type SyncStatus = 'idle' | 'syncing' | 'conflict' | 'error';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  syncStatus: SyncStatus;
  conflicts: ConflictItem[];
  googleAuthReady: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  resolveConflicts: (resolutions: Record<string, 'local' | 'remote'>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [conflicts, setConflicts] = useState<ConflictItem[]>([]);
  const pendingMergedRef = useRef<Record<string, unknown>>({});
  const pendingConflictsRef = useRef<ConflictItem[]>([]);

  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  });

  const triggerSync = useCallback(async (uid: string) => {
    setSyncStatus('syncing');
    try {
      const result = await performSync(uid);

      if (result.skipped) {
        setSyncStatus('idle');
        return;
      }

      if (result.conflicts.length > 0) {
        pendingMergedRef.current = result.merged;
        pendingConflictsRef.current = result.conflicts;
        setConflicts(result.conflicts);
        setSyncStatus('conflict');
      } else {
        await applyMerged(uid, result.merged, {}, []);
        setSyncStatus('idle');
      }
    } catch (e) {
      console.error('[Auth] Sync error:', e);
      setSyncStatus('error');
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);

      if (firebaseUser) {
        setFirestoreSyncFn((key, value) =>
          setFirestoreKey(firebaseUser.uid, key, value)
        );
        triggerSync(firebaseUser.uid);
      } else {
        setFirestoreSyncFn(null);
        setSyncStatus('idle');
        setConflicts([]);
      }
    });
    return unsubscribe;
  }, [triggerSync]);

  useEffect(() => {
    if (response?.type !== 'success') return;
    const idToken =
      response.authentication?.idToken ?? response.params?.id_token;
    if (!idToken) return;
    const credential = GoogleAuthProvider.credential(idToken);
    signInWithCredential(auth, credential).catch((e) =>
      console.error('[Auth] signInWithCredential error:', e)
    );
  }, [response]);

  async function signInWithGoogle() {
    await promptAsync();
  }

  async function signOut() {
    setFirestoreSyncFn(null);
    await fbSignOut(auth);
  }

  async function resolveConflicts(resolutions: Record<string, 'local' | 'remote'>) {
    if (!user) return;
    await applyMerged(
      user.uid,
      pendingMergedRef.current,
      resolutions,
      pendingConflictsRef.current
    );
    pendingMergedRef.current = {};
    pendingConflictsRef.current = [];
    setConflicts([]);
    setSyncStatus('idle');
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        syncStatus,
        conflicts,
        googleAuthReady: !!request,
        signInWithGoogle,
        signOut,
        resolveConflicts,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
