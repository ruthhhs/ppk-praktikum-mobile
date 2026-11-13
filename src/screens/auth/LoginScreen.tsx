import { Link } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, Spacing } from '@/constants/theme';
import { validateEmail, validatePassword } from '@/data/validation';
import { loginUser, pesanErrorAuth } from '@/services/firebase/auth';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async () => {
    const nextErrors = {
      email: validateEmail(email) ?? undefined,
      password: validatePassword(password) ?? undefined,
    };
    setErrors(nextErrors);
    setFormError(null);
    if (Object.values(nextErrors).some(Boolean)) return;

    setSubmitting(true);
    try {
      await loginUser(email, password);
    } catch (error) {
      setFormError(pesanErrorAuth(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
        >
          <View style={styles.heading}>
            <Text style={styles.logo}>SIP!</Text>
            <Text style={styles.subtitle}>Sistem Informasi Praktikum</Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.title}>Selamat datang</Text>
            <Text style={styles.description}>Masuk untuk melanjutkan ke akun Anda.</Text>

            <View style={styles.field}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={[styles.input, errors.email ? styles.inputError : undefined]}
                placeholder="nama@email.com"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
                editable={!submitting}
              />
              {errors.email ? <Text style={styles.error}>{errors.email}</Text> : null}
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={[styles.input, errors.password ? styles.inputError : undefined]}
                placeholder="Masukkan password"
                placeholderTextColor={colors.textMuted}
                secureTextEntry
                autoComplete="password"
                value={password}
                onChangeText={setPassword}
                editable={!submitting}
              />
              {errors.password ? <Text style={styles.error}>{errors.password}</Text> : null}
            </View>

            {formError ? <Text style={styles.error}>{formError}</Text> : null}
            <Pressable
              accessibilityRole="button"
              onPress={onSubmit}
              disabled={submitting}
              style={({ pressed }) => [
                styles.button,
                (pressed || submitting) && styles.buttonPressed,
              ]}
            >
              {submitting ? (
                <ActivityIndicator color={colors.surface} />
              ) : (
                <Text style={styles.buttonText}>Masuk</Text>
              )}
            </Pressable>

            <Text style={styles.switchText}>
              Belum punya akun? <Link href="/register" style={styles.link}>Daftar</Link>
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  keyboard: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: Spacing.four,
  },
  heading: {
    alignItems: 'center',
    marginBottom: Spacing.three,
  },
  logo: {
    color: colors.primary,
    fontSize: 42,
    fontWeight: '800',
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 14,
    marginTop: Spacing.one,
  },
  form: {
    gap: 12,
    padding: 18,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  title: {
    color: colors.text,
    fontSize: 26,
    fontWeight: '800',
  },
  description: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: Spacing.two,
  },
  field: {
    gap: Spacing.one,
  },
  label: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  input: {
    minHeight: 48,
    paddingHorizontal: Spacing.three,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    color: colors.text,
    backgroundColor: colors.bg,
    fontSize: 15,
  },
  inputError: {
    borderColor: colors.primary,
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
  switchText: {
    color: colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
    marginTop: Spacing.two,
  },
  link: {
    color: colors.primary,
    fontWeight: '700',
  },
});
