import { Ionicons } from '@expo/vector-icons';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { colors } from '@/constants/theme';

type HeaderNotifikasiProps = {
  jumlahBelumDibaca: number;
  onPress: () => void;
};

export function HeaderNotifikasi({
  jumlahBelumDibaca,
  onPress,
}: HeaderNotifikasiProps) {
  const labelAksesibilitas =
    jumlahBelumDibaca > 0
      ? `${jumlahBelumDibaca} notifikasi belum dibaca`
      : 'Tidak ada notifikasi belum dibaca';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={labelAksesibilitas}
      onPress={onPress}
      style={styles.tombol}
    >
      <Ionicons
        name="notifications-outline"
        size={24}
        color={colors.text}
      />
      {jumlahBelumDibaca > 0 && (
        <View style={styles.badge}>
          <Text style={styles.teksBadge}>
            {jumlahBelumDibaca > 99 ? '99+' : jumlahBelumDibaca}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tombol: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 0,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  teksBadge: {
    color: colors.bg,
    fontSize: 10,
    fontWeight: '700',
  },
});