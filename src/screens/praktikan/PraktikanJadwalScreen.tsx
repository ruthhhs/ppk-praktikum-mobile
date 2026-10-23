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
  LABEL_STATUS,
  TANGGAL_HARI_INI,
  usePraktikanStore,
  WARNA,
  type Presensi,
  type Role,
  type Sesi,
  type SesiStatus,
} from '../../components/praktikan/praktikanStore';

type FilterJadwal = 'semua' | 'hari_ini' | SesiStatus;

const LABEL_FILTER: Record<FilterJadwal, string> = {
  semua: 'Semua',
  hari_ini: 'Hari ini',
  dibuka: 'Dibuka',
  belum_dibuka: 'Belum dibuka',
  ditutup: 'Ditutup',
};

const URUTAN_STATUS: Record<SesiStatus, number> = {
  dibuka: 0,
  belum_dibuka: 1,
  ditutup: 2,
};

export function StatusBadge({ status }: { status: SesiStatus }) {
  return (
    <View
      style={[
        styles.statusBadge,
        status === 'belum_dibuka' && styles.status_belum_dibuka,
        status === 'dibuka' && styles.status_dibuka,
        status === 'ditutup' && styles.status_ditutup,
      ]}
    >
      {status === 'dibuka' && <View style={styles.statusDot} />}
      <Text
        style={[
          styles.statusText,
          status === 'belum_dibuka' && styles.statusText_belum_dibuka,
          status === 'dibuka' && styles.statusText_dibuka,
          status === 'ditutup' && styles.statusText_ditutup,
        ]}
      >
        {LABEL_STATUS[status]}
      </Text>
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

export function SessionCard({
  sesi,
  namaPraktikum,
  role = 'praktikan',
  sudahPresensi = false,
  waktuPresensi,
  onPress,
}: {
  sesi: Sesi;
  namaPraktikum: string;
  role?: Role;
  sudahPresensi?: boolean;
  waktuPresensi?: string;
  onPress: () => void;
}) {
  const jamHadir = waktuPresensi ? formatJamPresensi(waktuPresensi) : '';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Buka detail ${namaPraktikum}, pertemuan ${sesi.pertemuanKe}, status ${LABEL_STATUS[sesi.status]}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.sessionCard,
        sesi.status === 'dibuka' && styles.sessionCardOpen,
        pressed && styles.sessionCardPressed,
      ]}
    >
      <View style={styles.cardHeaderRow}>
        <View style={styles.courseTitleBlock}>
          <Text style={styles.courseName}>{namaPraktikum}</Text>
          <Text style={styles.sessionMeta}>
            Pertemuan {sesi.pertemuanKe} · Kelas {sesi.kelas}
          </Text>
        </View>
        <StatusBadge status={sesi.status} />
      </View>

      <View style={styles.infoDivider} />

      <View style={styles.detailsColumn}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Ruang Lab</Text>
          <Text style={styles.detailValue}>{sesi.lab}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Tanggal</Text>
          <Text style={styles.detailValue}>
            {formatTanggalIndonesia(sesi.tanggal)}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Waktu</Text>
          <Text style={styles.detailValue}>
            {formatRentangJam(sesi.jamMulai, sesi.jamSelesai)}
          </Text>
        </View>
      </View>

      <View style={styles.cardFooter}>
        {role === 'praktikan' ? (
          sudahPresensi ? (
            <View style={styles.attendedPill}>
              <Text style={styles.attendedCheck}>✓</Text>
              <Text style={styles.attendedText}>
                Sudah presensi{jamHadir ? ` · ${jamHadir}` : ''}
              </Text>
            </View>
          ) : sesi.status === 'dibuka' ? (
            <View style={styles.openPromptRow}>
              <View style={styles.openPromptBadge}>
                <Text style={styles.openPromptText}>
                  Sesi aktif · Ketuk untuk presensi
                </Text>
              </View>
            </View>
          ) : (
            <Text style={styles.unattendedText}>
              {sesi.status === 'belum_dibuka'
                ? 'Menunggu sesi dibuka asisten'
                : 'Belum tercatat presensi pada sesi ini'}
            </Text>
          )
        ) : (
          <Text style={styles.assistantCountText}>
            {sesi.hadir ?? 0}/{sesi.total ?? 0} hadir
          </Text>
        )}
      </View>
    </Pressable>
  );
}

