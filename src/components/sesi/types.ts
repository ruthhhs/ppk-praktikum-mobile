import type { SesiStatus } from '@/data/types';

/**
 * Data minimal yang dibutuhkan komponen sesi. Tipe `Sesi` di types.ts,
 * `SesiAsisten` (Asprak), dan `Sesi` di praktikanStore memenuhi bentuk ini
 * secara struktural, jadi pemanggil cukup meneruskan objek sesinya.
 */
export type DataSesi = {
  id: string;
  pertemuanKe: number;
  kelas: string;
  lab: string;
  /** Format YYYY-MM-DD. */
  tanggal: string;
  jamMulai: string;
  jamSelesai: string;
  status: SesiStatus;
};

/** Filter daftar sesi. Sesi `dibuka` tampil sebagai kartu aktif di atas, bukan lewat filter. */
export type FilterSesi = Exclude<SesiStatus, 'dibuka'>;