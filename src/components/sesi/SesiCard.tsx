import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/constants/theme';
import { formatRentang, formatTanggalSingkat } from './format';
import StatusBadgeSesi, { LABEL_STATUS_SESI } from './StatusBadgeSesi';
import type { DataSesi } from './types';

// Kartu sesi bersama (PM1). Murni presentasional: tidak memanggil hook/Firestore.
// Dipakai Beranda Asprak (B) dan Praktikan (C) untuk sesi belum dibuka dan ditutup.
// Isi yang berbeda per peran (jumlah hadir, status presensi, tombol) masuk lewat `footer`.

export interface SesiCardProps {
  sesi: DataSesi;
  namaPraktikum: string;
  /** Bila diisi, seluruh kartu dapat diketuk. */
  onPress?: () => void;
  /** Slot bawah kartu, diisi pemakai sesuai perannya. */
  footer?: ReactNode;
}

export default function SesiCard({
  sesi,
  namaPraktikum,
  onPress,
  footer,
}: SesiCardProps) {
  const isi = (
    <>
      <View style={styles.baris}>
        <View style={styles.judulBlok}>
          <Text style={styles.nama}>{namaPraktikum}</Text>
          <Text style={styles.meta}>
            Pertemuan {sesi.pertemuanKe} · Kelas {sesi.kelas}
          </Text>
        </View>
        <StatusBadgeSesi status={sesi.status} />
      </View>

      <View style={styles.garis} />

      <View style={styles.grid}>
        <View style={styles.blok}>
          <Text style={styles.label}>WAKTU</Text>
          <Text style={styles.nilai}>{formatTanggalSingkat(sesi.tanggal)}</Text>
          <Text style={styles.subNilai}>
            {formatRentang(sesi.jamMulai, sesi.jamSelesai)}
          </Text>
        </View>
        <View style={styles.blok}>
          <Text style={styles.label}>LOKASI</Text>
          <Text style={styles.nilai}>Kelas {sesi.kelas}</Text>
          <Text style={styles.subNilai}>{sesi.lab}</Text>
        </View>
      </View>

      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </>
  );

  if (!onPress) return <View style={styles.kartu}>{isi}</View>;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Buka sesi ${namaPraktikum}, pertemuan ${sesi.pertemuanKe}, ${LABEL_STATUS_SESI[sesi.status]}`}
      onPress={onPress}
      style={({ pressed }) => [styles.kartu, pressed && styles.ditekan]}
    >
      {isi}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  kartu: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  ditekan: { opacity: 0.85 },
  baris: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  judulBlok: { flex: 1 },
  nama: { fontSize: 17, fontWeight: '700', color: colors.text },
  meta: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  garis: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 12,
  },
  grid: { flexDirection: 'row', gap: 16 },
  blok: { flex: 1 },
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    color: colors.textMuted,
  },
  nilai: { fontSize: 14, fontWeight: '600', color: colors.text, marginTop: 4 },
  subNilai: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  footer: { marginTop: 12 },
});