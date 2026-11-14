import { router } from "expo-router";
import { useState } from "react";
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
import {
    useAsistenWorkflowStore,
    type DraftSesi,
    type SesiAsisten,
} from "./AsistenWorkflowStore";

const emptyDraft: DraftSesi = {
  praktikum: "",
  pertemuanKe: 1,
  kelas: "",
  lab: "",
  tanggal: "",
  jamMulai: "",
  jamSelesai: "",
  catatan: "",
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

function formatDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("id-ID", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function SessionRow({
  session,
  onEdit,
  onDelete,
  canDelete,
}: {
  session: SesiAsisten;
  onEdit: () => void;
  onDelete: () => void;
  canDelete: boolean;
}) {
  const statusLabel =
    session.status === "dibuka"
      ? "Dibuka"
      : session.status === "ditutup"
        ? "Ditutup"
        : "Belum dibuka";
  return (
    <View style={styles.sessionCard}>
      <View style={styles.sessionHeading}>
        <View style={styles.sessionHeadingText}>
          <Text style={styles.sessionCourse}>{session.praktikum}</Text>
          <Text style={styles.sessionMeta}>
            Pertemuan {session.pertemuanKe} · Kelas {session.kelas}
          </Text>
        </View>
        <Text
          style={[
            styles.status,
            session.status === "dibuka" && styles.statusOpen,
            session.status === "ditutup" && styles.statusClosed,
          ]}
        >
          {statusLabel}
        </Text>
      </View>
      <Text style={styles.sessionDetail}>
        {formatDate(session.tanggal)} · {session.jamMulai}–{session.jamSelesai}
      </Text>
      <Text style={styles.sessionDetail}>
        {session.lab} · {session.hadir}/{session.total} hadir
      </Text>
      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          onPress={() =>
            router.push({
              pathname: "/asisten/detail-sesi",
              params: { sesiId: session.id },
            })
          }
          style={styles.primaryAction}
        >
          <Text style={styles.primaryActionText}>
            {session.status === "belum_dibuka" ? "Buka sesi" : "Lihat detail"}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={session.status !== "belum_dibuka"}
          onPress={onEdit}
          style={[
            styles.action,
            session.status !== "belum_dibuka" && styles.disabled,
          ]}
        >
          <Text style={styles.actionText}>Ubah</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={
            !canDelete || session.status !== "belum_dibuka" || session.hadir > 0
          }
          onPress={onDelete}
          style={[
            styles.action,
            styles.deleteAction,
            (!canDelete ||
              session.status !== "belum_dibuka" ||
              session.hadir > 0) &&
              styles.disabled,
          ]}
        >
          <Text style={styles.deleteText}>Hapus</Text>
        </Pressable>
      </View>
      {session.status !== "belum_dibuka" || session.hadir > 0 || !canDelete ? (
        <Text style={styles.helper}>
          Sesi yang sudah dimulai atau memiliki presensi/pengajuan tidak dapat
          dihapus.
        </Text>
      ) : null}
    </View>
  );
}

export default function AsistenKelolaSesiScreen() {
  const { sesi, pengajuan, simpanSesi, hapusSesi } = useAsistenWorkflowStore();
  const [formVisible, setFormVisible] = useState(false);
  const [editing, setEditing] = useState<SesiAsisten | null>(null);
  const [draft, setDraft] = useState<DraftSesi>(emptyDraft);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<SesiAsisten | null>(null);

  const [busy, setBusy] = useState(false);

  function openForm(session?: SesiAsisten) {
    setEditing(session ?? null);
    setDraft(
      session
        ? {
            praktikum: session.praktikum,
            pertemuanKe: session.pertemuanKe,
            kelas: session.kelas,
            lab: session.lab,
            tanggal: session.tanggal,
            jamMulai: session.jamMulai,
            jamSelesai: session.jamSelesai,
            catatan: session.catatan ?? "",
          }
        : emptyDraft,
    );
    setError("");
    setFormVisible(true);
  }

  function change(field: keyof DraftSesi, value: string) {
    setDraft((current) => ({
      ...current,
      [field]:
        field === "pertemuanKe" ? Number(value.replace(/\D/g, "")) : value,
    }));
  }

  async function save() {
    const validDate =
      /^\d{4}-\d{2}-\d{2}$/.test(draft.tanggal) &&
      !Number.isNaN(Date.parse(`${draft.tanggal}T00:00:00`));
    const validTime = (value: string) =>
      /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
    if (
      !draft.praktikum.trim() ||
      !draft.kelas.trim() ||
      !draft.lab.trim() ||
      !isValidDate(draft.tanggal) ||
      !validTime(draft.jamMulai) ||
      !validTime(draft.jamSelesai) ||
      draft.jamSelesai <= draft.jamMulai ||
      !draft.pertemuanKe
    ) {
      setError(
        "Periksa nama praktikum, kelas, lokasi, tanggal, pertemuan, dan rentang waktu.",
      );
      return;
    }
    const result = await simpanSesi(
      { ...draft, catatan: draft.catatan?.trim() },
      editing?.id,
    );
    if (!result.success) {
      setError(result.message);
      return;
    }
    setFormVisible(false);
    setMessage(result.message);
  }

  async function remove() {
    if (!deleteTarget) return;
    const result = await hapusSesi(deleteTarget.id);
    setDeleteTarget(null);
    setMessage(result.message);
  }

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Kembali"
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Text style={styles.backArrow}>‹</Text>
          <Text style={styles.backText}>Kembali</Text>
        </Pressable>
        <View style={styles.headingRow}>
          <View style={styles.headingCopy}>
            <Text style={styles.eyebrow}>AREA ASISTEN</Text>
            <Text style={styles.title}>Sesi Praktikum</Text>
            <Text style={styles.subtitle}>
              Kelola pertemuan dan pantau status sesi.
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Tambah sesi"
            onPress={() => openForm()}
            style={styles.addButton}
          >
            <Text style={styles.addText}>＋</Text>
          </Pressable>
        </View>
        {message ? (
          <Text accessibilityRole="alert" style={styles.message}>
            {message}
          </Text>
        ) : null}
        {sesi.length ? (
          sesi.map((session) => (
            <SessionRow
              key={session.id}
              session={session}
              onEdit={() => openForm(session)}
              onDelete={() => setDeleteTarget(session)}
              canDelete={!pengajuan.some((item) => item.sesiId === session.id)}
            />
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Belum ada sesi</Text>
            <Text style={styles.emptyText}>
              Buat sesi pertama untuk memulai.
            </Text>
          </View>
        )}
      </ScrollView>

      <Modal
        visible={formVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setFormVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.formCard}>
            <View style={styles.modalHeading}>
              <View>
                <Text style={styles.eyebrow}>
                  {editing ? "UBAH SESI" : "SESI BARU"}
                </Text>
                <Text style={styles.modalTitle}>
                  {editing ? "Ubah sesi" : "Tambah sesi"}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Tutup"
                onPress={() => setFormVisible(false)}
              >
                <Text style={styles.close}>×</Text>
              </Pressable>
            </View>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.formFields}
            >
              <Field
                label="Praktikum"
                value={draft.praktikum}
                onChangeText={(value) => change("praktikum", value)}
                placeholder="Nama praktikum"
              />
              <View style={styles.inlineFields}>
                <View style={styles.inlineHalf}>
                  <Field
                    label="Pertemuan ke"
                    value={String(draft.pertemuanKe || "")}
                    onChangeText={(value) => change("pertemuanKe", value)}
                    placeholder="1"
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.inlineHalf}>
                  <Field
                    label="Kelas"
                    value={draft.kelas}
                    onChangeText={(value) => change("kelas", value)}
                    placeholder="A"
                  />
                </View>
              </View>
              <Field
                label="Tanggal"
                value={draft.tanggal}
                onChangeText={(value) => change("tanggal", value)}
                placeholder="YYYY-MM-DD"
              />
              <View style={styles.inlineFields}>
                <View style={styles.inlineHalf}>
                  <Field
                    label="Mulai"
                    value={draft.jamMulai}
                    onChangeText={(value) => change("jamMulai", value)}
                    placeholder="08:00"
                  />
                </View>
                <View style={styles.inlineHalf}>
                  <Field
                    label="Selesai"
                    value={draft.jamSelesai}
                    onChangeText={(value) => change("jamSelesai", value)}
                    placeholder="10:00"
                  />
                </View>
              </View>
              <Field
                label="Lokasi"
                value={draft.lab}
                onChangeText={(value) => change("lab", value)}
                placeholder="Laboratorium"
              />
              <Field
                label="Catatan (opsional)"
                value={draft.catatan ?? ""}
                onChangeText={(value) => change("catatan", value)}
                placeholder="Topik pertemuan"
              />
              {error ? (
                <Text accessibilityRole="alert" style={styles.error}>
                  {error}
                </Text>
              ) : null}
              <View style={styles.actions}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setFormVisible(false)}
                  style={[styles.modalButton, styles.cancelButton]}
                >
                  <Text style={styles.cancelText}>Batal</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  onPress={save}
                  style={[styles.modalButton, styles.saveButton]}
                >
                  <Text style={styles.saveText}>Simpan</Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={!!deleteTarget}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteTarget(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.confirmCard}>
            <Text style={styles.eyebrow}>KONFIRMASI</Text>
            <Text style={styles.modalTitle}>Hapus sesi?</Text>
            <Text style={styles.confirmText}>
              Sesi hanya dapat dihapus jika belum dibuka dan belum memiliki
              presensi atau pengajuan izin.
            </Text>
            <View style={styles.actions}>
              <Pressable
                accessibilityRole="button"
                onPress={() => setDeleteTarget(null)}
                style={[styles.modalButton, styles.cancelButton]}
              >
                <Text style={styles.cancelText}>Batal</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={remove}
                style={[styles.modalButton, styles.deleteButton]}
              >
                <Text style={styles.saveText}>Hapus</Text>
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
  content: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 32 },
  backButton: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginBottom: 18,
  },
  backArrow: { color: colors.primary, fontSize: 28, lineHeight: 30 },
  backText: { color: colors.text, fontSize: 13, fontWeight: "700" },
  headingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 20,
  },
  headingCopy: { flex: 1 },
  eyebrow: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
  },
  title: {
    color: colors.text,
    fontSize: 27,
    lineHeight: 33,
    fontWeight: "800",
    marginTop: 5,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
  },
  addText: {
    color: colors.bg,
    fontSize: 26,
    lineHeight: 30,
    fontWeight: "500",
  },
  message: {
    color: colors.text,
    backgroundColor: colors.highlight,
    padding: 11,
    borderRadius: 10,
    fontSize: 12,
    marginBottom: 12,
  },
  sessionCard: {
    padding: 15,
    marginBottom: 11,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    backgroundColor: colors.surface,
  },
  sessionHeading: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  sessionHeadingText: { flex: 1 },
  sessionCourse: { color: colors.text, fontSize: 15, fontWeight: "800" },
  sessionMeta: { color: colors.textMuted, fontSize: 12, marginTop: 4 },
  status: {
    color: colors.text,
    backgroundColor: colors.bg,
    borderRadius: 9,
    paddingHorizontal: 8,
    paddingVertical: 5,
    fontSize: 10,
    fontWeight: "800",
  },
  statusOpen: { backgroundColor: colors.highlight },
  statusClosed: { color: colors.bg, backgroundColor: colors.primary },
  sessionDetail: { color: colors.textMuted, fontSize: 12, marginTop: 8 },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 13,
  },
  primaryAction: {
    minHeight: 36,
    justifyContent: "center",
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: colors.text,
  },
  primaryActionText: { color: colors.bg, fontSize: 11, fontWeight: "800" },
  action: {
    minHeight: 36,
    justifyContent: "center",
    paddingHorizontal: 11,
    borderRadius: 10,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionText: { color: colors.text, fontSize: 11, fontWeight: "700" },
  deleteAction: { marginLeft: "auto", borderColor: "rgba(181,24,95,0.3)" },
  deleteText: { color: colors.primary, fontSize: 11, fontWeight: "700" },
  disabled: { opacity: 0.4 },
  helper: {
    color: colors.textMuted,
    fontSize: 10,
    lineHeight: 15,
    marginTop: 8,
  },
  emptyState: {
    alignItems: "center",
    padding: 28,
    borderRadius: 14,
    backgroundColor: colors.surface,
  },
  emptyTitle: { color: colors.text, fontSize: 15, fontWeight: "800" },
  emptyText: { color: colors.textMuted, fontSize: 12, marginTop: 5 },
  modalBackdrop: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 18,
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
  modalHeading: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  modalTitle: {
    color: colors.text,
    fontSize: 19,
    lineHeight: 25,
    fontWeight: "800",
    marginTop: 5,
  },
  close: { color: colors.text, fontSize: 28 },
  formFields: { paddingBottom: 4 },
  field: { marginBottom: 13 },
  fieldLabel: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 6,
  },
  input: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 11,
    color: colors.text,
    fontSize: 14,
  },
  inlineFields: { flexDirection: "row", gap: 10 },
  inlineHalf: { flex: 1 },
  error: {
    color: colors.primary,
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 8,
  },
  modalButton: {
    flex: 1,
    minHeight: 43,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
  },
  cancelText: { color: colors.text, fontSize: 12, fontWeight: "700" },
  saveButton: { backgroundColor: colors.primary },
  deleteButton: { backgroundColor: "#B4233F" },
  saveText: { color: colors.bg, fontSize: 12, fontWeight: "800" },
  confirmText: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 10,
  },
});
