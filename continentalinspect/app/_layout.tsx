import 'react-native-gesture-handler';

import {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from '@expo-google-fonts/poppins';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { RootNavigator, ThemeLoadingScreen } from '@/components/RootNavigator';
import { AuthProvider } from '@/context/AuthContext';
import { ThemeProvider, useTheme } from '@/context/ThemeContext';
import { CargoInspectionsProvider } from '@/context/CargoInspectionsContext';
import { EvidenceMediaPipelineProvider } from '@/context/EvidenceMediaPipelineContext';
import { colors } from '@/theme/colors';

function FontLoadingGate({ fontsLoaded }: { fontsLoaded: boolean }) {
  const { isReady } = useTheme();

  if (!fontsLoaded || !isReady) {
    return <ThemeLoadingScreen />;
  }

  return (
    <AuthProvider>
      <EvidenceMediaPipelineProvider>
        <CargoInspectionsProvider>
          <RootNavigator />
        </CargoInspectionsProvider>
      </EvidenceMediaPipelineProvider>
    </AuthProvider>
  );
}

SplashScreen.preventAutoHideAsync().catch(() => {
  // Ignore if splash is no longer available (hot reload).
});

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
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

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <FontLoadingGate fontsLoaded={fontsLoaded} />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
