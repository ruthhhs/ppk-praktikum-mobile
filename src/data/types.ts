
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

export type SesiStatus =
  | 'belum_dibuka'
  | 'dibuka'
  | 'ditutup';

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
};

// Data presensi seorang praktikan pada satu sesi.
export type Presensi = {
  id: string;
  sesiId: string;
  praktikanId: string;
  waktuHadir: string;
};

// Data tambahan untuk kebutuhan layar Rekap Sesi.
export type RekapPresensi = {
  presensi: Presensi;
  praktikan: User;
};

// Data sesi beserta jumlah kehadiran.
export type SesiDenganRekap = Sesi & {
  jumlahHadir: number;
  jumlahPraktikan: number;
};

// Data untuk layar Riwayat Kehadiran.
export type RiwayatKehadiran = {
  id: string;
  sesiId: string;
  praktikum: Praktikum;
  sesi: Sesi;
  waktuHadir: string;
};
