import { useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

export type Role = 'asisten' | 'praktikan';

export type User = {
  id: string;
  nama: string;
  role: Role;
  nim?: string;
};

export type Praktikum = {
  id: string;
  nama: string;
  lab: string;
};

export type SesiStatus = 'belum_dibuka' | 'dibuka' | 'ditutup';

export type Sesi = {
  id: string;
  praktikumId: string;
  pertemuanKe: number;
  kelas: string;
  lab: string;
  tanggal: string;
  jamMulai: string;
  jamSelesai: string;
  status: SesiStatus;
  kodePresensi?: string;
  catatan?: string;
};

export type Presensi = {
  id: string;
  sesiId: string;
  userId: string;
  waktu: string;
};

type StatusKehadiranRiwayat = 'hadir' | 'tidak_hadir';
type FilterRiwayat = 'semua' | 'hadir' | 'tidak_hadir';

type ItemRiwayatSesi = {
  sesi: Sesi;
  namaPraktikum: string;
  statusKehadiran: StatusKehadiranRiwayat;
  waktuPresensi?: string;
};

const WARNA = {
  bg: '#FFFFFF',
  surface: '#FEFFE0',
  text: '#17454A',
  textMuted: 'rgba(23, 69, 74, 0.7)',
  primary: '#B5185F',
  highlight: '#D0E86E',
  accent: '#35C1C2',
  border: 'rgba(23, 69, 74, 0.15)',
} as const;

const PRAKTIKAN_AKTIF: User = {
  id: 'praktikan-01',
  nama: 'Siti Aisyah',
  role: 'praktikan',
  nim: '2210512001',
};

const DAFTAR_PRAKTIKUM: Record<string, Praktikum> = {
  'prak-01': {
    id: 'prak-01',
    nama: 'Basis Data',
    lab: 'Lab Komputer 2',
  },
  'prak-02': {
    id: 'prak-02',
    nama: 'Pemrograman Web',
    lab: 'Lab Komputer 1',
  },
  'prak-03': {
    id: 'prak-03',
    nama: 'Jaringan Komputer',
    lab: 'Lab Jaringan',
  },
};

const SESI_CONTOH: Sesi[] = [
  {
    id: 'sesi-01',
    praktikumId: 'prak-01',
    pertemuanKe: 3,
    kelas: 'A',
    lab: 'Lab Komputer 2',
    tanggal: '2026-10-23',
    jamMulai: '08:00',
    jamSelesai: '10:00',
    status: 'dibuka',
    kodePresensi: '4827',
    catatan: 'Normalisasi basis data',
  },
  {
    id: 'sesi-02',
    praktikumId: 'prak-02',
    pertemuanKe: 2,
    kelas: 'B',
    lab: 'Lab Komputer 1',
    tanggal: '2026-10-24',
    jamMulai: '10:00',
    jamSelesai: '12:00',
    status: 'belum_dibuka',
  },
  {
    id: 'sesi-03',
    praktikumId: 'prak-03',
    pertemuanKe: 4,
    kelas: 'A',
    lab: 'Lab Jaringan',
    tanggal: '2026-10-25',
    jamMulai: '13:00',
    jamSelesai: '15:00',
    status: 'belum_dibuka',
  },
  {
    id: 'sesi-04',
    praktikumId: 'prak-01',
    pertemuanKe: 2,
    kelas: 'A',
    lab: 'Lab Komputer 2',
    tanggal: '2026-10-20',
    jamMulai: '08:00',
    jamSelesai: '10:00',
    status: 'ditutup',
    catatan: 'Model relasional dan kunci primer',
  },
  {
    id: 'sesi-05',
    praktikumId: 'prak-02',
    pertemuanKe: 1,
    kelas: 'B',
    lab: 'Lab Komputer 1',
    tanggal: '2026-10-18',
    jamMulai: '10:00',
    jamSelesai: '12:00',
    status: 'ditutup',
    catatan: 'Struktur dasar dokumen HTML dan CSS',
  },
];

// Berisi presensi milik praktikan aktif (praktikan-01) dan praktikan lain (praktikan-02)
// untuk memastikan Riwayat hanya menampilkan presensi milik praktikan yang sedang login (FR-6).
const PRESENSI_CONTOH: Presensi[] = [
  {
    id: 'presensi-01',
    sesiId: 'sesi-01',
    userId: 'praktikan-01',
    waktu: '2026-10-23T08:03:12+07:00',
  },
  {
    id: 'presensi-02',
    sesiId: 'sesi-04',
    userId: 'praktikan-01',
    waktu: '2026-10-20T08:05:40+07:00',
  },
  {
    id: 'presensi-03',
    sesiId: 'sesi-05',
    userId: 'praktikan-02',
    waktu: '2026-10-18T10:04:15+07:00',
  },
];

const LABEL_FILTER: Record<FilterRiwayat, string> = {
  semua: 'Semua',
  hadir: 'Hadir',
  tidak_hadir: 'Tidak hadir',
};

function ambilNamaPraktikum(praktikumId: string): string {
  return DAFTAR_PRAKTIKUM[praktikumId]?.nama ?? 'Praktikum';
}

function formatTanggal(tanggal: string): string {
  const [tahun, bulan, hari] = tanggal.split('-').map(Number);
  const date = new Date(tahun, bulan - 1, hari);

  return date
    .toLocaleDateString('id-ID', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    })
    .replace('.', '');
}

