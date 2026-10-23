import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
} from 'react-native';
import Button from './Button';

type ConfirmModalProps = {
  visible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
};

export default function ConfirmModal({
  visible,
  title,
  message,
  confirmText = 'Konfirmasi',
  cancelText = 'Batal',
  onConfirm,
  onCancel,
  danger = false,
}: ConfirmModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          <View style={styles.actions}>
            <View style={styles.buttonWrapper}>
              <Button
                title={cancelText}
                variant="secondary"
                onPress={onCancel}
              />
            </View>

            <View style={styles.buttonWrapper}>
              <Button
                title={confirmText}
                variant={danger ? 'danger' : 'primary'}
                onPress={onConfirm}
              />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modal: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  message: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 21,
    marginTop: 10,
    marginBottom: 24,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  buttonWrapper: {
    flex: 1,
  },
});