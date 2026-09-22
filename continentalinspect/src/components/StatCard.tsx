import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import type { ComponentProps } from 'react';

import { PressableScale } from '@/components/PressableScale';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { AppColors } from '@/theme/palettes';
import { radius } from '@/theme/motion';
import { fonts } from '@/theme/typography';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

type StatCardProps = {
  title: string;
  value: number;
  accentColor: string;
  icon: IoniconName;
};

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    card: {
      flex: 1,
      backgroundColor: colors.surface.card,
      borderRadius: radius.card,
      paddingVertical: 16,
      paddingHorizontal: 8,
      alignItems: 'center',
      gap: 4,
      borderWidth: 1,
      borderColor: colors.border.onSurface,
    },
    iconWrap: {
      width: 36,
      height: 36,
      borderRadius: radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 6,
    },
    value: {
      fontFamily: fonts.heading,
      fontSize: 30,
      color: colors.text.onSurface,
      letterSpacing: -0.6,
    },
    title: {
      fontFamily: fonts.bodyMedium,
      fontSize: 10,
      color: colors.text.onSurfaceMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.9,
      textAlign: 'center',
    },
  });
}

export function StatCard({ title, value, accentColor, icon }: StatCardProps) {
  const styles = useThemedStyles(createStyles);

  return (
    <PressableScale fill style={styles.card}>
      <View style={[styles.iconWrap, { backgroundColor: `${accentColor}22` }]}>
        <Ionicons name={icon} size={18} color={accentColor} />
      </View>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.title}>{title}</Text>
    </PressableScale>
  );
}
