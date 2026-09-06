import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import type { ComponentProps } from 'react';

import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { AppColors } from '@/theme/palettes';
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
      borderRadius: 14,
      paddingVertical: 14,
      paddingHorizontal: 10,
      alignItems: 'center',
      gap: 6,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 6,
      elevation: 3,
      borderWidth: 1,
      borderColor: colors.border.onSurface,
    },
    iconWrap: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 2,
    },
    value: {
      fontFamily: fonts.heading,
      fontSize: 26,
      color: colors.text.onSurface,
    },
    title: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 11,
      color: colors.text.onSurfaceMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      textAlign: 'center',
    },
  });
}

export function StatCard({ title, value, accentColor, icon }: StatCardProps) {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.card}>
      <View style={[styles.iconWrap, { backgroundColor: `${accentColor}18` }]}>
        <Ionicons name={icon} size={22} color={accentColor} />
      </View>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.title}>{title}</Text>
    </View>
  );
}

