import { Ionicons } from '@expo/vector-icons';
import {
  CameraView,
  useCameraPermissions,
  type BarcodeScanningResult,
} from 'expo-camera';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/constants/theme';
import { parsePayloadQrPresensi } from './qrPayload';

export interface QrPresensiScannerModalProps {
  visible: boolean;
  expectedSesiId: string;
  onClose: () => void;
  onBerhasilPindai: (hasil: { sesiId: string | null; kode: string }) => void;
}

export default function QrPresensiScannerModal({
  visible,
  expectedSesiId,
  onClose,
  onBerhasilPindai,
}: QrPresensiScannerModalProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [torchAktif, setTorchAktif] = useState(false);
  const [pesanPindaiError, setPesanPindaiError] = useState<string | null>(null);
  const [sedangMemintaIzin, setSedangMemintaIzin] = useState(false);
  const terkunciRef = useRef(false);

  useEffect(() => {
    if (!visible) {
      terkunciRef.current = false;
      return;
    }

    terkunciRef.current = false;
    if (permission && !permission.granted && permission.canAskAgain) {
      void requestPermission();
    }
  }, [permission, requestPermission, visible]);

  const handleMintaIzin = useCallback(async () => {
    setSedangMemintaIzin(true);
    try {
      await requestPermission();
    } finally {
      setSedangMemintaIzin(false);
    }
  }, [requestPermission]);

  const handleTutup = useCallback(() => {
    terkunciRef.current = false;
    setTorchAktif(false);
    setPesanPindaiError(null);
    onClose();
  }, [onClose]);

  const handleBarcodeScanned = useCallback(
    (result: BarcodeScanningResult) => {
      if (terkunciRef.current) return;
      terkunciRef.current = true;

      const parsed = parsePayloadQrPresensi(result.data ?? '', expectedSesiId);
      if (!parsed.ok) {
        setPesanPindaiError(parsed.pesan);
        return;
      }

      setPesanPindaiError(null);
      setTorchAktif(false);
      onBerhasilPindai({
        sesiId: parsed.sesiId,
        kode: parsed.kode,
      });
    },
    [expectedSesiId, onBerhasilPindai],
  );

  const handlePindaiUlang = () => {
    setPesanPindaiError(null);
    terkunciRef.current = false;
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={handleTutup}
    >
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.headerRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Tutup pemindai QR"
            onPress={handleTutup}
            style={({ pressed }) => [
              styles.headerButton,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.headerButtonText}>Tutup</Text>
          </Pressable>

          <Text style={styles.headerTitle}>Pindai QR Presensi</Text>

          {permission?.granted ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                torchAktif ? 'Matikan senter' : 'Nyalakan senter'
              }
              onPress={() => setTorchAktif((prev) => !prev)}
              style={({ pressed }) => [
                styles.headerButton,
                torchAktif && styles.headerButtonActive,
                pressed && styles.pressed,
              ]}
            >
              <Ionicons
                name={torchAktif ? 'flash' : 'flash-outline'}
                size={16}
                color={torchAktif ? colors.bg : colors.text}
              />
            </Pressable>
          ) : (
            <View style={styles.headerSpacer} />
          )}
        </View>

        {!permission ? (
          <View style={styles.centerContainer}>
            <View style={styles.card}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.cardTitle}>Menyiapkan kamera...</Text>
              <Text style={styles.cardBody}>
                Memeriksa status izin kamera perangkat.
              </Text>
            </View>
          </View>
        ) : !permission.granted ? (
          <View style={styles.centerContainer}>
            <View style={styles.card}>
              <Ionicons
                name="camera-outline"
                size={32}
                color={colors.primary}
              />
              <Text style={styles.cardTitle}>Izin Kamera Dibutuhkan</Text>
              <Text style={styles.cardBody}>
                Aktifkan izin kamera agar kamu dapat memindai QR Code presensi
                yang ditampilkan asisten. Kamu juga tetap bisa memakai kode 4
                digit secara manual.
              </Text>

              <View style={styles.actionsColumn}>
                {permission.canAskAgain ? (
                  <Pressable
                    accessibilityRole="button"
                    disabled={sedangMemintaIzin}
                    onPress={() => void handleMintaIzin()}
                    style={({ pressed }) => [
                      styles.primaryButton,
                      sedangMemintaIzin && styles.disabledButton,
                      pressed && !sedangMemintaIzin && styles.pressed,
                    ]}
                  >
                    {sedangMemintaIzin ? (
                      <ActivityIndicator size="small" color={colors.bg} />
                    ) : (
                      <Text style={styles.primaryButtonText}>
                        Beri Izin Kamera
                      </Text>
                    )}
                  </Pressable>
                ) : null}

                <Pressable
                  accessibilityRole="button"
                  onPress={() => void Linking.openSettings()}
                  style={({ pressed }) => [
                    styles.secondaryButton,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.secondaryButtonText}>
                    Buka Pengaturan
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.scannerContainer}>
            <CameraView
              style={styles.camera}
              facing="back"
              enableTorch={torchAktif}
              barcodeScannerSettings={{
                barcodeTypes: ['qr'],
              }}
              onBarcodeScanned={
                pesanPindaiError ? undefined : handleBarcodeScanned
              }
            />

            <View pointerEvents="none" style={styles.overlayWrap}>
              <View style={styles.viewfinderBox} />
              <Text style={styles.overlayHint}>
                Arahkan kamera ke QR presensi yang ditampilkan asisten
              </Text>
            </View>

            {pesanPindaiError ? (
              <View style={styles.errorDock} accessibilityRole="alert">
                <Text style={styles.errorTitle}>QR Tidak Valid</Text>
                <Text style={styles.errorBody}>{pesanPindaiError}</Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={handlePindaiUlang}
                  style={({ pressed }) => [
                    styles.primaryButton,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.primaryButtonText}>Pindai Ulang</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.bg,
  },
  headerButton: {
    minHeight: 36,
    minWidth: 60,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  headerButtonText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  headerTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  headerSpacer: {
    width: 60,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    gap: 12,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
  },
  cardBody: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
  },
  actionsColumn: {
    alignSelf: 'stretch',
    gap: 10,
    marginTop: 4,
  },
  scannerContainer: {
    flex: 1,
    position: 'relative',
    backgroundColor: colors.text,
  },
  camera: {
    flex: 1,
  },
  overlayWrap: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 16,
  },
  viewfinderBox: {
    width: 230,
    height: 230,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: colors.highlight,
    backgroundColor: 'transparent',
  },
  overlayHint: {
    color: colors.bg,
    backgroundColor: colors.scrim,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    overflow: 'hidden',
  },
  errorDock: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 20,
    backgroundColor: colors.surface,
    borderColor: colors.primary,
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    gap: 8,
  },
  errorTitle: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '800',
  },
  errorBody: {
    color: colors.text,
    fontSize: 13,
    lineHeight: 19,
  },
  primaryButton: {
    minHeight: 46,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  primaryButtonText: {
    color: colors.bg,
    fontSize: 14,
    fontWeight: '800',
  },
  secondaryButton: {
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: colors.bg,
    borderColor: colors.border,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  secondaryButtonText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  disabledButton: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.85,
  },
});
