import type { User as FirebaseUser } from '@react-native-firebase/auth';
import { onAuthStateChanged } from '@react-native-firebase/auth';
import React, { createContext, useEffect, useMemo, useState } from 'react';
import type { Role, UserProfile } from '@/data/types';
import { auth } from '@/services/firebase';
import { firestoreRefs, listenDocument } from '@/services/firebase/firestore';

type AuthState = {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  role: Role | null;
  loading: boolean;
  profileError: string | null;
};

export const AuthContext = createContext<AuthState | null>(null);

const PROFILE_TIMEOUT_MS = 8000;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);

  useEffect(() => onAuthStateChanged(auth, (nextUser) => {
    setUser(nextUser);
    if (!nextUser) {
      setProfile(null);
      setProfileError(null);
      setLoading(false);
    } else {
      setLoading(true);
    }
  }), []);

  useEffect(() => {
    if (!user) return undefined;

    let receivedProfile = false;
    setProfile(null);
    setProfileError(null);
    setLoading(true);

    const timeout = setTimeout(() => {
      if (!receivedProfile) {
        setProfileError('Profil akun tidak ditemukan. Hubungi pengelola aplikasi.');
        setLoading(false);
      }
    }, PROFILE_TIMEOUT_MS);

    const unsubscribe = listenDocument(
      firestoreRefs.user(user.uid),
      (userProfile) => {
        if (!userProfile) {
          receivedProfile = true;
          clearTimeout(timeout);
          setProfile(null);
          setProfileError('Profil akun tidak ditemukan. Hubungi pengelola aplikasi.');
          setLoading(false);
          return;
        }
        receivedProfile = true;
        clearTimeout(timeout);
        setProfile(userProfile);
        setProfileError(null);
        setLoading(false);
      },
      () => {
        receivedProfile = true;
        clearTimeout(timeout);
        setProfileError('Gagal memuat profil akun.');
        setLoading(false);
      },
    );

    return () => {
      clearTimeout(timeout);
      unsubscribe();
    };
  }, [user]);

  const value = useMemo<AuthState>(() => {
    const role = profile?.role;
    const hasValidRole = role === 'asisten' || role === 'praktikan';

    return {
      user,
      profile: hasValidRole ? profile : null,
      role: hasValidRole ? role : null,
      loading,
      profileError,
    };
  }, [user, profile, loading, profileError]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
