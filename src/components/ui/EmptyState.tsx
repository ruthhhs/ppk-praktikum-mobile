import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import Button from './Button';

type EmptyStateProps = {
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
};

export default function EmptyState({
  title,
  description,
  actionText,
  onAction,
}: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>

      {actionText && onAction ? (
        <Button
          title={actionText}
          variant="secondary"
          onPress={onAction}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 21,
    marginTop: 8,
    marginBottom: 16,
  },
});