import { useCallback, useEffect, useRef } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import * as Notifications from 'expo-notifications';
import {
  DefaultTheme,
  Stack,
  ThemeProvider,
  router,
  type Href,
} from 'expo-router';
import type { Role } from '@/data/types';
import { AppProvider } from '../context/AppContext';
import { AuthProvider } from '../context/Auth.Context';
import { useAuth } from '../hooks/useAuth';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

function RootNavigator() {
  const { user, role, loading } = useAuth();
  const roleRef = useRef<Role | null>(role);
  const pendingResponse =
    useRef<Notifications.NotificationResponse | null>(null);
  const handledResponseId = useRef<string | null>(null);

  useEffect(() => {
    roleRef.current = role;
  }, [role]);

  const bukaDariNotifikasi = useCallback(
    (response: Notifications.NotificationResponse) => {
      const activeRole = roleRef.current;

      if (!activeRole) {
        pendingResponse.current = response;
        return;
      }

      const notificationId = response.notification.request.identifier;
      if (handledResponseId.current === notificationId) return;
      handledResponseId.current = notificationId;

      const data = response.notification.request.content.data;
      const url = data?.url;

      if (
        typeof url === 'string' &&
        url.startsWith(`/${activeRole}/`) &&
        !url.includes('://')
      ) {
        router.push(url as Href);
        return;
      }

      const sesiId = data?.sesiId;
      if (typeof sesiId === 'string' && sesiId.length > 0) {
        router.push({
          pathname:
            activeRole === 'asisten'
              ? '/asisten/detail-sesi'
              : '/praktikan/detail-sesi',
          params: { sesiId },
        } as Href);
        return;
      }

      router.push(
        activeRole === 'asisten'
          ? '/asisten/notifikasi'
          : '/praktikan/notifikasi',
      );
    },
    [],
  );

  useEffect(() => {
    const lastResponse = Notifications.getLastNotificationResponse();
    if (lastResponse) bukaDariNotifikasi(lastResponse);

    const subscription =
      Notifications.addNotificationResponseReceivedListener(
        bukaDariNotifikasi,
      );

    return () => subscription.remove();
  }, [bukaDariNotifikasi]);

  useEffect(() => {
    if (role && pendingResponse.current) {
      const response = pendingResponse.current;
      pendingResponse.current = null;
      bukaDariNotifikasi(response);
    }
  }, [role, bukaDariNotifikasi]);

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Protected guard={!user}>
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />
      </Stack.Protected>
      <Stack.Protected guard={!!user && !role}>
        <Stack.Screen name="akun-bermasalah" />
      </Stack.Protected>
      <Stack.Protected guard={role === 'asisten'}>
        <Stack.Screen name="asisten" />
      </Stack.Protected>
      <Stack.Protected guard={role === 'praktikan'}>
        <Stack.Screen name="praktikan" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AppProvider>
      <AuthProvider>
        <ThemeProvider value={DefaultTheme}>
          <RootNavigator />
        </ThemeProvider>
      </AuthProvider>
    </AppProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});