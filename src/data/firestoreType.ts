import type { Timestamp } from '@react-native-firebase/firestore';
import type { SesiStatus } from './types';

export type { SesiStatus };

/** Timestamp Firestore; null sesaat sebelum nilai server tiba. */
export type Ts = Timestamp | null;
/** Dokumen hasil baca: field + id dokumen. */
export type WithId<T> = T & { id: string };

export type StatusIzin = 'menunggu' | 'diterima' | 'ditolak';
export type StatusKlasifikasi = 'berhasil' | 'gagal';

// praktikum/{praktikumId}
export interface PraktikumDoc {
  nama: string;
  deskripsi: string;
  aktif: boolean;
  createdAt: Ts;
  updatedAt: Ts;
}

// kelas/{kelasId}
export interface KelasDoc {
  praktikumId: string;
  nama: string;
  asistenUids: string[];
  aktif: boolean;
  createdAt: Ts;
  updatedAt: Ts;
}

// kelas/{kelasId}/peserta/{uid}
export interface PesertaDoc {
  uid: string;
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

// kodePresensi/{sesiId} (hanya Asisten kelas)
export interface KodePresensiDoc {
  kode: string; // 4 digit
  updatedAt: Ts;
}

// sesi/{sesiId}/presensi/{uid}
export interface PresensiDoc {
  userId: string;
  recordedAt: Ts;
}

// sesi/{sesiId}/pengajuanIzin/{uid}
export interface PengajuanIzinDoc {
  userId: string;
  alasan: string;
  kategoriAI?: string;
  statusKlasifikasi: StatusKlasifikasi;
  status: StatusIzin;
  createdAt: Ts;
  reviewedBy?: string;
  reviewedAt?: Ts;
}