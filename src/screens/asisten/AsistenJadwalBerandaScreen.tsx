import { router } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
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
import { colors } from "../../constants/theme";
import {
  useAsistenWorkflowStore,
  type JadwalSiap,
  type SesiAsisten,
} from "./AsistenWorkflowStore";

type StatusSesi = SesiAsisten["status"];
type Sesi = SesiAsisten;

// Data yang ditampilkan kartu; dipenuhi oleh Sesi maupun JadwalSiap.
type InfoSesi = Pick<
  Sesi,
  "praktikum" | "pertemuanKe" | "kelas" | "lab" | "tanggal" | "jamMulai" | "jamSelesai"
>;

// Filter daftar sesi; sesi "dibuka" punya kartu sendiri di atas.
type FilterSesi = Exclude<StatusSesi, "dibuka">;

type Baris =
  | { tipe: "jadwal"; key: string; jadwal: JadwalSiap }
  | { tipe: "sesiBelum"; key: string; sesi: Sesi }
  | { tipe: "ditutup"; key: string; sesi: Sesi };

// Sesuaikan dengan route layar rekap yang ada di src/app/asisten/.
const RUTE_REKAP = "/asisten/rekap-sesi";

const WARNA = { ...colors, soft: "#F5F8F6" };

const LABEL_STATUS: Record<StatusSesi, string> = {
  belum_dibuka: "Belum dibuka",
  dibuka: "Dibuka",
  ditutup: "Ditutup",
};

const LABEL_FILTER: Record<FilterSesi, string> = {
  belum_dibuka: "Belum dibuka",
  ditutup: "Ditutup",
};

const TEKS_KOSONG: Record<FilterSesi, string> = {
  belum_dibuka: "Tidak ada jadwal aktif. Buat jadwal di Kelola data.",
  ditutup: "Belum ada sesi yang ditutup.",
};

function formatTanggal(tanggal?: string) {
  if (!tanggal || !tanggal.includes("-")) return tanggal || "-";
  const [tahun, bulan, hari] = tanggal.split("-").map(Number);
  const date = new Date(tahun, bulan - 1, hari);

  return date
    .toLocaleDateString("id-ID", {
      weekday: "short",
      day: "numeric",
      month: "short",
    })
    .replace(".", "");
}

function StatusBadge({ status }: { status: StatusSesi }) {
  return (
    <View style={[styles.statusBadge, styles[`status_${status}`]]}>
      {status === "dibuka" && <View style={styles.statusDot} />}
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
      <Text style={[styles.filterText, selected && styles.filterTextSelected]}>
        {label}
      </Text>
    </Pressable>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  keyboardType?: "default" | "numeric";
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={WARNA.textMuted}
        keyboardType={keyboardType}
        style={styles.input}
      />
    </View>
  );
}

/** Isi kartu yang sama untuk sesi belum dibuka dan ditutup. */
function IsiKartu({ info }: { info: InfoSesi }) {
  return (
    <>
      <Text style={styles.courseName}>{info.praktikum}</Text>
      <Text style={styles.sessionMeta}>
        Pertemuan {info.pertemuanKe}
        <Text style={styles.metaSeparator}> · </Text>
        Kelas {info.kelas}
      </Text>

      <View style={styles.infoDivider} />

      <View style={styles.infoGrid}>
        <View style={styles.infoBlock}>
          <Text style={styles.infoLabel}>WAKTU</Text>
          <Text style={styles.infoValue}>{formatTanggal(info.tanggal)}</Text>
          <Text style={styles.infoSubValue}>
            {info.jamMulai}–{info.jamSelesai}
          </Text>
        </View>

        <View style={styles.infoBlock}>
          <Text style={styles.infoLabel}>LOKASI</Text>
          <Text style={styles.infoValue}>Kelas {info.kelas}</Text>
          <Text style={styles.infoSubValue}>{info.lab}</Text>
        </View>
      </View>
    </>
  );
}

