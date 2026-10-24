
import type {
  User,
  Praktikum,
  Sesi,
  Presensi,
  RekapPresensi,
  SesiDenganRekap,
  RiwayatKehadiran,
} from '../data/types';

// ========================
// DUMMY USERS
// ========================

export const dummyUsers: User[] = [
  {
    id: 'user-001',
    nama: 'Andi Pratama',
    role: 'asisten',
    nim: '240101001',
  },
  {
    id: 'user-002',
    nama: 'Budi Santoso',
    role: 'praktikan',
    nim: '240101002',
  },
  {
    id: 'user-003',
    nama: 'Citra Lestari',
    role: 'praktikan',
    nim: '240101003',
  },
  {
    id: 'user-004',
    nama: 'Dinda Putri',
    role: 'praktikan',
    nim: '240101004',
  },
  {
    id: 'user-005',
    nama: 'Eko Saputra',
    role: 'praktikan',
    nim: '240101005',
  },
];

// ========================
// DUMMY PRAKTIKUM
// ========================

export const dummyPraktikum: Praktikum[] = [
  {
    id: 'praktikum-001',
    nama: 'Pemrograman Web',
    lab: 'Lab Komputer 1',
  },
  {
    id: 'praktikum-002',
    nama: 'Basis Data',
    lab: 'Lab Komputer 2',
  },
  {
    id: 'praktikum-003',
    nama: 'Struktur Data',
    lab: 'Lab Komputer 1',
  },
];

// ========================
// DUMMY SESI
// ========================

export const dummySesi: Sesi[] = [
  {
    id: 'sesi-001',
    praktikumId: 'praktikum-001',
    pertemuanKe: 1,
    kelas: 'A',
    lab: 'Lab Komputer 1',
    tanggal: '2026-10-23',
    jamMulai: '08:00',
    jamSelesai: '10:00',
    status: 'dibuka',
    kodePresensi: 'WEB101',
    catatan: 'Pengenalan HTML dan CSS',
  },
  {
    id: 'sesi-002',
    praktikumId: 'praktikum-002',
    pertemuanKe: 2,
    kelas: 'B',
    lab: 'Lab Komputer 2',
    tanggal: '2026-10-24',
    jamMulai: '10:00',
    jamSelesai: '12:00',
    status: 'belum_dibuka',
    catatan: 'Praktikum pengenalan basis data',
  },
  {
    id: 'sesi-003',
    praktikumId: 'praktikum-003',
    pertemuanKe: 3,
    kelas: 'A',
    lab: 'Lab Komputer 1',
    tanggal: '2026-10-20',
    jamMulai: '13:00',
    jamSelesai: '15:00',
    status: 'ditutup',
    catatan: 'Implementasi struktur data',
  },
  {
    id: 'sesi-004',
    praktikumId: 'praktikum-001',
    pertemuanKe: 2,
    kelas: 'A',
    lab: 'Lab Komputer 1',
    tanggal: '2026-10-27',
    jamMulai: '08:00',
    jamSelesai: '10:00',
    status: 'belum_dibuka',
  },
];

// ========================
// DUMMY PRESENSI
// ========================

export const dummyPresensi: Presensi[] = [
  {
    id: 'presensi-001',
    sesiId: 'sesi-001',
    praktikanId: 'user-002',
    waktuHadir: '2026-10-23T08:05:00+07:00',
  },
  {
    id: 'presensi-002',
    sesiId: 'sesi-001',
    praktikanId: 'user-003',
    waktuHadir: '2026-10-23T08:08:00+07:00',
  },
  {
    id: 'presensi-003',
    sesiId: 'sesi-001',
    praktikanId: 'user-004',
    waktuHadir: '2026-10-23T08:12:00+07:00',
  },
  {
    id: 'presensi-004',
    sesiId: 'sesi-003',
    praktikanId: 'user-002',
    waktuHadir: '2026-10-20T13:03:00+07:00',
  },
  {
    id: 'presensi-005',
    sesiId: 'sesi-003',
    praktikanId: 'user-003',
    waktuHadir: '2026-10-20T13:07:00+07:00',
  },
];

// ========================
// HELPER: CARI PRAKTIKUM
// ========================

export const getPraktikumById = (
  praktikumId: string,
): Praktikum | undefined => {
  return dummyPraktikum.find(
    (praktikum) => praktikum.id === praktikumId,
  );
};

// ========================
// HELPER: CARI SESI
// ========================

export const getSesiById = (
  sesiId: string,
): Sesi | undefined => {
  return dummySesi.find((sesi) => sesi.id === sesiId);
};

// ========================
// HELPER: DATA REKAP SESI
// ========================

export const getRekapPresensi = (
  sesiId: string,
): RekapPresensi[] => {
  return dummyPresensi
    .filter((presensi) => presensi.sesiId === sesiId)
    .flatMap((presensi) => {
      const praktikan = dummyUsers.find(
        (user) => user.id === presensi.praktikanId,
      );

      if (!praktikan) return [];

      return [{ presensi, praktikan }];
    });
};

// ========================
// HELPER: SESI DENGAN REKAP
// ========================

export const getSesiDenganRekap = (): SesiDenganRekap[] => {
  return dummySesi.map((sesi) => {
    const praktikum = getPraktikumById(sesi.praktikumId);

    const jumlahPraktikan = dummyUsers.filter(
      (user) => user.role === 'praktikan',
    ).length;

    const jumlahHadir = dummyPresensi.filter(
      (presensi) => presensi.sesiId === sesi.id,
    ).length;

    return {
      ...sesi,
      lab: praktikum?.lab ?? sesi.lab,
      jumlahHadir,
      jumlahPraktikan,
    };
  });
};

// ========================
// HELPER: RIWAYAT PRAKTIKAN
// ========================

export const getRiwayatKehadiran = (
  praktikanId: string,
): RiwayatKehadiran[] => {
  return dummyPresensi
    .filter(
      (presensi) => presensi.praktikanId === praktikanId,
    )
    .flatMap((presensi) => {
      const sesi = getSesiById(presensi.sesiId);

      if (!sesi) return [];

      const praktikum = getPraktikumById(sesi.praktikumId);

      if (!praktikum) return [];

      return [
        {
          id: presensi.id,
          sesiId: sesi.id,
          praktikum,
          sesi,
          waktuHadir: presensi.waktuHadir,
        },
      ];
    })
    .sort((a, b) =>
      b.waktuHadir.localeCompare(a.waktuHadir),
    );
};
