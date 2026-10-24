import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

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

export type HasilSubmitKode = {
  ok: boolean;
  pesanErrorInput?: string;
};

export type PresensiFormModalProps = {
  visible: boolean;
  namaPraktikum: string;
  pertemuanKe: number;
  kelas: string;
  lab: string;
  petunjukKodeDemo?: string;
  onClose: () => void;
  onSubmitKode: (kode: string) => HasilSubmitKode;
};

export default function PresensiFormModal({
  visible,
  namaPraktikum,
  pertemuanKe,
  kelas,
  lab,
  petunjukKodeDemo,
  onClose,
  onSubmitKode,
}: PresensiFormModalProps) {
  const [kodeInput, setKodeInput] = useState('');
  const [pesanError, setPesanError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setKodeInput('');
      setPesanError(null);
    }
  }, [visible]);

  const handleUbahKode = (teks: string) => {
    const hanyaAngka = teks.replace(/\D/g, '').slice(0, 4);
    setKodeInput(hanyaAngka);
    if (pesanError) {
      setPesanError(null);
    }
  };

  const handleKirim = () => {
    const kodeBersih = kodeInput.trim();

    if (kodeBersih.length === 0) {
      setPesanError('Kode wajib diisi');
      return;
    }

    if (!/^\d{4}$/.test(kodeBersih)) {
      setPesanError('Kode presensi harus 4 digit angka');
      return;
    }

    const hasil = onSubmitKode(kodeBersih);
    if (!hasil.ok && hasil.pesanErrorInput) {
      setPesanError(hasil.pesanErrorInput);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Tutup form presensi"
          style={styles.backdrop}
          onPress={onClose}
        />

        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalEyebrow}>FORM PRESENSI</Text>
            <Text style={styles.modalTitle}>Masukkan Kode Presensi</Text>
            <Text style={styles.modalSubtitle}>
              {namaPraktikum} · Pertemuan {pertemuanKe} · Kelas {kelas} ({lab})
            </Text>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Kode Presensi (4 digit)</Text>

            <TextInput
              value={kodeInput}
              onChangeText={handleUbahKode}
              placeholder="Contoh: 4827"
              placeholderTextColor={WARNA.textMuted}
              keyboardType="number-pad"
              maxLength={4}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleKirim}
              accessibilityLabel="Input kode presensi 4 digit"
              style={[
                styles.codeInput,
                pesanError ? styles.codeInputError : null,
              ]}
            />

            <View style={styles.digitPreviewRow}>
              {[0, 1, 2, 3].map((index) => {
                const karakter = kodeInput[index] ?? '';
                const terisi = karakter.length > 0;
                return (
                  <View
                    key={index}
                    style={[
                      styles.digitBox,
                      terisi && styles.digitBoxFilled,
                      pesanError ? styles.digitBoxError : null,
                    ]}
                  >
                    <Text style={styles.digitBoxText}>
                      {terisi ? karakter : '-'}
                    </Text>
                  </View>
                );
              })}
            </View>

            {pesanError ? (
              <View
                accessibilityLiveRegion="polite"
                style={styles.errorBox}
              >
                <Text style={styles.errorText}>{pesanError}</Text>
              </View>
            ) : (
              <Text style={styles.helperText}>
                Mintalah 4 digit kode presensi kepada asisten praktikum yang
                bertugas di ruang lab.
              </Text>
            )}

            {petunjukKodeDemo ? (
              <View style={styles.demoHintRow}>
                <Text style={styles.demoHintText}>
                  Kode sesi aktif (simulasi demo): {petunjukKodeDemo}
                </Text>
              </View>
            ) : null}
          </View>

          <View style={styles.actionRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Batal"
              onPress={onClose}
              style={({ pressed }) => [
                styles.secondaryButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.secondaryButtonText}>Batal</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Kirim kode presensi"
              onPress={handleKirim}
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.primaryButtonText}>Kirim</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
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
    gap: 18,
  },
  modalHeader: {
    gap: 6,
  },
  modalEyebrow: {
    color: WARNA.primary,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  modalTitle: {
    color: WARNA.text,
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 26,
  },
  modalSubtitle: {
    color: WARNA.textMuted,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 19,
  },
  fieldGroup: {
    gap: 10,
  },
  fieldLabel: {
    color: WARNA.text,
    fontSize: 14,
    fontWeight: '700',
  },
  codeInput: {
    minHeight: 52,
    backgroundColor: WARNA.bg,
    borderColor: WARNA.text,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: WARNA.text,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 6,
    textAlign: 'center',
  },
  codeInputError: {
    borderColor: WARNA.primary,
    borderWidth: 2,
  },
  digitPreviewRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  digitBox: {
    width: 46,
    height: 44,
    borderRadius: 12,
    backgroundColor: WARNA.bg,
    borderColor: WARNA.border,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  digitBoxFilled: {
    backgroundColor: WARNA.highlight,
    borderColor: WARNA.text,
  },
  digitBoxError: {
    borderColor: WARNA.primary,
  },
  digitBoxText: {
    color: WARNA.text,
    fontSize: 18,
    fontWeight: '800',
  },
  errorBox: {
    backgroundColor: WARNA.bg,
    borderColor: WARNA.primary,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  errorText: {
    color: WARNA.primary,
    fontSize: 13,
    fontWeight: '800',
  },
  helperText: {
    color: WARNA.textMuted,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  demoHintRow: {
    backgroundColor: WARNA.bg,
    borderColor: WARNA.border,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  demoHintText: {
    color: WARNA.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 2,
  },
  secondaryButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: WARNA.bg,
    borderColor: WARNA.text,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  secondaryButtonText: {
    color: WARNA.text,
    fontSize: 15,
    fontWeight: '700',
  },
  primaryButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: WARNA.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
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
