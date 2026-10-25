
import {
  DefaultTheme,
  ThemeProvider,
  Stack,
} from 'expo-router';
import { AppProvider } from '../context/AppContext';

export default function RootLayout() {
  return (
    <AppProvider>
      <ThemeProvider value={DefaultTheme}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="asisten" />
          <Stack.Screen name="praktikan" />
        </Stack>
      </ThemeProvider>
    </AppProvider>
  );
}
