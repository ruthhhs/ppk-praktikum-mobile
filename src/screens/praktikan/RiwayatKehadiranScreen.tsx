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
import {
  ambilNamaDepan,
  ambilNamaPraktikum,
  formatJamPresensi,
  formatRentangJam,
  formatTanggalIndonesia,
  usePraktikanStore,
  WARNA,
  type Presensi,
  type Sesi,
} from '../../components/praktikan/praktikanStore';

type StatusKehadiranRiwayat = 'hadir' | 'tidak_hadir';
type FilterRiwayat = 'semua' | 'hadir' | 'tidak_hadir';

type ItemRiwayatSesi = {
  sesi: Sesi;
  namaPraktikum: string;
  statusKehadiran: StatusKehadiranRiwayat;
  waktuPresensi?: string;
};

const LABEL_FILTER: Record<FilterRiwayat, string> = {
  semua: 'Semua',
  hadir: 'Hadir',
  tidak_hadir: 'Tidak hadir',
};

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
        <Text style={styles.dateLabel}>
          {formatTanggalIndonesia(sesi.tanggal)}
        </Text>
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
  const {
    currentUser,
    daftarPraktikan,
    praktikum,
    sesi,
    presensi,
    pilihPraktikanAktif,
  } = usePraktikanStore();
  const [filterAktif, setFilterAktif] = useState<FilterRiwayat>('semua');

  // Hanya mengambil presensi milik praktikan yang sedang login (FR-6)
  const petaPresensiSaya = useMemo(() => {
    const map = new Map<string, Presensi>();
    for (const item of presensi) {
      if (item.userId === currentUser.id) {
        map.set(item.sesiId, item);
      }
    }
    return map;
  }, [currentUser.id, presensi]);

  // Aturan LAYOUT.md Bagian 3.6:
  // - Sesi Belum dibuka tidak ditampilkan.
  // - Sesi yang sudah dihadiri tampil Hadir beserta jam.
  // - Sesi Ditutup tanpa presensi tampil Tidak hadir.
  const semuaRiwayat = useMemo<ItemRiwayatSesi[]>(() => {
    const hasil: ItemRiwayatSesi[] = [];

    for (const itemSesi of sesi) {
      if (itemSesi.status === 'belum_dibuka') {
        continue;
      }

      const catatanPresensi = petaPresensiSaya.get(itemSesi.id);

      if (catatanPresensi) {
        hasil.push({
          sesi: itemSesi,
          namaPraktikum: ambilNamaPraktikum(praktikum, itemSesi.praktikumId),
          statusKehadiran: 'hadir',
          waktuPresensi: catatanPresensi.waktu,
        });
      } else if (itemSesi.status === 'ditutup') {
        hasil.push({
          sesi: itemSesi,
          namaPraktikum: ambilNamaPraktikum(praktikum, itemSesi.praktikumId),
          statusKehadiran: 'tidak_hadir',
        });
      }
    }

    return hasil.sort((a, b) => b.sesi.tanggal.localeCompare(a.sesi.tanggal));
  }, [petaPresensiSaya, praktikum, sesi]);

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
                {currentUser.nama}
                {currentUser.nim ? ` · NIM ${currentUser.nim}` : ''}
              </Text>
            </View>

            <View style={styles.identitySwitcherBox}>
              <Text style={styles.identitySwitcherLabel}>
                Identitas Praktikan (Simulasi Demo):
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.identityRow}
              >
                {daftarPraktikan.map((user) => {
                  const terpilih = user.id === currentUser.id;
                  return (
                    <Pressable
                      key={user.id}
                      accessibilityRole="button"
                      accessibilityState={{ selected: terpilih }}
                      onPress={() => pilihPraktikanAktif(user.id)}
                      style={({ pressed }) => [
                        styles.identityChip,
                        terpilih && styles.identityChipSelected,
                        pressed && styles.pressed,
                      ]}
                    >
                      <Text
                        style={[
                          styles.identityChipText,
                          terpilih && styles.identityChipTextSelected,
                        ]}
                      >
                        {ambilNamaDepan(user.nama)}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
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
    gap: 14,
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
  identitySwitcherBox: {
    backgroundColor: WARNA.surface,
    borderColor: WARNA.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    gap: 8,
  },
  identitySwitcherLabel: {
    color: WARNA.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  identityRow: {
    gap: 8,
  },
  identityChip: {
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: WARNA.bg,
    borderColor: WARNA.border,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  identityChipSelected: {
    backgroundColor: WARNA.primary,
    borderColor: WARNA.primary,
  },
  identityChipText: {
    color: WARNA.text,
    fontSize: 12,
    fontWeight: '700',
  },
  identityChipTextSelected: {
    color: WARNA.surface,
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
