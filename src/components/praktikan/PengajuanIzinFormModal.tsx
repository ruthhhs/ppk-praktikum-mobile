import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { WARNA } from './praktikanStore';

export type HasilSubmitIzinModal = {
  ok: boolean;
  pesanErrorInput?: string;
};

type PengajuanIzinFormModalProps = {
  visible: boolean;
  namaPraktikum: string;
  pertemuanKe: number;
  kelas: string;
  lab: string;
  tanggalFormatted: string;
  isSubmitting?: boolean;
  onClose: () => void;
  onSubmitIzin: (
    alasan: string,
  ) => HasilSubmitIzinModal | Promise<HasilSubmitIzinModal>;
};

export default function PengajuanIzinFormModal({
  visible,
  namaPraktikum,
  pertemuanKe,
  kelas,
  lab,
  tanggalFormatted,
  isSubmitting = false,
  onClose,
  onSubmitIzin,
}: PengajuanIzinFormModalProps) {
  const [alasan, setAlasan] = useState('');
  const [pesanError, setPesanError] = useState<string | null>(null);

  const resetFormState = () => {
    setAlasan('');
    setPesanError(null);
  };

  const handleClose = () => {
    resetFormState();
    onClose();
  };

  const handleUbahAlasan = (teks: string) => {
    setAlasan(teks.slice(0, 500));
    if (pesanError) {
      setPesanError(null);
    }
  };

  const panjangAlasan = alasan.trim().length;

  const handleKirim = async () => {
    if (isSubmitting) {
      return;
    }

    const bersih = alasan.trim();
    if (bersih.length === 0) {
      setPesanError('Alasan ketidakhadiran wajib diisi.');
      return;
    }

    if (bersih.length < 10 || bersih.length > 500) {
      setPesanError(
        `Alasan izin wajib berisi 10 sampai 500 karakter (saat ini ${bersih.length} karakter).`,
      );
      return;
    }

    const hasil = await onSubmitIzin(bersih);
    if (!hasil.ok && hasil.pesanErrorInput) {
      setPesanError(hasil.pesanErrorInput);
      return;
    }
    if (hasil.ok) {
      resetFormState();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onShow={resetFormState}
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.modalCard}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.modalContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.headerBlock}>
              <Text style={styles.title}>Ajukan Izin Ketidakhadiran</Text>
              <Text style={styles.subtitle}>
                Tuliskan alasan berhalangan hadir dengan jelas. Pengajuan akan
                diklasifikasikan oleh AI sebagai informasi pendukung untuk
                asisten.
              </Text>
            </View>

            <View style={styles.sessionSummaryBox}>
              <Text style={styles.sessionSummaryCourse}>{namaPraktikum}</Text>
              <Text style={styles.sessionSummaryMeta}>
                Pertemuan {pertemuanKe} · Kelas {kelas} · {lab}
              </Text>
              <Text style={styles.sessionSummaryDate}>{tanggalFormatted}</Text>
            </View>

            <View style={styles.inputSection}>
              <View style={styles.labelRow}>
                <Text style={styles.inputLabel}>Alasan Ketidakhadiran</Text>
                <Text
                  style={[
                    styles.counterText,
                    panjangAlasan > 0 &&
                      panjangAlasan < 10 &&
                      styles.counterTextWarn,
                  ]}
                >
                  {panjangAlasan}/500 karakter
                </Text>
              </View>

              <TextInput
                value={alasan}
                onChangeText={handleUbahAlasan}
                maxLength={500}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                editable={!isSubmitting}
                placeholder="Contoh: Saya tidak dapat mengikuti praktikum karena sedang demam tinggi dan harus beristirahat sesuai anjuran dokter."
                placeholderTextColor={WARNA.textMuted}
                accessibilityLabel="Input alasan izin ketidakhadiran"
                style={[styles.textArea, pesanError ? styles.inputError : null]}
              />

              {pesanError ? (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{pesanError}</Text>
                </View>
              ) : (
                <Text style={styles.helperText}>
                  Minimal 10 karakter, maksimal 500 karakter. Alasan yang sudah
                  dikirim tidak dapat diubah kembali.
                </Text>
              )}
            </View>

            <View style={styles.aiNoticeBox}>
              <Text style={styles.aiNoticeTitle}>Informasi Pemeriksaan AI</Text>
              <Text style={styles.aiNoticeBody}>
                Sistem memprediksi kategori alasan melalui API AI untuk membantu
                asisten meninjau pengajuan. Keputusan diterima atau ditolak
                sepenuhnya ditentukan oleh asisten.
              </Text>
            </View>

            <View style={styles.actionRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Batal ajukan izin"
                disabled={isSubmitting}
                onPress={handleClose}
                style={({ pressed }) => [
                  styles.secondaryButton,
                  isSubmitting && styles.disabledButton,
                  pressed && !isSubmitting && styles.pressed,
                ]}
              >
                <Text style={styles.secondaryButtonText}>Batal</Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Kirim Pengajuan Izin"
                accessibilityState={{ disabled: isSubmitting }}
                disabled={isSubmitting}
                onPress={handleKirim}
                style={({ pressed }) => [
                  styles.primaryButton,
                  isSubmitting && styles.disabledButton,
                  pressed && !isSubmitting && styles.pressed,
                ]}
              >
                <Text
                  style={[
                    styles.primaryButtonText,
                    isSubmitting && styles.disabledButtonText,
                  ]}
                >
                  {isSubmitting
                    ? 'Memproses & AI...'
                    : 'Kirim Pengajuan'}
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: WARNA.scrim,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '90%',
    backgroundColor: WARNA.surface,
    borderColor: WARNA.border,
    borderWidth: 1,
    borderRadius: 20,
    padding: 20,
  },
  modalContent: {
    gap: 14,
  },
  headerBlock: {
    gap: 6,
  },
  title: {
    color: WARNA.text,
    fontSize: 20,
    fontWeight: '800',
  },
  subtitle: {
    color: WARNA.textMuted,
    fontSize: 13,
    lineHeight: 19,
  },
  sessionSummaryBox: {
    backgroundColor: WARNA.bg,
    borderColor: WARNA.border,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 2,
  },
  sessionSummaryCourse: {
    color: WARNA.text,
    fontSize: 15,
    fontWeight: '800',
  },
  sessionSummaryMeta: {
    color: WARNA.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  sessionSummaryDate: {
    color: WARNA.text,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  inputSection: {
    gap: 8,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  inputLabel: {
    color: WARNA.text,
    fontSize: 13,
    fontWeight: '700',
  },
  counterText: {
    color: WARNA.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  counterTextWarn: {
    color: WARNA.primary,
  },
  textArea: {
    minHeight: 108,
    backgroundColor: WARNA.bg,
    borderColor: WARNA.border,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: WARNA.text,
    fontSize: 14,
    lineHeight: 20,
  },
  inputError: {
    borderColor: WARNA.primary,
  },
  errorBox: {
    backgroundColor: WARNA.bg,
    borderColor: WARNA.primary,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  errorText: {
    color: WARNA.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  helperText: {
    color: WARNA.textMuted,
    fontSize: 12,
    lineHeight: 17,
  },
  aiNoticeBox: {
    backgroundColor: WARNA.bg,
    borderColor: WARNA.border,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 4,
  },
  aiNoticeTitle: {
    color: WARNA.text,
    fontSize: 12,
    fontWeight: '800',
  },
  aiNoticeBody: {
    color: WARNA.textMuted,
    fontSize: 12,
    lineHeight: 17,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  secondaryButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 14,
    backgroundColor: WARNA.bg,
    borderColor: WARNA.border,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  secondaryButtonText: {
    color: WARNA.text,
    fontSize: 14,
    fontWeight: '700',
  },
  primaryButton: {
    flex: 1.3,
    minHeight: 46,
    borderRadius: 14,
    backgroundColor: WARNA.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  primaryButtonText: {
    color: WARNA.bg,
    fontSize: 14,
    fontWeight: '800',
  },
  disabledButton: {
    opacity: 0.45,
  },
  disabledButtonText: {
    color: WARNA.bg,
  },
  pressed: {
    opacity: 0.82,
  },
});
