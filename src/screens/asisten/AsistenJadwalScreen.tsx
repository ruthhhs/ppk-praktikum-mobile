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

type StatusSesi = 'dibuka' | 'belum_dibuka' | 'ditutup';
type FilterSesi = 'semua' | StatusSesi;

type Sesi = {
  id: string;
  praktikum: string;
  pertemuanKe: number;
  kelas: string;
  lab: string;
  tanggal: string;
  jamMulai: string;
  jamSelesai: string;
  status: StatusSesi;
  hadir: number;
  total: number;
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
  soft: '#F5F8F6',
};

// Data sementara untuk UI B1. Ganti dengan data dari AppContext
// setelah types.ts, dummy.ts, dan AppContext.tsx dari Dev A tersedia.
const SESI_CONTOH: Sesi[] = [
  {
    id: 'sesi-01',
    praktikum: 'Basis Data',
    pertemuanKe: 3,
    kelas: 'A',
    lab: 'Lab Komputer 2',
    tanggal: '2026-10-23',
    jamMulai: '08:00',
    jamSelesai: '10:00',
    status: 'dibuka',
    hadir: 12,
    total: 30,
  },
  {
    id: 'sesi-02',
    praktikum: 'Pemrograman Web',
    pertemuanKe: 2,
    kelas: 'B',
    lab: 'Lab Komputer 1',
    tanggal: '2026-10-24',
    jamMulai: '10:00',
    jamSelesai: '12:00',
    status: 'belum_dibuka',
    hadir: 0,
    total: 28,
  },
  {
    id: 'sesi-03',
    praktikum: 'Jaringan Komputer',
    pertemuanKe: 4,
    kelas: 'A',
    lab: 'Lab Jaringan',
    tanggal: '2026-10-25',
    jamMulai: '13:00',
    jamSelesai: '15:00',
    status: 'belum_dibuka',
    hadir: 0,
    total: 26,
  },
  {
    id: 'sesi-04',
    praktikum: 'Basis Data',
    pertemuanKe: 2,
    kelas: 'A',
    lab: 'Lab Komputer 2',
    tanggal: '2026-10-20',
    jamMulai: '08:00',
    jamSelesai: '10:00',
    status: 'ditutup',
    hadir: 26,
    total: 30,
  },
  {
    id: 'sesi-05',
    praktikum: 'Pemrograman Web',
    pertemuanKe: 1,
    kelas: 'B',
    lab: 'Lab Komputer 1',
    tanggal: '2026-10-18',
    jamMulai: '10:00',
    jamSelesai: '12:00',
    status: 'ditutup',
    hadir: 24,
    total: 28,
  },
];

const LABEL_STATUS: Record<StatusSesi, string> = {
  belum_dibuka: 'Belum dibuka',
  dibuka: 'Dibuka',
  ditutup: 'Ditutup',
};

const LABEL_FILTER: Record<FilterSesi, string> = {
  semua: 'Semua',
  dibuka: 'Dibuka',
  belum_dibuka: 'Belum dibuka',
  ditutup: 'Ditutup',
};

