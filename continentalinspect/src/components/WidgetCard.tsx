import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useThemedStyles } from '@/hooks/useThemedStyles';
import { cardShadow, radius } from '@/theme/motion';
import type { AppColors } from '@/theme/palettes';

type WidgetCardProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
};

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.surface.card,
      borderRadius: radius.card,
      borderWidth: 1,
      borderColor: colors.border.onSurface,
      ...cardShadow(colors.background.primary),
    },
    padded: {
      padding: 16,
    },
  });
}

export function WidgetCard({ children, style, padded = true }: WidgetCardProps) {
  const styles = useThemedStyles(createStyles);
  return <View style={[styles.card, padded && styles.padded, style]}>{children}</View>;
}
