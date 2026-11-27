import { query, where } from '@react-native-firebase/firestore';
import { useContext, useEffect, useMemo, useSyncExternalStore } from 'react';
import { AuthContext } from '../../context/Auth.Context';
import type { Praktikum, Role, SesiStatus, User } from '../../data/types';
import { klasifikasikanAlasanIzin } from '../../services/ai';
import {
  auth,
  isFirebaseConfigured,
  isNativeFirebaseConfigured,
  rnAuth,
} from '../../services/firebase';
import {
  firestoreRefs,
  listenCollection,
  listenDocument,
  listenKeanggotaanPraktikan,
  readDocument,
  serverTimestamp,
  setDocument,
} from '../../services/firebase/firestore';

export type { Praktikum, Role, SesiStatus, User };

/** @deprecated Sementara untuk kompatibilitas file izin PM1/PM2; gunakan colors dari @/constants/theme */
export { colors as WARNA } from '@/constants/theme';

const isFirestoreConfigured =
  isFirebaseConfigured || isNativeFirebaseConfigured;

const PENGGUNA_KOSONG: User = {
  id: '',
  nama: '',
  role: 'praktikan',
};

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
  labId?: string;
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
    // Fallback ke tanggal perangkat jika Intl timezone tidak tersedia
  }
  return new Date().toISOString().slice(0, 10);
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
    typeof (nilai as { toDate?: () => Date }).toDate === 'function'
  ) {
    return (nilai as { toDate: () => Date }).toDate().toISOString();
  }
  if (
    typeof nilai === 'object' &&
    nilai !== null &&
    'seconds' in nilai &&
    typeof (nilai as { seconds: number }).seconds === 'number'
  ) {
    return new Date(
      (nilai as { seconds: number }).seconds * 1000,
    ).toISOString();
  }
  return new Date().toISOString();
}

type KelasFirestoreDoc = {
  id: string;
  nama: string;
  praktikumId: string;
  labId?: string;
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
  firebaseUser: User | null;
  authChecked: boolean;
  isLoadingFirestore: boolean;
  isSubmittingIzin: boolean;
  errorFirestore: string | null;
  praktikumFirestore: Praktikum[];
  kelasFirestore: KelasFirestoreDoc[];
  jadwalFirestore: JadwalFirestoreDoc[];
  sesiFirestore: SesiFirestoreRaw[];
  kelasDiikutiIds: string[];
  presensiFirestoreMap: Record<string, Presensi>;
  izinFirestoreMap: Record<string, PengajuanIzinRingkas>;
  refreshKey: number;
};

