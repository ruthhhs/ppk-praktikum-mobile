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
import type { StatusIzinNotifikasi } from '@/data/notifikasi';

export interface BannerIzinNotifikasiProps {
  statusIzin: StatusIzinNotifikasi;
  perangkatTerdaftar: boolean;
  sedangMeminta: boolean;
  onMintaIzin: () => void;
  onBukaPengaturan?: () => void;
}

function bukaPengaturanPerangkat() {
  void Linking.openSettings();
}

export default function BannerIzinNotifikasi({
  statusIzin,
  perangkatTerdaftar,
  sedangMeminta,
  onMintaIzin,
  onBukaPengaturan = bukaPengaturanPerangkat,
}: BannerIzinNotifikasiProps) {
  if (perangkatTerdaftar && statusIzin === 'diizinkan') {
    return (
      <View style={[styles.banner, styles.bannerAktif]}>
        <View style={styles.headerRow}>
          <Ionicons
            name="notifications-outline"
            size={18}
            color={colors.text}
          />
          <Text style={styles.title}>Notifikasi Push Aktif</Text>
        </View>
        <Text style={styles.body}>
          Perangkat ini sudah terdaftar untuk menerima pemberitahuan praktikum
          secara otomatis.
        </Text>
      </View>
    );
  }

  const izinDitolak = statusIzin === 'izin_ditolak';
  const tidakTersedia = statusIzin === 'tidak_tersedia';
  const galat = statusIzin === 'galat';

  const judul = izinDitolak
    ? 'Izin Notifikasi Ditolak'
    : tidakTersedia
      ? 'Push Notification Tidak Tersedia'
      : galat
        ? 'Notifikasi Push Gagal Didaftarkan'
        : 'Aktifkan Notifikasi Push';

  const pesan = izinDitolak
    ? 'Notifikasi perangkat tidak dapat diterima karena izin ditolak. Kamu tetap dapat melihat seluruh riwayat notifikasi di halaman ini, atau aktifkan izin lewat Pengaturan.'
    : tidakTersedia
      ? 'Notifikasi push hanya tersedia pada build Android/iOS. Riwayat notifikasi di dalam aplikasi tetap dapat dilihat di bawah.'
      : galat
        ? 'Pendaftaran token notifikasi gagal. Periksa koneksi internet lalu coba lagi; riwayat di aplikasi tetap tersedia.'
        : 'Aktifkan izin notifikasi agar kamu langsung mendapat pemberitahuan saat sesi dibuka, jadwal berubah, atau izin diputuskan.';

  const ikon: keyof typeof Ionicons.glyphMap = izinDitolak
    ? 'notifications-off-outline'
    : galat
      ? 'alert-circle-outline'
      : 'notifications-outline';

  return (
    <View
      style={[
        styles.banner,
        izinDitolak || galat ? styles.bannerPeringatan : styles.bannerNetral,
      ]}
      accessibilityRole="alert"
    >
      <View style={styles.headerRow}>
        <Ionicons
          name={ikon}
          size={18}
          color={izinDitolak || galat ? colors.primary : colors.text}
        />
        <Text
          style={[
            styles.title,
            (izinDitolak || galat) && styles.titlePeringatan,
          ]}
        >
          {judul}
        </Text>
      </View>

      <Text style={styles.body}>{pesan}</Text>

      {!tidakTersedia ? (
        <View style={styles.actionsRow}>
          {izinDitolak ? (
            <Pressable
              accessibilityRole="button"
              onPress={onBukaPengaturan}
              style={({ pressed }) => [
                styles.button,
                styles.buttonPrimary,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.buttonPrimaryText}>Buka Pengaturan</Text>
            </Pressable>
          ) : null}

          <Pressable
            accessibilityRole="button"
            disabled={sedangMeminta}
            onPress={onMintaIzin}
            style={({ pressed }) => [
              styles.button,
              izinDitolak ? styles.buttonSecondary : styles.buttonPrimary,
              sedangMeminta && styles.buttonDisabled,
              pressed && !sedangMeminta && styles.pressed,
            ]}
          >
            {sedangMeminta ? (
              <ActivityIndicator
                size="small"
                color={izinDitolak ? colors.text : colors.bg}
              />
            ) : (
              <Text
                style={
                  izinDitolak
                    ? styles.buttonSecondaryText
                    : styles.buttonPrimaryText
                }
              >
                {galat || izinDitolak ? 'Coba Lagi' : 'Aktifkan Notifikasi'}
              </Text>
            )}
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 8,
  },
  bannerAktif: {
    backgroundColor: colors.highlight,
    borderColor: colors.border,
  },
  bannerNetral: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  bannerPeringatan: {
    backgroundColor: colors.surface,
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
  titlePeringatan: {
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
    minHeight: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
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
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  buttonSecondaryText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.85,
  },
});
