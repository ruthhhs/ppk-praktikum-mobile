import type { Timestamp } from '@react-native-firebase/firestore';
import type { SesiStatus } from './types';

export type { SesiStatus };

/** Timestamp Firestore; null sesaat sebelum nilai server tiba. */
export type Ts = Timestamp | null;
/** Dokumen hasil baca: field + id dokumen. */
export type WithId<T> = T & { id: string };

export type StatusIzin = 'menunggu' | 'diterima' | 'ditolak';
export type StatusKlasifikasi = 'berhasil' | 'gagal';
export type KategoriFinalIzin = 'absen' | 'izin' | 'sakit';
export type StatusTagihan = 'belum_dibayar' | 'lunas';
export type StatusPembayaran = 'pending' | 'success' | 'failed';

// praktikum/{praktikumId}
export interface PraktikumDoc {
  nama: string;
  deskripsi: string;
  aktif: boolean;
  praktikanUids: string[];
  /** Field baru Sprint 4; boleh belum ada sampai migrasi A2 berjalan. */
  aslabUids?: string[];
  graceMenit?: number;
  dendaNominal?: number;
  createdAt: Ts;
  updatedAt: Ts;
}

// kelas/{kelasId}
export interface KelasDoc {
  praktikumId: string;
  labId?: string;
  nama: string;
  /** Field lama dipertahankan; berisi UID Asprak. */
  asistenUids: string[];
  praktikanUids: string[];
  aktif: boolean;
  createdAt: Ts;
  updatedAt: Ts;
}

// kelas/{kelasId}/peserta/{uid}
export interface PesertaDoc {
  uid: string;
  nama: string;
  nim?: string;
  aktif: boolean;
  joinedAt: Ts;
}

// jadwal/{jadwalId}
export interface JadwalDoc {
  kelasId: string;
  pertemuanKe: number;
  tanggal: string; // YYYY-MM-DD (Asia/Jakarta)
  jamMulai: string; // HH:mm
  jamSelesai: string; // HH:mm
  lokasi: string;
  aktif: boolean;
}

// sesi/{sesiId}
export interface SesiDoc {
  jadwalId: string;
  kelasId: string;
  status: SesiStatus;
  catatan: string;
  openedAt: Ts;
  closedAt: Ts;
}

// kodePresensi/{sesiId}
export interface KodePresensiDoc {
  kode: string; // 4 digit
  updatedAt: Ts;
}

// sesi/{sesiId}/presensi/{uid}
export interface PresensiDoc {
  userId: string;
  recordedAt: Ts;
  /** Diisi backend setelah presensi diproses. */
  terlambat?: boolean;
  menitTerlambat?: number;
}

// sesi/{sesiId}/pengajuanIzin/{uid}
export interface PengajuanIzinDoc {
  userId: string;
  alasan: string;
  kategoriAI?: string;
  kategoriFinal?: KategoriFinalIzin;
  statusKlasifikasi: StatusKlasifikasi;
  status: StatusIzin;
  createdAt: Ts;
  reviewedBy?: string;
  reviewedAt?: Ts;
}

// tagihan/{sesiId}_{uid}
export interface TagihanDoc {
  userId: string;
  sesiId: string;
  kelasId: string;
  praktikumId: string;
  nominal: number;
  menitTerlambat: number;
  status: StatusTagihan;
  createdAt: Ts;
  paidAt?: Ts;
}

// pembayaran/{orderId}
export interface PembayaranDoc {
  tagihanId: string;
  userId: string;
  nominal: number;
  status: StatusPembayaran;
  redirectUrl: string;
  metode?: string;
  statusMidtrans?: string;
  createdAt: Ts;
  updatedAt: Ts;
  paidAt?: Ts;
}