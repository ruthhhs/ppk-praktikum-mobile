import { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';

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
    catatan: 'Layout responsif dengan Flexbox',
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
    catatan: 'Pengalamatan IPv4 dan subnetting',
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

const PRESENSI_AWAL: Presensi[] = [
  {
    id: 'presensi-01',
    sesiId: 'sesi-04',
    userId: 'praktikan-01',
    waktu: '2026-10-20T08:03:12+07:00',
  },
];

const LABEL_STATUS: Record<SesiStatus, string> = {
  belum_dibuka: 'Belum dibuka',
  dibuka: 'Dibuka',
  ditutup: 'Ditutup',
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

function StatusBadge({ status }: { status: SesiStatus }) {
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

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

export default function SesiDetailPraktikanScreen() {
  const params = useLocalSearchParams<{ sesiId?: string | string[] }>();
  const paramSesiId = Array.isArray(params.sesiId)
    ? params.sesiId[0]
    : params.sesiId;

  const [selectedSesiId, setSelectedSesiId] = useState<string>(
    paramSesiId ?? 'sesi-01'
  );
  const [daftarPresensi, setDaftarPresensi] =
    useState<Presensi[]>(PRESENSI_AWAL);

  const sesiAktif = useMemo(() => {
    const targetId = paramSesiId ?? selectedSesiId;
    return SESI_CONTOH.find((item) => item.id === targetId) ?? null;
  }, [paramSesiId, selectedSesiId]);

  const presensiSaya = useMemo(() => {
    if (!sesiAktif) {
      return undefined;
    }
    return daftarPresensi.find(
      (item) =>
        item.sesiId === sesiAktif.id && item.userId === PRAKTIKAN_AKTIF.id
    );
  }, [daftarPresensi, sesiAktif]);

  const kembaliKeJadwal = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/praktikan/jadwal');
    }
  };

  // Pada C2, tombol Presensi Sekarang langsung mencatat kehadiran untuk menguji
  // perubahan state "Dibuka, belum presensi" -> "Dibuka, sudah presensi".
  // Pada C3 & C4, aksi ini akan membuka Form Presensi (kode 4 digit) dan Modal Sukses/Info.
  const handlePresensiSekarang = () => {
    if (!sesiAktif || sesiAktif.status !== 'dibuka' || presensiSaya) {
      return;
    }

    const catatanBaru: Presensi = {
      id: `presensi-${Date.now()}`,
      sesiId: sesiAktif.id,
      userId: PRAKTIKAN_AKTIF.id,
      waktu: new Date().toISOString(),
    };

    setDaftarPresensi((prev) => [...prev, catatanBaru]);
  };

  if (!sesiAktif) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.headerRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Kembali ke jadwal"
            onPress={kembaliKeJadwal}
            style={({ pressed }) => [
              styles.backButton,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.backButtonText}>{'<-'} Kembali</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Detail Sesi</Text>
        </View>

        <View style={styles.emptyContainer}>
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Sesi tidak ditemukan</Text>
            <Text style={styles.emptyBody}>
              Data sesi praktikum yang kamu pilih tidak tersedia.
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={kembaliKeJadwal}
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.primaryButtonText}>Kembali ke Jadwal</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const namaPraktikum = ambilNamaPraktikum(sesiAktif.praktikumId);
  const sudahPresensi = Boolean(presensiSaya);
  const jamHadir = presensiSaya ? formatJamPresensi(presensiSaya.waktu) : '';

  const teksBanner =
    sesiAktif.status === 'belum_dibuka'
      ? 'Sesi belum dibuka'
      : sesiAktif.status === 'dibuka' && !sudahPresensi
        ? 'Sesi dibuka, silakan presensi.'
        : sesiAktif.status === 'dibuka' && sudahPresensi
          ? `Kamu sudah presensi pukul ${jamHadir}`
          : 'Sesi telah ditutup';

  const subTeksBanner =
    sesiAktif.status === 'belum_dibuka'
      ? 'Tombol presensi akan aktif setelah asisten membuka sesi praktikum ini.'
      : sesiAktif.status === 'dibuka' && !sudahPresensi
        ? 'Pastikan kamu berada di ruang praktikum dan siap memasukkan kode presensi dari asisten.'
        : sesiAktif.status === 'dibuka' && sudahPresensi
          ? `Kehadiran atas nama ${PRAKTIKAN_AKTIF.nama} (${PRAKTIKAN_AKTIF.nim}) telah tercatat.`
          : sudahPresensi
            ? `Kamu tercatat hadir pada sesi ini pukul ${jamHadir}.`
            : 'Batas waktu presensi untuk pertemuan ini telah berakhir.';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.headerRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Kembali ke jadwal"
          onPress={kembaliKeJadwal}
          style={({ pressed }) => [
            styles.backButton,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.backButtonText}>{'<-'} Kembali</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Detail Sesi</Text>
      </View>

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {!paramSesiId && (
          <View style={styles.previewSwitcherCard}>
            <Text style={styles.previewSwitcherLabel}>
              Pilih Sesi (Pratinjau Kondisi)
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.previewChipRow}
            >
              {SESI_CONTOH.map((item) => {
                const aktif = item.id === sesiAktif.id;
                return (
                  <Pressable
                    key={item.id}
                    accessibilityRole="button"
                    accessibilityState={{ selected: aktif }}
                    onPress={() => setSelectedSesiId(item.id)}
                    style={({ pressed }) => [
                      styles.previewChip,
                      aktif && styles.previewChipActive,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text
                      style={[
                        styles.previewChipText,
                        aktif && styles.previewChipTextActive,
                      ]}
                    >
                      {ambilNamaPraktikum(item.praktikumId)} P{item.pertemuanKe}{' '}
                      ({LABEL_STATUS[item.status]})
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        )}

        <View style={styles.sessionInfoCard}>
          <View style={styles.cardTopRow}>
            <View style={styles.titleColumn}>
              <Text style={styles.courseTitle}>{namaPraktikum}</Text>
              <Text style={styles.courseSubTitle}>
                Pertemuan {sesiAktif.pertemuanKe} · Kelas {sesiAktif.kelas}
              </Text>
            </View>
            <StatusBadge status={sesiAktif.status} />
          </View>

          <View style={styles.divider} />

          <View style={styles.infoList}>
            <InfoRow label="Ruang Lab" value={sesiAktif.lab} />
            <InfoRow
              label="Tanggal"
              value={formatTanggal(sesiAktif.tanggal)}
            />
            <InfoRow
              label="Waktu"
              value={formatRentangJam(
                sesiAktif.jamMulai,
                sesiAktif.jamSelesai
              )}
            />
            {sesiAktif.catatan ? (
              <InfoRow label="Topik Pertemuan" value={sesiAktif.catatan} />
            ) : null}
          </View>

          {sudahPresensi && (
            <View style={styles.attendedIndicatorBox}>
              <View style={styles.attendedBadgeCircle}>
                <Text style={styles.attendedBadgeCheck}>✓</Text>
              </View>
              <View style={styles.attendedTextColumn}>
                <Text style={styles.attendedIndicatorTitle}>
                  Sudah presensi
                </Text>
                <Text style={styles.attendedIndicatorSub}>
                  Tercatat hadir pukul {jamHadir} WIB
                </Text>
              </View>
            </View>
          )}
        </View>

        <View
          style={[
            styles.statusBanner,
            sesiAktif.status === 'dibuka' &&
              !sudahPresensi &&
              styles.statusBannerOpen,
            sudahPresensi && styles.statusBannerAttended,
            sesiAktif.status === 'ditutup' && styles.statusBannerClosed,
          ]}
        >
          <View style={styles.bannerHeaderRow}>
            <View
              style={[
                styles.bannerDot,
                sesiAktif.status === 'dibuka' && styles.bannerDotOpen,
                sesiAktif.status === 'ditutup' && styles.bannerDotClosed,
              ]}
            />
            <Text style={styles.bannerTitle}>{teksBanner}</Text>
          </View>
          <Text style={styles.bannerSubTitle}>{subTeksBanner}</Text>
        </View>
      </ScrollView>

      {sesiAktif.status !== 'ditutup' && (
        <View style={styles.bottomActionBar}>
          {sesiAktif.status === 'belum_dibuka' && (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: true }}
              disabled={true}
              style={[styles.primaryButton, styles.disabledButton]}
            >
              <Text
                style={[styles.primaryButtonText, styles.disabledButtonText]}
              >
                Presensi
              </Text>
            </Pressable>
          )}

          {sesiAktif.status === 'dibuka' && !sudahPresensi && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Presensi Sekarang"
              onPress={handlePresensiSekarang}
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.primaryButtonText}>Presensi Sekarang</Text>
            </Pressable>
          )}

          {sesiAktif.status === 'dibuka' && sudahPresensi && (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: true }}
              disabled={true}
              style={[styles.primaryButton, styles.disabledButton]}
            >
              <Text
                style={[styles.primaryButtonText, styles.disabledButtonText]}
              >
                Sudah presensi
              </Text>
            </Pressable>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: WARNA.bg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: WARNA.border,
    backgroundColor: WARNA.bg,
  },
  backButton: {
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: WARNA.surface,
    borderWidth: 1,
    borderColor: WARNA.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    color: WARNA.text,
    fontSize: 14,
    fontWeight: '700',
  },
  headerTitle: {
    color: WARNA.text,
    fontSize: 20,
    fontWeight: '800',
    flex: 1,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 24,
    gap: 16,
  },
  previewSwitcherCard: {
    backgroundColor: WARNA.surface,
    borderColor: WARNA.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    gap: 8,
  },
  previewSwitcherLabel: {
    color: WARNA.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  previewChipRow: {
    gap: 8,
  },
  previewChip: {
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: WARNA.bg,
    borderWidth: 1,
    borderColor: WARNA.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewChipActive: {
    backgroundColor: WARNA.highlight,
    borderColor: WARNA.text,
  },
  previewChipText: {
    color: WARNA.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  previewChipTextActive: {
    color: WARNA.text,
  },
  sessionInfoCard: {
    backgroundColor: WARNA.surface,
    borderColor: WARNA.border,
    borderWidth: 1,
    borderRadius: 20,
    padding: 18,
    gap: 14,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  titleColumn: {
    flex: 1,
    gap: 4,
  },
  courseTitle: {
    color: WARNA.text,
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 28,
  },
  courseSubTitle: {
    color: WARNA.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: WARNA.border,
  },
  infoList: {
    gap: 10,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
  },
  infoLabel: {
    color: WARNA.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  infoValue: {
    color: WARNA.text,
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
    textAlign: 'right',
  },
  attendedIndicatorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: WARNA.highlight,
    borderColor: WARNA.text,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginTop: 2,
  },
  attendedBadgeCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: WARNA.bg,
    borderColor: WARNA.text,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attendedBadgeCheck: {
    color: WARNA.text,
    fontSize: 16,
    fontWeight: '900',
  },
  attendedTextColumn: {
    flex: 1,
    gap: 2,
  },
  attendedIndicatorTitle: {
    color: WARNA.text,
    fontSize: 14,
    fontWeight: '800',
  },
  attendedIndicatorSub: {
    color: WARNA.text,
    fontSize: 13,
    fontWeight: '600',
  },
  statusBanner: {
    backgroundColor: WARNA.surface,
    borderColor: WARNA.border,
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    gap: 6,
  },
  statusBannerOpen: {
    borderColor: WARNA.text,
    borderWidth: 1.5,
  },
  statusBannerAttended: {
    backgroundColor: WARNA.highlight,
    borderColor: WARNA.text,
  },
  statusBannerClosed: {
    borderColor: WARNA.primary,
  },
  bannerHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bannerDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: WARNA.text,
  },
  bannerDotOpen: {
    backgroundColor: WARNA.primary,
  },
  bannerDotClosed: {
    backgroundColor: WARNA.primary,
  },
  bannerTitle: {
    color: WARNA.text,
    fontSize: 16,
    fontWeight: '800',
    flex: 1,
  },
  bannerSubTitle: {
    color: WARNA.textMuted,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  bottomActionBar: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: WARNA.border,
    backgroundColor: WARNA.bg,
  },
  primaryButton: {
    minHeight: 50,
    borderRadius: 16,
    backgroundColor: WARNA.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  primaryButtonText: {
    color: WARNA.surface,
    fontSize: 16,
    fontWeight: '800',
  },
  disabledButton: {
    backgroundColor: WARNA.border,
  },
  disabledButtonText: {
    color: WARNA.textMuted,
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
  emptyContainer: {
    flex: 1,
    padding: 18,
    justifyContent: 'center',
  },
  emptyCard: {
    backgroundColor: WARNA.surface,
    borderColor: WARNA.border,
    borderWidth: 1,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    gap: 12,
  },
  emptyTitle: {
    color: WARNA.text,
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  emptyBody: {
    color: WARNA.textMuted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.85,
  },
});
