import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { onAuthStateChanged } from '@react-native-firebase/auth';
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  type Timestamp,
} from '@react-native-firebase/firestore';
import { dummyPresensi, dummySesi, dummyUsers } from '../../data/dummy';
import type { Praktikum, Role, SesiStatus, User } from '../../data/types';
import { useApp } from '../../hooks/useApp';
import { klasifikasikanAlasanIzin } from '../../services/ai';
import { auth, db, isFirebaseConfigured } from '../../services/firebase';

export type { Praktikum, Role, SesiStatus, User };

export type StatusIzinPraktikan = 'menunggu' | 'diterima' | 'ditolak';

export type PengajuanIzinRingkas = {
  id: string;
  sesiId: string;
  userId: string;
  alasan: string;
  kategoriAI?: string;
  statusKlasifikasi: 'berhasil' | 'gagal';
  status: StatusIzinPraktikan;
  createdAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
};

export type AlasanGagalIzin =
  | 'belum_login'
  | 'sesi_tidak_ditemukan'
  | 'sesi_ditutup'
  | 'sudah_presensi'
  | 'sudah_mengajukan'
  | 'alasan_kosong'
  | 'alasan_panjang'
  | 'gagal_jaringan';

export type HasilPengajuanIzin =
  | {
      ok: true;
      pengajuan: PengajuanIzinRingkas;
      pesanKlasifikasi?: string;
    }
  | {
      ok: false;
      reason: AlasanGagalIzin;
      pesan: string;
    };

export type Sesi = {
  id: string;
  jadwalId?: string;
  kelasId?: string;
  praktikumId: string;
  namaPraktikum?: string;
  pertemuanKe: number;
  kelas: string;
  lab: string;
  tanggal: string;
  jamMulai: string;
  jamSelesai: string;
  status: SesiStatus;
  catatan?: string;
  hadir?: number;
  total?: number;
};

export type Presensi = {
  id: string;
  sesiId: string;
  userId: string;
  waktu: string;
};

export type AlasanGagalPresensi =
  | 'belum_login'
  | 'kode_kosong'
  | 'kode_format'
  | 'kode_salah'
  | 'sudah_presensi'
  | 'izin_diterima'
  | 'belum_dibuka'
  | 'sudah_ditutup'
  | 'sesi_tidak_ditemukan'
  | 'gagal_jaringan';

export type HasilPresensi =
  | {
      ok: true;
      presensi: Presensi;
    }
  | {
      ok: false;
      reason: AlasanGagalPresensi;
      pesan: string;
    };

export const WARNA = {
  bg: '#FFFFFF',
  surface: '#FEFFE0',
  text: '#17454A',
  textMuted: 'rgba(23, 69, 74, 0.7)',
  primary: '#B5185F',
  highlight: '#D0E86E',
  accent: '#35C1C2',
  border: 'rgba(23, 69, 74, 0.15)',
  scrim: 'rgba(23, 69, 74, 0.5)',
} as const;

export const LABEL_STATUS: Record<SesiStatus, string> = {
  belum_dibuka: 'Belum dibuka',
  dibuka: 'Dibuka',
  ditutup: 'Ditutup',
};

export const LABEL_STATUS_IZIN: Record<StatusIzinPraktikan, string> = {
  menunggu: 'Menunggu',
  diterima: 'Diterima',
  ditolak: 'Ditolak',
};

export function ambilTanggalHariIniJakarta(): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Jakarta',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const hasil = formatter.format(new Date());
    if (/^\d{4}-\d{2}-\d{2}$/.test(hasil)) {
      return hasil;
    }
  } catch {
    // Fallback jika Intl timezone tidak tersedia di runtime tertentu
  }
  return '2026-10-23';
}

export const TANGGAL_HARI_INI = '2026-10-23';

export const PRAKTIKUM_AWAL: Praktikum[] = [
  {
    id: 'prak-01',
    nama: 'Basis Data',
    lab: 'Lab Komputer 2',
  },
  {
    id: 'prak-02',
    nama: 'Pemrograman Web',
    lab: 'Lab Komputer 1',
  },
  {
    id: 'prak-03',
    nama: 'Jaringan Komputer',
    lab: 'Lab Jaringan',
  },
];

// Pemetaan keanggotaan kelas default untuk akun demo lokal (sebelum data Firestore terisi)
const KELAS_PESERTA_DEFAULT: Record<string, string[]> = {
  'user-002': ['A', 'B', 'kelas-001', 'kelas-002'],
  'user-003': ['A', 'B', 'kelas-001', 'kelas-002'],
  'user-004': ['A', 'kelas-001'],
  'user-005': ['B', 'kelas-002'],
};

export const SESI_AWAL: Sesi[] = [
  {
    id: 'sesi-01',
    jadwalId: 'jadwal-001',
    kelasId: 'kelas-001',
    praktikumId: 'prak-01',
    pertemuanKe: 3,
    kelas: 'A',
    lab: 'Lab Komputer 2',
    tanggal: '2026-10-23',
    jamMulai: '08:00',
    jamSelesai: '10:00',
    status: 'dibuka',
    catatan: 'Normalisasi basis data',
    hadir: 12,
    total: 30,
  },
  {
    id: 'sesi-02',
    jadwalId: 'jadwal-002',
    kelasId: 'kelas-002',
    praktikumId: 'prak-02',
    pertemuanKe: 2,
    kelas: 'B',
    lab: 'Lab Komputer 1',
    tanggal: '2026-10-24',
    jamMulai: '10:00',
    jamSelesai: '12:00',
    status: 'belum_dibuka',
    catatan: 'Layout responsif dengan Flexbox',
    hadir: 0,
    total: 28,
  },
  {
    id: 'sesi-03',
    jadwalId: 'jadwal-003',
    kelasId: 'kelas-001',
    praktikumId: 'prak-03',
    pertemuanKe: 4,
    kelas: 'A',
    lab: 'Lab Jaringan',
    tanggal: '2026-10-25',
    jamMulai: '13:00',
    jamSelesai: '15:00',
    status: 'belum_dibuka',
    catatan: 'Pengalamatan IPv4 dan subnetting',
    hadir: 0,
    total: 26,
  },
  {
    id: 'sesi-04',
    jadwalId: 'jadwal-004',
    kelasId: 'kelas-001',
    praktikumId: 'prak-01',
    pertemuanKe: 2,
    kelas: 'A',
    lab: 'Lab Komputer 2',
    tanggal: '2026-10-20',
    jamMulai: '08:00',
    jamSelesai: '10:00',
    status: 'ditutup',
    catatan: 'Model relasional dan kunci primer',
    hadir: 26,
    total: 30,
  },
  {
    id: 'sesi-05',
    jadwalId: 'jadwal-005',
    kelasId: 'kelas-002',
    praktikumId: 'prak-02',
    pertemuanKe: 1,
    kelas: 'B',
    lab: 'Lab Komputer 1',
    tanggal: '2026-10-18',
    jamMulai: '10:00',
    jamSelesai: '12:00',
    status: 'ditutup',
    catatan: 'Struktur dasar dokumen HTML dan CSS',
    hadir: 24,
    total: 28,
  },
];

