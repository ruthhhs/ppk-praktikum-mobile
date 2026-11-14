import {
  createUserWithEmailAndPassword,
  deleteUser,
  signInWithEmailAndPassword,
  signOut,
} from '@react-native-firebase/auth';
import { doc, serverTimestamp, setDoc } from '@react-native-firebase/firestore';
import { auth, db } from './index';

export function pesanErrorAuth(e: unknown): string {
  const code = (e as { code?: string })?.code ?? '';
  switch (code) {
    case 'auth/email-already-in-use': return 'Email sudah terdaftar.';
    case 'auth/invalid-email': return 'Format email tidak valid.';
    case 'auth/weak-password': return 'Password terlalu lemah.';
    case 'auth/invalid-credential':
    case 'auth/user-not-found':
    case 'auth/wrong-password': return 'Email atau password salah.';
    case 'auth/user-disabled': return 'Akun ini dinonaktifkan.';
    case 'auth/too-many-requests': return 'Terlalu banyak percobaan. Coba lagi nanti.';
    case 'auth/network-request-failed': return 'Tidak ada koneksi internet.';
    case 'firestore/permission-denied':
      return 'Profil gagal disimpan karena izin Firestore ditolak. Periksa Rules Firestore untuk dokumen users/{uid}.';
    case 'firestore/unauthenticated':
      return 'Profil gagal disimpan karena sesi Firebase tidak valid. Coba daftar kembali.';
    case 'firestore/unavailable':
      return 'Firestore tidak dapat dijangkau. Periksa koneksi internet lalu coba lagi.';
    case 'firestore/failed-precondition':
      return 'Firestore belum siap atau belum diaktifkan pada proyek Firebase.';
    default: return 'Terjadi kesalahan. Silakan coba lagi.';
  }
}

export async function registerUser(p: { nama: string; email: string; password: string; nim: string }) {
  const email = p.email.trim();
  const cred = await createUserWithEmailAndPassword(auth, email, p.password);
  const user = cred.user;

  const data: Record<string, unknown> = {
    uid: user.uid,
    nama: p.nama.trim(),
    email,
    role: 'praktikan', // selalu praktikan; asisten diubah PM lewat Console
    createdAt: serverTimestamp(),
    nim: p.nim.trim(),
  };

  try {
    await setDoc(doc(db, 'users', user.uid), data);
  } catch (e) {
    // Hindari akun Auth tanpa profil.
    await deleteUser(user).catch(() => {});
    throw e;
  }
}

export const loginUser = (email: string, password: string) =>
  signInWithEmailAndPassword(auth, email.trim(), password);

export const logoutUser = () => signOut(auth);
