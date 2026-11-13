import { router } from "expo-router";
import { useMemo, useState } from "react";
import {
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

type DataKind = "praktikum" | "kelas" | "peserta" | "jadwal";
type ManagedRecord = { id: string; aktif: boolean };

type PraktikumData = ManagedRecord & {
  nama: string;
  deskripsi: string;
};

type KelasData = ManagedRecord & {
  nama: string;
  praktikumId: string;
};

type PesertaData = ManagedRecord & {
  nama: string;
  nim: string;
  kelasId: string;
  punyaRiwayat: boolean;
};

type JadwalData = ManagedRecord & {
  kelasId: string;
  pertemuanKe: number;
  tanggal: string;
  jamMulai: string;
  jamSelesai: string;
  lokasi: string;
  punyaSesi: boolean;
};

type Draft = {
  nama: string;
  deskripsi: string;
  praktikumId: string;
  kelasId: string;
  nim: string;
  pertemuanKe: string;
  tanggal: string;
  jamMulai: string;
  jamSelesai: string;
  lokasi: string;
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
  nim: "",
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

const initialPraktikum: PraktikumData[] = [
  {
    id: "praktikum-001",
    nama: "Pemrograman Web",
    deskripsi: "HTML, CSS, dan pengembangan web.",
    aktif: true,
  },
  {
    id: "praktikum-002",
    nama: "Basis Data",
    deskripsi: "Perancangan dan query basis data.",
    aktif: true,
  },
  {
    id: "praktikum-003",
    nama: "Struktur Data",
    deskripsi: "Struktur data dan algoritma dasar.",
    aktif: true,
  },
];

const initialKelas: KelasData[] = [
  { id: "kelas-001", nama: "A", praktikumId: "praktikum-001", aktif: true },
  { id: "kelas-002", nama: "B", praktikumId: "praktikum-002", aktif: true },
];

const initialPeserta: PesertaData[] = [
  {
    id: "peserta-001",
    nama: "Budi Santoso",
    nim: "240101002",
    kelasId: "kelas-001",
    aktif: true,
    punyaRiwayat: true,
  },
  {
    id: "peserta-002",
    nama: "Citra Lestari",
    nim: "240101003",
    kelasId: "kelas-001",
    aktif: true,
    punyaRiwayat: false,
  },
];

const initialJadwal: JadwalData[] = [
  {
    id: "jadwal-001",
    kelasId: "kelas-001",
    pertemuanKe: 1,
    tanggal: "2026-10-23",
    jamMulai: "08:00",
    jamSelesai: "10:00",
    lokasi: "Lab Komputer 1",
    aktif: true,
    punyaSesi: true,
  },
  {
    id: "jadwal-002",
    kelasId: "kelas-002",
    pertemuanKe: 2,
    tanggal: "2026-10-24",
    jamMulai: "10:00",
    jamSelesai: "12:00",
    lokasi: "Lab Komputer 2",
    aktif: true,
    punyaSesi: false,
  },
];

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  maxLength,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  keyboardType?: "default" | "numeric";
  maxLength?: number;
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
        maxLength={maxLength}
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
      {choices.length ? (
        <View style={styles.choiceList}>
          {choices.map((choice) => {
            const selected = choice.id === selectedId;
            return (
              <Pressable
                key={choice.id}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => onSelect(choice.id)}
                style={[styles.choice, selected && styles.choiceSelected]}
              >
                <Text
                  style={[
                    styles.choiceText,
                    selected && styles.choiceTextSelected,
                  ]}
                >
                  {choice.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : (
        <Text style={styles.helperText}>
          Tambahkan data induk terlebih dahulu.
        </Text>
      )}
    </View>
  );
}

function RecordCard({
  title,
  detail,
  status,
  onEdit,
  onArchive,
  archiveLabel,
}: {
  title: string;
  detail: string;
  status: boolean;
  onEdit: () => void;
  onArchive: () => void;
  archiveLabel: string;
}) {
  return (
    <View style={styles.recordCard}>
      <View style={styles.recordTop}>
        <Text style={styles.recordTitle}>{title}</Text>
        <View
          style={[
            styles.recordStatus,
            status ? styles.activeStatus : styles.inactiveStatus,
          ]}
        >
          <Text
            style={[
              styles.recordStatusText,
              status ? styles.activeStatusText : styles.inactiveStatusText,
            ]}
          >
            {status ? "Aktif" : "Nonaktif"}
          </Text>
        </View>
      </View>
      <Text style={styles.recordDetail}>{detail}</Text>
      <View style={styles.recordActions}>
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
            {archiveLabel}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function AsistenKelolaDataScreen() {
  const [kind, setKind] = useState<DataKind>("praktikum");
  const [praktikum, setPraktikum] = useState(initialPraktikum);
  const [kelas, setKelas] = useState(initialKelas);
  const [peserta, setPeserta] = useState(initialPeserta);
  const [jadwal, setJadwal] = useState(initialJadwal);
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [formKind, setFormKind] = useState<DataKind>("praktikum");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [formError, setFormError] = useState("");
  const [pendingAction, setPendingAction] = useState<{
    kind: DataKind;
    id: string;
  } | null>(null);

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
    if (kind === "praktikum") {
      return praktikum.filter((item) =>
        `${item.nama} ${item.deskripsi}`
          .toLocaleLowerCase("id-ID")
          .includes(query),
      );
    }
    if (kind === "kelas") {
      return kelas.filter((item) =>
        `${item.nama} ${praktikum.find((course) => course.id === item.praktikumId)?.nama ?? ""}`
          .toLocaleLowerCase("id-ID")
          .includes(query),
      );
    }
    if (kind === "peserta") {
      return peserta.filter((item) =>
        `${item.nama} ${item.nim} ${kelas.find((classItem) => classItem.id === item.kelasId)?.nama ?? ""}`
          .toLocaleLowerCase("id-ID")
          .includes(query),
      );
    }
    return jadwal.filter((item) =>
      `${item.tanggal} ${item.lokasi} ${kelas.find((classItem) => classItem.id === item.kelasId)?.nama ?? ""}`
        .toLocaleLowerCase("id-ID")
        .includes(query),
    );
  }, [kind, jadwal, kelas, peserta, praktikum, search]);

  function openForm(nextKind: DataKind, id?: string) {
    setFormKind(nextKind);
    setEditingId(id ?? null);
    setFormError("");
    if (nextKind === "praktikum") {
      const current = praktikum.find((item) => item.id === id);
      setDraft({
        ...emptyDraft,
        nama: current?.nama ?? "",
        deskripsi: current?.deskripsi ?? "",
      });
    } else if (nextKind === "kelas") {
      const current = kelas.find((item) => item.id === id);
      setDraft({
        ...emptyDraft,
        nama: current?.nama ?? "",
        praktikumId:
          current?.praktikumId ??
          praktikum.find((item) => item.aktif)?.id ??
          "",
      });
    } else if (nextKind === "peserta") {
      const current = peserta.find((item) => item.id === id);
      setDraft({
        ...emptyDraft,
        nama: current?.nama ?? "",
        nim: current?.nim ?? "",
        kelasId: current?.kelasId ?? classChoices[0]?.id ?? "",
      });
    } else {
      const current = jadwal.find((item) => item.id === id);
      setDraft({
        ...emptyDraft,
        kelasId: current?.kelasId ?? classChoices[0]?.id ?? "",
        pertemuanKe: current ? String(current.pertemuanKe) : "",
        tanggal: current?.tanggal ?? "",
        jamMulai: current?.jamMulai ?? "",
        jamSelesai: current?.jamSelesai ?? "",
        lokasi: current?.lokasi ?? "",
      });
    }
    setFormOpen(true);
  }

  function updateDraft(field: keyof Draft, value: string) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function saveRecord() {
    const name = draft.nama.trim();
    const id = editingId ?? `${formKind}-${Date.now()}`;

    if (formKind === "praktikum") {
      if (!name) return setFormError("Nama praktikum wajib diisi.");
      const value = {
        id,
        nama: name,
        deskripsi: draft.deskripsi.trim(),
        aktif: true,
      };
      setPraktikum((current) =>
        editingId
          ? current.map((item) =>
              item.id === id ? { ...item, ...value, aktif: item.aktif } : item,
            )
          : [...current, value],
      );
    } else if (formKind === "kelas") {
      if (!name || !draft.praktikumId)
        return setFormError("Nama kelas dan praktikum wajib dipilih.");
      const value = {
        id,
        nama: name,
        praktikumId: draft.praktikumId,
        aktif: true,
      };
      setKelas((current) =>
        editingId
          ? current.map((item) =>
              item.id === id ? { ...item, ...value, aktif: item.aktif } : item,
            )
          : [...current, value],
      );
    } else if (formKind === "peserta") {
      if (
        !name ||
        (draft.nim.trim() && !/^\d{6,12}$/.test(draft.nim.trim())) ||
        !draft.kelasId
      ) {
        return setFormError(
          "Nama dan kelas wajib diisi. NIM, jika diisi, harus 6–12 digit.",
        );
      }
      const value = {
        id,
        nama: name,
        nim: draft.nim.trim(),
        kelasId: draft.kelasId,
        aktif: true,
        punyaRiwayat:
          peserta.find((item) => item.id === id)?.punyaRiwayat ?? false,
      };
      setPeserta((current) =>
        editingId
          ? current.map((item) =>
              item.id === id ? { ...item, ...value, aktif: item.aktif } : item,
            )
          : [...current, value],
      );
    } else {
      const pertemuanKe = Number(draft.pertemuanKe);
      const validTanggal = isValidDate(draft.tanggal);
      const validJam = (value: string) =>
        /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
      if (
        !draft.kelasId ||
        !Number.isInteger(pertemuanKe) ||
        pertemuanKe < 1 ||
        !validTanggal ||
        !validJam(draft.jamMulai) ||
        !validJam(draft.jamSelesai) ||
        draft.jamSelesai <= draft.jamMulai ||
        !draft.lokasi.trim()
      ) {
        return setFormError(
          "Lengkapi kelas, pertemuan, tanggal YYYY-MM-DD, jam HH:mm, dan lokasi.",
        );
      }
      const value = {
        id,
        kelasId: draft.kelasId,
        pertemuanKe,
        tanggal: draft.tanggal,
        jamMulai: draft.jamMulai,
        jamSelesai: draft.jamSelesai,
        lokasi: draft.lokasi.trim(),
        aktif: true,
        punyaSesi: jadwal.find((item) => item.id === id)?.punyaSesi ?? false,
      };
      setJadwal((current) =>
        editingId
          ? current.map((item) =>
              item.id === id ? { ...item, ...value, aktif: item.aktif } : item,
            )
          : [...current, value],
      );
    }
    setFormOpen(false);
  }

  function hasHistory(targetKind: DataKind, id: string) {
    if (targetKind === "praktikum") {
      const classIds = kelas
        .filter((item) => item.praktikumId === id)
        .map((item) => item.id);
      return (
        jadwal.some(
          (item) => classIds.includes(item.kelasId) && item.punyaSesi,
        ) ||
        peserta.some(
          (item) => classIds.includes(item.kelasId) && item.punyaRiwayat,
        )
      );
    }
    if (targetKind === "kelas") {
      return (
        jadwal.some((item) => item.kelasId === id && item.punyaSesi) ||
        peserta.some((item) => item.kelasId === id && item.punyaRiwayat)
      );
    }
    if (targetKind === "peserta")
      return peserta.find((item) => item.id === id)?.punyaRiwayat ?? false;
    return jadwal.find((item) => item.id === id)?.punyaSesi ?? false;
  }

  function archiveLabel(targetKind: DataKind, id: string, aktif: boolean) {
    if (!aktif) return "Aktifkan";
    return hasHistory(targetKind, id) ? "Nonaktifkan" : "Hapus";
  }

  function confirmAction() {
    if (!pendingAction) return;
    const { kind: targetKind, id } = pendingAction;
    const archived = hasHistory(targetKind, id);
    const shouldReactivate = pendingLabel === "Aktifkan";
    if (targetKind === "praktikum") {
      setPraktikum((items) =>
        shouldReactivate
          ? items.map((item) =>
              item.id === id ? { ...item, aktif: true } : item,
            )
          : archived
            ? items.map((item) =>
                item.id === id ? { ...item, aktif: false } : item,
              )
            : items.filter((item) => item.id !== id),
      );
      if (!archived && !shouldReactivate) {
        const classIds = kelas
          .filter((item) => item.praktikumId === id)
          .map((item) => item.id);
        setKelas((items) => items.filter((item) => item.praktikumId !== id));
        setPeserta((items) =>
          items.filter((item) => !classIds.includes(item.kelasId)),
        );
        setJadwal((items) =>
          items.filter((item) => !classIds.includes(item.kelasId)),
        );
      } else if (archived && !shouldReactivate) {
        const classIds = kelas
          .filter((item) => item.praktikumId === id)
          .map((item) => item.id);
        setKelas((items) =>
          items.map((item) =>
            classIds.includes(item.id) ? { ...item, aktif: false } : item,
          ),
        );
        setPeserta((items) =>
          items.map((item) =>
            classIds.includes(item.kelasId) ? { ...item, aktif: false } : item,
          ),
        );
        setJadwal((items) =>
          items.map((item) =>
            classIds.includes(item.kelasId) ? { ...item, aktif: false } : item,
          ),
        );
      }
    } else if (targetKind === "kelas") {
      setKelas((items) =>
        shouldReactivate
          ? items.map((item) =>
              item.id === id ? { ...item, aktif: true } : item,
            )
          : archived
            ? items.map((item) =>
                item.id === id ? { ...item, aktif: false } : item,
              )
            : items.filter((item) => item.id !== id),
      );
      if (!archived && !shouldReactivate) {
        setPeserta((items) => items.filter((item) => item.kelasId !== id));
        setJadwal((items) => items.filter((item) => item.kelasId !== id));
      } else if (archived && !shouldReactivate) {
        setPeserta((items) =>
          items.map((item) =>
            item.kelasId === id ? { ...item, aktif: false } : item,
          ),
        );
        setJadwal((items) =>
          items.map((item) =>
            item.kelasId === id ? { ...item, aktif: false } : item,
          ),
        );
      }
    } else if (targetKind === "peserta") {
      setPeserta((items) =>
        shouldReactivate
          ? items.map((item) =>
              item.id === id ? { ...item, aktif: true } : item,
            )
          : archived
            ? items.map((item) =>
                item.id === id ? { ...item, aktif: false } : item,
              )
            : items.filter((item) => item.id !== id),
      );
    } else {
      setJadwal((items) =>
        shouldReactivate
          ? items.map((item) =>
              item.id === id ? { ...item, aktif: true } : item,
            )
          : archived
            ? items.map((item) =>
                item.id === id ? { ...item, aktif: false } : item,
              )
            : items.filter((item) => item.id !== id),
      );
    }
    setPendingAction(null);
  }

  const activeCount =
    kind === "praktikum"
      ? praktikum.filter((item) => item.aktif).length
      : kind === "kelas"
        ? kelas.filter((item) => item.aktif).length
        : kind === "peserta"
          ? peserta.filter((item) => item.aktif).length
          : jadwal.filter((item) => item.aktif).length;

  function renderRecords() {
    if (kind === "praktikum") {
      return praktikum
        .filter((item) =>
          `${item.nama} ${item.deskripsi}`
            .toLocaleLowerCase("id-ID")
            .includes(search.trim().toLocaleLowerCase("id-ID")),
        )
        .map((item) => {
          return (
            <RecordCard
              key={item.id}
              title={item.nama}
              detail={`${item.deskripsi || "Tanpa deskripsi"} · ${kelas.filter((entry) => entry.praktikumId === item.id).length} kelas`}
              status={item.aktif}
              onEdit={() => openForm("praktikum", item.id)}
              archiveLabel={archiveLabel("praktikum", item.id, item.aktif)}
              onArchive={() =>
                setPendingAction({ kind: "praktikum", id: item.id })
              }
            />
          );
        });
    }
    if (kind === "kelas") {
      return kelas
        .filter((item) =>
          `${item.nama} ${praktikum.find((course) => course.id === item.praktikumId)?.nama ?? ""}`
            .toLocaleLowerCase("id-ID")
            .includes(search.trim().toLocaleLowerCase("id-ID")),
        )
        .map((item) => (
          <RecordCard
            key={item.id}
            title={`Kelas ${item.nama}`}
            detail={`${praktikum.find((course) => course.id === item.praktikumId)?.nama ?? "Praktikum tidak ditemukan"} · ${peserta.filter((entry) => entry.kelasId === item.id && entry.aktif).length} peserta · ${jadwal.filter((entry) => entry.kelasId === item.id && entry.aktif).length} jadwal`}
            status={item.aktif}
            onEdit={() => openForm("kelas", item.id)}
            archiveLabel={archiveLabel("kelas", item.id, item.aktif)}
            onArchive={() => setPendingAction({ kind: "kelas", id: item.id })}
          />
        ));
    }
    if (kind === "peserta") {
      return peserta
        .filter((item) =>
          `${item.nama} ${item.nim} ${kelas.find((entry) => entry.id === item.kelasId)?.nama ?? ""}`
            .toLocaleLowerCase("id-ID")
            .includes(search.trim().toLocaleLowerCase("id-ID")),
        )
        .map((item) => (
          <RecordCard
            key={item.id}
            title={item.nama}
            detail={`NIM ${item.nim} · Kelas ${kelas.find((entry) => entry.id === item.kelasId)?.nama ?? "-"}`}
            status={item.aktif}
            onEdit={() => openForm("peserta", item.id)}
            archiveLabel={archiveLabel("peserta", item.id, item.aktif)}
            onArchive={() => setPendingAction({ kind: "peserta", id: item.id })}
          />
        ));
    }
    return jadwal
      .filter((item) =>
        `${item.tanggal} ${item.lokasi} ${kelas.find((entry) => entry.id === item.kelasId)?.nama ?? ""}`
          .toLocaleLowerCase("id-ID")
          .includes(search.trim().toLocaleLowerCase("id-ID")),
      )
      .map((item) => {
        const classItem = kelas.find((entry) => entry.id === item.kelasId);
        return (
          <RecordCard
            key={item.id}
            title={`Pertemuan ${item.pertemuanKe} · ${item.tanggal}`}
            detail={`Kelas ${classItem?.nama ?? "-"} · ${praktikum.find((course) => course.id === classItem?.praktikumId)?.nama ?? "Praktikum"} · ${item.jamMulai}–${item.jamSelesai} · ${item.lokasi}`}
            status={item.aktif}
            onEdit={() => openForm("jadwal", item.id)}
            archiveLabel={archiveLabel("jadwal", item.id, item.aktif)}
            onArchive={() => setPendingAction({ kind: "jadwal", id: item.id })}
          />
        );
      });
  }

  function renderFormFields() {
    if (formKind === "praktikum") {
      return (
        <>
          <Field
            label="Nama praktikum"
            value={draft.nama}
            onChangeText={(value) => updateDraft("nama", value)}
            placeholder="Contoh: Pemrograman Web"
          />
          <Field
            label="Deskripsi"
            value={draft.deskripsi}
            onChangeText={(value) => updateDraft("deskripsi", value)}
            placeholder="Ringkasan praktikum"
          />
        </>
      );
    }
    if (formKind === "kelas") {
      return (
        <>
          <Field
            label="Nama kelas"
            value={draft.nama}
            onChangeText={(value) => updateDraft("nama", value)}
            placeholder="Contoh: A"
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
    }
    if (formKind === "peserta") {
      return (
        <>
          <Field
            label="Nama peserta"
            value={draft.nama}
            onChangeText={(value) => updateDraft("nama", value)}
            placeholder="Nama lengkap"
          />
          <Field
            label="NIM (opsional)"
            value={draft.nim}
            onChangeText={(value) => updateDraft("nim", value)}
            placeholder="6–12 digit"
            keyboardType="numeric"
            maxLength={12}
          />
          <ChoiceChips
            label="Kelas"
            choices={classChoices}
            selectedId={draft.kelasId}
            onSelect={(value) => updateDraft("kelasId", value)}
          />
        </>
      );
    }
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
          placeholder="Contoh: 3"
          keyboardType="numeric"
        />
        <Field
          label="Tanggal"
          value={draft.tanggal}
          onChangeText={(value) => updateDraft("tanggal", value)}
          placeholder="YYYY-MM-DD"
          maxLength={10}
        />
        <View style={styles.inlineFields}>
          <View style={styles.inlineField}>
            <Field
              label="Mulai"
              value={draft.jamMulai}
              onChangeText={(value) => updateDraft("jamMulai", value)}
              placeholder="08:00"
              maxLength={5}
            />
          </View>
          <View style={styles.inlineField}>
            <Field
              label="Selesai"
              value={draft.jamSelesai}
              onChangeText={(value) => updateDraft("jamSelesai", value)}
              placeholder="10:00"
              maxLength={5}
            />
          </View>
        </View>
        <Field
          label="Lokasi"
          value={draft.lokasi}
          onChangeText={(value) => updateDraft("lokasi", value)}
          placeholder="Contoh: Lab Komputer 1"
        />
      </>
    );
  }

  const pendingIsHistory = pendingAction
    ? hasHistory(pendingAction.kind, pendingAction.id)
    : false;
  const pendingLabel = pendingAction
    ? archiveLabel(
        pendingAction.kind,
        pendingAction.id,
        pendingAction.kind === "praktikum"
          ? (praktikum.find((item) => item.id === pendingAction.id)?.aktif ??
              false)
          : pendingAction.kind === "kelas"
            ? (kelas.find((item) => item.id === pendingAction.id)?.aktif ??
              false)
            : pendingAction.kind === "peserta"
              ? (peserta.find((item) => item.id === pendingAction.id)?.aktif ??
                false)
              : (jadwal.find((item) => item.id === pendingAction.id)?.aktif ??
                false),
      )
    : "";

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.topBar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Kembali ke jadwal"
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Text style={styles.backArrow}>‹</Text>
          </Pressable>
          <Text style={styles.topBarLabel}>AREA ASISTEN</Text>
          <View style={styles.roleMark}>
            <Text style={styles.roleMarkText}>A</Text>
          </View>
        </View>

        <Text style={styles.title}>Kelola Data</Text>
        <Text style={styles.subtitle}>
          Praktikum, kelas, peserta, dan jadwal.
        </Text>

        <View style={styles.summary}>
          <View>
            <Text style={styles.summaryEyebrow}>DATA AKTIF</Text>
            <Text style={styles.summaryCount}>{activeCount}</Text>
          </View>
          <Text style={styles.summaryLabel}>
            {TABS.find((item) => item.id === kind)?.label}
          </Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabs}
        >
          {TABS.map((tab) => {
            const selected = kind === tab.id;
            return (
              <Pressable
                key={tab.id}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
                onPress={() => {
                  setKind(tab.id);
                  setSearch("");
                }}
                style={[styles.tab, selected && styles.tabSelected]}
              >
                <Text
                  style={[styles.tabText, selected && styles.tabTextSelected]}
                >
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.listHeading}>
          <View style={styles.listTitleBlock}>
            <Text style={styles.listTitle}>
              Daftar{" "}
              {TABS.find((item) => item.id === kind)?.label.toLocaleLowerCase(
                "id-ID",
              )}
            </Text>
            <Text style={styles.listSubtitle}>
              {filtered.length} data ditemukan
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => openForm(kind)}
            style={({ pressed }) => [
              styles.addButton,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.addButtonText}>＋ Tambah</Text>
          </Pressable>
        </View>

        <TextInput
          accessibilityLabel="Cari data"
          value={search}
          onChangeText={setSearch}
          placeholder={`Cari ${TABS.find((item) => item.id === kind)?.label.toLocaleLowerCase("id-ID")}...`}
          placeholderTextColor={colors.textMuted}
          style={styles.searchInput}
        />

        {filtered.length ? (
          renderRecords()
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyMark}>—</Text>
            <Text style={styles.emptyTitle}>
              {search ? "Data tidak ditemukan" : "Belum ada data"}
            </Text>
            <Text style={styles.emptyDescription}>
              {search
                ? "Coba kata kunci lain."
                : `Tambahkan ${TABS.find((item) => item.id === kind)?.label.toLocaleLowerCase("id-ID")} pertama.`}
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
        <View style={styles.modalBackdrop}>
          <View style={styles.formCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalEyebrow}>
                  {editingId ? "UBAH DATA" : "DATA BARU"}
                </Text>
                <Text style={styles.modalTitle}>
                  {editingId ? "Ubah" : "Tambah"}{" "}
                  {TABS.find(
                    (item) => item.id === formKind,
                  )?.label.toLocaleLowerCase("id-ID")}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Tutup"
                onPress={() => setFormOpen(false)}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>×</Text>
              </Pressable>
            </View>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.formFields}
            >
              {renderFormFields()}
              {formError ? (
                <Text style={styles.errorText}>{formError}</Text>
              ) : null}
              <View style={styles.modalActions}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setFormOpen(false)}
                  style={[styles.modalButton, styles.cancelButton]}
                >
                  <Text style={styles.cancelButtonText}>Batal</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  onPress={saveRecord}
                  style={[styles.modalButton, styles.saveButton]}
                >
                  <Text style={styles.saveButtonText}>Simpan</Text>
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
        <View style={styles.modalBackdrop}>
          <View style={styles.confirmCard}>
            <Text style={styles.modalEyebrow}>KONFIRMASI</Text>
            <Text style={styles.modalTitle}>{pendingLabel} data?</Text>
            <Text style={styles.confirmText}>
              {pendingLabel === "Aktifkan"
                ? "Data akan diaktifkan kembali. Data turunan tetap mengikuti statusnya masing-masing."
                : pendingIsHistory
                  ? "Data memiliki sesi atau riwayat. Data akan dinonaktifkan agar riwayat tetap tersedia."
                  : "Data ini dan data turunannya yang belum memiliki riwayat akan dihapus."}
            </Text>
            <View style={styles.modalActions}>
              <Pressable
                accessibilityRole="button"
                onPress={() => setPendingAction(null)}
                style={[styles.modalButton, styles.cancelButton]}
              >
                <Text style={styles.cancelButtonText}>Batal</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={confirmAction}
                style={[
                  styles.modalButton,
                  pendingLabel === "Hapus"
                    ? styles.dangerButton
                    : styles.saveButton,
                ]}
              >
                <Text style={styles.saveButtonText}>{pendingLabel}</Text>
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
  content: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 36 },
  topBar: { flexDirection: "row", alignItems: "center", marginBottom: 24 },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
  },
  backArrow: { color: colors.text, fontSize: 30, lineHeight: 34 },
  topBarLabel: {
    flex: 1,
    marginLeft: 12,
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.2,
  },
  roleMark: {
    width: 32,
    height: 32,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.highlight,
  },
  roleMarkText: { color: colors.text, fontSize: 12, fontWeight: "800" },
  title: {
    color: colors.text,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "800",
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 5,
    marginBottom: 20,
  },
  summary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 18,
    borderRadius: 16,
    backgroundColor: colors.text,
    marginBottom: 22,
  },
  summaryEyebrow: {
    color: "rgba(254,255,224,0.72)",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
  },
  summaryCount: {
    color: colors.surface,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "800",
    marginTop: 4,
  },
  summaryLabel: {
    color: colors.text,
    backgroundColor: colors.highlight,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
    fontSize: 11,
    fontWeight: "800",
  },
  tabs: { gap: 8, paddingBottom: 20 },
  tab: {
    minHeight: 38,
    justifyContent: "center",
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
  },
  tabSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabText: { color: colors.textMuted, fontSize: 12, fontWeight: "700" },
  tabTextSelected: { color: colors.bg },
  listHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 13,
  },
  listTitleBlock: { flex: 1 },
  listTitle: { color: colors.text, fontSize: 18, fontWeight: "800" },
  listSubtitle: { color: colors.textMuted, fontSize: 12, marginTop: 4 },
  addButton: {
    minHeight: 40,
    justifyContent: "center",
    paddingHorizontal: 13,
    borderRadius: 12,
    backgroundColor: colors.primary,
  },
  addButtonText: { color: colors.bg, fontSize: 12, fontWeight: "800" },
  searchInput: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    color: colors.text,
    fontSize: 14,
    marginBottom: 13,
  },
  recordCard: {
    padding: 15,
    marginBottom: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  recordTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  recordTitle: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: "800",
  },
  recordStatus: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 9 },
  activeStatus: { backgroundColor: colors.highlight },
  inactiveStatus: { backgroundColor: "rgba(23,69,74,0.1)" },
  recordStatusText: { fontSize: 10, fontWeight: "800" },
  activeStatusText: { color: colors.text },
  inactiveStatusText: { color: colors.textMuted },
  recordDetail: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 7,
  },
  recordActions: { flexDirection: "row", gap: 8, marginTop: 13 },
  actionButton: {
    minHeight: 36,
    justifyContent: "center",
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: colors.text,
  },
  actionText: { color: colors.bg, fontSize: 11, fontWeight: "700" },
  secondaryAction: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
  },
  secondaryActionText: { color: colors.text },
  pressed: { opacity: 0.75 },
  emptyState: {
    alignItems: "center",
    paddingVertical: 38,
    paddingHorizontal: 22,
    borderRadius: 14,
    backgroundColor: colors.surface,
  },
  emptyMark: { color: colors.primary, fontSize: 28, fontWeight: "800" },
  emptyTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "800",
    marginTop: 8,
  },
  emptyDescription: {
    color: colors.textMuted,
    fontSize: 12,
    textAlign: "center",
    marginTop: 5,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: colors.scrim,
  },
  formCard: {
    width: "100%",
    maxWidth: 460,
    maxHeight: "90%",
    borderRadius: 18,
    padding: 18,
    backgroundColor: colors.bg,
  },
  confirmCard: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 18,
    padding: 20,
    backgroundColor: colors.bg,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  modalEyebrow: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
  },
  modalTitle: {
    color: colors.text,
    fontSize: 19,
    lineHeight: 25,
    fontWeight: "800",
    marginTop: 5,
    textTransform: "capitalize",
  },
  closeButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 11,
    backgroundColor: colors.surface,
  },
  closeButtonText: { color: colors.text, fontSize: 24, lineHeight: 28 },
  formFields: { paddingBottom: 4 },
  field: { marginBottom: 14 },
  fieldLabel: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 7,
  },
  input: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 11,
    paddingHorizontal: 12,
    color: colors.text,
    fontSize: 14,
  },
  choiceList: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  choice: {
    minHeight: 35,
    justifyContent: "center",
    paddingHorizontal: 11,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: colors.bg,
  },
  choiceSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  choiceText: { color: colors.textMuted, fontSize: 11, fontWeight: "700" },
  choiceTextSelected: { color: colors.bg },
  helperText: { color: colors.textMuted, fontSize: 12 },
  inlineFields: { flexDirection: "row", gap: 10 },
  inlineField: { flex: 1 },
  errorText: {
    color: colors.primary,
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 12,
  },
  modalActions: { flexDirection: "row", gap: 10, marginTop: 6 },
  modalButton: {
    flex: 1,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 11,
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
  },
  cancelButtonText: { color: colors.text, fontSize: 13, fontWeight: "700" },
  saveButton: { backgroundColor: colors.primary },
  dangerButton: { backgroundColor: "#B4233F" },
  saveButtonText: { color: colors.bg, fontSize: 13, fontWeight: "800" },
  confirmText: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 10,
    marginBottom: 18,
  },
});
