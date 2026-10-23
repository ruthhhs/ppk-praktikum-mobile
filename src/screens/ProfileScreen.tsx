import { useState } from 'react';
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';

import Button  from '../components/ui/Button';
import Card from '../components/ui/Card';
import { colors } from '../constants/theme';
import { useApp } from '../hooks/useApp';

export default function ProfileScreen() {
  const { currentUser, setUser } = useApp();
  const [isProcessing, setIsProcessing] = useState(false);

  const nama = currentUser?.nama ?? 'Pengguna';
  const role = currentUser?.role;
  const isPraktikan = role === 'praktikan';

  const initials = nama
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join('');

  const roleLabel =
    role === 'asisten' ? 'Asisten' : 'Praktikan';

  const handleChangeRole = () => {
    Alert.alert(
      'Ganti peran?',
      'Kamu akan kembali ke halaman pemilihan peran dan identitas.',
      [
        {
          text: 'Batal',
          style: 'cancel',
        },
        {
          text: 'Ganti Peran',
          onPress: () => {
            setUser(null);
            router.replace('/');
          },
        },
      ],
    );
  };

  const handleLogout = () => {
    Alert.alert(
      'Keluar dari aplikasi?',
      'Kamu akan kembali ke halaman pemilihan peran dan identitas.',
      [
        {
          text: 'Batal',
          style: 'cancel',
        },
        {
          text: 'Keluar',
          style: 'destructive',
          onPress: () => {
            setUser(null);
            router.replace('/');
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Profil</Text>
        <Text style={styles.subtitle}>
          Informasi pengguna SIP!
        </Text>

        <Card style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {initials || 'U'}
            </Text>
          </View>

          <Text style={styles.name}>{nama}</Text>

          <View style={styles.roleChip}>
            <Text style={styles.roleText}>{roleLabel}</Text>
          </View>

          {isPraktikan && (
            <View style={styles.infoBox}>
              <Text style={styles.infoLabel}>NIM</Text>
              <Text style={styles.infoValue}>
                {currentUser?.nim || '-'}
              </Text>
            </View>
          )}
        </Card>

        <View style={styles.actions}>
          <Button
            title="Ganti Peran"
            variant="primary"
            onPress={handleChangeRole}
          />

          <Button
            title="Keluar"
            variant="danger"
            onPress={handleLogout}
          />
        </View>
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
    padding: 20,
    gap: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: -10,
  },
  profileCard: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 20,
    gap: 12,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
  },
  name: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  roleChip: {
    backgroundColor: colors.highlight,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 7,
  },
  roleText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  infoBox: {
    width: '100%',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: 8,
    paddingTop: 16,
    gap: 6,
  },
  infoLabel: {
    color: colors.textMuted,
    fontSize: 13,
  },
  infoValue: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  actions: {
    gap: 12,
    marginTop: 8,
  },
});