function formatRentangJam(jamMulai: string, jamSelesai: string): string {
  return `${jamMulai.replace(':', '.')} - ${jamSelesai.replace(':', '.')}`;
}

function formatJamPresensi(waktuIso: string): string {
  const date = new Date(waktuIso);
  if (Number.isNaN(date.getTime())) {
    return '08.03';
  }
  const jam = String(date.getHours()).padStart(2, '0');
  const menit = String(date.getMinutes()).padStart(2, '0');
  return `${jam}.${menit}`;
}

function AttendanceBadge({
  status,
  waktuIso,
}: {
  status: StatusKehadiranRiwayat;
  waktuIso?: string;
}) {
  if (status === 'hadir') {
    const jam = waktuIso ? formatJamPresensi(waktuIso) : '';
    return (
      <View style={styles.hadirRow}>
        <View style={styles.badgeHadir}>
          <Text style={styles.badgeHadirCheck}>✓</Text>
          <Text style={styles.badgeHadirText}>Hadir</Text>
        </View>
        {jam ? <Text style={styles.waktuHadirText}>{jam}</Text> : null}
      </View>
    );
  }

  return (
    <View style={styles.badgeTidakHadir}>
      <Text style={styles.badgeTidakHadirText}>Tidak hadir</Text>
    </View>
  );
}

function FilterChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.filterChip,
        selected && styles.filterChipSelected,
        pressed && styles.pressed,
      ]}
    >
      <Text
        style={[
          styles.filterChipText,
          selected && styles.filterChipTextSelected,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function RiwayatCard({
  item,
  onPress,
}: {
  item: ItemRiwayatSesi;
  onPress: () => void;
}) {
  const { sesi, namaPraktikum, statusKehadiran, waktuPresensi } = item;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${namaPraktikum} pertemuan ${sesi.pertemuanKe}, status ${statusKehadiran === 'hadir' ? 'Hadir' : 'Tidak hadir'}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.riwayatCard,
        pressed && styles.cardPressed,
      ]}
    >
      <View style={styles.cardTopRow}>
        <View style={styles.titleBlock}>
          <Text style={styles.courseTitle}>
            {namaPraktikum} · Pert. {sesi.pertemuanKe}
          </Text>
          <Text style={styles.sessionSubMeta}>
            Kelas {sesi.kelas} · {sesi.lab}
          </Text>
        </View>
        <Text style={styles.dateLabel}>{formatTanggal(sesi.tanggal)}</Text>
      </View>

      <View style={styles.divider} />

      <View style={styles.cardBottomRow}>
        <AttendanceBadge
          status={statusKehadiran}
          waktuIso={waktuPresensi}
        />
        <Text style={styles.scheduleClockText}>
          {formatRentangJam(sesi.jamMulai, sesi.jamSelesai)}
        </Text>
      </View>
    </Pressable>
  );
}

