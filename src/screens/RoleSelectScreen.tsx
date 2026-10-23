
import { useState } from 'react';
import { router } from 'expo-router';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
} from 'react-native';

import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { colors } from '../constants/theme';
import { dummyUsers } from '../data/dummy';
import type { Role, User } from '../data/types';
import { useApp } from '../hooks/useApp';

export default function RoleSelectScreen() {
  const [selectedRole, setSelectedRole] = useState<Role>('asisten');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const { setUser } = useApp();

  const users = dummyUsers.filter(
    (user) => user.role === selectedRole,
  );

  const handleRoleChange = (role: Role) => {
    setSelectedRole(role);
    setSelectedUser(null);
  };

  const handleLogin = () => {
    if (!selectedUser) return;

    setUser(selectedUser);

    if (selectedUser.role === 'asisten') {
      router.replace('/asisten/jadwal');
    } else {
      router.replace('/praktikan/jadwal');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.logo}>SIP!</Text>

          <Text style={styles.subtitle}>
            Sistem Informasi Praktikum
          </Text>
        </View>

        <View style={styles.content}>
          <Text style={styles.heading}>Masuk sebagai</Text>

          <View style={styles.roleToggle}>
            <Pressable
              style={[
                styles.roleOption,
                selectedRole === 'asisten' && styles.activeRole,
              ]}
              onPress={() => handleRoleChange('asisten')}
            >
              <Text
                style={[
                  styles.roleText,
                  selectedRole === 'asisten' &&
                    styles.activeRoleText,
                ]}
              >
                Asisten
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.roleOption,
                selectedRole === 'praktikan' && styles.activeRole,
              ]}
              onPress={() => handleRoleChange('praktikan')}
            >
              <Text
                style={[
                  styles.roleText,
                  selectedRole === 'praktikan' &&
                    styles.activeRoleText,
                ]}
              >
                Praktikan
              </Text>
            </Pressable>
          </View>

          <Text style={styles.sectionTitle}>
            Pilih identitas
          </Text>

          <View style={styles.userList}>
            {users.map((user) => {
              const isSelected = selectedUser?.id === user.id;

              return (
                <Card
                  key={user.id}
                  onPress={() => setSelectedUser(user)}
                  style={[
                    styles.userCard,
                    isSelected && styles.selectedUserCard,
                  ]}
                >
                  <View style={styles.userRow}>
                    <View style={styles.userInfo}>
                      <Text style={styles.userName}>
                        {user.nama}
                      </Text>

                      {user.role === 'praktikan' && user.nim && (
                        <Text style={styles.userNim}>
                          NIM {user.nim}
                        </Text>
                      )}
                    </View>

                    <View
                      style={[
                        styles.radio,
                        isSelected && styles.radioSelected,
                      ]}
                    >
                      {isSelected && (
                        <View style={styles.radioInner} />
                      )}
                    </View>
                  </View>
                </Card>
              );
            })}

            {users.length === 0 && (
              <Text style={styles.emptyText}>
                Belum ada identitas untuk peran ini.
              </Text>
            )}
          </View>

          <Button
            title="Masuk"
            onPress={handleLogin}
            disabled={!selectedUser}
            style={styles.loginButton}
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
    paddingHorizontal: 20,
    paddingTop: 36,
    paddingBottom: 24,
  },

  header: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 36,
  },

  logo: {
    fontSize: 42,
    fontWeight: 'bold',
    color: colors.primary,
  },

  subtitle: {
    marginTop: 4,
    fontSize: 14,
    color: colors.text,
    textAlign: 'center',
  },

  content: {
    flex: 1,
    flexDirection: 'column',
  },

  heading: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
  },

  roleToggle: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 24,
  },

  roleOption: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
  },

  activeRole: {
    backgroundColor: colors.highlight,
  },

  roleText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },

  activeRoleText: {
    color: colors.text,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },

  userList: {
    flexDirection: 'column',
    gap: 12,
  },

  userCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
  },

  selectedUserCard: {
    borderColor: colors.primary,
    borderWidth: 2,
    backgroundColor: colors.highlight,
  },

  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  userInfo: {
    flex: 1,
    flexDirection: 'column',
    marginRight: 12,
  },

  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },

  userNim: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 4,
  },

  radio: {
    width: 22,
    height: 22,
    borderWidth: 2,
    borderColor: colors.text,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },

  radioSelected: {
    borderColor: colors.primary,
  },

  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
  },

  emptyText: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    padding: 16,
  },

  loginButton: {
    marginTop: 24,
    minHeight: 48,
  },
});
