import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as ScreenOrientation from 'expo-screen-orientation';
import { useEffect } from 'react';
import { Dimensions } from 'react-native';
import 'react-native-reanimated';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  initialRouteName: 'index',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  useEffect(() => {
    const setDeviceOrientation = async () => {
      const { width, height } = Dimensions.get('window');
      const smallestSide = Math.min(width, height);
      const isTablet = smallestSide >= 600;

      await ScreenOrientation.lockAsync(
        isTablet
          ? ScreenOrientation.OrientationLock.LANDSCAPE
          : ScreenOrientation.OrientationLock.PORTRAIT_UP
      );
    };

    setDeviceOrientation().catch((error) => {
      console.warn('Could not lock orientation:', error);
    });
  }, []);

  if (!loaded) {
    return null;
  }

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
