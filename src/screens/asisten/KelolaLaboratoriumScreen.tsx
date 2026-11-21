import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  BackHandler,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import PetaLab from "@/components/peta/PetaLab";
import { colors } from "@/constants/theme";
import type {
  Koordinat,
  LaboratoriumDoc,
  TitikKoordinat,
} from "@/data/lokasi";
import { useAuth } from "@/hooks/useAuth";
import { useLokasi } from "@/hooks/useLokasi";
import {
  pantauLaboratorium,
  perbaruiLaboratorium,
  type WithId,
} from "@/services/firebase/firestore";

// Kelola Laboratorium (B1). Lab bersifat tetap: tidak ada tambah/hapus.
// Asisten hanya mengubah koordinat (lat/lng) dan radius presensi.
// Nama, deskripsi, dan status aktif tidak bisa diubah dari layar ini.
// cosLat dihitung oleh perbaruiLaboratorium() saat lat dikirim.

type LabData = WithId<LaboratoriumDoc>;

const RADIUS_MIN = 25;
const RADIUS_MAKS = 500;
const RADIUS_PRESET = [50, 100, 150, 250, 500];
const AKURASI_MAKS = 50;
const BATAS_WAKTU_SIMPAN_MS = 10_000;

function pesanGalatFirestore(error: unknown) {
  const code =
    typeof error === "object" && error && "code" in error
      ? String((error as { code?: unknown }).code)
      : "unknown";
  if (code.includes("permission-denied"))
    return "Akses ditolak oleh Rules. Pastikan Anda login sebagai Asisten.";
  if (code.includes("unavailable") || code.includes("network"))
    return "Tidak ada koneksi ke Firestore. Periksa jaringan lalu coba lagi.";
  return `Operasi Firestore gagal (${code}).`;
}

function parseRadius(teks: string): number | null {
  const bersih = teks.trim();
  if (!/^\d{1,4}$/.test(bersih)) return null;
  return Number(bersih);
}

function formatKoordinat(lat: number, lng: number) {
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}

function teksAkurasi(akurasi: number) {
  return akurasi >= 100_000 ? "tidak tersedia" : `±${Math.round(akurasi)} m`;
}