function EmptyJadwalState({
  filter,
  onReset,
}: {
  filter: FilterJadwal;
  onReset: () => void;
}) {
  return (
    <View style={styles.emptyCard}>
      <View style={styles.emptyIconCircle}>
        <Text style={styles.emptyIconText}>0</Text>
      </View>
      <Text style={styles.emptyTitle}>Tidak ada jadwal praktikum</Text>
      <Text style={styles.emptyBody}>
        Tidak ditemukan sesi untuk filter {'"'}
        {LABEL_FILTER[filter]}
        {'"'}.
      </Text>
      {filter !== 'semua' && (
        <Pressable
          accessibilityRole="button"
          onPress={onReset}
          style={({ pressed }) => [
            styles.resetButton,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.resetButtonText}>Tampilkan Semua Sesi</Text>
        </Pressable>
      )}
    </View>
  );
}

export default function PraktikanJadwalScreen() {
  const {
    currentUser,
    daftarPraktikan,
    praktikum,
    sesi,
    presensi,
    pilihPraktikanAktif,
  } = usePraktikanStore();
  const [filterAktif, setFilterAktif] = useState<FilterJadwal>('semua');

  const petaPresensiSaya = useMemo(() => {
    const map = new Map<string, Presensi>();
    for (const item of presensi) {
      if (item.userId === currentUser.id) {
        map.set(item.sesiId, item);
      }
    }
    return map;
  }, [currentUser.id, presensi]);

  const daftarSesiTerurut = useMemo(() => {
    const hasilFilter = sesi.filter((item) => {
      if (filterAktif === 'semua') {
        return true;
      }
      if (filterAktif === 'hari_ini') {
        return item.tanggal === TANGGAL_HARI_INI;
      }
      return item.status === filterAktif;
    });

    return [...hasilFilter].sort((a, b) => {
      const selisihStatus = URUTAN_STATUS[a.status] - URUTAN_STATUS[b.status];
      if (selisihStatus !== 0) {
        return selisihStatus;
      }
      return a.tanggal.localeCompare(b.tanggal);
    });
  }, [filterAktif, sesi]);

  const sesiDibuka = useMemo(
    () => sesi.find((item) => item.status === 'dibuka'),
    [sesi]
  );

  const bukaDetailSesi = (sesiId: string) => {
    router.push({
      pathname: '/praktikan/detail-sesi',
      params: { sesiId },
    });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <FlatList
        data={daftarSesiTerurut}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.headerContainer}>
            <View style={styles.titleBlock}>
              <Text style={styles.screenTitle}>Jadwal Praktikum</Text>
              <View style={styles.greetingRow}>
                <Text style={styles.greetingText}>
                  Halo, {ambilNamaDepan(currentUser.nama)}
                  {currentUser.nim ? ` · ${currentUser.nim}` : ''}
                </Text>
                <View style={styles.roleChip}>
                  <Text style={styles.roleChipText}>Praktikan</Text>
                </View>
              </View>
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

            {sesiDibuka && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Sesi sedang dibuka: ${ambilNamaPraktikum(praktikum, sesiDibuka.praktikumId)} pertemuan ${sesiDibuka.pertemuanKe}. Ketuk untuk membuka detail dan presensi.`}
                onPress={() => bukaDetailSesi(sesiDibuka.id)}
                style={({ pressed }) => [
                  styles.activeBanner,
                  pressed && styles.pressed,
                ]}
              >
                <View style={styles.activeBannerHeader}>
                  <StatusBadge status="dibuka" />
                  <Text style={styles.activeBannerTime}>
                    {formatRentangJam(
                      sesiDibuka.jamMulai,
                      sesiDibuka.jamSelesai
                    )}
                  </Text>
                </View>

                <Text style={styles.activeBannerTitle}>
                  {ambilNamaPraktikum(praktikum, sesiDibuka.praktikumId)} ·
                  Pertemuan {sesiDibuka.pertemuanKe}
                </Text>
                <Text style={styles.activeBannerSub}>
                  Kelas {sesiDibuka.kelas} · {sesiDibuka.lab}
                </Text>

                <View style={styles.activeBannerCtaRow}>
                  <Text style={styles.activeBannerCtaText}>
                    {petaPresensiSaya.has(sesiDibuka.id)
                      ? '✓ Kamu sudah presensi pada sesi ini'
                      : 'Sesi sedang berlangsung, ketuk untuk isi presensi'}
                  </Text>
                </View>
              </Pressable>
            )}

            <View style={styles.filterSection}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterRow}
              >
                {(Object.keys(LABEL_FILTER) as FilterJadwal[]).map((key) => (
                  <FilterChip
                    key={key}
                    label={LABEL_FILTER[key]}
                    selected={filterAktif === key}
                    onPress={() => setFilterAktif(key)}
                  />
                ))}
              </ScrollView>
            </View>

            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Daftar Sesi</Text>
              <Text style={styles.sectionCount}>
                {daftarSesiTerurut.length} sesi
              </Text>
            </View>
          </View>
        }
        renderItem={({ item }) => {
          const dataPresensi = petaPresensiSaya.get(item.id);
          return (
            <SessionCard
              sesi={item}
              namaPraktikum={ambilNamaPraktikum(praktikum, item.praktikumId)}
              role="praktikan"
              sudahPresensi={Boolean(dataPresensi)}
              waktuPresensi={dataPresensi?.waktu}
              onPress={() => bukaDetailSesi(item.id)}
            />
          );
        }}
        ListEmptyComponent={
          <EmptyJadwalState
            filter={filterAktif}
            onReset={() => setFilterAktif('semua')}
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
  titleBlock: {
    gap: 6,
  },
  screenTitle: {
    color: WARNA.text,
    fontSize: 26,
    fontWeight: '800',
    lineHeight: 32,
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  greetingText: {
    color: WARNA.textMuted,
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  roleChip: {
    backgroundColor: WARNA.surface,
    borderColor: WARNA.border,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  roleChipText: {
    color: WARNA.text,
    fontSize: 12,
    fontWeight: '700',
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
  activeBanner: {
    backgroundColor: WARNA.surface,
    borderColor: WARNA.primary,
    borderWidth: 1.5,
    borderRadius: 20,
    padding: 16,
    gap: 8,
  },
  activeBannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  activeBannerTime: {
    color: WARNA.primary,
    fontSize: 13,
    fontWeight: '800',
  },
  activeBannerTitle: {
    color: WARNA.text,
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 24,
  },
  activeBannerSub: {
    color: WARNA.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  activeBannerCtaRow: {
    marginTop: 4,
    backgroundColor: WARNA.bg,
    borderColor: WARNA.border,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  activeBannerCtaText: {
    color: WARNA.text,
    fontSize: 13,
    fontWeight: '700',
  },
  filterSection: {
    marginHorizontal: -2,
  },
  filterRow: {
    gap: 8,
    paddingHorizontal: 2,
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
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    color: WARNA.text,
    fontSize: 18,
    fontWeight: '800',
  },
  sectionCount: {
    color: WARNA.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  sessionCard: {
    backgroundColor: WARNA.surface,
    borderColor: WARNA.border,
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    gap: 12,
  },
  sessionCardOpen: {
    borderColor: WARNA.text,
  },
  sessionCardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.995 }],
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  courseTitleBlock: {
    flex: 1,
    gap: 4,
  },
  courseName: {
    color: WARNA.text,
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 24,
  },
  sessionMeta: {
    color: WARNA.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  infoDivider: {
    height: 1,
    backgroundColor: WARNA.border,
  },
  detailsColumn: {
    gap: 6,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  detailLabel: {
    color: WARNA.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  detailValue: {
    color: WARNA.text,
    fontSize: 14,
    fontWeight: '700',
  },
  cardFooter: {
    paddingTop: 2,
  },
  attendedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    backgroundColor: WARNA.highlight,
    borderColor: WARNA.text,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  attendedCheck: {
    color: WARNA.text,
    fontSize: 13,
    fontWeight: '900',
  },
  attendedText: {
    color: WARNA.text,
    fontSize: 13,
    fontWeight: '800',
  },
  openPromptRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  openPromptBadge: {
    backgroundColor: WARNA.bg,
    borderColor: WARNA.primary,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  openPromptText: {
    color: WARNA.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  unattendedText: {
    color: WARNA.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  assistantCountText: {
    color: WARNA.primary,
    fontSize: 14,
    fontWeight: '800',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
  },
  status_belum_dibuka: {
    backgroundColor: WARNA.bg,
    borderColor: WARNA.text,
  },
  status_dibuka: {
    backgroundColor: WARNA.highlight,
    borderColor: WARNA.text,
  },
  status_ditutup: {
    backgroundColor: WARNA.primary,
    borderColor: WARNA.primary,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
    backgroundColor: WARNA.text,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '800',
  },
  statusText_belum_dibuka: {
    color: WARNA.text,
  },
  statusText_dibuka: {
    color: WARNA.text,
  },
  statusText_ditutup: {
    color: WARNA.surface,
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
