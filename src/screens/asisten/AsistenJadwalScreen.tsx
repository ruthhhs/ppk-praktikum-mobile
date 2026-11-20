import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "../../constants/theme";
import type {
  JadwalDoc,
  KelasDoc,
  PraktikumDoc,
} from "../../data/firestoreType";
import { useAuth } from "../../hooks/useAuth";
import {
  addDocument,
  firestoreRefs,
  listenCollection,
  serverTimestamp,
  tambahPeserta,
  updateDocument,
} from "../../services/firebase/firestore";
import { useDaftarPraktikan } from "./useDaftarPraktikan";

// Peserta tidak lagi menjadi tab sendiri: peserta adalah anak dari kelas
// dan dikelola lewat tombol "Peserta" pada kartu kelas.
type DataKind = "praktikum" | "kelas" | "jadwal";
type RecordItem = { id: string; aktif: boolean };
type PraktikumData = RecordItem & Pick<PraktikumDoc, "nama" | "deskripsi">;
type KelasData = RecordItem &
  Pick<KelasDoc, "nama" | "praktikumId" | "asistenUids">;
type PesertaData = RecordItem & { uid: string; nama: string; nim?: string };
type JadwalData = RecordItem & Omit<JadwalDoc, "aktif">;
type Choice = { id: string; label: string };

type Draft = {
  nama: string;
  deskripsi: string;
  praktikumId: string;
  kelasId: string;
  pertemuanKe: string;
  tanggal: string;
  jamMulai: string;
  jamSelesai: string;
  lokasi: string;
};

// Rules melarang delete pada praktikum, kelas, dan jadwal.
// Satu-satunya "hapus" yang sah adalah menonaktifkan (aktif: false).
type PendingAction = {
  kind: DataKind;
  id: string;
  mode: "nonaktifkan" | "aktifkan";
};

const TABS: { id: DataKind; label: string }[] = [
  { id: "praktikum", label: "Praktikum" },
  { id: "kelas", label: "Kelas" },
  { id: "jadwal", label: "Jadwal" },
];

const emptyDraft: Draft = {
  nama: "",
  deskripsi: "",
  praktikumId: "",
  kelasId: "",
  pertemuanKe: "",
  tanggal: "",
  jamMulai: "",
  jamSelesai: "",
  lokasi: "",
};

// Lab tetap (lokasi tetap disimpan sebagai teks di jadwal pada Sprint 2).
const LAB_CHOICES: Choice[] = ["Lab B", "Lab C", "Lab D", "Lab AP"].map(
  (lab) => ({ id: lab, label: lab }),
);

const HARI = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
const BULAN = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
];

// Pilihan tanggal beberapa hari ke depan (Asia/Jakarta = UTC+7, tanpa DST).
function buatPilihanTanggal(jumlah = 21): Choice[] {
  const base = Date.now() + 7 * 60 * 60 * 1000;
  return Array.from({ length: jumlah }, (_, i) => {
    const d = new Date(base + i * 24 * 60 * 60 * 1000);
    return {
      id: d.toISOString().slice(0, 10),
      label: `${HARI[d.getUTCDay()]} ${d.getUTCDate()} ${BULAN[d.getUTCMonth()]}`,
    };
  });
}

// Slot jam tiap 30 menit, 07:00 sampai 20:00.
const JAM_CHOICES: Choice[] = (() => {
  const out: Choice[] = [];
  for (let h = 7; h <= 20; h++) {
    const jam = String(h).padStart(2, "0");
    out.push({ id: `${jam}:00`, label: `${jam}:00` });
    if (h < 20) out.push({ id: `${jam}:30`, label: `${jam}:30` });
  }
  return out;
})();

// Pastikan nilai yang sedang dipilih (misalnya data lama) tetap muncul sebagai pilihan.
function withCurrent(
  choices: Choice[],
  current: string,
  sortById = false,
): Choice[] {
  if (!current || choices.some((c) => c.id === current)) return choices;
  const merged = [{ id: current, label: current }, ...choices];
  return sortById ? merged.sort((a, b) => a.id.localeCompare(b.id)) : merged;
}

function isValidDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function errorMessage(error: unknown) {
  const code =
    typeof error === "object" && error && "code" in error
      ? String(error.code)
      : "unknown";
  if (code.includes("permission-denied"))
    return "Akses Firestore ditolak oleh Rules.";
  if (code.includes("unavailable"))
    return "Firestore tidak tersedia. Periksa koneksi internet.";
  return `Operasi Firestore gagal (${code}).`;
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
        placeholderTextColor={colors.textMuted}
        keyboardType={keyboardType}
        style={styles.input}
      />
    </View>
  );
}

function ChoiceChips({
  label,
  choices,
  selectedId,
  onSelect,
  horizontal,
  emptyText = "Belum ada data induk.",
}: {
  label: string;
  choices: Choice[];
  selectedId: string;
  onSelect: (id: string) => void;
  horizontal?: boolean;
  emptyText?: string;
}) {
  const chips = choices.map((choice) => (
    <Pressable
      key={choice.id}
      accessibilityRole="button"
      accessibilityState={{ selected: choice.id === selectedId }}
      onPress={() => onSelect(choice.id)}
      style={[styles.choice, choice.id === selectedId && styles.choiceSelected]}
    >
      <Text
        style={[
          styles.choiceText,
          choice.id === selectedId && styles.choiceTextSelected,
        ]}
      >
        {choice.label}
      </Text>
    </Pressable>
  ));

  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {choices.length ? (
        horizontal ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipScroll}
          >
            {chips}
          </ScrollView>
        ) : (
          <View style={styles.choiceList}>{chips}</View>
        )
      ) : (
        <Text style={styles.helper}>{emptyText}</Text>
      )}
    </View>
  );
}

