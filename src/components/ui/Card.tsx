import type { ReactNode } from 'react';
import {
  Pressable,
  View,
  StyleSheet,
  type ViewStyle,
} from 'react-native';

type CardProps = {
  children: ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
};

export default function Card({
  children,
  onPress,
  style,
}: CardProps) {
  const content = (
    <View style={[styles.content, style]}>
      {children}
    </View>
  );

  if (!onPress) return content;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => pressed && styles.pressed}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
  },
  pressed: {
    opacity: 0.8,
  },
});