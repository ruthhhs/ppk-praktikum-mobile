import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, type Href } from 'expo-router';
import { colors } from '@/constants/theme';
import type { NotifikasiDenganId } from '@/data/notifikasi';
import type { Role } from '@/data/types';
import { useAuth } from '@/hooks/useAuth';
import { usePush } from '@/hooks/usePush';
import {
  pantauNotifikasi,
  tandaiNotifikasiDibaca,
} from '@/services/firebase/firestore';
import BannerIzinNotifikasi from '@/components/notifikasi/BannerIzinNotifikasi';
import KartuNotifikasi from '@/components/notifikasi/KartuNotifikasi';

function ambilEpochMillis(createdAt: unknown): number {
  if (!createdAt) return 0;
  if (
    typeof createdAt === 'object' &&
    createdAt !== null &&
    'toMillis' in createdAt &&
    typeof (createdAt as { toMillis?: () => number }).toMillis === 'function'
  ) {
    return (createdAt as { toMillis: () => number }).toMillis();
  }
  if (
    typeof createdAt === 'object' &&
    createdAt !== null &&
    'seconds' in createdAt &&
    typeof (createdAt as { seconds?: number }).seconds === 'number'
  ) {
    return (createdAt as { seconds: number }).seconds * 1000;
  }
  if (typeof createdAt === 'string' || typeof createdAt === 'number') {
    const parsed = Date.parse(String(createdAt));
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

function tentukanTujuanNotifikasi(
  item: NotifikasiDenganId,
  role: Role | null,
): Href {
  const peran = role === 'asisten' ? 'asisten' : 'praktikan';

  if (item.tipe === 'sesi_dibuka' && item.sesiId) {
    if (peran === 'praktikan') {
      return `/praktikan/presensi/${encodeURIComponent(item.sesiId)}` as Href;
    }
    return `/asisten/detail-sesi?sesiId=${encodeURIComponent(item.sesiId)}` as Href;
  }

  if (item.tipe === 'izin_diterima' || item.tipe === 'izin_ditolak') {
    if (peran === 'praktikan') {
      if (item.sesiId) {
        return `/praktikan/detail-sesi?sesiId=${encodeURIComponent(item.sesiId)}` as Href;
      }
      return '/praktikan/izin' as Href;
    }
    return '/asisten/izin' as Href;
  }

  if (item.tipe === 'jadwal_berubah') {
    return (peran === 'asisten' ? '/asisten/jadwal' : '/praktikan/jadwal') as Href;
  }

  if (item.sesiId) {
    return `/${peran}/detail-sesi?sesiId=${encodeURIComponent(item.sesiId)}` as Href;
  }

  return `/${peran}/jadwal` as Href;
}

export default function NotifikasiInboxScreen() {
  const { user, role } = useAuth();
  const { statusIzin, perangkatTerdaftar, mintaIzin } = usePush();

  const [sedangMemintaIzin, setSedangMemintaIzin] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [remoteState, setRemoteState] = useState<{
    uid: string;
    retryKey: number;
    items: NotifikasiDenganId[];
    error: string | null;
  } | null>(null);

  const uid = user?.uid ?? null;

  useEffect(() => {
    if (!uid) return;

    const unsubscribe = pantauNotifikasi(
      uid,
      (docs) => {
        setRemoteState({
          uid,
          retryKey,
          items: docs,
          error: null,
        });
      },
      () => {
        setRemoteState({
          uid,
          retryKey,
          items: [],
          error:
            'Gagal memuat riwayat notifikasi. Periksa koneksi internet lalu coba lagi.',
        });
      },
    );

    return () => {
      unsubscribe();
    };
  }, [uid, retryKey]);

  const { daftarNotifikasi, sedangMemuat, pesanError } = useMemo(() => {
    if (!uid) {
      return {
        daftarNotifikasi: [] as NotifikasiDenganId[],
        sedangMemuat: false,
        pesanError: null as string | null,
      };
    }

    if (
      !remoteState ||
      remoteState.uid !== uid ||
      remoteState.retryKey !== retryKey
    ) {
      return {
        daftarNotifikasi: [] as NotifikasiDenganId[],
        sedangMemuat: true,
        pesanError: null as string | null,
      };
    }

    const terurut = [...remoteState.items].sort(
      (a, b) => ambilEpochMillis(b.createdAt) - ambilEpochMillis(a.createdAt),
    );

    return {
      daftarNotifikasi: terurut,
      sedangMemuat: false,
      pesanError: remoteState.error,
    };
  }, [remoteState, retryKey, uid]);

  const jumlahBelumDibaca = useMemo(
    () => daftarNotifikasi.filter((item) => !item.dibaca).length,
    [daftarNotifikasi],
  );

  const handleMintaIzin = useCallback(async () => {
    setSedangMemintaIzin(true);
    try {
      await mintaIzin();
    } finally {
      setSedangMemintaIzin(false);
    }
  }, [mintaIzin]);

  const handleKetukNotifikasi = useCallback(
    async (item: NotifikasiDenganId) => {
      // Sesuai firestore.rules: update hanya diizinkan saat dibaca berubah dari false ke true
      if (uid && !item.dibaca) {
        try {
          await tandaiNotifikasiDibaca(uid, item.id);
        } catch {
          // Tetap lanjutkan navigasi meski pembaruan status baca gagal saat jaringan lambat
        }
      }

      const tujuan = tentukanTujuanNotifikasi(item, role);
      router.push(tujuan);
    },
    [role, uid],
  );

  const handleTandaiSemuaDibaca = useCallback(async () => {
    if (!uid) return;
    const belumDibaca = daftarNotifikasi.filter((item) => !item.dibaca);
    if (belumDibaca.length === 0) return;

    await Promise.allSettled(
      belumDibaca.map((item) => tandaiNotifikasiDibaca(uid, item.id)),
    );
  }, [daftarNotifikasi, uid]);

  const renderHeader = () => (
    <View style={styles.listHeader}>
      <View style={styles.titleRow}>
        <View style={styles.titleBlock}>
          <Text style={styles.title}>Notifikasi</Text>
          <Text style={styles.subtitle}>
            {jumlahBelumDibaca > 0
              ? `${jumlahBelumDibaca} notifikasi belum dibaca`
              : 'Semua notifikasi sudah dibaca'}
          </Text>
        </View>

        {jumlahBelumDibaca > 0 ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => void handleTandaiSemuaDibaca()}
            style={({ pressed }) => [
              styles.markAllButton,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.markAllText}>Tandai Semua</Text>
          </Pressable>
        ) : null}
      </View>

      <BannerIzinNotifikasi
        statusIzin={statusIzin}
        perangkatTerdaftar={perangkatTerdaftar}
        sedangMeminta={sedangMemintaIzin}
        onMintaIzin={() => void handleMintaIzin()}
      />

      {pesanError ? (
        <View style={styles.errorCard} accessibilityRole="alert">
          <Text style={styles.errorTitle}>Gagal Memuat Riwayat</Text>
          <Text style={styles.errorBody}>{pesanError}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => setRetryKey((prev) => prev + 1)}
            style={({ pressed }) => [
              styles.retryButton,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.retryButtonText}>Coba Lagi</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );

  const renderEmpty = () => {
    if (sedangMemuat) {
      return (
        <View style={styles.stateCard}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.stateTitle}>Memuat notifikasi...</Text>
          <Text style={styles.stateBody}>
            Mengambil riwayat pemberitahuan dari Cloud Firestore.
          </Text>
        </View>
      );
    }

    if (pesanError) {
      return null;
    }

    return (
      <View style={styles.stateCard}>
        <Text style={styles.stateTitle}>Belum ada notifikasi</Text>
        <Text style={styles.stateBody}>
          Pemberitahuan saat sesi dibuka, jadwal berubah, atau pengajuan izin
          diputuskan akan muncul di sini.
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <FlatList
        data={daftarNotifikasi}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <KartuNotifikasi
            item={item}
            onPress={(selected) => void handleKetukNotifikasi(selected)}
          />
        )}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  listContent: {
    padding: 18,
    paddingBottom: 32,
    flexGrow: 1,
  },
  listHeader: {
    gap: 14,
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  titleBlock: {
    flex: 1,
    gap: 2,
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '800',
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  markAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  markAllText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  separator: {
    height: 10,
  },
  errorCard: {
    backgroundColor: colors.surface,
    borderColor: colors.primary,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    gap: 8,
  },
  errorTitle: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '800',
  },
  errorBody: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
  },
  retryButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: colors.primary,
  },
  retryButtonText: {
    color: colors.bg,
    fontSize: 13,
    fontWeight: '700',
  },
  stateCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 18,
    padding: 20,
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  stateTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  stateBody: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.85,
  },
});
