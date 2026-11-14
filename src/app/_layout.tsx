import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { AppProvider } from '../context/AppContext';
import { AuthProvider } from '../context/Auth.Context';
import { useAuth } from '../hooks/useAuth';

function RootNavigator() {
  const { user, role, loading } = useAuth();

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
