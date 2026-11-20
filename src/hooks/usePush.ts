import type { UsePushResult } from '@/data/notifikasi';

export function usePush(): UsePushResult {
  return {
    statusIzin: 'tidak_tersedia',
    perangkatTerdaftar: false,
    mintaIzin: async () => {},
  };
}