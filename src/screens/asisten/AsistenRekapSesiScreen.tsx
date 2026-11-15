import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { SesiStatus } from "../../data/types";
import { useRekapPresensi } from "../../hooks/useRekapPresensi";

type StatusSesi = SesiStatus;

// type PraktikanHadir = {
//   id: string;
//   nama: string;
//   nim: string;
//   waktu: string;
// };

const WARNA = {
  bg: "#FFFFFF",
  surface: "#FEFFE0",
  text: "#17454A",
  textMuted: "rgba(23, 69, 74, 0.7)",
  primary: "#B5185F",
  highlight: "#D0E86E",
  border: "rgba(23, 69, 74, 0.15)",
  scrim: "rgba(23, 69, 74, 0.5)",
};

function formatTanggal(tanggal?: string) {
  if (!tanggal || !tanggal.includes("-")) return tanggal || "-";
  const [tahun, bulan, hari] = tanggal.split("-").map(Number);

  return new Date(tahun, bulan - 1, hari)
    .toLocaleDateString("id-ID", {
      weekday: "short",
      day: "numeric",
      month: "short",
    })
    .replace(".", "");
}

function StatusBadge({ status }: { status: StatusSesi }) {
  const isOpen = status === "dibuka";
  const label =
    status === "dibuka"
      ? "Dibuka"
      : status === "ditutup"
        ? "Ditutup"
        : "Belum dibuka";

  return (
    <View
      style={[
        styles.statusBadge,
        isOpen
          ? styles.statusOpen
          : status === "ditutup"
            ? styles.statusClosed
            : styles.statusPending,
      ]}
    >
      {isOpen && <View style={styles.statusDot} />}
      <Text
        style={[
          styles.statusText,
          status === "ditutup" && styles.statusTextClosed,
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

function Tombol({
  label,
  variant = "primary",
  onPress,
  disabled = false,
}: {
  label: string;
  variant?: "primary" | "outline" | "danger";
  onPress: () => void;
  disabled?: boolean;
}) {
  const buttonStyle =
    variant === "outline"
      ? styles.buttonOutline
      : variant === "danger"
        ? styles.buttonDanger
        : styles.buttonPrimary;

  const textStyle =
    variant === "outline" || variant === "danger"
      ? styles.buttonTextDark
      : styles.buttonTextLight;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        buttonStyle,
        pressed && styles.pressed,
        disabled && { opacity: 0.5 },
      ]}
    >
      <Text style={[styles.buttonText, textStyle]}>{label}</Text>
    </Pressable>
  );
}

// export default function AsistenRekapSesiScreen() {
//   const { sesiId } = useLocalSearchParams<{ sesiId?: string }>();
//   const activeSessionId = Array.isArray(sesiId) ? sesiId[0] : sesiId;
//   const { sesi, tutup } = useAsistenWorkflowStore();
//   const { presensi } = useApp();
//   const currentSession =
//     sesi.find((item) => item.id === activeSessionId) ?? sesi[0];
//   const session = currentSession ?? {
//     id: "",
//     praktikum: "Praktikum",
//     pertemuanKe: 0,
//     kelas: "-",
//     lab: "-",
//     tanggal: "2026-01-01",
//     jamMulai: "--:--",
//     jamSelesai: "--:--",
//     status: "belum_dibuka" as StatusSesi,
//     hadir: 0,
//     total: 0,
//   };
//   const [modalTutupTerbuka, setModalTutupTerbuka] = useState(false);
//   const [feedback, setFeedback] = useState("");

//   const daftarTerurut = useMemo(
//     () =>
//       presensi
//         .filter((entry) => entry.sesiId === session.id)
//         .map((entry): PraktikanHadir => {
//           const user = dummyUsers.find((item) => item.id === entry.praktikanId);
//           return {
//             id: entry.id,
//             nama: user?.nama ?? "Praktikan",
//             nim: user?.nim ?? "NIM tidak tersedia",
//             waktu: new Date(entry.waktuHadir).toLocaleTimeString("id-ID", {
//               hour: "2-digit",
//               minute: "2-digit",
//               second: "2-digit",
//               hour12: false,
//               timeZone: "Asia/Jakarta",
//             }),
//           };
//         })
//         .sort((a, b) => a.waktu.localeCompare(b.waktu)),
//     [presensi, session.id],
//   );

//   const jumlahHadir = daftarTerurut.length;
//   const persentase =
//     session.total > 0 ? Math.round((jumlahHadir / session.total) * 100) : 0;

//   function tutupSesi() {
//     const result = tutup(session.id);
//     setFeedback(result.message);
//     setModalTutupTerbuka(false);
//   }

//   return (
//     <SafeAreaView edges={["top", "left", "right"]} style={styles.safeArea}>
//       <View style={styles.page}>
//         <Pressable
//           accessibilityRole="button"
//           accessibilityLabel="Kembali"
//           onPress={() => router.back()}
//           style={({ pressed }) => [
//             styles.backButton,
//             pressed && styles.pressed,
//           ]}
//         >
//           <Text style={styles.backArrow}>‹</Text>
//           <Text style={styles.backLabel}>Kembali</Text>
//         </Pressable>

//         <View style={styles.heading}>
//           <Text style={styles.eyebrow}>PRESENSI PRAKTIKUM</Text>
//           <Text style={styles.title}>Rekap Kehadiran</Text>
//         </View>

//         <View style={styles.sessionHeader}>
//           <View style={styles.sessionHeaderText}>
//             <Text style={styles.courseName}>{session.praktikum}</Text>
//             <Text style={styles.sessionMeta}>
//               Pertemuan {session.pertemuanKe} · Kelas {session.kelas} ·{" "}
//               {formatTanggal(session.tanggal)}
//             </Text>
//           </View>
//           <StatusBadge status={session.status} />
//         </View>

//         <View style={styles.summaryCard}>
//           <View style={styles.summaryTop}>
//             <View>
//               <Text style={styles.summaryEyebrow}>TOTAL KEHADIRAN</Text>
//               <Text style={styles.summaryCount}>
//                 {jumlahHadir}
//                 <Text style={styles.summaryTotal}> / {session.total}</Text>
//               </Text>
//               <Text style={styles.summaryCaption}>praktikan hadir</Text>
//             </View>

//             <View style={styles.percentCircle}>
//               <Text style={styles.percentValue}>{persentase}%</Text>
//             </View>
//           </View>

//           <View style={styles.progressTrack}>
//             <View
//               style={[
//                 styles.progressFill,
//                 { width: `${persentase}%` as `${number}%` },
//               ]}
//             />
//           </View>
//         </View>

//         <View style={styles.listHeading}>
//           <View>
//             <Text style={styles.listTitle}>Daftar praktikan</Text>
//             <Text style={styles.listSubtitle}>
//               Diurutkan berdasarkan waktu presensi
//             </Text>
//           </View>
//           <Text style={styles.listCount}>{jumlahHadir} hadir</Text>
//         </View>

//         <ScrollView
//           style={styles.list}
//           contentContainerStyle={styles.listContent}
//           showsVerticalScrollIndicator={false}
//         >
//           {daftarTerurut.length === 0 ? (
//             <View style={styles.emptyState}>
//               <View style={styles.emptyIcon}>
//                 <Text style={styles.emptyIconText}>—</Text>
//               </View>
//               <Text style={styles.emptyTitle}>Belum ada yang presensi</Text>
//               <Text style={styles.emptyDescription}>
//                 Praktikan yang hadir akan muncul di daftar ini.
//               </Text>
//             </View>
//           ) : (
//             daftarTerurut.map((praktikan, index) => (
//               <View key={praktikan.id} style={styles.attendeeRow}>
//                 <Text style={styles.attendeeNumber}>
//                   {String(index + 1).padStart(2, "0")}
//                 </Text>

//                 <View style={styles.avatar}>
//                   <Text style={styles.avatarText}>
//                     {praktikan.nama
//                       .split(" ")
//                       .slice(0, 2)
//                       .map((bagian) => bagian[0])
//                       .join("")
//                       .toUpperCase()}
//                   </Text>
//                 </View>

//                 <View style={styles.attendeeInfo}>
//                   <Text style={styles.attendeeName}>{praktikan.nama}</Text>
//                   <Text style={styles.attendeeNim}>{praktikan.nim}</Text>
//                 </View>

//                 <View style={styles.timePill}>
//                   <Text style={styles.timeText}>{praktikan.waktu}</Text>
//                 </View>
//               </View>
//             ))
//           )}
//         </ScrollView>

//         {feedback ? (
//           <Text accessibilityRole="alert" style={styles.feedback}>
//             {feedback}
//           </Text>
//         ) : null}
//         {session.status === "dibuka" ? (
//           <View style={styles.bottomAction}>
//             <Tombol
//               label="Tutup Sesi"
//               variant="danger"
//               onPress={() => setModalTutupTerbuka(true)}
//             />
//           </View>
//         ) : (
//           <View style={styles.closedBanner}>
//             <View style={styles.closedCheck}>
//               <Text style={styles.closedCheckText}>
//                 {session.status === "ditutup" ? "✓" : "·"}
//               </Text>
//             </View>
//             <Text style={styles.closedText}>
//               {session.status === "ditutup"
//                 ? "Sesi telah ditutup"
//                 : "Sesi belum dibuka"}
//             </Text>
//           </View>
//         )}
//       </View>

//       <Modal
//         visible={modalTutupTerbuka}
//         transparent
//         animationType="fade"
//         onRequestClose={() => setModalTutupTerbuka(false)}
//       >
//         <View style={styles.modalBackdrop}>
//           <Pressable
//             accessibilityRole="button"
//             accessibilityLabel="Batalkan konfirmasi"
//             onPress={() => setModalTutupTerbuka(false)}
//             style={StyleSheet.absoluteFill}
//           />

//           <View style={styles.modalCard}>
//             <View style={styles.modalIcon}>
//               <Text style={styles.modalIconText}>!</Text>
//             </View>
//             <Text style={styles.modalTitle}>Tutup sesi?</Text>
//             <Text style={styles.modalDescription}>
//               Presensi tidak bisa dilakukan lagi setelah sesi ditutup.
//             </Text>

//             <View style={styles.modalActions}>
//               <Tombol
//                 label="Batal"
//                 variant="outline"
//                 onPress={() => setModalTutupTerbuka(false)}
//               />
//               <Tombol label="Tutup Sesi" variant="danger" onPress={tutupSesi} />
//             </View>
//           </View>
//         </View>
//       </Modal>
//     </SafeAreaView>
//   );
// }

export default function AsistenRekapSesiScreen() {
  const { sesiId } = useLocalSearchParams<{ sesiId?: string }>();
  const activeSessionId = Array.isArray(sesiId) ? sesiId[0] : sesiId;
  const { session, daftar, status, offline, retry, tutup } =
    useRekapPresensi(activeSessionId);

  const [modalTutupTerbuka, setModalTutupTerbuka] = useState(false);
  const [menutup, setMenutup] = useState(false);
  const [feedback, setFeedback] = useState("");

  async function tutupSesi() {
    if (!session) return;
    try {
      setMenutup(true);
      const result = await tutup(session.id);
      setFeedback(result.message);
    } catch {
      setFeedback("Sesi gagal ditutup. Periksa koneksi, lalu coba lagi.");
    } finally {
      setMenutup(false);
      setModalTutupTerbuka(false);
    }
  }

  const tombolKembali = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Kembali"
      onPress={() => router.back()}
      style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
    >
      <Text style={styles.backArrow}>‹</Text>
      <Text style={styles.backLabel}>Kembali</Text>
    </Pressable>
  );

  // Loading, error, atau sesi tidak ditemukan
  if (status !== "ready" || !session) {
    return (
      <SafeAreaView edges={["top", "left", "right"]} style={styles.safeArea}>
        <View style={styles.page}>
          {tombolKembali}
          <View style={styles.heading}>
            <Text style={styles.eyebrow}>PRESENSI PRAKTIKUM</Text>
            <Text style={styles.title}>Rekap Kehadiran</Text>
          </View>

          <View style={styles.emptyState}>
            {status === "loading" ? (
              <>
                <ActivityIndicator size="large" color={WARNA.primary} />
                <Text style={styles.emptyDescription}>Memuat rekap…</Text>
              </>
            ) : status === "error" ? (
              <>
                <Text style={styles.emptyTitle}>Rekap tidak bisa dimuat</Text>
                <Text style={styles.emptyDescription}>
                  Periksa koneksi internetmu, lalu coba lagi.
                </Text>
                <Tombol label="Coba lagi" onPress={retry} />
              </>
            ) : (
              <>
                <Text style={styles.emptyTitle}>Sesi tidak ditemukan</Text>
                <Text style={styles.emptyDescription}>
                  Sesi ini mungkin sudah dihapus. Kembali ke daftar sesi.
                </Text>
              </>
            )}
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const jumlahHadir = daftar.length;
  const persentase =
    session.total > 0 ? Math.round((jumlahHadir / session.total) * 100) : 0;

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={styles.safeArea}>
      <View style={styles.page}>
        {tombolKembali}

        <View style={styles.heading}>
          <Text style={styles.eyebrow}>PRESENSI PRAKTIKUM</Text>
          <Text style={styles.title}>Rekap Kehadiran</Text>
        </View>

        {offline && (
          <View style={styles.offlineBanner}>
            <Text style={styles.offlineText}>
              Kamu sedang offline. Daftar kehadiran mungkin belum yang terbaru.
            </Text>
          </View>
        )}

        <View style={styles.sessionHeader}>
          <View style={styles.sessionHeaderText}>
            <Text style={styles.courseName}>{session.praktikum}</Text>
            <Text style={styles.sessionMeta}>
              Pertemuan {session.pertemuanKe} · Kelas {session.kelas} ·{" "}
              {formatTanggal(session.tanggal)}
            </Text>
          </View>
          <StatusBadge status={session.status} />
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.summaryTop}>
            <View>
              <Text style={styles.summaryEyebrow}>TOTAL KEHADIRAN</Text>
              <Text style={styles.summaryCount}>
                {jumlahHadir}
                <Text style={styles.summaryTotal}> / {session.total}</Text>
              </Text>
              <Text style={styles.summaryCaption}>praktikan hadir</Text>
            </View>
            <View style={styles.percentCircle}>
              <Text style={styles.percentValue}>{persentase}%</Text>
            </View>
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

        <View style={styles.listHeading}>
          <View>
            <Text style={styles.listTitle}>Daftar praktikan</Text>
            <Text style={styles.listSubtitle}>
              Diurutkan berdasarkan waktu presensi
            </Text>
          </View>
          <Text style={styles.listCount}>{jumlahHadir} hadir</Text>
        </View>

        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        >
          {daftar.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Text style={styles.emptyIconText}>—</Text>
              </View>
              <Text style={styles.emptyTitle}>Belum ada yang presensi</Text>
              <Text style={styles.emptyDescription}>
                Praktikan yang hadir akan muncul di daftar ini.
              </Text>
            </View>
          ) : (
            daftar.map((praktikan, index) => (
              <View key={praktikan.id} style={styles.attendeeRow}>
                <Text style={styles.attendeeNumber}>
                  {String(index + 1).padStart(2, "0")}
                </Text>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {praktikan.nama
                      .split(" ")
                      .slice(0, 2)
                      .map((bagian) => bagian[0])
                      .join("")
                      .toUpperCase()}
                  </Text>
                </View>
                <View style={styles.attendeeInfo}>
                  <Text style={styles.attendeeName}>{praktikan.nama}</Text>
                  <Text style={styles.attendeeNim}>{praktikan.nim}</Text>
                </View>
                <View style={styles.timePill}>
                  <Text style={styles.timeText}>{praktikan.waktu}</Text>
                </View>
              </View>
            ))
          )}
        </ScrollView>

        {feedback ? (
          <Text accessibilityRole="alert" style={styles.feedback}>
            {feedback}
          </Text>
        ) : null}
        {session.status === "dibuka" ? (
          <View style={styles.bottomAction}>
            <Tombol
              label={menutup ? "Menutup…" : "Tutup Sesi"}
              variant="danger"
              disabled={offline || menutup}
              onPress={() => setModalTutupTerbuka(true)}
            />
          </View>
        ) : (
          <View style={styles.closedBanner}>
            <View style={styles.closedCheck}>
              <Text style={styles.closedCheckText}>
                {session.status === "ditutup" ? "✓" : "·"}
              </Text>
            </View>
            <Text style={styles.closedText}>
              {session.status === "ditutup"
                ? "Sesi telah ditutup"
                : "Sesi belum dibuka"}
            </Text>
          </View>
        )}
      </View>

      <Modal
        visible={modalTutupTerbuka}
        transparent
        animationType="fade"
        onRequestClose={() => setModalTutupTerbuka(false)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Batalkan konfirmasi"
            onPress={() => setModalTutupTerbuka(false)}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.modalCard}>
            <View style={styles.modalIcon}>
              <Text style={styles.modalIconText}>!</Text>
            </View>
            <Text style={styles.modalTitle}>Tutup sesi?</Text>
            <Text style={styles.modalDescription}>
              Presensi tidak bisa dilakukan lagi setelah sesi ditutup.
            </Text>
            <View style={styles.modalActions}>
              <Tombol
                label="Batal"
                variant="outline"
                disabled={menutup}
                onPress={() => setModalTutupTerbuka(false)}
              />
              <Tombol
                label={menutup ? "Menutup…" : "Tutup Sesi"}
                variant="danger"
                disabled={menutup}
                onPress={tutupSesi}
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
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  backButton: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingVertical: 8,
    paddingRight: 12,
  },
  backArrow: {
    color: WARNA.primary,
    fontSize: 28,
    lineHeight: 28,
    marginTop: -3,
  },
  backLabel: {
    color: WARNA.text,
    fontSize: 13,
    fontWeight: "700",
  },
  heading: {
    marginTop: 14,
    marginBottom: 16,
  },
  eyebrow: {
    color: WARNA.primary,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: 5,
  },
  title: {
    color: WARNA.text,
    fontSize: 27,
    lineHeight: 33,
    fontWeight: "800",
    letterSpacing: -0.6,
  },
  sessionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    padding: 15,
    borderWidth: 1,
    borderColor: WARNA.border,
    borderRadius: 17,
    backgroundColor: WARNA.surface,
  },
  sessionHeaderText: {
    flex: 1,
  },
  courseName: {
    color: WARNA.text,
    fontSize: 15,
    fontWeight: "800",
  },
  sessionMeta: {
    color: WARNA.textMuted,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 4,
  },
  statusBadge: {
    minHeight: 27,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderRadius: 99,
  },
  statusOpen: {
    backgroundColor: WARNA.highlight,
    borderColor: WARNA.highlight,
  },
  statusClosed: {
    backgroundColor: WARNA.primary,
    borderColor: WARNA.primary,
  },
  statusPending: {
    backgroundColor: WARNA.bg,
    borderColor: WARNA.border,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: WARNA.text,
  },
  statusText: {
    color: WARNA.text,
    fontSize: 10,
    fontWeight: "700",
  },
  statusTextClosed: {
    color: WARNA.surface,
  },
  summaryCard: {
    marginTop: 14,
    padding: 18,
    borderRadius: 20,
    backgroundColor: WARNA.text,
  },
  summaryTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  summaryEyebrow: {
    color: "rgba(254, 255, 224, 0.75)",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.9,
  },
  summaryCount: {
    color: WARNA.surface,
    fontSize: 31,
    lineHeight: 37,
    fontWeight: "800",
    marginTop: 5,
  },
  summaryTotal: {
    color: "rgba(254, 255, 224, 0.72)",
    fontSize: 18,
    fontWeight: "600",
  },
  summaryCaption: {
    color: "rgba(254, 255, 224, 0.75)",
    fontSize: 11,
    marginTop: 1,
  },
  percentCircle: {
    width: 60,
    height: 60,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: WARNA.highlight,
    borderRadius: 30,
  },
  percentValue: {
    color: WARNA.highlight,
    fontSize: 14,
    fontWeight: "800",
  },
  progressTrack: {
    height: 7,
    overflow: "hidden",
    borderRadius: 99,
    backgroundColor: "rgba(254, 255, 224, 0.2)",
  },
  progressFill: {
    height: "100%",
    borderRadius: 99,
    backgroundColor: WARNA.highlight,
  },
  listHeading: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 8,
    marginTop: 22,
    marginBottom: 11,
  },
  listTitle: {
    color: WARNA.text,
    fontSize: 16,
    fontWeight: "800",
  },
  listSubtitle: {
    color: WARNA.textMuted,
    fontSize: 10,
    marginTop: 3,
  },
  listCount: {
    color: WARNA.primary,
    fontSize: 11,
    fontWeight: "800",
  },
  feedback: {
    color: WARNA.text,
    backgroundColor: WARNA.highlight,
    borderRadius: 10,
    padding: 10,
    fontSize: 12,
    marginBottom: 8,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 12,
  },
  attendeeRow: {
    minHeight: 68,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 11,
    paddingVertical: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: WARNA.border,
    borderRadius: 15,
    backgroundColor: WARNA.bg,
  },
  attendeeNumber: {
    width: 21,
    color: WARNA.textMuted,
    fontSize: 10,
    fontWeight: "700",
  },
  avatar: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
    backgroundColor: WARNA.highlight,
  },
  avatarText: {
    color: WARNA.text,
    fontSize: 10,
    fontWeight: "800",
  },
  attendeeInfo: {
    flex: 1,
    minWidth: 0,
  },
  attendeeName: {
    color: WARNA.text,
    fontSize: 12,
    fontWeight: "700",
  },
  attendeeNim: {
    color: WARNA.textMuted,
    fontSize: 10,
    marginTop: 3,
  },
  timePill: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 9,
    backgroundColor: WARNA.surface,
  },
  timeText: {
    color: WARNA.text,
    fontSize: 10,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  emptyState: {
    alignItems: "center",
    padding: 28,
    borderWidth: 1,
    borderColor: WARNA.border,
    borderRadius: 18,
    backgroundColor: WARNA.surface,
  },
  emptyIcon: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 21,
    backgroundColor: WARNA.highlight,
    marginBottom: 10,
  },
  emptyIconText: {
    color: WARNA.text,
    fontSize: 20,
    fontWeight: "700",
  },
  emptyTitle: {
    color: WARNA.text,
    fontSize: 13,
    fontWeight: "800",
  },
  emptyDescription: {
    color: WARNA.textMuted,
    fontSize: 11,
    textAlign: "center",
    marginTop: 4,
  },
  bottomAction: {
    paddingTop: 10,
    paddingBottom: 12,
    backgroundColor: WARNA.bg,
  },
  closedBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 13,
    marginTop: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: WARNA.border,
    borderRadius: 14,
    backgroundColor: WARNA.surface,
  },
  closedCheck: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: WARNA.highlight,
  },
  closedCheckText: {
    color: WARNA.text,
    fontSize: 14,
    fontWeight: "800",
  },
  closedText: {
    color: WARNA.text,
    fontSize: 12,
    fontWeight: "700",
  },
  button: {
    minHeight: 48,
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 13,
  },
  buttonPrimary: {
    borderColor: WARNA.primary,
    backgroundColor: WARNA.primary,
  },
  buttonOutline: {
    borderColor: WARNA.border,
    backgroundColor: WARNA.bg,
  },
  buttonDanger: {
    borderColor: WARNA.primary,
    backgroundColor: WARNA.bg,
  },
  buttonText: {
    fontSize: 12,
    fontWeight: "800",
  },
  buttonTextLight: {
    color: WARNA.surface,
  },
  buttonTextDark: {
    color: WARNA.primary,
  },
  pressed: {
    opacity: 0.75,
  },
  modalBackdrop: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 22,
    backgroundColor: WARNA.scrim,
  },
  modalCard: {
    width: "100%",
    maxWidth: 380,
    padding: 20,
    borderWidth: 1,
    borderColor: WARNA.border,
    borderRadius: 22,
    backgroundColor: WARNA.surface,
  },
  modalIcon: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
    backgroundColor: "rgba(181, 24, 95, 0.1)",
    marginBottom: 13,
  },
  modalIconText: {
    color: WARNA.primary,
    fontSize: 18,
    fontWeight: "800",
  },
  modalTitle: {
    color: WARNA.text,
    fontSize: 18,
    fontWeight: "800",
  },
  modalDescription: {
    color: WARNA.textMuted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 19,
  },
  offlineBanner: {
    backgroundColor: WARNA.surface,
    borderWidth: 1,
    borderColor: WARNA.primary,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
  },
  offlineText: { color: WARNA.primary, fontSize: 13, fontWeight: "600" },
});