// Simpan kode validasi lokal secara internal di lapisan store (tidak pernah diekspos ke tipe Sesi / UI Praktikan)
const KODE_SESI_INTERNAL: Record<string, string> = {
  'sesi-01': '4827',
};

const PRAKTIKAN_FALLBACK: User =
  dummyUsers.find((u) => u.role === 'praktikan') ?? {
    id: 'user-002',
    nama: 'Budi Santoso',
    role: 'praktikan',
    nim: '240101002',
  };

export const PRESENSI_AWAL: Presensi[] = dummyUsers
  .filter((u) => u.role === 'praktikan')
  .map((u, index) => ({
    id: `presensi-awal-${u.id}`,
    sesiId: 'sesi-04',
    userId: u.id,
    waktu: `2026-10-20T08:0${Math.min(index + 3, 9)}:12+07:00`,
  }));

const ID_PRESENSI_DUMMY_BAWAAN = new Set(dummyPresensi.map((item) => item.id));

export function ubahKeIdSesiApp(id: string): string {
  const nomor = id.match(/^sesi-(\d+)$/)?.[1];
  return nomor ? `sesi-${nomor.padStart(3, '0')}` : id;
}

export function normalisasiIdSesiLokal(id?: string): string {
  if (!id) {
    return 'sesi-01';
  }
  const nomor = id.match(/^sesi-0*(\d+)$/)?.[1];
  return nomor ? `sesi-${nomor.padStart(2, '0')}` : id;
}

function konversiTimestampKeIso(nilai: unknown): string {
  if (!nilai) {
    return new Date().toISOString();
  }
  if (typeof nilai === 'string') {
    return nilai;
  }
  if (
    typeof nilai === 'object' &&
    nilai !== null &&
    'toDate' in nilai &&
    typeof (nilai as Timestamp).toDate === 'function'
  ) {
    return (nilai as Timestamp).toDate().toISOString();
  }
  if (
    typeof nilai === 'object' &&
    nilai !== null &&
    'seconds' in nilai &&
    typeof (nilai as { seconds: number }).seconds === 'number'
  ) {
    return new Date((nilai as { seconds: number }).seconds * 1000).toISOString();
  }
  return new Date().toISOString();
}

type KelasFirestoreDoc = {
  id: string;
  nama: string;
  praktikumId: string;
  aktif: boolean;
};

type JadwalFirestoreDoc = {
  id: string;
  kelasId: string;
  pertemuanKe: number;
  tanggal: string;
  jamMulai: string;
  jamSelesai: string;
  lokasi: string;
  aktif: boolean;
};

type SesiFirestoreRaw = {
  id: string;
  jadwalId?: string;
  kelasId?: string;
  praktikumId?: string;
  namaPraktikum?: string;
  pertemuanKe?: number;
  kelas?: string;
  lab?: string;
  tanggal?: string;
  jamMulai?: string;
  jamSelesai?: string;
  status: SesiStatus;
  catatan?: string;
  hadir?: number;
  total?: number;
};

type LocalStoreState = {
  fallbackUser: User;
  firebaseUser: User | null;
  authChecked: boolean;
  isLoadingFirestore: boolean;
  isSubmittingPresensi: boolean;
  isSubmittingIzin: boolean;
  errorFirestore: string | null;
  hasFirestoreData: boolean;
  praktikumFirestore: Praktikum[];
  kelasFirestore: KelasFirestoreDoc[];
  jadwalFirestore: JadwalFirestoreDoc[];
  sesiFirestore: SesiFirestoreRaw[];
  kelasDiikutiIds: string[];
  presensiFirestoreMap: Record<string, Presensi>;
  izinFirestoreMap: Record<string, PengajuanIzinRingkas>;
  izinTambahanMap: Record<string, PengajuanIzinRingkas>;
  presensiTambahan: Presensi[];
  tambahanHadirPerSesi: Record<string, number>;
  refreshKey: number;
};

let localState: LocalStoreState = {
  fallbackUser: PRAKTIKAN_FALLBACK,
  firebaseUser: null,
  authChecked: !isFirebaseConfigured,
  isLoadingFirestore: isFirebaseConfigured,
  isSubmittingPresensi: false,
  isSubmittingIzin: false,
  errorFirestore: null,
  hasFirestoreData: false,
  praktikumFirestore: [],
  kelasFirestore: [],
  jadwalFirestore: [],
  sesiFirestore: [],
  kelasDiikutiIds: [],
  presensiFirestoreMap: {},
  izinFirestoreMap: {},
  izinTambahanMap: {},
  presensiTambahan: [],
  tambahanHadirPerSesi: {},
  refreshKey: 0,
};

const listeners = new Set<() => void>();

function emitChange() {
  for (const listener of listeners) {
    listener();
  }
}

function updateState(partial: Partial<LocalStoreState>) {
  localState = {
    ...localState,
    ...partial,
  };
  emitChange();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): LocalStoreState {
  return localState;
}

export function pilihPraktikanAktif(userId: string) {
  const target = dummyUsers.find(
    (u) => u.id === userId && u.role === 'praktikan',
  );
  if (!target) {
    return;
  }
  updateState({ fallbackUser: target });
}

export function resetDataDemoPraktikan() {
  updateState({
    fallbackUser: PRAKTIKAN_FALLBACK,
    presensiTambahan: [],
    izinTambahanMap: {},
    tambahanHadirPerSesi: {},
    errorFirestore: null,
  });
}

export function muatUlangDataPraktikan() {
  updateState({
    isLoadingFirestore: isFirebaseConfigured,
    errorFirestore: null,
    refreshKey: localState.refreshKey + 1,
  });
}

let activeSubscriberCount = 0;
let cleanupMasterListeners: (() => void) | null = null;
let lastSubscribedUserId: string | null = null;
let lastSubscribedRefreshKey = -1;

