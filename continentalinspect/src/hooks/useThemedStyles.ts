import { useMemo } from 'react';
import type { StyleSheet } from 'react-native';

import { useTheme } from '@/context/ThemeContext';
import type { AppColors } from '@/theme/palettes';

export function useThemedStyles<T extends StyleSheet.NamedStyles<T>>(
  factory: (colors: AppColors) => T,
): T {
  const { colors } = useTheme();
  return useMemo(() => factory(colors), [colors, factory]);
}
