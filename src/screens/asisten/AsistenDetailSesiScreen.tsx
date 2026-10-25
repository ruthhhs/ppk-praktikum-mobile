import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useApp } from '../../hooks/useApp';
import { globalStyles, WARNA } from '../../styles/global';

type StatusSesi = 'belum_dibuka' | 'dibuka' | 'ditutup';
type TindakanKonfirmasi = 'buka' | 'tutup' | null;

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
  kodePresensi?: string;
  catatan?: string;
};

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
    kodePresensi: '4827',
    catatan: 'Normalisasi basis data',
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

function ambilSesiAwal(id?: string | string[]) {
  const sesiId = Array.isArray(id) ? id[0] : id;
  return SESI_CONTOH.find((sesi) => sesi.id === sesiId) ?? SESI_CONTOH[0];
}

function ubahKeIdSesiApp(id: string) {
  const nomor = id.match(/^sesi-(\d+)$/)?.[1];
  return nomor ? `sesi-${nomor.padStart(3, '0')}` : id;
}

function formatTanggal(tanggal: string) {
  const [tahun, bulan, hari] = tanggal.split('-').map(Number);

  return new Date(tahun, bulan - 1, hari)
    .toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
    .replace('.', '');
}

function StatusBadge({ status }: { status: StatusSesi }) {
  const label = {
    belum_dibuka: 'Belum dibuka',
    dibuka: 'Dibuka',
    ditutup: 'Ditutup',
  }[status];

  const badgeStyle =
    status === 'dibuka'
      ? styles.badgeDibuka
      : status === 'ditutup'
        ? styles.badgeDitutup
        : styles.badgeBelumDibuka;

  const textStyle =
    status === 'ditutup' ? styles.badgeTextDitutup : styles.badgeText;

  return (
    <View style={[styles.badge, badgeStyle]}>
      {status === 'dibuka' && <View style={styles.badgeDot} />}
      <Text style={[styles.badgeTextBase, textStyle]}>{label}</Text>
    </View>
  );
}

function InfoBaris({ label, nilai }: { label: string; nilai: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{nilai}</Text>
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
      ? globalStyles.buttonOutline
      : variant === 'danger'
        ? globalStyles.buttonDanger
        : globalStyles.buttonPrimary;

  const textStyle =
    variant === 'danger'
      ? globalStyles.buttonTextDanger
      : variant === 'outline'
        ? globalStyles.buttonTextOutline
        : globalStyles.buttonTextPrimary;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        globalStyles.button,
        buttonStyle,
        pressed && globalStyles.buttonPressed,
      ]}
    >
      <Text style={[globalStyles.buttonText, textStyle]}>{label}</Text>
    </Pressable>
  );
}

