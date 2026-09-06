import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';

import { useTheme } from '@/context/ThemeContext';

export function RootNavigator() {
  const { colors, isDark } = useTheme();

  return (
    <>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background.primary },
        }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="scanner" options={{ presentation: 'card' }} />
        <Stack.Screen name="cargo/[id]" options={{ presentation: 'card' }} />
      </Stack>
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </>
  );
}

export function ThemeLoadingScreen() {
  const { colors } = useTheme();

  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.background.primary,
      }}>
      <ActivityIndicator size="large" color={colors.accent.primary} />
    </View>
  );
}
