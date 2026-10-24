import { Tabs } from 'expo-router';
import { colors } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';

export default function AsistenLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.bg,
          borderTopColor: colors.border,
        },
      }}
    >
      <Tabs.Screen
        name="jadwal"
        options={{
          title: 'Jadwal',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar-outline" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="profil"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="detail-sesi"
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
        name="rekap-sesi"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