let localState: LocalStoreState = {
  firebaseUser: null,
  authChecked: !isFirestoreConfigured,
  isLoadingFirestore: isFirestoreConfigured,
  isSubmittingIzin: false,
  errorFirestore: null,
  praktikumFirestore: [],
  kelasFirestore: [],
  jadwalFirestore: [],
  sesiFirestore: [],
  kelasDiikutiIds: [],
  presensiFirestoreMap: {},
  izinFirestoreMap: {},
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

export function muatUlangDataPraktikan() {
  updateState({
    isLoadingFirestore: isFirestoreConfigured,
    errorFirestore: null,
    refreshKey: localState.refreshKey + 1,
  });
}

let activeSubscriberCount = 0;
let cleanupMasterListeners: (() => void) | null = null;
let resinkronkanSubkoleksiSesiAktif: (() => void) | null = null;

export function resinkronkanPresensiSesi() {
  resinkronkanSubkoleksiSesiAktif?.();
}

export function simpanPresensiLokalTercatat(presensiBaru: Presensi) {
  updateState({
    presensiFirestoreMap: {
      ...localState.presensiFirestoreMap,
      [presensiBaru.sesiId]: presensiBaru,
    },
  });
  resinkronkanSubkoleksiSesiAktif?.();
}

let lastSubscribedUserId: string | null = null;
let lastSubscribedRefreshKey = -1;

function apakahSesiMilikKelasPraktikan(
  rawSesi: SesiFirestoreRaw,
  kelasDiikutiIds: string[],
  kelasFirestore: KelasFirestoreDoc[],
  jadwalFirestore: JadwalFirestoreDoc[],
): boolean {
  if (kelasDiikutiIds.length === 0) {
    return false;
  }

  const jadwalDoc = rawSesi.jadwalId
    ? jadwalFirestore.find((j) => j.id === rawSesi.jadwalId)
    : undefined;
  const resolvedKelasId = rawSesi.kelasId || jadwalDoc?.kelasId || '';

  if (resolvedKelasId && kelasDiikutiIds.includes(resolvedKelasId)) {
    return true;
  }

  if (!resolvedKelasId && rawSesi.kelas) {
    const namaSesiBersih = rawSesi.kelas
      .trim()
      .toLowerCase()
      .replace(/^kelas\s+/i, '');
    return kelasFirestore.some((k) => {
      if (!kelasDiikutiIds.includes(k.id)) {
        return false;
      }
      const namaKelasBersih = k.nama
        .trim()
        .toLowerCase()
        .replace(/^kelas\s+/i, '');
      return (
        namaKelasBersih === namaSesiBersih ||
        k.id.toLowerCase() === rawSesi.kelas?.trim().toLowerCase()
      );
    });
  }

  return false;
}

function ensureFirestoreListeners(
  activeUserId: string | null,
  refreshKey: number,
) {
  if (!isFirestoreConfigured) {
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
  resinkronkanSubkoleksiSesiAktif = null;

  lastSubscribedUserId = activeUserId;
  lastSubscribedRefreshKey = refreshKey;

  if (!activeUserId) {
    updateState({
      isLoadingFirestore: false,
      errorFirestore: null,
      praktikumFirestore: [],
      kelasFirestore: [],
      jadwalFirestore: [],
      sesiFirestore: [],
      kelasDiikutiIds: [],
      presensiFirestoreMap: {},
      izinFirestoreMap: {},
    });
    return;
  }

  const unsubscribers: (() => void)[] = [];
  const kelasUnsubs = new Map<string, () => void>();
  const jadwalKelasUnsubs = new Map<string, () => void>();
  const sesiKelasUnsubs = new Map<string, () => void>();
  const presensiUnsubs = new Map<string, () => void>();
  const izinUnsubs = new Map<string, () => void>();
  const kelasById = new Map<string, KelasFirestoreDoc>();
  const jadwalPerKelasMap = new Map<string, JadwalFirestoreDoc[]>();
  const sesiPerKelasMap = new Map<string, SesiFirestoreRaw[]>();
  const pendingKelasIds = new Set<string>();
  const pendingSesiKelasIds = new Set<string>();
  const anggotaSet = new Set<string>();
  let activeMembershipKelasIds = new Set<string>();

  let sesiLoaded = false;
  let kelasLoaded = false;

  const perbaruiStatusLoading = () => {
    if (sesiLoaded && kelasLoaded && localState.isLoadingFirestore) {
      updateState({ isLoadingFirestore: false });
    }
  };

  const gabungkanJadwalKelas = () => {
    const mergedMap = new Map<string, JadwalFirestoreDoc>();
    for (const list of jadwalPerKelasMap.values()) {
      for (const item of list) {
        mergedMap.set(item.id, item);
      }
    }
    updateState({
      jadwalFirestore: Array.from(mergedMap.values()),
    });
  };

  const gabungkanSesiKelas = () => {
    const mergedMap = new Map<string, SesiFirestoreRaw>();
    for (const list of sesiPerKelasMap.values()) {
      for (const item of list) {
        mergedMap.set(item.id, item);
      }
    }
    updateState({
      sesiFirestore: Array.from(mergedMap.values()),
      errorFirestore: null,
    });
  };

  // Sinkronkan listener subkoleksi presensi/{uid} & pengajuanIzin/{uid}
  // hanya untuk sesi pada kelas yang diikuti oleh Praktikan
  const sinkronkanListenerSubkoleksiSesi = () => {
    const eligibleSesiIds = new Set<string>();
    for (const sesiItem of localState.sesiFirestore) {
      if (
        apakahSesiMilikKelasPraktikan(
          sesiItem,
          localState.kelasDiikutiIds,
          localState.kelasFirestore,
          localState.jadwalFirestore,
        )
      ) {
        eligibleSesiIds.add(sesiItem.id);
      }
    }

    for (const [sesiId, unsub] of presensiUnsubs.entries()) {
      if (!eligibleSesiIds.has(sesiId)) {
        unsub();
        presensiUnsubs.delete(sesiId);
      }
    }
    for (const [sesiId, unsub] of izinUnsubs.entries()) {
      if (!eligibleSesiIds.has(sesiId)) {
        unsub();
        izinUnsubs.delete(sesiId);
      }
    }

    for (const sesiId of eligibleSesiIds) {
      if (!presensiUnsubs.has(sesiId)) {
        const unsubPresensi = listenDocument(
          firestoreRefs.presensiDoc(sesiId, activeUserId),
          (pData) => {
            const nextMap = { ...localState.presensiFirestoreMap };
            if (pData) {
              const raw = pData as unknown as Record<string, unknown>;
              nextMap[sesiId] = {
                id: activeUserId,
                sesiId,
                userId:
                  typeof raw.userId === 'string' ? raw.userId : activeUserId,
                waktu: konversiTimestampKeIso(
                  raw.recordedAt ?? raw.waktuHadir ?? raw.waktu,
                ),
              };
            } else {
              delete nextMap[sesiId];
            }
            updateState({ presensiFirestoreMap: nextMap });
          },
          () => {
            // Dokumen presensi yang belum ada mengembalikan permission-denied pada rules;
            // bersihkan listener agar dapat dipasang ulang setelah dokumen dibuat.
            const prevUnsub = presensiUnsubs.get(sesiId);
            if (prevUnsub) {
              prevUnsub();
              presensiUnsubs.delete(sesiId);
            }
            if (sesiId in localState.presensiFirestoreMap) {
              const nextMap = { ...localState.presensiFirestoreMap };
              delete nextMap[sesiId];
              updateState({ presensiFirestoreMap: nextMap });
            }
          },
        );
        presensiUnsubs.set(sesiId, unsubPresensi);
      }

      if (!izinUnsubs.has(sesiId)) {
        const unsubIzin = listenDocument(
          firestoreRefs.pengajuanIzinDoc(sesiId, activeUserId),
          (iData) => {
            const nextIzinMap = { ...localState.izinFirestoreMap };
            if (iData) {
              const raw = iData as unknown as Record<string, unknown>;
              const rawStatus = raw.status;
              const statusIzin: StatusIzinPraktikan =
                rawStatus === 'diterima' ||
                rawStatus === 'ditolak' ||
                rawStatus === 'menunggu'
                  ? rawStatus
                  : 'menunggu';
              const statusKlasifikasi =
                raw.statusKlasifikasi === 'berhasil' ? 'berhasil' : 'gagal';

              nextIzinMap[sesiId] = {
                id: activeUserId,
                sesiId,
                userId:
                  typeof raw.userId === 'string' ? raw.userId : activeUserId,
                alasan: typeof raw.alasan === 'string' ? raw.alasan : '',
                kategoriAI:
                  typeof raw.kategoriAI === 'string'
                    ? raw.kategoriAI
                    : undefined,
                statusKlasifikasi,
                status: statusIzin,
                createdAt: konversiTimestampKeIso(raw.createdAt),
                reviewedBy:
                  typeof raw.reviewedBy === 'string'
                    ? raw.reviewedBy
                    : undefined,
                reviewedAt: raw.reviewedAt
                  ? konversiTimestampKeIso(raw.reviewedAt)
                  : undefined,
              };
            } else {
              delete nextIzinMap[sesiId];
            }
            updateState({ izinFirestoreMap: nextIzinMap });
          },
          () => {
            const prevUnsub = izinUnsubs.get(sesiId);
            if (prevUnsub) {
              prevUnsub();
              izinUnsubs.delete(sesiId);
            }
            if (sesiId in localState.izinFirestoreMap) {
              const nextIzinMap = { ...localState.izinFirestoreMap };
              delete nextIzinMap[sesiId];
              updateState({ izinFirestoreMap: nextIzinMap });
            }
          },
        );
        izinUnsubs.set(sesiId, unsubIzin);
      }
    }
  };

  resinkronkanSubkoleksiSesiAktif = sinkronkanListenerSubkoleksiSesi;

  const sinkronkanListenerJadwalDanSesiPerKelas = (
    targetKelasIds: Set<string>,
  ) => {
    for (const [kelasId, unsub] of jadwalKelasUnsubs.entries()) {
      if (!targetKelasIds.has(kelasId)) {
        unsub();
        jadwalKelasUnsubs.delete(kelasId);
        jadwalPerKelasMap.delete(kelasId);
      }
    }
    for (const [kelasId, unsub] of sesiKelasUnsubs.entries()) {
      if (!targetKelasIds.has(kelasId)) {
        unsub();
        sesiKelasUnsubs.delete(kelasId);
        sesiPerKelasMap.delete(kelasId);
        pendingSesiKelasIds.delete(kelasId);
      }
    }

    if (targetKelasIds.size === 0) {
      gabungkanJadwalKelas();
      gabungkanSesiKelas();
      sesiLoaded = true;
      sinkronkanListenerSubkoleksiSesi();
      perbaruiStatusLoading();
      return;
    }

    for (const kelasId of targetKelasIds) {
      if (!jadwalKelasUnsubs.has(kelasId)) {
        const unsubJadwalKelas = listenCollection(
          query(firestoreRefs.jadwal(), where('kelasId', '==', kelasId)),
          (docs) => {
            const items: JadwalFirestoreDoc[] = [];
            for (const docSnap of docs) {
              const data = docSnap as unknown as Record<string, unknown>;
              items.push({
                id: docSnap.id,
                kelasId:
                  typeof data.kelasId === 'string' ? data.kelasId : kelasId,
                pertemuanKe:
                  typeof data.pertemuanKe === 'number' ? data.pertemuanKe : 1,
                tanggal:
                  typeof data.tanggal === 'string'
                    ? data.tanggal
                    : ambilTanggalHariIniJakarta(),
                jamMulai:
                  typeof data.jamMulai === 'string' ? data.jamMulai : '08:00',
                jamSelesai:
                  typeof data.jamSelesai === 'string'
                    ? data.jamSelesai
                    : '10:00',
                lokasi:
                  typeof data.lokasi === 'string'
                    ? data.lokasi
                    : 'Laboratorium',
                aktif: data.aktif !== false,
              });
            }
            jadwalPerKelasMap.set(kelasId, items);
            gabungkanJadwalKelas();
            sinkronkanListenerSubkoleksiSesi();
          },
          () => {
            jadwalPerKelasMap.set(kelasId, []);
            gabungkanJadwalKelas();
          },
        );
        jadwalKelasUnsubs.set(kelasId, unsubJadwalKelas);
      }

      if (!sesiKelasUnsubs.has(kelasId)) {
        pendingSesiKelasIds.add(kelasId);
        const unsubSesiKelas = listenCollection(
          query(firestoreRefs.sesi(), where('kelasId', '==', kelasId)),
          (docs) => {
            const items: SesiFirestoreRaw[] = [];
            for (const docSnap of docs) {
              const data = docSnap as unknown as Record<string, unknown>;
              if (data.aktif === false) {
                continue;
              }
              const rawStatus = data.status;
              const status: SesiStatus =
                rawStatus === 'dibuka' ||
                rawStatus === 'ditutup' ||
                rawStatus === 'belum_dibuka'
                  ? rawStatus
                  : 'belum_dibuka';

              items.push({
                id: docSnap.id,
                jadwalId:
                  typeof data.jadwalId === 'string' && data.jadwalId
                    ? data.jadwalId
                    : undefined,
                kelasId:
                  typeof data.kelasId === 'string' && data.kelasId
                    ? data.kelasId
                    : kelasId,
                praktikumId:
                  typeof data.praktikumId === 'string' && data.praktikumId
                    ? data.praktikumId
                    : undefined,
                namaPraktikum:
                  typeof data.praktikum === 'string'
                    ? data.praktikum
                    : typeof data.namaPraktikum === 'string'
                      ? data.namaPraktikum
                      : undefined,
                pertemuanKe:
                  typeof data.pertemuanKe === 'number'
                    ? data.pertemuanKe
                    : undefined,
                kelas: typeof data.kelas === 'string' ? data.kelas : undefined,
                lab:
                  typeof data.lab === 'string'
                    ? data.lab
                    : typeof data.lokasi === 'string'
                      ? data.lokasi
                      : undefined,
                tanggal:
                  typeof data.tanggal === 'string' ? data.tanggal : undefined,
                jamMulai:
                  typeof data.jamMulai === 'string' ? data.jamMulai : undefined,
                jamSelesai:
                  typeof data.jamSelesai === 'string'
                    ? data.jamSelesai
                    : undefined,
                status,
                catatan:
                  typeof data.catatan === 'string' ? data.catatan : undefined,
                hadir: typeof data.hadir === 'number' ? data.hadir : undefined,
                total: typeof data.total === 'number' ? data.total : undefined,
              });
            }

            sesiPerKelasMap.set(kelasId, items);
            pendingSesiKelasIds.delete(kelasId);
            if (pendingSesiKelasIds.size === 0) {
              sesiLoaded = true;
            }
            gabungkanSesiKelas();
            sinkronkanListenerSubkoleksiSesi();
            perbaruiStatusLoading();
          },
          (err) => {
            const code = (err as { code?: string })?.code ?? '';
            sesiPerKelasMap.set(kelasId, []);
            pendingSesiKelasIds.delete(kelasId);
            if (pendingSesiKelasIds.size === 0) {
              sesiLoaded = true;
            }
            if (
              code.includes('permission-denied') &&
              !rnAuth.currentUser &&
              !auth?.currentUser
            ) {
              perbaruiStatusLoading();
              return;
            }
            gabungkanSesiKelas();
            perbaruiStatusLoading();
          },
        );
        sesiKelasUnsubs.set(kelasId, unsubSesiKelas);
      }
    }
  };

  updateState({
    isLoadingFirestore: true,
    errorFirestore: null,
  });

  // 1. Listener profil pengguna aktif
  const userProfileUnsub = listenDocument(
    firestoreRefs.user(activeUserId),
    (userProfile) => {
      if (!userProfile) {
        updateState({ authChecked: true });
        return;
      }

      const role: Role = userProfile.role ?? 'praktikan';
      updateState({
        firebaseUser: {
          id: activeUserId,
          nama:
            typeof userProfile.nama === 'string' && userProfile.nama.trim()
              ? userProfile.nama.trim()
              : 'Praktikan',
          role,
          nim: typeof userProfile.nim === 'string' ? userProfile.nim : undefined,
          email:
            typeof userProfile.email === 'string'
              ? userProfile.email
              : undefined,
        },
        authChecked: true,
      });
    },
    () => {
      updateState({ authChecked: true });
    },
  );
  unsubscribers.push(userProfileUnsub);

  // 2. Listener koleksi praktikum milik praktikan aktif
  const praktikumUnsub = listenCollection(
    query(
      firestoreRefs.praktikum(),
      where('praktikanUids', 'array-contains', activeUserId),
    ),
    (docs) => {
      const items: Praktikum[] = [];
      for (const docSnap of docs) {
        const data = docSnap as unknown as Record<string, unknown>;
        if (data.aktif === false) {
          continue;
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
      }
      updateState({ praktikumFirestore: items });
    },
    () => {
      // Jangan blokir bila koleksi praktikum belum memiliki data untuk praktikan ini
    },
  );
  unsubscribers.push(praktikumUnsub);

  // 3. Cari kelas melalui subkoleksi peserta
  const keanggotaanUnsub = listenKeanggotaanPraktikan(
    activeUserId,
    (memberships) => {
      const currentKelasIds = new Set(
        memberships
          .filter(
            (membership) =>
              membership.uid === activeUserId && membership.aktif === true,
          )
          .map((membership) => membership.kelasId),
      );
      activeMembershipKelasIds = currentKelasIds;

      for (const [kelasId, unsub] of kelasUnsubs.entries()) {
        if (!currentKelasIds.has(kelasId)) {
          unsub();
          kelasUnsubs.delete(kelasId);
          pendingKelasIds.delete(kelasId);
          kelasById.delete(kelasId);
          anggotaSet.delete(kelasId);
        }
      }

      updateState({
        kelasFirestore: Array.from(kelasById.values()),
        kelasDiikutiIds: Array.from(anggotaSet),
      });
      sinkronkanListenerJadwalDanSesiPerKelas(new Set(anggotaSet));
      sinkronkanListenerSubkoleksiSesi();

      for (const kelasId of currentKelasIds) {
        if (kelasUnsubs.has(kelasId)) continue;

        pendingKelasIds.add(kelasId);
        kelasUnsubs.set(
          kelasId,
          listenDocument(
            firestoreRefs.kelasDoc(kelasId),
            (kelasDoc) => {
              pendingKelasIds.delete(kelasId);
              if (!activeMembershipKelasIds.has(kelasId)) return;

              if (kelasDoc && kelasDoc.aktif !== false) {
                anggotaSet.add(kelasId);
                kelasById.set(kelasId, {
                  id: kelasId,
                  nama: kelasDoc.nama,
                  praktikumId: kelasDoc.praktikumId,
                  labId:
                    typeof kelasDoc.labId === 'string' && kelasDoc.labId.trim()
                      ? kelasDoc.labId.trim()
                      : undefined,
                  aktif: true,
                });
              } else {
                anggotaSet.delete(kelasId);
                kelasById.delete(kelasId);
              }

              const kelasIdsAktif = new Set(anggotaSet);
              updateState({
                kelasFirestore: Array.from(kelasById.values()),
                kelasDiikutiIds: Array.from(anggotaSet),
              });
              sinkronkanListenerJadwalDanSesiPerKelas(kelasIdsAktif);
              sinkronkanListenerSubkoleksiSesi();
              if (pendingKelasIds.size === 0) kelasLoaded = true;
              perbaruiStatusLoading();
            },
            (err) => {
              pendingKelasIds.delete(kelasId);
              if (!activeMembershipKelasIds.has(kelasId)) return;
              anggotaSet.delete(kelasId);
              kelasById.delete(kelasId);
              updateState({
                kelasFirestore: Array.from(kelasById.values()),
                kelasDiikutiIds: Array.from(anggotaSet),
                errorFirestore: `Gagal memuat kelas dari Cloud Firestore (${(err as { code?: string }).code ?? 'unknown'}).`,
              });
              sinkronkanListenerJadwalDanSesiPerKelas(new Set(anggotaSet));
              if (pendingKelasIds.size === 0) kelasLoaded = true;
              perbaruiStatusLoading();
            },
          ),
        );
      }

      if (currentKelasIds.size === 0) {
        kelasLoaded = true;
        kelasById.clear();
        anggotaSet.clear();
        updateState({
          kelasFirestore: [],
          kelasDiikutiIds: [],
        });
        sinkronkanListenerJadwalDanSesiPerKelas(new Set());
        sinkronkanListenerSubkoleksiSesi();
        perbaruiStatusLoading();
        return;
      }

      if (pendingKelasIds.size === 0) {
        kelasLoaded = true;
        perbaruiStatusLoading();
      }
    },
    (err) => {
      const code = (err as { code?: string }).code ?? 'unknown';
      kelasLoaded = true;
      sesiLoaded = true;
      updateState({
        isLoadingFirestore: false,
        errorFirestore: `Gagal memuat keanggotaan kelas dari Cloud Firestore (${code}).`,
      });
    },
  );
  unsubscribers.push(keanggotaanUnsub);

  cleanupMasterListeners = () => {
    for (const unsub of unsubscribers) {
      unsub();
    }
    for (const unsub of kelasUnsubs.values()) {
      unsub();
    }
    for (const unsub of jadwalKelasUnsubs.values()) {
      unsub();
    }
    for (const unsub of sesiKelasUnsubs.values()) {
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
  const authCtx = useContext(AuthContext);

  const authProfile = authCtx?.profile ?? null;
  const authUser = authCtx?.user ?? null;

  const currentUser: User | null = useMemo(() => {
    if (authProfile) {
      return {
        id: authProfile.uid,
        nama: authProfile.nama || 'Praktikan',
        role: authProfile.role,
        nim: authProfile.nim,
        email: authProfile.email,
      };
    }
    if (authUser) {
      return {
        id: authUser.uid,
        nama:
          snapshot.firebaseUser?.nama ||
          authUser.displayName ||
          authUser.email ||
          'Praktikan',
        role: snapshot.firebaseUser?.role ?? 'praktikan',
        nim: snapshot.firebaseUser?.nim,
        email: authUser.email ?? undefined,
      };
    }
    if (snapshot.firebaseUser) {
      return snapshot.firebaseUser;
    }
    return null;
  }, [authProfile, authUser, snapshot.firebaseUser]);

  const isAuthenticated = useMemo(() => {
    if (!isFirestoreConfigured) {
      return false;
    }
    return Boolean(currentUser || rnAuth?.currentUser || auth?.currentUser);
  }, [currentUser]);

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

  const praktikum = snapshot.praktikumFirestore;

  const daftarKelasPraktikan = useMemo<string[]>(() => {
    if (!currentUser || snapshot.kelasDiikutiIds.length === 0) {
      return [];
    }
    const namaKelasDariId = snapshot.kelasFirestore
      .filter((k) => snapshot.kelasDiikutiIds.includes(k.id))
      .map((k) => k.nama);
    return Array.from(
      new Set([...snapshot.kelasDiikutiIds, ...namaKelasDariId]),
    );
  }, [currentUser, snapshot.kelasDiikutiIds, snapshot.kelasFirestore]);

  const sesi = useMemo<Sesi[]>(() => {
    if (!currentUser || snapshot.kelasDiikutiIds.length === 0) {
      return [];
    }

    const sesiKelasPraktikan = snapshot.sesiFirestore.filter((raw) =>
      apakahSesiMilikKelasPraktikan(
        raw,
        snapshot.kelasDiikutiIds,
        snapshot.kelasFirestore,
        snapshot.jadwalFirestore,
      ),
    );

    return sesiKelasPraktikan.map((raw) => {
      const jadwalDoc = raw.jadwalId
        ? snapshot.jadwalFirestore.find((j) => j.id === raw.jadwalId)
        : undefined;
      const resolvedKelasId = raw.kelasId ?? jadwalDoc?.kelasId ?? '';
      const kelasDoc = resolvedKelasId
        ? snapshot.kelasFirestore.find((k) => k.id === resolvedKelasId)
        : undefined;
      const resolvedPraktikumId =
        raw.praktikumId ?? kelasDoc?.praktikumId ?? '';
      const praktikumDoc = praktikum.find((p) => p.id === resolvedPraktikumId);

      return {
        id: raw.id,
        jadwalId: raw.jadwalId ?? jadwalDoc?.id,
        kelasId: resolvedKelasId || undefined,
        labId: kelasDoc?.labId,
        praktikumId: resolvedPraktikumId,
        namaPraktikum: raw.namaPraktikum ?? praktikumDoc?.nama ?? 'Praktikum',
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
  }, [
    currentUser,
    praktikum,
    snapshot.jadwalFirestore,
    snapshot.kelasDiikutiIds,
    snapshot.kelasFirestore,
    snapshot.sesiFirestore,
  ]);

  const presensi = useMemo<Presensi[]>(() => {
    if (!currentUser) {
      return [];
    }
    return Object.values(snapshot.presensiFirestoreMap).filter(
      (item) => item.userId === currentUser.id,
    );
  }, [currentUser, snapshot.presensiFirestoreMap]);

  const pengajuanIzinMap = useMemo<Record<string, PengajuanIzinRingkas>>(() => {
    if (!currentUser) {
      return {};
    }
    const terfilter: Record<string, PengajuanIzinRingkas> = {};
    for (const [key, item] of Object.entries(snapshot.izinFirestoreMap)) {
      if (item.userId === currentUser.id) {
        terfilter[key] = item;
      }
    }
    return terfilter;
  }, [currentUser, snapshot.izinFirestoreMap]);

  const daftarPengajuanIzin = useMemo<PengajuanIzinRingkas[]>(() => {
    return Object.values(pengajuanIzinMap).sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt),
    );
  }, [pengajuanIzinMap]);

  const ajukanIzinPraktikan = async (
    sesiIdInput: string,
    alasanInput: string,
  ): Promise<HasilPengajuanIzin> => {
    const userId = currentUser?.id || '';
    if (!userId || !isAuthenticated || !currentUser) {
      return {
        ok: false,
        reason: 'belum_login',
        pesan: 'Silakan masuk menggunakan akun Praktikan terlebih dahulu.',
      };
    }

    const sesiId = sesiIdInput.trim();
    const targetSesi = sesi.find((item) => item.id === sesiId);

    if (!targetSesi) {
      return {
        ok: false,
        reason: 'sesi_tidak_ditemukan',
        pesan: 'Sesi praktikum tidak ditemukan.',
      };
    }

    if (targetSesi.status === 'ditutup') {
      return {
        ok: false,
        reason: 'sesi_ditutup',
        pesan:
          'Sesi praktikum telah ditutup sehingga pengajuan izin tidak dapat dikirim.',
      };
    }

    const sudahPresensi = presensi.some(
      (item) => item.sesiId === targetSesi.id && item.userId === userId,
    );
    if (sudahPresensi) {
      return {
        ok: false,
        reason: 'sudah_presensi',
        pesan:
          'Kamu sudah tercatat hadir pada sesi ini sehingga tidak dapat mengajukan izin.',
      };
    }

    if (pengajuanIzinMap[targetSesi.id]) {
      return {
        ok: false,
        reason: 'sudah_mengajukan',
        pesan:
          'Kamu sudah mengajukan izin pada sesi ini. Alasan izin yang sudah dikirim tidak dapat diubah.',
      };
    }

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

    if (
      !isFirestoreConfigured ||
      !Boolean(rnAuth?.currentUser || auth?.currentUser || authUser)
    ) {
      return {
        ok: false,
        reason: 'belum_login',
        pesan: 'Sesi autentikasi Firebase tidak aktif. Silakan masuk kembali.',
      };
    }

    updateState({ isSubmittingIzin: true });
    const targetFirestoreSesiId = targetSesi.id;

    try {
      const hasilAI = await klasifikasikanAlasanIzin(alasanBersih);
      const waktuSekarang = new Date().toISOString();

      await setDocument(
        firestoreRefs.pengajuanIzinDoc(targetFirestoreSesiId, userId),
        {
          userId,
          alasan: alasanBersih,
          statusKlasifikasi: hasilAI.statusKlasifikasi,
          ...(hasilAI.kategoriAI ? { kategoriAI: hasilAI.kategoriAI } : {}),
          status: 'menunggu',
          createdAt: serverTimestamp(),
        },
      );
      resinkronkanSubkoleksiSesiAktif?.();

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
        izinFirestoreMap: {
          ...localState.izinFirestoreMap,
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

      if (code.includes('permission-denied')) {
        const latestSesiDoc = await readDocument(
          firestoreRefs.sesiDoc(targetFirestoreSesiId),
        ).catch(() => null);
        if (latestSesiDoc?.status === 'ditutup') {
          return {
            ok: false,
            reason: 'sesi_ditutup',
            pesan:
              'Sesi praktikum telah ditutup sehingga pengajuan izin tidak dapat dikirim.',
          };
        }
        return {
          ok: false,
          reason: 'sesi_ditutup',
          pesan:
            'Pengajuan izin ditolak oleh aturan keamanan server (sesi mungkin sudah ditutup atau kamu sudah memiliki pengajuan/presensi pada sesi ini).',
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
    currentUser: currentUser ?? PENGGUNA_KOSONG,
    isAuthenticated,
    isLoading: Boolean(authCtx?.loading) || snapshot.isLoadingFirestore,
    isSubmittingIzin: snapshot.isSubmittingIzin,
    error: snapshot.errorFirestore,
    daftarKelasPraktikan,
    praktikum,
    sesi,
    presensi,
    pengajuanIzinMap,
    daftarPengajuanIzin,
    ajukanIzinPraktikan,
    muatUlangData: muatUlangDataPraktikan,
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
    return '-';
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
