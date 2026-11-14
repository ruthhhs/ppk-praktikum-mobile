import { useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { colors, Spacing } from '../constants/theme';
import { useAuth } from '../hooks/useAuth';
import { logoutUser, pesanErrorAuth } from '../services/firebase/auth';

export default function ProfileScreen() {
  const { profile } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);

  const nama = profile?.nama ?? 'Pengguna';
  const role = profile?.role;
  const isPraktikan = role === 'praktikan';
  const roleLabel = role === 'asisten' ? 'Asisten' : 'Praktikan';
  const initials = nama
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join('') || 'U';

  const logoutAndReturnToLogin = async () => {
    setLoggingOut(true);
    try {
      await logoutUser();
      router.replace('/login');
    } catch (error) {
      Alert.alert('Gagal keluar', pesanErrorAuth(error));
    } finally {
      setLoggingOut(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Keluar dari akun?',
      'Kamu perlu login kembali untuk menggunakan aplikasi.',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Keluar',
          style: 'destructive',
          onPress: () => {
            void logoutAndReturnToLogin();
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Profil</Text>
          <Text style={styles.subtitle}>Informasi akunmu</Text>
        </View>

        <Card style={styles.profileCard}>
          <View style={styles.identity}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <Text style={styles.name}>{nama}</Text>
            <View style={styles.roleChip}>
              <Text style={styles.roleText}>{roleLabel}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.details}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Email</Text>
              <Text style={styles.detailValue}>{profile?.email ?? '-'}</Text>
            </View>
            {isPraktikan ? (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>NIM</Text>
                <Text style={styles.detailValue}>{profile?.nim ?? '-'}</Text>
              </View>
            ) : null}
          </View>
        </Card>

        <Button
          title="Keluar"
          variant="primary"
          onPress={handleLogout}
          disabled={loggingOut}
          loading={loggingOut}
          style={styles.logoutButton}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 28,
    gap: Spacing.three,
  },
  header: {
    gap: Spacing.one,
  },
  title: {
    color: colors.text,
    fontSize: 26,
    fontWeight: '800',
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  profileCard: {
    padding: 18,
    borderRadius: 20,
    backgroundColor: colors.surface,
  },
  identity: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
  },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.bg,
    fontSize: 32,
    fontWeight: '800',
  },
  name: {
    color: colors.text,
    fontSize: 30,
    fontWeight: '800',
    textAlign: 'center',
  },
  roleChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.highlight,
  },
  roleText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    marginVertical: Spacing.three,
    backgroundColor: colors.border,
  },
  details: {
    gap: Spacing.three,
  },
  detailRow: {
    gap: Spacing.one,
  },
  detailLabel: {
    color: colors.textMuted,
    fontSize: 13,
  },
  detailValue: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  logoutButton: {
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: colors.primary,
  },
});
