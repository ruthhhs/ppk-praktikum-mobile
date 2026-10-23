import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

const WARNA = {
  bg: '#FFFFFF',
  surface: '#FEFFE0',
  text: '#17454A',
  textMuted: 'rgba(23, 69, 74, 0.7)',
  primary: '#B5185F',
  highlight: '#D0E86E',
  accent: '#35C1C2',
  border: 'rgba(23, 69, 74, 0.15)',
  scrim: 'rgba(23, 69, 74, 0.5)',
} as const;

export type AlasanPenolakanPresensi =
  | 'sudah_presensi'
  | 'belum_dibuka'
  | 'sudah_ditutup';

export type DataSuksesPresensi = {
  namaPraktikan: string;
  nim?: string;
  namaPraktikum: string;
  pertemuanKe: number;
  kelas: string;
  waktuIso: string;
};

function formatWaktuLengkap(waktuIso: string): string {
  const date = new Date(waktuIso);
  if (Number.isNaN(date.getTime())) {
    return '08.03.12 WIB';
  }
  const jam = String(date.getHours()).padStart(2, '0');
  const menit = String(date.getMinutes()).padStart(2, '0');
  const detik = String(date.getSeconds()).padStart(2, '0');
  return `${jam}.${menit}.${detik} WIB`;
}

export function PresensiSuccessModal({
  visible,
  data,
  onClose,
}: {
  visible: boolean;
  data: DataSuksesPresensi | null;
  onClose: () => void;
}) {
  if (!data) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Tutup modal sukses presensi"
          style={styles.backdrop}
          onPress={onClose}
        />

        <View style={styles.modalCard}>
          <View style={styles.iconWrapSuccess}>
            <Text style={styles.iconSuccessText}>✓</Text>
          </View>

          <View style={styles.headerBlock}>
            <Text style={styles.modalTitle}>Presensi Berhasil</Text>
            <Text style={styles.modalSubtitle}>
              Kehadiran kamu pada sesi praktikum ini telah berhasil tercatat.
            </Text>
          </View>

          <View style={styles.summaryBox}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Nama Praktikan</Text>
              <Text style={styles.summaryValue}>{data.namaPraktikan}</Text>
            </View>

            {data.nim ? (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>NIM</Text>
                <Text style={styles.summaryValue}>{data.nim}</Text>
              </View>
            ) : null}

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Sesi Praktikum</Text>
              <Text style={styles.summaryValue}>
                {data.namaPraktikum} · Pert. {data.pertemuanKe} (Kelas{' '}
                {data.kelas})
              </Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Waktu Presensi</Text>
              <Text style={styles.summaryValueHighlight}>
                {formatWaktuLengkap(data.waktuIso)}
              </Text>
            </View>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Selesai"
            onPress={onClose}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.primaryButtonText}>Selesai</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const INFO_PENOLAKAN: Record<
  AlasanPenolakanPresensi,
  { badge: string; judul: string; deskripsi: string }
> = {
  sudah_presensi: {
    badge: 'SUDAH TERCATAT',
    judul: 'Kamu Sudah Presensi',
    deskripsi:
      'Presensi kedua pada sesi yang sama ditolak. Setiap praktikan hanya diperbolehkan melakukan presensi satu kali per sesi.',
  },
  belum_dibuka: {
    badge: 'BELUM DIBUKA',
    judul: 'Sesi Belum Dibuka',
    deskripsi:
      'Presensi belum dapat dilakukan karena sesi praktikum ini belum dibuka oleh asisten.',
  },
  sudah_ditutup: {
    badge: 'SESI DITUTUP',
    judul: 'Sesi Telah Ditutup',
    deskripsi:
      'Presensi tidak dapat dilakukan lagi karena sesi praktikum ini telah ditutup oleh asisten.',
  },
};

export function PresensiInfoModal({
  visible,
  alasan,
  namaPraktikum,
  pertemuanKe,
  waktuTercatatIso,
  onClose,
}: {
  visible: boolean;
  alasan: AlasanPenolakanPresensi | null;
  namaPraktikum: string;
  pertemuanKe: number;
  waktuTercatatIso?: string;
  onClose: () => void;
}) {
  if (!alasan) {
    return null;
  }

  const info = INFO_PENOLAKAN[alasan];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Tutup modal informasi presensi"
          style={styles.backdrop}
          onPress={onClose}
        />

        <View style={styles.modalCard}>
          <View style={styles.infoBadgePill}>
            <Text style={styles.infoBadgeText}>{info.badge}</Text>
          </View>

          <View style={styles.headerBlock}>
            <Text style={styles.modalTitle}>{info.judul}</Text>
            <Text style={styles.modalSubtitle}>{info.deskripsi}</Text>
          </View>

          <View style={styles.summaryBox}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Praktikum</Text>
              <Text style={styles.summaryValue}>
                {namaPraktikum} · Pertemuan {pertemuanKe}
              </Text>
            </View>

            {alasan === 'sudah_presensi' && waktuTercatatIso ? (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Waktu Tercatat</Text>
                <Text style={styles.summaryValueHighlight}>
                  {formatWaktuLengkap(waktuTercatatIso)}
                </Text>
              </View>
            ) : null}
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Mengerti"
            onPress={onClose}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.primaryButtonText}>Mengerti</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: WARNA.scrim,
  },
  modalCard: {
    backgroundColor: WARNA.surface,
    borderColor: WARNA.border,
    borderWidth: 1,
    borderRadius: 22,
    padding: 20,
    gap: 16,
    alignItems: 'center',
  },
  iconWrapSuccess: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: WARNA.highlight,
    borderColor: WARNA.text,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconSuccessText: {
    color: WARNA.text,
    fontSize: 28,
    fontWeight: '900',
  },
  infoBadgePill: {
    backgroundColor: WARNA.primary,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  infoBadgeText: {
    color: WARNA.surface,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  headerBlock: {
    gap: 6,
    alignItems: 'center',
  },
  modalTitle: {
    color: WARNA.text,
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  modalSubtitle: {
    color: WARNA.textMuted,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
    textAlign: 'center',
  },
  summaryBox: {
    alignSelf: 'stretch',
    backgroundColor: WARNA.bg,
    borderColor: WARNA.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    gap: 10,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  summaryLabel: {
    color: WARNA.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  summaryValue: {
    color: WARNA.text,
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
    textAlign: 'right',
  },
  summaryValueHighlight: {
    color: WARNA.primary,
    fontSize: 13,
    fontWeight: '800',
    flex: 1,
    textAlign: 'right',
  },
  primaryButton: {
    alignSelf: 'stretch',
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: WARNA.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  primaryButtonText: {
    color: WARNA.surface,
    fontSize: 15,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.85,
  },
});
