import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, Spacing } from '../constants/theme';
import { useAuth } from '../hooks/useAuth';
import { logoutUser, pesanErrorAuth } from '../services/firebase/auth';

export default function AccountProblemRoute() {
  const { profileError } = useAuth();
  const [logoutError, setLogoutError] = useState<string | null>(null);

  const handleLogout = async () => {
    setLogoutError(null);
    try {
      await logoutUser();
    } catch (error) {
      setLogoutError(pesanErrorAuth(error));
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Akun belum dapat digunakan</Text>
        <Text style={styles.message}>
          {profileError ?? 'Profil akun belum memiliki peran yang valid. Hubungi pengelola aplikasi.'}
        </Text>
        {logoutError ? <Text style={styles.error}>{logoutError}</Text> : null}
        <Pressable
          accessibilityRole="button"
          onPress={handleLogout}
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
        >
          <Text style={styles.buttonText}>Keluar</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: Spacing.four,
    backgroundColor: colors.bg,
  },
  card: {
    gap: Spacing.two,
    padding: Spacing.four,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
  },
  message: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 21,
    marginBottom: Spacing.two,
  },
  error: {
    color: colors.primary,
    fontSize: 13,
  },
  button: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
    borderRadius: 12,
    backgroundColor: colors.primary,
  },
  buttonPressed: {
    opacity: 0.75,
  },
  buttonText: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: '700',
  },
});
