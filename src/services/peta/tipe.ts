// Tipe yang dipakai komponen dan layar peta.
//
// Setelah A1-A4 merge, kita langsung pakai tipe dari @/data/lokasi.
// File ini re-export agar impor di folder peta tetap pendek.

export type { StatusLokasi as StatusLokasiPeta, Koordinat as PosisiPengguna } from '@/data/lokasi';
export type { LaboratoriumDenganId as LabPeta } from '@/data/lokasi';

/** Koordinat sederhana untuk center peta dsb. */
export interface TitikPeta {
  lat: number;
  lng: number;
}
