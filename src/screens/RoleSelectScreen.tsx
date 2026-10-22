
import { useState } from 'react';
import { router } from 'expo-router';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';

type Role = 'asisten' | 'praktikan';

export default function RoleSelectScreen() {
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);

    const handleContinue = () => {
        if (selectedRole === 'asisten') {
            router.replace('/asisten/jadwal');
        } else if (selectedRole === 'praktikan') {
            router.replace('/praktikan/jadwal');
        }
    };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.logo}>SIP!</Text>
        <Text style={styles.subtitle}>
          Sistem Informasi Praktikum
        </Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>Selamat Datang!</Text>
        <Text style={styles.description}>
          Pilih peranmu untuk melanjutkan ke aplikasi.
        </Text>

        <TouchableOpacity
          style={[
            styles.roleCard,
            selectedRole === 'asisten' && styles.selectedCard,
          ]}
          onPress={() => setSelectedRole('asisten')}
          activeOpacity={0.8}
        >
          <Text style={styles.roleIcon}>👨‍🏫</Text>
          <View style={styles.roleTextContainer}>
            <Text style={styles.roleTitle}>Asisten</Text>
            <Text style={styles.roleDescription}>
              Kelola jadwal, sesi, dan rekap presensi praktikum.
            </Text>
          </View>
          <Text style={styles.radio}>
            {selectedRole === 'asisten' ? '🔘' : '⚪'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.roleCard,
            selectedRole === 'praktikan' && styles.selectedCard,
          ]}
          onPress={() => setSelectedRole('praktikan')}
          activeOpacity={0.8}
        >
          <Text style={styles.roleIcon}>🎓</Text>
          <View style={styles.roleTextContainer}>
            <Text style={styles.roleTitle}>Praktikan</Text>
            <Text style={styles.roleDescription}>
              Lihat jadwal, lakukan presensi, dan cek riwayat.
            </Text>
          </View>
          <Text style={styles.radio}>
            {selectedRole === 'praktikan' ? '🔘' : '⚪'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
            style={[
                styles.continueButton,
                !selectedRole && styles.disabledButton,
            ]}
            onPress={handleContinue}
            disabled={!selectedRole}
            activeOpacity={0.8}
            >
            <Text style={styles.continueButtonText}>
                Lanjutkan
            </Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.footer}>
        SIP! • Sistem Informasi Praktikum
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logo: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#2563EB',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 8,
  },
  description: {
    fontSize: 15,
    color: '#64748B',
    lineHeight: 22,
    marginBottom: 28,
  },
  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  selectedCard: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
    borderWidth: 2,
  },
  roleIcon: {
    fontSize: 30,
    marginRight: 14,
  },
  roleTextContainer: {
    flex: 1,
  },
  roleTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 5,
  },
  roleDescription: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 19,
  },
  radio: {
    fontSize: 18,
    marginLeft: 8,
  },
  continueButton: {
    backgroundColor: '#2563EB',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  disabledButton: {
    backgroundColor: '#94A3B8',
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  footer: {
    textAlign: 'center',
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 20,
  },
});
