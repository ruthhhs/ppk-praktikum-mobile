import { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';

type StatusSesi = 'dibuka' | 'ditutup';

type PraktikanHadir = {
  id: string;
  nama: string;
  nim: string;
  waktu: string;
};

const WARNA = {
  bg: '#FFFFFF',
  surface: '#FEFFE0',
  text: '#17454A',
  textMuted: 'rgba(23, 69, 74, 0.7)',
  primary: '#B5185F',
  highlight: '#D0E86E',
  border: 'rgba(23, 69, 74, 0.15)',
  scrim: 'rgba(23, 69, 74, 0.5)',
};

const DATA_SESI = {
  id: 'sesi-01',
  praktikum: 'Basis Data',
  pertemuanKe: 3,
  kelas: 'A',
  tanggal: '2026-10-23',
  status: 'dibuka' as StatusSesi,
  total: 30,
};

const DAFTAR_HADIR: PraktikanHadir[] = [
  { id: 'p-01', nama: 'Siti Aisyah', nim: '2210512001', waktu: '08:03:12' },
  { id: 'p-02', nama: 'Budi Santoso', nim: '2210512002', waktu: '08:05:40' },
  { id: 'p-03', nama: 'Rina Puspita', nim: '2210512003', waktu: '08:07:18' },
  { id: 'p-04', nama: 'Dimas Pratama', nim: '2210512004', waktu: '08:08:51' },
  { id: 'p-05', nama: 'Nadia Putri', nim: '2210512005', waktu: '08:11:06' },
  { id: 'p-06', nama: 'Rafi Maulana', nim: '2210512006', waktu: '08:13:22' },
  { id: 'p-07', nama: 'Ayu Lestari', nim: '2210512007', waktu: '08:14:37' },
  { id: 'p-08', nama: 'Fajar Ramadhan', nim: '2210512008', waktu: '08:16:09' },
  { id: 'p-09', nama: 'Intan Permata', nim: '2210512009', waktu: '08:18:44' },
  { id: 'p-10', nama: 'Rizky Ananda', nim: '2210512010', waktu: '08:21:13' },
  { id: 'p-11', nama: 'Maya Safitri', nim: '2210512011', waktu: '08:24:05' },
  { id: 'p-12', nama: 'Dewi Anggraini', nim: '2210512012', waktu: '08:27:31' },
];

function formatTanggal(tanggal: string) {
  const [tahun, bulan, hari] = tanggal.split('-').map(Number);

  return new Date(tahun, bulan - 1, hari)
    .toLocaleDateString('id-ID', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    })
    .replace('.', '');
}

function StatusBadge({ status }: { status: StatusSesi }) {
  const isOpen = status === 'dibuka';

  return (
    <View style={[styles.statusBadge, isOpen ? styles.statusOpen : styles.statusClosed]}>
      {isOpen && <View style={styles.statusDot} />}
      <Text style={[styles.statusText, !isOpen && styles.statusTextClosed]}>
        {isOpen ? 'Dibuka' : 'Ditutup'}
      </Text>
    </View>
  );
}

function Tombol({
  label,
  variant = 'primary',
  onPress,
}: {
  label: string;
  variant?: 'primary' | 'outline' | 'danger';
  onPress: () => void;
}) {
  const buttonStyle =
    variant === 'outline'
      ? styles.buttonOutline
      : variant === 'danger'
        ? styles.buttonDanger
        : styles.buttonPrimary;

  const textStyle =
    variant === 'outline' || variant === 'danger'
      ? styles.buttonTextDark
      : styles.buttonTextLight;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        buttonStyle,
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.buttonText, textStyle]}>{label}</Text>
    </Pressable>
  );
}