export default function KelolaLaboratoriumScreen() {
  const { user, role } = useAuth();
  const { status, koordinat, mintaIzin, segarkan } = useLokasi();

//   const [labList, setLabList] = useState<LabData[]>([]);
//   const [memuat, setMemuat] = useState(true);
//   const [galatMuat, setGalatMuat] = useState("");
//   const [muatUlang, setMuatUlang] = useState(0);
  const [feedback, setFeedback] = useState("");

  // editor
  const [labDieditId, setLabDieditId] = useState<string | null>(null);
  const [titik, setTitik] = useState<TitikKoordinat | null>(null);
  const [radiusTeks, setRadiusTeks] = useState("");
  const [lokasiDiminta, setLokasiDiminta] = useState(false);
  const [menungguLokasi, setMenungguLokasi] = useState(false);
  const [peringatan, setPeringatan] = useState("");
  const [galatForm, setGalatForm] = useState("");
  const [menyimpan, setMenyimpan] = useState(false);

  // Pantau semua lab (Rules: Asisten boleh membaca semua lab).
    const [muatUlang, setMuatUlang] = useState(0);
    const [hasilLab, setHasilLab] = useState<{
    kunci: number;
    items: LabData[];
    galat: string;
    } | null>(null);

    const aktifMuat = role === "asisten" && !!user;
    const sudahMuat = hasilLab?.kunci === muatUlang;
    const memuat = aktifMuat && !sudahMuat;
    const labList = hasilLab?.items ?? [];
    const galatMuat = sudahMuat ? hasilLab.galat : "";

    useEffect(() => {
    if (!aktifMuat) return undefined;
    return pantauLaboratorium(
        (items) => setHasilLab({ kunci: muatUlang, items, galat: "" }),
        (reason) =>
        setHasilLab({ kunci: muatUlang, items: [], galat: pesanGalatFirestore(reason) }),
    );
    }, [aktifMuat, muatUlang]);

  const labUrut = useMemo(
    () => [...labList].sort((a, b) => a.nama.localeCompare(b.nama, "id-ID")),
    [labList],
  );

  const labDiedit = labDieditId
    ? (labList.find((lab) => lab.id === labDieditId) ?? null)
    : null;

  // Tombol Back Android menutup editor lebih dulu, bukan keluar dari layar.
  useEffect(() => {
    if (!labDieditId) return undefined;
    const langganan = BackHandler.addEventListener("hardwareBackPress", () => {
      setLabDieditId(null);
      setMenungguLokasi(false);
      return true;
    });
    return () => langganan.remove();
  }, [labDieditId]);

  const terapkanKoordinat = useCallback((k: Koordinat) => {
    if (k.mocked) {
      setGalatForm(
        "Lokasi terdeteksi sebagai lokasi palsu (mock). Pilih titik langsung di peta.",
      );
      return;
    }
    setTitik({ lat: k.lat, lng: k.lng });
    setGalatForm("");
    setPeringatan(
      k.akurasi > AKURASI_MAKS
        ? `Akurasi lokasi ${teksAkurasi(k.akurasi)} (lebih buruk dari ${AKURASI_MAKS} m). Periksa marker di peta dan geser bila perlu.`
        : "",
    );
  }, []);

    // Hasil useLokasi() setelah "Gunakan lokasi saya" ditekan. Disesuaikan saat
    // render (bukan di efek) agar tidak memicu render berantai.
    if (menungguLokasi) {
    if (status === "siap" && koordinat) {
        setMenungguLokasi(false);
        terapkanKoordinat(koordinat);
    } else if (
        status === "izin_ditolak" ||
        status === "layanan_mati" ||
        status === "galat"
    ) {
        setMenungguLokasi(false);
    }
    }

  const radiusAngka = parseRadius(radiusTeks);
  const radiusPratinjau =
    radiusAngka !== null && radiusAngka >= RADIUS_MIN && radiusAngka <= RADIUS_MAKS
      ? radiusAngka
      : undefined;

  // Titik baru belum dipilih: lingkaran lab mengikuti radius yang diketik.
  // Titik baru sudah dipilih: lingkaran lama tetap, pratinjau baru digambar PetaLab.
  const daftarLabPeta = useMemo(
    () =>
      labDiedit
        ? [
            {
              id: labDiedit.id,
              nama: labDiedit.nama,
              lat: labDiedit.lat,
              lng: labDiedit.lng,
              aktif: labDiedit.aktif,
              radiusMeter:
                titik === null && radiusPratinjau !== undefined
                  ? radiusPratinjau
                  : labDiedit.radiusMeter,
            },
          ]
        : [],
    [labDiedit, titik, radiusPratinjau],
  );

  function bukaEditor(lab: LabData) {
    setLabDieditId(lab.id);
    setTitik(null);
    setRadiusTeks(String(lab.radiusMeter));
    setPeringatan("");
    setGalatForm("");
    setMenungguLokasi(false);
    setFeedback("");
  }

  function tutupEditor() {
    setLabDieditId(null);
    setMenungguLokasi(false);
    setPeringatan("");
    setGalatForm("");
  }

  function gunakanLokasiSaya() {
    setGalatForm("");
    setPeringatan("");
    setLokasiDiminta(true);
    if (status === "siap" && koordinat) {
      terapkanKoordinat(koordinat);
      return;
    }
    setMenungguLokasi(true);
    void mintaIzin();
  }

  function pilihTitik(titikBaru: TitikKoordinat) {
    setTitik(titikBaru);
    setPeringatan("");
    setGalatForm("");
  }

  async function simpan() {
    if (!labDiedit) return;

    if (radiusAngka === null) {
      setGalatForm("Radius harus berupa angka bulat dalam meter.");
      return;
    }
    if (radiusAngka < RADIUS_MIN || radiusAngka > RADIUS_MAKS) {
      setGalatForm(`Radius harus antara ${RADIUS_MIN} dan ${RADIUS_MAKS} m.`);
      return;
    }

    const lat = titik?.lat ?? labDiedit.lat;
    const lng = titik?.lng ?? labDiedit.lng;
    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      lat < -90 ||
      lat > 90 ||
      lng < -180 ||
      lng > 180
    ) {
      setGalatForm("Koordinat tidak valid. Pilih ulang titik di peta.");
      return;
    }
    if (
      lat === labDiedit.lat &&
      lng === labDiedit.lng &&
      radiusAngka === labDiedit.radiusMeter
    ) {
      setGalatForm("Tidak ada perubahan untuk disimpan.");
      return;
    }

    setMenyimpan(true);
    setGalatForm("");
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      // Saat offline, promise Firestore tidak selesai sampai server menjawab.
      // Batas waktu agar layar tidak menggantung.
      const tunda = new Promise<"tunda">((resolve) => {
        timer = setTimeout(() => resolve("tunda"), BATAS_WAKTU_SIMPAN_MS);
      });
      const hasil = await Promise.race([
        perbaruiLaboratorium(labDiedit.id, {
          lat,
          lng,
          radiusMeter: radiusAngka,
        }).then(() => "ok" as const),
        tunda,
      ]);
      if (hasil === "tunda") {
        setGalatForm(
          "Belum ada konfirmasi dari server. Perangkat mungkin offline; perubahan akan terkirim otomatis saat koneksi pulih. Periksa kembali sebelum menutup.",
        );
        return;
      }
      setFeedback(
        `Lokasi dan radius ${labDiedit.nama} diperbarui. Perubahan langsung berlaku untuk presensi berikutnya.`,
      );
      tutupEditor();
    } catch (reason) {
      setGalatForm(pesanGalatFirestore(reason));
    } finally {
      if (timer) clearTimeout(timer);
      setMenyimpan(false);
    }
  }

  // ---------------- Daftar lab ----------------
  if (!labDiedit) {
    return (
      <SafeAreaView edges={["top", "left", "right"]} style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content}>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.back()}
            style={styles.back}
          >
            <Text style={styles.backArrow}>‹</Text>
            <Text style={styles.backText}>Kembali</Text>
          </Pressable>
          <Text style={styles.eyebrow}>AREA ASISTEN</Text>
          <Text style={styles.title}>Kelola Laboratorium</Text>
          <Text style={styles.subtitle}>
            Atur titik dan radius presensi tiap laboratorium. Perubahan langsung
            dipakai untuk validasi presensi berikutnya.
          </Text>

          {feedback ? (
            <Text accessibilityRole="alert" style={styles.feedback}>
              {feedback}
            </Text>
          ) : null}

          {memuat ? (
            <View style={styles.state}>
              <ActivityIndicator color={colors.primary} />
              <Text style={styles.helper}>Memuat laboratorium...</Text>
            </View>
          ) : galatMuat ? (
            <View style={styles.state}>
              <Text style={styles.emptyTitle}>Gagal memuat</Text>
              <Text style={styles.helper}>{galatMuat}</Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => setMuatUlang((n) => n + 1)}
                style={styles.actionButton}
              >
                <Text style={styles.actionText}>Coba lagi</Text>
              </Pressable>
            </View>
          ) : labUrut.length === 0 ? (
            <View style={styles.state}>
              <Text style={styles.emptyTitle}>Belum ada laboratorium</Text>
              <Text style={styles.helper}>
                Data laboratorium belum tersedia. Hubungi tim pengembang.
              </Text>
            </View>
          ) : (
            labUrut.map((lab) => (
              <View key={lab.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardCopy}>
                    <Text style={styles.cardTitle}>{lab.nama}</Text>
                    {lab.deskripsi ? (
                      <Text style={styles.cardDetail}>{lab.deskripsi}</Text>
                    ) : null}
                  </View>
                  <Text
                    style={[
                      styles.badge,
                      lab.aktif ? styles.badgeActive : styles.badgeInactive,
                    ]}
                  >
                    {lab.aktif ? "Aktif" : "Nonaktif"}
                  </Text>
                </View>
                <Text style={styles.cardDetail}>
                  Koordinat {formatKoordinat(lab.lat, lab.lng)}
                </Text>
                <Text style={styles.cardDetail}>
                  Radius presensi {lab.radiusMeter} m
                </Text>
                <View style={styles.cardActions}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => bukaEditor(lab)}
                    style={styles.actionButton}
                  >
                    <Text style={styles.actionText}>Ubah lokasi dan radius</Text>
                  </Pressable>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ---------------- Editor satu lab ----------------
  return (
    <SafeAreaView edges={["top", "left", "right"]} style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.editor}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.editorHeader}>
          <Pressable
            accessibilityRole="button"
            onPress={tutupEditor}
            style={styles.back}
          >
            <Text style={styles.backArrow}>‹</Text>
            <Text style={styles.backText}>Batal</Text>
          </Pressable>
          <Text style={styles.editorTitle} numberOfLines={1}>
            {labDiedit.nama}
          </Text>
        </View>

        <PetaLab
          style={styles.peta}
          daftarLab={daftarLabPeta}
          labTerpilihId={labDiedit.id}
          titikPilihan={titik}
          radiusPratinjau={radiusPratinjau}
          onPilihTitik={pilihTitik}
          koordinatPengguna={lokasiDiminta ? koordinat : null}
          statusLokasi={lokasiDiminta ? status : undefined}
          onMintaIzin={mintaIzin}
          onSegarkan={segarkan}
        />

        <ScrollView
          style={styles.panel}
          contentContainerStyle={styles.panelIsi}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.helper}>
            Saat ini: {formatKoordinat(labDiedit.lat, labDiedit.lng)} · radius{" "}
            {labDiedit.radiusMeter} m
          </Text>
          <Text style={styles.panelTeks}>
            {titik
              ? `Titik baru: ${formatKoordinat(titik.lat, titik.lng)}`
              : "Titik baru belum dipilih. Ketuk peta atau seret marker; tanpa memilih, titik lama tetap dipakai."}
          </Text>

          <Pressable
            accessibilityRole="button"
            disabled={menungguLokasi}
            onPress={gunakanLokasiSaya}
            style={[styles.tombolSekunder, menungguLokasi && styles.mati]}
          >
            {menungguLokasi ? (
              <ActivityIndicator size="small" color={colors.text} />
            ) : null}
            <Text style={styles.tombolSekunderTeks}>
              {menungguLokasi ? "Mencari lokasi..." : "Gunakan lokasi saya"}
            </Text>
          </Pressable>

          {peringatan ? (
            <Text style={styles.peringatan}>{peringatan}</Text>
          ) : null}

          <Text style={styles.label}>
            Radius presensi (m), {RADIUS_MIN}–{RADIUS_MAKS}
          </Text>
          <TextInput
            accessibilityLabel="Radius presensi dalam meter"
            value={radiusTeks}
            onChangeText={(teks) => {
              setRadiusTeks(teks);
              setGalatForm("");
            }}
            keyboardType="numeric"
            placeholder="100"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
          />
          <View style={styles.preset}>
            {RADIUS_PRESET.map((nilai) => (
              <Pressable
                key={nilai}
                accessibilityRole="button"
                accessibilityState={{ selected: radiusAngka === nilai }}
                onPress={() => {
                  setRadiusTeks(String(nilai));
                  setGalatForm("");
                }}
                style={[
                  styles.chip,
                  radiusAngka === nilai && styles.chipTerpilih,
                ]}
              >
                <Text
                  style={[
                    styles.chipTeks,
                    radiusAngka === nilai && styles.chipTeksTerpilih,
                  ]}
                >
                  {nilai} m
                </Text>
              </Pressable>
            ))}
          </View>

          {galatForm ? <Text style={styles.galat}>{galatForm}</Text> : null}

          <View style={styles.baris}>
            <Pressable
              accessibilityRole="button"
              onPress={tutupEditor}
              style={[styles.tombol, styles.batal]}
            >
              <Text style={styles.batalTeks}>Batal</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={menyimpan}
              onPress={simpan}
              style={[styles.tombol, styles.simpan, menyimpan && styles.mati]}
            >
              <Text style={styles.simpanTeks}>
                {menyimpan ? "Menyimpan..." : "Simpan"}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingBottom: 40 },
  back: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginBottom: 18,
  },
  backArrow: { color: colors.primary, fontSize: 28 },
  backText: { color: colors.text, fontWeight: "700" },
  eyebrow: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
  },
  title: { color: colors.text, fontSize: 28, fontWeight: "800", marginTop: 6 },
  subtitle: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 5,
    marginBottom: 18,
    lineHeight: 19,
  },
  feedback: {
    color: colors.text,
    backgroundColor: colors.highlight,
    padding: 11,
    borderRadius: 10,
    fontSize: 12,
    marginBottom: 12,
  },
  state: {
    alignItems: "center",
    padding: 32,
    backgroundColor: colors.surface,
    borderRadius: 13,
    gap: 8,
  },
  emptyTitle: { color: colors.text, fontSize: 15, fontWeight: "800" },
  helper: { color: colors.textMuted, fontSize: 12, lineHeight: 17 },
  card: {
    padding: 14,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    marginBottom: 10,
    gap: 4,
  },
  cardHeader: { flexDirection: "row", gap: 8, alignItems: "flex-start" },
  cardCopy: { flex: 1 },
  cardTitle: { color: colors.text, fontSize: 14, fontWeight: "800" },
  cardDetail: { color: colors.textMuted, fontSize: 12, marginTop: 3 },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    fontSize: 10,
    fontWeight: "800",
  },
  badgeActive: { backgroundColor: colors.highlight, color: colors.text },
  badgeInactive: { backgroundColor: colors.border, color: colors.textMuted },
  cardActions: { flexDirection: "row", gap: 8, marginTop: 10 },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 9,
    backgroundColor: colors.text,
  },
  actionText: { color: colors.bg, fontSize: 11, fontWeight: "700" },

  editor: { flex: 1 },
  editorHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 6,
  },
  editorTitle: {
    flex: 1,
    color: colors.text,
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 18,
  },
  peta: { flex: 1, minHeight: 200 },
  panel: {
    flexGrow: 0,
    maxHeight: "48%",
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.bg,
  },
  panelIsi: { padding: 16, gap: 10 },
  panelTeks: { color: colors.text, fontSize: 13, lineHeight: 19 },
  label: { color: colors.text, fontSize: 12, fontWeight: "700" },
  input: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    color: colors.text,
  },
  preset: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  chip: {
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 9,
  },
  chipTerpilih: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipTeks: { color: colors.textMuted, fontSize: 11, fontWeight: "700" },
  chipTeksTerpilih: { color: colors.bg },
  tombolSekunder: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tombolSekunderTeks: { color: colors.text, fontWeight: "700", fontSize: 13 },
  peringatan: {
    color: "#92400E",
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FCD34D",
    borderRadius: 10,
    padding: 10,
    fontSize: 12,
    lineHeight: 17,
  },
  galat: { color: colors.primary, fontSize: 12, lineHeight: 17 },
  baris: { flexDirection: "row", gap: 9, marginTop: 4 },
  tombol: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
    borderRadius: 10,
  },
  batal: { borderWidth: 1, borderColor: colors.border },
  batalTeks: { color: colors.text, fontWeight: "700" },
  simpan: { backgroundColor: colors.primary },
  simpanTeks: { color: colors.bg, fontWeight: "800" },
  mati: { opacity: 0.5 },
});