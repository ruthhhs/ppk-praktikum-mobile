import type { Ts } from './firestoreType';

export type StatusLokasi =
  | 'memuat'
  | 'izin_ditolak'
  | 'layanan_mati'
  | 'menunggu_koordinat'
  | 'siap'
  | 'galat';

export interface Koordinat {
  lat: number;
  lng: number;
  akurasi: number;
  mocked: boolean;
}

export interface TitikKoordinat {
  lat: number;
  lng: number;
}

export interface UseLokasiResult {
  status: StatusLokasi;
  koordinat: Koordinat | null;
  mintaIzin: () => Promise<void>;
  segarkan: () => Promise<void>;
}

export interface LaboratoriumDoc {
  nama: string;
  deskripsi: string;
  lat: number;
  lng: number;
  cosLat: number;
  radiusMeter: number;
  aktif: boolean;
  createdAt: Ts;
  updatedAt: Ts;
}

export type LaboratoriumDenganId = LaboratoriumDoc & {
  id: string;
};

export interface PerbaruiLaboratoriumInput {
  lat: number;
  lng: number;
  radiusMeter: number;
}