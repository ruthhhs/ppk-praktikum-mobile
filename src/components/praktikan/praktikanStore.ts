import { useSyncExternalStore } from 'react';

export type Role = 'asisten' | 'praktikan';

export type User = {
  id: string;
  nama: string;
  role: Role;
  nim?: string;
};

export type Praktikum = {
  id: string;
  nama: string;
  lab: string;
};

export type SesiStatus = 'belum_dibuka' | 'dibuka' | 'ditutup';

export type Sesi = {
  id: string;
  praktikumId: string;
  pertemuanKe: number;
  kelas: string;
  lab: string;
  tanggal: string;
  jamMulai: string;
  jamSelesai: string;
  status: SesiStatus;
  kodePresensi?: string;
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
  | 'kode_kosong'
  | 'kode_format'
  | 'kode_salah'
  | 'sudah_presensi'
  | 'belum_dibuka'
  | 'sudah_ditutup'
  | 'sesi_tidak_ditemukan';

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

export const TANGGAL_HARI_INI = '2026-10-23';

// Data dummy minimum sesuai Bagian 5 PRD.md:
// 2 asisten, 6 praktikan, 2+ praktikum, 5 sesi (1 dibuka, 2 belum dibuka, 2 ditutup).
export const USERS_AWAL: User[] = [
  {
    id: 'asisten-01',
    nama: 'Raka Pratama',
    role: 'asisten',
  },
  {
    id: 'asisten-02',
    nama: 'Nadia Putri',
    role: 'asisten',
  },
  {
    id: 'praktikan-01',
    nama: 'Siti Aisyah',
    role: 'praktikan',
    nim: '2210512001',
  },
  {
    id: 'praktikan-02',
    nama: 'Budi Santoso',
    role: 'praktikan',
    nim: '2210512002',
  },
  {
    id: 'praktikan-03',
    nama: 'Ahmad Fauzi',
    role: 'praktikan',
    nim: '2210512003',
  },
  {
    id: 'praktikan-04',
    nama: 'Rina Kartika',
    role: 'praktikan',
    nim: '2210512004',
  },
  {
    id: 'praktikan-05',
    nama: 'Dimas Saputra',
    role: 'praktikan',
    nim: '2210512005',
  },
  {
    id: 'praktikan-06',
    nama: 'Dewi Lestari',
    role: 'praktikan',
    nim: '2210512006',
  },
];

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

export const SESI_AWAL: Sesi[] = [
  {
    id: 'sesi-01',
    praktikumId: 'prak-01',
    pertemuanKe: 3,
    kelas: 'A',
    lab: 'Lab Komputer 2',
    tanggal: '2026-10-23',
    jamMulai: '08:00',
    jamSelesai: '10:00',
    status: 'dibuka',
    kodePresensi: '4827',
    catatan: 'Normalisasi basis data',
    hadir: 12,
    total: 30,
  },
  {
    id: 'sesi-02',
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

// Presensi awal:
// - Siti Aisyah (praktikan-01) sudah hadir di sesi-04 (ditutup), belum presensi di sesi-01 (dibuka)
//   sehingga siap didemokan langsung pada skenario utama.
// - Budi Santoso (praktikan-02) sudah hadir di sesi-01 dan sesi-04.
export const PRESENSI_AWAL: Presensi[] = [
  {
    id: 'presensi-01',
    sesiId: 'sesi-04',
    userId: 'praktikan-01',
    waktu: '2026-10-20T08:03:12+07:00',
  },
  {
    id: 'presensi-02',
    sesiId: 'sesi-01',
    userId: 'praktikan-02',
    waktu: '2026-10-23T08:05:40+07:00',
  },
  {
    id: 'presensi-03',
    sesiId: 'sesi-04',
    userId: 'praktikan-02',
    waktu: '2026-10-20T08:07:20+07:00',
  },
];

type PraktikanStoreState = {
  currentUser: User;
  users: User[];
  praktikum: Praktikum[];
  sesi: Sesi[];
  presensi: Presensi[];
};

let state: PraktikanStoreState = {
  currentUser: USERS_AWAL.find((u) => u.id === 'praktikan-01') ?? USERS_AWAL[2],
  users: USERS_AWAL,
  praktikum: PRAKTIKUM_AWAL,
  sesi: SESI_AWAL,
  presensi: PRESENSI_AWAL,
};

const listeners = new Set<() => void>();

function emitChange() {
  for (const listener of listeners) {
    listener();
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): PraktikanStoreState {
  return state;
}

export function pilihPraktikanAktif(userId: string) {
  const target = state.users.find(
    (u) => u.id === userId && u.role === 'praktikan'
  );
  if (!target) {
    return;
  }
  state = {
    ...state,
    currentUser: target,
  };
  emitChange();
}

export function resetDataDemoPraktikan() {
  state = {
    currentUser:
      USERS_AWAL.find((u) => u.id === 'praktikan-01') ?? USERS_AWAL[2],
    users: USERS_AWAL,
    praktikum: PRAKTIKUM_AWAL,
    sesi: SESI_AWAL,
    presensi: PRESENSI_AWAL,
  };
  emitChange();
}

export function catatPresensiPraktikan(
  sesiId: string,
  userId: string,
  kodeInput: string
): HasilPresensi {
  const targetSesi = state.sesi.find((item) => item.id === sesiId);
  if (!targetSesi) {
    return {
      ok: false,
      reason: 'sesi_tidak_ditemukan',
      pesan: 'Sesi praktikum tidak ditemukan.',
    };
  }

  // Aturan bisnis 1: Presensi hanya bisa saat status sesi dibuka
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

  // Aturan bisnis 2: Satu praktikan hanya boleh presensi satu kali per sesi
  const sudahAda = state.presensi.some(
    (item) => item.sesiId === sesiId && item.userId === userId
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

  if (!targetSesi.kodePresensi || kodeBersih !== targetSesi.kodePresensi) {
    return {
      ok: false,
      reason: 'kode_salah',
      pesan: 'Kode salah',
    };
  }

  const presensiBaru: Presensi = {
    id: `presensi-${Date.now()}`,
    sesiId,
    userId,
    waktu: new Date().toISOString(),
  };

  state = {
    ...state,
    presensi: [presensiBaru, ...state.presensi],
    sesi: state.sesi.map((item) =>
      item.id === sesiId
        ? { ...item, hadir: (item.hadir ?? 0) + 1 }
        : item
    ),
  };

  emitChange();

  return {
    ok: true,
    presensi: presensiBaru,
  };
}

export function usePraktikanStore() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  return {
    ...snapshot,
    daftarPraktikan: snapshot.users.filter((u) => u.role === 'praktikan'),
    pilihPraktikanAktif,
    catatPresensiPraktikan,
    resetDataDemoPraktikan,
  };
}

export function ambilNamaDepan(namaLengkap: string): string {
  const bagian = namaLengkap.trim().split(/\s+/);
  return bagian[0] || namaLengkap;
}

export function ambilNamaPraktikum(
  praktikumList: Praktikum[],
  praktikumId: string
): string {
  return (
    praktikumList.find((item) => item.id === praktikumId)?.nama ?? 'Praktikum'
  );
}

export function formatTanggalIndonesia(tanggal: string): string {
  const [tahun, bulan, hari] = tanggal.split('-').map(Number);
  const date = new Date(tahun, bulan - 1, hari);

  return date
    .toLocaleDateString('id-ID', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    })
    .replace('.', '');
}

export function formatRentangJam(jamMulai: string, jamSelesai: string): string {
  return `${jamMulai.replace(':', '.')} - ${jamSelesai.replace(':', '.')}`;
}

export function formatJamPresensi(waktuIso: string): string {
  const date = new Date(waktuIso);
  if (Number.isNaN(date.getTime())) {
    return '08.03';
  }
  const jam = String(date.getHours()).padStart(2, '0');
  const menit = String(date.getMinutes()).padStart(2, '0');
  return `${jam}.${menit}`;
}
