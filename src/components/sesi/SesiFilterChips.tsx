import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/constants/theme';
import type { FilterSesi } from './types';

// Filter daftar sesi: hanya dua pilihan (PRD bagian 4). Sesi `dibuka` tidak
// termasuk filter karena tampil sebagai kartu aktif di atas daftar.

const OPSI: { nilai: FilterSesi; label: string }[] = [
  { nilai: 'belum_dibuka', label: 'Belum dibuka' },
  { nilai: 'ditutup', label: 'Ditutup' },
];

export interface SesiFilterChipsProps {
  nilai: FilterSesi;
  onChange: (nilai: FilterSesi) => void;
}

export default function SesiFilterChips({ nilai, onChange }: SesiFilterChipsProps) {
  return (
    <View style={styles.baris} accessibilityRole="tablist">
      {OPSI.map((opsi) => {
        const dipilih = opsi.nilai === nilai;
        return (
          <Pressable
            key={opsi.nilai}
            accessibilityRole="button"
            accessibilityState={{ selected: dipilih }}
            onPress={() => onChange(opsi.nilai)}
            style={({ pressed }) => [
              styles.chip,
              dipilih && styles.chipDipilih,
              pressed && styles.ditekan,
            ]}
          >
            <Text style={[styles.teks, dipilih && styles.teksDipilih]}>
              {opsi.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  baris: { flexDirection: 'row', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#FFFFFF',
  },
  chipDipilih: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  ditekan: { opacity: 0.8 },
  teks: { fontSize: 13, fontWeight: '600', color: colors.text },
  teksDipilih: { color: '#FFFFFF' },
});