function ensureFirestoreListeners(activeUserId: string | null, refreshKey: number) {
  if (!isFirebaseConfigured) {
    return;
  }
  if (
    cleanupMasterListeners &&
    lastSubscribedUserId === activeUserId &&
    lastSubscribedRefreshKey === refreshKey
  ) {
    return;
  }

  if (cleanupMasterListeners) {
    cleanupMasterListeners();
    cleanupMasterListeners = null;
  }

  lastSubscribedUserId = activeUserId;
  lastSubscribedRefreshKey = refreshKey;

  const unsubscribers: (() => void)[] = [];
  let userProfileUnsub: (() => void) | null = null;
  const pesertaUnsubs = new Map<string, () => void>();
  const presensiUnsubs = new Map<string, () => void>();
  const izinUnsubs = new Map<string, () => void>();

  updateState({
    isLoadingFirestore: true,
    errorFirestore: null,
  });

  // 1. Listener Firebase Auth + dokumen users/{uid}
  const authUnsub = onAuthStateChanged(auth, (fbUser) => {
    if (userProfileUnsub) {
      userProfileUnsub();
      userProfileUnsub = null;
    }

    if (!fbUser) {
      updateState({
        firebaseUser: null,
        authChecked: true,
      });
      return;
    }

    userProfileUnsub = onSnapshot(
      doc(db, 'users', fbUser.uid),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as Record<string, unknown>;
          const role =
            data.role === 'asisten' || data.role === 'praktikan'
              ? data.role
              : 'praktikan';
          updateState({
            firebaseUser: {
              id: fbUser.uid,
              nama:
                typeof data.nama === 'string' && data.nama.trim()
                  ? data.nama.trim()
                  : fbUser.displayName || fbUser.email || 'Praktikan',
              role,
              nim: typeof data.nim === 'string' ? data.nim : undefined,
            },
            authChecked: true,
          });
        } else {
          updateState({
            firebaseUser: {
              id: fbUser.uid,
              nama: fbUser.displayName || fbUser.email || 'Praktikan',
              role: 'praktikan',
            },
            authChecked: true,
          });
        }
      },
      () => {
        updateState({
          authChecked: true,
        });
      },
    );
  });
  unsubscribers.push(authUnsub);

  // 2. Listener koleksi praktikum
  const praktikumUnsub = onSnapshot(
    collection(db, 'praktikum'),
    (snap) => {
      const items: Praktikum[] = [];
      snap.forEach((docSnap) => {
        const data = docSnap.data() as Record<string, unknown>;
        if (data.aktif === false) {
          return;
        }
        items.push({
          id: docSnap.id,
          nama: typeof data.nama === 'string' ? data.nama : 'Praktikum',
          lab:
            typeof data.lab === 'string'
              ? data.lab
              : typeof data.deskripsi === 'string' && data.deskripsi
                ? data.deskripsi
                : 'Laboratorium',
        });
      });
      updateState({
        praktikumFirestore: items,
        hasFirestoreData:
          items.length > 0 ||
          localState.sesiFirestore.length > 0 ||
          localState.jadwalFirestore.length > 0,
      });
    },
    () => {
      // Jangan blokir bila koleksi praktikum belum bisa diakses sebelum kelas terhubung
    },
  );
  unsubscribers.push(praktikumUnsub);

  // 3. Listener koleksi kelas + subkoleksi kelas/{kelasId}/peserta/{uid}
  const kelasUnsub = onSnapshot(
    collection(db, 'kelas'),
    (snap) => {
      const kelasItems: KelasFirestoreDoc[] = [];
      const currentKelasIds = new Set<string>();

      snap.forEach((docSnap) => {
        const data = docSnap.data() as Record<string, unknown>;
        if (data.aktif === false) {
          return;
        }
        currentKelasIds.add(docSnap.id);
        kelasItems.push({
          id: docSnap.id,
          nama: typeof data.nama === 'string' ? data.nama : docSnap.id,
          praktikumId:
            typeof data.praktikumId === 'string' ? data.praktikumId : '',
          aktif: data.aktif !== false,
        });
      });

      updateState({ kelasFirestore: kelasItems });

      // Bersihkan listener peserta untuk kelas yang sudah tidak ada
      for (const [kelasId, unsub] of pesertaUnsubs.entries()) {
        if (!currentKelasIds.has(kelasId)) {
          unsub();
          pesertaUnsubs.delete(kelasId);
        }
      }

      if (!activeUserId) {
        return;
      }

      const anggotaSet = new Set<string>(localState.kelasDiikutiIds);
      for (const kelasItem of kelasItems) {
        if (pesertaUnsubs.has(kelasItem.id)) {
          continue;
        }
        const unsubPeserta = onSnapshot(
          doc(db, 'kelas', kelasItem.id, 'peserta', activeUserId),
          (pesertaSnap) => {
            const data = pesertaSnap.data() as Record<string, unknown> | undefined;
            const aktif = pesertaSnap.exists() && data?.aktif !== false;
            if (aktif) {
              anggotaSet.add(kelasItem.id);
            } else {
              anggotaSet.delete(kelasItem.id);
            }
            updateState({
              kelasDiikutiIds: Array.from(anggotaSet),
            });
          },
          () => {
            // Abaikan error baca pada kelas yang bukan milik praktikan ini
          },
        );
        pesertaUnsubs.set(kelasItem.id, unsubPeserta);
      }
    },
    () => {
      // Abaikan jika koleksi kelas belum dibuat
    },
  );
  unsubscribers.push(kelasUnsub);

  // 4. Listener koleksi jadwal
  const jadwalUnsub = onSnapshot(
    collection(db, 'jadwal'),
    (snap) => {
      const items: JadwalFirestoreDoc[] = [];
      snap.forEach((docSnap) => {
        const data = docSnap.data() as Record<string, unknown>;
        if (data.aktif === false) {
          return;
        }
        items.push({
          id: docSnap.id,
          kelasId: typeof data.kelasId === 'string' ? data.kelasId : '',
          pertemuanKe:
            typeof data.pertemuanKe === 'number' ? data.pertemuanKe : 1,
          tanggal:
            typeof data.tanggal === 'string'
              ? data.tanggal
              : ambilTanggalHariIniJakarta(),
          jamMulai: typeof data.jamMulai === 'string' ? data.jamMulai : '08:00',
          jamSelesai:
            typeof data.jamSelesai === 'string' ? data.jamSelesai : '10:00',
          lokasi:
            typeof data.lokasi === 'string' ? data.lokasi : 'Laboratorium',
          aktif: data.aktif !== false,
        });
      });
      updateState({
        jadwalFirestore: items,
        hasFirestoreData:
          items.length > 0 ||
          localState.sesiFirestore.length > 0 ||
          localState.praktikumFirestore.length > 0,
      });
    },
    () => {
      // Abaikan bila jadwal belum tersedia
    },
  );
  unsubscribers.push(jadwalUnsub);

  // 5. Listener koleksi sesi + dokumen presensi/{uid} & pengajuanIzin/{uid}
  const sesiUnsub = onSnapshot(
    collection(db, 'sesi'),
    (snap) => {
      const items: SesiFirestoreRaw[] = [];
      const currentSesiIds = new Set<string>();

      snap.forEach((docSnap) => {
        const data = docSnap.data() as Record<string, unknown>;
        const rawStatus = data.status;
        const status: SesiStatus =
          rawStatus === 'dibuka' ||
          rawStatus === 'ditutup' ||
          rawStatus === 'belum_dibuka'
            ? rawStatus
            : 'belum_dibuka';

        currentSesiIds.add(docSnap.id);
        items.push({
          id: docSnap.id,
          jadwalId:
            typeof data.jadwalId === 'string' ? data.jadwalId : undefined,
          kelasId: typeof data.kelasId === 'string' ? data.kelasId : undefined,
          praktikumId:
            typeof data.praktikumId === 'string' ? data.praktikumId : undefined,
          namaPraktikum:
            typeof data.praktikum === 'string'
              ? data.praktikum
              : typeof data.namaPraktikum === 'string'
                ? data.namaPraktikum
                : undefined,
          pertemuanKe:
            typeof data.pertemuanKe === 'number' ? data.pertemuanKe : undefined,
          kelas: typeof data.kelas === 'string' ? data.kelas : undefined,
          lab:
            typeof data.lab === 'string'
              ? data.lab
              : typeof data.lokasi === 'string'
                ? data.lokasi
                : undefined,
          tanggal: typeof data.tanggal === 'string' ? data.tanggal : undefined,
          jamMulai:
            typeof data.jamMulai === 'string' ? data.jamMulai : undefined,
          jamSelesai:
            typeof data.jamSelesai === 'string' ? data.jamSelesai : undefined,
          status,
          catatan: typeof data.catatan === 'string' ? data.catatan : undefined,
          hadir: typeof data.hadir === 'number' ? data.hadir : undefined,
          total: typeof data.total === 'number' ? data.total : undefined,
        });
      });

      updateState({
        sesiFirestore: items,
        isLoadingFirestore: false,
        errorFirestore: null,
        hasFirestoreData:
          items.length > 0 ||
          localState.jadwalFirestore.length > 0 ||
          localState.praktikumFirestore.length > 0,
      });

      // Bersihkan listener untuk sesi yang sudah dihapus
      for (const [sesiId, unsub] of presensiUnsubs.entries()) {
        if (!currentSesiIds.has(sesiId)) {
          unsub();
          presensiUnsubs.delete(sesiId);
        }
      }
      for (const [sesiId, unsub] of izinUnsubs.entries()) {
        if (!currentSesiIds.has(sesiId)) {
          unsub();
          izinUnsubs.delete(sesiId);
        }
      }

      if (!activeUserId) {
        return;
      }

      for (const sesiItem of items) {
        if (!presensiUnsubs.has(sesiItem.id)) {
          const unsubPresensi = onSnapshot(
            doc(db, 'sesi', sesiItem.id, 'presensi', activeUserId),
            (presensiSnap) => {
              const nextMap = { ...localState.presensiFirestoreMap };
              if (presensiSnap.exists()) {
                const pData = presensiSnap.data() as Record<string, unknown>;
                nextMap[sesiItem.id] = {
                  id: presensiSnap.id,
                  sesiId: sesiItem.id,
                  userId:
                    typeof pData.userId === 'string'
                      ? pData.userId
                      : activeUserId,
                  waktu: konversiTimestampKeIso(
                    pData.recordedAt ?? pData.waktuHadir ?? pData.waktu,
                  ),
                };
              } else {
                delete nextMap[sesiItem.id];
              }
              updateState({ presensiFirestoreMap: nextMap });
            },
            () => {
              // Abaikan bila belum ada izin baca pada sesi kelas lain
            },
          );
          presensiUnsubs.set(sesiItem.id, unsubPresensi);
        }

        if (!izinUnsubs.has(sesiItem.id)) {
          const unsubIzin = onSnapshot(
            doc(db, 'sesi', sesiItem.id, 'pengajuanIzin', activeUserId),
            (izinSnap) => {
              const nextIzinMap = { ...localState.izinFirestoreMap };
              if (izinSnap.exists()) {
                const iData = izinSnap.data() as Record<string, unknown>;
                const rawStatus = iData.status;
                const statusIzin: StatusIzinPraktikan =
                  rawStatus === 'diterima' ||
                  rawStatus === 'ditolak' ||
                  rawStatus === 'menunggu'
                    ? rawStatus
                    : 'menunggu';
                const statusKlasifikasi =
                  iData.statusKlasifikasi === 'berhasil' ? 'berhasil' : 'gagal';

                nextIzinMap[sesiItem.id] = {
                  id: izinSnap.id,
                  sesiId: sesiItem.id,
                  userId:
                    typeof iData.userId === 'string'
                      ? iData.userId
                      : activeUserId,
                  alasan: typeof iData.alasan === 'string' ? iData.alasan : '',
                  kategoriAI:
                    typeof iData.kategoriAI === 'string'
                      ? iData.kategoriAI
                      : undefined,
                  statusKlasifikasi,
                  status: statusIzin,
                  createdAt: konversiTimestampKeIso(iData.createdAt),
                  reviewedBy:
                    typeof iData.reviewedBy === 'string'
                      ? iData.reviewedBy
                      : undefined,
                  reviewedAt: iData.reviewedAt
                    ? konversiTimestampKeIso(iData.reviewedAt)
                    : undefined,
                };
              } else {
                delete nextIzinMap[sesiItem.id];
              }
              updateState({ izinFirestoreMap: nextIzinMap });
            },
            () => {
              // Abaikan bila belum ada dokumen izin
            },
          );
          izinUnsubs.set(sesiItem.id, unsubIzin);
        }
      }
    },
    (err) => {
      const code = (err as { code?: string })?.code ?? '';
      // Jika permission-denied terjadi karena belum login ke Firebase Auth namun sedang mode simulasi lokal,
      // jangan kunci layar dengan error kecuali memang sudah login Firebase Auth.
      if (code === 'permission-denied' && !auth.currentUser) {
        updateState({
          isLoadingFirestore: false,
          errorFirestore: null,
        });
        return;
      }
      updateState({
        isLoadingFirestore: false,
        errorFirestore:
          'Gagal memuat data jadwal dari Cloud Firestore. Periksa koneksi internet atau izin akses akun kamu.',
      });
    },
  );
  unsubscribers.push(sesiUnsub);

  cleanupMasterListeners = () => {
    for (const unsub of unsubscribers) {
      unsub();
    }
    if (userProfileUnsub) {
      userProfileUnsub();
    }
    for (const unsub of pesertaUnsubs.values()) {
      unsub();
    }
    for (const unsub of presensiUnsubs.values()) {
      unsub();
    }
    for (const unsub of izinUnsubs.values()) {
      unsub();
    }
  };
}

