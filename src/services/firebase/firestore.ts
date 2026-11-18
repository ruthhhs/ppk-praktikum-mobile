import {
  addDoc,
  collection,
  collectionGroup,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
  serverTimestamp,
} from '@react-native-firebase/firestore';
import type {
  CollectionReference,
  DocumentData,
  DocumentReference,
  FirestoreError,
  Query,
  Unsubscribe,
  UpdateData,
  WithFieldValue,
} from '@react-native-firebase/firestore';
import type {
  JadwalDoc,
  KelasDoc,
  KodePresensiDoc,
  PengajuanIzinDoc,
  PesertaDoc,
  PraktikumDoc,
  PresensiDoc,
  SesiDoc,
} from '@/data/firestoreType';
import type { UserProfile } from '@/data/types';
import { rnDb } from './index';

export { serverTimestamp } from '@react-native-firebase/firestore';

export type WithId<T> = T & { id: string };
export type WithKelasId<T> = WithId<T> & { kelasId: string };
export type FirestoreListenerError = (error: FirestoreError) => void;

function documentReference<T extends DocumentData>(
  ...path: string[]
): DocumentReference<T, T> {
  return doc(rnDb, path[0], ...path.slice(1)) as DocumentReference<T, T>;
}

function collectionReference<T extends DocumentData>(
  ...path: string[]
): CollectionReference<T, T> {
  return collection(rnDb, path[0], ...path.slice(1)) as CollectionReference<T, T>;
}

export const firestoreRefs = {
  user: (uid: string) => documentReference<UserProfile>('users', uid),
  users: () => collectionReference<UserProfile>('users'),
  praktikum: () => collectionReference<PraktikumDoc>('praktikum'),
  praktikumDoc: (praktikumId: string) =>
    documentReference<PraktikumDoc>('praktikum', praktikumId),
  kelas: () => collectionReference<KelasDoc>('kelas'),
  kelasDoc: (kelasId: string) => documentReference<KelasDoc>('kelas', kelasId),
  peserta: (kelasId: string) =>
    collectionReference<PesertaDoc>('kelas', kelasId, 'peserta'),
  pesertaDoc: (kelasId: string, uid: string) =>
    documentReference<PesertaDoc>('kelas', kelasId, 'peserta', uid),
  jadwal: () => collectionReference<JadwalDoc>('jadwal'),
  jadwalDoc: (jadwalId: string) =>
    documentReference<JadwalDoc>('jadwal', jadwalId),
  sesi: () => collectionReference<SesiDoc>('sesi'),
  sesiDoc: (sesiId: string) => documentReference<SesiDoc>('sesi', sesiId),
  kodePresensi: (sesiId: string) =>
    documentReference<KodePresensiDoc>('kodePresensi', sesiId),
  presensi: (sesiId: string) =>
    collectionReference<PresensiDoc>('sesi', sesiId, 'presensi'),
  presensiDoc: (sesiId: string, uid: string) =>
    documentReference<PresensiDoc>('sesi', sesiId, 'presensi', uid),
  pengajuanIzin: (sesiId: string) =>
    collectionReference<PengajuanIzinDoc>('sesi', sesiId, 'pengajuanIzin'),
  pengajuanIzinDoc: (sesiId: string, uid: string) =>
    documentReference<PengajuanIzinDoc>('sesi', sesiId, 'pengajuanIzin', uid),
};

export function listenDocument<T extends DocumentData>(
  reference: DocumentReference<T, T>,
  onValue: (value: T | null) => void,
  onError: FirestoreListenerError,
): Unsubscribe {
  return onSnapshot(
    reference,
    (snapshot) => onValue(snapshot.exists() ? snapshot.data() : null),
    onError,
  );
}

export function listenCollection<T extends DocumentData>(
  reference: Query<T, T>,
  onValue: (value: WithId<T>[]) => void,
  onError: FirestoreListenerError,
): Unsubscribe {
  return onSnapshot(
    reference,
    (snapshot) => {
      onValue(
        snapshot.docs.map((documentSnapshot) => ({
          ...documentSnapshot.data(),
          id: documentSnapshot.id,
        })) as WithId<T>[],
      );
    },
    onError,
  );
}

export function listenKeanggotaanPraktikan(
  uid: string,
  onValue: (value: WithKelasId<PesertaDoc>[]) => void,
  onError: FirestoreListenerError,
): Unsubscribe {
  const membershipQuery = query(
    collectionGroup(rnDb, 'peserta'),
    where('uid', '==', uid),
  );

  return onSnapshot(
    membershipQuery,
    (snapshot) => {
      const memberships: WithKelasId<PesertaDoc>[] = [];
      for (const documentSnapshot of snapshot.docs) {
        const kelasId = documentSnapshot.ref.parent.parent?.id;
        if (!kelasId) continue;

        memberships.push({
          ...documentSnapshot.data(),
          id: documentSnapshot.id,
          kelasId,
        } as WithKelasId<PesertaDoc>);
      }
      onValue(memberships);
    },
    onError,
  );
}

export async function readDocument<T extends DocumentData>(
  reference: DocumentReference<T, T>,
): Promise<T | null> {
  const snapshot = await getDoc(reference);
  return snapshot.exists() ? snapshot.data() : null;
}

export async function readCollection<T extends DocumentData>(
  reference: Query<T, T>,
): Promise<WithId<T>[]> {
  const snapshot = await getDocs(reference);
  return snapshot.docs.map((documentSnapshot) => ({
    ...documentSnapshot.data(),
    id: documentSnapshot.id,
  })) as WithId<T>[];
}

export async function addDocument<T extends DocumentData>(
  reference: CollectionReference<T, T>,
  value: WithFieldValue<T>,
): Promise<string> {
  const newDocument = await addDoc(reference, value);
  return newDocument.id;
}

export function setDocument<T extends DocumentData>(
  reference: DocumentReference<T, T>,
  value: WithFieldValue<T>,
): Promise<void> {
  return setDoc(reference, value);
}

export function updateDocument<T extends DocumentData>(
  reference: DocumentReference<T, T>,
  value: UpdateData<T>,
): Promise<void> {
  return updateDoc(reference, value);
}

export function removeDocument<T extends DocumentData>(
  reference: DocumentReference<T, T>,
): Promise<void> {
  return deleteDoc(reference);
}

export async function ambilDaftarPraktikan(): Promise<WithId<UserProfile>[]> {
  return readCollection(
    query(firestoreRefs.users(), where('role', '==', 'praktikan')),
  );
}

export function tambahPeserta(kelasId: string, uid: string, nama = ""): Promise<void> {
  return setDocument(firestoreRefs.pesertaDoc(kelasId, uid), {
    uid,
    nama,
    aktif: true,
    joinedAt: serverTimestamp(),
  });
}

export function pantauPesertaKelas(
  kelasId: string,
  onValue: (value: WithId<PesertaDoc>[]) => void,
  onError: FirestoreListenerError,
): Unsubscribe {
  return listenCollection(firestoreRefs.peserta(kelasId), onValue, onError);
}

export function nonaktifkanPeserta(kelasId: string, uid: string): Promise<void> {
  return updateDocument(firestoreRefs.pesertaDoc(kelasId, uid), {
    aktif: false,
  });
}