/** Sesi yang sedang dibuka: memakai gaya kartu ringkasan agar menonjol. */
function KartuDibuka({ sesi }: { sesi: Sesi }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Buka detail sesi yang sedang dibuka: ${sesi.praktikum}, pertemuan ${sesi.pertemuanKe}`}
      onPress={() =>
        router.push({
          pathname: "/asisten/detail-sesi",
          params: { sesiId: sesi.id },
        })
      }
      style={({ pressed }) => [
        styles.summaryCard,
        pressed && styles.sessionCardPressed,
      ]}
    >
      <View style={styles.summaryHeading}>
        <Text style={styles.summaryEyebrow}>SESI DIBUKA SAAT INI</Text>
        <Text style={styles.summaryPeriod}>Dibuka</Text>
      </View>

      <Text style={styles.summaryTitle}>{sesi.praktikum}</Text>
      <Text style={styles.summaryMeta}>
        Pertemuan {sesi.pertemuanKe} · Kelas {sesi.kelas}
      </Text>

      <View style={styles.summaryStats}>
        <View style={styles.summaryStat}>
          <Text style={styles.summaryValue}>
            {sesi.jamMulai}–{sesi.jamSelesai}
          </Text>
          <Text style={styles.summaryLabel}>Waktu</Text>
        </View>

        <View style={styles.summaryDivider} />

        <View style={styles.summaryStat}>
          <Text style={styles.summaryValue} numberOfLines={1}>
            {sesi.lab}
          </Text>
          <Text style={styles.summaryLabel}>Lokasi</Text>
        </View>

        <View style={styles.summaryDivider} />

        <View style={styles.summaryStat}>
          <Text style={styles.summaryValue}>
            {sesi.hadir}/{sesi.total}
          </Text>
          <Text style={styles.summaryLabel}>Hadir</Text>
        </View>
      </View>

      <View style={styles.summaryFooter}>
        <Text style={styles.summaryLink}>Lihat detail sesi</Text>
        <Text style={styles.summaryLink}>›</Text>
      </View>
    </Pressable>
  );
}

/** Kartu belum dibuka: hanya satu aksi, "Buka sesi". */
function KartuBelumDibuka({
  info,
  onBuka,
}: {
  info: InfoSesi;
  onBuka: () => void;
}) {
  return (
    <View style={styles.sessionCard}>
      <View style={styles.cardTopRow}>
        <Text style={styles.cardEyebrow}>SESI PRAKTIKUM</Text>
        <StatusBadge status="belum_dibuka" />
      </View>

      <IsiKartu info={info} />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Buka sesi ${info.praktikum}, pertemuan ${info.pertemuanKe}`}
        onPress={onBuka}
        style={({ pressed }) => [styles.openButton, pressed && styles.pressed]}
      >
        <Text style={styles.openButtonText}>Buka sesi</Text>
      </Pressable>
    </View>
  );
}

