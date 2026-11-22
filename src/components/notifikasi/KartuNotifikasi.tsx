import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/constants/theme';
import type { NotifikasiDenganId, TipeNotifikasi } from '@/data/notifikasi';

export interface KartuNotifikasiProps {
  item: NotifikasiDenganId;
  onPress: (item: NotifikasiDenganId) => void;
}

const LABEL_TIPE: Record<TipeNotifikasi, string> = {
  sesi_dibuka: 'Sesi Dibuka',
  jadwal_berubah: 'Jadwal Berubah',
  izin_diterima: 'Izin Diterima',
  izin_ditolak: 'Izin Ditolak',
};

const IKON_TIPE: Record<TipeNotifikasi, keyof typeof Ionicons.glyphMap> = {
  sesi_dibuka: 'radio-button-on-outline',
  jadwal_berubah: 'calendar-outline',
  izin_diterima: 'checkmark-circle-outline',
  izin_ditolak: 'close-circle-outline',
};

function formatWaktuNotifikasiWib(createdAt: unknown): string {
  if (!createdAt) return 'Baru saja';

  let date: Date | null = null;
  if (
    typeof createdAt === 'object' &&
    createdAt !== null &&
    'toDate' in createdAt &&
    typeof (createdAt as { toDate?: () => Date }).toDate === 'function'
  ) {
    date = (createdAt as { toDate: () => Date }).toDate();
  } else if (
    typeof createdAt === 'object' &&
    createdAt !== null &&
    'seconds' in createdAt &&
    typeof (createdAt as { seconds?: number }).seconds === 'number'
  ) {
    date = new Date((createdAt as { seconds: number }).seconds * 1000);
  } else if (typeof createdAt === 'string' || typeof createdAt === 'number') {
    date = new Date(createdAt);
  }

  if (!date || Number.isNaN(date.getTime())) {
    return 'Baru saja';
  }

  try {
    const tanggal = date
      .toLocaleDateString('id-ID', {
        timeZone: 'Asia/Jakarta',
        day: 'numeric',
        month: 'short',
      })
      .replace('.', '');
    const jam = new Intl.DateTimeFormat('id-ID', {
      timeZone: 'Asia/Jakarta',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
      .format(date)
      .replace(':', '.');
    return `${tanggal} · ${jam} WIB`;
  } catch {
    return date.toLocaleString('id-ID');
  }
}

export default function KartuNotifikasi({
  item,
  onPress,
}: KartuNotifikasiProps) {
  const belumDibaca = !item.dibaca;
  const labelTipe = LABEL_TIPE[item.tipe] ?? 'Pemberitahuan';
  const ikon = IKON_TIPE[item.tipe] ?? 'notifications-outline';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${item.judul}. ${belumDibaca ? 'Belum dibaca' : 'Sudah dibaca'}`}
      onPress={() => onPress(item)}
      style={({ pressed }) => [
        styles.card,
        belumDibaca && styles.cardUnread,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.topRow}>
        <View style={styles.badgeRow}>
          <Ionicons
            name={ikon}
            size={15}
            color={
              item.tipe === 'izin_ditolak' ? colors.primary : colors.text
            }
          />
          <Text
            style={[
              styles.badgeText,
              item.tipe === 'izin_ditolak' && styles.badgeTextAlert,
            ]}
          >
            {labelTipe}
          </Text>
        </View>

        <View style={styles.metaRight}>
          {belumDibaca ? <View style={styles.unreadDot} /> : null}
          <Text style={styles.timeText}>
            {formatWaktuNotifikasiWib(item.createdAt)}
          </Text>
        </View>
      </View>

      <Text style={[styles.title, belumDibaca && styles.titleUnread]}>
        {item.judul}
      </Text>
      <Text style={styles.body}>{item.isi}</Text>

      <View style={styles.footerRow}>
        <Text style={styles.statusText}>
          {belumDibaca ? 'Belum dibaca' : 'Sudah dibaca'}
        </Text>
        <Text style={styles.linkHint}>Ketuk untuk membuka {'->'}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bg,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    gap: 6,
  },
  cardUnread: {
    backgroundColor: colors.surface,
    borderColor: colors.primary,
  },
  pressed: {
    opacity: 0.85,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  badgeText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  badgeTextAlert: {
    color: colors.primary,
  },
  metaRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  timeText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  title: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  titleUnread: {
    fontWeight: '800',
  },
  body: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  statusText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  linkHint: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
});
