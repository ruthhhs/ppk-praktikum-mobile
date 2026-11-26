import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/constants/theme';
import { formatRentang } from './format';
import StatusBadgeSesi from './StatusBadgeSesi';
import type { DataSesi } from './types';

// Kartu sesi yang sedang dibuka. Tampil menonjol di bagian atas Beranda (PRD bagian 4).
// Aksi tiap peran masuk lewat `aksi`: Asprak (Tutup sesi / Lihat detail),
// Praktikan (Presensi dan Ajukan Izin).

export interface SesiAktifCardProps {
  sesi: DataSesi;
  namaPraktikum: string;
  onPress?: () => void;
  /** Statistik tambahan di baris ringkasan, misalnya { label: 'Hadir', nilai: '12/30' }. */
  statTambahan?: { label: string; nilai: string };
  /** Slot aksi di bawah kartu (tombol). */
  aksi?: ReactNode;
}

function Stat({ label, nilai }: { label: string; nilai: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statNilai} numberOfLines={1}>
        {nilai}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function SesiAktifCard({
  sesi,
  namaPraktikum,
  onPress,
  statTambahan,
  aksi,
}: SesiAktifCardProps) {
  const isi = (
    <>
      <View style={styles.atas}>
        <Text style={styles.eyebrow}>SESI DIBUKA SAAT INI</Text>
        <StatusBadgeSesi status="dibuka" />
      </View>

      <Text style={styles.judul}>{namaPraktikum}</Text>
      <Text style={styles.meta}>
        Pertemuan {sesi.pertemuanKe} · Kelas {sesi.kelas}
      </Text>

      <View style={styles.statBaris}>
        <Stat label="Waktu" nilai={formatRentang(sesi.jamMulai, sesi.jamSelesai)} />
        <View style={styles.pemisah} />
        <Stat label="Lokasi" nilai={sesi.lab} />
        {statTambahan ? (
          <>
            <View style={styles.pemisah} />
            <Stat label={statTambahan.label} nilai={statTambahan.nilai} />
          </>
        ) : null}
      </View>

      {aksi ? <View style={styles.aksi}>{aksi}</View> : null}
    </>
  );

  if (!onPress) return <View style={styles.kartu}>{isi}</View>;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Buka sesi yang sedang dibuka: ${namaPraktikum}, pertemuan ${sesi.pertemuanKe}`}
      onPress={onPress}
      style={({ pressed }) => [styles.kartu, pressed && styles.ditekan]}
    >
      {isi}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  kartu: {
    backgroundColor: colors.text,
    borderRadius: 20,
    padding: 18,
  },
  ditekan: { opacity: 0.9 },
  atas: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: 'rgba(255, 255, 255, 0.75)',
  },
  judul: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 12,
  },
  meta: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  statBaris: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
  },
  stat: { flex: 1 },
  statNilai: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 2,
  },
  pemisah: {
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginHorizontal: 12,
  },
  aksi: { marginTop: 6 },
});