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
  PesertaDoc,
  PraktikumDoc,
  SesiDoc,
} from "../../data/firestoreType";
import { useAuth } from "../../hooks/useAuth";
import {
  addDocument,
  firestoreRefs,
  listenCollection,
  readCollection,
  readDocument,
  removeDocument,
  serverTimestamp,
  setDocument,
  updateDocument,
} from "../../services/firebase/firestore";

type DataKind = "praktikum" | "kelas" | "peserta" | "jadwal";
type RecordItem = { id: string; aktif: boolean };
type PraktikumData = RecordItem & Pick<PraktikumDoc, "nama" | "deskripsi">;
type KelasData = RecordItem &
  Pick<KelasDoc, "nama" | "praktikumId" | "asistenUids">;
type PesertaData = RecordItem & Pick<PesertaDoc, "uid"> & { kelasId: string };
type JadwalData = RecordItem & Omit<JadwalDoc, "aktif">;
type SesiData = SesiDoc & { id: string };

type Draft = {
  nama: string;
  deskripsi: string;
  praktikumId: string;
  kelasId: string;
  uid: string;
  pertemuanKe: string;
  tanggal: string;
  jamMulai: string;
  jamSelesai: string;
  lokasi: string;
};

type PendingAction = {
  kind: DataKind;
  id: string;
  mode: "hapus" | "nonaktifkan" | "aktifkan";
};

const TABS: { id: DataKind; label: string }[] = [
  { id: "praktikum", label: "Praktikum" },
  { id: "kelas", label: "Kelas" },
  { id: "peserta", label: "Peserta" },
  { id: "jadwal", label: "Jadwal" },
];

const emptyDraft: Draft = {
  nama: "",
  deskripsi: "",
  praktikumId: "",
  kelasId: "",
  uid: "",
  pertemuanKe: "",
  tanggal: "",
  jamMulai: "",
  jamSelesai: "",
  lokasi: "",
};

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
}: {
  label: string;
  choices: { id: string; label: string }[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.choiceList}>
        {choices.length ? (
          choices.map((choice) => (
            <Pressable
              key={choice.id}
              accessibilityRole="button"
              accessibilityState={{ selected: choice.id === selectedId }}
              onPress={() => onSelect(choice.id)}
              style={[
                styles.choice,
                choice.id === selectedId && styles.choiceSelected,
              ]}
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
          ))
        ) : (
          <Text style={styles.helper}>Belum ada data induk.</Text>
        )}
      </View>
    </View>
  );
}

