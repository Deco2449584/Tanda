import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import type { AppColors, ColorScheme } from '@/theme/palettes';
import { getPalette } from '@/theme/palettes';

const STORAGE_KEY = '@continentalinspect/color-scheme';

type ThemeContextValue = {
  colorScheme: ColorScheme;
  isDark: boolean;
  colors: AppColors;
  isReady: boolean;
  setColorScheme: (scheme: ColorScheme) => void;
  toggleColorScheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [colorScheme, setColorSchemeState] = useState<ColorScheme>('dark');
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (!cancelled && (stored === 'light' || stored === 'dark')) {
          setColorSchemeState(stored);
        }
      } catch {
        // Keep default dark theme.
      } finally {
        if (!cancelled) setIsReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setColorScheme = useCallback((scheme: ColorScheme) => {
    setColorSchemeState(scheme);
    AsyncStorage.setItem(STORAGE_KEY, scheme).catch(() => {});
  }, []);

  const toggleColorScheme = useCallback(() => {
    setColorSchemeState((prev) => {
      const next: ColorScheme = prev === 'dark' ? 'light' : 'dark';
      AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
      return next;
    });
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      colorScheme,
      isDark: colorScheme === 'dark',
      colors: getPalette(colorScheme),
      isReady,
      setColorScheme,
      toggleColorScheme,
    }),
    [colorScheme, isReady, setColorScheme, toggleColorScheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return ctx;
}
