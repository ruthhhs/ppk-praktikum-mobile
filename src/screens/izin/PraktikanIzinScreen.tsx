import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ambilNamaPraktikum,
  formatRentangJam,
  formatTanggalIndonesia,
  formatWaktuLengkapWib,
  LABEL_STATUS,
  LABEL_STATUS_IZIN,
  usePraktikanStore,
  WARNA,
  type PengajuanIzinRingkas,
  type StatusIzinPraktikan,
} from '../../components/praktikan/praktikanStore';

type FilterStatusIzin = 'semua' | StatusIzinPraktikan;

function StatusIzinBadge({ status }: { status: StatusIzinPraktikan }) {
  return (
    <View
      style={[
        styles.izinBadge,
        status === 'menunggu' && styles.izinBadgeMenunggu,
        status === 'diterima' && styles.izinBadgeDiterima,
        status === 'ditolak' && styles.izinBadgeDitolak,
      ]}
    >
      <Text
        style={[
          styles.izinBadgeText,
          status === 'menunggu' && styles.izinBadgeTextMenunggu,
          status === 'diterima' && styles.izinBadgeTextDiterima,
          status === 'ditolak' && styles.izinBadgeTextDitolak,
        ]}
      >
        {LABEL_STATUS_IZIN[status]}
      </Text>
    </View>
  );
}

