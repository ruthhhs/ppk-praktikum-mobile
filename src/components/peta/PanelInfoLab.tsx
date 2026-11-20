import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import Button from '@/components/ui/Button';
import type { SesiStatus } from '@/data/firestoreType';
import {
  waktuJakarta,
  type AktivitasLab,
  type AktivitasLabItem,
} from '@/services/peta/aktivitasLab';
import type { LabPeta } from '@/services/peta/tipe';

// Panel info yang muncul saat marker lab diketuk (FR-5). Murni presentasional:
// data aktivitas dihitung di luar (hitungAktivitasLab) dan masuk lewat props.
// Penempatan (bottom sheet di atas peta) diatur oleh layar pemakai.

export interface PanelInfoLabProps {
  lab: LabPeta;
  aktivitas: AktivitasLab | null;
  memuat?: boolean;
  galat?: string | null;
  onTutup: () => void;
  onCobaLagi?: () => void;
}

const NAMA_HARI = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const NAMA_BULAN = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
];

function formatTanggal(tanggal: string, hariIni: string): string {
  if (tanggal === hariIni) return 'Hari ini';

  const [y, m, d] = tanggal.split('-').map(Number);
  const [hy, hm, hd] = hariIni.split('-').map(Number);
  if (!y || !m || !d || !hy || !hm || !hd) return tanggal;

  const besok = new Date(Date.UTC(hy, hm - 1, hd + 1)).toISOString().slice(0, 10);
  if (tanggal === besok) return 'Besok';

  const hari = NAMA_HARI[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${hari}, ${d} ${NAMA_BULAN[m - 1]}`;
}

const STATUS_SESI: Record<SesiStatus, { label: string; latar: string; teks: string }> = {
  belum_dibuka: { label: 'Belum dibuka', latar: '#F3F4F6', teks: '#4B5563' },
  dibuka: { label: 'Dibuka', latar: '#DCFCE7', teks: '#166534' },
  ditutup: { label: 'Ditutup', latar: '#FEE2E2', teks: '#991B1B' },
};

function BarisAktivitas({
  item,
  tampilTanggal,
  hariIni,
}: {
  item: AktivitasLabItem;
  tampilTanggal: boolean;
  hariIni: string;
}) {
  const status = STATUS_SESI[item.statusSesi];
  const waktu = `${item.jamMulai} – ${item.jamSelesai}`;

  return (
    <View style={styles.baris}>
      <View style={styles.barisIsi}>
        <Text style={styles.praktikum}>{item.praktikumNama}</Text>
        <Text style={styles.rincian}>
          Kelas {item.kelasNama} · {tampilTanggal ? `${formatTanggal(item.tanggal, hariIni)}, ` : ''}
          {waktu}
        </Text>
      </View>
      <View style={[styles.lencana, { backgroundColor: status.latar }]}>
        <Text style={[styles.lencanaTeks, { color: status.teks }]}>{status.label}</Text>
      </View>
    </View>
  );
}

export default function PanelInfoLab({
  lab,
  aktivitas,
  memuat = false,
  galat = null,
  onTutup,
  onCobaLagi,
}: PanelInfoLabProps) {
  const { height } = useWindowDimensions();
  const hariIni = waktuJakarta(new Date()).tanggal;

  return (
    <View style={[styles.panel, { maxHeight: height * 0.55 }]}>
      <View style={styles.kepala}>
        <View style={styles.kepalaIsi}>
          <Text style={styles.judul}>{lab.nama}</Text>
          <Text style={styles.sub}>
            Radius presensi {lab.radiusMeter} m
            {lab.deskripsi ? ` · ${lab.deskripsi}` : ''}
          </Text>
        </View>
        <Pressable
          onPress={onTutup}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Tutup panel info laboratorium"
        >
          <Text style={styles.tutup}>Tutup</Text>
        </Pressable>
      </View>

      {!lab.aktif ? (
        <Text style={styles.catatanNonaktif}>Laboratorium ini sedang nonaktif.</Text>
      ) : null}

      {memuat ? (
        <View style={styles.tengah}>
          <ActivityIndicator />
          <Text style={styles.rincian}>Memuat aktivitas laboratorium…</Text>
        </View>
      ) : galat ? (
        <View style={styles.tengah}>
          <Text style={styles.galat}>{galat}</Text>
          {onCobaLagi ? (
            <View style={styles.tombolCoba}>
              <Button title="Coba lagi" variant="secondary" onPress={onCobaLagi} />
            </View>
          ) : null}
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          <Text style={styles.bagian}>Sedang berlangsung</Text>
          {aktivitas && aktivitas.berlangsung.length > 0 ? (
            aktivitas.berlangsung.map((item) => (
              <BarisAktivitas
                key={item.jadwalId}
                item={item}
                tampilTanggal={false}
                hariIni={hariIni}
              />
            ))
          ) : (
            <Text style={styles.kosong}>Tidak ada praktikum yang sedang berlangsung.</Text>
          )}

          <Text style={styles.bagian}>Berikutnya</Text>
          {aktivitas?.berikutnya ? (
            <BarisAktivitas item={aktivitas.berikutnya} tampilTanggal hariIni={hariIni} />
          ) : (
            <Text style={styles.kosong}>Belum ada jadwal berikutnya.</Text>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
  },
  kepala: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  kepalaIsi: {
    flex: 1,
  },
  judul: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  sub: {
    fontSize: 13,
    color: '#4B5563',
    marginTop: 2,
  },
  tutup: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563EB',
  },
  catatanNonaktif: {
    fontSize: 13,
    color: '#92400E',
    backgroundColor: '#FFFBEB',
    borderRadius: 8,
    padding: 8,
    marginTop: 10,
  },
  bagian: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: 16,
    marginBottom: 8,
  },
  baris: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  barisIsi: {
    flex: 1,
  },
  praktikum: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  rincian: {
    fontSize: 13,
    color: '#4B5563',
    marginTop: 2,
  },
  lencana: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  lencanaTeks: {
    fontSize: 12,
    fontWeight: '600',
  },
  kosong: {
    fontSize: 13,
    color: '#6B7280',
    paddingVertical: 4,
  },
  tengah: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 20,
  },
  galat: {
    fontSize: 14,
    color: '#991B1B',
    textAlign: 'center',
  },
  tombolCoba: {
    minWidth: 140,
  },
});