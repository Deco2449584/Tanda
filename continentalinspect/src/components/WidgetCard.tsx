import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useThemedStyles } from '@/hooks/useThemedStyles';
import { radius, widgetShadow } from '@/theme/motion';
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
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border.onSurface,
      ...widgetShadow,
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
