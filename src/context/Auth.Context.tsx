import type { FirebaseAuthTypes } from '@react-native-firebase/auth';
import { onAuthStateChanged } from '@react-native-firebase/auth';
import { doc, onSnapshot } from '@react-native-firebase/firestore';
import React, { createContext, useEffect, useMemo, useState } from 'react';
import type { Role, UserProfile } from '@/data/types';
import { auth, db } from '@/services/firebase';

type AuthState = {
  user: FirebaseAuthTypes.User | null;
  profile: UserProfile | null;
  role: Role | null;
  loading: boolean;
  profileError: string | null;
};

export const AuthContext = createContext<AuthState | null>(null);

const PROFILE_TIMEOUT_MS = 8000;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseAuthTypes.User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);

  // 1) Status login
  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) {
        setProfile(null);
        setProfileError(null);
        setLoading(false);
      } else {
        setLoading(true);
      }
    });
  }, []);

  // 2) Profil real-time (perubahan role oleh PM langsung terbaca)
  useEffect(() => {
    if (!user) return;
    let received = false;

    const timer = setTimeout(() => {
      if (!received) {
        setProfileError('Profil akun tidak ditemukan. Hubungi PM.');
        setLoading(false);
      }
    }, PROFILE_TIMEOUT_MS);

    const unsub = onSnapshot(
      doc(db, 'users', user.uid),
      (snap) => {
        if (snap.exists()) {
          received = true;
          clearTimeout(timer);
          setProfile(snap.data() as UserProfile);
          setProfileError(null);
          setLoading(false);
        }
        // Belum ada dokumen: tunggu, mungkin registrasi masih menulis profil.
      },
      () => {
        received = true;
        clearTimeout(timer);
        setProfileError('Gagal memuat profil akun.');
        setLoading(false);
      },
    );

    return () => {
      clearTimeout(timer);
      unsub();
    };
  }, [user?.uid]);

  const value = useMemo<AuthState>(() => {
    const valid = profile?.role === 'asisten' || profile?.role === 'praktikan';
    return {
      user,
      profile: valid ? profile : null,
      role: valid ? profile!.role : null,
      loading,
      profileError,
    };
  }, [user, profile, loading, profileError]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}