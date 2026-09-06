import 'react-native-gesture-handler';

import {
  Oxanium_600SemiBold,
  Oxanium_700Bold,
} from '@expo-google-fonts/oxanium';
import {
  Sarabun_400Regular,
  Sarabun_500Medium,
  Sarabun_600SemiBold,
} from '@expo-google-fonts/sarabun';
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
    Oxanium_600SemiBold,
    Oxanium_700Bold,
    Sarabun_400Regular,
    Sarabun_500Medium,
    Sarabun_600SemiBold,
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