function RecordCard({
  title,
  detail,
  aktif,
  onEdit,
  onArchive,
  actionLabel,
}: {
  title: string;
  detail: string;
  aktif: boolean;
  onEdit: () => void;
  onArchive: () => void;
  actionLabel: string;
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
        <Pressable
          accessibilityRole="button"
          onPress={onEdit}
          style={styles.actionButton}
        >
          <Text style={styles.actionText}>Ubah</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={onArchive}
          style={[styles.actionButton, styles.secondaryAction]}
        >
          <Text style={[styles.actionText, styles.secondaryActionText]}>
            {actionLabel}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function AsistenKelolaDataScreen() {
  const { user, role } = useAuth();
  const [kind, setKind] = useState<DataKind>("praktikum");
  const [praktikum, setPraktikum] = useState<PraktikumData[]>([]);
  const [kelas, setKelas] = useState<KelasData[]>([]);
  const [peserta, setPeserta] = useState<PesertaData[]>([]);
  const [jadwal, setJadwal] = useState<JadwalData[]>([]);
  const [sesi, setSesi] = useState<SesiData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [formKind, setFormKind] = useState<DataKind>("praktikum");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [formError, setFormError] = useState("");
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(
    null,
  );
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (role !== "asisten" || !user) {
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    setError("");
    const unsubscribers: (() => void)[] = [];
    const participantUnsubscribers = new Map<string, () => void>();
    const participantsByClass = new Map<string, PesertaData[]>();

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
        firestoreRefs.jadwal(),
        (items) => setJadwal(items.map((item) => ({ ...item }))),
        onError,
      ),
    );
    unsubscribers.push(
      listenCollection(
        firestoreRefs.sesi(),
        (items) => setSesi(items.map((item) => ({ ...item }))),
        onError,
      ),
    );
    unsubscribers.push(
      listenCollection(
        firestoreRefs.kelas(),
        (items) => {
          setKelas(items.map((item) => ({ ...item })));
          const activeIds = new Set(items.map((item) => item.id));
          for (const [kelasId, unsubscribe] of participantUnsubscribers) {
            if (!activeIds.has(kelasId)) {
              unsubscribe();
              participantUnsubscribers.delete(kelasId);
              participantsByClass.delete(kelasId);
            }
          }
          for (const item of items) {
            if (participantUnsubscribers.has(item.id)) continue;
            participantUnsubscribers.set(
              item.id,
              listenCollection(
                firestoreRefs.peserta(item.id),
                (participantItems) => {
                  participantsByClass.set(
                    item.id,
                    participantItems.map((participant) => ({
                      id: participant.id,
                      uid: participant.uid,
                      kelasId: item.id,
                      aktif: participant.aktif,
                    })),
                  );
                  setPeserta(Array.from(participantsByClass.values()).flat());
                },
                onError,
              ),
            );
          }
        },
        onError,
      ),
    );

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
      participantUnsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [role, user]);

  const classChoices = useMemo(
    () =>
      kelas
        .filter((item) => item.aktif)
        .map((item) => ({
          id: item.id,
          label: `${item.nama} · ${praktikum.find((course) => course.id === item.praktikumId)?.nama ?? "Praktikum"}`,
        })),
    [kelas, praktikum],
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("id-ID");
    if (kind === "praktikum")
      return praktikum.filter((item) =>
        `${item.nama} ${item.deskripsi}`
          .toLocaleLowerCase("id-ID")
          .includes(query),
      );
    if (kind === "kelas")
      return kelas.filter((item) =>
        `${item.nama} ${praktikum.find((course) => course.id === item.praktikumId)?.nama ?? ""}`
          .toLocaleLowerCase("id-ID")
          .includes(query),
      );
    if (kind === "peserta")
      return peserta.filter((item) =>
        `${item.uid} ${kelas.find((entry) => entry.id === item.kelasId)?.nama ?? ""}`
          .toLocaleLowerCase("id-ID")
          .includes(query),
      );
    return jadwal.filter((item) =>
      `${item.tanggal} ${item.lokasi} ${kelas.find((entry) => entry.id === item.kelasId)?.nama ?? ""}`
        .toLocaleLowerCase("id-ID")
        .includes(query),
    );
  }, [kind, jadwal, kelas, peserta, praktikum, search]);

  function updateDraft(field: keyof Draft, value: string) {
    setDraft((current) => ({ ...current, [field]: value }));
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
      const item = kelas.find((entry) => entry.id === id);
      setDraft({
        ...emptyDraft,
        nama: item?.nama ?? "",
        praktikumId:
          item?.praktikumId ?? praktikum.find((entry) => entry.aktif)?.id ?? "",
      });
    } else if (nextKind === "peserta") {
      const item = peserta.find((entry) => entry.id === id);
      setDraft({
        ...emptyDraft,
        uid: item?.uid ?? "",
        kelasId: item?.kelasId ?? classChoices[0]?.id ?? "",
      });
    } else {
      const item = jadwal.find((entry) => entry.id === id);
      setDraft({
        ...emptyDraft,
        kelasId: item?.kelasId ?? classChoices[0]?.id ?? "",
        pertemuanKe: item ? String(item.pertemuanKe) : "",
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
        const value = {
          nama: draft.nama.trim(),
          deskripsi: draft.deskripsi.trim(),
          aktif: true,
          updatedAt: serverTimestamp(),
        };
        if (editingId)
          await updateDocument(firestoreRefs.praktikumDoc(editingId), value);
        else
          await addDocument(firestoreRefs.praktikum(), {
            ...value,
            createdAt: serverTimestamp(),
          });
      } else if (formKind === "kelas") {
        if (!draft.nama.trim() || !draft.praktikumId)
          throw new Error("Nama kelas dan praktikum wajib diisi.");
        const value = {
          praktikumId: draft.praktikumId,
          nama: draft.nama.trim(),
          asistenUids: [user?.uid ?? ""],
          aktif: true,
          updatedAt: serverTimestamp(),
        };
        if (editingId)
          await updateDocument(firestoreRefs.kelasDoc(editingId), value);
        else
          await addDocument(firestoreRefs.kelas(), {
            ...value,
            createdAt: serverTimestamp(),
          });
      } else if (formKind === "peserta") {
        if (!draft.uid.trim() || !draft.kelasId)
          throw new Error("UID Praktikan dan kelas wajib diisi.");
        await setDocument(
          firestoreRefs.pesertaDoc(draft.kelasId, draft.uid.trim()),
          { uid: draft.uid.trim(), aktif: true, joinedAt: serverTimestamp() },
        );
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
        const value = {
          kelasId: draft.kelasId,
          pertemuanKe,
          tanggal: draft.tanggal,
          jamMulai: draft.jamMulai,
          jamSelesai: draft.jamSelesai,
          lokasi: draft.lokasi.trim(),
          aktif: true,
        };
        if (editingId)
          await updateDocument(firestoreRefs.jadwalDoc(editingId), value);
        else await addDocument(firestoreRefs.jadwal(), value);
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

  async function findHistory(targetKind: DataKind, id: string) {
    const sessions = (await readCollection(firestoreRefs.sesi())) as SesiData[];
    let targetSessionIds: string[];
    if (targetKind === "jadwal")
      targetSessionIds = sessions
        .filter((item) => item.jadwalId === id)
        .map((item) => item.id);
    else if (targetKind === "kelas") {
      const scheduleIds = new Set(
        jadwal.filter((item) => item.kelasId === id).map((item) => item.id),
      );
      targetSessionIds = sessions
        .filter(
          (item) =>
            item.kelasId === id ||
            (item.jadwalId && scheduleIds.has(item.jadwalId)),
        )
        .map((item) => item.id);
    } else if (targetKind === "praktikum") {
      const classIds = new Set(
        kelas.filter((item) => item.praktikumId === id).map((item) => item.id),
      );
      const scheduleIds = new Set(
        jadwal
          .filter((item) => classIds.has(item.kelasId))
          .map((item) => item.id),
      );
      targetSessionIds = sessions
        .filter(
          (item) =>
            (item.kelasId && classIds.has(item.kelasId)) ||
            (item.jadwalId && scheduleIds.has(item.jadwalId)),
        )
        .map((item) => item.id);
    } else {
      const participant = peserta.find((item) => item.id === id);
      const classSessions = sessions.filter(
        (item) => item.kelasId === participant?.kelasId,
      );
      for (const item of classSessions) {
        const [attendance, request] = await Promise.all([
          readDocument(
            firestoreRefs.presensiDoc(item.id, participant?.uid ?? ""),
          ),
          readDocument(
            firestoreRefs.pengajuanIzinDoc(item.id, participant?.uid ?? ""),
          ),
        ]);
        if (attendance || request) return true;
      }
      return false;
    }
    return targetSessionIds.length > 0;
  }

  async function prepareArchive(
    targetKind: DataKind,
    id: string,
    aktif: boolean,
  ) {
    if (!aktif) {
      setPendingAction({ kind: targetKind, id, mode: "aktifkan" });
      return;
    }
    try {
      setBusy(true);
      const hasHistory = await findHistory(targetKind, id);
      setPendingAction({
        kind: targetKind,
        id,
        mode: hasHistory ? "nonaktifkan" : "hapus",
      });
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusy(false);
    }
  }

  async function confirmAction() {
    if (!pendingAction) return;
    const { kind: targetKind, id, mode } = pendingAction;
    try {
      setBusy(true);
      if (targetKind === "praktikum") {
        if (mode === "hapus")
          await removeDocument(firestoreRefs.praktikumDoc(id));
        else
          await updateDocument(firestoreRefs.praktikumDoc(id), {
            aktif: mode === "aktifkan",
            updatedAt: serverTimestamp(),
          });
      } else if (targetKind === "kelas") {
        if (mode === "hapus") await removeDocument(firestoreRefs.kelasDoc(id));
        else
          await updateDocument(firestoreRefs.kelasDoc(id), {
            aktif: mode === "aktifkan",
            updatedAt: serverTimestamp(),
          });
      } else if (targetKind === "jadwal") {
        if (mode === "hapus") await removeDocument(firestoreRefs.jadwalDoc(id));
        else
          await updateDocument(firestoreRefs.jadwalDoc(id), {
            aktif: mode === "aktifkan",
          });
      } else {
        const item = peserta.find((entry) => entry.id === id);
        if (item) {
          if (mode === "hapus")
            await removeDocument(
              firestoreRefs.pesertaDoc(item.kelasId, item.uid),
            );
          else
            await updateDocument(
              firestoreRefs.pesertaDoc(item.kelasId, item.uid),
              { aktif: mode === "aktifkan" },
            );
        }
      }
      setFeedback(
        `Data berhasil ${mode === "hapus" ? "dihapus" : mode === "aktifkan" ? "diaktifkan" : "dinonaktifkan"}.`,
      );
      setPendingAction(null);
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusy(false);
    }
  }

  function renderRecords() {
    if (kind === "praktikum")
      return praktikum
        .filter((item) =>
          `${item.nama} ${item.deskripsi}`
            .toLocaleLowerCase("id-ID")
            .includes(search.trim().toLocaleLowerCase("id-ID")),
        )
        .map((item) => (
          <RecordCard
            key={item.id}
            title={item.nama}
            detail={item.deskripsi || "Tanpa deskripsi"}
            aktif={item.aktif}
            onEdit={() => openForm("praktikum", item.id)}
            onArchive={() => prepareArchive("praktikum", item.id, item.aktif)}
            actionLabel={item.aktif ? "Kelola" : "Aktifkan"}
          />
        ));
    if (kind === "kelas")
      return kelas
        .filter((item) =>
          `${item.nama} ${item.praktikumId}`
            .toLocaleLowerCase("id-ID")
            .includes(search.trim().toLocaleLowerCase("id-ID")),
        )
        .map((item) => (
          <RecordCard
            key={item.id}
            title={`Kelas ${item.nama}`}
            detail={`Praktikum ${item.praktikumId} · ${item.asistenUids.length} Asisten`}
            aktif={item.aktif}
            onEdit={() => openForm("kelas", item.id)}
            onArchive={() => prepareArchive("kelas", item.id, item.aktif)}
            actionLabel={item.aktif ? "Kelola" : "Aktifkan"}
          />
        ));
    if (kind === "peserta")
      return peserta
        .filter((item) =>
          `${item.uid} ${item.kelasId}`
            .toLocaleLowerCase("id-ID")
            .includes(search.trim().toLocaleLowerCase("id-ID")),
        )
        .map((item) => (
          <RecordCard
            key={item.id}
            title={item.uid}
            detail={`Kelas ${item.kelasId}`}
            aktif={item.aktif}
            onEdit={() => openForm("peserta", item.id)}
            onArchive={() => prepareArchive("peserta", item.id, item.aktif)}
            actionLabel={item.aktif ? "Kelola" : "Aktifkan"}
          />
        ));
    return jadwal
      .filter((item) =>
        `${item.tanggal} ${item.lokasi} ${item.kelasId}`
          .toLocaleLowerCase("id-ID")
          .includes(search.trim().toLocaleLowerCase("id-ID")),
      )
      .map((item) => (
        <RecordCard
          key={item.id}
          title={`Pertemuan ${item.pertemuanKe} · ${item.tanggal}`}
          detail={`Kelas ${item.kelasId} · ${item.jamMulai}–${item.jamSelesai} · ${item.lokasi}`}
          aktif={item.aktif}
          onEdit={() => openForm("jadwal", item.id)}
          onArchive={() => prepareArchive("jadwal", item.id, item.aktif)}
          actionLabel={item.aktif ? "Kelola" : "Aktifkan"}
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
    if (formKind === "peserta")
      return (
        <>
          <Field
            label="UID Praktikan"
            value={draft.uid}
            onChangeText={(value) => updateDraft("uid", value)}
            placeholder="UID Firebase Auth"
          />
          <ChoiceChips
            label="Kelas"
            choices={classChoices}
            selectedId={draft.kelasId}
            onSelect={(value) => updateDraft("kelasId", value)}
          />
        </>
      );
    return (
      <>
        <ChoiceChips
          label="Kelas"
          choices={classChoices}
          selectedId={draft.kelasId}
          onSelect={(value) => updateDraft("kelasId", value)}
        />
        <Field
          label="Pertemuan ke"
          value={draft.pertemuanKe}
          onChangeText={(value) => updateDraft("pertemuanKe", value)}
          placeholder="1"
          keyboardType="numeric"
        />
        <Field
          label="Tanggal YYYY-MM-DD"
          value={draft.tanggal}
          onChangeText={(value) => updateDraft("tanggal", value)}
          placeholder="2026-11-14"
        />
        <View style={styles.inline}>
          <Field
            label="Mulai"
            value={draft.jamMulai}
            onChangeText={(value) => updateDraft("jamMulai", value)}
            placeholder="08:00"
          />
          <Field
            label="Selesai"
            value={draft.jamSelesai}
            onChangeText={(value) => updateDraft("jamSelesai", value)}
            placeholder="10:00"
          />
        </View>
        <Field
          label="Lokasi"
          value={draft.lokasi}
          onChangeText={(value) => updateDraft("lokasi", value)}
          placeholder="Laboratorium"
        />
      </>
    );
  }

  const pendingText =
    pendingAction?.mode === "hapus"
      ? "Hapus"
      : pendingAction?.mode === "aktifkan"
        ? "Aktifkan"
        : "Nonaktifkan";
  const activeCount = (
    kind === "praktikum"
      ? praktikum
      : kind === "kelas"
        ? kelas
        : kind === "peserta"
          ? peserta
          : jadwal
  ).filter((item) => item.aktif).length;

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
            <Text style={styles.helper}>{filtered.length} data</Text>
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
        ) : filtered.length ? (
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
            <Text style={styles.confirmText}>
              {pendingAction?.mode === "hapus"
                ? "Tidak ada sesi terkait. Data akan dihapus."
                : pendingAction?.mode === "aktifkan"
                  ? "Data akan diaktifkan kembali."
                  : "Data memiliki sesi atau riwayat. Data akan dinonaktifkan agar riwayat tetap tersedia."}
            </Text>
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
  cardActions: { flexDirection: "row", gap: 8, marginTop: 12 },
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
  form: { paddingBottom: 4 },
  field: { marginBottom: 13, flex: 1 },
  fieldLabel: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 6,
  },
  choiceList: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
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
  saveText: { color: colors.bg, fontWeight: "800" },
  confirmText: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 16,
  },
});
