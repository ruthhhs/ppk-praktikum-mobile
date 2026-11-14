import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { colors } from "../../constants/theme";
import type { PraktikanProfil } from "../../screens/asisten/useDaftarPraktikan";

const MAKS_TAMPIL = 30;

type Props = {
  daftar: PraktikanProfil[];
  /** uid -> aktif, untuk Praktikan yang sudah jadi peserta kelas terpilih */
  terdaftar: Map<string, boolean>;
  selectedUid: string;
  onSelect: (uid: string) => void;
  loading: boolean;
  error: string;
  onRetry: () => void;
};

export default function PraktikanPicker({
  daftar,
  terdaftar,
  selectedUid,
  onSelect,
  loading,
  error,
  onRetry,
}: Props) {
  const [cari, setCari] = useState("");

  const hasil = useMemo(() => {
    const q = cari.trim().toLocaleLowerCase("id-ID");
    return daftar.filter((p) =>
      `${p.nama} ${p.nim} ${p.email}`.toLocaleLowerCase("id-ID").includes(q),
    );
  }, [daftar, cari]);

  const dipilih = daftar.find((p) => p.uid === selectedUid);
  const tampil = hasil.slice(0, MAKS_TAMPIL);

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>Praktikan</Text>

      {dipilih ? (
        <Text style={styles.dipilih}>
          Dipilih: {dipilih.nama}
          {dipilih.nim ? ` · ${dipilih.nim}` : ""}
        </Text>
      ) : null}

      <TextInput
        accessibilityLabel="Cari Praktikan"
        value={cari}
        onChangeText={setCari}
        placeholder="Cari nama, NIM, atau email"
        placeholderTextColor={colors.textMuted}
        style={styles.input}
        autoCapitalize="none"
      />

      {loading ? (
        <View style={styles.state}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.helper}>Memuat daftar Praktikan…</Text>
        </View>
      ) : error ? (
        <View style={styles.state}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={onRetry}
            style={styles.retry}
          >
            <Text style={styles.retryText}>Coba lagi</Text>
          </Pressable>
        </View>
      ) : tampil.length === 0 ? (
        <Text style={styles.helper}>
          {daftar.length === 0
            ? "Belum ada Praktikan yang terdaftar."
            : "Praktikan tidak ditemukan."}
        </Text>
      ) : (
        <View style={styles.list}>
          {tampil.map((p) => {
            const sudah = terdaftar.has(p.uid);
            const selected = p.uid === selectedUid;
            return (
              <Pressable
                key={p.uid}
                accessibilityRole="button"
                accessibilityState={{ selected, disabled: sudah }}
                disabled={sudah}
                onPress={() => onSelect(p.uid)}
                style={[
                  styles.row,
                  selected && styles.rowSelected,
                  sudah && styles.rowDisabled,
                ]}
              >
                <View style={styles.rowCopy}>
                  <Text style={styles.nama}>{p.nama}</Text>
                  <Text style={styles.meta}>
                    {p.nim ? `NIM ${p.nim}` : "NIM belum diisi"}
                    {p.email ? ` · ${p.email}` : ""}
                  </Text>
                </View>
                {sudah ? (
                  <Text style={styles.tag}>
                    {terdaftar.get(p.uid) ? "Sudah terdaftar" : "Nonaktif"}
                  </Text>
                ) : null}
              </Pressable>
            );
          })}
          {hasil.length > MAKS_TAMPIL ? (
            <Text style={styles.helper}>
              Menampilkan {MAKS_TAMPIL} dari {hasil.length}. Persempit
              pencarian.
            </Text>
          ) : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: "700", marginBottom: 8 },
  dipilih: { fontSize: 13, fontWeight: "700", color: colors.primary, marginBottom: 8 },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 10,
    backgroundColor: colors.bg,
  },
  list: { gap: 8 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    backgroundColor: colors.bg,
  },
  rowSelected: {
    borderColor: colors.primary,
    backgroundColor: "rgba(181, 24, 95, 0.08)",
  },
  rowDisabled: { opacity: 0.5 },
  rowCopy: { flex: 1 },
  nama: { fontSize: 15, fontWeight: "700" },
  meta: { marginTop: 2, fontSize: 12, color: colors.textMuted },
  tag: { fontSize: 12, fontWeight: "700", color: colors.textMuted },
  state: { alignItems: "center", paddingVertical: 16, gap: 8 },
  helper: { fontSize: 13, color: colors.textMuted },
  errorText: { fontSize: 13, color: "#DC2626", textAlign: "center" },
  retry: {
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  retryText: { color: colors.primary, fontWeight: "700" },
});
