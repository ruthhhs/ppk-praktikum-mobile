import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/constants/theme';
import { usePush } from '@/hooks/usePush';

export default function NotifikasiScreen() {
  const { statusIzin, perangkatTerdaftar, mintaIzin } = usePush();
  const [sedangMeminta, setSedangMeminta] = useState(false);

  const aktifkanNotifikasi = async () => {
    setSedangMeminta(true);
    try {
      await mintaIzin();
    } finally {
      setSedangMeminta(false);
    }
  };

  const pesanStatus = perangkatTerdaftar
    ? 'Perangkat ini sudah terdaftar untuk menerima notifikasi.'
    : statusIzin === 'izin_ditolak'
      ? 'Izin notifikasi ditolak. Ubah izinnya melalui Pengaturan perangkat.'
      : statusIzin === 'tidak_tersedia'
        ? 'Notifikasi push hanya tersedia di aplikasi Android atau iOS.'
        : statusIzin === 'galat'
          ? 'Pendaftaran gagal. Periksa koneksi lalu coba lagi.'
          : 'Aktifkan izin agar perangkat ini dapat menerima notifikasi praktikum.';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.content}>
        <Text style={styles.title}>Notifikasi</Text>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Notifikasi praktikum</Text>
          <Text style={styles.description}>{pesanStatus}</Text>

          {!perangkatTerdaftar && statusIzin !== 'tidak_tersedia' && (
            <Pressable
              accessibilityRole="button"
              disabled={sedangMeminta}
              onPress={() => void aktifkanNotifikasi()}
              style={({ pressed }) => [
                styles.button,
                pressed && !sedangMeminta && styles.buttonPressed,
                sedangMeminta && styles.buttonDisabled,
              ]}
            >
              {sedangMeminta ? (
                <ActivityIndicator color={colors.bg} />
              ) : (
                <Text style={styles.buttonText}>Aktifkan notifikasi</Text>
              )}
            </Pressable>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 20,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  description: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 10,
  },
  button: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 14,
    justifyContent: 'center',
    marginTop: 20,
    minHeight: 48,
    paddingHorizontal: 18,
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: colors.bg,
    fontSize: 15,
    fontWeight: '700',
  },
});