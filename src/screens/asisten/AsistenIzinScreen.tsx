import { router } from "expo-router";
import { useMemo, useState } from "react";
import {
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "../../constants/theme";
import {
    useAsistenWorkflowStore,
    type PengajuanIzin,
} from "./AsistenWorkflowStore";

type Filter = "menunggu" | "semua" | "diputuskan";
type Decision = "diterima" | "ditolak";

const filterLabels: Record<Filter, string> = {
  menunggu: "Menunggu",
  semua: "Semua",
  diputuskan: "Diputuskan",
};

function formatDate(value: string) {
  return new Date(value).toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  });
}

function Status({ status }: { status: PengajuanIzin["status"] }) {
  const label =
    status === "menunggu"
      ? "Menunggu"
      : status === "diterima"
        ? "Diterima"
        : "Ditolak";
  return (
    <View
      style={[
        styles.status,
        status === "diterima"
          ? styles.statusAccepted
          : status === "ditolak"
            ? styles.statusRejected
            : styles.statusWaiting,
      ]}
    >
      <Text
        style={[
          styles.statusText,
          status === "ditolak" && styles.statusTextLight,
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

export default function AsistenIzinScreen() {
  const { pengajuan, sesi, putuskanIzin } = useAsistenWorkflowStore();
  const [filter, setFilter] = useState<Filter>("menunggu");
  const [selected, setSelected] = useState<{
    item: PengajuanIzin;
    decision: Decision;
  } | null>(null);
  const [feedback, setFeedback] = useState("");

  const filtered = useMemo(
    () =>
      pengajuan
        .filter(
          (item) =>
            filter === "semua" ||
            (filter === "menunggu"
              ? item.status === "menunggu"
              : item.status !== "menunggu"),
        )
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [filter, pengajuan],
  );

  async function confirmDecision() {
    if (!selected) return;
    const result = await putuskanIzin(selected.item.id, selected.decision);
    setSelected(null);
    setFeedback(result.message);
  }

  const pendingCount = pengajuan.filter(
    (item) => item.status === "menunggu",
  ).length;

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
        <Text style={styles.eyebrow}>AREA ASISTEN</Text>
        <View style={styles.titleRow}>
          <View style={styles.titleCopy}>
            <Text style={styles.title}>Pengajuan Izin</Text>
            <Text style={styles.subtitle}>
              Tinjau alasan, lalu tentukan keputusan secara manual.
            </Text>
          </View>
          <View style={styles.countBubble}>
            <Text style={styles.countText}>{pendingCount}</Text>
          </View>
        </View>

        {feedback ? (
          <Text accessibilityRole="alert" style={styles.feedback}>
            {feedback}
          </Text>
        ) : null}

        <View style={styles.filters}>
          {(Object.keys(filterLabels) as Filter[]).map((value) => {
            const active = filter === value;
            return (
              <Pressable
                key={value}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                onPress={() => setFilter(value)}
                style={[
                  styles.filterButton,
                  active && styles.filterButtonActive,
                ]}
              >
                <Text
                  style={[styles.filterText, active && styles.filterTextActive]}
                >
                  {filterLabels[value]}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {filtered.length ? (
          filtered.map((item) => {
            const session = sesi.find((entry) => entry.id === item.sesiId);
            return (
              <View key={item.id} style={styles.requestCard}>
                <View style={styles.cardHeader}>
                  <View style={styles.studentInfo}>
                    <Text style={styles.studentName}>{item.nama}</Text>
                    <Text style={styles.studentMeta}>NIM {item.nim}</Text>
                  </View>
                  <Status status={item.status} />
                </View>
                <View style={styles.sessionInfo}>
                  <Text style={styles.sessionLabel}>SESI TERKAIT</Text>
                  <Text style={styles.sessionTitle}>
                    {session
                      ? `${session.praktikum} · Pertemuan ${session.pertemuanKe} · Kelas ${session.kelas}`
                      : "Sesi tidak ditemukan"}
                  </Text>
                </View>
                <Text style={styles.reasonLabel}>ALASAN</Text>
                <Text style={styles.reason}>{item.alasan}</Text>
                <View style={styles.classification}>
                  <Text style={styles.classificationLabel}>KLASIFIKASI AI</Text>
                  <Text
                    style={[
                      styles.classificationValue,
                      item.statusKlasifikasi === "gagal" &&
                        styles.classificationFailed,
                    ]}
                  >
                    {item.statusKlasifikasi === "berhasil"
                      ? (item.kategoriAI ?? "Kategori belum tersedia")
                      : "Klasifikasi gagal · tinjau alasan secara manual"}
                  </Text>
                </View>
                <Text style={styles.timestamp}>
                  Diajukan {formatDate(item.createdAt)}
                </Text>
                {item.status !== "menunggu" ? (
                  <Text style={styles.reviewedText}>
                    Diputuskan oleh Asisten ·{" "}
                    {item.reviewedAt
                      ? formatDate(item.reviewedAt)
                      : "Waktu tidak tersedia"}
                  </Text>
                ) : (
                  <View style={styles.decisionActions}>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => setSelected({ item, decision: "ditolak" })}
                      style={[styles.decisionButton, styles.rejectButton]}
                    >
                      <Text style={styles.rejectText}>Tolak</Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() =>
                        setSelected({ item, decision: "diterima" })
                      }
                      style={[styles.decisionButton, styles.acceptButton]}
                    >
                      <Text style={styles.acceptText}>Terima</Text>
                    </Pressable>
                  </View>
                )}
              </View>
            );
          })
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyMark}>—</Text>
            <Text style={styles.emptyTitle}>
              {filter === "menunggu"
                ? "Tidak ada pengajuan menunggu"
                : "Belum ada pengajuan"}
            </Text>
            <Text style={styles.emptyText}>
              Pengajuan izin untuk sesi yang dikelola akan muncul di sini.
            </Text>
          </View>
        )}
      </ScrollView>

      <Modal
        visible={!!selected}
        transparent
        animationType="fade"
        onRequestClose={() => setSelected(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.confirmCard}>
            <Text style={styles.eyebrow}>KEPUTUSAN ASISTEN</Text>
            <Text style={styles.modalTitle}>
              {selected?.decision === "diterima"
                ? "Terima pengajuan izin?"
                : "Tolak pengajuan izin?"}
            </Text>
            <Text style={styles.modalDescription}>
              Keputusan ini akan terlihat oleh praktikan. Hasil klasifikasi AI
              hanya informasi pendukung.
            </Text>
            <View style={styles.modalActions}>
              <Pressable
                accessibilityRole="button"
                onPress={() => setSelected(null)}
                style={[styles.modalButton, styles.cancelButton]}
              >
                <Text style={styles.cancelText}>Kembali</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={confirmDecision}
                style={[
                  styles.modalButton,
                  selected?.decision === "ditolak"
                    ? styles.rejectButton
                    : styles.acceptButton,
                ]}
              >
                <Text
                  style={
                    selected?.decision === "ditolak"
                      ? styles.rejectText
                      : styles.acceptText
                  }
                >
                  {selected?.decision === "ditolak"
                    ? "Tolak izin"
                    : "Terima izin"}
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
  content: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 34 },
  backButton: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginBottom: 17,
  },
  backArrow: { color: colors.primary, fontSize: 28, lineHeight: 30 },
  backText: { color: colors.text, fontSize: 13, fontWeight: "700" },
  eyebrow: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 6,
    marginBottom: 19,
  },
  titleCopy: { flex: 1 },
  title: {
    color: colors.text,
    fontSize: 26,
    lineHeight: 32,
    fontWeight: "800",
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
  },
  countBubble: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: colors.highlight,
  },
  countText: { color: colors.text, fontSize: 17, fontWeight: "800" },
  feedback: {
    color: colors.text,
    fontSize: 12,
    lineHeight: 18,
    backgroundColor: colors.highlight,
    padding: 11,
    borderRadius: 10,
    marginBottom: 12,
  },
  filters: { flexDirection: "row", gap: 8, marginBottom: 14 },
  filterButton: {
    flex: 1,
    minHeight: 38,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 11,
    backgroundColor: colors.bg,
  },
  filterButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterText: { color: colors.textMuted, fontSize: 11, fontWeight: "700" },
  filterTextActive: { color: colors.bg },
  requestCard: {
    padding: 15,
    marginBottom: 11,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    backgroundColor: colors.surface,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 9,
  },
  studentInfo: { flex: 1 },
  studentName: { color: colors.text, fontSize: 15, fontWeight: "800" },
  studentMeta: { color: colors.textMuted, fontSize: 11, marginTop: 4 },
  status: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 9 },
  statusWaiting: { backgroundColor: colors.highlight },
  statusAccepted: { backgroundColor: colors.accent },
  statusRejected: { backgroundColor: colors.primary },
  statusText: { color: colors.text, fontSize: 10, fontWeight: "800" },
  statusTextLight: { color: colors.bg },
  sessionInfo: {
    padding: 10,
    marginTop: 13,
    borderRadius: 10,
    backgroundColor: colors.bg,
  },
  sessionLabel: {
    color: colors.textMuted,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  sessionTitle: {
    color: colors.text,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
    marginTop: 4,
  },
  reasonLabel: {
    color: colors.textMuted,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.8,
    marginTop: 14,
  },
  reason: { color: colors.text, fontSize: 13, lineHeight: 19, marginTop: 5 },
  classification: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 9,
    padding: 10,
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: colors.bg,
  },
  classificationLabel: {
    color: colors.textMuted,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  classificationValue: {
    flex: 1,
    color: colors.text,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: "700",
  },
  classificationFailed: { color: colors.primary },
  timestamp: { color: colors.textMuted, fontSize: 10, marginTop: 11 },
  reviewedText: {
    color: colors.textMuted,
    fontSize: 10,
    lineHeight: 15,
    marginTop: 5,
  },
  decisionActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 13,
  },
  decisionButton: {
    minWidth: 84,
    minHeight: 38,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  rejectButton: {
    borderWidth: 1,
    borderColor: "rgba(181,24,95,0.35)",
    backgroundColor: colors.bg,
  },
  rejectText: { color: colors.primary, fontSize: 12, fontWeight: "800" },
  acceptButton: { backgroundColor: colors.highlight },
  acceptText: { color: colors.text, fontSize: 12, fontWeight: "800" },
  emptyState: {
    alignItems: "center",
    padding: 30,
    borderRadius: 14,
    backgroundColor: colors.surface,
  },
  emptyMark: { color: colors.primary, fontSize: 26, fontWeight: "800" },
  emptyTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "800",
    marginTop: 7,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
    marginTop: 5,
  },
  modalBackdrop: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    backgroundColor: colors.scrim,
  },
  confirmCard: {
    width: "100%",
    maxWidth: 420,
    padding: 20,
    borderRadius: 16,
    backgroundColor: colors.bg,
  },
  modalTitle: {
    color: colors.text,
    fontSize: 19,
    lineHeight: 25,
    fontWeight: "800",
    marginTop: 6,
  },
  modalDescription: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 8,
    marginBottom: 15,
  },
  modalActions: { flexDirection: "row", gap: 9 },
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
});
