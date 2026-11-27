import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { colors } from '@/constants/theme';
import { AsistenWorkflowStoreProvider } from '@/screens/asisten/AsistenWorkflowStore';

export default function AsistenLayout() {
  return (
    <AsistenWorkflowStoreProvider>
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
          name="beranda"
          options={{
            title: 'Beranda',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="home-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="kelola"
          options={{
            title: 'Kelola',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="clipboard-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="izin"
          options={{
            title: 'Izin',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="document-text-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="peta"
          options={{
            title: 'Peta',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="map-outline" size={size} color={color} />
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

        <Tabs.Screen name="jadwal" options={{ href: null }} />
        <Tabs.Screen name="notifikasi" options={{ href: null }} />
        <Tabs.Screen name="detail-sesi" options={{ href: null }} />
        <Tabs.Screen name="rekap-sesi" options={{ href: null }} />
        <Tabs.Screen name="data" options={{ href: null }} />
        <Tabs.Screen name="kelola-sesi" options={{ href: null }} />
        <Tabs.Screen name="laboratorium" options={{ href: null }} />
      </Tabs>
    </AsistenWorkflowStoreProvider>
  );
}