function EmptyRiwayatState({
  filter,
  onResetFilter,
}: {
  filter: FilterRiwayat;
  onResetFilter: () => void;
}) {
  return (
    <View style={styles.emptyCard}>
      <View style={styles.emptyIconCircle}>
        <Text style={styles.emptyIconText}>0</Text>
      </View>
      <Text style={styles.emptyTitle}>Belum ada presensi</Text>
      <Text style={styles.emptyBody}>
        {filter === 'semua'
          ? 'Riwayat kehadiran kamu akan muncul di sini setelah melakukan presensi atau setelah sesi praktikum ditutup.'
          : `Tidak ada riwayat sesi dengan status "${LABEL_FILTER[filter]}".`}
      </Text>
      {filter !== 'semua' && (
        <Pressable
          accessibilityRole="button"
          onPress={onResetFilter}
          style={({ pressed }) => [
            styles.resetButton,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.resetButtonText}>Tampilkan Semua Riwayat</Text>
        </Pressable>
      )}
    </View>
  );
}

export default function RiwayatKehadiranScreen() {
  const [filterAktif, setFilterAktif] = useState<FilterRiwayat>('semua');

  // Hanya mengambil presensi milik praktikan yang sedang login (FR-6)
  const petaPresensiSaya = useMemo(() => {
    const map = new Map<string, Presensi>();
    for (const item of PRESENSI_CONTOH) {
      if (item.userId === PRAKTIKAN_AKTIF.id) {
        map.set(item.sesiId, item);
      }
    }
    return map;
  }, []);

  // Aturan LAYOUT.md Bagian 3.6:
  // - Sesi Belum dibuka tidak ditampilkan.
  // - Sesi yang sudah dihadiri tampil Hadir beserta jam.
  // - Sesi Ditutup tanpa presensi tampil Tidak hadir.
  const semuaRiwayat = useMemo<ItemRiwayatSesi[]>(() => {
    const hasil: ItemRiwayatSesi[] = [];

    for (const sesi of SESI_CONTOH) {
      if (sesi.status === 'belum_dibuka') {
        continue;
      }

      const catatanPresensi = petaPresensiSaya.get(sesi.id);

      if (catatanPresensi) {
        hasil.push({
          sesi,
          namaPraktikum: ambilNamaPraktikum(sesi.praktikumId),
          statusKehadiran: 'hadir',
          waktuPresensi: catatanPresensi.waktu,
        });
      } else if (sesi.status === 'ditutup') {
        hasil.push({
          sesi,
          namaPraktikum: ambilNamaPraktikum(sesi.praktikumId),
          statusKehadiran: 'tidak_hadir',
        });
      }
    }

    return hasil.sort((a, b) => b.sesi.tanggal.localeCompare(a.sesi.tanggal));
  }, [petaPresensiSaya]);

  const daftarTampil = useMemo(() => {
    if (filterAktif === 'semua') {
      return semuaRiwayat;
    }
    return semuaRiwayat.filter((item) => item.statusKehadiran === filterAktif);
  }, [filterAktif, semuaRiwayat]);

  const jumlahHadir = useMemo(
    () =>
      semuaRiwayat.filter((item) => item.statusKehadiran === 'hadir').length,
    [semuaRiwayat]
  );

  const totalSesiRiwayat = semuaRiwayat.length;
  const persentaseHadir =
    totalSesiRiwayat > 0
      ? Math.round((jumlahHadir / totalSesiRiwayat) * 100)
      : 0;

  const bukaDetailSesi = (sesiId: string) => {
    router.push({
      pathname: '/praktikan/detail-sesi',
      params: { sesiId },
    });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <FlatList
        data={daftarTampil}
        keyExtractor={(item) => item.sesi.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.headerContainer}>
            <View style={styles.titleSection}>
              <Text style={styles.screenTitle}>Riwayat Kehadiran</Text>
              <Text style={styles.studentIdentity}>
                {PRAKTIKAN_AKTIF.nama}
                {PRAKTIKAN_AKTIF.nim ? ` · NIM ${PRAKTIKAN_AKTIF.nim}` : ''}
              </Text>
            </View>

            <View style={styles.summaryCard}>
              <View style={styles.summaryHeaderRow}>
                <Text style={styles.summaryTitle}>
                  Hadir {jumlahHadir} dari {totalSesiRiwayat} sesi
                </Text>
                <Text style={styles.summaryPercentage}>{persentaseHadir}%</Text>
              </View>

              <View
                accessibilityRole="progressbar"
                accessibilityValue={{
                  min: 0,
                  max: 100,
                  now: persentaseHadir,
                }}
                style={styles.progressTrack}
              >
                <View
                  style={[
                    styles.progressFill,
                    { width: `${persentaseHadir}%` },
                  ]}
                />
              </View>

              <View style={styles.summaryStatsRow}>
                <View style={styles.statPill}>
                  <View style={styles.statDotHadir} />
                  <Text style={styles.statText}>{jumlahHadir} Hadir</Text>
                </View>
                <View style={styles.statPill}>
                  <View style={styles.statDotTidakHadir} />
                  <Text style={styles.statText}>
                    {totalSesiRiwayat - jumlahHadir} Tidak hadir
                  </Text>
                </View>
              </View>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterRow}
            >
              {(Object.keys(LABEL_FILTER) as FilterRiwayat[]).map((key) => (
                <FilterChip
                  key={key}
                  label={LABEL_FILTER[key]}
                  selected={filterAktif === key}
                  onPress={() => setFilterAktif(key)}
                />
              ))}
            </ScrollView>
          </View>
        }
        renderItem={({ item }) => (
          <RiwayatCard
            item={item}
            onPress={() => bukaDetailSesi(item.sesi.id)}
          />
        )}
        ListEmptyComponent={
          <EmptyRiwayatState
            filter={filterAktif}
            onResetFilter={() => setFilterAktif('semua')}
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: WARNA.bg,
  },
  listContainer: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 28,
    gap: 14,
  },
  headerContainer: {
    gap: 16,
    marginBottom: 4,
  },
  titleSection: {
    gap: 4,
  },
  screenTitle: {
    color: WARNA.text,
    fontSize: 26,
    fontWeight: '800',
    lineHeight: 32,
  },
  studentIdentity: {
    color: WARNA.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  summaryCard: {
    backgroundColor: WARNA.surface,
    borderColor: WARNA.border,
    borderWidth: 1,
    borderRadius: 20,
    padding: 18,
    gap: 12,
  },
  summaryHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  summaryTitle: {
    color: WARNA.text,
    fontSize: 18,
    fontWeight: '800',
    flex: 1,
  },
  summaryPercentage: {
    color: WARNA.primary,
    fontSize: 18,
    fontWeight: '800',
  },
  progressTrack: {
    height: 10,
    borderRadius: 999,
    backgroundColor: WARNA.border,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: WARNA.primary,
  },
  summaryStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statDotHadir: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: WARNA.text,
  },
  statDotTidakHadir: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: WARNA.primary,
  },
  statText: {
    color: WARNA.textMuted,
    fontSize: 13,
    fontWeight: '700',
  },
  filterRow: {
    gap: 8,
  },
  filterChip: {
    minHeight: 44,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: WARNA.bg,
    borderWidth: 1,
    borderColor: WARNA.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterChipSelected: {
    backgroundColor: WARNA.highlight,
    borderColor: WARNA.text,
  },
  filterChipText: {
    color: WARNA.textMuted,
    fontSize: 13,
    fontWeight: '700',
  },
  filterChipTextSelected: {
    color: WARNA.text,
  },
  riwayatCard: {
    backgroundColor: WARNA.surface,
    borderColor: WARNA.border,
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    gap: 12,
  },
  cardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.995 }],
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  titleBlock: {
    flex: 1,
    gap: 4,
  },
  courseTitle: {
    color: WARNA.text,
    fontSize: 17,
    fontWeight: '800',
    lineHeight: 23,
  },
  sessionSubMeta: {
    color: WARNA.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  dateLabel: {
    color: WARNA.text,
    fontSize: 13,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: WARNA.border,
  },
  cardBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  hadirRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badgeHadir: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: WARNA.highlight,
    borderColor: WARNA.text,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  badgeHadirCheck: {
    color: WARNA.text,
    fontSize: 12,
    fontWeight: '900',
  },
  badgeHadirText: {
    color: WARNA.text,
    fontSize: 12,
    fontWeight: '800',
  },
  waktuHadirText: {
    color: WARNA.text,
    fontSize: 14,
    fontWeight: '800',
  },
  badgeTidakHadir: {
    backgroundColor: WARNA.primary,
    borderColor: WARNA.primary,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  badgeTidakHadirText: {
    color: WARNA.surface,
    fontSize: 12,
    fontWeight: '800',
  },
  scheduleClockText: {
    color: WARNA.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  emptyCard: {
    backgroundColor: WARNA.surface,
    borderColor: WARNA.border,
    borderWidth: 1,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    gap: 10,
  },
  emptyIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: WARNA.bg,
    borderColor: WARNA.border,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIconText: {
    color: WARNA.primary,
    fontSize: 18,
    fontWeight: '800',
  },
  emptyTitle: {
    color: WARNA.text,
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  emptyBody: {
    color: WARNA.textMuted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  resetButton: {
    marginTop: 4,
    minHeight: 44,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: WARNA.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetButtonText: {
    color: WARNA.surface,
    fontSize: 13,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.85,
  },
});