export default function AsistenDetailSesiScreen() {
  const { sesiId } = useLocalSearchParams<{ sesiId?: string }>();
  const { sesi: daftarSesiApp, bukaSesi, tutupSesi } = useApp();

  const [sesi, setSesi] = useState<Sesi>(() => ambilSesiAwal(sesiId));
  const [formTerbuka, setFormTerbuka] = useState(false);
  const [konfirmasi, setKonfirmasi] = useState<TindakanKonfirmasi>(null);
  const [kodePresensi, setKodePresensi] = useState('');
  const [catatan, setCatatan] = useState('');
  const [errorKode, setErrorKode] = useState('');

  useEffect(() => {
  const sesiBaru = ambilSesiAwal(sesiId);
  setSesi(sesiBaru);
  setCatatan(sesiBaru.catatan ?? '');
  setKodePresensi('');
  setErrorKode('');
  setFormTerbuka(false);
  setKonfirmasi(null);
}, [sesiId]);

  const persentase =
    sesi.total > 0 ? Math.round((sesi.hadir / sesi.total) * 100) : 0;

  function bukaForm() {
    setKodePresensi('');
    setCatatan('');
    setErrorKode('');
    setFormTerbuka(true);
  }

  function lanjutKonfirmasiBuka() {
    if (!/^\d{4}$/.test(kodePresensi)) {
      setErrorKode('Kode presensi harus terdiri dari 4 angka.');
      return;
    }

    setErrorKode('');
    setFormTerbuka(false);
    setKonfirmasi('buka');
  }

  function jalankanKonfirmasi() {
    if (konfirmasi === 'buka') {
      const idSesiApp = ubahKeIdSesiApp(sesi.id);
      const sesiApp = daftarSesiApp.find((item) => item.id === idSesiApp);

      if (!sesiApp) {
        setKonfirmasi(null);
        setFormTerbuka(true);
        setErrorKode('Data sesi tidak ditemukan.');
        return;
      }

      if (sesiApp.status !== 'belum_dibuka') {
        setKonfirmasi(null);
        setFormTerbuka(true);
        setErrorKode('Sesi ini tidak dapat dibuka dengan status saat ini.');
        return;
      }

      bukaSesi(sesiApp.id, kodePresensi.trim());

      setSesi((sesiSaatIni) => ({
        ...sesiSaatIni,
        status: 'dibuka',
        kodePresensi: kodePresensi.trim(),
        catatan: catatan.trim(),
      }));
    }

    if (konfirmasi === 'tutup') {
  const idSesiApp = ubahKeIdSesiApp(sesi.id);
  const sesiApp = daftarSesiApp.find((item) => item.id === idSesiApp);

  if (!sesiApp || sesiApp.status !== 'dibuka') {
    setKonfirmasi(null);
    return;
  }

  tutupSesi(sesiApp.id);

  setSesi((sesiSaatIni) => ({
    ...sesiSaatIni,
    status: 'ditutup',
  }));
}

    setKonfirmasi(null);
  }

  function bukaRekap() {
    router.push({
      pathname: '/asisten/rekap-sesi',
      params: { sesiId: sesi.id },
    });
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.page}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Kembali"
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.backButton,
            pressed && globalStyles.buttonPressed,
          ]}
        >
          <Text style={styles.backArrow}>‹</Text>
          <Text style={styles.backLabel}>Kembali</Text>
        </Pressable>

        <View style={styles.heading}>
          <Text style={styles.eyebrow}>PENGELOLAAN SESI</Text>
          <Text style={styles.title}>Detail Sesi</Text>
          <Text style={styles.subtitle}>
            Informasi dan kehadiran praktikum.
          </Text>
        </View>

        <View style={styles.sessionCard}>
          <View style={styles.sessionCardTop}>
            <Text style={styles.courseKicker}>PRAKTIKUM</Text>
            <StatusBadge status={sesi.status} />
          </View>

          <Text style={styles.courseName}>{sesi.praktikum}</Text>
          <Text style={styles.meetingInfo}>
            Pertemuan {sesi.pertemuanKe}
            <Text style={styles.separator}>  ·  </Text>
            Kelas {sesi.kelas}
          </Text>

          <View style={styles.divider} />

          <InfoBaris label="LOKASI" nilai={sesi.lab} />
          <InfoBaris label="TANGGAL" nilai={formatTanggal(sesi.tanggal)} />
          <InfoBaris
            label="WAKTU"
            nilai={`${sesi.jamMulai}–${sesi.jamSelesai}`}
          />

          {!!sesi.catatan && (
            <View style={styles.topicBox}>
              <Text style={styles.topicLabel}>TOPIK PERTEMUAN</Text>
              <Text style={styles.topicValue}>{sesi.catatan}</Text>
            </View>
          )}
        </View>

        {sesi.status === 'dibuka' && !!sesi.kodePresensi && (
          <View style={styles.codeCard}>
            <View style={styles.codeCardHeading}>
              <View>
                <Text style={styles.codeTitle}>Kode presensi</Text>
                <Text style={styles.codeHint}>
                  Bagikan kode ini kepada praktikan.
                </Text>
              </View>
              <View style={styles.codeLiveMark}>
                <View style={styles.codeLiveDot} />
                <Text style={styles.codeLiveText}>AKTIF</Text>
              </View>
            </View>

            <View style={styles.codeDigits}>
              {sesi.kodePresensi.split('').map((digit, index) => (
                <View key={`${digit}-${index}`} style={styles.codeDigit}>
                  <Text style={styles.codeDigitText}>{digit}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={styles.attendanceCard}>
          <View style={styles.attendanceTop}>
            <View>
              <Text style={styles.attendanceLabel}>Kehadiran</Text>
              <Text style={styles.attendanceCount}>
                {sesi.hadir}
                <Text style={styles.attendanceTotal}>
                  {' '}
                  dari {sesi.total} praktikan
                </Text>
              </Text>
            </View>
            <Text style={styles.attendancePercent}>{persentase}%</Text>
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

        {sesi.status === 'belum_dibuka' && (
          <View style={styles.actions}>
            <Tombol label="Buka Sesi" onPress={bukaForm} />
          </View>
        )}

        {sesi.status === 'dibuka' && (
          <View style={styles.actions}>
            <Tombol label="Lihat Rekap" onPress={bukaRekap} />
            <Tombol
              label="Tutup Sesi"
              variant="danger"
              onPress={() => setKonfirmasi('tutup')}
            />
          </View>
        )}

        {sesi.status === 'ditutup' && (
          <>
            <View style={styles.closedNotice}>
              <View style={styles.closedMark}>
                <Text style={styles.closedMarkText}>✓</Text>
              </View>
              <View style={styles.closedCopy}>
                <Text style={styles.closedTitle}>Sesi telah ditutup</Text>
                <Text style={styles.closedDescription}>
                  Praktikan tidak dapat melakukan presensi lagi.
                </Text>
              </View>
            </View>
            <View style={styles.actions}>
              <Tombol label="Lihat Rekap" onPress={bukaRekap} />
            </View>
          </>
        )}
      </ScrollView>

      <Modal
        visible={formTerbuka}
        transparent
        animationType="slide"
        onRequestClose={() => setFormTerbuka(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalBackdrop}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Tutup form"
            onPress={() => setFormTerbuka(false)}
            style={StyleSheet.absoluteFill}
          />

          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetEyebrow}>MULAI PERTEMUAN</Text>
            <Text style={styles.sheetTitle}>Buka sesi praktikum</Text>
            <Text style={styles.sheetDescription}>
              Buat kode presensi 4 digit dan tambahkan topik bila diperlukan.
            </Text>

            <Text style={styles.inputLabel}>Kode presensi</Text>
            <TextInput
              value={kodePresensi}
              onChangeText={(value) => {
                setKodePresensi(value.replace(/\D/g, '').slice(0, 4));
                if (errorKode) setErrorKode('');
              }}
              keyboardType="number-pad"
              maxLength={4}
              placeholder="Contoh: 4827"
              placeholderTextColor={WARNA.textMuted}
              style={[styles.textInput, !!errorKode && styles.textInputError]}
              accessibilityLabel="Kode presensi empat digit"
            />
            {!!errorKode && <Text style={styles.errorText}>{errorKode}</Text>}

            <Text style={[styles.inputLabel, styles.topicInputLabel]}>
              Topik atau catatan
              <Text style={styles.optionalLabel}> · Opsional</Text>
            </Text>
            <TextInput
              value={catatan}
              onChangeText={setCatatan}
              placeholder="Contoh: Normalisasi basis data"
              placeholderTextColor={WARNA.textMuted}
              style={[styles.textInput, styles.topicInput]}
              multiline
              maxLength={120}
              textAlignVertical="top"
              accessibilityLabel="Topik atau catatan pertemuan"
            />

            <View style={styles.sheetActions}>
              <Tombol
                label="Batal"
                variant="outline"
                onPress={() => setFormTerbuka(false)}
              />
              <Tombol label="Lanjutkan" onPress={lanjutKonfirmasiBuka} />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={konfirmasi !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setKonfirmasi(null)}
      >
        <View style={styles.confirmBackdrop}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Batalkan konfirmasi"
            onPress={() => setKonfirmasi(null)}
            style={StyleSheet.absoluteFill}
          />

          <View style={styles.confirmCard}>
            <View
              style={[
                styles.confirmIcon,
                konfirmasi === 'tutup' && styles.confirmIconDanger,
              ]}
            >
              <Text
                style={[
                  styles.confirmIconText,
                  konfirmasi === 'tutup' && styles.confirmIconTextDanger,
                ]}
              >
                {konfirmasi === 'buka' ? '↗' : '×'}
              </Text>
            </View>

            <Text style={styles.confirmTitle}>
              {konfirmasi === 'buka' ? 'Buka sesi sekarang?' : 'Tutup sesi?'}
            </Text>
            <Text style={styles.confirmDescription}>
              {konfirmasi === 'buka'
                ? 'Praktikan dapat melakukan presensi menggunakan kode yang kamu buat.'
                : 'Presensi tidak bisa dilakukan lagi setelah sesi ditutup.'}
            </Text>

            <View style={styles.confirmActions}>
              <Tombol
                label="Batal"
                variant="outline"
                onPress={() => setKonfirmasi(null)}
              />
              <Tombol
                label={konfirmasi === 'buka' ? 'Buka Sesi' : 'Tutup Sesi'}
                variant={konfirmasi === 'tutup' ? 'danger' : 'primary'}
                onPress={jalankanKonfirmasi}
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
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 28,
  },
  backButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingVertical: 8,
    paddingRight: 12,
    marginBottom: 16,
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
    marginBottom: 20,
  },
  eyebrow: {
    color: WARNA.primary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.1,
    marginBottom: 5,
  },
  title: {
    color: WARNA.text,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
    letterSpacing: -0.7,
  },
  subtitle: {
    color: WARNA.textMuted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
  },
  sessionCard: {
    padding: 17,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: WARNA.border,
    backgroundColor: WARNA.surface,
  },
  sessionCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 12,
  },
  courseKicker: {
    color: WARNA.textMuted,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
  },
  badge: {
    minHeight: 27,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderRadius: 99,
  },
  badgeDibuka: {
    backgroundColor: WARNA.highlight,
    borderColor: WARNA.highlight,
  },
  badgeBelumDibuka: {
    backgroundColor: WARNA.bg,
    borderColor: WARNA.textMuted,
  },
  badgeDitutup: {
    backgroundColor: WARNA.primary,
    borderColor: WARNA.primary,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: WARNA.text,
  },
  badgeTextBase: {
    fontSize: 10,
    fontWeight: '700',
  },
  badgeText: {
    color: WARNA.text,
  },
  badgeTextDitutup: {
    color: WARNA.surface,
  },
  courseName: {
    color: WARNA.text,
    fontSize: 21,
    lineHeight: 27,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  meetingInfo: {
    color: WARNA.textMuted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 3,
  },
  separator: {
    color: WARNA.accent,
    fontWeight: '900',
  },
  divider: {
    height: 1,
    backgroundColor: WARNA.border,
    marginVertical: 15,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  infoLabel: {
    width: 68,
    color: WARNA.textMuted,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
    paddingTop: 2,
  },
  infoValue: {
    flex: 1,
    color: WARNA.text,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
    textAlign: 'right',
  },
  topicBox: {
    marginTop: 2,
    padding: 12,
    borderRadius: 13,
    backgroundColor: WARNA.bg,
  },
  topicLabel: {
    color: WARNA.textMuted,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.7,
    marginBottom: 4,
  },
  topicValue: {
    color: WARNA.text,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
  },
  codeCard: {
    marginTop: 14,
    padding: 17,
    borderRadius: 20,
    backgroundColor: WARNA.text,
  },
  codeCardHeading: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  codeTitle: {
    color: WARNA.surface,
    fontSize: 15,
    fontWeight: '800',
  },
  codeHint: {
    color: 'rgba(254, 255, 224, 0.72)',
    fontSize: 11,
    lineHeight: 16,
    marginTop: 3,
  },
  codeLiveMark: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 99,
    backgroundColor: 'rgba(208, 232, 110, 0.18)',
  },
  codeLiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: WARNA.highlight,
  },
  codeLiveText: {
    color: WARNA.highlight,
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  codeDigits: {
    flexDirection: 'row',
    gap: 9,
    marginTop: 18,
  },
  codeDigit: {
    width: 47,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    backgroundColor: WARNA.surface,
  },
  codeDigitText: {
    color: WARNA.text,
    fontSize: 24,
    fontWeight: '800',
  },
  attendanceCard: {
    marginTop: 14,
    padding: 17,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: WARNA.border,
    backgroundColor: WARNA.bg,
  },
  attendanceTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  attendanceLabel: {
    color: WARNA.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  attendanceCount: {
    color: WARNA.text,
    fontSize: 18,
    fontWeight: '800',
    marginTop: 3,
  },
  attendanceTotal: {
    color: WARNA.textMuted,
    fontSize: 11,
    fontWeight: '500',
  },
  attendancePercent: {
    color: WARNA.primary,
    fontSize: 18,
    fontWeight: '800',
  },
  progressTrack: {
    height: 7,
    overflow: 'hidden',
    borderRadius: 99,
    backgroundColor: WARNA.border,
  },
  progressFill: {
    height: '100%',
    borderRadius: 99,
    backgroundColor: WARNA.primary,
  },
  actions: {
    gap: 10,
    marginTop: 18,
  },
  closedNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: WARNA.border,
    borderRadius: 16,
    backgroundColor: WARNA.surface,
  },
  closedMark: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
    backgroundColor: WARNA.highlight,
  },
  closedMarkText: {
    color: WARNA.text,
    fontSize: 17,
    fontWeight: '800',
  },
  closedCopy: {
    flex: 1,
  },
  closedTitle: {
    color: WARNA.text,
    fontSize: 12,
    fontWeight: '800',
  },
  closedDescription: {
    color: WARNA.textMuted,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 2,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: WARNA.scrim,
  },
  sheet: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 28,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: WARNA.surface,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 38,
    height: 4,
    borderRadius: 99,
    backgroundColor: WARNA.border,
    marginBottom: 19,
  },
  sheetEyebrow: {
    color: WARNA.primary,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
  },
  sheetTitle: {
    color: WARNA.text,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '800',
    marginTop: 5,
  },
  sheetDescription: {
    color: WARNA.textMuted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 5,
    marginBottom: 18,
  },
  inputLabel: {
    color: WARNA.text,
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 7,
  },
  optionalLabel: {
    color: WARNA.textMuted,
    fontWeight: '500',
  },
  textInput: {
    minHeight: 48,
    paddingHorizontal: 13,
    borderWidth: 1,
    borderColor: WARNA.border,
    borderRadius: 12,
    backgroundColor: WARNA.bg,
    color: WARNA.text,
    fontSize: 14,
  },
  textInputError: {
    borderColor: WARNA.primary,
  },
  errorText: {
    color: WARNA.primary,
    fontSize: 11,
    marginTop: 5,
  },
  topicInputLabel: {
    marginTop: 16,
  },
  topicInput: {
    minHeight: 78,
    paddingTop: 11,
  },
  sheetActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  confirmBackdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 22,
    backgroundColor: WARNA.scrim,
  },
  confirmCard: {
    width: '100%',
    maxWidth: 380,
    padding: 20,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: WARNA.border,
    backgroundColor: WARNA.surface,
  },
  confirmIcon: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 21,
    backgroundColor: WARNA.highlight,
    marginBottom: 14,
  },
  confirmIconDanger: {
    backgroundColor: 'rgba(181, 24, 95, 0.1)',
  },
  confirmIconText: {
    color: WARNA.text,
    fontSize: 19,
    fontWeight: '800',
  },
  confirmIconTextDanger: {
    color: WARNA.primary,
  },
  confirmTitle: {
    color: WARNA.text,
    fontSize: 19,
    lineHeight: 25,
    fontWeight: '800',
  },
  confirmDescription: {
    color: WARNA.textMuted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
  },
  confirmActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
});