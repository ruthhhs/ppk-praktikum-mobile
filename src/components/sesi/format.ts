/** "2026-11-26" menjadi "Kam 26 Nov". Nilai tak dikenal dikembalikan apa adanya. */
export function formatTanggalSingkat(tanggal?: string): string {
  if (!tanggal || !tanggal.includes('-')) return tanggal || '-';
  const [tahun, bulan, hari] = tanggal.split('-').map(Number);
  return new Date(tahun, bulan - 1, hari)
    .toLocaleDateString('id-ID', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    })
    .replace('.', '');
}

export function formatRentang(jamMulai: string, jamSelesai: string): string {
  return `${jamMulai}\u2013${jamSelesai}`;
}