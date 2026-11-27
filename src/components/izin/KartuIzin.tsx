import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../constants/theme';

// Komponen tampilan murni untuk satu kartu pengajuan izin.
// Tidak membaca store: semua data masuk lewat props, jadi aman dipakai
// di layar Asprak, riwayat Praktikan, atau rekap tanpa saling mengganggu.

export type StatusKartuIzin = 'menunggu' | 'diterima' | 'ditolak';

export type KartuIzinProps = {
  nama?: string;
  nim?: string;
  judulSesi: string;
  status: StatusKartuIzin;
  sentimen?: string;
  alasan: string;
  diajukanPada: string;
  diputuskanPada?: string;
  onTolak?: () => void;
  onTerima?: () => void;
};

// Satu tempat untuk mengganti label dan warna status.
const LABEL_STATUS: Record<StatusKartuIzin, string> = {
  menunggu: 'Menunggu',
  diterima: 'Disetujui',
  ditolak: 'Ditolak',
};

const GAYA_STATUS: Record<
  StatusKartuIzin,
  { bg: string; border?: string; teks: string }
> = {
  menunggu: { bg: colors.bg, border: colors.border, teks: colors.text },
  diterima: { bg: colors.highlight, teks: colors.text },
  ditolak: { bg: colors.primary, teks: colors.bg },
};

function kapitalAwal(teks: string): string {
  return teks.length > 0 ? teks.charAt(0).toUpperCase() + teks.slice(1) : teks;
}

export default function KartuIzin({
  nama,
  nim,
  judulSesi,
  status,
  sentimen,
  alasan,
  diajukanPada,
  diputuskanPada,
  onTolak,
  onTerima,
}: KartuIzinProps) {
  const gayaStatus = GAYA_STATUS[status];
  const tampilkanTombol = status === 'menunggu' && (onTolak || onTerima);
  const tampilkanKeputusan = status !== 'menunggu';

  return (
    <View style={styles.kartu}>
      <View style={styles.header}>
        <View style={styles.identitas}>
          {nama ? <Text style={styles.nama}>{nama}</Text> : null}
          {nim ? <Text style={styles.nim}>NIM {nim}</Text> : null}
          <Text style={styles.nim} numberOfLines={2}>{judulSesi}</Text>
        </View>
        <View
          style={[
            styles.badge,
            { backgroundColor: gayaStatus.bg },
            gayaStatus.border
              ? { borderWidth: 1, borderColor: gayaStatus.border }
              : null,
          ]}
        >
          <Text style={[styles.badgeTeks, { color: gayaStatus.teks }]}>
            {LABEL_STATUS[status]}
          </Text>
        </View>
      </View>

      <View style={[styles.kotak, styles.kotakAlasan, styles.sesiBaris]}>
        <Text style={styles.alasan}>{alasan}</Text>
        <View style={styles.sentimenKolom}>
            <Text style={styles.sentimenLabel}>SENTIMEN AI</Text>
            {sentimen ? (
                <Text
                style={[
                    styles.sentimenNilai,
                    sentimen === 'negatif' && styles.sentimenNegatif,
                ]}
                >
                {kapitalAwal(sentimen)}
                </Text>
            ) : (
                <Text style={styles.sentimenGagal}>Gagal</Text>
            )}
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.waktu}>
          {'diajukan:\n'}
          {diajukanPada}
        </Text>

        {tampilkanTombol ? (
          <View style={styles.tombolBaris}>
            {onTolak ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Tolak pengajuan izin"
                onPress={onTolak}
                style={({ pressed }) => [
                  styles.tombol,
                  styles.tombolTolak,
                  pressed && styles.ditekan,
                ]}
              >
                <Text style={styles.tombolTolakTeks}>Tolak</Text>
              </Pressable>
            ) : null}
            {onTerima ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Terima pengajuan izin"
                onPress={onTerima}
                style={({ pressed }) => [
                  styles.tombol,
                  styles.tombolTerima,
                  pressed && styles.ditekan,
                ]}
              >
                <Text style={styles.tombolTerimaTeks}>Terima</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {tampilkanKeputusan ? (
          <Text style={[styles.waktu, styles.waktuKanan]}>
            {'diputuskan:\n'}
            {diputuskanPada ?? 'Waktu tidak tersedia'}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  kartu: {
    padding: 16,
    marginBottom: 12,
    borderRadius: 14,
    backgroundColor: colors.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 8,
  },
  identitas: { flex: 1, paddingLeft: 4},
  nama: { color: colors.text, fontSize: 17, fontWeight: '800' },
  nim: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 9,
  },
  badgeTeks: { fontSize: 12, fontWeight: '800' },
  kotak: {
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: colors.bg,
  },
  kotakAlasan: { minHeight: 80 },
  sesiBaris: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  sentimenKolom: { alignItems: 'flex-end' },
  sentimenLabel: {
    color: colors.textMuted,
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  sentimenNegatif: { color: colors.primary },
  sentimenNilai: {
    color: '#40690f',
    fontSize: 13,
    fontWeight: '800',
    marginTop: 2,
  },
  sentimenGagal: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '800',
    marginTop: 2,
  },
  alasan: { color: colors.text, fontSize: 13, lineHeight: 19, maxWidth: '60%' },
  footer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 2,
    paddingLeft: 4,
    paddingRight: 4,
  },
  waktu: { color: colors.text, fontSize: 11, lineHeight: 16 },
  waktuKanan: { textAlign: 'right' },
  tombolBaris: { flexDirection: 'row', gap: 8 },
  tombol: {
    minWidth: 84,
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  tombolTolak: {
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.bg,
  },
  tombolTolakTeks: { color: colors.primary, fontSize: 12, fontWeight: '800' },
  tombolTerima: { backgroundColor: colors.highlight },
  tombolTerimaTeks: { color: colors.text, fontSize: 12, fontWeight: '800' },
  ditekan: { opacity: 0.8 },
});