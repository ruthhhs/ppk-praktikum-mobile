import type { Ts } from './firestoreType';

export type TipeNotifikasi =
  | 'sesi_dibuka'
  | 'jadwal_berubah'
  | 'izin_diterima'
  | 'izin_ditolak';

export type StatusIzinNotifikasi =
  | 'memuat'
  | 'diizinkan'
  | 'izin_ditolak'
  | 'tidak_tersedia'
  | 'galat';

export type PlatformPerangkat = 'android' | 'ios';

export interface PerangkatDoc {
  tokenFcm: string;
  platform: PlatformPerangkat;
  updatedAt: Ts;
}

export interface NotifikasiDoc {
  tipe: TipeNotifikasi;
  judul: string;
  isi: string;
  sesiId?: string;
  jadwalId?: string;
  kelasId?: string;
  dibaca: boolean;
  createdAt: Ts;
}

export type NotifikasiDenganId = NotifikasiDoc & {
  id: string;
};

export interface UsePushResult {
  statusIzin: StatusIzinNotifikasi;
  perangkatTerdaftar: boolean;
  mintaIzin: () => Promise<void>;
}