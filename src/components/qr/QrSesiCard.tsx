import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '@/constants/theme';
import { generateQrMatrix } from './qrEncoder';
import { buatPayloadQrPresensi } from './qrPayload';

export interface QrSesiCardProps {
  sesiId: string;
  kode: string;
  namaPraktikum?: string;
  pertemuanKe?: number;
  kelas?: string;
  /** Ukuran sisi kotak QR dalam pixel (default 200). */
  ukuran?: number;
}

const QUIET_ZONE_MODULES = 2;

/**
 * Komponen tampil QR Code sesi untuk sisi Asisten (FR-10 / C5).
 * Menampilkan QR dengan payload `sip-presensi:v1:<sesiId>:<kode>` dan
 * tetap menampilkan kode 4 digit di bawahnya sebagai jalur utama.
 */
export default function QrSesiCard({
  sesiId,
  kode,
  namaPraktikum,
  pertemuanKe,
  kelas,
  ukuran = 200,
}: QrSesiCardProps) {
  const kodeBersih = kode.trim();
  const kodeValid = /^\d{4}$/.test(kodeBersih);

  const matrix = useMemo(() => {
    if (!sesiId.trim() || !kodeValid) return null;
    const payload = buatPayloadQrPresensi(sesiId, kodeBersih);
    return generateQrMatrix(payload);
  }, [kodeBersih, kodeValid, sesiId]);

  if (!matrix) {
    return (
      <View style={styles.card}>
        <Text style={styles.title}>QR Presensi Belum Tersedia</Text>
        <Text style={styles.subtitle}>
          QR akan muncul otomatis setelah sesi dibuka dan kode 4 digit tersedia.
        </Text>
      </View>
    );
  }

  const totalModules = matrix.length + QUIET_ZONE_MODULES * 2;
  const moduleSize = Math.max(2, Math.floor(ukuran / totalModules));
  const actualQrSize = moduleSize * matrix.length;
  const quietPadding = moduleSize * QUIET_ZONE_MODULES;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>QR Presensi Sesi</Text>
      {namaPraktikum ? (
        <Text style={styles.subtitle}>
          {namaPraktikum}
          {typeof pertemuanKe === 'number' ? ` · Pertemuan ${pertemuanKe}` : ''}
          {kelas ? ` · Kelas ${kelas}` : ''}
        </Text>
      ) : (
        <Text style={styles.subtitle}>
          Minta praktikan memindai QR ini dari halaman presensi.
        </Text>
      )}

      <View
        accessible
        accessibilityLabel={`QR Code presensi sesi dengan kode ${kodeBersih}`}
        style={[
          styles.qrFrame,
          {
            padding: quietPadding,
          },
        ]}
      >
        <View style={{ width: actualQrSize, height: actualQrSize }}>
          {matrix.map((row, rowIndex) => (
            <View
              key={rowIndex}
              style={[styles.qrRow, { height: moduleSize }]}
            >
              {row.map((dark, colIndex) => (
                <View
                  key={colIndex}
                  style={{
                    width: moduleSize,
                    height: moduleSize,
                    backgroundColor: dark ? colors.text : colors.bg,
                  }}
                />
              ))}
            </View>
          ))}
        </View>
      </View>

      <View style={styles.codePill}>
        <Text style={styles.codeLabel}>Kode 4 Digit</Text>
        <Text style={styles.codeValue}>{kodeBersih}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 20,
    padding: 18,
    alignItems: 'center',
    gap: 12,
  },
  title: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
  qrFrame: {
    backgroundColor: colors.bg,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrRow: {
    flexDirection: 'row',
  },
  codePill: {
    alignSelf: 'stretch',
    backgroundColor: colors.bg,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
    gap: 2,
  },
  codeLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
  },
  codeValue: {
    color: colors.primary,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 6,
  },
});