export function usePraktikanStore() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const {
    currentUser: appUser,
    sesi: daftarSesiApp,
    presensi: daftarPresensiApp,
    setUser,
    lakukanPresensi,
  } = useApp();

  // Prioritaskan user dari Firebase Auth, lalu user dari AppContext (RoleSelect), lalu fallback
  const currentUser: User | null = useMemo(() => {
    if (snapshot.firebaseUser) {
      return snapshot.firebaseUser;
    }
    if (appUser && appUser.role === 'praktikan') {
      return appUser;
    }
    return snapshot.fallbackUser;
  }, [appUser, snapshot.fallbackUser, snapshot.firebaseUser]);

  const isAuthenticated = Boolean(
    snapshot.firebaseUser || (appUser && appUser.role === 'praktikan') || currentUser,
  );

  useEffect(() => {
    activeSubscriberCount += 1;
    ensureFirestoreListeners(currentUser?.id ?? null, snapshot.refreshKey);

    return () => {
      activeSubscriberCount = Math.max(0, activeSubscriberCount - 1);
      if (activeSubscriberCount === 0 && cleanupMasterListeners) {
        cleanupMasterListeners();
        cleanupMasterListeners = null;
        lastSubscribedUserId = null;
      }
    };
  }, [currentUser?.id, snapshot.refreshKey]);

  const pilihPraktikan = (userId: string) => {
    const target = dummyUsers.find(
      (u) => u.id === userId && u.role === 'praktikan',
    );
    if (!target) {
      return;
    }
    pilihPraktikanAktif(userId);
    setUser(target);
  };

  const praktikum = useMemo<Praktikum[]>(() => {
    if (snapshot.praktikumFirestore.length > 0) {
      return [...snapshot.praktikumFirestore, ...PRAKTIKUM_AWAL].filter(
        (item, index, arr) =>
          arr.findIndex((entry) => entry.id === item.id) === index,
      );
    }
    return PRAKTIKUM_AWAL;
  }, [snapshot.praktikumFirestore]);

  // Daftar kelas yang diikuti oleh Praktikan aktif (FR-3 & Aturan Bisnis 2)
  const daftarKelasPraktikan = useMemo<string[]>(() => {
    if (!currentUser) {
      return [];
    }
    if (snapshot.kelasDiikutiIds.length > 0) {
      const namaKelasDariId = snapshot.kelasFirestore
        .filter((k) => snapshot.kelasDiikutiIds.includes(k.id))
        .map((k) => k.nama);
      return Array.from(
        new Set([...snapshot.kelasDiikutiIds, ...namaKelasDariId]),
      );
    }
    return (
      KELAS_PESERTA_DEFAULT[currentUser.id] ?? ['A', 'B', 'kelas-001', 'kelas-002']
    );
  }, [currentUser, snapshot.kelasDiikutiIds, snapshot.kelasFirestore]);

  // Gabungkan sesi dari Firestore (jika tersedia) atau SESI_AWAL + AppContext, difilter sesuai kelas Praktikan
  const sesi = useMemo<Sesi[]>(() => {
    if (snapshot.sesiFirestore.length > 0) {
      const hasilFirestore: Sesi[] = snapshot.sesiFirestore.map((raw) => {
        const jadwalDoc = raw.jadwalId
          ? snapshot.jadwalFirestore.find((j) => j.id === raw.jadwalId)
          : undefined;
        const resolvedKelasId = raw.kelasId ?? jadwalDoc?.kelasId ?? '';
        const kelasDoc = resolvedKelasId
          ? snapshot.kelasFirestore.find((k) => k.id === resolvedKelasId)
          : undefined;
        const resolvedPraktikumId =
          raw.praktikumId ?? kelasDoc?.praktikumId ?? 'prak-01';
        const praktikumDoc = praktikum.find(
          (p) => p.id === resolvedPraktikumId,
        );

        return {
          id: raw.id,
          jadwalId: raw.jadwalId ?? jadwalDoc?.id,
          kelasId: resolvedKelasId || undefined,
          praktikumId: resolvedPraktikumId,
          namaPraktikum: raw.namaPraktikum ?? praktikumDoc?.nama,
          pertemuanKe: raw.pertemuanKe ?? jadwalDoc?.pertemuanKe ?? 1,
          kelas: raw.kelas ?? kelasDoc?.nama ?? 'A',
          lab:
            raw.lab ??
            jadwalDoc?.lokasi ??
            praktikumDoc?.lab ??
            'Laboratorium',
          tanggal:
            raw.tanggal ??
            jadwalDoc?.tanggal ??
            ambilTanggalHariIniJakarta(),
          jamMulai: raw.jamMulai ?? jadwalDoc?.jamMulai ?? '08:00',
          jamSelesai: raw.jamSelesai ?? jadwalDoc?.jamSelesai ?? '10:00',
          status: raw.status,
          catatan: raw.catatan,
          hadir: raw.hadir,
          total: raw.total,
        };
      });

      // Jika dokumen peserta di kelas sudah diatur di Firestore, filter hanya kelas milik praktikan
      if (snapshot.kelasDiikutiIds.length > 0) {
        return hasilFirestore.filter(
          (item) =>
            (item.kelasId && daftarKelasPraktikan.includes(item.kelasId)) ||
            daftarKelasPraktikan.includes(item.kelas),
        );
      }
      return hasilFirestore;
    }

    const daftarLokal = SESI_AWAL.map((sesiLokal) => {
      const idSesiApp = ubahKeIdSesiApp(sesiLokal.id);
      const sesiApp = daftarSesiApp.find((item) => item.id === idSesiApp);
      const sesiDummyAwal = dummySesi.find((item) => item.id === idSesiApp);

      let statusSinkron: SesiStatus = sesiLokal.status;
      if (sesiApp) {
        if (sesiLokal.id === 'sesi-01' || sesiLokal.id === 'sesi-02') {
          statusSinkron = sesiApp.status;
        } else if (sesiDummyAwal && sesiApp.status !== sesiDummyAwal.status) {
          statusSinkron = sesiApp.status;
        }
      }

      const catatanSinkron =
        sesiApp?.catatan &&
        sesiDummyAwal &&
        sesiApp.catatan !== sesiDummyAwal.catatan
          ? sesiApp.catatan
          : sesiLokal.catatan;

      const tambahanHadir = snapshot.tambahanHadirPerSesi[sesiLokal.id] ?? 0;

      return {
        ...sesiLokal,
        status: statusSinkron,
        catatan: catatanSinkron,
        hadir: (sesiLokal.hadir ?? 0) + tambahanHadir,
      };
    });

    return daftarLokal.filter(
      (item) =>
        (item.kelasId && daftarKelasPraktikan.includes(item.kelasId)) ||
        daftarKelasPraktikan.includes(item.kelas),
    );
  }, [
    daftarKelasPraktikan,
    daftarSesiApp,
    praktikum,
    snapshot.jadwalFirestore,
    snapshot.kelasDiikutiIds.length,
    snapshot.kelasFirestore,
    snapshot.sesiFirestore,
    snapshot.tambahanHadirPerSesi,
  ]);

  // Gabungkan presensi real-time dari Firestore, runtime AppContext, dan data lokal
  const presensi = useMemo<Presensi[]>(() => {
    const dariFirestore = Object.values(snapshot.presensiFirestoreMap);

    if (snapshot.sesiFirestore.length > 0) {
      const gabunganFirestore = [
        ...dariFirestore,
        ...snapshot.presensiTambahan,
      ];
      const unikFirestore = new Map<string, Presensi>();
      for (const item of gabunganFirestore) {
        const kunci = `${item.sesiId}::${item.userId}`;
        if (!unikFirestore.has(kunci)) {
          unikFirestore.set(kunci, item);
        }
      }
      return Array.from(unikFirestore.values());
    }

    const dariAppRuntime: Presensi[] = daftarPresensiApp
      .filter((item) => !ID_PRESENSI_DUMMY_BAWAAN.has(item.id))
      .map((item) => ({
        id: item.id,
        sesiId: normalisasiIdSesiLokal(item.sesiId),
        userId: item.praktikanId.replace(/#live$/, ''),
        waktu: item.waktuHadir,
      }));

    const gabungan = [
      ...dariFirestore,
      ...snapshot.presensiTambahan,
      ...dariAppRuntime,
      ...PRESENSI_AWAL,
    ];

    const unik = new Map<string, Presensi>();
    for (const item of gabungan) {
      const kunci = `${item.sesiId}::${item.userId}`;
      if (!unik.has(kunci)) {
        unik.set(kunci, item);
      }
    }
    return Array.from(unik.values());
  }, [
    daftarPresensiApp,
    snapshot.presensiFirestoreMap,
    snapshot.presensiTambahan,
    snapshot.sesiFirestore.length,
  ]);

  const pengajuanIzinMap = useMemo<Record<string, PengajuanIzinRingkas>>(() => {
    const activeId = currentUser?.id;
    const lokalTerfilter: Record<string, PengajuanIzinRingkas> = {};
    for (const [key, item] of Object.entries(snapshot.izinTambahanMap)) {
      if (!activeId || item.userId === activeId) {
        lokalTerfilter[key] = item;
      }
    }
    return {
      ...lokalTerfilter,
      ...snapshot.izinFirestoreMap,
    };
  }, [currentUser?.id, snapshot.izinFirestoreMap, snapshot.izinTambahanMap]);

  const daftarPengajuanIzin = useMemo<PengajuanIzinRingkas[]>(() => {
    return Object.values(pengajuanIzinMap).sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt),
    );
  }, [pengajuanIzinMap]);

  const catatPresensiPraktikan = async (
    sesiIdInput: string,
    userIdInput: string,
    kodeInput: string,
  ): Promise<HasilPresensi> => {
    const userId = userIdInput?.trim() || currentUser?.id || '';
    if (!userId || !isAuthenticated) {
      return {
        ok: false,
        reason: 'belum_login',
        pesan: 'Silakan masuk menggunakan akun Praktikan terlebih dahulu.',
      };
    }

    const isSesiDiFirestore = snapshot.sesiFirestore.some(
      (item) => item.id === sesiIdInput,
    );
    const sesiId = isSesiDiFirestore
      ? sesiIdInput
      : normalisasiIdSesiLokal(sesiIdInput);
    const targetSesi =
      sesi.find((item) => item.id === sesiId) ??
      sesi.find((item) => item.id === sesiIdInput);

    if (!targetSesi) {
      return {
        ok: false,
        reason: 'sesi_tidak_ditemukan',
        pesan: 'Sesi praktikum tidak ditemukan.',
      };
    }

    // Aturan Bisnis 1 & 4: Presensi hanya bisa dilakukan saat status sesi dibuka
    if (targetSesi.status === 'belum_dibuka') {
      return {
        ok: false,
        reason: 'belum_dibuka',
        pesan: 'Sesi praktikum belum dibuka oleh asisten.',
      };
    }

    if (targetSesi.status === 'ditutup') {
      return {
        ok: false,
        reason: 'sudah_ditutup',
        pesan: 'Sesi praktikum telah ditutup.',
      };
    }

    // Aturan Bisnis 6: Izin yang sudah diterima memblokir presensi (izin menunggu tetap boleh presensi)
    const izinSesiIni =
      pengajuanIzinMap[targetSesi.id] ?? pengajuanIzinMap[sesiId];
    if (izinSesiIni && izinSesiIni.status === 'diterima') {
      return {
        ok: false,
        reason: 'izin_diterima',
        pesan:
          'Pengajuan izin kamu pada sesi ini telah disetujui asisten, sehingga presensi tidak dapat dilakukan.',
      };
    }

    // Aturan Bisnis 4: Satu praktikan hanya boleh presensi satu kali per sesi
    const sudahAda = presensi.some(
      (item) =>
        (item.sesiId === targetSesi.id || item.sesiId === sesiId) &&
        item.userId === userId,
    );
    if (sudahAda) {
      return {
        ok: false,
        reason: 'sudah_presensi',
        pesan: 'Kamu sudah melakukan presensi pada sesi ini.',
      };
    }

    const kodeBersih = kodeInput.trim();
    if (kodeBersih.length === 0) {
      return {
        ok: false,
        reason: 'kode_kosong',
        pesan: 'Kode wajib diisi',
      };
    }

    if (!/^\d{4}$/.test(kodeBersih)) {
      return {
        ok: false,
        reason: 'kode_format',
        pesan: 'Kode presensi harus 4 digit angka',
      };
    }

    // Validasi kode pada mode lokal/AppContext sebelum menulis
    if (!isSesiDiFirestore) {
      const idSesiApp = ubahKeIdSesiApp(sesiId);
      const sesiApp = daftarSesiApp.find((item) => item.id === idSesiApp);
      const kodeTarget =
        sesiApp?.kodePresensi && /^\d{4}$/.test(sesiApp.kodePresensi.trim())
          ? sesiApp.kodePresensi.trim()
          : KODE_SESI_INTERNAL[sesiId];

      if (!kodeTarget || kodeBersih !== kodeTarget) {
        return {
          ok: false,
          reason: 'kode_salah',
          pesan: 'Kode presensi tidak sesuai.',
        };
      }
    }

    updateState({ isSubmittingPresensi: true });

    try {
      const waktuSekarang = new Date().toISOString();

      // Jika Firebase aktif dan sesi ada di Firestore (atau user login via Firebase Auth),
      // simpan dokumen ke sesi/{sesiId}/presensi/{uid} sesuai Kontrak Data Bagian 5 PRD2.md
      if (isFirebaseConfigured && (isSesiDiFirestore || auth.currentUser)) {
        const targetFirestoreSesiId = isSesiDiFirestore
          ? targetSesi.id
          : ubahKeIdSesiApp(sesiId);
        const presensiDocRef = doc(
          db,
          'sesi',
          targetFirestoreSesiId,
          'presensi',
          userId,
        );

        const existingSnap = await getDoc(presensiDocRef);
        if (existingSnap.exists()) {
          updateState({ isSubmittingPresensi: false });
          return {
            ok: false,
            reason: 'sudah_presensi',
            pesan: 'Kamu sudah melakukan presensi pada sesi ini.',
          };
        }

        await setDoc(presensiDocRef, {
          userId,
          kode: kodeBersih,
          recordedAt: serverTimestamp(),
        });
      }

      const presensiBaru: Presensi = {
        id: userId,
        sesiId: targetSesi.id,
        userId,
        waktu: waktuSekarang,
      };

      // Sinkronkan juga ke AppContext (useApp) untuk mode demo satu perangkat
      const idSesiApp = ubahKeIdSesiApp(sesiId);
      const sesiApp = daftarSesiApp.find((item) => item.id === idSesiApp);
      if (sesiApp && sesiApp.status === 'dibuka') {
        const sudahAdaDiDummyApp = daftarPresensiApp.some(
          (item) => item.sesiId === idSesiApp && item.praktikanId === userId,
        );
        const idPraktikanApp = sudahAdaDiDummyApp ? `${userId}#live` : userId;
        const kodeUntukApp = sesiApp.kodePresensi ?? kodeBersih;
        lakukanPresensi(idSesiApp, idPraktikanApp, kodeUntukApp);
      }

      updateState({
        isSubmittingPresensi: false,
        presensiTambahan: [presensiBaru, ...localState.presensiTambahan],
        tambahanHadirPerSesi: {
          ...localState.tambahanHadirPerSesi,
          [targetSesi.id]:
            (localState.tambahanHadirPerSesi[targetSesi.id] ?? 0) + 1,
        },
      });

      return {
        ok: true,
        presensi: presensiBaru,
      };
    } catch (err) {
      updateState({ isSubmittingPresensi: false });
      const code = (err as { code?: string })?.code ?? '';

      if (code === 'permission-denied') {
        return {
          ok: false,
          reason: 'kode_salah',
          pesan:
            'Kode presensi salah atau sesi sudah tidak menerima presensi.',
        };
      }

      return {
        ok: false,
        reason: 'gagal_jaringan',
        pesan:
          'Gagal menyimpan presensi ke Cloud Firestore. Periksa koneksi internet kamu dan coba lagi.',
      };
    }
  };

  const ajukanIzinPraktikan = async (
    sesiIdInput: string,
    alasanInput: string,
  ): Promise<HasilPengajuanIzin> => {
    const userAct = currentUser;
    const userId = userAct?.id || '';
    if (!userId || !isAuthenticated || !userAct) {
      return {
        ok: false,
        reason: 'belum_login',
        pesan: 'Silakan masuk menggunakan akun Praktikan terlebih dahulu.',
      };
    }

    const isSesiDiFirestore = snapshot.sesiFirestore.some(
      (item) => item.id === sesiIdInput,
    );
    const sesiId = isSesiDiFirestore
      ? sesiIdInput
      : normalisasiIdSesiLokal(sesiIdInput);
    const targetSesi =
      sesi.find((item) => item.id === sesiId) ??
      sesi.find((item) => item.id === sesiIdInput);

    if (!targetSesi) {
      return {
        ok: false,
        reason: 'sesi_tidak_ditemukan',
        pesan: 'Sesi praktikum tidak ditemukan.',
      };
    }

    // Aturan Bisnis 5: Pengajuan izin hanya boleh dilakukan sebelum sesi ditutup (belum_dibuka atau dibuka)
    if (targetSesi.status === 'ditutup') {
      return {
        ok: false,
        reason: 'sesi_ditutup',
        pesan:
          'Sesi praktikum telah ditutup sehingga pengajuan izin tidak dapat dikirim.',
      };
    }

    // Aturan Bisnis 5: Jika praktikan sudah melakukan presensi pada sesi tersebut, pengajuan izin ditolak
    const sudahPresensi = presensi.some(
      (item) =>
        (item.sesiId === targetSesi.id || item.sesiId === sesiId) &&
        item.userId === userId,
    );
    if (sudahPresensi) {
      return {
        ok: false,
        reason: 'sudah_presensi',
        pesan:
          'Kamu sudah tercatat hadir pada sesi ini sehingga tidak dapat mengajukan izin.',
      };
    }

    // Aturan Bisnis 5: Hanya 1 pengajuan izin per praktikan per sesi
    const izinSudahAda =
      pengajuanIzinMap[targetSesi.id] ?? pengajuanIzinMap[sesiId];
    if (izinSudahAda) {
      return {
        ok: false,
        reason: 'sudah_mengajukan',
        pesan:
          'Kamu sudah mengajukan izin pada sesi ini. Alasan izin yang sudah dikirim tidak dapat diubah.',
      };
    }

    // Aturan Bisnis 5: Alasan izin wajib 10 sampai 500 karakter
    const alasanBersih = alasanInput.trim();
    if (alasanBersih.length === 0) {
      return {
        ok: false,
        reason: 'alasan_kosong',
        pesan: 'Alasan ketidakhadiran wajib diisi.',
      };
    }
    if (alasanBersih.length < 10 || alasanBersih.length > 500) {
      return {
        ok: false,
        reason: 'alasan_panjang',
        pesan: `Alasan izin wajib berisi 10 sampai 500 karakter (saat ini ${alasanBersih.length} karakter).`,
      };
    }

    updateState({ isSubmittingIzin: true });

    try {
      const targetFirestoreSesiId = isSesiDiFirestore
        ? targetSesi.id
        : ubahKeIdSesiApp(sesiId);

      if (isFirebaseConfigured && (isSesiDiFirestore || auth.currentUser)) {
        const izinDocRefCheck = doc(
          db,
          'sesi',
          targetFirestoreSesiId,
          'pengajuanIzin',
          userId,
        );
        const existingIzinSnap = await getDoc(izinDocRefCheck);
        if (existingIzinSnap.exists()) {
          updateState({ isSubmittingIzin: false });
          return {
            ok: false,
            reason: 'sudah_mengajukan',
            pesan:
              'Kamu sudah mengajukan izin pada sesi ini. Alasan izin yang sudah dikirim tidak dapat diubah.',
          };
        }
      }

      // Panggil layanan AI untuk klasifikasi alasan (gagal tidak memblokir penyimpanan)
      const hasilAI = await klasifikasikanAlasanIzin(alasanBersih);
      const waktuSekarang = new Date().toISOString();

      if (isFirebaseConfigured && (isSesiDiFirestore || auth.currentUser)) {
        const izinDocRef = doc(
          db,
          'sesi',
          targetFirestoreSesiId,
          'pengajuanIzin',
          userId,
        );

        await setDoc(izinDocRef, {
          userId,
          praktikanId: userId,
          sesiId: targetSesi.id,
          nama: userAct.nama,
          nim: userAct.nim ?? '',
          alasan: alasanBersih,
          statusKlasifikasi: hasilAI.statusKlasifikasi,
          ...(hasilAI.kategoriAI ? { kategoriAI: hasilAI.kategoriAI } : {}),
          status: 'menunggu',
          createdAt: serverTimestamp(),
        });
      }

      const pengajuanBaru: PengajuanIzinRingkas = {
        id: userId,
        sesiId: targetSesi.id,
        userId,
        alasan: alasanBersih,
        kategoriAI: hasilAI.kategoriAI,
        statusKlasifikasi: hasilAI.statusKlasifikasi,
        status: 'menunggu',
        createdAt: waktuSekarang,
      };

      updateState({
        isSubmittingIzin: false,
        izinTambahanMap: {
          ...localState.izinTambahanMap,
          [targetSesi.id]: pengajuanBaru,
        },
      });

      return {
        ok: true,
        pengajuan: pengajuanBaru,
        pesanKlasifikasi: hasilAI.pesan,
      };
    } catch (err) {
      updateState({ isSubmittingIzin: false });
      const code = (err as { code?: string })?.code ?? '';

      if (code === 'permission-denied') {
        return {
          ok: false,
          reason: 'sesi_ditutup',
          pesan:
            'Pengajuan izin ditolak oleh aturan keamanan server (sesi mungkin sudah ditutup atau kamu sudah memiliki pengajuan pada sesi ini).',
        };
      }

      return {
        ok: false,
        reason: 'gagal_jaringan',
        pesan:
          'Gagal menyimpan pengajuan izin ke Cloud Firestore. Periksa koneksi internet kamu dan coba lagi.',
      };
    }
  };

  return {
    currentUser: currentUser ?? PRAKTIKAN_FALLBACK,
    isAuthenticated,
    isLoading: snapshot.isLoadingFirestore,
    isSubmittingPresensi: snapshot.isSubmittingPresensi,
    isSubmittingIzin: snapshot.isSubmittingIzin,
    error: snapshot.errorFirestore,
    users: dummyUsers,
    daftarPraktikan: dummyUsers.filter((u) => u.role === 'praktikan'),
    daftarKelasPraktikan,
    praktikum,
    sesi,
    presensi,
    pengajuanIzinMap,
    daftarPengajuanIzin,
    pilihPraktikanAktif: pilihPraktikan,
    catatPresensiPraktikan,
    ajukanIzinPraktikan,
    muatUlangData: muatUlangDataPraktikan,
    resetDataDemoPraktikan,
  };
}

