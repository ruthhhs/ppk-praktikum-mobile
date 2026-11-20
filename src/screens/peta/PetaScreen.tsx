import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import KondisiLokasi from '@/components/peta/KondisiLokasi';
import PanelInfoLab from '@/components/peta/PanelInfoLab';
import type { Role } from '@/data/types';
import {
  hitungAktivitasLab,
  type DataAktivitas,
} from '@/services/peta/aktivitasLab';
import {
  LAB_TIRUAN,
  listenDataAktivitasTiruan,
  type ModeTiruan,
} from '@/services/peta/mock';
import type { StatusLokasiPeta } from '@/services/peta/tipe';

// KERANGKA layar Maps untuk kedua peran (asisten/peta dan praktikan/peta).
// Masih memakai data tiruan dan placeholder peta:
// - TODO (setelah A2/A3): ganti LAB_TIRUAN dengan subscribeLab() dan
//   listenDataAktivitasTiruan dengan listenDataAktivitas (aktivitasLabService).
// - TODO (setelah A1/A4): ganti statusLokasi dengan useLokasi(), dan
//   placeholder peta dengan PetaLab (MapView) yang mengimpor react-native-maps.
// - TODO: ambil uid dari konteks auth; sementara memakai UID tiruan.

const UID_TIRUAN = 'uid-tiruan';
const PESAN_GAGAL =
  'Gagal memuat aktivitas laboratorium. Periksa koneksi, lalu coba lagi.';

const PILIHAN_STATUS: StatusLokasiPeta[] = [
  'siap',
  'memuat',
  'menunggu_koordinat',
  'izin_ditolak',
  'layanan_mati',
  'galat',
];
const PILIHAN_MODE: ModeTiruan[] = ['normal', 'kosong', 'gagal'];

type Hasil = { kunci: string; data: DataAktivitas | null; galat: string | null };

function Chip({
  label,
  aktif,
  onPress,
}: {
  label: string;
  aktif: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, aktif && styles.chipAktif]}
      accessibilityRole="button"
    >
      <Text style={[styles.chipTeks, aktif && styles.chipTeksAktif]}>{label}</Text>
    </Pressable>
  );
}

export default function PetaScreen({ peran }: { peran: Role }) {
  const [labTerpilihId, setLabTerpilihId] = useState<string | null>(null);
  const [statusLokasi, setStatusLokasi] = useState<StatusLokasiPeta>('menunggu_koordinat');
  const [mode, setMode] = useState<ModeTiruan>('normal');
  const [percobaan, setPercobaan] = useState(0);
  const [hasil, setHasil] = useState<Hasil | null>(null);
  const [sekarang, setSekarang] = useState(() => new Date());

  // Kunci memicu muat ulang saat mode/percobaan berubah. "memuat" diturunkan
  // dari kunci, sehingga tidak ada setState sinkron di badan efek.
  const kunci = `${mode}:${percobaan}`;
  const memuat = hasil?.kunci !== kunci;

  useEffect(() => {
    return listenDataAktivitasTiruan(
      UID_TIRUAN,
      peran,
      (data) => setHasil({ kunci, data, galat: null }),
      () => setHasil({ kunci, data: null, galat: PESAN_GAGAL }),
      { mode },
    );
  }, [peran, mode, kunci]);

  // Segarkan "sekarang" tiap menit agar berlangsung/berikutnya ikut bergeser.
  useEffect(() => {
    const timer = setInterval(() => setSekarang(new Date()), 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  const labTerpilih = LAB_TIRUAN.find((l) => l.id === labTerpilihId) ?? null;

  const aktivitas = useMemo(
    () =>
      labTerpilih && hasil?.data
        ? hitungAktivitasLab(labTerpilih.id, hasil.data, sekarang)
        : null,
    [labTerpilih, hasil, sekarang],
  );

  return (
    <View style={styles.layar}>
      <ScrollView contentContainerStyle={styles.isi}>
        <KondisiLokasi
          status={statusLokasi}
          onMintaIzin={() => setStatusLokasi('siap')}
          onSegarkan={() => setStatusLokasi('siap')}
        />

        <View style={styles.petaPlaceholder}>
          <Text style={styles.petaJudul}>Area peta</Text>
          <Text style={styles.petaCatatan}>
            MapView dipasang di sini setelah react-native-maps tersedia (A1). Sementara,
            ketuk laboratorium di bawah seperti mengetuk marker.
          </Text>
        </View>

        <Text style={styles.bagian}>Laboratorium</Text>
        {LAB_TIRUAN.map((lab) => {
          const dipilih = lab.id === labTerpilihId;
          return (
            <Pressable
              key={lab.id}
              onPress={() => setLabTerpilihId(dipilih ? null : lab.id)}
              style={[styles.kartuLab, dipilih && styles.kartuLabDipilih]}
              accessibilityRole="button"
              accessibilityLabel={`Lihat info ${lab.nama}`}
            >
              <Text style={styles.namaLab}>{lab.nama}</Text>
              <Text style={styles.subLab}>
                Radius {lab.radiusMeter} m{lab.aktif ? '' : ' · nonaktif'}
              </Text>
            </Pressable>
          );
        })}

        {__DEV__ ? (
          <View style={styles.simulator}>
            <Text style={styles.simulatorJudul}>Simulator (hanya mode dev)</Text>
            <Text style={styles.simulatorLabel}>Status lokasi</Text>
            <View style={styles.chipBaris}>
              {PILIHAN_STATUS.map((s) => (
                <Chip
                  key={s}
                  label={s}
                  aktif={statusLokasi === s}
                  onPress={() => setStatusLokasi(s)}
                />
              ))}
            </View>
            <Text style={styles.simulatorLabel}>Data aktivitas</Text>
            <View style={styles.chipBaris}>
              {PILIHAN_MODE.map((m) => (
                <Chip key={m} label={m} aktif={mode === m} onPress={() => setMode(m)} />
              ))}
            </View>
          </View>
        ) : null}
      </ScrollView>

      {labTerpilih ? (
        <View style={styles.panelWadah}>
          <PanelInfoLab
            lab={labTerpilih}
            aktivitas={aktivitas}
            memuat={memuat}
            galat={memuat ? null : hasil?.galat ?? null}
            onTutup={() => setLabTerpilihId(null)}
            onCobaLagi={() => setPercobaan((n) => n + 1)}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  layar: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  isi: {
    padding: 16,
    gap: 12,
    paddingBottom: 32,
  },
  petaPlaceholder: {
    height: 160,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#9CA3AF',
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  petaJudul: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
  },
  petaCatatan: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  bagian: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  kartuLab: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 14,
  },
  kartuLabDipilih: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  namaLab: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  subLab: {
    fontSize: 13,
    color: '#4B5563',
    marginTop: 2,
  },
  panelWadah: {
    padding: 12,
  },
  simulator: {
    marginTop: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  simulatorJudul: {
    fontSize: 13,
    fontWeight: '700',
    color: '#92400E',
  },
  simulatorLabel: {
    fontSize: 12,
    color: '#92400E',
    marginTop: 10,
    marginBottom: 6,
  },
  chipBaris: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  chipAktif: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  chipTeks: {
    fontSize: 12,
    color: '#374151',
  },
  chipTeksAktif: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});