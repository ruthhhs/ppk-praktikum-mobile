import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { useApp } from '../hooks/useApp';

export default function ProfilScreen() {
  const { currentUser, setUser } = useApp();

  const logout = () => {
    setUser(null);
    router.replace('/');
  };

  if (!currentUser) {
    return (
      <View style={styles.container}>
        <Text>Belum ada pengguna yang dipilih.</Text>
        <Button title="Pilih Role" onPress={() => router.replace('/')} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profil Saya</Text>

      <Card>
        <Text style={styles.label}>Nama</Text>
        <Text style={styles.value}>{currentUser.nama}</Text>

        <Text style={styles.label}>Role</Text>
        <Text style={styles.value}>
          {currentUser.role === 'asisten' ? 'Asisten' : 'Praktikan'}
        </Text>

        {currentUser.nim && (
          <>
            <Text style={styles.label}>NIM</Text>
            <Text style={styles.value}>{currentUser.nim}</Text>
          </>
        )}
      </Card>

      <View style={styles.logout}>
        <Button
          title="Keluar / Ganti Role"
          variant="danger"
          onPress={logout}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#F8FAFC',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  label: {
    color: '#64748B',
    fontSize: 14,
    marginTop: 12,
  },
  value: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 4,
  },
  logout: {
    marginTop: 24,
  },
});