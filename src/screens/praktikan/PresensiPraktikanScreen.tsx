import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { colors } from '@/constants/theme';
import {
  LABORATORIUM_TETAP,
  type LaboratoriumDenganId,
  type LaboratoriumDoc,
} from '@/data/lokasi';
import { useLokasi } from '@/hooks/useLokasi';
import {
  firestoreRefs,
  listenDocument,
} from '@/services/firebase/firestore';
import {
  isFirebaseConfigured,
  isNativeFirebaseConfigured,
} from '@/services/firebase';
import { hitungJarakMeter } from '@/utils/hitungJarakMeter';
import {
  BATAS_AKURASI_PRESENSI_METER,
  kirimPresensi,
} from '@/services/presensi';
import StatusBadge from '@/components/ui/StatusBadge';
import {
  PresensiInfoModal,
  PresensiSuccessModal,
  type AlasanPenolakanPresensi,
  type DataSuksesPresensi,
} from '@/components/praktikan/PresensiFeedbackModals';
import {
  ambilNamaPraktikum,
  formatJamPresensi,
  formatRentangJam,
  formatTanggalIndonesia,
  LABEL_STATUS,
  normalisasiIdSesiLokal,
  simpanPresensiLokalTercatat,
  usePraktikanStore,
} from '@/components/praktikan/praktikanStore';

const isFirestoreAktif = isFirebaseConfigured || isNativeFirebaseConfigured;