export default function AsistenRekapSesiScreen() {
  const { sesiId } = useLocalSearchParams<{ sesiId?: string }>();
  const activeSessionId = Array.isArray(sesiId) ? sesiId[0] : sesiId;
  const sesi = {
    ...DATA_SESI,
    id: activeSessionId ?? DATA_SESI.id,
  };

  const [status, setStatus] = useState<StatusSesi>(sesi.status);
  const [modalTutupTerbuka, setModalTutupTerbuka] = useState(false);

  const daftarTerurut = useMemo(
    () => [...DAFTAR_HADIR].sort((a, b) => a.waktu.localeCompare(b.waktu)),
    [],
  );

  const jumlahHadir = daftarTerurut.length;
  const persentase =
    sesi.total > 0 ? Math.round((jumlahHadir / sesi.total) * 100) : 0;

  function tutupSesi() {
    setStatus('ditutup');
    setModalTutupTerbuka(false);
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <View style={styles.page}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Kembali"
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
        >
          <Text style={styles.backArrow}>‹</Text>
          <Text style={styles.backLabel}>Kembali</Text>
        </Pressable>

        <View style={styles.heading}>
          <Text style={styles.eyebrow}>PRESENSI PRAKTIKUM</Text>
          <Text style={styles.title}>Rekap Kehadiran</Text>
        </View>

        <View style={styles.sessionHeader}>
          <View style={styles.sessionHeaderText}>
            <Text style={styles.courseName}>{sesi.praktikum}</Text>
            <Text style={styles.sessionMeta}>
              Pertemuan {sesi.pertemuanKe} · Kelas {sesi.kelas} ·{' '}
              {formatTanggal(sesi.tanggal)}
            </Text>
          </View>
          <StatusBadge status={status} />
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.summaryTop}>
            <View>
              <Text style={styles.summaryEyebrow}>TOTAL KEHADIRAN</Text>
              <Text style={styles.summaryCount}>
                {jumlahHadir}
                <Text style={styles.summaryTotal}> / {sesi.total}</Text>
              </Text>
              <Text style={styles.summaryCaption}>praktikan hadir</Text>
            </View>

            <View style={styles.percentCircle}>
              <Text style={styles.percentValue}>{persentase}%</Text>
            </View>
          </View>

          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${persentase}%` as `${number}%` },
              ]}
            />
          </View>
        </View>

        <View style={styles.listHeading}>
          <View>
            <Text style={styles.listTitle}>Daftar praktikan</Text>
            <Text style={styles.listSubtitle}>
              Diurutkan berdasarkan waktu presensi
            </Text>
          </View>
          <Text style={styles.listCount}>
            {jumlahHadir} hadir
          </Text>
        </View>

        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        >
          {daftarTerurut.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Text style={styles.emptyIconText}>—</Text>
              </View>
              <Text style={styles.emptyTitle}>Belum ada yang presensi</Text>
              <Text style={styles.emptyDescription}>
                Praktikan yang hadir akan muncul di daftar ini.
              </Text>
            </View>
          ) : (
            daftarTerurut.map((praktikan, index) => (
              <View key={praktikan.id} style={styles.attendeeRow}>
                <Text style={styles.attendeeNumber}>
                  {String(index + 1).padStart(2, '0')}
                </Text>

                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {praktikan.nama
                      .split(' ')
                      .slice(0, 2)
                      .map((bagian) => bagian[0])
                      .join('')
                      .toUpperCase()}
                  </Text>
                </View>

                <View style={styles.attendeeInfo}>
                  <Text style={styles.attendeeName}>{praktikan.nama}</Text>
                  <Text style={styles.attendeeNim}>{praktikan.nim}</Text>
                </View>

                <View style={styles.timePill}>
                  <Text style={styles.timeText}>{praktikan.waktu}</Text>
                </View>
              </View>
            ))
          )}
        </ScrollView>

        {status === 'dibuka' ? (
          <View style={styles.bottomAction}>
            <Tombol
              label="Tutup Sesi"
              variant="danger"
              onPress={() => setModalTutupTerbuka(true)}
            />
          </View>
        ) : (
          <View style={styles.closedBanner}>
            <View style={styles.closedCheck}>
              <Text style={styles.closedCheckText}>✓</Text>
            </View>
            <Text style={styles.closedText}>Sesi telah ditutup</Text>
          </View>
        )}
      </View>

      <Modal
        visible={modalTutupTerbuka}
        transparent
        animationType="fade"
        onRequestClose={() => setModalTutupTerbuka(false)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Batalkan konfirmasi"
            onPress={() => setModalTutupTerbuka(false)}
            style={StyleSheet.absoluteFill}
          />

          <View style={styles.modalCard}>
            <View style={styles.modalIcon}>
              <Text style={styles.modalIconText}>!</Text>
            </View>
            <Text style={styles.modalTitle}>Tutup sesi?</Text>
            <Text style={styles.modalDescription}>
              Presensi tidak bisa dilakukan lagi setelah sesi ditutup.
            </Text>

            <View style={styles.modalActions}>
              <Tombol
                label="Batal"
                variant="outline"
                onPress={() => setModalTutupTerbuka(false)}
              />
              <Tombol
                label="Tutup Sesi"
                variant="danger"
                onPress={tutupSesi}
              />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: WARNA.bg,
  },
  page: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  backButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingVertical: 8,
    paddingRight: 12,
  },
  backArrow: {
    color: WARNA.primary,
    fontSize: 28,
    lineHeight: 28,
    marginTop: -3,
  },
  backLabel: {
    color: WARNA.text,
    fontSize: 13,
    fontWeight: '700',
  },
  heading: {
    marginTop: 14,
    marginBottom: 16,
  },
  eyebrow: {
    color: WARNA.primary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 5,
  },
  title: {
    color: WARNA.text,
    fontSize: 27,
    lineHeight: 33,
    fontWeight: '800',
    letterSpacing: -0.6,
  },
  sessionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    padding: 15,
    borderWidth: 1,
    borderColor: WARNA.border,
    borderRadius: 17,
    backgroundColor: WARNA.surface,
  },
  sessionHeaderText: {
    flex: 1,
  },
  courseName: {
    color: WARNA.text,
    fontSize: 15,
    fontWeight: '800',
  },
  sessionMeta: {
    color: WARNA.textMuted,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 4,
  },
  statusBadge: {
    minHeight: 27,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderRadius: 99,
  },
  statusOpen: {
    backgroundColor: WARNA.highlight,
    borderColor: WARNA.highlight,
  },
  statusClosed: {
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
    color: WARNA.text,
    fontSize: 10,
    fontWeight: '700',
  },
  statusTextClosed: {
    color: WARNA.surface,
  },
  summaryCard: {
    marginTop: 14,
    padding: 18,
    borderRadius: 20,
    backgroundColor: WARNA.text,
  },
  summaryTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  summaryEyebrow: {
    color: 'rgba(254, 255, 224, 0.75)',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.9,
  },
  summaryCount: {
    color: WARNA.surface,
    fontSize: 31,
    lineHeight: 37,
    fontWeight: '800',
    marginTop: 5,
  },
  summaryTotal: {
    color: 'rgba(254, 255, 224, 0.72)',
    fontSize: 18,
    fontWeight: '600',
  },
  summaryCaption: {
    color: 'rgba(254, 255, 224, 0.75)',
    fontSize: 11,
    marginTop: 1,
  },
  percentCircle: {
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: WARNA.highlight,
    borderRadius: 30,
  },
  percentValue: {
    color: WARNA.highlight,
    fontSize: 14,
    fontWeight: '800',
  },
  progressTrack: {
    height: 7,
    overflow: 'hidden',
    borderRadius: 99,
    backgroundColor: 'rgba(254, 255, 224, 0.2)',
  },
  progressFill: {
    height: '100%',
    borderRadius: 99,
    backgroundColor: WARNA.highlight,
  },
  listHeading: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 22,
    marginBottom: 11,
  },
  listTitle: {
    color: WARNA.text,
    fontSize: 16,
    fontWeight: '800',
  },
  listSubtitle: {
    color: WARNA.textMuted,
    fontSize: 10,
    marginTop: 3,
  },
  listCount: {
    color: WARNA.primary,
    fontSize: 11,
    fontWeight: '800',
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 12,
  },
  attendeeRow: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 11,
    paddingVertical: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: WARNA.border,
    borderRadius: 15,
    backgroundColor: WARNA.bg,
  },
  attendeeNumber: {
    width: 21,
    color: WARNA.textMuted,
    fontSize: 10,
    fontWeight: '700',
  },
  avatar: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: WARNA.highlight,
  },
  avatarText: {
    color: WARNA.text,
    fontSize: 10,
    fontWeight: '800',
  },
  attendeeInfo: {
    flex: 1,
    minWidth: 0,
  },
  attendeeName: {
    color: WARNA.text,
    fontSize: 12,
    fontWeight: '700',
  },
  attendeeNim: {
    color: WARNA.textMuted,
    fontSize: 10,
    marginTop: 3,
  },
  timePill: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 9,
    backgroundColor: WARNA.surface,
  },
  timeText: {
    color: WARNA.text,
    fontSize: 10,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  emptyState: {
    alignItems: 'center',
    padding: 28,
    borderWidth: 1,
    borderColor: WARNA.border,
    borderRadius: 18,
    backgroundColor: WARNA.surface,
  },
  emptyIcon: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 21,
    backgroundColor: WARNA.highlight,
    marginBottom: 10,
  },
  emptyIconText: {
    color: WARNA.text,
    fontSize: 20,
    fontWeight: '700',
  },
  emptyTitle: {
    color: WARNA.text,
    fontSize: 13,
    fontWeight: '800',
  },
  emptyDescription: {
    color: WARNA.textMuted,
    fontSize: 11,
    textAlign: 'center',
    marginTop: 4,
  },
  bottomAction: {
    paddingTop: 10,
    paddingBottom: 12,
    backgroundColor: WARNA.bg,
  },
  closedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 13,
    marginTop: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: WARNA.border,
    borderRadius: 14,
    backgroundColor: WARNA.surface,
  },
  closedCheck: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: WARNA.highlight,
  },
  closedCheckText: {
    color: WARNA.text,
    fontSize: 14,
    fontWeight: '800',
  },
  closedText: {
    color: WARNA.text,
    fontSize: 12,
    fontWeight: '700',
  },
  button: {
    minHeight: 48,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 13,
  },
  buttonPrimary: {
    borderColor: WARNA.primary,
    backgroundColor: WARNA.primary,
  },
  buttonOutline: {
    borderColor: WARNA.border,
    backgroundColor: WARNA.bg,
  },
  buttonDanger: {
    borderColor: WARNA.primary,
    backgroundColor: WARNA.bg,
  },
  buttonText: {
    fontSize: 12,
    fontWeight: '800',
  },
  buttonTextLight: {
    color: WARNA.surface,
  },
  buttonTextDark: {
    color: WARNA.primary,
  },
  pressed: {
    opacity: 0.75,
  },
  modalBackdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 22,
    backgroundColor: WARNA.scrim,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    padding: 20,
    borderWidth: 1,
    borderColor: WARNA.border,
    borderRadius: 22,
    backgroundColor: WARNA.surface,
  },
  modalIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: 'rgba(181, 24, 95, 0.1)',
    marginBottom: 13,
  },
  modalIconText: {
    color: WARNA.primary,
    fontSize: 18,
    fontWeight: '800',
  },
  modalTitle: {
    color: WARNA.text,
    fontSize: 18,
    fontWeight: '800',
  },
  modalDescription: {
    color: WARNA.textMuted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 19,
  },
});