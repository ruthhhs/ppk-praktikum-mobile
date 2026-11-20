import type { UseLokasiResult } from '@/data/lokasi';

export function useLokasi(): UseLokasiResult {
  return {
    status: 'menunggu_koordinat',
    koordinat: null,
    mintaIzin: async () => {},
    segarkan: async () => {},
  };
}