function formatTanggal(tanggal: string) {
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

function StatusBadge({ status }: { status: StatusSesi }) {
  return (
    <View style={[styles.statusBadge, styles[`status_${status}`]]}>
      {status === 'dibuka' && <View style={styles.statusDot} />}
      <Text style={[styles.statusText, styles[`statusText_${status}`]]}>
        {LABEL_STATUS[status]}
      </Text>
    </View>
  );
}

function FilterButton({
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
        styles.filterButton,
        selected && styles.filterButtonSelected,
        pressed && styles.pressed,
      ]}
    >
      <Text
        style={[
          styles.filterText,
          selected && styles.filterTextSelected,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function SessionCard({ sesi }: { sesi: Sesi }) {
  const persentase =
    sesi.total > 0 ? Math.round((sesi.hadir / sesi.total) * 100) : 0;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Buka detail ${sesi.praktikum}, pertemuan ${sesi.pertemuanKe}`}
      onPress={() =>
        router.push({
          pathname: '/asisten/detail-sesi',
          params: { sesiId: sesi.id },
        })
      }
      style={({ pressed }) => [
        styles.sessionCard,
        pressed && styles.sessionCardPressed,
      ]}
    >
      <View style={styles.cardTopRow}>
        <Text style={styles.cardEyebrow}>SESI PRAKTIKUM</Text>
        <StatusBadge status={sesi.status} />
      </View>

      <Text style={styles.courseName}>{sesi.praktikum}</Text>
      <Text style={styles.sessionMeta}>
        Pertemuan {sesi.pertemuanKe}
        <Text style={styles.metaSeparator}>  ·  </Text>
        Kelas {sesi.kelas}
      </Text>

      <View style={styles.infoDivider} />

      <View style={styles.infoGrid}>
        <View style={styles.infoBlock}>
          <Text style={styles.infoLabel}>WAKTU</Text>
          <Text style={styles.infoValue}>{formatTanggal(sesi.tanggal)}</Text>
          <Text style={styles.infoSubValue}>
            {sesi.jamMulai}–{sesi.jamSelesai}
          </Text>
        </View>

        <View style={styles.infoBlock}>
          <Text style={styles.infoLabel}>LOKASI</Text>
          <Text style={styles.infoValue}>Kelas {sesi.kelas}</Text>
          <Text style={styles.infoSubValue}>{sesi.lab}</Text>
        </View>
      </View>

      <View style={styles.attendanceSection}>
        <View style={styles.attendanceHeading}>
          <Text style={styles.attendanceLabel}>Kehadiran</Text>
          <Text style={styles.attendanceCount}>
            {sesi.hadir}
            <Text style={styles.attendanceTotal}> / {sesi.total} hadir</Text>
          </Text>
        </View>

        <View
          accessibilityRole="progressbar"
          accessibilityValue={{ min: 0, max: 100, now: persentase }}
          style={styles.progressTrack}
        >
          <View
            style={[
              styles.progressFill,
              { width: `${persentase}%` as `${number}%` },
            ]}
          />
        </View>
      </View>

      <View style={styles.cardFooter}>
        <Text style={styles.detailLink}>Lihat detail sesi</Text>
        <Text style={styles.detailArrow}>›</Text>
      </View>
    </Pressable>
  );
}

export default function AsistenJadwalScreen() {
  const [filter, setFilter] = useState<FilterSesi>('semua');

  const sesiTerfilter = useMemo(() => {
    return SESI_CONTOH
      .filter((sesi) => filter === 'semua' || sesi.status === filter)
      .sort((a, b) => {
        if (a.status === 'dibuka' && b.status !== 'dibuka') return -1;
        if (a.status !== 'dibuka' && b.status === 'dibuka') return 1;
        return a.tanggal.localeCompare(b.tanggal);
      });
  }, [filter]);

  const jumlahDibuka = SESI_CONTOH.filter(
    (sesi) => sesi.status === 'dibuka',
  ).length;

  const jumlahBelumDibuka = SESI_CONTOH.filter(
    (sesi) => sesi.status === 'belum_dibuka',
  ).length;

  const header = (
    <View>
      <View style={styles.brandRow}>
        <View style={styles.brandMark}>
          <Text style={styles.brandMarkText}>S!</Text>
        </View>
        <Text style={styles.brandName}>Sistem Informasi Praktikum</Text>
      </View>

      <View style={styles.titleBlock}>
        <View style={styles.titleRow}>
          <Text style={styles.screenTitle}>Jadwal Praktikum</Text>
          <View style={styles.rolePill}>
            <Text style={styles.rolePillText}>ASISTEN</Text>
          </View>
        </View>
        <Text style={styles.screenSubtitle}>
          Pantau sesi dan kehadiran praktikan.
        </Text>
      </View>

      <View style={styles.summaryCard}>
        <View style={styles.summaryHeading}>
          <Text style={styles.summaryEyebrow}>RINGKASAN JADWAL</Text>
          <Text style={styles.summaryPeriod}>Sprint 1</Text>
        </View>

        <View style={styles.summaryStats}>
          <View style={styles.summaryStat}>
            <Text style={styles.summaryNumber}>{SESI_CONTOH.length}</Text>
            <Text style={styles.summaryLabel}>Total sesi</Text>
          </View>

          <View style={styles.summaryDivider} />

          <View style={styles.summaryStat}>
            <Text style={styles.summaryNumber}>{jumlahDibuka}</Text>
            <Text style={styles.summaryLabel}>Sedang dibuka</Text>
          </View>

          <View style={styles.summaryDivider} />

          <View style={styles.summaryStat}>
            <Text style={styles.summaryNumber}>{jumlahBelumDibuka}</Text>
            <Text style={styles.summaryLabel}>Belum dibuka</Text>
          </View>
        </View>
      </View>

      <View style={styles.listHeading}>
        <View>
          <Text style={styles.listTitle}>Daftar sesi</Text>
          <Text style={styles.listSubtitle}>
            Pilih sesi untuk melihat informasi lengkap.
          </Text>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filters}
      >
        {(Object.keys(LABEL_FILTER) as FilterSesi[]).map((item) => (
          <FilterButton
            key={item}
            label={LABEL_FILTER[item]}
            selected={filter === item}
            onPress={() => setFilter(item)}
          />
        ))}
      </ScrollView>
    </View>
  );

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={styles.safeArea}
    >
      <FlatList
        data={sesiTerfilter}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <SessionCard sesi={item} />}
        ListHeaderComponent={header}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyMark}>
              <Text style={styles.emptyMarkText}>—</Text>
            </View>
            <Text style={styles.emptyTitle}>Belum ada sesi</Text>
            <Text style={styles.emptyDescription}>
              Belum ada jadwal dengan status “{LABEL_FILTER[filter]}”.
            </Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: WARNA.bg,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginBottom: 24,
  },
  brandMark: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: WARNA.primary,
  },
  brandMarkText: {
    color: WARNA.surface,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  brandName: {
    color: WARNA.textMuted,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.15,
  },
  titleBlock: {
    marginBottom: 20,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  screenTitle: {
    flex: 1,
    color: WARNA.text,
    fontSize: 27,
    lineHeight: 33,
    fontWeight: '800',
    letterSpacing: -0.7,
  },
  rolePill: {
    backgroundColor: WARNA.highlight,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 99,
  },
  rolePillText: {
    color: WARNA.text,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  screenSubtitle: {
    color: WARNA.textMuted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
  },
  summaryCard: {
    padding: 17,
    borderRadius: 20,
    backgroundColor: WARNA.text,
    marginBottom: 26,
  },
  summaryHeading: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  summaryEyebrow: {
    color: 'rgba(254, 255, 224, 0.78)',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  summaryPeriod: {
    color: WARNA.text,
    backgroundColor: WARNA.highlight,
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 5,
    fontSize: 10,
    fontWeight: '700',
  },
  summaryStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryStat: {
    flex: 1,
  },
  summaryNumber: {
    color: WARNA.surface,
    fontSize: 25,
    lineHeight: 30,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  summaryLabel: {
    color: 'rgba(254, 255, 224, 0.78)',
    fontSize: 10,
    lineHeight: 15,
    marginTop: 3,
  },
  summaryDivider: {
    width: 1,
    height: 38,
    backgroundColor: 'rgba(254, 255, 224, 0.22)',
    marginHorizontal: 10,
  },
  listHeading: {
    marginBottom: 14,
  },
  listTitle: {
    color: WARNA.text,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  listSubtitle: {
    color: WARNA.textMuted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 3,
  },
  filters: {
    gap: 8,
    paddingBottom: 16,
  },
  filterButton: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: WARNA.border,
    backgroundColor: WARNA.bg,
  },
  filterButtonSelected: {
    borderColor: WARNA.primary,
    backgroundColor: WARNA.primary,
  },
  filterText: {
    color: WARNA.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  filterTextSelected: {
    color: WARNA.surface,
  },
  sessionCard: {
    padding: 16,
    marginBottom: 13,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: WARNA.border,
    backgroundColor: WARNA.surface,
    shadowColor: WARNA.text,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.055,
    shadowRadius: 12,
    elevation: 2,
  },
  sessionCardPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.99 }],
  },
  pressed: {
    opacity: 0.75,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 12,
  },
  cardEyebrow: {
    color: WARNA.textMuted,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
  },
  statusBadge: {
    minHeight: 27,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 10,
    borderRadius: 99,
    borderWidth: 1,
  },
  status_dibuka: {
    backgroundColor: WARNA.highlight,
    borderColor: WARNA.highlight,
  },
  status_belum_dibuka: {
    backgroundColor: WARNA.bg,
    borderColor: WARNA.textMuted,
  },
  status_ditutup: {
    backgroundColor: WARNA.primary,
    borderColor: WARNA.primary,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: WARNA.text,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  statusText_dibuka: {
    color: WARNA.text,
  },
  statusText_belum_dibuka: {
    color: WARNA.text,
  },
  statusText_ditutup: {
    color: WARNA.surface,
  },
  courseName: {
    color: WARNA.text,
    fontSize: 19,
    lineHeight: 24,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  sessionMeta: {
    color: WARNA.textMuted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 3,
  },
  metaSeparator: {
    color: WARNA.accent,
    fontWeight: '900',
  },
  infoDivider: {
    height: 1,
    backgroundColor: WARNA.border,
    marginVertical: 14,
  },
  infoGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  infoBlock: {
    flex: 1,
    minWidth: 0,
  },
  infoLabel: {
    color: WARNA.textMuted,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.9,
    marginBottom: 5,
  },
  infoValue: {
    color: WARNA.text,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
  },
  infoSubValue: {
    color: WARNA.textMuted,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 2,
  },
  attendanceSection: {
    marginTop: 15,
  },
  attendanceHeading: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 7,
  },
  attendanceLabel: {
    color: WARNA.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  attendanceCount: {
    color: WARNA.primary,
    fontSize: 12,
    fontWeight: '800',
  },
  attendanceTotal: {
    color: WARNA.textMuted,
    fontWeight: '600',
  },
  progressTrack: {
    height: 6,
    overflow: 'hidden',
    borderRadius: 99,
    backgroundColor: WARNA.border,
  },
  progressFill: {
    height: '100%',
    borderRadius: 99,
    backgroundColor: WARNA.primary,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 5,
    marginTop: 14,
  },
  detailLink: {
    color: WARNA.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  detailArrow: {
    color: WARNA.primary,
    fontSize: 20,
    lineHeight: 20,
    marginTop: -2,
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 42,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: WARNA.border,
    backgroundColor: WARNA.soft,
  },
  emptyMark: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: WARNA.highlight,
    marginBottom: 12,
  },
  emptyMarkText: {
    color: WARNA.text,
    fontSize: 22,
    fontWeight: '700',
  },
  emptyTitle: {
    color: WARNA.text,
    fontSize: 16,
    fontWeight: '800',
  },
  emptyDescription: {
    color: WARNA.textMuted,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 5,
  },
});