/** Kartu ditutup: ketuk untuk melihat rekap presensi sesi. */
function KartuDitutup({ sesi }: { sesi: Sesi }) {
  const persentase =
    sesi.total > 0 ? Math.round((sesi.hadir / sesi.total) * 100) : 0;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Lihat rekap ${sesi.praktikum}, pertemuan ${sesi.pertemuanKe}`}
      onPress={() =>
        router.push({
          pathname: RUTE_REKAP,
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
        <StatusBadge status="ditutup" />
      </View>

      <IsiKartu info={sesi} />

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
        <Text style={styles.detailLink}>Lihat rekap sesi</Text>
        <Text style={styles.detailArrow}>›</Text>
      </View>
    </Pressable>
  );
}

export default function AsistenJadwalBerandaScreen() {
  const { sesi, pengajuan, jadwalSiap, bukaSesiDariJadwal, loading, error } =
    useAsistenWorkflowStore();

  const [filter, setFilter] = useState<FilterSesi>("belum_dibuka");
  const [target, setTarget] = useState<JadwalSiap | null>(null);
  const [kode, setKode] = useState("");
  const [catatan, setCatatan] = useState("");
  const [galatForm, setGalatForm] = useState("");
  const [pesan, setPesan] = useState("");
  const [sibuk, setSibuk] = useState(false);

  // Normalnya hanya satu sesi dibuka, tetapi Rules tidak membatasinya,
  // jadi semua sesi berstatus dibuka ditampilkan.
  const sesiDibuka = useMemo(
    () => sesi.filter((item) => item.status === "dibuka"),
    [sesi],
  );

  const baris = useMemo<Baris[]>(() => {
    // Sesi belum_dibuka lama yang tidak punya jadwal aktif (data dari form
    // lama) tetap bisa dibuka lewat halaman detail sesi.
    const idJadwalSiap = new Set(jadwalSiap.map((j) => j.id));
    const sesiBelumTerpisah = sesi
      .filter(
        (item) =>
          item.status === "belum_dibuka" &&
          !(item.jadwalId && idJadwalSiap.has(item.jadwalId)),
      )
      .sort(
        (a, b) =>
          a.tanggal.localeCompare(b.tanggal) ||
          a.jamMulai.localeCompare(b.jamMulai),
      );

    const belumDibuka: Baris[] = [
      ...jadwalSiap.map(
        (jadwal): Baris => ({ tipe: "jadwal", key: `j-${jadwal.id}`, jadwal }),
      ),
      ...sesiBelumTerpisah.map(
        (item): Baris => ({ tipe: "sesiBelum", key: `b-${item.id}`, sesi: item }),
      ),
    ];

    // Terbaru di atas.
    const ditutup: Baris[] = sesi
      .filter((item) => item.status === "ditutup")
      .sort(
        (a, b) =>
          b.tanggal.localeCompare(a.tanggal) ||
          b.jamMulai.localeCompare(a.jamMulai),
      )
      .map(
        (item): Baris => ({ tipe: "ditutup", key: `t-${item.id}`, sesi: item }),
      );

    return filter === "belum_dibuka" ? belumDibuka : ditutup;
  }, [filter, jadwalSiap, sesi]);

  const jumlahIzinMenunggu = pengajuan.filter(
    (item) => item.status === "menunggu",
  ).length;

  function bukaForm(jadwal: JadwalSiap) {
    setTarget(jadwal);
    setKode("");
    setCatatan("");
    setGalatForm("");
    setPesan("");
  }

  async function bukaSesi() {
    if (!target || sibuk) return;
    if (!/^\d{4}$/.test(kode)) {
      setGalatForm("Kode presensi harus tepat 4 digit.");
      return;
    }
    setSibuk(true);
    const hasil = await bukaSesiDariJadwal(target.id, kode, catatan);
    setSibuk(false);
    if (!hasil.success) {
      setGalatForm(hasil.message);
      return;
    }
    setTarget(null);
    setPesan(hasil.message);
  }

  function renderBaris({ item }: { item: Baris }) {
    switch (item.tipe) {
      case "jadwal":
        return (
          <KartuBelumDibuka
            info={item.jadwal}
            onBuka={() => bukaForm(item.jadwal)}
          />
        );
      case "sesiBelum":
        return (
          <KartuBelumDibuka
            info={item.sesi}
            onBuka={() =>
              router.push({
                pathname: "/asisten/detail-sesi",
                params: { sesiId: item.sesi.id },
              })
            }
          />
        );
      case "ditutup":
        return <KartuDitutup sesi={item.sesi} />;
    }
  }

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
        <View style={styles.managementActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Kelola data praktikum, kelas, peserta, dan jadwal"
            onPress={() => router.push("/asisten/data")}
            style={({ pressed }) => [
              styles.manageDataButton,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.manageDataButtonText}>Kelola data</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Tinjau ${jumlahIzinMenunggu} pengajuan izin menunggu`}
            onPress={() => router.push("/asisten/izin")}
            style={({ pressed }) => [
              styles.manageDataButton,
              styles.reviewButton,
              pressed && styles.pressed,
            ]}
          >
            <Text
              style={[styles.manageDataButtonText, styles.reviewButtonText]}
            >
              Izin · {jumlahIzinMenunggu}
            </Text>
          </Pressable>
        </View>
      </View>

      {pesan ? (
        <Text accessibilityRole="alert" style={styles.notice}>
          {pesan}
        </Text>
      ) : null}

      {sesiDibuka.map((item) => (
        <KartuDibuka key={item.id} sesi={item} />
      ))}
      {!loading && !error && sesiDibuka.length === 0 ? (
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeading}>
            <Text style={styles.summaryEyebrow}>SESI DIBUKA SAAT INI</Text>
          </View>
          <Text style={styles.summaryEmpty}>Belum ada sesi yang dibuka.</Text>
        </View>
      ) : null}

      <View style={styles.listHeading}>
        <Text style={styles.listTitle}>Daftar sesi</Text>
        <Text style={styles.listSubtitle}>
          Pilih sesi untuk melihat informasi lengkap.
        </Text>
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
    <SafeAreaView edges={["top", "left", "right"]} style={styles.safeArea}>
      <FlatList
        data={loading || error ? [] : baris}
        keyExtractor={(item) => item.key}
        renderItem={renderBaris}
        ListHeaderComponent={header}
        ListEmptyComponent={
          loading ? (
            <View style={styles.emptyState}>
              <ActivityIndicator color={WARNA.primary} />
              <Text style={styles.emptyDescription}>Memuat jadwal sesi...</Text>
            </View>
          ) : error ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>Gagal memuat jadwal</Text>
              <Text style={styles.emptyDescription}>{error}</Text>
            </View>
          ) : (
            <View style={[styles.emptyState, styles.emptyStateCompact]}>
              <Text style={styles.emptyDescription}>{TEKS_KOSONG[filter]}</Text>
            </View>
          )
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      <Modal
        visible={!!target}
        transparent
        animationType="slide"
        onRequestClose={() => setTarget(null)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.modalBackdrop}
        >
          <View style={styles.formCard}>
            <View style={styles.modalHeading}>
              <View style={styles.modalHeadingText}>
                <Text style={styles.cardEyebrow}>BUKA SESI</Text>
                <Text style={styles.modalTitle}>
                  {target
                    ? `${target.praktikum} · Pertemuan ${target.pertemuanKe}`
                    : ""}
                </Text>
                <Text style={styles.sessionMeta}>
                  {target
                    ? `Kelas ${target.kelas} · ${target.jamMulai}–${target.jamSelesai}`
                    : ""}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Tutup"
                onPress={() => setTarget(null)}
              >
                <Text style={styles.modalClose}>×</Text>
              </Pressable>
            </View>

            <Field
              label="Kode presensi (4 digit)"
              value={kode}
              onChangeText={(value) =>
                setKode(value.replace(/\D/g, "").slice(0, 4))
              }
              placeholder="1234"
              keyboardType="numeric"
            />
            <Field
              label="Catatan (opsional)"
              value={catatan}
              onChangeText={setCatatan}
              placeholder="Topik pertemuan"
            />

            {galatForm ? (
              <Text accessibilityRole="alert" style={styles.formError}>
                {galatForm}
              </Text>
            ) : null}

            <View style={styles.modalActions}>
              <Pressable
                accessibilityRole="button"
                onPress={() => setTarget(null)}
                style={[styles.modalButton, styles.cancelButton]}
              >
                <Text style={styles.cancelText}>Batal</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                disabled={sibuk}
                onPress={bukaSesi}
                style={[
                  styles.modalButton,
                  styles.saveButton,
                  sibuk && styles.pressed,
                ]}
              >
                <Text style={styles.saveText}>
                  {sibuk ? "Membuka..." : "Buka sesi"}
                </Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    marginBottom: 24,
  },
  brandMark: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: WARNA.primary,
  },
  brandMarkText: {
    color: WARNA.surface,
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  brandName: {
    color: WARNA.textMuted,
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.15,
  },
  titleBlock: {
    marginBottom: 20,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  screenTitle: {
    flex: 1,
    color: WARNA.text,
    fontSize: 27,
    lineHeight: 33,
    fontWeight: "800",
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
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  screenSubtitle: {
    color: WARNA.textMuted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
  },
  manageDataButton: {
    alignSelf: "flex-start",
    minHeight: 38,
    justifyContent: "center",
    paddingHorizontal: 13,
    marginTop: 12,
    borderRadius: 11,
    backgroundColor: WARNA.primary,
  },
  managementActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  reviewButton: {
    backgroundColor: WARNA.highlight,
  },
  reviewButtonText: {
    color: WARNA.text,
  },
  manageDataButtonText: {
    color: WARNA.bg,
    fontSize: 12,
    fontWeight: "800",
  },
  notice: {
    color: WARNA.text,
    backgroundColor: WARNA.highlight,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginBottom: 14,
    fontSize: 12,
    fontWeight: "700",
  },
  summaryCard: {
    padding: 17,
    borderRadius: 20,
    backgroundColor: WARNA.text,
    marginBottom: 26,
  },
  summaryHeading: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  summaryEyebrow: {
    color: "rgba(254, 255, 224, 0.78)",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
  },
  summaryPeriod: {
    color: WARNA.text,
    backgroundColor: WARNA.highlight,
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 5,
    fontSize: 10,
    fontWeight: "700",
  },
  summaryTitle: {
    color: WARNA.surface,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  summaryMeta: {
    color: "rgba(254, 255, 224, 0.78)",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 3,
    marginBottom: 18,
  },
  summaryEmpty: {
    color: "rgba(254, 255, 224, 0.78)",
    fontSize: 13,
    lineHeight: 19,
  },
  summaryStats: {
    flexDirection: "row",
    alignItems: "center",
  },
  summaryStat: {
    flex: 1,
  },
  summaryValue: {
    color: WARNA.surface,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "800",
  },
  summaryLabel: {
    color: "rgba(254, 255, 224, 0.78)",
    fontSize: 10,
    lineHeight: 15,
    marginTop: 3,
  },
  summaryDivider: {
    width: 1,
    height: 38,
    backgroundColor: "rgba(254, 255, 224, 0.22)",
    marginHorizontal: 10,
  },
  summaryFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 5,
    marginTop: 16,
  },
  summaryLink: {
    color: WARNA.highlight,
    fontSize: 12,
    fontWeight: "700",
  },
  listHeading: {
    marginBottom: 14,
  },
  filters: {
    gap: 8,
    paddingBottom: 16,
  },
  filterButton: {
    minHeight: 36,
    justifyContent: "center",
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
    fontWeight: "700",
  },
  filterTextSelected: {
    color: WARNA.surface,
  },
  listTitle: {
    color: WARNA.text,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  listSubtitle: {
    color: WARNA.textMuted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 3,
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 12,
  },
  cardEyebrow: {
    color: WARNA.textMuted,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1,
  },
  statusBadge: {
    minHeight: 27,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
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
    fontWeight: "700",
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
    fontWeight: "800",
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
    fontWeight: "900",
  },
  infoDivider: {
    height: 1,
    backgroundColor: WARNA.border,
    marginVertical: 14,
  },
  infoGrid: {
    flexDirection: "row",
    gap: 12,
  },
  infoBlock: {
    flex: 1,
    minWidth: 0,
  },
  infoLabel: {
    color: WARNA.textMuted,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.9,
    marginBottom: 5,
  },
  infoValue: {
    color: WARNA.text,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "700",
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 7,
  },
  attendanceLabel: {
    color: WARNA.textMuted,
    fontSize: 11,
    fontWeight: "600",
  },
  attendanceCount: {
    color: WARNA.primary,
    fontSize: 12,
    fontWeight: "800",
  },
  attendanceTotal: {
    color: WARNA.textMuted,
    fontWeight: "600",
  },
  progressTrack: {
    height: 6,
    overflow: "hidden",
    borderRadius: 99,
    backgroundColor: WARNA.border,
  },
  progressFill: {
    height: "100%",
    borderRadius: 99,
    backgroundColor: WARNA.primary,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 5,
    marginTop: 14,
  },
  detailLink: {
    color: WARNA.primary,
    fontSize: 12,
    fontWeight: "700",
  },
  detailArrow: {
    color: WARNA.primary,
    fontSize: 20,
    lineHeight: 20,
    marginTop: -2,
  },
  openButton: {
    minHeight: 42,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
    borderRadius: 12,
    backgroundColor: WARNA.primary,
  },
  openButtonText: {
    color: WARNA.surface,
    fontSize: 13,
    fontWeight: "800",
  },
  emptyState: {
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 42,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: WARNA.border,
    backgroundColor: WARNA.soft,
  },
  emptyStateCompact: {
    paddingVertical: 22,
    marginBottom: 13,
  },
  emptyTitle: {
    color: WARNA.text,
    fontSize: 16,
    fontWeight: "800",
  },
  emptyDescription: {
    color: WARNA.textMuted,
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
    marginTop: 5,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.45)",
  },
  formCard: {
    padding: 20,
    paddingBottom: 28,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: WARNA.surface,
  },
  modalHeading: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 16,
  },
  modalHeadingText: {
    flex: 1,
  },
  modalTitle: {
    color: WARNA.text,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "800",
    letterSpacing: -0.2,
    marginTop: 4,
  },
  modalClose: {
    color: WARNA.text,
    fontSize: 28,
    lineHeight: 30,
  },
  field: {
    marginBottom: 13,
  },
  fieldLabel: {
    color: WARNA.textMuted,
    fontSize: 11,
    fontWeight: "700",
    marginBottom: 6,
  },
  input: {
    minHeight: 44,
    paddingHorizontal: 13,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: WARNA.border,
    backgroundColor: WARNA.bg,
    color: WARNA.text,
    fontSize: 14,
  },
  formError: {
    color: "#B4233F",
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 10,
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  modalButton: {
    flex: 1,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: WARNA.border,
    backgroundColor: WARNA.bg,
  },
  cancelText: {
    color: WARNA.text,
    fontSize: 12,
    fontWeight: "700",
  },
  saveButton: {
    backgroundColor: WARNA.primary,
  },
  saveText: {
    color: WARNA.surface,
    fontSize: 12,
    fontWeight: "800",
  },
});