export default function PraktikanIzinScreen() {
  const {
    currentUser,
    isAuthenticated,
    isLoading,
    isSubmittingIzin,
    error,
    praktikum,
    sesi,
    presensi,
    pengajuanIzinMap,
    daftarPengajuanIzin,
    ajukanIzinPraktikan,
    muatUlangData,
  } = usePraktikanStore();

  const params = useLocalSearchParams<{ sesiId?: string | string[] }>();
  const paramSesiId = Array.isArray(params.sesiId)
    ? params.sesiId[0]
    : params.sesiId;

  const [pilihanSesiId, setPilihanSesiId] = useState<string | null>(
    paramSesiId ?? null,
  );
  const [alasanInput, setAlasanInput] = useState('');
  const [pesanErrorForm, setPesanErrorForm] = useState<string | null>(null);
  const [infoSuksesBanner, setInfoSuksesBanner] = useState<{
    judul: string;
    isi: string;
    kategoriAI?: string;
    statusKlasifikasi: 'berhasil' | 'gagal';
  } | null>(null);
  const [filterStatus, setFilterStatus] = useState<FilterStatusIzin>('semua');

  const presensiSayaSet = useMemo(() => {
    return new Set(
      presensi
        .filter((item) => item.userId === currentUser.id)
        .map((item) => item.sesiId),
    );
  }, [currentUser.id, presensi]);

  // Sesi yang memenuhi syarat untuk diajukan izin:
  // belum ditutup (belum_dibuka atau dibuka), belum presensi, dan belum ada pengajuan izin
  const sesiMemenuhiSyarat = useMemo(() => {
    return sesi.filter(
      (item) =>
        item.status !== 'ditutup' &&
        !presensiSayaSet.has(item.id) &&
        !pengajuanIzinMap[item.id],
    );
  }, [pengajuanIzinMap, presensiSayaSet, sesi]);

  const sesiTerpilih = useMemo(() => {
    if (sesiMemenuhiSyarat.length === 0) {
      return null;
    }
    if (pilihanSesiId) {
      const cocok = sesiMemenuhiSyarat.find(
        (item) => item.id === pilihanSesiId,
      );
      if (cocok) {
        return cocok;
      }
    }
    if (paramSesiId) {
      const cocokParam = sesiMemenuhiSyarat.find(
        (item) => item.id === paramSesiId,
      );
      if (cocokParam) {
        return cocokParam;
      }
    }
    return sesiMemenuhiSyarat[0];
  }, [paramSesiId, pilihanSesiId, sesiMemenuhiSyarat]);

  const ringkasanIzin = useMemo(() => {
    let menunggu = 0;
    let diterima = 0;
    let ditolak = 0;
    for (const item of daftarPengajuanIzin) {
      if (item.status === 'menunggu') {
        menunggu += 1;
      } else if (item.status === 'diterima') {
        diterima += 1;
      } else if (item.status === 'ditolak') {
        ditolak += 1;
      }
    }
    return {
      total: daftarPengajuanIzin.length,
      menunggu,
      diterima,
      ditolak,
    };
  }, [daftarPengajuanIzin]);

  const daftarIzinTampil = useMemo<PengajuanIzinRingkas[]>(() => {
    if (filterStatus === 'semua') {
      return daftarPengajuanIzin;
    }
    return daftarPengajuanIzin.filter((item) => item.status === filterStatus);
  }, [daftarPengajuanIzin, filterStatus]);

  const panjangAlasan = alasanInput.trim().length;

  const handleUbahAlasan = (teks: string) => {
    setAlasanInput(teks.slice(0, 500));
    if (pesanErrorForm) {
      setPesanErrorForm(null);
    }
  };

  const handleKirimPengajuan = async () => {
    if (!sesiTerpilih || isSubmittingIzin) {
      return;
    }

    setPesanErrorForm(null);
    setInfoSuksesBanner(null);

    const hasil = await ajukanIzinPraktikan(sesiTerpilih.id, alasanInput);
    if (!hasil.ok) {
      setPesanErrorForm(hasil.pesan);
      return;
    }

    const namaMatkul = ambilNamaPraktikum(
      praktikum,
      sesiTerpilih.praktikumId,
      sesiTerpilih.namaPraktikum,
    );

    setAlasanInput('');
    setInfoSuksesBanner({
      judul: `Pengajuan izin ${namaMatkul} (Pertemuan ${sesiTerpilih.pertemuanKe}) terkirim`,
      isi:
        hasil.pesanKlasifikasi ??
        'Pengajuan izin berhasil disimpan dengan status Menunggu keputusan asisten.',
      kategoriAI: hasil.pengajuan.kategoriAI,
      statusKlasifikasi: hasil.pengajuan.statusKlasifikasi,
    });
  };

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.centerStateContainer}>
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Akun Belum Masuk</Text>
            <Text style={styles.emptyBody}>
              Silakan masuk menggunakan akun Praktikan terlebih dahulu untuk
              mengajukan izin dan memantau status pemeriksaan asisten.
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.replace('/')}
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.primaryButtonText}>Ke Halaman Masuk</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.headerSection}>
          <Text style={styles.screenTitle}>Pengajuan Izin</Text>
          <Text style={styles.screenSubtitle}>
            Ajukan izin ketidakhadiran sebelum sesi ditutup dan pantau hasil
            pemeriksaan asisten secara langsung.
          </Text>
        </View>

        {error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerTitle}>Gangguan Sinkronisasi</Text>
            <Text style={styles.errorBannerBody}>{error}</Text>
            <Pressable
              accessibilityRole="button"
              onPress={muatUlangData}
              style={({ pressed }) => [
                styles.retryButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.retryButtonText}>Muat Ulang</Text>
            </Pressable>
          </View>
        ) : null}

        {infoSuksesBanner ? (
          <View style={styles.successBanner}>
            <View style={styles.successHeaderRow}>
              <Text style={styles.successBannerTitle}>
                {infoSuksesBanner.judul}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Tutup pesan konfirmasi izin"
                onPress={() => setInfoSuksesBanner(null)}
                style={styles.closeSuccessBtn}
              >
                <Text style={styles.closeSuccessBtnText}>Tutup</Text>
              </Pressable>
            </View>
            <Text style={styles.successBannerBody}>{infoSuksesBanner.isi}</Text>
            <View style={styles.aiBadgeRow}>
              <View style={styles.aiSupportBadge}>
                <Text style={styles.aiSupportBadgeText}>
                  {infoSuksesBanner.statusKlasifikasi === 'berhasil' &&
                  infoSuksesBanner.kategoriAI
                    ? `Prediksi AI (Pendukung): ${infoSuksesBanner.kategoriAI}`
                    : 'Klasifikasi AI belum tersedia · Ditinjau manual asisten'}
                </Text>
              </View>
            </View>
          </View>
        ) : null}

        <View style={styles.formCard}>
          <View style={styles.formHeaderBlock}>
            <Text style={styles.sectionTitle}>Buat Pengajuan Izin Baru</Text>
            <Text style={styles.sectionSubtitle}>
              Pilih sesi praktikum yang belum ditutup dan belum kamu hadiri,
              lalu isi alasan (10 sampai 500 karakter).
            </Text>
          </View>

          {isLoading && sesi.length === 0 ? (
            <View style={styles.inlineLoadingBox}>
              <ActivityIndicator size="small" color={WARNA.primary} />
              <Text style={styles.inlineLoadingText}>
                Memuat daftar sesi praktikum...
              </Text>
            </View>
          ) : sesiMemenuhiSyarat.length === 0 ? (
            <View style={styles.noEligibleBox}>
              <Text style={styles.noEligibleTitle}>
                Tidak ada sesi yang dapat diajukan izin saat ini
              </Text>
              <Text style={styles.noEligibleBody}>
                Semua sesi pada kelasmu sudah ditutup, sudah kamu hadiri, atau
                sudah memiliki pengajuan izin aktif.
              </Text>
            </View>
          ) : (
            <>
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>1. Pilih Sesi Praktikum</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.sessionSelectorRow}
                >
                  {sesiMemenuhiSyarat.map((item) => {
                    const aktif = sesiTerpilih?.id === item.id;
                    const namaMatkul = ambilNamaPraktikum(
                      praktikum,
                      item.praktikumId,
                      item.namaPraktikum,
                    );
                    return (
                      <Pressable
                        key={item.id}
                        accessibilityRole="button"
                        accessibilityState={{ selected: aktif }}
                        onPress={() => {
                          setPilihanSesiId(item.id);
                          setPesanErrorForm(null);
                        }}
                        style={({ pressed }) => [
                          styles.sessionOptionCard,
                          aktif && styles.sessionOptionCardActive,
                          pressed && styles.pressed,
                        ]}
                      >
                        <Text
                          style={[
                            styles.sessionOptionCourse,
                            aktif && styles.sessionOptionTextActive,
                          ]}
                          numberOfLines={1}
                        >
                          {namaMatkul}
                        </Text>
                        <Text
                          style={[
                            styles.sessionOptionMeta,
                            aktif && styles.sessionOptionTextActive,
                          ]}
                        >
                          Pertemuan {item.pertemuanKe} · Kelas {item.kelas}
                        </Text>
                        <Text
                          style={[
                            styles.sessionOptionDate,
                            aktif && styles.sessionOptionTextActive,
                          ]}
                        >
                          {formatTanggalIndonesia(item.tanggal)} ·{' '}
                          {LABEL_STATUS[item.status]}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>

              {sesiTerpilih ? (
                <View style={styles.selectedSessionDetailBox}>
                  <Text style={styles.selectedSessionTitle}>
                    Sesi Terpilih:{' '}
                    {ambilNamaPraktikum(
                      praktikum,
                      sesiTerpilih.praktikumId,
                      sesiTerpilih.namaPraktikum,
                    )}{' '}
                    (Pertemuan {sesiTerpilih.pertemuanKe})
                  </Text>
                  <Text style={styles.selectedSessionSub}>
                    Kelas {sesiTerpilih.kelas} · {sesiTerpilih.lab} ·{' '}
                    {formatTanggalIndonesia(sesiTerpilih.tanggal)} (
                    {formatRentangJam(
                      sesiTerpilih.jamMulai,
                      sesiTerpilih.jamSelesai,
                    )}
                    )
                  </Text>
                </View>
              ) : null}

              <View style={styles.fieldGroup}>
                <View style={styles.labelWithCounterRow}>
                  <Text style={styles.fieldLabel}>
                    2. Alasan Ketidakhadiran
                  </Text>
                  <Text
                    style={[
                      styles.charCounter,
                      panjangAlasan > 0 &&
                        panjangAlasan < 10 &&
                        styles.charCounterWarn,
                    ]}
                  >
                    {panjangAlasan}/500 karakter
                  </Text>
                </View>

                <TextInput
                  value={alasanInput}
                  onChangeText={handleUbahAlasan}
                  maxLength={500}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  editable={!isSubmittingIzin}
                  placeholder="Tuliskan alasan tidak dapat mengikuti sesi praktikum ini (minimal 10 karakter)..."
                  placeholderTextColor={WARNA.textMuted}
                  accessibilityLabel="Alasan ketidakhadiran"
                  style={[
                    styles.reasonInput,
                    pesanErrorForm ? styles.reasonInputError : null,
                  ]}
                />

                {pesanErrorForm ? (
                  <View style={styles.formErrorBox}>
                    <Text style={styles.formErrorText}>{pesanErrorForm}</Text>
                  </View>
                ) : (
                  <Text style={styles.helperHint}>
                    Alasan wajib 10 sampai 500 karakter dan tidak dapat diubah
                    setelah dikirim. Klasifikasi AI bersifat pendukung dan
                    keputusan akhir ditentukan oleh asisten.
                  </Text>
                )}
              </View>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Kirim Pengajuan Izin"
                accessibilityState={{ disabled: isSubmittingIzin }}
                disabled={isSubmittingIzin}
                onPress={handleKirimPengajuan}
                style={({ pressed }) => [
                  styles.submitIzinButton,
                  isSubmittingIzin && styles.disabledButton,
                  pressed && !isSubmittingIzin && styles.pressed,
                ]}
              >
                <Text style={styles.submitIzinButtonText}>
                  {isSubmittingIzin
                    ? 'Memproses & Klasifikasi AI...'
                    : 'Kirim Pengajuan Izin'}
                </Text>
              </Pressable>
            </>
          )}
        </View>

        <View style={styles.listHeaderSection}>
          <Text style={styles.sectionTitle}>Daftar & Status Pengajuan Saya</Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryStatBox}>
              <Text style={styles.summaryStatValue}>{ringkasanIzin.total}</Text>
              <Text style={styles.summaryStatLabel}>Total</Text>
            </View>
            <View style={styles.summaryStatBox}>
              <Text style={styles.summaryStatValue}>
                {ringkasanIzin.menunggu}
              </Text>
              <Text style={styles.summaryStatLabel}>Menunggu</Text>
            </View>
            <View
              style={[styles.summaryStatBox, styles.summaryStatBoxHighlight]}
            >
              <Text style={styles.summaryStatValue}>
                {ringkasanIzin.diterima}
              </Text>
              <Text style={styles.summaryStatLabel}>Diterima</Text>
            </View>
            <View style={styles.summaryStatBox}>
              <Text style={[styles.summaryStatValue, styles.summaryStatRose]}>
                {ringkasanIzin.ditolak}
              </Text>
              <Text style={styles.summaryStatLabel}>Ditolak</Text>
            </View>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterChipRow}
          >
            {(
              [
                { id: 'semua', label: 'Semua' },
                { id: 'menunggu', label: 'Menunggu' },
                { id: 'diterima', label: 'Diterima' },
                { id: 'ditolak', label: 'Ditolak' },
              ] as const
            ).map((chip) => {
              const aktif = filterStatus === chip.id;
              return (
                <Pressable
                  key={chip.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected: aktif }}
                  onPress={() => setFilterStatus(chip.id)}
                  style={({ pressed }) => [
                    styles.filterChip,
                    aktif && styles.filterChipActive,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      aktif && styles.filterChipTextActive,
                    ]}
                  >
                    {chip.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {daftarIzinTampil.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Belum ada pengajuan izin</Text>
            <Text style={styles.emptyBody}>
              {filterStatus === 'semua'
                ? 'Kamu belum pernah mengajukan izin ketidakhadiran. Gunakan formulir di atas jika berhalangan hadir.'
                : `Tidak ada pengajuan izin dengan status ${LABEL_STATUS_IZIN[filterStatus]}.`}
            </Text>
          </View>
        ) : (
          <View style={styles.izinListColumn}>
            {daftarIzinTampil.map((izin) => {
              const dataSesi = sesi.find((s) => s.id === izin.sesiId);
              const namaMatkul = dataSesi
                ? ambilNamaPraktikum(
                    praktikum,
                    dataSesi.praktikumId,
                    dataSesi.namaPraktikum,
                  )
                : 'Praktikum';

              return (
                <View key={`${izin.sesiId}-${izin.id}`} style={styles.izinCard}>
                  <View style={styles.izinCardTop}>
                    <View style={styles.izinTitleColumn}>
                      <Text style={styles.izinCourseTitle}>{namaMatkul}</Text>
                      <Text style={styles.izinSessionSub}>
                        {dataSesi
                          ? `Pertemuan ${dataSesi.pertemuanKe} · Kelas ${dataSesi.kelas} · ${dataSesi.lab}`
                          : `ID Sesi: ${izin.sesiId}`}
                      </Text>
                      {dataSesi ? (
                        <Text style={styles.izinDateText}>
                          {formatTanggalIndonesia(dataSesi.tanggal)} ·{' '}
                          {formatRentangJam(
                            dataSesi.jamMulai,
                            dataSesi.jamSelesai,
                          )}
                        </Text>
                      ) : null}
                    </View>
                    <StatusIzinBadge status={izin.status} />
                  </View>

                  <View style={styles.divider} />

                  <View style={styles.alasanBox}>
                    <Text style={styles.alasanLabel}>Alasan Pengajuan:</Text>
                    <Text style={styles.alasanBody}>{izin.alasan}</Text>
                  </View>

                  <View style={styles.aiInfoBox}>
                    <Text style={styles.aiInfoLabel}>
                      Informasi Pendukung AI:
                    </Text>
                    <Text style={styles.aiInfoValue}>
                      {izin.statusKlasifikasi === 'berhasil' && izin.kategoriAI
                        ? `Kategori: ${izin.kategoriAI}`
                        : 'Klasifikasi AI belum tersedia (ditinjau manual asisten)'}
                    </Text>
                  </View>

                  <View style={styles.timestampSection}>
                    <Text style={styles.timestampText}>
                      Diajukan: {formatWaktuLengkapWib(izin.createdAt)}
                    </Text>
                    {izin.reviewedAt ? (
                      <Text style={styles.timestampText}>
                        Diperiksa asisten:{' '}
                        {formatWaktuLengkapWib(izin.reviewedAt)}
                      </Text>
                    ) : (
                      <Text style={styles.timestampHint}>
                        {izin.status === 'menunggu'
                          ? 'Menunggu pemeriksaan asisten. Kamu masih dapat melakukan presensi apabila hadir di kelas.'
                          : 'Keputusan telah disimpan oleh asisten.'}
                      </Text>
                    )}
                  </View>

                  {dataSesi ? (
                    <Pressable
                      accessibilityRole="button"
                      onPress={() =>
                        router.push({
                          pathname: '/praktikan/detail-sesi',
                          params: { sesiId: dataSesi.id },
                        })
                      }
                      style={({ pressed }) => [
                        styles.detailLinkButton,
                        pressed && styles.pressed,
                      ]}
                    >
                      <Text style={styles.detailLinkButtonText}>
                        Lihat Detail Sesi
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: WARNA.bg,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 28,
    gap: 16,
  },
  centerStateContainer: {
    flex: 1,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSection: {
    gap: 4,
  },
  screenTitle: {
    color: WARNA.text,
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 34,
  },
  screenSubtitle: {
    color: WARNA.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  errorBanner: {
    backgroundColor: WARNA.surface,
    borderColor: WARNA.primary,
    borderWidth: 1.5,
    borderRadius: 18,
    padding: 16,
    gap: 8,
  },
  errorBannerTitle: {
    color: WARNA.primary,
    fontSize: 15,
    fontWeight: '800',
  },
  errorBannerBody: {
    color: WARNA.text,
    fontSize: 13,
    lineHeight: 19,
  },
  retryButton: {
    alignSelf: 'flex-start',
    minHeight: 40,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: WARNA.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryButtonText: {
    color: WARNA.bg,
    fontSize: 13,
    fontWeight: '800',
  },
  successBanner: {
    backgroundColor: WARNA.highlight,
    borderColor: WARNA.text,
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    gap: 8,
  },
  successHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  successBannerTitle: {
    flex: 1,
    color: WARNA.text,
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 21,
  },
  closeSuccessBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: WARNA.bg,
    borderColor: WARNA.border,
    borderWidth: 1,
  },
  closeSuccessBtnText: {
    color: WARNA.text,
    fontSize: 12,
    fontWeight: '700',
  },
  successBannerBody: {
    color: WARNA.text,
    fontSize: 13,
    lineHeight: 19,
  },
  aiBadgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 2,
  },
  aiSupportBadge: {
    backgroundColor: WARNA.bg,
    borderColor: WARNA.text,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  aiSupportBadgeText: {
    color: WARNA.text,
    fontSize: 12,
    fontWeight: '800',
  },
  formCard: {
    backgroundColor: WARNA.surface,
    borderColor: WARNA.border,
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    gap: 14,
  },
  formHeaderBlock: {
    gap: 4,
  },
  sectionTitle: {
    color: WARNA.text,
    fontSize: 17,
    fontWeight: '800',
  },
  sectionSubtitle: {
    color: WARNA.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  inlineLoadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
  },
  inlineLoadingText: {
    color: WARNA.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  noEligibleBox: {
    backgroundColor: WARNA.bg,
    borderColor: WARNA.border,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    gap: 4,
  },
  noEligibleTitle: {
    color: WARNA.text,
    fontSize: 14,
    fontWeight: '800',
  },
  noEligibleBody: {
    color: WARNA.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  fieldGroup: {
    gap: 8,
  },
  fieldLabel: {
    color: WARNA.text,
    fontSize: 13,
    fontWeight: '800',
  },
  sessionSelectorRow: {
    gap: 10,
    paddingVertical: 2,
  },
  sessionOptionCard: {
    width: 210,
    backgroundColor: WARNA.bg,
    borderColor: WARNA.border,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    gap: 3,
  },
  sessionOptionCardActive: {
    backgroundColor: WARNA.highlight,
    borderColor: WARNA.text,
    borderWidth: 1.5,
  },
  sessionOptionCourse: {
    color: WARNA.text,
    fontSize: 14,
    fontWeight: '800',
  },
  sessionOptionMeta: {
    color: WARNA.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  sessionOptionDate: {
    color: WARNA.textMuted,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  sessionOptionTextActive: {
    color: WARNA.text,
  },
  selectedSessionDetailBox: {
    backgroundColor: WARNA.bg,
    borderColor: WARNA.border,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 2,
  },
  selectedSessionTitle: {
    color: WARNA.text,
    fontSize: 13,
    fontWeight: '800',
  },
  selectedSessionSub: {
    color: WARNA.textMuted,
    fontSize: 12,
    lineHeight: 17,
  },
  labelWithCounterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  charCounter: {
    color: WARNA.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  charCounterWarn: {
    color: WARNA.primary,
  },
  reasonInput: {
    minHeight: 104,
    backgroundColor: WARNA.bg,
    borderColor: WARNA.border,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: WARNA.text,
    fontSize: 14,
    lineHeight: 20,
  },
  reasonInputError: {
    borderColor: WARNA.primary,
  },
  formErrorBox: {
    backgroundColor: WARNA.bg,
    borderColor: WARNA.primary,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  formErrorText: {
    color: WARNA.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  helperHint: {
    color: WARNA.textMuted,
    fontSize: 12,
    lineHeight: 17,
  },
  submitIzinButton: {
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: WARNA.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  submitIzinButtonText: {
    color: WARNA.bg,
    fontSize: 15,
    fontWeight: '800',
  },
  listHeaderSection: {
    gap: 12,
    marginTop: 4,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 8,
  },
  summaryStatBox: {
    flex: 1,
    backgroundColor: WARNA.surface,
    borderColor: WARNA.border,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 2,
  },
  summaryStatBoxHighlight: {
    backgroundColor: WARNA.highlight,
    borderColor: WARNA.text,
  },
  summaryStatValue: {
    color: WARNA.text,
    fontSize: 18,
    fontWeight: '800',
  },
  summaryStatRose: {
    color: WARNA.primary,
  },
  summaryStatLabel: {
    color: WARNA.textMuted,
    fontSize: 11,
    fontWeight: '700',
  },
  filterChipRow: {
    gap: 8,
  },
  filterChip: {
    minHeight: 40,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: WARNA.surface,
    borderColor: WARNA.border,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterChipActive: {
    backgroundColor: WARNA.primary,
    borderColor: WARNA.primary,
  },
  filterChipText: {
    color: WARNA.text,
    fontSize: 13,
    fontWeight: '700',
  },
  filterChipTextActive: {
    color: WARNA.bg,
  },
  izinListColumn: {
    gap: 12,
  },
  izinCard: {
    backgroundColor: WARNA.surface,
    borderColor: WARNA.border,
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    gap: 12,
  },
  izinCardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  izinTitleColumn: {
    flex: 1,
    gap: 2,
  },
  izinCourseTitle: {
    color: WARNA.text,
    fontSize: 17,
    fontWeight: '800',
  },
  izinSessionSub: {
    color: WARNA.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  izinDateText: {
    color: WARNA.textMuted,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  izinBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  izinBadgeMenunggu: {
    backgroundColor: WARNA.bg,
    borderColor: WARNA.text,
  },
  izinBadgeDiterima: {
    backgroundColor: WARNA.highlight,
    borderColor: WARNA.text,
  },
  izinBadgeDitolak: {
    backgroundColor: WARNA.primary,
    borderColor: WARNA.primary,
  },
  izinBadgeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  izinBadgeTextMenunggu: {
    color: WARNA.text,
  },
  izinBadgeTextDiterima: {
    color: WARNA.text,
  },
  izinBadgeTextDitolak: {
    color: WARNA.bg,
  },
  divider: {
    height: 1,
    backgroundColor: WARNA.border,
  },
  alasanBox: {
    backgroundColor: WARNA.bg,
    borderColor: WARNA.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 4,
  },
  alasanLabel: {
    color: WARNA.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  alasanBody: {
    color: WARNA.text,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  aiInfoBox: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
    backgroundColor: WARNA.bg,
    borderColor: WARNA.border,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  aiInfoLabel: {
    color: WARNA.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  aiInfoValue: {
    color: WARNA.text,
    fontSize: 12,
    fontWeight: '800',
  },
  timestampSection: {
    gap: 3,
  },
  timestampText: {
    color: WARNA.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  timestampHint: {
    color: WARNA.textMuted,
    fontSize: 12,
    lineHeight: 17,
  },
  detailLinkButton: {
    alignSelf: 'flex-start',
    minHeight: 40,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: WARNA.bg,
    borderColor: WARNA.border,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailLinkButtonText: {
    color: WARNA.text,
    fontSize: 13,
    fontWeight: '700',
  },
  emptyCard: {
    backgroundColor: WARNA.surface,
    borderColor: WARNA.border,
    borderWidth: 1,
    borderRadius: 18,
    padding: 20,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: {
    color: WARNA.text,
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
  },
  emptyBody: {
    color: WARNA.textMuted,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
  primaryButton: {
    marginTop: 6,
    minHeight: 46,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: WARNA.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: WARNA.bg,
    fontSize: 14,
    fontWeight: '800',
  },
  disabledButton: {
    opacity: 0.45,
  },
  pressed: {
    opacity: 0.82,
  },
});
