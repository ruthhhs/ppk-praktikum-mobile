
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
import { colors } from '../constants/theme';
import { useApp } from '../hooks/useApp';

export default function ProfileScreen() {
  const { currentUser, setUser } = useApp();

  const nama = currentUser?.nama ?? 'Pengguna';
  const role = currentUser?.role;
  const isPraktikan = role === 'praktikan';

  const initials = nama
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join('');

  const roleLabel = role === 'asisten' ? 'Asisten' : 'Praktikan';

  const returnToRoleSelect = () => {
    setUser(null);
    router.replace('/');
  };

  const handleChangeRole = () => {
    Alert.alert(
      'Ganti peran?',
      'Kamu akan kembali ke halaman pemilihan peran dan identitas.',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Ganti Peran',
          onPress: returnToRoleSelect,
        },
      ],
    );
  };

  const handleLogout = () => {
    Alert.alert(
      'Keluar dari aplikasi?',
      'Kamu akan kembali ke halaman pemilihan peran dan identitas.',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Keluar',
          style: 'destructive',
          onPress: returnToRoleSelect,
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
        {/* Judul Halaman */}
        <View style={styles.header}>
          <Text style={styles.title}>Profil Saya</Text>
          <Text style={styles.subtitle}>
            Informasi akun dan pengaturan peranmu.
          </Text>
        </View>

        {/* Informasi Profil */}
        <Card style={styles.profileCard}>
          {/* Avatar, nama, dan role di tengah */}
          <View style={styles.profileHeader}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {initials || 'U'}
              </Text>
            </View>

            <Text style={styles.name}>{nama}</Text>

            <View style={styles.roleChip}>
              <View style={styles.roleDot} />
              <Text style={styles.roleText}>{roleLabel}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Informasi Akun */}
          <View style={styles.accountSection}>
            <Text style={styles.sectionLabel}>
              INFORMASI AKUN
            </Text>

            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Text style={styles.infoIconText}>ID</Text>
              </View>

              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>
                  {isPraktikan
                    ? 'Nomor Induk Mahasiswa'
                    : 'Peran pengguna'}
                </Text>

                <Text style={styles.infoValue}>
                  {isPraktikan
                    ? currentUser?.nim || '-'
                    : 'Asisten Praktikum'}
                </Text>
              </View>
            </View>
          </View>
        </Card>

        {/* Pengaturan Akun */}
        <View style={styles.actionSection}>
          

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
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
    gap: 24,
  },

  // Judul halaman
  header: {
    marginBottom: 0,
  },

  title: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
  },

  subtitle: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.textMuted,
    marginTop: 6,
  },

  // Kartu profil
  profileCard: {
    padding: 22,
    borderRadius: 24,
    backgroundColor: colors.surface,
  },

  // Avatar, nama, dan role rata tengah
  profileHeader: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
  },

  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },

  avatarText: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.text,
  },

  name: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
  },

  roleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 8,
    marginTop: 2,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 24,
    backgroundColor: colors.highlight,
  },

  roleDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: colors.text,
  },

  roleText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },

  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 22,
  },

  // Informasi akun
  accountSection: {
    gap: 16,
  },

  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    color: colors.textMuted,
  },

  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  infoIcon: {
    width: 54,
    height: 54,
    borderRadius: 14,
    backgroundColor: colors.highlight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  infoIconText: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.primary,
  },

  infoContent: {
    flex: 1,
    gap: 4,
  },

  infoLabel: {
    fontSize: 13,
    color: colors.textMuted,
  },

  infoValue: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },

  // Pengaturan akun
  actionSection: {
    gap: 8,
  },

  actionTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: colors.text,
  },

  actionSubtitle: {
    fontSize: 13,
    lineHeight: 20,
    color: colors.textMuted,
  },

  actions: {
    gap: 12,
    marginTop: 12,
  },

  // Footer
  footer: {
    fontSize: 12,
    textAlign: 'center',
    color: colors.textMuted,
    marginTop: 'auto',
    paddingTop: 8,
  },
});
