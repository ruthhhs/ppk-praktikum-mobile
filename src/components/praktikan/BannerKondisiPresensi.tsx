import { Ionicons } from '@expo/vector-icons';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { colors } from '@/constants/theme';
import type { StatusLokasi } from '@/data/lokasi';

export type JenisKondisiLokasiPresensi =
  | 'memuat'
  | 'menunggu_koordinat'
  | 'izin_ditolak'
  | 'layanan_mati'
  | 'galat_lokasi'
  | 'lab_memuat'
  | 'lab_galat'
  | 'lab_tidak_aktif'
  | 'lokasi_mock'
  | 'akurasi_buruk'
  | 'di_luar_radius'
  | 'siap_valid';

export interface BannerKondisiPresensiProps {
  jenis: JenisKondisiLokasiPresensi;
  judul: string;
  pesan: string;
  statusLokasi: StatusLokasi;
  onMintaIzin: () => void;
  onSegarkan: () => void;
  onBukaPengaturan?: () => void;
}

export interface BannerJaringanProps {
  pesan: string;
  sedangMemuat?: boolean;
  onCobaLagi: () => void;
}

function bukaPengaturanPerangkat() {
  void Linking.openSettings();
}

export function BannerJaringanOffline({
  pesan,
  sedangMemuat = false,
  onCobaLagi,
}: BannerJaringanProps) {
  return (
    <View
      style={[styles.banner, styles.bannerError]}
      accessibilityRole="alert"
    >
      <View style={styles.headerRow}>
        <Ionicons
          name="cloud-offline-outline"
          size={18}
          color={colors.primary}
        />
        <Text style={[styles.title, styles.titleError]}>
          Koneksi Jaringan Terganggu
        </Text>
      </View>
      <Text style={styles.body}>{pesan}</Text>
      <View style={styles.actionsRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Coba lagi hubungkan jaringan"
          disabled={sedangMemuat}
          onPress={onCobaLagi}
          style={({ pressed }) => [
            styles.button,
            styles.buttonPrimary,
            sedangMemuat && styles.buttonDisabled,
            pressed && !sedangMemuat && styles.pressed,
          ]}
        >
          {sedangMemuat ? (
            <ActivityIndicator size="small" color={colors.bg} />
          ) : (
            <Text style={styles.buttonPrimaryText}>Coba Lagi</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

export default function BannerKondisiPresensi({
  jenis,
  judul,
  pesan,
  statusLokasi,
  onMintaIzin,
  onSegarkan,
  onBukaPengaturan = bukaPengaturanPerangkat,
}: BannerKondisiPresensiProps) {
  const sedangMenunggu =
    jenis === 'memuat' ||
    jenis === 'menunggu_koordinat' ||
    jenis === 'lab_memuat';
  const valid = jenis === 'siap_valid';
  const butuhPerhatianKritis =
    jenis === 'izin_ditolak' ||
    jenis === 'layanan_mati' ||
    jenis === 'galat_lokasi' ||
    jenis === 'lab_galat' ||
    jenis === 'lokasi_mock';

  const namaIkon: keyof typeof Ionicons.glyphMap = valid
    ? 'checkmark-circle-outline'
    : jenis === 'izin_ditolak'
      ? 'lock-closed-outline'
      : jenis === 'layanan_mati'
        ? 'locate-outline'
        : jenis === 'lokasi_mock'
          ? 'shield-outline'
          : jenis === 'di_luar_radius' || jenis === 'akurasi_buruk'
            ? 'navigate-circle-outline'
            : 'alert-circle-outline';

  const tampilkanTombolIzin =
    statusLokasi === 'izin_ditolak' || statusLokasi === 'menunggu_koordinat';
  const tampilkanTombolPengaturan =
    statusLokasi === 'izin_ditolak' || statusLokasi === 'layanan_mati';

  return (
    <View
      style={[
        styles.banner,
        valid
          ? styles.bannerValid
          : butuhPerhatianKritis
            ? styles.bannerError
            : styles.bannerNeutral,
      ]}
      accessibilityRole={sedangMenunggu ? 'progressbar' : 'alert'}
    >
      <View style={styles.headerRow}>
        {sedangMenunggu ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <Ionicons
            name={namaIkon}
            size={18}
            color={
              valid
                ? colors.text
                : butuhPerhatianKritis
                  ? colors.primary
                  : colors.text
            }
          />
        )}
        <Text
          style={[
            styles.title,
            butuhPerhatianKritis && !valid && styles.titleError,
          ]}
        >
          {judul}
        </Text>
      </View>

      <Text style={styles.body}>{pesan}</Text>

      <View style={styles.actionsRow}>
        {tampilkanTombolIzin ? (
          <Pressable
            accessibilityRole="button"
            onPress={onMintaIzin}
            style={({ pressed }) => [
              styles.button,
              styles.buttonPrimary,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.buttonPrimaryText}>
              {statusLokasi === 'izin_ditolak'
                ? 'Beri Izin Lokasi'
                : 'Aktifkan Lokasi'}
            </Text>
          </Pressable>
        ) : null}

        {tampilkanTombolPengaturan ? (
          <Pressable
            accessibilityRole="button"
            onPress={onBukaPengaturan}
            style={({ pressed }) => [
              styles.button,
              styles.buttonSecondary,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.buttonSecondaryText}>Buka Pengaturan</Text>
          </Pressable>
        ) : null}

        <Pressable
          accessibilityRole="button"
          disabled={statusLokasi === 'memuat'}
          onPress={onSegarkan}
          style={({ pressed }) => [
            styles.button,
            styles.buttonSecondary,
            statusLokasi === 'memuat' && styles.buttonDisabled,
            pressed && statusLokasi !== 'memuat' && styles.pressed,
          ]}
        >
          <Text style={styles.buttonSecondaryText}>
            {statusLokasi === 'memuat'
              ? 'Memeriksa...'
              : statusLokasi === 'layanan_mati' || statusLokasi === 'galat'
                ? 'Coba Lagi'
                : 'Segarkan Lokasi'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    gap: 8,
  },
  bannerValid: {
    backgroundColor: colors.highlight,
    borderColor: colors.border,
  },
  bannerNeutral: {
    backgroundColor: colors.bg,
    borderColor: colors.border,
  },
  bannerError: {
    backgroundColor: colors.bg,
    borderColor: colors.primary,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
    flex: 1,
  },
  titleError: {
    color: colors.primary,
  },
  body: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
  },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 2,
  },
  button: {
    flexGrow: 1,
    minHeight: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  buttonPrimary: {
    backgroundColor: colors.primary,
  },
  buttonPrimaryText: {
    color: colors.bg,
    fontSize: 13,
    fontWeight: '700',
  },
  buttonSecondary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  buttonSecondaryText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.45,
  },
  pressed: {
    opacity: 0.85,
  },
});
