import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { globalStyles, WARNA as BASE_WARNA } from "../../styles/global";
import {
  useAsistenWorkflowStore,
  type SesiAsisten,
} from "./AsistenWorkflowStore";
import { firestoreRefs, readDocument } from "../../services/firebase/firestore";

const WARNA = {
  ...BASE_WARNA,
  soft: "#F5F8F6",
};

type StatusSesi = "belum_dibuka" | "dibuka" | "ditutup";
type TindakanKonfirmasi = "buka" | "tutup" | null;

type Sesi = SesiAsisten;

function formatTanggal(tanggal?: string) {
  if (!tanggal || !tanggal.includes("-")) return tanggal || "-";
  const [tahun, bulan, hari] = tanggal.split("-").map(Number);
  const date = new Date(tahun, bulan - 1, hari);
  if (Number.isNaN(date.getTime())) return tanggal;

  return date
    .toLocaleDateString("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    })
    .replace(".", "");
}

function StatusBadge({ status }: { status: StatusSesi }) {
  const label = {
    belum_dibuka: "Belum dibuka",
    dibuka: "Dibuka",
    ditutup: "Ditutup",
  }[status];

  const badgeStyle =
    status === "dibuka"
      ? styles.badgeDibuka
      : status === "ditutup"
        ? styles.badgeDitutup
        : styles.badgeBelumDibuka;

  const textStyle =
    status === "ditutup" ? styles.badgeTextDitutup : styles.badgeText;

  return (
    <View style={[styles.badge, badgeStyle]}>
      {status === "dibuka" && <View style={styles.badgeDot} />}
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
  variant = "primary",
  onPress,
}: {
  label: string;
  variant?: "primary" | "outline" | "danger";
  onPress: () => void;
}) {
  const buttonStyle =
    variant === "outline"
      ? globalStyles.buttonOutline
      : variant === "danger"
        ? globalStyles.buttonDanger
        : globalStyles.buttonPrimary;

  const textStyle =
    variant === "danger"
      ? globalStyles.buttonTextDanger
      : variant === "outline"
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
  const { sesi: daftarSesi, loading: storeLoading, buka, tutup } =
    useAsistenWorkflowStore();

  const requestedId = Array.isArray(sesiId) ? sesiId[0] : sesiId;
  const sesiStore = daftarSesi.find(
    (item) => item.id === requestedId || (!requestedId && true),
  );

  const [sesi, setSesi] = useState<Sesi | null>(() => sesiStore ?? null);
  const [formTerbuka, setFormTerbuka] = useState(false);
  const [konfirmasi, setKonfirmasi] = useState<TindakanKonfirmasi>(null);
  const [kodePresensi, setKodePresensi] = useState("");
  const [catatan, setCatatan] = useState("");
  const [errorKode, setErrorKode] = useState("");

  useEffect(() => {
    if (sesiStore) {
      setSesi(sesiStore);
      setCatatan(sesiStore.catatan ?? "");
      setKodePresensi(sesiStore.kodePresensi ?? "");

      // If opened but code not loaded yet, fetch from Firestore
      if (sesiStore.status === "dibuka" && !sesiStore.kodePresensi) {
        readDocument(firestoreRefs.kodePresensi(sesiStore.id)).then((doc) => {
          if (doc?.kode) {
            setSesi((curr) =>
              curr && curr.id === sesiStore.id
                ? { ...curr, kodePresensi: doc.kode }
                : curr,
            );
          }
        });
      }
    }
  }, [sesiStore]);

  function bukaForm() {
    setKodePresensi("");
    setCatatan(sesi?.catatan ?? "");
    setErrorKode("");
    setFormTerbuka(true);
  }

  function lanjutKonfirmasiBuka() {
    if (!/^\d{4}$/.test(kodePresensi)) {
      setErrorKode("Kode presensi harus terdiri dari 4 angka.");
      return;
    }

    setErrorKode("");
    setFormTerbuka(false);
    setKonfirmasi("buka");
  }

  async function jalankanKonfirmasi() {
    if (!sesi) return;

    if (konfirmasi === "buka") {
      const result = await buka(sesi.id, kodePresensi.trim(), catatan);
      if (!result.success) {
        setKonfirmasi(null);
        setFormTerbuka(true);
        setErrorKode(result.message);
        return;
      }
      setSesi((sesiSaatIni) =>
        sesiSaatIni
          ? {
              ...sesiSaatIni,
              status: "dibuka",
              kodePresensi: kodePresensi.trim(),
              catatan: catatan.trim(),
            }
          : null,
      );
    }

    if (konfirmasi === "tutup") {
      const result = await tutup(sesi.id);
      if (!result.success) {
        setErrorKode(result.message);
        setKonfirmasi(null);
        return;
      }
      setSesi((sesiSaatIni) =>
        sesiSaatIni ? { ...sesiSaatIni, status: "ditutup" } : null,
      );
    }

    setKonfirmasi(null);
  }

  function bukaRekap() {
    if (!sesi) return;
    router.push({
      pathname: "/asisten/rekap-sesi",
      params: { sesiId: sesi.id },
    });
  }

  const tombolKembali = (
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
  );

  if (!sesi) {
    return (
      <SafeAreaView edges={["top", "left", "right"]} style={styles.safeArea}>
        <View style={styles.page}>
          {tombolKembali}
          <View style={styles.heading}>
            <Text style={styles.eyebrow}>PENGELOLAAN SESI</Text>
            <Text style={styles.title}>Detail Sesi</Text>
          </View>
          <View style={styles.emptyContainer}>
            {storeLoading ? (
              <>
                <ActivityIndicator size="large" color={WARNA.primary} />
                <Text style={styles.loadingText}>Memuat detail sesi…</Text>
              </>
            ) : (
              <>
                <Text style={styles.emptyTitle}>Sesi tidak ditemukan</Text>
                <Text style={styles.emptyText}>
                  Sesi ini mungkin sudah dihapus atau belum tersedia di Cloud Firestore.
                </Text>
                <View style={{ marginTop: 16 }}>
                  <Tombol label="Kembali ke Jadwal" onPress={() => router.back()} />
                </View>
              </>
            )}
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const persentase =
    sesi.total > 0 ? Math.round((sesi.hadir / sesi.total) * 100) : 0;

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.page}
        showsVerticalScrollIndicator={false}
      >
        {tombolKembali}

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
            <Text style={styles.separator}> · </Text>
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

        {sesi.status === "dibuka" && !!sesi.kodePresensi && (
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
              {sesi.kodePresensi.split("").map((digit, index) => (
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
                  {" "}
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

        {sesi.status === "belum_dibuka" && (
          <View style={styles.actions}>
            <Tombol label="Buka Sesi" onPress={bukaForm} />
          </View>
        )}

        {sesi.status === "dibuka" && (
          <View style={styles.actions}>
            <Tombol label="Lihat Rekap" onPress={bukaRekap} />
            <Tombol
              label="Tutup Sesi"
              variant="danger"
              onPress={() => setKonfirmasi("tutup")}
            />
          </View>
        )}

        {sesi.status === "ditutup" && (
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
          behavior={Platform.OS === "ios" ? "padding" : undefined}
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

            <Text style={styles.sheetTitle}>Buka sesi praktikum</Text>
            <Text style={styles.sheetSubtitle}>
              Tentukan kode presensi 4 angka untuk sesi ini.
            </Text>

            <Text style={styles.inputLabel}>Kode presensi</Text>
            <TextInput
              value={kodePresensi}
              onChangeText={(value) => {
                setKodePresensi(value.replace(/\D/g, "").slice(0, 4));
                if (errorKode) setErrorKode("");
              }}
              keyboardType="number-pad"
              maxLength={4}
              placeholder="Contoh: 4827"
              placeholderTextColor={WARNA.textMuted}
              style={[
                styles.input,
                styles.codeInput,
                !!errorKode && styles.inputError,
              ]}
            />
            {!!errorKode && <Text style={styles.errorText}>{errorKode}</Text>}

            <Text style={styles.inputLabel}>Catatan (opsional)</Text>
            <TextInput
              value={catatan}
              onChangeText={setCatatan}
              placeholder="Misal: materi pengantar bab 3"
              placeholderTextColor={WARNA.textMuted}
              style={styles.input}
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
        <View style={styles.modalBackdrop}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Batalkan konfirmasi"
            onPress={() => setKonfirmasi(null)}
            style={StyleSheet.absoluteFill}
          />

          <View style={styles.confirmDialog}>
            <Text style={styles.confirmTitle}>
              {konfirmasi === "buka" ? "Buka sesi sekarang?" : "Tutup sesi?"}
            </Text>
            <Text style={styles.confirmDescription}>
              {konfirmasi === "buka"
                ? `Kode ${kodePresensi} akan diaktifkan untuk praktikan.`
                : "Praktikan tidak bisa melakukan presensi lagi setelah sesi ditutup."}
            </Text>

            <View style={styles.confirmActions}>
              <Tombol
                label="Batal"
                variant="outline"
                onPress={() => setKonfirmasi(null)}
              />
              <Tombol
                label={konfirmasi === "buka" ? "Buka Sesi" : "Tutup Sesi"}
                variant={konfirmasi === "tutup" ? "danger" : "primary"}
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
    padding: 24,
    paddingBottom: 40,
    gap: 16,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 64,
    paddingHorizontal: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: WARNA.textMuted,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: WARNA.text,
    marginBottom: 8,
    textAlign: "center",
  },
  emptyText: {
    fontSize: 14,
    color: WARNA.textMuted,
    textAlign: "center",
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingVertical: 6,
    paddingRight: 12,
    gap: 4,
  },
  backArrow: {
    fontSize: 22,
    color: WARNA.text,
    lineHeight: 22,
  },
  backLabel: {
    fontSize: 14,
    color: WARNA.text,
    fontWeight: "500",
  },
  heading: {
    gap: 4,
  },
  eyebrow: {
    fontSize: 11,
    letterSpacing: 1.5,
    fontWeight: "700",
    color: WARNA.textMuted,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: WARNA.text,
  },
  subtitle: {
    fontSize: 14,
    color: WARNA.textMuted,
  },
  sessionCard: {
    backgroundColor: WARNA.bg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: WARNA.border,
    padding: 20,
    gap: 8,
  },
  sessionCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  courseKicker: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.2,
    color: WARNA.textMuted,
  },
  courseName: {
    fontSize: 22,
    fontWeight: "700",
    color: WARNA.text,
  },
  meetingInfo: {
    fontSize: 14,
    color: WARNA.textMuted,
  },
  separator: {
    color: WARNA.border,
  },
  divider: {
    height: 1,
    backgroundColor: WARNA.border,
    marginVertical: 8,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    color: WARNA.textMuted,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: "600",
    color: WARNA.text,
  },
  topicBox: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: WARNA.border,
    gap: 4,
  },
  topicLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    color: WARNA.textMuted,
  },
  topicValue: {
    fontSize: 14,
    color: WARNA.text,
  },
  codeCard: {
    backgroundColor: WARNA.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: WARNA.border,
    padding: 20,
    gap: 16,
  },
  codeCardHeading: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  codeTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: WARNA.text,
  },
  codeHint: {
    fontSize: 12,
    color: WARNA.textMuted,
    marginTop: 2,
  },
  codeLiveMark: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: "rgba(53, 193, 194, 0.2)",
  },
  codeLiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: WARNA.primary,
  },
  codeLiveText: {
    fontSize: 10,
    fontWeight: "700",
    color: WARNA.text,
    letterSpacing: 0.8,
  },
  codeDigits: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
  },
  codeDigit: {
    width: 52,
    height: 64,
    borderRadius: 12,
    backgroundColor: WARNA.bg,
    borderWidth: 2,
    borderColor: WARNA.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  codeDigitText: {
    fontSize: 28,
    fontWeight: "700",
    color: WARNA.primary,
  },
  attendanceCard: {
    backgroundColor: WARNA.bg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: WARNA.border,
    padding: 20,
    gap: 12,
  },
  attendanceTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  attendanceLabel: {
    fontSize: 12,
    color: WARNA.textMuted,
    fontWeight: "500",
  },
  attendanceCount: {
    fontSize: 20,
    fontWeight: "700",
    color: WARNA.text,
    marginTop: 2,
  },
  attendanceTotal: {
    fontSize: 13,
    fontWeight: "400",
    color: WARNA.textMuted,
  },
  attendancePercent: {
    fontSize: 28,
    fontWeight: "700",
    color: WARNA.primary,
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: WARNA.soft,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: WARNA.primary,
    borderRadius: 4,
  },
  closedNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderRadius: 12,
    backgroundColor: WARNA.soft,
    borderWidth: 1,
    borderColor: WARNA.border,
  },
  closedMark: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: WARNA.text,
    alignItems: "center",
    justifyContent: "center",
  },
  closedMarkText: {
    color: WARNA.bg,
    fontSize: 14,
    fontWeight: "700",
  },
  closedCopy: {
    flex: 1,
  },
  closedTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: WARNA.text,
  },
  closedDescription: {
    fontSize: 12,
    color: WARNA.textMuted,
    marginTop: 2,
  },
  actions: {
    gap: 8,
    marginTop: 8,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: WARNA.primary,
  },
  badgeTextBase: {
    fontSize: 12,
    fontWeight: "600",
  },
  badgeBelumDibuka: {
    backgroundColor: WARNA.soft,
  },
  badgeDibuka: {
    backgroundColor: "rgba(208, 232, 110, 0.4)",
  },
  badgeDitutup: {
    backgroundColor: "rgba(23, 69, 74, 0.1)",
  },
  badgeText: {
    color: WARNA.text,
  },
  badgeTextDitutup: {
    color: WARNA.textMuted,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(23, 69, 74, 0.5)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: WARNA.bg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    gap: 12,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: WARNA.border,
    alignSelf: "center",
    marginBottom: 8,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: WARNA.text,
  },
  sheetSubtitle: {
    fontSize: 13,
    color: WARNA.textMuted,
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: WARNA.text,
  },
  input: {
    backgroundColor: WARNA.soft,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: WARNA.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: WARNA.text,
  },
  codeInput: {
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: 8,
    textAlign: "center",
  },
  inputError: {
    borderColor: WARNA.primary,
  },
  errorText: {
    fontSize: 12,
    color: WARNA.primary,
    marginTop: -4,
  },
  sheetActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  confirmDialog: {
    margin: 24,
    backgroundColor: WARNA.bg,
    borderRadius: 20,
    padding: 24,
    gap: 12,
  },
  confirmTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: WARNA.text,
  },
  confirmDescription: {
    fontSize: 14,
    color: WARNA.textMuted,
    lineHeight: 20,
  },
  confirmActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
});
