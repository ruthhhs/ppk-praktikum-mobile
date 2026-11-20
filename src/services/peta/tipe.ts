// Tipe lokal milik B untuk layar dan komponen peta.
//
// Sengaja berbentuk struktural (hanya field yang dipakai) agar tidak mengimpor
// '@/data/lokasi' milik A. Tipe A (LaboratoriumDenganId, Koordinat, StatusLokasi)
// tetap bisa dipasang langsung ke props komponen tanpa konversi, karena memuat
// semua field di bawah ini. Setelah A1 merge, ganti hanya bila memang perlu.

export type StatusLokasiPeta =
  | 'memuat'
  | 'izin_ditolak'
  | 'layanan_mati'
  | 'menunggu_koordinat'
  | 'siap'
  | 'galat';

export interface TitikPeta {
  lat: number;
  lng: number;
}

export interface PosisiPengguna extends TitikPeta {
  akurasi: number;
}

export interface LabPeta extends TitikPeta {
  id: string;
  nama: string;
  deskripsi: string;
  radiusMeter: number;
  aktif: boolean;
}