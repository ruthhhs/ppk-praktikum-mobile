import { Text, StyleSheet, View } from 'react-native';
import type { SesiStatus } from '../../data/types';

type StatusBadgeProps = {
  status: SesiStatus;
};

const statusConfig: Record<
  SesiStatus,
  { label: string; backgroundColor: string; color: string }
> = {
  belum_dibuka: {
    label: 'Belum dibuka',
    backgroundColor: '#F3F4F6',
    color: '#4B5563',
  },
  dibuka: {
    label: 'Dibuka',
    backgroundColor: '#DCFCE7',
    color: '#166534',
  },
  ditutup: {
    label: 'Ditutup',
    backgroundColor: '#FEE2E2',
    color: '#991B1B',
  },
};

export default function StatusBadge({
  status,
}: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: config.backgroundColor },
      ]}
    >
      <Text style={[styles.text, { color: config.color }]}>
        {config.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
  },
});