type CardAction = { label: string; onPress: () => void; secondary?: boolean };

function RecordCard({
  title,
  detail,
  aktif,
  actions,
}: {
  title: string;
  detail: string;
  aktif: boolean;
  actions: CardAction[];
}) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardCopy}>
          <Text style={styles.cardTitle}>{title}</Text>
          <Text style={styles.cardDetail}>{detail}</Text>
        </View>
        <Text
          style={[
            styles.badge,
            aktif ? styles.badgeActive : styles.badgeInactive,
          ]}
        >
          {aktif ? "Aktif" : "Nonaktif"}
        </Text>
      </View>
      <View style={styles.cardActions}>
        {actions.map((action) => (
          <Pressable
            key={action.label}
            accessibilityRole="button"
            onPress={action.onPress}
            style={[
              styles.actionButton,
              action.secondary && styles.secondaryAction,
            ]}
          >
            <Text
              style={[
                styles.actionText,
                action.secondary && styles.secondaryActionText,
              ]}
            >
              {action.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export default function AsistenKelolaDataScreen() {
  const { user, role } = useAuth();
  const uid = user?.uid;
  const {
    petaByUid,
    loading: loadingPraktikan,
    error: errorPraktikan,
    muat: muatPraktikan,
  } = useDaftarPraktikan(role === "asisten");

  const [kind, setKind] = useState<DataKind>("praktikum");
  const [praktikum, setPraktikum] = useState<PraktikumData[]>([]);
  const [kelas, setKelas] = useState<KelasData[]>([]);
  const [jadwal, setJadwal] = useState<JadwalData[]>([]);
  const [pesertaByKelas, setPesertaByKelas] = useState<
    Record<string, PesertaData[]>
  >({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [search, setSearch] = useState("");

  // form praktikum / kelas / jadwal
  const [formOpen, setFormOpen] = useState(false);
  const [formKind, setFormKind] = useState<DataKind>("praktikum");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [formError, setFormError] = useState("");

  // konfirmasi aktif/nonaktif
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(
    null,
  );
  const [confirmError, setConfirmError] = useState("");

  // peserta di dalam kelas
  const [pesertaKelasId, setPesertaKelasId] = useState<string | null>(null);
  const [addMode, setAddMode] = useState(false);
  const [selectedUids, setSelectedUids] = useState<string[]>([]);
  const [pesertaSearch, setPesertaSearch] = useState("");
  const [pesertaMsg, setPesertaMsg] = useState("");

  const [busy, setBusy] = useState(false);

  const tanggalChoices = useMemo(() => buatPilihanTanggal(21), []);

  // 1. Koleksi induk. Rules mengizinkan semua Asisten membacanya.
  useEffect(() => {
    if (role !== "asisten" || !user) {
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    setError("");
    const unsubscribers: (() => void)[] = [];

    const onError = (reason: unknown) => {
      setError(errorMessage(reason));
      setLoading(false);
    };

    unsubscribers.push(
      listenCollection(
        firestoreRefs.praktikum(),
        (items) => {
          setPraktikum(
            items.map((item) => ({
              id: item.id,
              nama: item.nama,
              deskripsi: item.deskripsi,
              aktif: item.aktif,
            })),
          );
          setLoading(false);
        },
        onError,
      ),
    );
    unsubscribers.push(
      listenCollection(
        firestoreRefs.kelas(),
        (items) => setKelas(items.map((item) => ({ ...item }))),
        onError,
      ),
    );
    unsubscribers.push(
      listenCollection(
        firestoreRefs.jadwal(),
        (items) => setJadwal(items.map((item) => ({ ...item }))),
        onError,
      ),
    );

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [role, user]);

  // Kelas yang boleh dikelola = kelas yang UID-nya ada di asistenUids (syarat Rules).
  const kelasSaya = useMemo(
    () =>
      uid
        ? kelas.filter(
            (k) => Array.isArray(k.asistenUids) && k.asistenUids.includes(uid),
          )
        : [],
    [kelas, uid],
  );
  const kelasSayaIdKey = useMemo(
    () =>
      kelasSaya
        .map((k) => k.id)
        .sort()
        .join(","),
    [kelasSaya],
  );
  const kelasSayaIds = useMemo(
    () => new Set(kelasSaya.map((k) => k.id)),
    [kelasSaya],
  );

  // 2. Peserta hanya untuk kelas milik saya (subkoleksi peserta dibatasi Rules).
  useEffect(() => {
    if (!kelasSayaIdKey) {
      setPesertaByKelas({});
      return undefined;
    }

    const unsubs = kelasSayaIdKey.split(",").map((kelasId) =>
      listenCollection(
        firestoreRefs.peserta(kelasId),
        (items) =>
          setPesertaByKelas((prev) => ({
            ...prev,
            [kelasId]: items.map((p) => ({
              id: p.id,
              uid: p.uid,
              nama: p.nama,
              nim: p.nim,
              aktif: p.aktif,
            })),
          })),
        (reason) => setError(errorMessage(reason)),
      ),
    );

    return () => {
      unsubs.forEach((unsub) => unsub());
    };
  }, [kelasSayaIdKey]);

  const jadwalSaya = useMemo(
    () =>
      jadwal
        .filter((item) => kelasSayaIds.has(item.kelasId))
        .sort((a, b) =>
          `${a.tanggal} ${a.jamMulai}`.localeCompare(
            `${b.tanggal} ${b.jamMulai}`,
          ),
        ),
    [jadwal, kelasSayaIds],
  );

  function namaPraktikum(praktikumId: string) {
    return (
      praktikum.find((course) => course.id === praktikumId)?.nama ??
      "Praktikum tidak ditemukan"
    );
  }
  function namaKelas(kelasId: string) {
    return kelas.find((item) => item.id === kelasId)?.nama ?? "-";
  }
  function jumlahPesertaAktif(kelasId: string) {
    return (pesertaByKelas[kelasId] ?? []).filter((p) => p.aktif).length;
  }

  const classChoices = useMemo<Choice[]>(
    () =>
      kelasSaya
        .filter((item) => item.aktif)
        .map((item) => ({
          id: item.id,
          label: `${item.nama} · ${praktikum.find((course) => course.id === item.praktikumId)?.nama ?? "Praktikum"}`,
        })),
    [kelasSaya, praktikum],
  );

  const q = search.trim().toLocaleLowerCase("id-ID");
  const cocok = (text: string) => text.toLocaleLowerCase("id-ID").includes(q);

  const praktikumFiltered = praktikum.filter((item) =>
    cocok(`${item.nama} ${item.deskripsi}`),
  );
  const kelasFiltered = kelasSaya.filter((item) =>
    cocok(`${item.nama} ${namaPraktikum(item.praktikumId)}`),
  );
  const jadwalFiltered = jadwalSaya.filter((item) =>
    cocok(`${item.tanggal} ${item.lokasi} ${namaKelas(item.kelasId)}`),
  );

  const filteredCount =
    kind === "praktikum"
      ? praktikumFiltered.length
      : kind === "kelas"
        ? kelasFiltered.length
        : jadwalFiltered.length;
  const activeCount = (
    kind === "praktikum" ? praktikum : kind === "kelas" ? kelasSaya : jadwalSaya
  ).filter((item) => item.aktif).length;

  // ---- Peserta di dalam kelas ----
  const pesertaKelas = kelasSaya.find((k) => k.id === pesertaKelasId) ?? null;
  const pesertaList = useMemo(
    () =>
      [...(pesertaKelasId ? (pesertaByKelas[pesertaKelasId] ?? []) : [])].sort(
        (a, b) =>
          (petaByUid.get(a.uid)?.nama ?? a.nama).localeCompare(
            petaByUid.get(b.uid)?.nama ?? b.nama,
            "id-ID",
          ),
      ),
    [pesertaByKelas, pesertaKelasId, petaByUid],
  );

  const kandidat = useMemo(() => {
    const query = pesertaSearch.trim().toLocaleLowerCase("id-ID");
    const status = new Map(pesertaList.map((p) => [p.uid, p.aktif] as const));
    return Array.from(petaByUid.entries())
      .map(([praktikanUid, profil]) => {
        let terdaftar: "aktif" | "nonaktif" | null = null;
        if (status.has(praktikanUid))
          terdaftar = status.get(praktikanUid) ? "aktif" : "nonaktif";
        return {
          uid: praktikanUid,
          nama: profil?.nama ?? praktikanUid,
          nim: profil?.nim ?? "",
          terdaftar,
        };
      })
      .filter((k) =>
        `${k.nama} ${k.nim}`.toLocaleLowerCase("id-ID").includes(query),
      )
      .sort((a, b) => a.nama.localeCompare(b.nama, "id-ID"));
  }, [petaByUid, pesertaList, pesertaSearch]);

  function bukaPeserta(kelasId: string) {
    setPesertaKelasId(kelasId);
    setAddMode(false);
    setSelectedUids([]);
    setPesertaSearch("");
    setPesertaMsg("");
  }

  function tutupPeserta() {
    setPesertaKelasId(null);
    setAddMode(false);
    setSelectedUids([]);
    setPesertaSearch("");
    setPesertaMsg("");
  }

  function masukModeTambah() {
    setAddMode(true);
    setSelectedUids([]);
    setPesertaSearch("");
    setPesertaMsg("");
    void muatPraktikan();
  }

  function togglePilihan(praktikanUid: string) {
    setSelectedUids((current) =>
      current.includes(praktikanUid)
        ? current.filter((item) => item !== praktikanUid)
        : [...current, praktikanUid],
    );
  }

  async function tambahkanPeserta() {
    if (!pesertaKelasId || selectedUids.length === 0) return;
    setBusy(true);
    setPesertaMsg("");
    let berhasil = 0;
    let pesanGagal = "";
    // Berurutan: tiap penambahan ikut memperbarui dokumen kelas (praktikanUids).
    for (const praktikanUid of selectedUids) {
      try {
        await tambahPeserta(
          pesertaKelasId,
          praktikanUid,
          petaByUid.get(praktikanUid)?.nama ?? "",
        );
        berhasil += 1;
      } catch (reason) {
        pesanGagal = errorMessage(reason);
      }
    }
    setBusy(false);
    const gagal = selectedUids.length - berhasil;
    if (gagal === 0) {
      setAddMode(false);
      setSelectedUids([]);
      setPesertaMsg(`${berhasil} peserta ditambahkan.`);
    } else {
      setPesertaMsg(
        `${berhasil} berhasil, ${gagal} gagal. ${pesanGagal}`.trim(),
      );
    }
  }

  async function ubahStatusPeserta(praktikanUid: string, aktif: boolean) {
    if (!pesertaKelasId) return;
    try {
      setBusy(true);
      setPesertaMsg("");
      await updateDocument(
        firestoreRefs.pesertaDoc(pesertaKelasId, praktikanUid),
        { aktif },
      );
    } catch (reason) {
      setPesertaMsg(errorMessage(reason));
    } finally {
      setBusy(false);
    }
  }

  // ---- Form praktikum / kelas / jadwal ----
  function updateDraft(field: keyof Draft, value: string) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function pertemuanBerikutnya(kelasId: string) {
    const nomor = jadwal
      .filter((item) => item.kelasId === kelasId)
      .map((item) => item.pertemuanKe);
    return String((nomor.length ? Math.max(...nomor) : 0) + 1);
  }

  function pilihKelasJadwal(kelasId: string) {
    setDraft((current) => ({
      ...current,
      kelasId,
      // saat membuat jadwal baru, nomor pertemuan diisi otomatis
      pertemuanKe: editingId
        ? current.pertemuanKe
        : pertemuanBerikutnya(kelasId),
    }));
  }

  function openForm(nextKind: DataKind, id?: string) {
    setFormKind(nextKind);
    setEditingId(id ?? null);
    setFormError("");
    if (nextKind === "praktikum") {
      const item = praktikum.find((entry) => entry.id === id);
      setDraft({
        ...emptyDraft,
        nama: item?.nama ?? "",
        deskripsi: item?.deskripsi ?? "",
      });
    } else if (nextKind === "kelas") {
      const item = kelasSaya.find((entry) => entry.id === id);
      setDraft({
        ...emptyDraft,
        nama: item?.nama ?? "",
        praktikumId:
          item?.praktikumId ?? praktikum.find((entry) => entry.aktif)?.id ?? "",
      });
    } else {
      const item = jadwal.find((entry) => entry.id === id);
      const kelasAwal = item?.kelasId ?? classChoices[0]?.id ?? "";
      setDraft({
        ...emptyDraft,
        kelasId: kelasAwal,
        pertemuanKe: item
          ? String(item.pertemuanKe)
          : kelasAwal
            ? pertemuanBerikutnya(kelasAwal)
            : "",
        tanggal: item?.tanggal ?? "",
        jamMulai: item?.jamMulai ?? "",
        jamSelesai: item?.jamSelesai ?? "",
        lokasi: item?.lokasi ?? "",
      });
    }
    setFormOpen(true);
  }

  async function saveRecord() {
    try {
      setBusy(true);
      setFormError("");
      if (formKind === "praktikum") {
        if (!draft.nama.trim()) throw new Error("Nama praktikum wajib diisi.");
        // Edit tidak mengirim `aktif` agar status tidak berubah diam-diam.
        const value = {
          nama: draft.nama.trim(),
          deskripsi: draft.deskripsi.trim(),
          updatedAt: serverTimestamp(),
        };
        if (editingId)
          await updateDocument(firestoreRefs.praktikumDoc(editingId), value);
        else
          await addDocument(firestoreRefs.praktikum(), {
            ...value,
            aktif: true,
            praktikanUids: [],
            createdAt: serverTimestamp(),
          });
      } else if (formKind === "kelas") {
        if (!draft.nama.trim() || !draft.praktikumId)
          throw new Error("Nama kelas dan praktikum wajib diisi.");
        const value = {
          praktikumId: draft.praktikumId,
          nama: draft.nama.trim(),
          updatedAt: serverTimestamp(),
        };
        if (editingId) {
          // asistenUids tidak dikirim: Rules mensyaratkan nilainya tidak berubah.
          await updateDocument(firestoreRefs.kelasDoc(editingId), value);
        } else {
          if (!uid) throw new Error("Sesi login tidak ditemukan.");
          await addDocument(firestoreRefs.kelas(), {
            ...value,
            asistenUids: [uid],
            praktikanUids: [],
            aktif: true,
            createdAt: serverTimestamp(),
          });
        }
      } else {
        const pertemuanKe = Number(draft.pertemuanKe);
        const validJam = (value: string) =>
          /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
        if (
          !draft.kelasId ||
          !Number.isInteger(pertemuanKe) ||
          pertemuanKe < 1 ||
          !isValidDate(draft.tanggal) ||
          !validJam(draft.jamMulai) ||
          !validJam(draft.jamSelesai) ||
          draft.jamSelesai <= draft.jamMulai ||
          !draft.lokasi.trim()
        )
          throw new Error(
            "Lengkapi kelas, pertemuan, tanggal, jam, dan lokasi.",
          );
        if (
          jadwal.some(
            (item) =>
              item.id !== editingId &&
              item.kelasId === draft.kelasId &&
              item.pertemuanKe === pertemuanKe,
          )
        )
          throw new Error(
            `Pertemuan ${pertemuanKe} sudah ada di kelas ini.`,
          );
        const value = {
          kelasId: draft.kelasId,
          pertemuanKe,
          tanggal: draft.tanggal,
          jamMulai: draft.jamMulai,
          jamSelesai: draft.jamSelesai,
          lokasi: draft.lokasi.trim(),
        };
        if (editingId)
          await updateDocument(firestoreRefs.jadwalDoc(editingId), value);
        else
          await addDocument(firestoreRefs.jadwal(), { ...value, aktif: true });
      }
      setFormOpen(false);
      setFeedback("Data berhasil disimpan.");
    } catch (reason) {
      setFormError(
        reason instanceof Error ? reason.message : errorMessage(reason),
      );
    } finally {
      setBusy(false);
    }
  }

  // ---- Aktifkan / nonaktifkan (pengganti hapus) ----
  function prepareToggle(targetKind: DataKind, id: string, aktif: boolean) {
    setConfirmError("");
    setPendingAction({
      kind: targetKind,
      id,
      mode: aktif ? "nonaktifkan" : "aktifkan",
    });
  }

  async function confirmAction() {
    if (!pendingAction) return;
    const { kind: targetKind, id, mode } = pendingAction;
    const aktif = mode === "aktifkan";
    try {
      setBusy(true);
      setConfirmError("");
      if (targetKind === "praktikum")
        await updateDocument(firestoreRefs.praktikumDoc(id), {
          aktif,
          updatedAt: serverTimestamp(),
        });
      else if (targetKind === "kelas")
        await updateDocument(firestoreRefs.kelasDoc(id), {
          aktif,
          updatedAt: serverTimestamp(),
        });
      else await updateDocument(firestoreRefs.jadwalDoc(id), { aktif });
      setFeedback(
        `Data berhasil ${aktif ? "diaktifkan" : "dinonaktifkan"}.`,
      );
      setPendingAction(null);
    } catch (reason) {
      // Error ditampilkan di dalam modal konfirmasi agar tidak tertutup.
      setConfirmError(errorMessage(reason));
    } finally {
      setBusy(false);
    }
  }

  function renderRecords() {
    if (kind === "praktikum")
      return praktikumFiltered.map((item) => (
        <RecordCard
          key={item.id}
          title={item.nama}
          detail={item.deskripsi || "Tanpa deskripsi"}
          aktif={item.aktif}
          actions={[
            { label: "Ubah", onPress: () => openForm("praktikum", item.id) },
            {
              label: item.aktif ? "Nonaktifkan" : "Aktifkan",
              secondary: true,
              onPress: () => prepareToggle("praktikum", item.id, item.aktif),
            },
          ]}
        />
      ));
    if (kind === "kelas")
      return kelasFiltered.map((item) => (
        <RecordCard
          key={item.id}
          title={`Kelas ${item.nama}`}
          detail={`${namaPraktikum(item.praktikumId)} · ${jumlahPesertaAktif(item.id)} peserta aktif`}
          aktif={item.aktif}
          actions={[
            { label: "Peserta", onPress: () => bukaPeserta(item.id) },
            { label: "Ubah", onPress: () => openForm("kelas", item.id) },
            {
              label: item.aktif ? "Nonaktifkan" : "Aktifkan",
              secondary: true,
              onPress: () => prepareToggle("kelas", item.id, item.aktif),
            },
          ]}
        />
      ));
    return jadwalFiltered.map((item) => (
      <RecordCard
        key={item.id}
        title={`Pertemuan ${item.pertemuanKe} · ${item.tanggal}`}
        detail={`Kelas ${namaKelas(item.kelasId)} · ${item.jamMulai}–${item.jamSelesai} · ${item.lokasi}`}
        aktif={item.aktif}
        actions={[
          { label: "Ubah", onPress: () => openForm("jadwal", item.id) },
          {
            label: item.aktif ? "Nonaktifkan" : "Aktifkan",
            secondary: true,
            onPress: () => prepareToggle("jadwal", item.id, item.aktif),
          },
        ]}
      />
    ));
  }

  function renderFields() {
    if (formKind === "praktikum")
      return (
        <>
          <Field
            label="Nama praktikum"
            value={draft.nama}
            onChangeText={(value) => updateDraft("nama", value)}
            placeholder="Nama praktikum"
          />
          <Field
            label="Deskripsi"
            value={draft.deskripsi}
            onChangeText={(value) => updateDraft("deskripsi", value)}
            placeholder="Deskripsi"
          />
        </>
      );
    if (formKind === "kelas")
      return (
        <>
          <Field
            label="Nama kelas"
            value={draft.nama}
            onChangeText={(value) => updateDraft("nama", value)}
            placeholder="A"
          />
          <ChoiceChips
            label="Praktikum"
            choices={praktikum
              .filter((item) => item.aktif)
              .map((item) => ({ id: item.id, label: item.nama }))}
            selectedId={draft.praktikumId}
            onSelect={(value) => updateDraft("praktikumId", value)}
          />
        </>
      );
    return (
      <>
        <ChoiceChips
          label="Kelas"
          choices={classChoices}
          selectedId={draft.kelasId}
          onSelect={pilihKelasJadwal}
          emptyText="Belum ada kelas aktif yang Anda kelola."
        />
        <Field
          label="Pertemuan ke"
          value={draft.pertemuanKe}
          onChangeText={(value) => updateDraft("pertemuanKe", value)}
          placeholder="1"
          keyboardType="numeric"
        />
        <ChoiceChips
          label="Tanggal"
          horizontal
          choices={withCurrent(tanggalChoices, draft.tanggal)}
          selectedId={draft.tanggal}
          onSelect={(value) => updateDraft("tanggal", value)}
        />
        <Field
          label="Atau ketik tanggal (YYYY-MM-DD)"
          value={draft.tanggal}
          onChangeText={(value) => updateDraft("tanggal", value)}
          placeholder="2026-11-24"
        />
        <ChoiceChips
          label="Jam mulai"
          horizontal
          choices={withCurrent(JAM_CHOICES, draft.jamMulai, true)}
          selectedId={draft.jamMulai}
          onSelect={(value) => updateDraft("jamMulai", value)}
        />
        <ChoiceChips
          label="Jam selesai"
          horizontal
          choices={withCurrent(
            JAM_CHOICES.filter(
              (jam) => !draft.jamMulai || jam.id > draft.jamMulai,
            ),
            draft.jamSelesai,
            true,
          )}
          selectedId={draft.jamSelesai}
          onSelect={(value) => updateDraft("jamSelesai", value)}
        />
        <ChoiceChips
          label="Lokasi lab"
          choices={withCurrent(LAB_CHOICES, draft.lokasi)}
          selectedId={draft.lokasi}
          onSelect={(value) => updateDraft("lokasi", value)}
        />
      </>
    );
  }

  const pendingText = pendingAction?.mode === "aktifkan" ? "Aktifkan" : "Nonaktifkan";
  const pendingBody = (() => {
    if (!pendingAction) return "";
    if (pendingAction.mode === "aktifkan")
      return "Data akan diaktifkan kembali.";
    if (pendingAction.kind === "praktikum")
      return "Praktikum dinonaktifkan dan tidak bisa dipilih untuk kelas baru. Data dan riwayat tetap tersimpan.";
    if (pendingAction.kind === "kelas")
      return "Kelas dinonaktifkan. Praktikan di kelas ini tidak dapat melihat jadwal dan sesi sampai kelas diaktifkan kembali. Data dan riwayat tetap tersimpan.";
    return "Jadwal dinonaktifkan. Data tetap tersimpan dan bisa diaktifkan kembali.";
  })();

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
        <Text style={styles.title}>Kelola Data</Text>
        <Text style={styles.subtitle}>
          Data tersinkron dari Cloud Firestore.
        </Text>
        {error ? (
          <Text accessibilityRole="alert" style={styles.errorBanner}>
            {error}
          </Text>
        ) : null}
        {feedback ? (
          <Text accessibilityRole="alert" style={styles.feedback}>
            {feedback}
          </Text>
        ) : null}
        <View style={styles.summary}>
          <Text style={styles.summaryNumber}>{activeCount}</Text>
          <Text style={styles.summaryLabel}>
            data aktif · {TABS.find((item) => item.id === kind)?.label}
          </Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabs}
        >
          {TABS.map((tab) => (
            <Pressable
              key={tab.id}
              accessibilityRole="tab"
              accessibilityState={{ selected: kind === tab.id }}
              onPress={() => {
                setKind(tab.id);
                setSearch("");
              }}
              style={[styles.tab, kind === tab.id && styles.tabSelected]}
            >
              <Text
                style={[
                  styles.tabText,
                  kind === tab.id && styles.tabTextSelected,
                ]}
              >
                {tab.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
        <View style={styles.headingRow}>
          <View style={styles.cardCopy}>
            <Text style={styles.sectionTitle}>
              {TABS.find((item) => item.id === kind)?.label}
            </Text>
            <Text style={styles.helper}>{filteredCount} data</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => openForm(kind)}
            style={styles.addButton}
          >
            <Text style={styles.addText}>＋ Tambah</Text>
          </Pressable>
        </View>
        <TextInput
          accessibilityLabel="Cari data"
          value={search}
          onChangeText={setSearch}
          placeholder="Cari data..."
          placeholderTextColor={colors.textMuted}
          style={styles.input}
        />
        {loading ? (
          <View style={styles.state}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.helper}>Memuat data Firestore...</Text>
          </View>
        ) : filteredCount ? (
          renderRecords()
        ) : (
          <View style={styles.state}>
            <Text style={styles.emptyTitle}>Belum ada data</Text>
            <Text style={styles.helper}>
              Data yang dibuat akan muncul di sini.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Form praktikum / kelas / jadwal */}
      <Modal
        visible={formOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setFormOpen(false)}
      >
        <View style={styles.overlay}>
          <View style={styles.modalCard}>
            <Text style={styles.eyebrow}>
              {editingId ? "UBAH DATA" : "DATA BARU"}
            </Text>
            <Text style={styles.modalTitle}>
              {editingId ? "Ubah" : "Tambah"}{" "}
              {TABS.find((item) => item.id === formKind)?.label}
            </Text>
            <ScrollView contentContainerStyle={styles.form}>
              {renderFields()}
              {formError ? (
                <Text style={styles.errorText}>{formError}</Text>
              ) : null}
              <View style={styles.inline}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setFormOpen(false)}
                  style={[styles.modalButton, styles.cancel]}
                >
                  <Text>Batal</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  disabled={busy}
                  onPress={saveRecord}
                  style={[styles.modalButton, styles.save]}
                >
                  <Text style={styles.saveText}>
                    {busy ? "Menyimpan..." : "Simpan"}
                  </Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Peserta kelas */}
      <Modal
        visible={!!pesertaKelas}
        transparent
        animationType="slide"
        onRequestClose={tutupPeserta}
      >
        <View style={styles.overlay}>
          <View style={styles.modalCard}>
            <Text style={styles.eyebrow}>PESERTA KELAS</Text>
            <Text style={styles.modalTitle}>Kelas {pesertaKelas?.nama}</Text>
            <Text style={[styles.helper, styles.modalSubtitle]}>
              {pesertaKelas ? namaPraktikum(pesertaKelas.praktikumId) : ""} ·{" "}
              {pesertaList.filter((p) => p.aktif).length} aktif dari{" "}
              {pesertaList.length}
            </Text>
            {pesertaMsg ? (
              <Text accessibilityRole="alert" style={styles.feedback}>
                {pesertaMsg}
              </Text>
            ) : null}

            {addMode ? (
              <>
                <TextInput
                  accessibilityLabel="Cari Praktikan"
                  value={pesertaSearch}
                  onChangeText={setPesertaSearch}
                  placeholder="Cari nama atau NIM..."
                  placeholderTextColor={colors.textMuted}
                  style={styles.input}
                />
                {loadingPraktikan ? (
                  <View style={styles.state}>
                    <ActivityIndicator color={colors.primary} />
                    <Text style={styles.helper}>Memuat daftar Praktikan...</Text>
                  </View>
                ) : errorPraktikan ? (
                  <View style={styles.state}>
                    <Text style={styles.helper}>
                      Gagal memuat daftar Praktikan.
                    </Text>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => void muatPraktikan()}
                      style={styles.smallButton}
                    >
                      <Text style={styles.smallButtonText}>Coba lagi</Text>
                    </Pressable>
                  </View>
                ) : (
                  <ScrollView
                    style={styles.memberScroll}
                    nestedScrollEnabled
                    keyboardShouldPersistTaps="handled"
                  >
                    {kandidat.length ? (
                      kandidat.map((item) => {
                        const terkunci = item.terdaftar !== null;
                        const dipilih = selectedUids.includes(item.uid);
                        return (
                          <Pressable
                            key={item.uid}
                            accessibilityRole="checkbox"
                            accessibilityState={{
                              checked: dipilih,
                              disabled: terkunci,
                            }}
                            disabled={terkunci}
                            onPress={() => togglePilihan(item.uid)}
                            style={[
                              styles.memberRow,
                              terkunci && styles.memberRowDisabled,
                            ]}
                          >
                            <View
                              style={[
                                styles.checkbox,
                                dipilih && styles.checkboxOn,
                              ]}
                            >
                              {dipilih ? (
                                <Text style={styles.checkmark}>✓</Text>
                              ) : null}
                            </View>
                            <View style={styles.cardCopy}>
                              <Text style={styles.memberName}>{item.nama}</Text>
                              <Text style={styles.memberDetail}>
                                {item.nim ? `NIM ${item.nim}` : "NIM tidak tersedia"}
                              </Text>
                            </View>
                            {terkunci ? (
                              <Text style={styles.memberTag}>
                                {item.terdaftar === "aktif"
                                  ? "Sudah di kelas ini"
                                  : "Nonaktif di kelas ini"}
                              </Text>
                            ) : null}
                          </Pressable>
                        );
                      })
                    ) : (
                      <Text style={styles.helper}>
                        Tidak ada Praktikan yang cocok.
                      </Text>
                    )}
                  </ScrollView>
                )}
                <View style={[styles.inline, styles.modalActions]}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      setAddMode(false);
                      setSelectedUids([]);
                    }}
                    style={[styles.modalButton, styles.cancel]}
                  >
                    <Text>Batal</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    disabled={busy || selectedUids.length === 0}
                    onPress={tambahkanPeserta}
                    style={[
                      styles.modalButton,
                      styles.save,
                      (busy || selectedUids.length === 0) && styles.saveDisabled,
                    ]}
                  >
                    <Text style={styles.saveText}>
                      {busy
                        ? "Menambahkan..."
                        : `Tambahkan (${selectedUids.length})`}
                    </Text>
                  </Pressable>
                </View>
              </>
            ) : (
              <>
                <ScrollView
                  style={styles.memberScroll}
                  nestedScrollEnabled
                >
                  {pesertaList.length ? (
                    pesertaList.map((item) => {
                      const profil = petaByUid.get(item.uid);
                      return (
                        <View key={item.id} style={styles.memberRow}>
                          <View style={styles.cardCopy}>
                            <Text style={styles.memberName}>
                              {profil?.nama ?? item.nama ?? item.uid}
                            </Text>
                            <Text style={styles.memberDetail}>
                              {(profil?.nim ?? item.nim)
                                ? `NIM ${profil?.nim ?? item.nim}`
                                : "NIM tidak tersedia"}
                              {item.aktif ? "" : " · Nonaktif"}
                            </Text>
                          </View>
                          <Pressable
                            accessibilityRole="button"
                            disabled={busy}
                            onPress={() =>
                              void ubahStatusPeserta(item.uid, !item.aktif)
                            }
                            style={styles.smallButton}
                          >
                            <Text style={styles.smallButtonText}>
                              {item.aktif ? "Nonaktifkan" : "Aktifkan"}
                            </Text>
                          </Pressable>
                        </View>
                      );
                    })
                  ) : (
                    <Text style={styles.helper}>
                      Belum ada peserta di kelas ini.
                    </Text>
                  )}
                </ScrollView>
                <View style={[styles.inline, styles.modalActions]}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={tutupPeserta}
                    style={[styles.modalButton, styles.cancel]}
                  >
                    <Text>Tutup</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    onPress={masukModeTambah}
                    style={[styles.modalButton, styles.save]}
                  >
                    <Text style={styles.saveText}>＋ Tambah Peserta</Text>
                  </Pressable>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Konfirmasi aktif / nonaktif */}
      <Modal
        visible={!!pendingAction}
        transparent
        animationType="fade"
        onRequestClose={() => setPendingAction(null)}
      >
        <View style={styles.overlay}>
          <View style={styles.confirmCard}>
            <Text style={styles.eyebrow}>KONFIRMASI</Text>
            <Text style={styles.modalTitle}>{pendingText} data?</Text>
            <Text style={styles.confirmText}>{pendingBody}</Text>
            {confirmError ? (
              <Text style={styles.errorText}>{confirmError}</Text>
            ) : null}
            <View style={styles.inline}>
              <Pressable
                accessibilityRole="button"
                onPress={() => setPendingAction(null)}
                style={[styles.modalButton, styles.cancel]}
              >
                <Text>Batal</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                disabled={busy}
                onPress={confirmAction}
                style={[styles.modalButton, styles.save]}
              >
                <Text style={styles.saveText}>
                  {busy ? "Memproses..." : pendingText}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
  },
  errorBanner: {
    color: colors.bg,
    backgroundColor: colors.primary,
    padding: 11,
    borderRadius: 10,
    fontSize: 12,
    marginBottom: 10,
  },
  feedback: {
    color: colors.text,
    backgroundColor: colors.highlight,
    padding: 11,
    borderRadius: 10,
    fontSize: 12,
    marginBottom: 10,
  },
  summary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 16,
    borderRadius: 14,
    backgroundColor: colors.text,
    marginBottom: 16,
  },
  summaryNumber: { color: colors.surface, fontSize: 26, fontWeight: "800" },
  summaryLabel: { color: colors.highlight, fontSize: 12, fontWeight: "700" },
  tabs: { gap: 8, paddingBottom: 18 },
  tab: {
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
  },
  tabSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabText: { color: colors.textMuted, fontSize: 12, fontWeight: "700" },
  tabTextSelected: { color: colors.bg },
  headingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: "800" },
  cardCopy: { flex: 1 },
  addButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
  },
  addText: { color: colors.bg, fontSize: 12, fontWeight: "800" },
  input: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    color: colors.text,
    marginBottom: 12,
  },
  card: {
    padding: 14,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    marginBottom: 10,
  },
  cardHeader: { flexDirection: "row", gap: 8, alignItems: "flex-start" },
  cardTitle: { color: colors.text, fontSize: 14, fontWeight: "800" },
  cardDetail: { color: colors.textMuted, fontSize: 12, marginTop: 5 },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    fontSize: 10,
    fontWeight: "800",
  },
  badgeActive: { backgroundColor: colors.highlight, color: colors.text },
  badgeInactive: { backgroundColor: colors.border, color: colors.textMuted },
  cardActions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 9,
    backgroundColor: colors.text,
  },
  actionText: { color: colors.bg, fontSize: 11, fontWeight: "700" },
  secondaryAction: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryActionText: { color: colors.text },
  state: {
    alignItems: "center",
    padding: 32,
    backgroundColor: colors.surface,
    borderRadius: 13,
    gap: 8,
  },
  emptyTitle: { color: colors.text, fontSize: 15, fontWeight: "800" },
  helper: { color: colors.textMuted, fontSize: 12 },
  overlay: {
    flex: 1,
    justifyContent: "center",
    padding: 18,
    backgroundColor: colors.scrim,
  },
  modalCard: {
    maxHeight: "90%",
    borderRadius: 16,
    padding: 18,
    backgroundColor: colors.bg,
  },
  confirmCard: { borderRadius: 16, padding: 18, backgroundColor: colors.bg },
  modalTitle: {
    color: colors.text,
    fontSize: 19,
    fontWeight: "800",
    marginTop: 6,
    marginBottom: 12,
  },
  modalSubtitle: { marginTop: -6, marginBottom: 12 },
  modalActions: { marginTop: 12 },
  form: { paddingBottom: 4 },
  field: { marginBottom: 13 },
  fieldLabel: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 6,
  },
  choiceList: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  chipScroll: { gap: 7, paddingRight: 8 },
  choice: {
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 9,
  },
  choiceSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  choiceText: { color: colors.textMuted, fontSize: 11, fontWeight: "700" },
  choiceTextSelected: { color: colors.bg },
  inline: { flexDirection: "row", gap: 9 },
  errorText: { color: colors.primary, fontSize: 12, marginBottom: 10 },
  modalButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 43,
    borderRadius: 10,
  },
  cancel: { borderWidth: 1, borderColor: colors.border },
  save: { backgroundColor: colors.primary },
  saveDisabled: { opacity: 0.5 },
  saveText: { color: colors.bg, fontWeight: "800" },
  confirmText: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 16,
  },
  memberScroll: { maxHeight: 340 },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  memberRowDisabled: { opacity: 0.55 },
  memberName: { color: colors.text, fontSize: 13, fontWeight: "700" },
  memberDetail: { color: colors.textMuted, fontSize: 11, marginTop: 3 },
  memberTag: { color: colors.textMuted, fontSize: 10, fontWeight: "700" },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkmark: { color: colors.bg, fontSize: 13, fontWeight: "800" },
  smallButton: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  smallButtonText: { color: colors.text, fontSize: 11, fontWeight: "700" },
});