function formatMeter(nilai: number): string {
  if (!Number.isFinite(nilai)) return '-';
  if (nilai >= 1000) {
    return `${(nilai / 1000).toFixed(2)} km`;
  }
  return `${Math.round(nilai)} m`;
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

export default function PresensiPraktikanScreen() {
  const {
    currentUser,
    isAuthenticated,
    isLoading,
    error,
    praktikum,
    sesi,
    presensi,
    pengajuanIzinMap,
    muatUlangData,
  } = usePraktikanStore();

  const [sedangMengirim, setSedangMengirim] = useState(false);

  const params = useLocalSearchParams<{ sesiId?: string | string[] }>();
  const paramSesiId = Array.isArray(params.sesiId)
    ? params.sesiId[0]
    : params.sesiId;

  const { status: statusLokasi, koordinat, mintaIzin, segarkan } = useLokasi();

  const [labRemoteState, setLabRemoteState] = useState<{
    labId: string;
    data: LaboratoriumDenganId | null;
    error: string | null;
  } | null>(null);

  const [kode, setKode] = useState('');
  const [pesanErrorInput, setPesanErrorInput] = useState<string | null>(null);
  const [dataSuksesModal, setDataSuksesModal] =
    useState<DataSuksesPresensi | null>(null);
  const [alasanInfoModal, setAlasanInfoModal] =
    useState<AlasanPenolakanPresensi | null>(null);

  // Mulai pemeriksaan lokasi saat halaman dibuka
  useEffect(() => {
    void segarkan();
  }, [segarkan]);

  const sesiAktif = useMemo(() => {
    if (!paramSesiId) return null;
    const normParam = normalisasiIdSesiLokal(paramSesiId);
    return (
      sesi.find(
        (item) => item.id === paramSesiId || item.id === normParam,
      ) ?? null
    );
  }, [paramSesiId, sesi]);

  const labIdAktif = sesiAktif?.labId;

  // Pantau dokumen laboratorium secara real-time agar perubahan koordinat/radius langsung berlaku
  useEffect(() => {
    if (!labIdAktif || !isFirestoreAktif) {
      return;
    }

    const unsubscribe = listenDocument<LaboratoriumDoc>(
      firestoreRefs.laboratoriumDoc(labIdAktif),
      (docData) => {
        setLabRemoteState({
          labId: labIdAktif,
          data: docData ? { ...docData, id: labIdAktif } : null,
          error: null,
        });
      },
      () => {
        setLabRemoteState({
          labId: labIdAktif,
          data: null,
          error:
            'Gagal memuat data lokasi laboratorium. Periksa koneksi internet lalu coba lagi.',
        });
      },
    );

    return () => {
      unsubscribe();
    };
  }, [labIdAktif]);

  const { labData, labLoading, labError } = useMemo(() => {
    if (!labIdAktif) {
      return { labData: null, labLoading: false, labError: null };
    }

    if (!isFirestoreAktif) {
      const labLokal = LABORATORIUM_TETAP.find(
        (item) => item.id === labIdAktif,
      );
      return {
        labData: labLokal
          ? {
              ...labLokal,
              cosLat: Math.cos((labLokal.lat * Math.PI) / 180),
              createdAt: null,
              updatedAt: null,
            }
          : null,
        labLoading: false,
        labError: null,
      };
    }

    if (!labRemoteState || labRemoteState.labId !== labIdAktif) {
      return { labData: null, labLoading: true, labError: null };
    }

    return {
      labData: labRemoteState.data,
      labLoading: false,
      labError: labRemoteState.error,
    };
  }, [labIdAktif, labRemoteState]);

  const presensiSaya = useMemo(() => {
    if (!sesiAktif) return undefined;
    return presensi.find(
      (item) =>
        item.sesiId === sesiAktif.id && item.userId === currentUser.id,
    );
  }, [currentUser.id, presensi, sesiAktif]);

  const izinSaya = useMemo(() => {
    if (!sesiAktif) return undefined;
    return pengajuanIzinMap[sesiAktif.id];
  }, [pengajuanIzinMap, sesiAktif]);

  const jarakMeter = useMemo(() => {
    if (!koordinat || !labData) return null;
    return hitungJarakMeter(
      { lat: koordinat.lat, lng: koordinat.lng },
      { lat: labData.lat, lng: labData.lng },
    );
  }, [koordinat, labData]);

  const evaluasiLokasi = useMemo(() => {
    if (!labIdAktif || (!labLoading && !labData && !labError)) {
      return {
        valid: false,
        judul: 'Laboratorium belum ditentukan',
        pesan:
          'Kelas ini belum memiliki laboratorium aktif. Hubungi asisten praktikum.',
      };
    }

    if (labLoading) {
      return {
        valid: false,
        judul: 'Memuat data laboratorium',
        pesan: 'Mengambil koordinat dan radius laboratorium dari Firestore...',
      };
    }

    if (labError) {
      return {
        valid: false,
        judul: 'Gagal memuat data lab',
        pesan: labError,
      };
    }

    if (labData && !labData.aktif) {
      return {
        valid: false,
        judul: 'Laboratorium tidak aktif',
        pesan:
          'Laboratorium untuk kelas ini sedang dinonaktifkan sehingga presensi tidak dapat dilakukan.',
      };
    }

    if (statusLokasi === 'memuat' || statusLokasi === 'menunggu_koordinat') {
      return {
        valid: false,
        judul: 'Menunggu koordinat GPS',
        pesan:
          'Sedang mencari lokasi perangkatmu. Pastikan berada di area dengan sinyal GPS baik.',
      };
    }

    if (statusLokasi === 'izin_ditolak') {
      return {
        valid: false,
        judul: 'Izin lokasi ditolak',
        pesan:
          'Aktifkan izin lokasi agar aplikasi dapat memastikan kamu berada di dalam radius laboratorium.',
      };
    }

    if (statusLokasi === 'layanan_mati') {
      return {
        valid: false,
        judul: 'Layanan lokasi (GPS) mati',
        pesan:
          'Nyalakan layanan lokasi di perangkatmu lalu tekan Segarkan Lokasi.',
      };
    }

    if (statusLokasi === 'galat' || !koordinat) {
      return {
        valid: false,
        judul: 'Lokasi belum tersedia',
        pesan:
          'Tidak dapat membaca lokasi perangkat saat ini. Coba segarkan lokasi kembali.',
      };
    }

    if (koordinat.mocked) {
      return {
        valid: false,
        judul: 'Lokasi palsu terdeteksi',
        pesan:
          'Matikan aplikasi lokasi palsu (mock location) agar presensi dapat diproses.',
      };
    }

    if (koordinat.akurasi > BATAS_AKURASI_PRESENSI_METER) {
      return {
        valid: false,
        judul: 'Akurasi GPS belum memadai',
        pesan: `Akurasi saat ini ±${Math.round(koordinat.akurasi)} m (maksimal ${BATAS_AKURASI_PRESENSI_METER} m). Pindah ke area yang lebih terbuka lalu segarkan lokasi.`,
      };
    }

    if (jarakMeter === null || !labData) {
      return {
        valid: false,
        judul: 'Menghitung jarak ke lab',
        pesan: 'Sedang menghitung jarak posisimu terhadap laboratorium.',
      };
    }

    if (jarakMeter > labData.radiusMeter) {
      return {
        valid: false,
        judul: 'Di luar radius laboratorium',
        pesan: `Jarakmu saat ini ${formatMeter(jarakMeter)}, melebihi radius ${labData.radiusMeter} m dari ${labData.nama}.`,
      };
    }

    return {
      valid: true,
      judul: 'Lokasi sesuai radius laboratorium',
      pesan: `Kamu berada dalam radius ${labData.radiusMeter} m dari ${labData.nama}.`,
    };
  }, [
    jarakMeter,
    koordinat,
    labData,
    labError,
    labIdAktif,
    labLoading,
    statusLokasi,
  ]);

  const kembaliKeDetail = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else if (sesiAktif) {
      router.replace(
        `/praktikan/detail-sesi?sesiId=${encodeURIComponent(sesiAktif.id)}` as Href,
      );
    } else {
      router.replace('/praktikan/jadwal' as Href);
    }
  }, [sesiAktif]);

  const handleUbahKode = (teks: string) => {
    const hanyaAngka = teks.replace(/\D/g, '').slice(0, 4);
    setKode(hanyaAngka);
    if (pesanErrorInput) {
      setPesanErrorInput(null);
    }
  };

  const handleKirimPresensi = async () => {
    if (!isAuthenticated) {
      setAlasanInfoModal('belum_login');
      return;
    }
    if (!sesiAktif) return;

    if (sesiAktif.status === 'belum_dibuka') {
      setAlasanInfoModal('belum_dibuka');
      return;
    }
    if (sesiAktif.status === 'ditutup') {
      setAlasanInfoModal('sudah_ditutup');
      return;
    }
    if (presensiSaya) {
      setAlasanInfoModal('sudah_presensi');
      return;
    }
    if (izinSaya?.status === 'diterima') {
      setAlasanInfoModal('izin_diterima');
      return;
    }

    if (!labData || !labData.aktif) {
      setAlasanInfoModal('lab_tidak_aktif');
      return;
    }
    if (!koordinat || statusLokasi !== 'siap') {
      setPesanErrorInput(
        'Lokasi perangkat belum siap. Pastikan GPS aktif lalu segarkan lokasi.',
      );
      return;
    }

    setSedangMengirim(true);
    try {
      const hasil = await kirimPresensi(
        sesiAktif.id,
        kode,
        {
          lat: koordinat.lat,
          lng: koordinat.lng,
          akurasi: koordinat.akurasi,
          mocked: koordinat.mocked,
          labId: labData.id,
        },
        {
          uid: currentUser.id,
          lab: labData,
          statusSesi: sesiAktif.status,
        },
      );

      if (!hasil.ok) {
        if (
          hasil.reason === 'kode_kosong' ||
          hasil.reason === 'kode_format' ||
          hasil.reason === 'kode_salah' ||
          hasil.reason === 'lokasi_tidak_tersedia' ||
          hasil.reason === 'sesi_tidak_ditemukan'
        ) {
          setPesanErrorInput(hasil.pesan);
          return;
        }

        setAlasanInfoModal(hasil.reason);
        return;
      }

      simpanPresensiLokalTercatat({
        id: hasil.userId,
        sesiId: hasil.sesiId,
        userId: hasil.userId,
        waktu: hasil.waktuIso,
      });

      setKode('');
      setPesanErrorInput(null);
      setDataSuksesModal({
        namaPraktikan: currentUser.nama,
        nim: currentUser.nim,
        namaPraktikum: ambilNamaPraktikum(
          praktikum,
          sesiAktif.praktikumId,
          sesiAktif.namaPraktikum,
        ),
        pertemuanKe: sesiAktif.pertemuanKe,
        kelas: sesiAktif.kelas,
        waktuIso: hasil.waktuIso,
        jarakMeter: hasil.jarakMeter,
        akurasi: hasil.akurasi,
      });
    } finally {
      setSedangMengirim(false);
    }
  };

  if (isLoading && !sesiAktif) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.headerRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Kembali"
            onPress={kembaliKeDetail}
            style={({ pressed }) => [
              styles.backButton,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.backButtonText}>{'<-'} Kembali</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Presensi</Text>
        </View>

        <View style={styles.emptyContainer}>
          <View style={styles.emptyCard}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.emptyTitle}>Memuat halaman presensi...</Text>
            <Text style={styles.emptyBody}>
              Menyinkronkan data sesi dan lokasi laboratorium dari Cloud
              Firestore.
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (!sesiAktif) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.headerRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Kembali"
            onPress={kembaliKeDetail}
            style={({ pressed }) => [
              styles.backButton,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.backButtonText}>{'<-'} Kembali</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Presensi</Text>
        </View>

        <View style={styles.emptyContainer}>
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Sesi tidak ditemukan</Text>
            <Text style={styles.emptyBody}>
              {error ??
                'Data sesi praktikum yang kamu pilih tidak tersedia atau bukan bagian dari kelasmu.'}
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={muatUlangData}
              style={({ pressed }) => [
                styles.secondaryButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.secondaryButtonText}>Muat Ulang Data</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={kembaliKeDetail}
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.primaryButtonText}>Kembali</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const namaPraktikum = ambilNamaPraktikum(
    praktikum,
    sesiAktif.praktikumId,
    sesiAktif.namaPraktikum,
  );
  const sudahPresensi = Boolean(presensiSaya);
  const izinDiterima = izinSaya?.status === 'diterima';
  const jamHadir = presensiSaya ? formatJamPresensi(presensiSaya.waktu) : '';

  const sesiBisaPresensi =
    sesiAktif.status === 'dibuka' && !sudahPresensi && !izinDiterima;
  const tombolKirimNonaktif =
    !sesiBisaPresensi || !evaluasiLokasi.valid || sedangMengirim;

  const sedangMemuatLokasi =
    statusLokasi === 'memuat' || statusLokasi === 'menunggu_koordinat';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.headerRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Kembali ke detail sesi"
            onPress={kembaliKeDetail}
            style={({ pressed }) => [
              styles.backButton,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.backButtonText}>{'<-'} Kembali</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Presensi Praktikum</Text>
        </View>

        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {error ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerTitle}>Gangguan Sinkronisasi</Text>
              <Text style={styles.errorBannerBody}>{error}</Text>
              <Pressable
                accessibilityRole="button"
                onPress={muatUlangData}
                style={({ pressed }) => [
                  styles.secondaryButton,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.secondaryButtonText}>Coba Lagi</Text>
              </Pressable>
            </View>
          ) : null}

          {/* Kartu Info & Status Sesi */}
          <View style={styles.card}>
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
              <InfoRow
                label="Laboratorium"
                value={labData?.nama ?? sesiAktif.lab}
              />
              <InfoRow
                label="Tanggal"
                value={formatTanggalIndonesia(sesiAktif.tanggal)}
              />
              <InfoRow
                label="Waktu"
                value={formatRentangJam(
                  sesiAktif.jamMulai,
                  sesiAktif.jamSelesai,
                )}
              />
              <InfoRow
                label="Status Sesi"
                value={LABEL_STATUS[sesiAktif.status]}
              />
            </View>

            {sudahPresensi ? (
              <View style={styles.attendedBox}>
                <Text style={styles.attendedTitle}>Sudah Presensi</Text>
                <Text style={styles.attendedSub}>
                  Kehadiranmu tercatat pukul {jamHadir} WIB.
                </Text>
              </View>
            ) : null}

            {izinDiterima && !sudahPresensi ? (
              <View style={styles.attendedBox}>
                <Text style={styles.attendedTitle}>Izin Diterima</Text>
                <Text style={styles.attendedSub}>
                  Pengajuan izin kamu pada sesi ini sudah disetujui asisten.
                </Text>
              </View>
            ) : null}
          </View>

          {/* Kartu Hasil Pemeriksaan Lokasi */}
          <View style={styles.card}>
            <View style={styles.locationHeaderRow}>
              <Text style={styles.sectionTitle}>Pemeriksaan Lokasi</Text>
              <View
                style={[
                  styles.locationStatusPill,
                  evaluasiLokasi.valid
                    ? styles.locationStatusPillOk
                    : styles.locationStatusPillWarn,
                ]}
              >
                <Text style={styles.locationStatusPillText}>
                  {evaluasiLokasi.valid ? 'Dalam Radius' : 'Belum Memenuhi'}
                </Text>
              </View>
            </View>

            <View
              style={[
                styles.locationBanner,
                evaluasiLokasi.valid
                  ? styles.locationBannerOk
                  : styles.locationBannerWarn,
              ]}
            >
              <View style={styles.locationBannerTitleRow}>
                {sedangMemuatLokasi || labLoading ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : null}
                <Text style={styles.locationBannerTitle}>
                  {evaluasiLokasi.judul}
                </Text>
              </View>
              <Text style={styles.locationBannerBody}>
                {evaluasiLokasi.pesan}
              </Text>
            </View>

            <View style={styles.metricsRow}>
              <View style={styles.metricBox}>
                <Text style={styles.metricLabel}>Jarak ke Lab</Text>
                <Text style={styles.metricValue}>
                  {jarakMeter !== null ? formatMeter(jarakMeter) : '-'}
                </Text>
              </View>
              <View style={styles.metricBox}>
                <Text style={styles.metricLabel}>Radius Lab</Text>
                <Text style={styles.metricValue}>
                  {labData ? `${labData.radiusMeter} m` : '-'}
                </Text>
              </View>
              <View style={styles.metricBox}>
                <Text style={styles.metricLabel}>Akurasi GPS</Text>
                <Text style={styles.metricValue}>
                  {koordinat && Number.isFinite(koordinat.akurasi)
                    ? `±${Math.round(koordinat.akurasi)} m`
                    : '-'}
                </Text>
              </View>
            </View>

            <View style={styles.locationActionsRow}>
              {statusLokasi === 'izin_ditolak' ||
              statusLokasi === 'menunggu_koordinat' ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => void mintaIzin()}
                  style={({ pressed }) => [
                    styles.secondaryButton,
                    styles.flexButton,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.secondaryButtonText}>
                    {statusLokasi === 'izin_ditolak'
                      ? 'Beri Izin Lokasi'
                      : 'Aktifkan Lokasi'}
                  </Text>
                </Pressable>
              ) : null}

              {statusLokasi === 'izin_ditolak' ||
              statusLokasi === 'layanan_mati' ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => void Linking.openSettings()}
                  style={({ pressed }) => [
                    styles.secondaryButton,
                    styles.flexButton,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.secondaryButtonText}>
                    Buka Pengaturan
                  </Text>
                </Pressable>
              ) : null}

              <Pressable
                accessibilityRole="button"
                disabled={sedangMemuatLokasi}
                onPress={() => void segarkan()}
                style={({ pressed }) => [
                  styles.secondaryButton,
                  styles.flexButton,
                  sedangMemuatLokasi && styles.disabledButton,
                  pressed && !sedangMemuatLokasi && styles.pressed,
                ]}
              >
                <Text style={styles.secondaryButtonText}>
                  {sedangMemuatLokasi ? 'Memeriksa...' : 'Segarkan Lokasi'}
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Form Input Kode 4 Digit */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Kode Presensi 4 Digit</Text>
            <Text style={styles.sectionSub}>
              Masukkan 4 digit kode yang dibagikan asisten saat sesi dibuka.
            </Text>

            <TextInput
              value={kode}
              onChangeText={handleUbahKode}
              placeholder="0000"
              placeholderTextColor={colors.textMuted}
              keyboardType="number-pad"
              maxLength={4}
              editable={sesiBisaPresensi && !sedangMengirim}
              accessibilityLabel="Input kode presensi 4 digit"
              style={[
                styles.codeInput,
                pesanErrorInput && styles.codeInputError,
                !sesiBisaPresensi && styles.codeInputDisabled,
              ]}
            />

            {pesanErrorInput ? (
              <Text style={styles.errorText}>{pesanErrorInput}</Text>
            ) : null}

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Kirim Presensi"
              accessibilityState={{ disabled: tombolKirimNonaktif }}
              disabled={tombolKirimNonaktif}
              onPress={() => void handleKirimPresensi()}
              style={({ pressed }) => [
                styles.primaryButton,
                tombolKirimNonaktif && styles.disabledButton,
                pressed && !tombolKirimNonaktif && styles.pressed,
              ]}
            >
              {sedangMengirim ? (
                <ActivityIndicator color={colors.bg} />
              ) : (
                <Text
                  style={[
                    styles.primaryButtonText,
                    tombolKirimNonaktif && styles.disabledButtonText,
                  ]}
                >
                  {sudahPresensi
                    ? 'Sudah Presensi'
                    : izinDiterima
                      ? 'Izin Diterima'
                      : sesiAktif.status === 'belum_dibuka'
                        ? 'Sesi Belum Dibuka'
                        : sesiAktif.status === 'ditutup'
                          ? 'Sesi Telah Ditutup'
                          : 'Presensi Sekarang'}
                </Text>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <PresensiSuccessModal
        visible={Boolean(dataSuksesModal)}
        data={dataSuksesModal}
        onClose={() => {
          setDataSuksesModal(null);
          kembaliKeDetail();
        }}
      />

      <PresensiInfoModal
        visible={Boolean(alasanInfoModal)}
        alasan={alasanInfoModal}
        namaPraktikum={namaPraktikum}
        pertemuanKe={sesiAktif.pertemuanKe}
        waktuTercatatIso={presensiSaya?.waktu}
        onClose={() => setAlasanInfoModal(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  flex: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.bg,
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  backButtonText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  headerTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '800',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 18,
    gap: 16,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    gap: 12,
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
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  courseSubTitle: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
  infoList: {
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  infoLabel: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  infoValue: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
    textAlign: 'right',
  },
  attendedBox: {
    backgroundColor: colors.highlight,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    gap: 2,
  },
  attendedTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  attendedSub: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '500',
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  sectionSub: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
  },
  locationHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  locationStatusPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  locationStatusPillOk: {
    backgroundColor: colors.highlight,
  },
  locationStatusPillWarn: {
    backgroundColor: colors.bg,
  },
  locationStatusPillText: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '800',
  },
  locationBanner: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    gap: 4,
  },
  locationBannerOk: {
    backgroundColor: colors.highlight,
  },
  locationBannerWarn: {
    backgroundColor: colors.bg,
  },
  locationBannerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  locationBannerTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  locationBannerBody: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  metricBox: {
    flex: 1,
    backgroundColor: colors.bg,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    gap: 4,
  },
  metricLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  metricValue: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  locationActionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  flexButton: {
    flexGrow: 1,
  },
  codeInput: {
    backgroundColor: colors.bg,
    borderColor: colors.border,
    borderWidth: 1.5,
    borderRadius: 14,
    minHeight: 54,
    paddingHorizontal: 16,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 8,
    textAlign: 'center',
    color: colors.text,
  },
  codeInputError: {
    borderColor: colors.primary,
  },
  codeInputDisabled: {
    opacity: 0.55,
  },
  errorText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  primaryButton: {
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  primaryButtonText: {
    color: colors.bg,
    fontSize: 15,
    fontWeight: '800',
  },
  secondaryButton: {
    minHeight: 42,
    borderRadius: 12,
    backgroundColor: colors.bg,
    borderColor: colors.border,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  secondaryButtonText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  disabledButton: {
    opacity: 0.45,
  },
  disabledButtonText: {
    color: colors.bg,
  },
  pressed: {
    opacity: 0.85,
  },
  errorBanner: {
    backgroundColor: colors.surface,
    borderColor: colors.primary,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    gap: 8,
  },
  errorBannerTitle: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '800',
  },
  errorBannerBody: {
    color: colors.text,
    fontSize: 13,
    lineHeight: 19,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: 18,
  },
  emptyCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    gap: 12,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
  },
  emptyBody: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
  },
});
