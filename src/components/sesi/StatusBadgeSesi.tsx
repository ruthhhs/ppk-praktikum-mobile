import { StyleSheet, Text, View } from 'react-native';
import type { SesiStatus } from '@/data/types';

// Badge seragam semua peran (PRD bagian 4):
// dibuka hijau, belum_dibuka pink, ditutup abu-abu.
export const LABEL_STATUS_SESI: Record<SesiStatus, string> = {
  belum_dibuka: 'Belum dibuka',
  dibuka: 'Dibuka',
  ditutup: 'Ditutup',
};

const GAYA: Record<SesiStatus, { latar: string; teks: string; titik?: string }> = {
  dibuka: { latar: '#DCFCE7', teks: '#166534', titik: '#16A34A' },
  belum_dibuka: { latar: '#FCE7F3', teks: '#9D174D' },
  ditutup: { latar: '#E5E7EB', teks: '#4B5563' },
};

export interface StatusBadgeSesiProps {
  status: SesiStatus;
}

export default function StatusBadgeSesi({ status }: StatusBadgeSesiProps) {
  const gaya = GAYA[status];
  return (
    <View
      style={[styles.badge, { backgroundColor: gaya.latar }]}
      accessibilityLabel={`Status sesi: ${LABEL_STATUS_SESI[status]}`}
    >
      {gaya.titik ? (
        <View style={[styles.titik, { backgroundColor: gaya.titik }]} />
      ) : null}
      <Text style={[styles.teks, { color: gaya.teks }]}>
        {LABEL_STATUS_SESI[status]}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  titik: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  teks: {
    fontSize: 12,
    fontWeight: '700',
  },
});