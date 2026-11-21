import { router } from "expo-router";
import {
  ActivityIndicator,
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
  type SesiAsisten,
} from "./AsistenWorkflowStore";

function formatTanggal(tanggal: string) {
  const [tahun, bulan, hari] = tanggal.split("-").map(Number);

  if (!tahun || !bulan || !hari) return tanggal;

  return new Date(tahun, bulan - 1, hari).toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function teksStatus(status: SesiAsisten["status"]) {
  switch (status) {
    case "dibuka":
      return "Sedang dibuka";
    case "ditutup":
      return "Ditutup";
    default:
      return "Belum dibuka";
  }
}

function bukaDetailSesi(sesiId: string) {
  router.push({
    pathname: "/asisten/detail-sesi",
    params: { sesiId },
  });
}

export default function AsistenJadwalBerandaScreen() {
  const { sesi, loading, error } = useAsistenWorkflowStore();

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.judul}>Jadwal Asisten</Text>
        <Text style={styles.subjudul}>
          Jadwal dan sesi praktikum yang kamu kelola.
        </Text>

        <Text style={styles.judulBagian}>Akses cepat</Text>

        <View style={styles.menu}>
          <Pressable
            accessibilityRole="button"
            style={styles.tombolMenu}
            onPress={() => router.push("/asisten/data")}
          >
            <Text style={styles.teksTombolMenu}>Kelola data</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            style={styles.tombolMenu}
            onPress={() => router.push("/asisten/kelola-sesi")}
          >
            <Text style={styles.teksTombolMenu}>Kelola sesi</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            style={styles.tombolMenu}
            onPress={() => router.push("/asisten/izin")}
          >
            <Text style={styles.teksTombolMenu}>Kelola izin</Text>
          </Pressable>
        </View>

        <Text style={styles.judulBagian}>Daftar sesi</Text>

        {loading ? (
          <View style={styles.infoBox}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.teksInfo}>Memuat jadwal sesi...</Text>
          </View>
        ) : error ? (
          <View style={styles.infoBox}>
            <Text style={styles.teksError}>{error}</Text>
          </View>
        ) : sesi.length === 0 ? (
          <View style={styles.infoBox}>
            <Text style={styles.teksInfo}>Belum ada sesi praktikum.</Text>
          </View>
        ) : (
          <View style={styles.daftarSesi}>
            {sesi.map((item) => (
              <Pressable
                key={item.id}
                accessibilityRole="button"
                style={styles.kartuSesi}
                onPress={() => bukaDetailSesi(item.id)}
              >
                <View style={styles.barisAtas}>
                  <Text style={styles.namaPraktikum}>{item.praktikum}</Text>
                  <View
                    style={[
                      styles.badgeStatus,
                      item.status === "dibuka" && styles.badgeDibuka,
                      item.status === "ditutup" && styles.badgeDitutup,
                      item.status === "belum_dibuka" && styles.badgeBelumDibuka,
                    ]}
                  >
                    <Text style={styles.teksBadge}>
                      {teksStatus(item.status)}
                    </Text>
                  </View>
                </View>

                <Text style={styles.detailSesi}>
                  Pertemuan {item.pertemuanKe} · Kelas {item.kelas}
                </Text>
                <Text style={styles.detailSesi}>{formatTanggal(item.tanggal)}</Text>
                <Text style={styles.detailSesi}>
                  {item.jamMulai}–{item.jamSelesai} · {item.lab}
                </Text>
                <Text style={styles.jumlahHadir}>
                  Kehadiran: {item.hadir}/{item.total} praktikan
                </Text>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    width: "100%",
    maxWidth: 800,
    alignSelf: "center",
    padding: 20,
    paddingBottom: 32,
  },
  judul: {
    color: colors.text,
    fontSize: 26,
    fontWeight: "700",
  },
  subjudul: {
    color: colors.textSecondary,
    fontSize: 14,
    marginTop: 6,
  },
  judulBagian: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
    marginTop: 24,
    marginBottom: 12,
  },
  menu: {
    gap: 10,
  },
  tombolMenu: {
    minHeight: 48,
    justifyContent: "center",
    borderRadius: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.primary,
  },
  teksTombolMenu: {
    color: colors.background,
    fontSize: 15,
    fontWeight: "700",
  },
  daftarSesi: {
    gap: 12,
  },
  kartuSesi: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 16,
    backgroundColor: colors.backgroundElement,
  },
  barisAtas: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  namaPraktikum: {
    flex: 1,
    color: colors.text,
    fontSize: 17,
    fontWeight: "700",
  },
  badgeStatus: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: colors.backgroundSelected,
  },
  badgeDibuka: {
    backgroundColor: colors.accent,
  },
  badgeDitutup: {
    backgroundColor: colors.border,
  },
  badgeBelumDibuka: {
    backgroundColor: colors.highlight,
  },
  teksBadge: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "700",
  },
  detailSesi: {
    color: colors.textSecondary,
    fontSize: 14,
    marginTop: 8,
  },
  jumlahHadir: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "600",
    marginTop: 12,
  },
  infoBox: {
    minHeight: 90,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 16,
    backgroundColor: colors.backgroundElement,
  },
  teksInfo: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: "center",
  },
  teksError: {
    color: colors.primary,
    fontSize: 14,
    textAlign: "center",
  },
});