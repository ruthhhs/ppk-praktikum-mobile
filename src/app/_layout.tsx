
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
  Stack,
} from 'expo-router';
import { useColorScheme } from 'react-native';
import { AppProvider } from '../context/AppContext';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <AppProvider>
      <ThemeProvider
        value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}
      >
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="asisten" />
          <Stack.Screen name="praktikan" />
        </Stack>
      </ThemeProvider>
    </AppProvider>
  );
}