export function ambilNamaDepan(namaLengkap: string): string {
  const bagian = namaLengkap.trim().split(/\s+/);
  return bagian[0] || namaLengkap;
}

export function ambilNamaPraktikum(
  praktikumList: Praktikum[],
  praktikumId: string,
  namaLangsung?: string,
): string {
  if (namaLangsung && namaLangsung.trim()) {
    return namaLangsung.trim();
  }
  return (
    praktikumList.find((item) => item.id === praktikumId)?.nama ?? 'Praktikum'
  );
}

export function formatTanggalIndonesia(tanggal: string): string {
  const bagian = tanggal.split('-').map(Number);
  if (bagian.length !== 3 || bagian.some((n) => Number.isNaN(n))) {
    return tanggal;
  }
  const [tahun, bulan, hari] = bagian;
  const date = new Date(Date.UTC(tahun, bulan - 1, hari, 5, 0, 0));

  return date
    .toLocaleDateString('id-ID', {
      timeZone: 'Asia/Jakarta',
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    })
    .replace('.', '');
}

export function formatRentangJam(jamMulai: string, jamSelesai: string): string {
  return `${jamMulai.replace(':', '.')} - ${jamSelesai.replace(':', '.')} WIB`;
}

export function formatJamPresensi(waktuIso: string): string {
  const date = new Date(waktuIso);
  if (Number.isNaN(date.getTime())) {
    return '08.03';
  }
  try {
    const formatter = new Intl.DateTimeFormat('id-ID', {
      timeZone: 'Asia/Jakarta',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    return formatter.format(date).replace(':', '.');
  } catch {
    const jam = String(date.getHours()).padStart(2, '0');
    const menit = String(date.getMinutes()).padStart(2, '0');
    return `${jam}.${menit}`;
  }
}

export function formatWaktuLengkapWib(waktuIso: string): string {
  const date = new Date(waktuIso);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }
  try {
    const tanggal = date
      .toLocaleDateString('id-ID', {
        timeZone: 'Asia/Jakarta',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
      .replace('.', '');
    const jam = formatJamPresensi(waktuIso);
    return `${tanggal} · ${jam} WIB`;
  } catch {
    return `${formatJamPresensi(waktuIso)} WIB`;
  }
}
