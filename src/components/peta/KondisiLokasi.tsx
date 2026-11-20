import { ActivityIndicator, Linking, StyleSheet, Text, View } from 'react-native';
import Button from '@/components/ui/Button';
import type { StatusLokasiPeta } from '@/services/peta/tipe';

// Banner kondisi lokasi untuk halaman Maps (FR-7). Murni presentasional:
// tidak memanggil hook lokasi; status dan aksi datang dari props.
// Tidak menampilkan apa pun saat status === 'siap'.

export interface KondisiLokasiProps {
  status: StatusLokasiPeta;
  onMintaIzin?: () => void;
  onSegarkan?: () => void;
  /** Default: membuka pengaturan aplikasi lewat Linking.openSettings(). */
  onBukaPengaturan?: () => void;
}

type Nada = 'netral' | 'peringatan' | 'galat';

const PALET: Record<Nada, { latar: string; garis: string; teks: string }> = {
  netral: { latar: '#F3F4F6', garis: '#E5E7EB', teks: '#374151' },
  peringatan: { latar: '#FFFBEB', garis: '#FCD34D', teks: '#92400E' },
  galat: { latar: '#FEF2F2', garis: '#FCA5A5', teks: '#991B1B' },
};

function bukaPengaturanBawaan() {
  void Linking.openSettings();
}

export default function KondisiLokasi({
  status,
  onMintaIzin,
  onSegarkan,
  onBukaPengaturan = bukaPengaturanBawaan,
}: KondisiLokasiProps) {
  if (status === 'siap') return null;

  let nada: Nada = 'netral';
  let judul = '';
  let pesan = '';
  let sedangMenunggu = false;
  const aksi: { title: string; variant: 'primary' | 'secondary'; onPress: () => void }[] = [];

  switch (status) {
    case 'memuat':
      judul = 'Memuat lokasi';
      pesan = 'Sedang menyiapkan lokasi perangkat.';
      sedangMenunggu = true;
      break;
    case 'menunggu_koordinat':
      judul = 'Menunggu koordinat';
      pesan = 'Sinyal GPS sedang dicari. Posisimu akan tampil begitu koordinat tersedia.';
      sedangMenunggu = true;
      break;
    case 'izin_ditolak':
      nada = 'peringatan';
      judul = 'Izin lokasi ditolak';
      pesan = 'Aktifkan izin lokasi agar posisimu tampil di peta.';
      if (onMintaIzin) aksi.push({ title: 'Beri izin', variant: 'primary', onPress: onMintaIzin });
      aksi.push({ title: 'Buka pengaturan', variant: 'secondary', onPress: onBukaPengaturan });
      break;
    case 'layanan_mati':
      nada = 'peringatan';
      judul = 'Layanan lokasi mati';
      pesan = 'Nyalakan GPS di pengaturan perangkat, lalu coba lagi.';
      aksi.push({ title: 'Buka pengaturan', variant: 'primary', onPress: onBukaPengaturan });
      if (onSegarkan) aksi.push({ title: 'Coba lagi', variant: 'secondary', onPress: onSegarkan });
      break;
    case 'galat':
      nada = 'galat';
      judul = 'Lokasi tidak dapat dibaca';
      pesan = 'Terjadi masalah saat membaca lokasi perangkat.';
      if (onSegarkan) aksi.push({ title: 'Coba lagi', variant: 'primary', onPress: onSegarkan });
      break;
  }

  const warna = PALET[nada];

  return (
    <View
      style={[styles.kotak, { backgroundColor: warna.latar, borderColor: warna.garis }]}
      accessibilityRole="alert"
    >
      <View style={styles.baris}>
        {sedangMenunggu ? <ActivityIndicator size="small" color={warna.teks} /> : null}
        <Text style={[styles.judul, { color: warna.teks }]}>{judul}</Text>
      </View>
      <Text style={[styles.pesan, { color: warna.teks }]}>{pesan}</Text>

      {aksi.length > 0 ? (
        <View style={styles.aksi}>
          {aksi.map((a) => (
            <View key={a.title} style={styles.tombol}>
              <Button title={a.title} variant={a.variant} onPress={a.onPress} />
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  kotak: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
  },
  baris: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  judul: {
    fontSize: 15,
    fontWeight: '700',
  },
  pesan: {
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
  },
  aksi: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  tombol: {
    flex: 1,
  },
});